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
