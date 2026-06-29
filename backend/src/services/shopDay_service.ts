import prisma from "../lib/prisma";

export const createShopDay = async (data: any) => {
  return await prisma.shoppingDay.create( { data } );
};

export const deleteShopDay = async (id : string) => {
  return await prisma.shoppingDay.delete( { where : { id}   } );
};

export const findAllShopDay = async () => {
  return await prisma.shoppingDay.findMany();
};

export const findShopDayById = async (id: string) => {
  return await prisma.shoppingDay.findUnique({ where : { id } });
};
