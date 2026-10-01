import prisma from "../lib/prisma";

export class ClientInputError extends Error {}

export function validateMarkup(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ClientInputError('Informe um acréscimo percentual maior ou igual a zero, ou deixe sem padrão.');
  }
  return value;
}

export const createClient = async (data: any) => {
  return prisma.client.create({ data: validateClient(data) });
};

function validateClient(data: any) {
  if (typeof data?.name !== 'string' || !data.name.trim() || data.name.trim().length > 120) throw new ClientInputError('Informe um nome entre 1 e 120 caracteres.');
  if (typeof data?.whatsappNumber !== 'string' || !/^[+\d\s().-]+$/.test(data.whatsappNumber)) throw new ClientInputError('Informe um WhatsApp válido com DDI e DDD.');
  const whatsappNumber = data.whatsappNumber.replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(whatsappNumber)) throw new ClientInputError('Informe um WhatsApp entre 10 e 15 dígitos, incluindo DDD.');
  return { name: data.name.trim(), whatsappNumber, defaultMarkupPercent: data.defaultMarkupPercent === undefined ? null : validateMarkup(data.defaultMarkupPercent) };
}

export const updateClient = async (id: string, data: any) => {
  const fields = validateClient(data);
  // O percentual ausente não apaga uma preferência existente.
  return prisma.client.update({ where: { id }, data: { ...fields, ...(data.defaultMarkupPercent === undefined ? { defaultMarkupPercent: undefined } : {}) } });
};

export const updateClientMarkup = async (id: string, value: unknown) => {
  const defaultMarkupPercent = validateMarkup(value);
  return prisma.client.update({ where: { id }, data: { defaultMarkupPercent } });
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
