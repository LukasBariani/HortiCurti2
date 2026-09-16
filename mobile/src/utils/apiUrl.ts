// Em desenvolvimento, API e Expo rodam no mesmo PC, nas portas 3000 e 8081.
export function resolveApiUrl(hostUri?: string | null, configuredUrl?: string): string {
  if (configuredUrl?.trim()) return configuredUrl.trim().replace(/\/+$/, '');
  if (hostUri) {
    try {
      const host = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname;
      // Um túnel do Expo encaminha o Metro, não a porta 3000 do backend.
      if (host && !host.endsWith('.exp.direct') && !host.endsWith('.expo.dev')) {
        return `http://${host}:3000`;
      }
    } catch { /* Usa o endereço local conhecido quando o manifesto não fornece um host válido. */ }
  }
  return 'http://192.168.0.5:3000';
}
