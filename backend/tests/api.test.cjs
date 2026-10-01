const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { Duplex } = require('node:stream');
const prisma = { order: { findMany: async () => [], create: async () => ({}) } };
prisma.orderItem = { update: async () => ({}), delete: async () => ({}) };
prisma.clientBackorder = { findMany: async () => [], updateMany: async () => ({ count: 0 }), create: async () => ({}) };
prisma.$transaction = async fn => fn(prisma);
prisma.$queryRaw = async () => [];
prisma.orderHistory = { create: async () => ({}) };
prisma.order.findUniqueOrThrow = async () => ({ id: 'order', status: 'pending', version: 0, items: [] });
prisma.order.findUnique = async () => ({ id: 'order', status: 'pending', version: 0, items: [] });
prisma.order.updateMany = async () => ({ count: 1 });
prisma.orderItem.findUnique = async () => ({ id: 'item-1', orderId: 'order' });
require('../src/lib/prisma.ts').default = prisma;
const { todayInSaoPaulo } = require('../src/lib/delivery_date.ts');
// Só inicializa o SDK; nenhuma chamada à Groq é feita nestes testes.
process.env.GROQ_API_KEY ||= 'test-placeholder';
const app = require('../src/app.ts').default();

// Exercita Express → controller → service em memória, sem portas ou banco reais.
function request(method, url, body) {
  return new Promise((resolve, reject) => {
    let raw = '';
    const timeout = setTimeout(() => reject(new Error(`Timeout: ${method} ${url}`)), 3000);
    timeout.unref();
    const socket = new Duplex({ read() {}, write(chunk, _encoding, callback) { raw += chunk.toString(); callback(); } });
    const req = new http.IncomingMessage(socket);
    req.method = method; req.url = url; req.headers = {};
    req.httpVersionMajor = 1; req.httpVersionMinor = 1; req.httpVersion = '1.1'; req.complete = true;
    const encoded = body === undefined ? '' : JSON.stringify(body);
    if (encoded) req.headers = { 'content-type': 'application/json', 'content-length': Buffer.byteLength(encoded).toString() };
    const res = new http.ServerResponse(req);
    res.assignSocket(socket);
    res.on('finish', () => {
      clearTimeout(timeout);
      const content = raw.slice(raw.indexOf('\r\n\r\n') + 4);
      try { resolve({ status: res.statusCode, body: JSON.parse(content) }); }
      catch (error) { reject(error); }
    });
    app.handle(req, res);
    req.push(encoded || null);
    if (encoded) req.push(null);
  });
}

const item = (quantity, unit = 'kg') => ({ productName: 'Tomate Salada', quantity, unit });
function order(id, date, items, clientName = 'Cliente') {
  return { id, deliveryDate: new Date(`${date}T00:00:00Z`), shoppingDayId: 'same-shopping-day',
    createdAt: new Date(), client: { name: clientName }, items };
}

test('endpoints por data excluem entregas de outros dias mesmo no mesmo ShoppingDay', async (t) => {
  const today = todayInSaoPaulo();
  const orders = [order('today', today, [item(1)]), order('future', '2099-01-02', [item(3)])];
  t.mock.method(prisma.order, 'findMany', async ({ where }) => {
    assert.ok(where.deliveryDate instanceof Date);
    assert.equal(where.shoppingDayId, undefined);
    return orders.filter((o) => +o.deliveryDate === +where.deliveryDate);
  });
  const future = await request('GET', '/order/delivery?date=2099-01-02');
  assert.equal(future.status, 200);
  assert.deepEqual(future.body.map((o) => o.id), ['future']);
  assert.deepEqual((await request('GET', '/order/today')).body.map((o) => o.id), ['today']);
  assert.equal((await request('GET', '/shopDay/consolidated/today')).body[0].totalQuantity, 1);
  assert.deepEqual((await request('GET', '/order/delivery?date=2099-01-03')).body, []);
});

test('health confirma que API e banco estão disponíveis', async () => {
  const response = await request('GET', '/health');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.database, 'connected');
});

