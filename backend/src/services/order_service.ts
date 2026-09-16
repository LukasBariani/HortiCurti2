import prisma from "../lib/prisma";
import { findOrCreateTodayShoppingDay } from "./shopDay_service";
import { parseISODate, todayInSaoPaulo, validateDeliveryDate } from "../lib/delivery_date";

export class OrderError extends Error {
  constructor(message: string, public statusCode = 400) { super(message); }
}
export const orderInclude = {
  items: true,
  client: true,
  history: { orderBy: { createdAt: 'asc' as const } },
  originatedBackorders: true,
  receivedBackorders: true,
};
export const snapshotOrder = (order: any) => JSON.parse(JSON.stringify({
  status: order.status, deliveryDate: order.deliveryDate, deliveredAt: order.deliveredAt,
  version: order.version, items: order.items,
  originatedBackorders: order.originatedBackorders ?? [],
  receivedBackorders: order.receivedBackorders ?? [],
}));
const requireVersion = (version: unknown) => {
  if (!Number.isInteger(version) || (version as number) < 0) throw new OrderError('Informe a versão atual do pedido.');
};
export const createOrder = async (data: any, actor: 'app' | 'whatsapp' = 'app') => {
  const deliveryDate = validateDeliveryDate(data?.deliveryDate);
  const shoppingDayId = data.shoppingDayId ?? (await findOrCreateTodayShoppingDay()).id;
  if (!Array.isArray(data.items) || !data.items.length || data.items.some((item: any) =>
    !item || typeof item.productName !== 'string' || !item.productName.trim() || typeof item.unit !== 'string' || !item.unit.trim() ||
    !Number.isFinite(item.quantity) || item.quantity <= 0)) throw new OrderError('Informe produtos e quantidades válidos.');
  return prisma.$transaction(async (tx) => {
  await tx.$queryRaw`SELECT "id" FROM "ClientBackorder" WHERE "clientId" = ${data.clientId} AND "status" = 'pending' FOR UPDATE`;
  const pendingBackorders = await tx.clientBackorder.findMany({ where: { clientId: data.clientId, status: 'pending' } });
  const mergedItems = new Map<string, { productName: string; quantity: number; unit: string }>();
  for (const item of [...data.items, ...pendingBackorders]) {
    const productName = item.productName.trim();
    const unit = item.unit.trim();
    const key = JSON.stringify([productName.toLocaleLowerCase('pt-BR'), unit.toLocaleLowerCase('pt-BR')]);
    const current = mergedItems.get(key);
    mergedItems.set(key, { productName, unit, quantity: (current?.quantity ?? 0) + item.quantity });
  }
  const order = await tx.order.create({
    data: {
      clientId: data.clientId,
      shoppingDayId,
      rawMessage: data.rawMessage,
      deliveryDate,
      status: 'pending',

      items: {
        create: Array.from(mergedItems.values()).map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
        })),
      },
    },

    include: {
      items: true,
    },
  });
  if (pendingBackorders.length) {
    await tx.clientBackorder.updateMany({
      where: { id: { in: pendingBackorders.map(item => item.id) }, status: 'pending' },
      data: { status: 'transferred', targetOrderId: order.id, transferredAt: new Date() },
    });
  }
  const completeOrder = await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
  await tx.orderHistory.create({ data: { orderId: order.id, action: 'created', actor, after: snapshotOrder(completeOrder) } });
  return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
  });
};

