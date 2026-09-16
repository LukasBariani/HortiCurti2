// Pedidos de demonstração persistentes. Reexecutar no mesmo dia não duplica o lote.
require('dotenv/config');
const assert = require('node:assert/strict');
const prismaModule = require('../dist/lib/prisma');
const prisma = prismaModule.default;
const { createOrder } = require('../dist/services/order_service');
const { findOrCreateTodayShoppingDay } = require('../dist/services/shopDay_service');
const { todayInSaoPaulo, parseISODate } = require('../dist/lib/delivery_date');
const today = todayInSaoPaulo();
const delivery = (offset) => {
  const date = parseISODate(today);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};
const item = (productName, quantity, unit = 'kg') => ({ productName, quantity, unit });
const customers = [
  { name: 'Mercadinho Primavera (DEMO)', whatsappNumber: '00000009001' },
  { name: 'Restaurante Sabor da Horta (DEMO)', whatsappNumber: '00000009002' },
  { name: 'Quitanda Boa Feira (DEMO)', whatsappNumber: '00000009003' },
];
const orders = [
  { customer: 0, offset: 0, text: 'bom dia, 3 kg de tomate e 2 maços de alface', items: [item('Tomate Salada', 3), item('Alface Crespa', 2, 'maço')] },
  { customer: 1, offset: 0, text: 'separa 2 kg tomate e 4 kg batata pra hoje', items: [item('Tomate Salada', 2), item('Batata', 4)] },
  { customer: 2, offset: 1, text: 'quero 1 caixa de tomate e 5 maços de alface', items: [item('Tomate Salada', 1, 'caixa'), item('Alface Crespa', 5, 'maço')] },
  { customer: 1, offset: 1, text: '4 kg de tomate salada e 2 kg cenoura', items: [item('Tomate Salada', 4), item('Cenoura', 2)] },
  { customer: 0, offset: 2, text: '6 kg banana nanica e 2 kg de cebola', items: [item('Banana Nanica', 6), item('Cebola', 2)] },
  { customer: 2, offset: 2, text: '2 kg banana nanica e 3 kg batata', items: [item('Banana Nanica', 2), item('Batata', 3)] },
];
const historyOrders = [
  { customer: 2, offset: -13, text: '5 kg de tomate e 3 kg de batata', items: [item('Tomate Salada', 5), item('Batata', 3)] },
  { customer: 0, offset: -10, text: '8 kg banana e 4 kg de cebola', items: [item('Banana Nanica', 8), item('Cebola', 4)] },
  { customer: 1, offset: -7, text: '6 kg tomate, 3 cenouras e 4 alfaces', items: [item('Tomate Salada', 6), item('Cenoura', 3), item('Alface Crespa', 4, 'maço')] },
  { customer: 2, offset: -4, text: '7 kg batata e 3 kg de cebola', items: [item('Batata', 7), item('Cebola', 3)] },
  { customer: 0, offset: -2, text: '4 kg banana e 5 kg tomate', items: [item('Banana Nanica', 4), item('Tomate Salada', 5)] },
];
const prices = {
  'Tomate Salada': [5.2, 7.5], 'Alface Crespa': [2.1, 3.5],
  'Batata': [3.4, 5.2], 'Cenoura': [3.1, 4.8],
  'Banana Nanica': [4.3, 6.4], 'Cebola': [3.7, 5.6],
};
async function main() {
  const result = await prisma.$transaction(async (tx) => {
    prismaModule.default = { ...tx, $transaction: callback => callback(tx) };
    const clients = [];
    for (const customer of customers) {
      const existing = await tx.client.findUnique({ where: { whatsappNumber: customer.whatsappNumber } });
      if (existing) assert.equal(existing.name, customer.name, 'Número reservado para demonstração já está em uso por outro cliente.');
      clients.push(existing || await tx.client.create({ data: customer }));
    }
    const shopping = await findOrCreateTodayShoppingDay();
    const saved = [];
    for (const [index, order] of historyOrders.entries()) {
      const rawMessage = `[DEMO HISTORICO HortiCurti ${today} #${index + 1}] ${order.text}`;
      const existing = await tx.order.findFirst({ where: { rawMessage, clientId: clients[order.customer].id } });
      const orderDate = delivery(order.offset);
      const created = existing || await tx.order.create({
        data: {
          clientId: clients[order.customer].id,
          shoppingDayId: shopping.id,
          rawMessage,
          status: 'confirmed',
          deliveryDate: parseISODate(orderDate),
          createdAt: parseISODate(orderDate),
          items: {
            create: order.items.map((orderItem) => {
              const [costPrice, salePrice] = prices[orderItem.productName];
              return {
                ...orderItem,
                costPrice,
                salePrice,
                margin: ((salePrice / costPrice) - 1) * 100,
              };
            }),
          },
        },
      });
      saved.push({ id: created.id, client: clients[order.customer].name,
        deliveryDate: created.deliveryDate.toISOString().slice(0, 10), created: !existing });
    }
    for (const [index, order] of orders.entries()) {
      const rawMessage = `[DEMO HortiCurti ${today} #${index + 1}] ${order.text}`;
      const existing = await tx.order.findFirst({ where: { rawMessage, clientId: clients[order.customer].id } });
      const created = existing || await createOrder({
        clientId: clients[order.customer].id, shoppingDayId: shopping.id,
        rawMessage, deliveryDate: delivery(order.offset), items: order.items,
      });
      const savedItems = await tx.orderItem.findMany({ where: { orderId: created.id } });
      for (const savedItem of savedItems) {
        const [costPrice, salePrice] = prices[savedItem.productName];
        await tx.orderItem.update({
          where: { id: savedItem.id },
          data: { costPrice, salePrice, margin: ((salePrice / costPrice) - 1) * 100 },
        });
      }
      saved.push({ id: created.id, client: clients[order.customer].name,
        deliveryDate: created.deliveryDate.toISOString().slice(0, 10), created: !existing });
    }
    return saved;
  }, { timeout: 15000 });
  console.log(JSON.stringify({ batch: today, created: result.filter((o) => o.created).length, orders: result }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => { prismaModule.default = prisma; return prisma.$disconnect(); });
