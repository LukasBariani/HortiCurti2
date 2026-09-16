const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveApiUrl } = require('../../mobile/src/utils/apiUrl.ts');
const { toCalendarDate, fromCalendarDate } = require('../../mobile/src/utils/deliveryDate.ts');

test('API acompanha o host LAN do Expo, sem reutilizar a porta do Metro', () => {
  assert.equal(resolveApiUrl('192.168.0.5:8081'), 'http://192.168.0.5:3000');
  assert.equal(resolveApiUrl('192.168.1.22:8081'), 'http://192.168.1.22:3000');
  assert.equal(resolveApiUrl('exp://192.168.0.5:8081'), 'http://192.168.0.5:3000');
});

test('configuração explícita tem prioridade e túnel Expo não vira endereço da API', () => {
  assert.equal(resolveApiUrl('192.168.0.5:8081', 'https://api.example.test/'), 'https://api.example.test');
  assert.equal(resolveApiUrl('project.exp.direct'), 'http://192.168.0.5:3000');
  assert.equal(resolveApiUrl(undefined), 'http://192.168.0.5:3000');
});

test('seleção de calendário preserva dia, mês e ano no fuso do aparelho', () => {
  for (const iso of ['2026-09-05', '2026-12-31', '2027-01-01', '2028-02-29']) {
    const date = toCalendarDate(iso);
    assert.equal(fromCalendarDate(date), iso);
    assert.equal(date.getHours(), 12);
  }
});
