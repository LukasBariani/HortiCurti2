// Testa services reais no PostgreSQL e remove exclusivamente os registros deste teste.
require('dotenv/config');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const prisma = require('../dist/lib/prisma').default;
const orders = require('../dist/services/order_service');
const { updatePricing } = require('../dist/services/orderItem_service');
const { getSalesSummary } = require('../dist/services/dashboard_service');
const { getConsolidatedByDeliveryDate } = require('../dist/services/shopDay_service');
const { todayInSaoPaulo, parseISODate } = require('../dist/lib/delivery_date');
const marker = `TEST-LIFECYCLE-${randomUUID()}`;
let client, shopping;
const close = (a, b) => assert.ok(Math.abs(a - b) < 0.00001, `${a} != ${b}`);
async function main() {
  const today = todayInSaoPaulo();
  const baseline = await getSalesSummary(30);
  client = await prisma.client.create({ data: { name: marker, whatsappNumber: marker } });
  shopping = await prisma.shoppingDay.create({ data: { status: 'test' } });
  const create = () => orders.createOrder({ clientId: client.id, shoppingDayId: shopping.id,
    rawMessage: marker, deliveryDate: today,
    items: [{ productName: marker, quantity: 2, unit: 'kg' }, { productName: marker + '-remove', quantity: 1, unit: 'maço' }] });
  let order = await create();
  assert.equal(order.status, 'pending');
  await assert.rejects(orders.changeOrderStatus(order.id, 'delivered', order.version));
  order = await orders.editOrder(order.id, { version: order.version, items: [{ id: order.items[0].id, quantity: 3 }] });
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].quantity, 3);
  assert.ok(order.history.some(h => h.action === 'edited' || JSON.stringify(h.before).includes('-remove')));
  await assert.rejects(orders.editOrder(order.id, { version: order.version, items: [] }));
  const concurrent = await Promise.allSettled([
    orders.changeOrderStatus(order.id, 'confirmed', order.version),
    orders.changeOrderStatus(order.id, 'cancelled', order.version),
  ]);
  assert.equal(concurrent.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(concurrent.find(r => r.status === 'rejected').reason.statusCode, 409);
  // Outro pedido garante um fluxo determinístico independentemente da corrida acima.
  order = await create();
  order = await orders.changeOrderStatus(order.id, 'confirmed', order.version);
  order = await orders.changeOrderStatus(order.id, 'separated', order.version);
  await assert.rejects(orders.changeOrderStatus(order.id, 'delivered', order.version));
  await Promise.all(order.items.map(item => updatePricing(item.id, 10, 30)));
  order = await orders.findOrderById(order.id);
  close((await getSalesSummary(30)).totals.revenue, baseline.totals.revenue);
  order = await orders.changeOrderStatus(order.id, 'delivered', order.version);
  assert.ok(order.deliveredAt);
  const summary = await getSalesSummary(30);
  close(summary.totals.revenue - baseline.totals.revenue, 39);
  close(summary.totals.profit - baseline.totals.profit, 9);
  assert.equal(summary.totals.orders - baseline.totals.orders, 1);
  const actualDelivery = order.deliveredAt;
  const dayStart = new Date(`${today}T00:00:00-03:00`);
  await prisma.order.update({ where: { id: order.id }, data: { deliveredAt: new Date(+dayStart - 1) } });
  close((await getSalesSummary(30)).daily.find(day => day.date === today).revenue,
    baseline.daily.find(day => day.date === today).revenue);
  await prisma.order.update({ where: { id: order.id }, data: { deliveredAt: actualDelivery } });
  await assert.rejects(orders.changeOrderStatus(order.id, 'cancelled', order.version));
  await assert.rejects(orders.editOrder(order.id, { version: order.version, items: [{ id: order.items[0].id, quantity: 9 }] }));
  await assert.rejects(updatePricing(order.items[0].id, 20, 30));
  const previous = parseISODate(today); previous.setUTCDate(previous.getUTCDate() - 45);
  await prisma.order.update({ where: { id: order.id }, data: { deliveryDate: previous } });
  close((await getSalesSummary(30)).totals.revenue, summary.totals.revenue);
  let cancelled = await create();
  cancelled = await orders.deleteOrder(cancelled.id, cancelled.version);
  assert.equal(cancelled.status, 'cancelled');
  assert.ok(await prisma.order.findUnique({ where: { id: cancelled.id } }));
  const consolidated = await getConsolidatedByDeliveryDate(today);
  for (const entry of consolidated) for (const id of entry.itemIds) {
    assert.ok(!order.items.some(i => i.id === id));
    assert.ok(!cancelled.items.some(i => i.id === id));
  }
  let future = await create();
  const tomorrow = parseISODate(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  future = await orders.editOrder(future.id, { version: future.version, deliveryDate: tomorrow.toISOString().slice(0, 10) });
  future = await orders.changeOrderStatus(future.id, 'confirmed', future.version);
  future = await orders.changeOrderStatus(future.id, 'separated', future.version);
  for (const item of future.items) await updatePricing(item.id, 10, 30);
  future = await orders.findOrderById(future.id);
  await assert.rejects(orders.changeOrderStatus(future.id, 'delivered', future.version));
  console.log('PASS: edição, remoção, concorrência, entrega, faturamento pela entrega efetiva, cancelamento, histórico, bloqueios e consolidação.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (client) {
    await prisma.orderHistory.deleteMany({ where: { order: { clientId: client.id } } });
    await prisma.orderItem.deleteMany({ where: { order: { clientId: client.id } } });
    await prisma.order.deleteMany({ where: { clientId: client.id } });
    await prisma.client.delete({ where: { id: client.id } });
  }
  if (shopping) await prisma.shoppingDay.delete({ where: { id: shopping.id } });
  await prisma.$disconnect();
});
