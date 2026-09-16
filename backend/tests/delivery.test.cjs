const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const dates = require('../src/lib/delivery_date.ts');
const mobileDates = require('../../mobile/src/utils/deliveryDate.ts');
const { createOrderConversation } = require('../src/services/order_conversation.ts');
const { getSession } = require('../src/lib/session_manager.ts');
const now = new Date('2026-12-30T15:00:00Z');

test('aceita hoje e próximo ano somente com ano explícito', () => {
  assert.equal(dates.parseDeliveryMessage('30/12/2026', now), '2026-12-30');
  assert.equal(dates.parseDeliveryMessage('02/01/2027', now), '2027-01-02');
  assert.throws(() => dates.parseDeliveryMessage('29/12/2026', now), /já passou/);
  assert.throws(() => dates.parseDeliveryMessage('02/01', now), /DD\/MM\/AAAA/);
});

test('rejeita datas inexistentes, entrada informal e formatos parciais', () => {
  for (const value of ['31/02/2027', '31/04/2027', '00/01/2027', '01/13/2027', '29/02/2100', '01/01/0000']) {
    assert.throws(() => dates.parseDeliveryMessage(value, now), /calendário/);
  }
  for (const value of ['amanhã', 'segunda', '1/01/2027', '01/1/2027', '01/01/27', '2027-01-01', '01/01/2027 extra']) {
    assert.throws(() => dates.parseDeliveryMessage(value, now), /DD\/MM\/AAAA/);
  }
  assert.equal(dates.parseDeliveryMessage('29/02/2028', now), '2028-02-29');
});

test('usa o dia de São Paulo na virada da meia-noite UTC', () => {
  assert.equal(dates.todayInSaoPaulo(new Date('2026-09-06T02:59:59Z')), '2026-09-05');
  assert.equal(dates.todayInSaoPaulo(new Date('2026-09-06T03:00:00Z')), '2026-09-06');
  assert.equal(dates.parseDeliveryMessage('05/09/2026', new Date('2026-09-06T02:59:59Z')), '2026-09-05');
  assert.equal(dates.formatDeliveryDate(new Date('2027-01-02T00:00:00Z')), '02/01/2027');
});

test('API exige ISO de calendário, sem horário nem normalização de datas inválidas', () => {
  for (const value of [undefined, null, ['2027-01-01'], '', '2027-2-01', '2027-02-31', '2027-01-01T00:00:00Z']) {
    assert.throws(() => dates.parseISODate(value), dates.DeliveryDateError);
  }
  assert.equal(dates.parseISODate('2027-01-02').toISOString(), '2027-01-02T00:00:00.000Z');
});

