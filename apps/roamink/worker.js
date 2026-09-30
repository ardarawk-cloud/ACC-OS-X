const IPAYMU_RELAY_BASE_URL = 'https://agent.nadmo.id/roamink-payment';
const PUBLIC_BASE_URL = 'https://roamink.nadmo.id';
const encoder = new TextEncoder();

const destinations = [
  { slug: 'indonesia', name: 'Indonesia', iso2: 'ID', region: 'Asia', featured: 1, hero_key: 'island' },
  { slug: 'japan', name: 'Japan', iso2: 'JP', region: 'Asia', featured: 1, hero_key: 'city' },
  { slug: 'thailand', name: 'Thailand', iso2: 'TH', region: 'Asia', featured: 1, hero_key: 'tropical' },
  { slug: 'europe', name: 'Europe', iso2: 'EU', region: 'Regional', featured: 1, hero_key: 'europe' },
  { slug: 'united-states', name: 'United States', iso2: 'US', region: 'Americas', featured: 1, hero_key: 'road' },
  { slug: 'australia', name: 'Australia', iso2: 'AU', region: 'Oceania', featured: 1, hero_key: 'coast' },
];

const products = [
  { id: 'preview-id-5', destination_slug: 'indonesia', title: 'Indonesia Essential', data_label: '5 GB', validity_days: 15, retail_price_minor: 119000, supports_5g: 1, preview: true },
  { id: 'preview-id-10', destination_slug: 'indonesia', title: 'Indonesia Plus', data_label: '10 GB', validity_days: 30, retail_price_minor: 179000, supports_5g: 1, preview: true },
  { id: 'preview-jp-5', destination_slug: 'japan', title: 'Japan Essential', data_label: '5 GB', validity_days: 15, retail_price_minor: 149000, supports_5g: 1, preview: true },
  { id: 'preview-jp-10', destination_slug: 'japan', title: 'Japan Plus', data_label: '10 GB', validity_days: 30, retail_price_minor: 229000, supports_5g: 1, preview: true },
  { id: 'preview-th-5', destination_slug: 'thailand', title: 'Thailand Essential', data_label: '5 GB', validity_days: 15, retail_price_minor: 129000, supports_5g: 1, preview: true },
  { id: 'preview-eu-10', destination_slug: 'europe', title: 'Europe Explorer', data_label: '10 GB', validity_days: 30, retail_price_minor: 319000, supports_5g: 1, preview: true },
  { id: 'preview-us-10', destination_slug: 'united-states', title: 'USA Roadtrip', data_label: '10 GB', validity_days: 30, retail_price_minor: 289000, supports_5g: 1, preview: true },
  { id: 'preview-au-10', destination_slug: 'australia', title: 'Australia Plus', data_label: '10 GB', validity_days: 30, retail_price_minor: 269000, supports_5g: 1, preview: true },
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(value) {
  return bytesToHex(await crypto.subtle.digest('SHA-256', encoder.encode(value))).toLowerCase();
}

async function hmacHex(value, key) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value)));
}

