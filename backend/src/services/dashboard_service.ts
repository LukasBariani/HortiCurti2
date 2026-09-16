import prisma from '../lib/prisma';
import { parseISODate, todayInSaoPaulo } from '../lib/delivery_date';

const shiftIsoDate = (iso: string, days: number) => {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const getSalesSummary = async (days = 30) => {
  const safeDays = Math.min(Math.max(Math.trunc(days), 7), 90);
  const endDate = todayInSaoPaulo();
  const startDate = shiftIsoDate(endDate, -(safeDays - 1));
  const orders = await prisma.order.findMany({
    where: { status: 'delivered', deliveredAt: { gte: new Date(`${startDate}T00:00:00-03:00`), lt: new Date(`${shiftIsoDate(endDate, 1)}T00:00:00-03:00`) } },
    include: { items: true, client: true },
    orderBy: { deliveredAt: 'asc' },
  });

  const daily = new Map<string, { date: string; revenue: number; cost: number; profit: number; orders: number }>();
  for (let offset = 0; offset < safeDays; offset++) {
    const date = shiftIsoDate(startDate, offset);
    daily.set(date, { date, revenue: 0, cost: 0, profit: 0, orders: 0 });
  }
  const products = new Map<string, { productName: string; revenue: number; profit: number; quantity: number }>();
  let revenue = 0;
  let cost = 0;
  let pricedItems = 0;
  let unpricedItems = 0;
  let pricedOrders = 0;

  for (const order of orders) {
    const key = todayInSaoPaulo(order.deliveredAt!);
    const day = daily.get(key)!;
    day.orders++;
    if (order.items.some((item) => item.salePrice != null && item.costPrice != null)) pricedOrders++;
    for (const item of order.items) {
      if (item.salePrice == null || item.costPrice == null) {
        unpricedItems++;
        continue;
      }
      pricedItems++;
      const itemRevenue = item.salePrice * item.quantity;
      const itemCost = item.costPrice * item.quantity;
      revenue += itemRevenue;
      cost += itemCost;
      day.revenue += itemRevenue;
      day.cost += itemCost;
      day.profit += itemRevenue - itemCost;
      const product = products.get(item.productName) ?? {
        productName: item.productName, revenue: 0, profit: 0, quantity: 0,
      };
      product.revenue += itemRevenue;
      product.profit += itemRevenue - itemCost;
      product.quantity += item.quantity;
      products.set(item.productName, product);
    }
  }

  const profit = revenue - cost;
  return {
    period: { startDate, endDate, days: safeDays },
    totals: {
      revenue, cost, profit, orders: orders.length,
      averageTicket: pricedOrders ? revenue / pricedOrders : 0,
      margin: revenue ? (profit / revenue) * 100 : 0,
      pricedItems, unpricedItems, pricedOrders,
    },
    daily: Array.from(daily.values()),
    topProducts: Array.from(products.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    recentOrders: orders.slice(-8).reverse().map((order) => ({
      id: order.id,
      clientName: order.client.name,
      deliveryDate: order.deliveryDate,
      deliveredAt: order.deliveredAt,
      itemCount: order.items.length,
      revenue: order.items.reduce((sum, item) => sum + (item.salePrice ?? 0) * item.quantity, 0),
      profit: order.items.reduce((sum, item) => sum + ((item.salePrice ?? 0) - (item.costPrice ?? 0)) * item.quantity, 0),
      isFullyPriced: order.items.every((item) => item.salePrice != null && item.costPrice != null),
    })),
  };
};