test('lista consolidada soma clientes por data e mantém unidades distintas', async (t) => {
  const orders = [order('1', '2099-01-02', [item(2), item(1, 'caixa')], 'Ana'),
    order('2', '2099-01-02', [item(3)], 'Bia')];
  t.mock.method(prisma.order, 'findMany', async ({ where }) => {
    assert.equal(where.deliveryDate.toISOString(), '2099-01-02T00:00:00.000Z');
    return orders;
  });
  const result = await request('GET', '/shopDay/consolidated?date=2099-01-02');
  assert.equal(result.status, 200);
  assert.equal(result.body.length, 2);
  const kg = result.body.find((i) => i.unit === 'kg');
  assert.equal(kg.totalQuantity, 5);
  assert.deepEqual(kg.clientes, [{ nome: 'Ana', quantidade: 2 }, { nome: 'Bia', quantidade: 3 }]);
  assert.equal(result.body.find((i) => i.unit === 'caixa').totalQuantity, 1);
});

test('consultas inválidas retornam HTTP 400 sem consultar o banco', async (t) => {
  const find = t.mock.method(prisma.order, 'findMany', async () => { throw new Error('Não deve consultar'); });
  for (const path of ['/order/delivery', '/order/delivery?date=2099-02-31', '/order/delivery?date=01/01/2099',
    '/order/delivery?date=2099-01-01&date=2099-01-02', '/shopDay/consolidated?date=amanha']) {
    assert.equal((await request('GET', path)).status, 400, path);
  }
  assert.equal(find.mock.callCount(), 0);
});

test('POST persiste deliveryDate e itens e rejeita data passada ou ausente', async (t) => {
  let saved;
  t.mock.method(prisma.order, 'create', async (args) => { saved = args.data; return { id: 'new-order', ...args.data }; });
  const base = { clientId: 'client', shoppingDayId: 'shopping', rawMessage: '3 kg tomate', items: [item(3)] };
  assert.equal((await request('POST', '/order', base)).status, 400);
  assert.equal((await request('POST', '/order', { ...base, deliveryDate: '2000-01-01' })).status, 400);
  assert.equal(saved, undefined);
  const response = await request('POST', '/order', { ...base, deliveryDate: '2099-01-02' });
  assert.equal(response.status, 201);
  assert.equal(saved.deliveryDate.toISOString(), '2099-01-02T00:00:00.000Z');
  assert.deepEqual(saved.items.create, [item(3)]);
});

test('precificação calcula o preço de venda no backend', async (t) => {
  let saved;
  t.mock.method(prisma.orderItem, 'update', async (args) => { saved = args; return { id: args.where.id, ...args.data }; });
  const response = await request('PUT', '/order-items/item-1/pricing', { costPrice: 10, margin: 30 });
  assert.equal(response.status, 200);
  assert.equal(saved.data.salePrice, 13);
  assert.equal((await request('PUT', '/order-items/item-1/pricing', { costPrice: -1, margin: 30 })).status, 400);
});

test('status exige versão, rejeita conflito e impede pular etapas', async (t) => {
  t.mock.method(prisma.order, 'findUnique', async () => ({ id: 'order', status: 'pending', version: 2, items: [] }));
  assert.equal((await request('PATCH', '/order/order/status', { status: 'confirmed' })).status, 400);
  assert.equal((await request('PATCH', '/order/order/status', { status: 'confirmed', version: 1 })).status, 409);
  assert.equal((await request('PATCH', '/order/order/status', { status: 'delivered', version: 2 })).status, 400);
  assert.equal((await request('DELETE', '/order/order')).status, 400);
});

test('status comum não permite concluir entrega sem conferência', async (t) => {
  const current = { id: 'order', status: 'pending', version: 0, deliveryDate: new Date('2099-01-01'), items: [item(1)] };
  t.mock.method(prisma.order, 'findUnique', async () => current);
  assert.equal((await request('PATCH', '/order/order/status', { status: 'delivered', version: 0 })).status, 400);
});

