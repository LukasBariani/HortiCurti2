import prisma from '../lib/prisma';
import { OrderError, orderInclude, snapshotOrder } from './order_service';

export const priceOrder = async (id: string, data: any) => {
  if (!Number.isInteger(data?.version) || data.version < 0) throw new OrderError('Informe a versão atual do pedido.');
  if (typeof data.markupPercent !== 'number' || !Number.isFinite(data.markupPercent) || data.markupPercent < 0) throw new OrderError('Informe um acréscimo válido.');
  if (!Array.isArray(data.items) || !data.items.length) throw new OrderError('Informe os custos de todos os itens.');
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new OrderError('Pedido não encontrado.', 404);
    if (order.version !== data.version) throw new OrderError('O pedido foi alterado. Atualize e confira os valores.', 409);
    if (order.status !== 'pending') throw new OrderError('Somente pedidos pendentes podem ser precificados.');
    if (data.items.length !== order.items.length || new Set(data.items.map((i: any) => i?.id)).size !== order.items.length) throw new OrderError('Informe todos os itens, sem duplicação.');
    const prices = data.items.map((item: any) => {
      if (!order.items.some(original => original.id === item?.id)) throw new OrderError('Item não pertence ao pedido.');
      if (typeof item.costPrice !== 'number' || !Number.isFinite(item.costPrice) || item.costPrice < 0) throw new OrderError('Informe um custo válido para cada item.');
      const calculated = Math.round((item.costPrice * (1 + data.markupPercent / 100) + Number.EPSILON) * 100) / 100;
      const salePrice = item.salePrice === undefined ? calculated : item.salePrice;
      if (typeof salePrice !== 'number' || !Number.isFinite(salePrice) || salePrice < 0 || salePrice > Number.MAX_SAFE_INTEGER / 100) throw new OrderError('Preço de venda inválido.');
      return { id: item.id, costPrice: item.costPrice, salePrice, margin: item.costPrice > 0 ? (salePrice / item.costPrice - 1) * 100 : null };
    });
    const changed = await tx.order.updateMany({ where: { id, version: data.version }, data: { pricingMarkupPercent: data.markupPercent, version: { increment: 1 } } });
    if (!changed.count) throw new OrderError('O pedido foi alterado. Atualize e tente novamente.', 409);
    for (const { id: itemId, ...price } of prices) await tx.orderItem.update({ where: { id: itemId }, data: price });
    const after = await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    await tx.orderHistory.create({ data: { orderId: id, actor: 'app', action: 'pricing_changed', before: snapshotOrder(order), after: snapshotOrder(after) } });
    return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
  });
};
