import prisma from '../lib/prisma';
import { OrderError, orderInclude, snapshotOrder } from './order_service';

export const updatePricing = async (id: string, costPrice: number, margin: number) => {
  if (!Number.isFinite(costPrice) || costPrice < 0) throw new Error('Preço de custo inválido.');
  if (!Number.isFinite(margin) || margin < 0) throw new Error('Margem inválida.');
  const salePrice = costPrice * (1 + margin / 100);
  if (!Number.isFinite(salePrice)) throw new OrderError('Preço de venda inválido.');
  return prisma.$transaction(async tx => {
    const item = await tx.orderItem.findUnique({ where: { id } });
    if (!item) throw new OrderError('Item não encontrado.', 404);
    // Serialize prices of different items in the same order with delivery/edit operations.
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${item.orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: item.orderId }, include: orderInclude });
    if (order.status !== 'pending') throw new OrderError('Somente pedidos pendentes podem ser precificados.');
    const updated = await tx.order.updateMany({ where: { id: order.id, version: order.version }, data: { version: { increment: 1 } } });
    if (!updated.count) throw new OrderError('O pedido foi alterado. Atualize e tente novamente.', 409);
    const result = await tx.orderItem.update({ where: { id }, data: { costPrice, margin, salePrice } });
    const after = await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
    await tx.orderHistory.create({ data: { orderId: order.id, actor: 'app', action: 'pricing_changed', before: snapshotOrder(order), after: snapshotOrder(after) } });
    return result;
  });
};
