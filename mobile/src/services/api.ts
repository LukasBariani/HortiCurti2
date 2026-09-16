import { todayInSaoPaulo } from '../utils/deliveryDate';
import Constants from 'expo-constants';
import { resolveApiUrl } from '../utils/apiUrl';

const BASE_URL = resolveApiUrl(
  __DEV__ ? Constants.expoConfig?.hostUri : undefined,
  process.env.EXPO_PUBLIC_API_URL,
);

export async function getListaConsolidada(date = todayInSaoPaulo()) {
  try {
    const response = await fetch(`${BASE_URL}/shopDay/consolidated?date=${encodeURIComponent(date)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro em getListaConsolidada:', error);
    throw error;
  }
}

export async function getOrdersByDeliveryDate(date = todayInSaoPaulo()) {
  try {
    const response = await fetch(`${BASE_URL}/order/delivery?date=${encodeURIComponent(date)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro em getOrdersToday:', error);
    throw error;
  }
}

export async function getClients() {
  try {
    const response = await fetch(`${BASE_URL}/clients`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro em getClients:', error);
    throw error;
  }
}

export async function createClient(client: any) {
  try {
    console.log('Criando cliente:', client);

    const response = await fetch(`${BASE_URL}/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(client),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro na resposta:', response.status, errorData);
      throw new Error(`HTTP error! status: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('Cliente criado:', data);
    return data;
  } catch (error) {
    console.error('Erro em createClient:', error);
    throw error;
  }
}
// src/services/api.ts

export async function getClientInfo(clientId: string) {
  try {
    const response = await fetch(`${BASE_URL}/clients/${clientId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Erro em getClientInfo:', error);
    throw error;
  }
}

export async function getClientOrders(clientId: string) {
  try {
    const response = await fetch(`${BASE_URL}/clients/${clientId}/orders`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Erro em getClientOrders:', error);
    throw error;
  }
}

export async function getDashboardData(days = 30) {
  try {
    const response = await fetch(`${BASE_URL}/dashboard?days=${days}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Erro em getDashboardData:', error);
    throw error;
  }
}

export async function updateOrderItemPricing(id: string, costPrice: number, margin: number) {
  const response = await fetch(`${BASE_URL}/order-items/${id}/pricing`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ costPrice, margin }),
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
}

export const getOrdersToday = () => getOrdersByDeliveryDate();

export class OrderMutationError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function patchOrder(path: string, body: unknown) {
  const response = await fetch(`${BASE_URL}/order/${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new OrderMutationError(result.error || result.message || 'Não foi possível atualizar o pedido.', response.status);
  return result;
}
export const updateOrderStatus = (id: string, status: string, version: number) => patchOrder(`${id}/status`, { status, version });
export const deliverOrder = (id: string, body: { version: number; items: { id: string; missingQuantity: number; carryForward: boolean }[] }) => patchOrder(`${id}/deliver`, body);
export const editOrder = (id: string, body: { version: number; deliveryDate?: string; items: { id: string; quantity: number }[] }) => patchOrder(id, body);
