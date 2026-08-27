import prisma from "../lib/prisma";

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

export const getTodayConsolidatedList = async () => {
  const Today = await findOrCreateTodayShoppingDay();

  const consolidado = new Map();

  const orders = await prisma.order.findMany({
    where: {
      shoppingDayId: Today.id,
    },
    include: { items: true },
  });

  for (const order of orders) {
    for (const item of order.items) {
      if (consolidado.has(item.productName)) {
        // produto já existe — pega o valor atual e soma
        const atual = consolidado.get(item.productName);
        consolidado.set(item.productName, {
          ...atual,
          totalQuantity: atual.totalQuantity + item.quantity,
        });
      } else {
        // produto novo — adiciona pela primeira vez
        consolidado.set(item.productName, {
          productName: item.productName,
          unit: item.unit,
          totalQuantity: item.quantity,
        });
      }
    }
  }
  return Array.from(consolidado.values());
};

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
