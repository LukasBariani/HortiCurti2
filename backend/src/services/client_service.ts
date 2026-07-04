import prisma from "../lib/prisma";

export const createClient = async (data: any) => {
  return await prisma.client.create({ data });
};

export const deleteClient = async (id: string) => {
  return await prisma.client.delete({ where: { id } });
};

export const findAllClients = async () => {
  return await prisma.client.findMany();
};

export const findCLientById = async (id: string) => {
  return await prisma.client.findUnique({ where: { id } });
};

export const findCLientByPhone = async (phone: string) => {
  return await prisma.client.findUnique({ where: { whatsappNumber: phone } });
};