export const changeOrderStatus = async (id: string, status: unknown, version: unknown, actor: 'app' | 'whatsapp' = 'app') => {
  requireVersion(version);
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new OrderError('Pedido não encontrado.', 404);
    if (order.version !== version) throw new OrderError('O pedido foi alterado. Atualize a lista e tente novamente.', 409);
    if (status !== 'cancelled' || order.status !== 'pending') throw new OrderError('Somente pedidos pendentes podem ser cancelados. Use a conferência de entrega para marcar como entregue.');
    const changed = await tx.order.updateMany({ where: { id, version: version as number }, data: { status, version: { increment: 1 } } });
    if (!changed.count) throw new OrderError('O pedido foi alterado. Atualize a lista e tente novamente.', 409);
    await tx.clientBackorder.updateMany({
      where: { targetOrderId: id, status: 'transferred' },
      data: { status: 'pending', targetOrderId: null, transferredAt: null },
    });
    const after = await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    await tx.orderHistory.create({ data: { orderId: id, action: 'status_changed', actor, before: snapshotOrder(order), after: snapshotOrder(after) } });
    return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
  });
};

export const deliverOrder = async (id: string, data: any, actor: 'app' | 'whatsapp' = 'app') => {
  requireVersion(data?.version);
  if (!Array.isArray(data?.items)) throw new OrderError('Informe a conferência de todos os itens.');
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${id} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new OrderError('Pedido não encontrado.', 404);
    if (order.version !== data.version) throw new OrderError('O pedido foi alterado. Atualize a lista e tente novamente.', 409);
    if (order.status !== 'pending') throw new OrderError('Somente pedidos pendentes podem ser entregues.');
    if (order.deliveryDate.toISOString().slice(0, 10) > todayInSaoPaulo()) throw new OrderError('Não é possível entregar um pedido com data futura.');
    const byId = new Map(order.items.map(item => [item.id, item]));
    if (data.items.length !== order.items.length || new Set(data.items.map((item: any) => item?.id)).size !== order.items.length || data.items.some((item: any) => !byId.has(item?.id))) {
      throw new OrderError('Confira todos os itens do pedido, sem duplicação.');
    }
    const checks = data.items.map((check: any) => {
      const item = byId.get(check.id)!;
      const missingQuantity = Number(check.missingQuantity);
      if (!Number.isFinite(missingQuantity) || missingQuantity < 0 || missingQuantity > item.quantity) throw new OrderError(`Quantidade faltante inválida para ${item.productName}.`);
      if (typeof check.carryForward !== 'boolean') throw new OrderError(`Informe se a falta de ${item.productName} irá para o próximo pedido.`);
      return { item, missingQuantity, carryForward: missingQuantity > 0 && check.carryForward, deliveredQuantity: item.quantity - missingQuantity };
    });
    if (checks.some((check: any) => check.deliveredQuantity > 0 && (check.item.costPrice == null || check.item.salePrice == null || check.item.costPrice < 0 || check.item.salePrice < 0 || !Number.isFinite(check.item.costPrice) || !Number.isFinite(check.item.salePrice)))) {
      throw new OrderError('Preencha o custo e o preço de todos os itens entregues antes de concluir.');
    }
    for (const check of checks) {
      if (check.deliveredQuantity === 0) await tx.orderItem.delete({ where: { id: check.item.id } });
      else if (check.deliveredQuantity !== check.item.quantity) await tx.orderItem.update({ where: { id: check.item.id }, data: { quantity: check.deliveredQuantity } });
      if (check.carryForward) await tx.clientBackorder.create({ data: {
        clientId: order.clientId, sourceOrderId: order.id, productName: check.item.productName,
        quantity: check.missingQuantity, unit: check.item.unit,
      } });
    }
    const changed = await tx.order.updateMany({ where: { id, version: data.version, status: 'pending' }, data: { status: 'delivered', deliveredAt: new Date(), version: { increment: 1 } } });
    if (!changed.count) throw new OrderError('O pedido foi alterado. Atualize a lista e tente novamente.', 409);
    const after = await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    await tx.orderHistory.create({ data: { orderId: id, action: 'delivered', actor, before: snapshotOrder(order), after: snapshotOrder(after) } });
    return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
  });
};
export const editOrder = async (id: string, data: any, actor: 'app' | 'whatsapp' = 'app') => {
  requireVersion(data?.version);
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new OrderError('Pedido não encontrado.', 404);
    if (order.version !== data.version) throw new OrderError('O pedido foi alterado. Atualize a lista e tente novamente.', 409);
    if (order.status !== 'pending') throw new OrderError('Só pedidos pendentes podem ser editados.');
    if (data.deliveryDate === undefined && data.items === undefined) throw new OrderError('Informe uma alteração.');
    const deliveryDate = data.deliveryDate === undefined ? order.deliveryDate : validateDeliveryDate(data.deliveryDate);
    if (data.items !== undefined && (!Array.isArray(data.items) || !data.items.length || data.items.some((i: any) => !i || !order.items.some(original => original.id === i.id) || !Number.isFinite(i.quantity) || i.quantity <= 0) || new Set(data.items.map((i: any) => i.id)).size !== data.items.length)) throw new OrderError('Informe itens do pedido com quantidades positivas e sem duplicação.');
    if (data.items !== undefined && order.receivedBackorders.length) {
      const required = new Map<string, number>();
      for (const item of order.receivedBackorders) {
        const key = JSON.stringify([item.productName.toLocaleLowerCase('pt-BR'), item.unit.toLocaleLowerCase('pt-BR')]);
        required.set(key, (required.get(key) ?? 0) + item.quantity);
      }
      const retained = new Map<string, number>();
      for (const candidate of data.items) {
        const original = order.items.find(item => item.id === candidate.id)!;
        const key = JSON.stringify([original.productName.toLocaleLowerCase('pt-BR'), original.unit.toLocaleLowerCase('pt-BR')]);
        retained.set(key, (retained.get(key) ?? 0) + candidate.quantity);
      }
      if (Array.from(required).some(([key, quantity]) => (retained.get(key) ?? 0) < quantity)) {
        throw new OrderError('Os itens trazidos de uma entrega anterior não podem ser removidos deste pedido. Eles podem ser conferidos novamente na entrega.');
      }
    }
    const changed = await tx.order.updateMany({ where: { id, version: data.version }, data: { deliveryDate, version: { increment: 1 } } });
    if (!changed.count) throw new OrderError('O pedido foi alterado. Atualize a lista e tente novamente.', 409);
    if (data.items !== undefined) {
      await tx.orderItem.deleteMany({ where: { orderId: id, id: { notIn: data.items.map((i: any) => i.id) } } });
      for (const item of data.items) await tx.orderItem.update({ where: { id: item.id }, data: { quantity: item.quantity } });
    }
    const after = await tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    await tx.orderHistory.create({ data: { orderId: id, action: 'edited', actor, before: snapshotOrder(order), after: snapshotOrder(after) } });
    return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
  });
};
export const deleteOrder = (id: string, version: unknown) => changeOrderStatus(id, 'cancelled', version);

export const findAllOrders = async () => {
  return await prisma.order.findMany({
    include: {
      items: true,
      client: true,
      history: orderInclude.history,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const findOrderById = async (id: string) => {
  return await prisma.order.findUnique({
    where: { id },

    include: {
      items: true,
      client: true,
      history: orderInclude.history,
    },
  });
};

export const findOrdersByClientId = async (clientId: string) => {
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  return await prisma.order.findMany({
    where: {
      clientId,
      createdAt: {
        gte: seteDiasAtras,
        lte: new Date(),
      },
    },

    include: {
      items: true,
      client: true,
      history: orderInclude.history,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

export const findOrdersByShoppingDayId = async (shoppingDayId: string) => {
  return await prisma.order.findMany({
    where: {
      shoppingDayId,
    },

    include: {
      items: true,
      client: true,
      history: orderInclude.history,
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getOrdersByDeliveryDate = async (date: unknown) => {
  return await prisma.order.findMany({
    where: {
      deliveryDate: parseISODate(date),
    },

    include: {
      items: true,
      client: true,
      history: orderInclude.history,
    },

    orderBy: {
      createdAt: "desc",
    },
  });

};

export const getTodayOrders = () => getOrdersByDeliveryDate(todayInSaoPaulo());
