-- O fluxo operacional passa a ter somente pedido pendente ou finalizado.
UPDATE "Order"
SET "status" = 'pending'
WHERE "status" IN ('confirmed', 'separated');

CREATE TABLE "ClientBackorder" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sourceOrderId" TEXT NOT NULL,
    "targetOrderId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferredAt" TIMESTAMP(3),
    CONSTRAINT "ClientBackorder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientBackorder_clientId_status_idx" ON "ClientBackorder"("clientId", "status");
CREATE INDEX "ClientBackorder_sourceOrderId_idx" ON "ClientBackorder"("sourceOrderId");
CREATE INDEX "ClientBackorder_targetOrderId_idx" ON "ClientBackorder"("targetOrderId");

ALTER TABLE "ClientBackorder" ADD CONSTRAINT "ClientBackorder_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientBackorder" ADD CONSTRAINT "ClientBackorder_sourceOrderId_fkey"
FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientBackorder" ADD CONSTRAINT "ClientBackorder_targetOrderId_fkey"
FOREIGN KEY ("targetOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
