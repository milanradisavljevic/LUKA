const MAX_BODY_BYTES = 12 * 1024;
const DESCRIPTION_MIN_CHARS = 10;
const DESCRIPTION_MAX_CHARS = 4_000;
const CONTACT_EMAIL_MAX_CHARS = 254;
const BUG_REPORT_RECIPIENT = 'milanradisavljevic7@gmail.com';
const BUG_REPORT_SUBJECT = '[LUKA] Neuer Fehlerbericht';

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};

export async function handleRequest(request, env, sendFetch = fetch) {
  const url = new URL(request.url);
  if (request.method !== 'POST' || url.pathname !== '/v1/reports') {
    return jsonResponse({ status: 'method_not_allowed' }, 405);
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ status: 'invalid_request' }, 400);
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ status: 'invalid_request' }, 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return jsonResponse({ status: 'invalid_request' }, 413);
  }

  const report = parseReport(rawBody);
  if (!report) {
    return jsonResponse({ status: 'invalid_request' }, 400);
  }

  const rateKey = await rateLimitKey(request);
  const { success } = await env.REPORT_RATE_LIMIT.limit({ key: rateKey });
  if (!success) {
    return jsonResponse({ status: 'rate_limited' }, 429);
  }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    return jsonResponse({ status: 'delivery_unavailable' }, 503);
  }

  let deliveryResponse;
  try {
    deliveryResponse = await sendFetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM,
        to: [BUG_REPORT_RECIPIENT],
        subject: BUG_REPORT_SUBJECT,
        text: formatEmail(report),
      }),
    });
  } catch {
    return jsonResponse({ status: 'delivery_unavailable' }, 503);
  }

  if (!deliveryResponse.ok) {
    return jsonResponse({ status: 'delivery_unavailable' }, 503);
  }

  return jsonResponse({ status: 'accepted' }, 202);
}

function parseReport(rawBody) {
  let value;
  try {
    value = JSON.parse(rawBody);
  } catch {
    return null;
  }

  if (!isRecord(value) || !hasOnlyKeys(value, ['description', 'contactEmail', 'systemInfo'])) {
    return null;
  }
  if (!isSafeText(value.description, DESCRIPTION_MIN_CHARS, DESCRIPTION_MAX_CHARS)) {
    return null;
  }
  if (value.contactEmail !== undefined && value.contactEmail !== null && !isContactEmail(value.contactEmail)) {
    return null;
  }
  if (value.systemInfo !== undefined && value.systemInfo !== null && !isSystemInfo(value.systemInfo)) {
    return null;
  }

  return {
    description: value.description.trim(),
    contactEmail: value.contactEmail?.trim() || null,
    systemInfo: value.systemInfo || null,
  };
}

function isSystemInfo(value) {
  return isRecord(value)
    && hasOnlyKeys(value, ['appVersion', 'os', 'arch'])
    && isSafeText(value.appVersion, 1, 80)
    && isSafeText(value.os, 1, 40)
    && isSafeText(value.arch, 1, 40);
}

function isSafeText(value, minimum, maximum) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  const length = Array.from(trimmed).length;
  return length >= minimum
    && length <= maximum
    && !Array.from(value).some((character) => {
      const code = character.codePointAt(0);
      return code < 32 && character !== '\n' && character !== '\r' && character !== '\t';
    });
}

function isContactEmail(value) {
  return typeof value === 'string'
    && value.length <= CONTACT_EMAIL_MAX_CHARS
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value, allowedKeys) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function formatEmail(report) {
  const lines = [
    'LUKA Fehlerbericht',
    '',
    'Beschreibung:',
    report.description,
  ];
  if (report.contactEmail) {
    lines.push('', `Kontakt-E-Mail: ${report.contactEmail}`);
  }
  if (report.systemInfo) {
    lines.push(
      '',
      'Systeminfos:',
      `App-Version: ${report.systemInfo.appVersion}`,
      `Betriebssystem: ${report.systemInfo.os}`,
      `Architektur: ${report.systemInfo.arch}`,
    );
  }
  return lines.join('\n');
}

async function rateLimitKey(request) {
  const source = request.headers.get('CF-Connecting-IP') || 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
