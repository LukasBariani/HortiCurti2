import prisma from "../lib/prisma";

export const createOrder = async (data: any) => {
  return prisma.order.create({
    data: {
      clientId: data.clientId,
      shoppingDayId: data.shoppingDayId,
      rawMessage: data.rawMessage,

      items: {
        create: data.items.map((item: any) => ({
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
};

export const deleteOrder = async (id: string) => {
  return await prisma.order.delete({ where: { id } });
};

export const findAllOrders = async () => {
  return await prisma.order.findMany();
};

export const findOrderById = async (id: string) => {
  return await prisma.order.findUnique({ where: { id } });
};

export const findOrdersByClientId = async (clientId: string) => {
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
  const agora = new Date();
  return await prisma.order.findMany({
    where: {
      createdAt: { gte: seteDiasAtras, lte: agora },
      clientId: clientId,
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

const seteDiasAtras = new Date();
seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
export const findOrdersByShoppingDayId = async (shoppingDayId: string) => {
  return await prisma.order.findMany({ where: { shoppingDayId } });
};
