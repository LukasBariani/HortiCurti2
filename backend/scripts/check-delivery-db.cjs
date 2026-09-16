// Diagnóstico somente de leitura; não mostra mensagens, clientes ou credenciais.
require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'Order'
    ORDER BY ordinal_position`;
  const counts = await prisma.$queryRaw`SELECT COUNT(*)::int AS orders FROM "Order"`;
  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations" ORDER BY started_at`;
  let deliveryCheck = null;
  if (columns.some((column) => column.column_name === 'deliveryDate')) {
    deliveryCheck = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS orders,
        COUNT(*) FILTER (WHERE orders."deliveryDate" IS NULL)::int AS missing_delivery_date,
        COUNT(*) FILTER (
          WHERE orders."createdAt" < (
            SELECT started_at AT TIME ZONE 'UTC' FROM "_prisma_migrations"
            WHERE migration_name = '20260906003000_add_delivery_date'
              AND finished_at IS NOT NULL AND rolled_back_at IS NULL
            ORDER BY started_at DESC LIMIT 1
          )
          AND orders."deliveryDate" IS DISTINCT FROM (
            shopping."date" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'
          )::date
        )::int AS old_orders_with_unexpected_date
      FROM "Order" AS orders
      JOIN "ShoppingDay" AS shopping ON shopping.id = orders."shoppingDayId"`;
  }
  console.log(JSON.stringify({ columns, counts, migrations, deliveryCheck }, null, 2));
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
