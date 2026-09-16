BEGIN;

-- Primeiro permite NULL para preservar os pedidos existentes durante o preenchimento.
ALTER TABLE "Order" ADD COLUMN "deliveryDate" DATE;

-- Prisma grava os instantes de ShoppingDay.date em UTC no TIMESTAMP sem fuso.
-- Recupera o dia de calendário do negócio em São Paulo, conforme a regra aprovada.
UPDATE "Order" AS orders
SET "deliveryDate" = (
  shopping."date" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'
)::date
FROM "ShoppingDay" AS shopping
WHERE shopping."id" = orders."shoppingDayId";

ALTER TABLE "Order" ALTER COLUMN "deliveryDate" SET NOT NULL;
CREATE INDEX "Order_deliveryDate_idx" ON "Order"("deliveryDate");

COMMIT;