test('conferência de entrega exige todos os itens e quantidades válidas', async (t) => {
  const current = { id: 'order', clientId: 'client', status: 'pending', version: 0, deliveryDate: new Date('2020-01-01'),
    items: [{ id: 'one', ...item(2), costPrice: 1, salePrice: 2 }] };
  t.mock.method(prisma.order, 'findUnique', async () => current);
  assert.equal((await request('PATCH', '/order/order/deliver', { version: 0, items: [] })).status, 400);
  assert.equal((await request('PATCH', '/order/order/deliver', { version: 0, items: [{ id: 'one', missingQuantity: 3, carryForward: true }] })).status, 400);
});

test('edição rejeita itens inválidos e pedidos finalizados', async (t) => {
  const current = { id: 'order', status: 'confirmed', version: 0, deliveryDate: new Date('2099-01-01'), items: [{ id: 'one', ...item(1) }] };
  t.mock.method(prisma.order, 'findUnique', async () => current);
  for (const items of [[], [null], [{ id: 'foreign', quantity: 1 }], [{ id: 'one', quantity: 0 }]]) {
    assert.equal((await request('PATCH', '/order/order', { version: 0, items })).status, 400);
  }
  current.status = 'delivered';
  assert.equal((await request('PATCH', '/order/order', { version: 0, deliveryDate: '2099-01-02' })).status, 400);
  t.mock.method(prisma.order, 'findUniqueOrThrow', async () => current);
  assert.equal((await request('PUT', '/order-items/one/pricing', { costPrice: 1, margin: 20 })).status, 400);
});

test('acréscimo por cliente aceita zero, decimal e remoção sem alterar pedidos', async (t) => {
  const rows = new Map();
  prisma.client = {
    create: async ({ data }) => { const row = { id: String(rows.size + 1), ...data }; rows.set(row.id, row); return row; },
    update: async ({ where, data }) => {
      if (!rows.has(where.id)) throw Object.assign(new Error(), { code: 'P2025' });
      const row = { ...rows.get(where.id), ...data }; rows.set(where.id, row); return row;
    },
    findUnique: async ({ where }) => rows.get(where.id),
  };
  const orders = t.mock.method(prisma.order, 'updateMany', async () => { throw new Error('Não deve alterar pedidos'); });
  const a = await request('POST', '/clients', { name: 'A', whatsappNumber: '11911111111', defaultMarkupPercent: 40 });
  const b = await request('POST', '/clients', { name: 'B', whatsappNumber: '11922222222' });
  assert.equal(a.status, 201); assert.equal(a.body.defaultMarkupPercent, 40);
  assert.equal(b.body.defaultMarkupPercent, null);
  for (const value of [32.5, 0, null]) {
    const result = await request('PATCH', `/clients/${a.body.id}/markup`, { defaultMarkupPercent: value });
    assert.equal(result.status, 200); assert.equal(result.body.defaultMarkupPercent, value);
    assert.equal((await request('GET', `/clients/${b.body.id}`)).body.defaultMarkupPercent, null);
  }
  for (const value of [-1, '40', true, {}, 'Infinity']) {
    assert.equal((await request('PATCH', `/clients/${a.body.id}/markup`, { defaultMarkupPercent: value })).status, 400);
    assert.equal((await request('POST', '/clients', { name: 'Invalid', whatsappNumber: '123', defaultMarkupPercent: value })).status, 400);
  }
  assert.equal((await request('PATCH', `/clients/${a.body.id}/markup`, {})).status, 400);
  assert.equal((await request('PATCH', '/clients/missing/markup', { defaultMarkupPercent: 40 })).status, 404);
  assert.equal(orders.mock.callCount(), 0);
});

test('entrada de percentual distingue vazio e zero e aceita vírgula', () => {
  const { parseMarkup } = require('../../mobile/src/utils/markup.ts');
  assert.equal(parseMarkup(''), null);
  assert.equal(parseMarkup('0'), 0);
  assert.equal(parseMarkup('32,5'), 32.5);
  assert.equal(parseMarkup('40'), 40);
  for (const value of ['-1', 'abc', '1,2,3', 'Infinity', '40%']) assert.throws(() => parseMarkup(value));
});

