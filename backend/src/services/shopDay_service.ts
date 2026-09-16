import prisma from "../lib/prisma";
import { parseISODate, todayInSaoPaulo } from "../lib/delivery_date";

export const createShopDay = async (data: any) => {
  return await prisma.shoppingDay.create({ data });
};

export const deleteShopDay = async (id: string) => {
  return await prisma.shoppingDay.delete({ where: { id } });
};

export const findAllShopDay = async () => {
  return await prisma.shoppingDay.findMany();
};

export const findShopDayById = async (id: string) => {
  return await prisma.shoppingDay.findUnique({ where: { id } });
};

export const getConsolidatedByDeliveryDate = async (date: unknown) => {
  const consolidado = new Map();

  const orders = await prisma.order.findMany({
    where: {
      deliveryDate: parseISODate(date),
      status: 'pending',
    },
    include: { items: true, client: true },
  });

  for (const order of orders) {
    for (const item of order.items) {
      // Não somar kg com caixas do mesmo produto.
      const key = JSON.stringify([item.productName, item.unit]);
      if (consolidado.has(key)) {
        // produto já existe — pega o valor atual e soma
        const atual = consolidado.get(key);
        consolidado.set(key, {
          ...atual,
          totalQuantity: atual.totalQuantity + item.quantity,
          itemIds: [...atual.itemIds, item.id],
          clientes: [
            ...atual.clientes,
            { nome: order.client.name, quantidade: item.quantity },
          ],
        });
      } else {
        // produto novo — adiciona pela primeira vez
        consolidado.set(key, {
          productName: item.productName,
          unit: item.unit,
          totalQuantity: item.quantity,
          itemIds: [item.id],
          costPrice: item.costPrice,
          salePrice: item.salePrice,
          margin: item.margin,
          clientes: [{ nome: order.client.name, quantidade: item.quantity }],
        });
      }
    }
  }
  return Array.from(consolidado.values());
};

export const getTodayConsolidatedList = () => getConsolidatedByDeliveryDate(todayInSaoPaulo());

export const findOrCreateTodayShoppingDay = async () => {
  const today = new Date();
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    0,
    0,
    0,
  );
  const endOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
  );

  const shopDay = await prisma.shoppingDay.findFirst({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: "open",
    },
  });

  if (!shopDay) {
    return await prisma.shoppingDay.create({
      data: { date: today, status: "open" },
    });
  }
  return shopDay;
};