function timestamp() {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

function safeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function safePhone(value) {
  const phone = String(value || '').trim().replace(/[\s()-]/g, '');
  return /^\+?[0-9]{8,16}$/.test(phone) ? phone : '';
}

function normalizeCallbackBody(raw) {
  let source = {};
  if (typeof raw === 'string') {
    source = Object.fromEntries(new URLSearchParams(raw).entries());
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    source = raw;
  }

  const normalized = {};
  for (const [key, original] of Object.entries(source)) {
    if (key === 'signature') continue;

    if (key === 'is_escrow') {
      normalized[key] = original === true || original === 1 || original === '1' || original === 'true';
    } else if (['trx_id', 'status_code', 'transaction_status_code', 'paid_off'].includes(key)) {
      normalized[key] = Number.parseInt(String(original), 10);
    } else if (key === 'additional_info') {
      if (Array.isArray(original)) normalized[key] = original;
      else if (original === '[]' || original == null || original === '') normalized[key] = [];
      else normalized[key] = original;
    } else {
      normalized[key] = String(original ?? '');
    }
  }

  if (!Object.prototype.hasOwnProperty.call(normalized, 'additional_info')) {
    normalized.additional_info = [];
  }
  return normalized;
}

function sortedJsonForCallback(data) {
  const sorted = Object.keys(data)
    .sort((a, b) => a.localeCompare(b))
    .reduce((result, key) => {
      result[key] = data[key];
      return result;
    }, {});

  return JSON.stringify(sorted).replace(/\//g, '\\/');
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function parseBody(request) {
  const type = request.headers.get('content-type') || '';

  if (type.includes('application/json')) {
    try {
      return await request.json();
    } catch {
      return {};
    }
  }

  const text = await request.text();
  if (type.includes('application/x-www-form-urlencoded')) return text;
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function orderStore(env) {
  const id = env.ORDER_STORE.idFromName('roamink-orders');
  return env.ORDER_STORE.get(id);
}

async function addOrder(env, record) {
  const response = await orderStore(env).fetch('https://orders/add', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(record),
  });
  return response.json();
}

async function getOrder(env, id) {
  const response = await orderStore(env).fetch(
    'https://orders/get?id=' + encodeURIComponent(id)
  );

  if (response.status === 404) return null;
  return response.json();
}

async function updateOrder(env, id, patch) {
  const response = await orderStore(env).fetch('https://orders/update', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, patch }),
  });

  if (response.status === 404) return null;
  return response.json();
}

