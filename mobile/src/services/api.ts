const BASE_URL = 'http://192.168.0.5:3000';

export async function getListaConsolidada() {
  const response = await fetch(`${BASE_URL}/shopDay/consolidated/today`);
  const data = await response.json();
  return data;
}

export async function getOrdersToday() {
  const response = await fetch(`${BASE_URL}/order/today`);
  const data = await response.json();
  return data;
}
