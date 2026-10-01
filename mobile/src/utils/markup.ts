// Empty means no preference; zero is an explicit sale at cost.
export function parseMarkup(input: string): number | null {
  const value = input.trim();
  if (!value) return null;
  if (!/^\d+(?:[.,]\d+)?$/.test(value)) throw new Error('Informe um percentual válido, como 40 ou 32,5.');
  const parsed = Number(value.replace(',', '.'));
  if (!Number.isFinite(parsed)) throw new Error('Informe um percentual válido.');
  return parsed;
}
