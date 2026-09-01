// src/services/api.ts
const BASE_URL = 'http://192.168.137.156:3000';

export async function getListaConsolidada() {
  try {
    const response = await fetch(`${BASE_URL}/shopDay/consolidated/today`);
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

export async function getOrdersToday() {
  try {
    const response = await fetch(`${BASE_URL}/order/today`);
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

export async function getDashboardData() {
  try {
    const response = await fetch(`${BASE_URL}/dashboard`);
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
