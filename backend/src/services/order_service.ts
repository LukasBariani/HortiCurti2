import prisma from "../lib/prisma";

export const createOrder = async (data: any) => {
  return await prisma.order.create( { data } );
};

export const deleteOrder = async (id : string) => {
  return await prisma.order.delete( { where : { id}   } );
};

export const findAllOrders = async () => {
  return await prisma.order.findMany();
};

export const findOrderById = async (id: string) => {
  return await prisma.order.findUnique({ where : { id } });
};
