const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const orders = require('../dist/services/order_service');
const { todayInSaoPaulo } = require('../dist/lib/delivery_date');
const shiftIsoDate = (iso, days) => {
  const date = new Date(`${iso}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

let client;
let shoppingDay;
const orderIds = [];

async function run() {
  const suffix = `${Date.now()}`;
  client = await prisma.client.create({ data: { name: 'Teste de faltas', whatsappNumber: `pilot-${suffix}` } });
  shoppingDay = await prisma.shoppingDay.create({ data: { status: 'test' } });
  let source = await orders.createOrder({ clientId: client.id, shoppingDayId: shoppingDay.id, rawMessage: '10 kg tomate e 3 alfaces', deliveryDate: todayInSaoPaulo(), items: [
    { productName: 'Tomate Salada', quantity: 10, unit: 'kg' },
    { productName: 'Alface Crespa', quantity: 3, unit: 'unidade' },
  ] });
  orderIds.push(source.id);
  for (const item of source.items) {
    await prisma.orderItem.update({ where: { id: item.id }, data: { costPrice: 2, margin: 50, salePrice: 3 } });
  }
  source = await prisma.order.findUniqueOrThrow({ where: { id: source.id }, include: { items: true } });
  const tomato = source.items.find(item => item.productName === 'Tomate Salada');
  const lettuce = source.items.find(item => item.productName === 'Alface Crespa');
  const delivered = await orders.deliverOrder(source.id, { version: source.version, items: [
    { id: tomato.id, missingQuantity: 4, carryForward: true },
    { id: lettuce.id, missingQuantity: 1, carryForward: false },
  ] });
  assert.equal(delivered.status, 'delivered');
  assert.equal(delivered.items.find(item => item.id === tomato.id).quantity, 6);
  assert.equal(delivered.items.find(item => item.id === lettuce.id).quantity, 2);
  assert.equal(delivered.originatedBackorders.length, 1);
  assert.equal(delivered.originatedBackorders[0].quantity, 4);
  assert.equal(delivered.originatedBackorders[0].status, 'pending');

  const next = await orders.createOrder({ clientId: client.id, shoppingDayId: shoppingDay.id, rawMessage: '2 kg tomate e 1 kg banana', deliveryDate: shiftIsoDate(todayInSaoPaulo(), 3), items: [
    { productName: 'Tomate Salada', quantity: 2, unit: 'kg' },
    { productName: 'Banana Prata', quantity: 1, unit: 'kg' },
  ] });
  orderIds.push(next.id);
  assert.equal(next.status, 'pending');
  assert.equal(next.items.find(item => item.productName === 'Tomate Salada').quantity, 6);
  assert.equal(next.items.find(item => item.productName === 'Tomate Salada').costPrice, null);
  assert.equal(next.receivedBackorders.length, 1);
  assert.equal(next.receivedBackorders[0].status, 'transferred');
  assert.equal(next.receivedBackorders[0].targetOrderId, next.id);
  const banana = next.items.find(item => item.productName === 'Banana Prata');
  await assert.rejects(
    orders.editOrder(next.id, { version: next.version, items: [{ id: banana.id, quantity: banana.quantity }] }),
    /entrega anterior/,
  );

  await orders.changeOrderStatus(next.id, 'cancelled', next.version);
  const restored = await prisma.clientBackorder.findFirstOrThrow({ where: { sourceOrderId: source.id } });
  assert.equal(restored.status, 'pending');
  assert.equal(restored.targetOrderId, null);
  const replacement = await orders.createOrder({ clientId: client.id, shoppingDayId: shoppingDay.id, rawMessage: '1 kg banana', deliveryDate: shiftIsoDate(todayInSaoPaulo(), 5), items: [
    { productName: 'Banana Prata', quantity: 1, unit: 'kg' },
  ] });
  orderIds.push(replacement.id);
  assert.equal(replacement.items.find(item => item.productName === 'Tomate Salada').quantity, 4);

  console.log(JSON.stringify({ result: 'PASS', checked: [
    'entrega parcial reduz a quantidade faturada',
    'falta descartada não vira pendência',
    'falta escolhida fica pendente para o cliente',
    'próximo pedido incorpora e soma a pendência',
    'item transferido não herda preço antigo',
    'edição não apaga uma reposição vinculada',
    'cancelamento devolve a falta para o próximo pedido válido',
  ] }, null, 2));
}

run().finally(async () => {
  if (orderIds.length) {
    await prisma.clientBackorder.deleteMany({ where: { OR: [{ sourceOrderId: { in: orderIds } }, { targetOrderId: { in: orderIds } }] } });
    await prisma.orderHistory.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }
  if (client) await prisma.client.delete({ where: { id: client.id } });
  if (shoppingDay) await prisma.shoppingDay.delete({ where: { id: shoppingDay.id } });
  await prisma.$disconnect();
}).catch(error => { console.error(error); process.exitCode = 1; });
