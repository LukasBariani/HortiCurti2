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