async function probeIpaymu(environment, apiKey, va) {
  const rawBody = '{}';
  const bodyHash = await sha256Hex(rawBody);
  const stringToSign = `GET:${va}:${bodyHash}:${apiKey}`;
  const signature = await hmacHex(stringToSign, apiKey);

  try {
    const response = await fetch(`${IPAYMU_RELAY_BASE_URL}/ipaymu/${environment}/api/areas/province`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        va,
        signature,
        timestamp: timestamp(),
      },
    });

    const payload = await response.json();

    return {
      http_status: response.status,
      authenticated: response.ok && payload.Success === true,
      message: payload.Message || null,
    };
  } catch {
    return {
      http_status: 0,
      authenticated: false,
      message: 'NETWORK_ERROR',
    };
  }
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'GET' && path === '/api/_healthcheck') {
    return json({ ok: true, service: 'roamink' });
  }

  if (request.method === 'GET' && path === '/api/config') {
    return json({
      environment: 'production',
      payment_environment: 'ipaymu-production',
      payment_configured: Boolean(env.IPAYMU_API_KEY && env.IPAYMU_VA),
      supplier_configured: false,
      turnstile_site_key: null,
    });
  }

  if (request.method === 'GET' && path === '/api/catalog') {
    return json({ source: 'preview', destinations, products });
  }

  if (request.method === 'GET' && path === '/api/payment-credential-check') {
    const apiKey = env.IPAYMU_API_KEY || '';
    const va = env.IPAYMU_VA || '';

    if (!apiKey || !va) {
      return json({ ok: false, error: 'PAYMENT_NOT_CONFIGURED' }, 503);
    }

    const [sandbox, production] = await Promise.all([
      probeIpaymu('sandbox', apiKey, va),
      probeIpaymu('production', apiKey, va),
    ]);

    return json({
      ok: true,
      sandbox,
      production,
      diagnosis:
        sandbox.authenticated
          ? 'SANDBOX_CREDENTIAL'
          : production.authenticated
            ? 'PRODUCTION_CREDENTIAL'
            : 'CREDENTIAL_NOT_ACCEPTED',
    });
  }

  if (request.method === 'POST' && path === '/api/checkout') {
    const raw = await parseBody(request);
    const payload =
      raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};

    const product = products.find(
      item => item.id === String(payload.product_id || '')
    );
    const email = safeEmail(payload.email);
    const phone = safePhone(payload.phone);
    const name = String(payload.name || '').trim().slice(0, 100);

    if (!product || !email || !phone || name.length < 2) {
      return json(
        { ok: false, error: { code: 'INVALID_CHECKOUT_DETAILS' } },
        400
      );
    }

    const apiKey = env.IPAYMU_API_KEY || '';
    const va = env.IPAYMU_VA || '';

    if (!apiKey || !va) {
      return json(
        { ok: false, error: { code: 'PAYMENT_NOT_CONFIGURED' } },
        503
      );
    }

    const now = new Date().toISOString();
    const created = await addOrder(env, {
      email,
      name,
      phone,
      productId: product.id,
      productTitle: product.title,
      amount: product.retail_price_minor,
      status: 'CREATED',
      fulfillmentState: 'WAITING_FOR_SUPPLIER',
      createdAt: now,
      updatedAt: now,
    });

    const orderId = created.id;
    const referenceId = `ROAM-${orderId}`;

    await updateOrder(env, orderId, {
      status: 'PENDING_PAYMENT',
      referenceId,
      paymentProvider: 'ipaymu-production',
      paymentChannel: 'hosted',
    });

    const gatewayBody = {
      product: [product.title],
      qty: ['1'],
      price: [String(product.retail_price_minor)],
      description: [
        `${product.title} — ${product.data_label}, ${product.validity_days} days`,
      ],
      returnUrl: `${PUBLIC_BASE_URL}/?payment=success&order=${encodeURIComponent(orderId)}`,
      notifyUrl: `${PUBLIC_BASE_URL}/api/payments/ipaymu/callback`,
      cancelUrl: `${PUBLIC_BASE_URL}/?payment=cancelled&order=${encodeURIComponent(orderId)}`,
      referenceId,
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone,
      feeDirection: 'MERCHANT',
    };

    const rawBody = JSON.stringify(gatewayBody);
    const bodyHash = await sha256Hex(rawBody);
    const stringToSign = `POST:${va}:${bodyHash}:${apiKey}`;
    const signature = await hmacHex(stringToSign, apiKey);

    let gatewayResponse;

    try {
      gatewayResponse = await fetch(`${IPAYMU_RELAY_BASE_URL}/ipaymu/production/api/v2/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          va,
          signature,
          timestamp: timestamp(),
        },
        body: rawBody,
      });
    } catch {
      await updateOrder(env, orderId, { status: 'PAYMENT_FAILED' });
      return json(
        { ok: false, error: { code: 'PAYMENT_GATEWAY_UNREACHABLE' } },
        502
      );
    }

    const gatewayData = await gatewayResponse.json();

    if (
      !gatewayResponse.ok ||
      Number(gatewayData.Status || 0) !== 200 ||
      !gatewayData.Data?.Url
    ) {
      await updateOrder(env, orderId, { status: 'PAYMENT_FAILED' });

      return json(
        {
          ok: false,
          error: {
            code: 'PAYMENT_SESSION_FAILED',
            message:
              gatewayData.Message ||
              'Payment session could not be created.',
          },
        },
        502
      );
    }

    const paymentUrl = String(gatewayData.Data.Url);
    let parsedPaymentUrl;

    try {
      parsedPaymentUrl = new URL(paymentUrl);
    } catch {
      await updateOrder(env, orderId, { status: 'PAYMENT_FAILED' });
      return json(
        { ok: false, error: { code: 'INVALID_GATEWAY_URL' } },
        502
      );
    }

    if (
      parsedPaymentUrl.protocol !== 'https:' ||
      !parsedPaymentUrl.hostname.endsWith('ipaymu.com')
    ) {
      await updateOrder(env, orderId, { status: 'PAYMENT_FAILED' });

      return json(
        { ok: false, error: { code: 'UNTRUSTED_GATEWAY_URL' } },
        502
      );
    }

    await updateOrder(env, orderId, {
      paymentTransactionId: String(gatewayData.Data.SessionID || ''),
      paymentUrl,
      paymentChannel: 'hosted',
    });

    return json({
      ok: true,
      order: {
        id: orderId,
        reference_id: referenceId,
        status: 'PENDING_PAYMENT',
      },
      payment: {
        provider: 'ipaymu',
        environment: 'production',
        redirect_url: paymentUrl,
      },
    });
  }

  if (
    request.method === 'POST' &&
    path === '/api/payments/ipaymu/callback'
  ) {
    const va = env.IPAYMU_VA || '';

    if (!va) {
      return json({ ok: false, error: 'PAYMENT_NOT_CONFIGURED' }, 503);
    }

    const receivedSignature = request.headers.get('x-signature') || '';

    if (!receivedSignature) {
      return json({ ok: false, error: 'MISSING_SIGNATURE' }, 400);
    }

    const normalized = normalizeCallbackBody(await parseBody(request));
    const calculated = await hmacHex(sortedJsonForCallback(normalized), va);

    if (!constantTimeEqual(calculated, receivedSignature.toLowerCase())) {
      return json({ ok: false, error: 'INVALID_SIGNATURE' }, 400);
    }

    const referenceId = String(
      normalized.reference_id || normalized.referenceId || ''
    );

    if (!referenceId.startsWith('ROAM-')) {
      return json({ ok: true, ignored: true });
    }

    const orderId = referenceId.slice(5);
    const order = await getOrder(env, orderId);

    if (!order) {
      return json({ ok: true, ignored: true });
    }

    const callbackAmount = Number(normalized.amount || normalized.total || 0);

    if (callbackAmount !== order.amount) {
      return json({ ok: false, error: 'AMOUNT_MISMATCH' }, 400);
    }

    const statusCode = Number(
      normalized.transaction_status_code ?? normalized.status_code ?? 0
    );
    const textStatus = String(normalized.status || '').toLowerCase();

    if (order.status === 'PAID') {
      return json({ ok: true, duplicate: true });
    }

    if (
      statusCode === 1 ||
      statusCode === 6 ||
      textStatus === 'berhasil'
    ) {
      await updateOrder(env, orderId, {
        status: 'PAID',
        paidAt: String(
          normalized.paid_at || new Date().toISOString()
        ),
        fulfillmentState: 'WAITING_FOR_SUPPLIER',
      });
    } else if (
      statusCode === -2 ||
      textStatus === 'expired'
    ) {
      await updateOrder(env, orderId, {
        status: 'PAYMENT_FAILED',
      });
    }

    return json({ ok: true });
  }

  if (request.method === 'POST' && path === '/api/magic-link') {
    return json({
      ok: false,
      error: 'ORDER_ACCESS_NOT_ACTIVE',
    });
  }

  return json({ ok: false, error: 'NOT_FOUND' }, 404);
}

export class OrderStore {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/add') {
      const record = await request.json();
      const id = crypto.randomUUID();

      await this.state.storage.put(`order:${id}`, record);

      return json({ id });
    }

    if (request.method === 'GET' && url.pathname === '/get') {
      const id = url.searchParams.get('id') || '';
      const record = await this.state.storage.get(`order:${id}`);

      if (!record) {
        return json({ error: 'NOT_FOUND' }, 404);
      }

      return json(record);
    }

    if (request.method === 'POST' && url.pathname === '/update') {
      const { id, patch } = await request.json();
      const key = `order:${id}`;
      const existing = await this.state.storage.get(key);

      if (!existing) {
        return json({ error: 'NOT_FOUND' }, 404);
      }

      const next = {
        ...existing,
        ...patch,
        updatedAt: new Date().toISOString(),
      };

      await this.state.storage.put(key, next);

      return json(next);
    }

    return json({ error: 'NOT_FOUND' }, 404);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
