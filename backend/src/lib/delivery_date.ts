// Datas de entrega são dias de calendário, sem horário. O negócio usa São Paulo.
export class DeliveryDateError extends Error {}

export function todayInSaoPaulo(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function parseISODate(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new DeliveryDateError('Informe a data no formato YYYY-MM-DD.');
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (year < 1 || !Number.isFinite(date.getTime()) || date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    throw new DeliveryDateError('Essa data não existe no calendário. Envie outra data.');
  }
  return date;
}

export function validateDeliveryDate(value: unknown, now = new Date()): Date {
  const date = parseISODate(value);
  if ((value as string) < todayInSaoPaulo(now)) {
    throw new DeliveryDateError('Essa data já passou. Envie outra data para hoje ou para o futuro.');
  }
  return date;
}

export function parseDeliveryMessage(value: string, now = new Date()): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    throw new DeliveryDateError('Envie a data completa no formato DD/MM/AAAA.');
  }
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  validateDeliveryDate(iso, now);
  return iso;
}

export function formatDeliveryDate(value: string | Date): string {
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}
