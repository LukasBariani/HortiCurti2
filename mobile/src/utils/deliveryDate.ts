export function todayInSaoPaulo(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function formatDeliveryDate(iso: string): string {
  return iso.slice(0, 10).split('-').reverse().join('/');
}
export function parseDateInput(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const iso = `${match[3]}-${match[2]}-${match[1]}`;
  const date = new Date(`${iso}T00:00:00.000Z`);
  if (+match[3] < 1 || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
  return iso;
}
export function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  if (date.getUTCFullYear() < 1 || date.getUTCFullYear() > 9999) return iso;
  return date.toISOString().slice(0, 10);
}
export const productUnitKey = (item: { productName: string; unit: string }) =>
  JSON.stringify([item.productName, item.unit]);

// O calendário nativo usa o fuso do aparelho. Preserve os componentes do dia,
// em vez de converter a seleção para UTC com toISOString().
export function toCalendarDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setFullYear(year);
  return date;
}
export function fromCalendarDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
