import prisma from "../lib/prisma";
import { findOrCreateTodayShoppingDay } from "./shopDay_service";

export const createOrder = async (data: any) => {
  return await prisma.order.create({
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
  return await prisma.order.delete({
    where: { id },
  });
};

export const findAllOrders = async () => {
  return await prisma.order.findMany({
    include: {
      items: true,
      client: true,
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
    },

    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getTodayOrders = async () => {
  console.log("🔎 Buscando ShoppingDay de hoje...");

  const shopDay = await findOrCreateTodayShoppingDay();

  console.log("📅 ShoppingDay encontrado:", shopDay);

  const orders = await prisma.order.findMany({
    where: {
      shoppingDayId: shopDay.id,
    },

    include: {
      items: true,
      client: true,
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  console.log("📦 Pedidos encontrados:", orders.length);

  return orders;
};