test('precificação completa calcula valores, preserva ajuste e rejeita edição obsoleta', async (t) => {
  const original = { id: 'priced', status: 'pending', version: 2, items: [{ id: 'a' }, { id: 'b' }] };
  t.mock.method(prisma.order, 'findUnique', async () => original);
  const update = t.mock.method(prisma.orderItem, 'update', async args => args.data);
  const history = t.mock.method(prisma.orderHistory, 'create', async () => ({}));
  const body = { version: 2, markupPercent: 40, items: [{ id: 'a', costPrice: 100 }, { id: 'b', costPrice: 50, salePrice: 65 }] };
  assert.equal((await request('PATCH', '/order/priced/pricing', body)).status, 200);
  assert.equal(update.mock.calls[0].arguments[0].data.salePrice, 140);
  assert.equal(update.mock.calls[1].arguments[0].data.salePrice, 65);
  assert.equal(history.mock.callCount(), 1);
  for (const change of [{ version: 1 }, { markupPercent: -1 }, { items: [{ id: 'a', costPrice: null }] }, { items: [{ id: 'a', costPrice: 1 }, { id: 'foreign', costPrice: 1 }] }, { items: [{ id: 'a', costPrice: 1 }, { id: 'a', costPrice: 1 }] }]) {
    const response = await request('PATCH', '/order/priced/pricing', { ...body, ...change });
    assert.equal(response.status, change.version === 1 ? 409 : 400);
  }
  original.status = 'delivered';
  assert.equal((await request('PATCH', '/order/priced/pricing', body)).status, 400);
  assert.equal(update.mock.callCount(), 2);
});

test('preço geral não sobrescreve pedido com precificação própria', async (t) => {
  t.mock.method(prisma.order, 'findUniqueOrThrow', async () => ({ id: 'order', status: 'pending', version: 3, pricingMarkupPercent: 40, items: [] }));
  const update = t.mock.method(prisma.orderItem, 'update', async () => { throw new Error('Não deve sobrescrever'); });
  const response = await request('PUT', '/order-items/item-1/pricing', { costPrice: 100, margin: 25 });
  assert.equal(response.status, 400);
  assert.match(response.body.error || response.body.message, /preços próprios/);
  assert.equal(update.mock.callCount(), 0);
});

test('edição de cliente mantém identidade e aceita nome, número e percentual', async (t) => {
  const calls = [];
  t.mock.method(prisma.client, 'update', async ({ where, data }) => {
    calls.push({ where, data });
    return { id: where.id, ...data };
  });
  const response = await request('PATCH', '/clients/existing', { name: '  Mercado Novo  ', whatsappNumber: '+55 (11) 98888-7777', defaultMarkupPercent: 32.5, orders: { deleteMany: {} }, id: 'foreign' });
  assert.equal(response.status, 200);
  assert.equal(response.body.id, 'existing');
  assert.equal(response.body.name, 'Mercado Novo');
  assert.equal(response.body.whatsappNumber, '5511988887777');
  assert.equal(response.body.defaultMarkupPercent, 32.5);
  assert.equal(calls[0].data.orders, undefined);
  for (const change of [{ name: '' }, { whatsappNumber: 'abc1234567890' }, { whatsappNumber: '123' }, { defaultMarkupPercent: -1 }]) {
    assert.equal((await request('PATCH', '/clients/existing', { name: 'Cliente', whatsappNumber: '5511999999999', ...change })).status, 400);
  }
  assert.equal((await request('PATCH', '/clients/existing', { name: 'Cliente', whatsappNumber: '5511999999999' })).status, 200);
  assert.equal(calls[1].data.defaultMarkupPercent, undefined);
});

test('edição e cadastro explicam conflito de WhatsApp; edição informa cliente inexistente', async (t) => {
  t.mock.method(prisma.client, 'update', async () => { throw Object.assign(new Error(), { code: 'P2002' }); });
  t.mock.method(prisma.client, 'create', async () => { throw Object.assign(new Error(), { code: 'P2002' }); });
  const body = { name: 'Teste', whatsappNumber: '5511988887777', defaultMarkupPercent: null };
  assert.equal((await request('PATCH', '/clients/existing', body)).status, 409);
  assert.equal((await request('POST', '/clients', body)).status, 409);
  t.mock.method(prisma.client, 'update', async () => { throw Object.assign(new Error(), { code: 'P2025' }); });
  assert.equal((await request('PATCH', '/clients/missing', body)).status, 404);
});
