import prisma from '../lib/prisma';

export async function getHealth() {
  await prisma.$queryRaw`SELECT 1`;
  return {
    status: 'ok',
    database: 'connected',
    timestamp: new Date().toISOString(),
  };
}
