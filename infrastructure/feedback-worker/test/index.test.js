import assert from 'node:assert/strict';
import test from 'node:test';

import { handleRequest } from '../src/index.js';

function environment({ rateLimitSuccess = true } = {}) {
  return {
    RESEND_API_KEY: 'test-secret',
    RESEND_FROM: 'LUKA Fehlerberichte <onboarding@resend.dev>',
    REPORT_RATE_LIMIT: { limit: async () => ({ success: rateLimitSuccess }) },
  };
}

function request(body, options = {}) {
  return new Request('https://luka-feedback.example.workers.dev/v1/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify(body),
  });
}

test('accepts a valid report and forwards only fixed mail routing', async () => {
  let sent;
  const response = await handleRequest(
    request({
      description: 'Die Vorschau bleibt nach dem Export leer.',
      contactEmail: 'lehrkraft@example.org',
      systemInfo: { appVersion: '1.5.0', os: 'windows', arch: 'x86_64' },
    }),
    environment(),
    async (_url, options) => {
      sent = JSON.parse(options.body);
      return new Response('{}', { status: 200 });
    },
  );

  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { status: 'accepted' });
  assert.deepEqual(sent.to, ['milanradisavljevic7@gmail.com']);
  assert.equal(sent.subject, '[LUKA] Neuer Fehlerbericht');
  assert.match(sent.text, /lehrkraft@example.org/);
});

test('rejects a short, malformed, or oversized report without delivery', async () => {
  for (const body of [
    { description: 'Zu kurz' },
    { description: 'Gültiger Bericht mit unbekanntem Feld', extra: true },
    { description: 'Gültiger Bericht, aber falsche Kontaktadresse', contactEmail: 'keine-adresse' },
    { description: 'a'.repeat(4_001) },
  ]) {
    const response = await handleRequest(request(body), environment(), async () => {
      throw new Error('must not send');
    });
    assert.equal(response.status, 400);
  }
});

test('rejects a request body larger than 12 KiB without delivery', async () => {
  const response = await handleRequest(new Request('https://example.test/v1/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: 'a'.repeat(13_000) }),
  }), environment(), async () => {
    throw new Error('must not send');
  });
  assert.equal(response.status, 413);
});

test('rejects non-POST routes and unsupported content types', async () => {
  const getResponse = await handleRequest(new Request('https://example.test/v1/reports'), environment());
  assert.equal(getResponse.status, 405);

  const textResponse = await handleRequest(new Request('https://example.test/v1/reports', {
    method: 'POST', body: 'plain text', headers: { 'Content-Type': 'text/plain' },
  }), environment());
  assert.equal(textResponse.status, 400);
});

test('returns 429 before sending when the rate limit is reached', async () => {
  const response = await handleRequest(
    request({ description: 'Die Vorschau bleibt nach dem Export leer.' }),
    environment({ rateLimitSuccess: false }),
    async () => { throw new Error('must not send'); },
  );
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { status: 'rate_limited' });
});

test('does not expose mail-provider failures', async () => {
  const response = await handleRequest(
    request({ description: 'Die Vorschau bleibt nach dem Export leer.' }),
    environment(),
    async () => new Response('provider detail', { status: 401 }),
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { status: 'delivery_unavailable' });
});
