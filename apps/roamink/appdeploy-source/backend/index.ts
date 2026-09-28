import { db, json, router, secrets } from '@appdeploy/sdk';

const IPAYMU_BASE_URL = 'https://sandbox.ipaymu.com';
const PUBLIC_BASE_URL = 'https://roamink.nadmo.id';
const encoder = new TextEncoder();

type OrderRecord = {
  email: string;
  name: string;
  phone: string;
  productId: string;
  productTitle: string;
  amount: number;
  status: string;
  fulfillmentState: string;
  referenceId?: string;
  paymentProvider?: string;
  paymentTransactionId?: string;
  paymentUrl?: string;
  paymentChannel?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
};

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

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(value: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest('SHA-256', encoder.encode(value))).toLowerCase();
}

async function hmacHex(value: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(value)));
}

function timestamp(): string {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
}

function safeEmail(value: unknown): string {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function safePhone(value: unknown): string {
  const phone = String(value || '').trim().replace(/[\s()-]/g, '');
  return /^\+?[0-9]{8,16}$/.test(phone) ? phone : '';
}

function getHeader(event: unknown, name: string): string {
  const candidate = event as { headers?: Record<string, unknown> } | undefined;
  const headers = candidate?.headers || {};
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return match ? String(match[1] || '') : '';
}

function normalizeCallbackBody(raw: unknown): Record<string, unknown> {
  let source: Record<string, unknown> = {};
  if (typeof raw === 'string') {
    source = Object.fromEntries(new URLSearchParams(raw).entries());
  } else if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    source = raw as Record<string, unknown>;
  }

  const normalized: Record<string, unknown> = {};
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

function sortedJsonForCallback(data: Record<string, unknown>): string {
  const sorted = Object.keys(data)
    .sort((a, b) => a.localeCompare(b))
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = data[key];
      return result;
    }, {});
  return JSON.stringify(sorted).replace(/\//g, '\\/');
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function updateOrder(orderId: string, patch: Partial<OrderRecord>): Promise<OrderRecord | null> {
  const [existing] = await db.get<OrderRecord>('orders', [orderId]);
  if (!existing) return null;
  const next = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  const [updated] = await db.update('orders', [{ id: orderId, record: next }]);
  return updated ? next : null;
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ ok: true, service: 'roamink' })],
  'GET /api/config': [
    async () => {
      const names = await secrets.listSecretNames();
      return json({
        environment: 'production-preview',
        payment_environment: 'ipaymu-sandbox',
        payment_configured: names.includes('IPAYMU_API_KEY') && names.includes('IPAYMU_VA'),
        supplier_configured: false,
        turnstile_site_key: null,
      });
    },
  ],
  'GET /api/catalog': [async () => json({ source: 'preview', destinations, products })],
  'GET /api/payment-credential-check': [
    async () => {
      let apiKey = '';
      let va = '';
      try {
        [apiKey, va] = await Promise.all([
          secrets.readSecret('IPAYMU_API_KEY'),
          secrets.readSecret('IPAYMU_VA'),
        ]);
      } catch {
        return json({ ok: false, error: 'PAYMENT_NOT_CONFIGURED' }, 503);
      }

      const probe = async (baseUrl: string) => {
        const rawBody = '{}';
        const bodyHash = await sha256Hex(rawBody);
        const stringToSign = `GET:${va}:${bodyHash}:${apiKey}`;
        const signature = await hmacHex(stringToSign, apiKey);
        try {
          const response = await fetch(`${baseUrl}/api/areas/province`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              va,
              signature,
              timestamp: timestamp(),
            },
          });
          const payload = await response.json() as {
            Status?: number;
            Success?: boolean;
            Message?: string;
          };
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
      };

      const [sandbox, production] = await Promise.all([
        probe('https://sandbox.ipaymu.com'),
        probe('https://my.ipaymu.com'),
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
    },
  ],
  'POST /api/checkout': [
    async ({ body }) => {
      const payload = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
      const product = products.find(item => item.id === String(payload.product_id || ''));
      const email = safeEmail(payload.email);
      const phone = safePhone(payload.phone);
      const name = String(payload.name || '').trim().slice(0, 100);

      if (!product || !email || !phone || name.length < 2) {
        return json({ ok: false, error: { code: 'INVALID_CHECKOUT_DETAILS' } }, 400);
      }

      let apiKey = '';
      let va = '';
      try {
        [apiKey, va] = await Promise.all([
          secrets.readSecret('IPAYMU_API_KEY'),
          secrets.readSecret('IPAYMU_VA'),
        ]);
      } catch {
        return json({ ok: false, error: { code: 'PAYMENT_NOT_CONFIGURED' } }, 503);
      }

      const now = new Date().toISOString();
      const initialOrder: OrderRecord = {
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
      };
      const [orderId] = await db.add('orders', [initialOrder]);
      if (!orderId) {
        return json({ ok: false, error: { code: 'ORDER_CREATE_FAILED' } }, 500);
      }

      const referenceId = `ROAM-${orderId}`;
      await updateOrder(orderId, {
        status: 'PENDING_PAYMENT',
        referenceId,
        paymentProvider: 'ipaymu-sandbox',
        paymentChannel: 'hosted',
      });

      const gatewayBody = {
        product: [product.title],
        qty: ['1'],
        price: [String(product.retail_price_minor)],
        description: [`${product.title} — ${product.data_label}, ${product.validity_days} days`],
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

      let gatewayResponse: Response;
      try {
        gatewayResponse = await fetch(`${IPAYMU_BASE_URL}/api/v2/payment`, {
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
        await updateOrder(orderId, { status: 'PAYMENT_FAILED' });
        return json({ ok: false, error: { code: 'PAYMENT_GATEWAY_UNREACHABLE' } }, 502);
      }

      const gatewayData = await gatewayResponse.json() as {
        Status?: number;
        Success?: boolean;
        Message?: string;
        Data?: {
          SessionID?: string;
          Url?: string;
        };
      };

      if (!gatewayResponse.ok || Number(gatewayData.Status || 0) !== 200 || !gatewayData.Data?.Url) {
        await updateOrder(orderId, { status: 'PAYMENT_FAILED' });
        return json({
          ok: false,
          error: {
            code: 'PAYMENT_SESSION_FAILED',
            message: gatewayData.Message || 'Sandbox payment session could not be created.',
          },
        }, 502);
      }

      const paymentUrl = String(gatewayData.Data.Url);
      let parsedPaymentUrl: URL;
      try {
        parsedPaymentUrl = new URL(paymentUrl);
      } catch {
        await updateOrder(orderId, { status: 'PAYMENT_FAILED' });
        return json({ ok: false, error: { code: 'INVALID_GATEWAY_URL' } }, 502);
      }
      if (parsedPaymentUrl.protocol !== 'https:' || !parsedPaymentUrl.hostname.endsWith('ipaymu.com')) {
        await updateOrder(orderId, { status: 'PAYMENT_FAILED' });
        return json({ ok: false, error: { code: 'UNTRUSTED_GATEWAY_URL' } }, 502);
      }

      await updateOrder(orderId, {
        paymentTransactionId: String(gatewayData.Data.SessionID || ''),
        paymentUrl,
        paymentChannel: 'hosted',
      });

      return json({
        ok: true,
        order: { id: orderId, reference_id: referenceId, status: 'PENDING_PAYMENT' },
        payment: {
          provider: 'ipaymu',
          environment: 'sandbox',
          redirect_url: paymentUrl,
        },
      });
    },
  ],
  'POST /api/payments/ipaymu/callback': [
    async ({ body, event }) => {
      let va = '';
      try {
        va = await secrets.readSecret('IPAYMU_VA');
      } catch {
        return json({ ok: false, error: 'PAYMENT_NOT_CONFIGURED' }, 503);
      }

      const receivedSignature = getHeader(event, 'x-signature');
      if (!receivedSignature) {
        return json({ ok: false, error: 'MISSING_SIGNATURE' }, 400);
      }

      const normalized = normalizeCallbackBody(body);
      const calculated = await hmacHex(sortedJsonForCallback(normalized), va);
      if (!constantTimeEqual(calculated, receivedSignature.toLowerCase())) {
        return json({ ok: false, error: 'INVALID_SIGNATURE' }, 400);
      }

      const referenceId = String(normalized.reference_id || normalized.referenceId || '');
      if (!referenceId.startsWith('ROAM-')) {
        return json({ ok: true, ignored: true });
      }
      const orderId = referenceId.slice(5);
      const [order] = await db.get<OrderRecord>('orders', [orderId]);
      if (!order) {
        return json({ ok: true, ignored: true });
      }

      const callbackAmount = Number(normalized.amount || normalized.total || 0);
      if (callbackAmount !== order.amount) {
        return json({ ok: false, error: 'AMOUNT_MISMATCH' }, 400);
      }

      const statusCode = Number(normalized.transaction_status_code ?? normalized.status_code ?? 0);
      const textStatus = String(normalized.status || '').toLowerCase();

      if (order.status === 'PAID') {
        return json({ ok: true, duplicate: true });
      }
      if (statusCode === 1 || statusCode === 6 || textStatus === 'berhasil') {
        await updateOrder(orderId, {
          status: 'PAID',
          paidAt: String(normalized.paid_at || new Date().toISOString()),
          fulfillmentState: 'WAITING_FOR_SUPPLIER',
        });
      } else if (statusCode === -2 || textStatus === 'expired') {
        await updateOrder(orderId, { status: 'PAYMENT_FAILED' });
      }

      return json({ ok: true });
    },
  ],
  'POST /api/magic-link': [
    async () => json({ ok: false, error: 'ORDER_ACCESS_NOT_ACTIVE' }),
  ],
});
