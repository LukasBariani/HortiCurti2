// Integração com PostgreSQL real. Os registros de teste são revertidos por ROLLBACK.
require('dotenv/config');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const prismaModule = require('../dist/lib/prisma');
const prisma = prismaModule.default;
const orderService = require('../dist/services/order_service');
const shoppingService = require('../dist/services/shopDay_service');
const { todayInSaoPaulo, parseISODate } = require('../dist/lib/delivery_date');
const rollback = new Error('ROLLBACK_DO_TESTE');

async function main() {
  const columns = await prisma.$queryRaw`
    SELECT data_type, is_nullable FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Order' AND column_name = 'deliveryDate'`;
  assert.equal(columns[0]?.data_type, 'date', 'A migration precisa criar deliveryDate como DATE.');
  assert.equal(columns[0]?.is_nullable, 'NO', 'deliveryDate deve ser obrigatória.');
  const migrations = await prisma.$queryRaw`
    SELECT migration_name FROM "_prisma_migrations"
    WHERE migration_name = '20260906003000_add_delivery_date'
      AND finished_at IS NOT NULL AND rolled_back_at IS NULL`;
  assert.equal(migrations.length, 1, 'A migration ainda não foi aplicada com sucesso.');
  const integrity = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS orders,
      COUNT(*) FILTER (WHERE orders."deliveryDate" IS NULL)::int AS missing_delivery_date,
      COUNT(*) FILTER (
        -- O seed histórico usa createdAt retroativo, mas foi inserido após a migração.
        WHERE orders."rawMessage" NOT LIKE '[DEMO HISTORICO HortiCurti %'
        AND orders."createdAt" < (
          SELECT started_at AT TIME ZONE 'UTC' FROM "_prisma_migrations"
          WHERE migration_name = '20260906003000_add_delivery_date'
            AND finished_at IS NOT NULL AND rolled_back_at IS NULL
          ORDER BY started_at DESC LIMIT 1
        ) AND orders."deliveryDate" IS DISTINCT FROM (
          shopping."date" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'
        )::date
      )::int AS old_orders_with_unexpected_date
    FROM "Order" AS orders JOIN "ShoppingDay" AS shopping ON shopping.id = orders."shoppingDayId"`;
  assert.equal(integrity[0].missing_delivery_date, 0);
  assert.equal(integrity[0].old_orders_with_unexpected_date, 0);

  const marker = `TEST-DELIVERY-${randomUUID()}`;
  const today = todayInSaoPaulo();
  const next = parseISODate(today);
  next.setUTCDate(next.getUTCDate() + 1);
  const tomorrow = next.toISOString().slice(0, 10);

  try {
    await prisma.$transaction(async (tx) => {
      // Executa os services reais usando esta transação reversível.
      prismaModule.default = { ...tx, $transaction: callback => callback(tx) };
      const customer = await tx.client.create({ data: { name: marker, whatsappNumber: marker } });
      const shopping = await tx.shoppingDay.create({ data: { date: new Date(), status: 'test' } });
      const base = { clientId: customer.id, shoppingDayId: shopping.id, rawMessage: marker };
      const item = (quantity, unit = 'kg') => ({ productName: marker, quantity, unit });
      const current = await orderService.createOrder({ ...base, deliveryDate: today, items: [item(1)] });
      const future = await orderService.createOrder({ ...base, deliveryDate: tomorrow, items: [item(2), item(1, 'caixa')] });
      await orderService.createOrder({ ...base, deliveryDate: tomorrow, items: [item(3)] });
      assert.equal(future.deliveryDate.toISOString().slice(0, 10), tomorrow);

      const todayOrders = await orderService.getTodayOrders();
      assert.ok(todayOrders.some((o) => o.id === current.id));
      assert.ok(!todayOrders.some((o) => o.id === future.id));
      const futureOrders = await orderService.getOrdersByDeliveryDate(tomorrow);
      assert.ok(futureOrders.some((o) => o.id === future.id));
      assert.ok(!futureOrders.some((o) => o.id === current.id));

      const todayList = await shoppingService.getTodayConsolidatedList();
      assert.equal(todayList.find((i) => i.productName === marker).totalQuantity, 1);
      const futureList = (await shoppingService.getConsolidatedByDeliveryDate(tomorrow)).filter((i) => i.productName === marker);
      assert.equal(futureList.length, 2);
      assert.equal(futureList.find((i) => i.unit === 'kg').totalQuantity, 5);
      assert.equal(futureList.find((i) => i.unit === 'caixa').totalQuantity, 1);
      assert.equal(futureList.find((i) => i.unit === 'kg').clientes.length, 2);
      throw rollback;
    }, { timeout: 15000 });
  } catch (error) {
    if (error !== rollback) throw error;
  } finally {
    prismaModule.default = prisma;
  }
  assert.equal(await prisma.client.count({ where: { whatsappNumber: marker } }), 0, 'A transação de teste deveria ter sido revertida.');
  console.log(JSON.stringify({
    result: 'PASS', ...integrity[0],
    checked: ['migration aplicada', 'pedidos antigos preenchidos', 'criação com entrega futura',
      'separação entre hoje e amanhã', 'consolidação por produto e unidade', 'rollback dos registros de teste'],
  }, null, 2));
}
main().catch((error) => {
  console.error('FAIL:', error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