test('mobile mantém a data ao formatar e navegar entre anos e meses', () => {
  assert.equal(mobileDates.shiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(mobileDates.shiftDate('2028-03-01', -1), '2028-02-29');
  assert.equal(mobileDates.formatDeliveryDate('2027-01-02T00:00:00.000Z'), '02/01/2027');
  assert.equal(mobileDates.parseDateInput('31/02/2027'), null);
  assert.equal(mobileDates.parseDateInput('02/01/2027'), '2027-01-02');
  assert.equal(mobileDates.todayInSaoPaulo(new Date('2026-09-06T02:30:00Z')), '2026-09-05');
  assert.notEqual(mobileDates.productUnitKey({ productName: 'Tomate', unit: 'kg' }), mobileDates.productUnitKey({ productName: 'Tomate', unit: 'caixa' }));
});

function conversation() {
  const phone = randomUUID();
  const saved = [], replies = [], parsed = [];
  let time = now;
  let failure = false;
  const handle = createOrderConversation({
    now: () => time,
    parseMessage: async (text) => {
      parsed.push(text);
      return { items: text === 'vazio' ? [] : [{ productName: text, quantity: 3, unit: 'maço' }] };
    },
    createOrder: async (data) => { if (failure) throw new Error('Falha simulada no banco'); saved.push(data); },
    findOrdersByClientId: async () => [],
  });
  const send = (body) => handle({ body, reply: async (text) => replies.push(text) }, phone, 'customer');
  return { send, saved, replies, parsed, session: () => getSession(phone), setTime: (v) => { time = v; }, fail: () => { failure = true; } };
}

test('fluxo completo só salva após data válida e confirmação', async () => {
  const c = conversation();
  await c.send('1');
  await c.send('Alface Crespa');
  assert.equal(c.session().estado, 'AGUARDANDO_DATA');
  for (const value of ['29/12/2026', '02/01', '31/02/2027']) {
    await c.send(value);
    assert.equal(c.session().estado, 'AGUARDANDO_DATA');
    assert.equal(c.saved.length, 0);
  }
  await c.send('02/01/2027');
  assert.equal(c.session().estado, 'CONFIRMANDO');
  assert.match(c.replies.at(-1), /Pedido para 02\/01\/2027/);
  assert.match(c.replies.at(-1), /3x Alface Crespa/);
  assert.equal(c.saved.length, 0);
  await c.send('CONFIRMAR');
  assert.equal(c.saved[0].deliveryDate, '2027-01-02');
  assert.equal(c.saved[0].rawMessage, 'Alface Crespa');
  assert.equal(c.session().estado, 'IDLE');
});

test('editar reprocessa os novos itens e pergunta novamente a data', async () => {
  const c = conversation();
  for (const text of ['1', 'Alface', '02/01/2027', 'editar', 'Cenoura']) await c.send(text);
  assert.equal(c.session().estado, 'AGUARDANDO_DATA');
  assert.equal(c.session().deliveryDate, '');
  assert.deepEqual(c.parsed, ['Alface', 'Cenoura']);
  for (const text of ['03/01/2027', 'confirmar']) await c.send(text);
  assert.equal(c.saved[0].items[0].productName, 'Cenoura');
  assert.equal(c.saved[0].deliveryDate, '2027-01-03');
});

test('trocar só a data preserva os itens sem chamar IA novamente', async () => {
  const c = conversation();
  for (const text of ['1', 'Alface', '02/01/2027', 'data', '03/01/2027', 'confirmar']) await c.send(text);
  assert.equal(c.parsed.length, 1);
  assert.equal(c.saved[0].deliveryDate, '2027-01-03');
});

test('confirmação após mudança de dia exige nova data', async () => {
  const c = conversation();
  for (const text of ['1', 'Alface', '30/12/2026']) await c.send(text);
  c.setTime(new Date('2026-12-31T03:00:00Z'));
  await c.send('confirmar');
  assert.equal(c.saved.length, 0);
  assert.equal(c.session().estado, 'AGUARDANDO_DATA');
  assert.match(c.replies.at(-1), /já passou/);
});

test('mensagens rápidas do mesmo cliente são processadas em ordem sem duplicar pedido', async () => {
  const c = conversation();
  await Promise.all(['1', 'Alface', '02/01/2027', 'confirmar', 'confirmar'].map(c.send));
  assert.equal(c.saved.length, 1);
});

test('clientes simultâneos não compartilham itens e datas', async () => {
  const a = conversation(), b = conversation();
  await Promise.all([a.send('1'), b.send('1')]);
  await Promise.all([a.send('Alface'), b.send('Cenoura')]);
  await Promise.all([a.send('02/01/2027'), b.send('03/01/2027')]);
  await Promise.all([a.send('confirmar'), b.send('confirmar')]);
  assert.equal(a.saved[0].deliveryDate, '2027-01-02');
  assert.equal(b.saved[0].items[0].productName, 'Cenoura');
});

test('parser vazio mantém o cliente aguardando um pedido válido', async () => {
  const c = conversation();
  await c.send('1'); await c.send('vazio');
  assert.equal(c.session().estado, 'AGUARDANDO_PEDIDO');
  assert.equal(c.saved.length, 0);
});


test('falha ao salvar preserva o pedido e não anuncia confirmação', async (t) => {
  t.mock.method(console, 'error', () => {});
  const c = conversation();
  for (const text of ['1', 'Alface', '02/01/2027']) await c.send(text);
  c.fail(); await c.send('confirmar');
  assert.equal(c.saved.length, 0);
  assert.equal(c.session().estado, 'CONFIRMANDO');
  assert.equal(c.session().deliveryDate, '2027-01-02');
  assert.equal(c.session().itensParsed[0].productName, 'Alface');
  assert.match(c.replies.at(-1), /Não consegui salvar/);
});
