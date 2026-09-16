ALTER TABLE "Order" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "deliveredAt" TIMESTAMP(3);
CREATE INDEX "Order_status_deliveredAt_idx" ON "Order"("status", "deliveredAt");
CREATE TABLE "OrderHistory" (
 "id" TEXT NOT NULL,
 "orderId" TEXT NOT NULL,
 "action" TEXT NOT NULL,
 "actor" TEXT NOT NULL,
 "before" JSONB,
 "after" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "OrderHistory_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrderHistory_orderId_createdAt_idx" ON "OrderHistory"("orderId", "createdAt");
ALTER TABLE "OrderHistory" ADD CONSTRAINT "OrderHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
