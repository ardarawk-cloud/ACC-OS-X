import { createHash } from 'node:crypto';

const IPAYMU_RELAY_BASE_URL = 'https://relay.nadmo.id';
const PUBLIC_BASE_URL = 'https://roamink.nadmo.id';
const encoder = new TextEncoder();
const DIGIFLAZZ_RELAY_BASE_URL = 'https://relay.nadmo.id';
const DIGIFLAZZ_CATALOG_TTL_MS = 15 * 60 * 1000;
const DIGIFLAZZ_MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const DIGIFLAZZ_MARKUP_PERCENT = 20;
const DIGIFLAZZ_MIN_MARKUP_IDR = 5000;
const DIGIFLAZZ_ROUNDING_IDR = 1000;


const fallbackDestinations = [
  { slug: 'indonesia', name: 'Indonesia', iso2: 'ID', region: 'Asia', featured: 1, hero_key: 'island' },
  { slug: 'japan', name: 'Japan', iso2: 'JP', region: 'Asia', featured: 1, hero_key: 'city' },
  { slug: 'thailand', name: 'Thailand', iso2: 'TH', region: 'Asia', featured: 1, hero_key: 'tropical' },
  { slug: 'europe', name: 'Europe', iso2: 'EU', region: 'Regional', featured: 1, hero_key: 'europe' },
  { slug: 'united-states', name: 'United States', iso2: 'US', region: 'Americas', featured: 1, hero_key: 'road' },
  { slug: 'australia', name: 'Australia', iso2: 'AU', region: 'Oceania', featured: 1, hero_key: 'coast' },
];

const fallbackProducts = [
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


function md5Hex(value) {
  return createHash('md5').update(String(value), 'utf8').digest('hex');
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugify(value) {
  return normalizeKey(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const destinationAliases = {
  indonesia: { name: 'Indonesia', iso2: 'ID', region: 'Asia', slug: 'indonesia' },
  malaysia: { name: 'Malaysia', iso2: 'MY', region: 'Asia', slug: 'malaysia' },
  macao: { name: 'Macao', iso2: 'MO', region: 'Asia', slug: 'macao' },
  singapore: { name: 'Singapore', iso2: 'SG', region: 'Asia', slug: 'singapore' },
  'korea selatan': { name: 'South Korea', iso2: 'KR', region: 'Asia', slug: 'south-korea' },
  'south korea': { name: 'South Korea', iso2: 'KR', region: 'Asia', slug: 'south-korea' },
  taiwan: { name: 'Taiwan', iso2: 'TW', region: 'Asia', slug: 'taiwan' },
  china: { name: 'China', iso2: 'CN', region: 'Asia', slug: 'china' },
  jepang: { name: 'Japan', iso2: 'JP', region: 'Asia', slug: 'japan' },
  japan: { name: 'Japan', iso2: 'JP', region: 'Asia', slug: 'japan' },
  thailand: { name: 'Thailand', iso2: 'TH', region: 'Asia', slug: 'thailand' },
  australia: { name: 'Australia', iso2: 'AU', region: 'Oceania', slug: 'australia' },
  cambodia: { name: 'Cambodia', iso2: 'KH', region: 'Asia', slug: 'cambodia' },
  kamboja: { name: 'Cambodia', iso2: 'KH', region: 'Asia', slug: 'cambodia' },
  usa: { name: 'United States', iso2: 'US', region: 'Americas', slug: 'united-states' },
  'united states': { name: 'United States', iso2: 'US', region: 'Americas', slug: 'united-states' },
  'hong kong': { name: 'Hong Kong', iso2: 'HK', region: 'Asia', slug: 'hong-kong' },
  filipina: { name: 'Philippines', iso2: 'PH', region: 'Asia', slug: 'philippines' },
  philippines: { name: 'Philippines', iso2: 'PH', region: 'Asia', slug: 'philippines' },
  vietnam: { name: 'Vietnam', iso2: 'VN', region: 'Asia', slug: 'vietnam' },
  asia: { name: 'Asia', iso2: '', region: 'Regional', slug: 'asia' },
  'saudi arabia': { name: 'Saudi Arabia', iso2: 'SA', region: 'Middle East', slug: 'saudi-arabia' },
  algeria: { name: 'Algeria', iso2: 'DZ', region: 'Africa', slug: 'algeria' },
  'united arab emirates': { name: 'United Arab Emirates', iso2: 'AE', region: 'Middle East', slug: 'united-arab-emirates' },
  uae: { name: 'United Arab Emirates', iso2: 'AE', region: 'Middle East', slug: 'united-arab-emirates' },
  bahrain: { name: 'Bahrain', iso2: 'BH', region: 'Middle East', slug: 'bahrain' },
  europe: { name: 'Europe', iso2: 'EU', region: 'Regional', slug: 'europe' },
};

const featuredDestinationSlugs = new Set([
  'indonesia',
  'singapore',
  'japan',
  'thailand',
  'australia',
  'united-states',
]);

function destinationFromName(raw) {
  const cleaned = String(raw || '').trim();
  const alias = destinationAliases[normalizeKey(cleaned)];
  if (alias) return { ...alias };
  return {
    name: cleaned || 'Global',
    iso2: '',
    region: 'Global',
    slug: slugify(cleaned || 'global'),
  };
}

function parseDestinationName(item) {
  const type = String(item?.type || '').trim();
  if (type && normalizeKey(type) !== 'umum') return type;

  const productName = String(item?.product_name || '');
  const match = productName.match(/\(([^()]+)\)\s*$/);
  return match?.[1]?.trim() || type || 'Global';
}

function parseDataLabel(productName) {
  const match = String(productName || '').match(/(\d+(?:[.,]\d+)?)\s*(MB|GB)/i);
  return match ? `${match[1].replace(',', '.')} ${match[2].toUpperCase()}` : 'Travel Data';
}

function parseValidityDays(productName) {
  const match = String(productName || '').match(/(\d+)\s*(?:Hari|Days?)/i);
  return match ? Number(match[1]) : 0;
}

function retailPrice(cost) {
  const numeric = Math.max(0, Number(cost || 0));
  const percentageMarkup = Math.ceil(numeric * (DIGIFLAZZ_MARKUP_PERCENT / 100));
  const markup = Math.max(percentageMarkup, DIGIFLAZZ_MIN_MARKUP_IDR);
  return Math.ceil((numeric + markup) / DIGIFLAZZ_ROUNDING_IDR) * DIGIFLAZZ_ROUNDING_IDR;
}

function buildDigiflazzCatalog(rows) {
  const activeRows = (Array.isArray(rows) ? rows : []).filter(item => {
    const stockOk = item?.unlimited_stock === true || Number(item?.stock || 0) > 0;
    return (
      normalizeKey(item?.brand) === 'esim' &&
      item?.buyer_product_status === true &&
      item?.seller_product_status === true &&
      stockOk
    );
  });

  const destinationMap = new Map();
  const products = [];

  for (const item of activeRows) {
    const destination = destinationFromName(parseDestinationName(item));
    if (!destination.slug) continue;

    if (!destinationMap.has(destination.slug)) {
      destinationMap.set(destination.slug, {
        ...destination,
        featured: featuredDestinationSlugs.has(destination.slug) ? 1 : 0,
        hero_key: destination.region === 'Regional' ? 'regional' : 'travel',
      });
    }

    const sku = String(item.buyer_sku_code || '').trim();
    if (!sku) continue;

    products.push({
      id: `df:${sku}`,
      destination_slug: destination.slug,
      title: String(item.product_name || 'Travel eSIM'),
      data_label: parseDataLabel(item.product_name),
      validity_days: parseValidityDays(item.product_name),
      retail_price_minor: retailPrice(item.price),
      supports_5g: /5g/i.test(`${item.product_name || ''} ${item.desc || ''}`) ? 1 : 0,
      supplier: 'digiflazz',
      supplier_sku: sku,
      supplier_price: Number(item.price || 0),
      supplier_type: String(item.type || ''),
      seller_name: String(item.seller_name || ''),
      unlimited_stock: item.unlimited_stock === true,
      stock: Number(item.stock || 0),
    });
  }

  const destinations = [...destinationMap.values()].sort((a, b) => {
    if (a.featured !== b.featured) return b.featured - a.featured;
    return a.name.localeCompare(b.name);
  });

  products.sort((a, b) => {
    if (a.destination_slug !== b.destination_slug) {
      return a.destination_slug.localeCompare(b.destination_slug);
    }
    return a.retail_price_minor - b.retail_price_minor;
  });

  return {
    source: 'digiflazz',
    updated_at: new Date().toISOString(),
    pricing: {
      markup_percent: DIGIFLAZZ_MARKUP_PERCENT,
      minimum_markup_idr: DIGIFLAZZ_MIN_MARKUP_IDR,
      rounding_idr: DIGIFLAZZ_ROUNDING_IDR,
    },
    destinations,
    products,
  };
}

async function getCatalogCache(env) {
  const response = await orderStore(env).fetch('https://orders/catalog');
  if (!response.ok) return null;
  return response.json();
}

async function putCatalogCache(env, catalog) {
  await orderStore(env).fetch('https://orders/catalog', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(catalog),
  });
}

async function claimDigiflazzCatalogRefresh(env) {
  const response = await orderStore(env).fetch('https://orders/catalog/claim', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ intervalMs: DIGIFLAZZ_MIN_REFRESH_INTERVAL_MS }),
  });
  return response.json();
}

async function getDigiflazzCatalog(env, { force = false } = {}) {
  const username = String(env.DIGIFLAZZ_USERNAME || '').trim();
  const apiKey = String(env.DIGIFLAZZ_API_KEY || '').trim();

  if (!username || !apiKey) {
    return {
      source: 'static-fallback',
      supplier_configured: Boolean(env.DIGIFLAZZ_USERNAME && env.DIGIFLAZZ_API_KEY),
      supplier: 'digiflazz',
      supplier_autofulfill: env.DIGIFLAZZ_AUTOFULFILL === 'true',
      destinations: fallbackDestinations,
      products: fallbackProducts,
    };
  }

  const cached = await getCatalogCache(env);
  const cachedAt = cached?.updated_at ? Date.parse(cached.updated_at) : 0;
  if (!force && cached && Number.isFinite(cachedAt) && Date.now() - cachedAt < DIGIFLAZZ_CATALOG_TTL_MS) {
    return cached;
  }

  const claim = await claimDigiflazzCatalogRefresh(env);
  if (!claim?.allowed) {
    if (cached?.products?.length) {
      return { ...cached, source: 'digiflazz-cache', stale: true };
    }
    return {
      source: 'static-fallback',
      supplier_configured: true,
      supplier: 'digiflazz',
      stale: true,
      retry_after: claim?.retryAfter || null,
      error: 'DIGIFLAZZ_REFRESH_RATE_GATED',
      destinations: fallbackDestinations,
      products: fallbackProducts,
    };
  }

  const requestBody = {
    cmd: 'prepaid',
    username,
    sign: md5Hex(username + apiKey + 'pricelist'),
    brand: 'eSIM',
  };

  try {
    const response = await fetch(`${DIGIFLAZZ_RELAY_BASE_URL}/digiflazz/price-list`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const payload = await response.json();

    if (!response.ok || !Array.isArray(payload?.data)) {
      const rc = String(payload?.data?.rc || payload?.rc || '').trim();
      const message = String(payload?.data?.message || payload?.message || 'DIGIFLAZZ_CATALOG_ERROR').trim();
      throw new Error(rc ? `DIGIFLAZZ_RC_${rc}: ${message}` : message);
    }

    const catalog = buildDigiflazzCatalog(payload.data);
    catalog.supplier_configured = true;
    await putCatalogCache(env, catalog);
    return catalog;
  } catch (error) {
    if (cached?.products?.length) {
      return { ...cached, source: 'digiflazz-cache', stale: true };
    }
    return {
      source: 'static-fallback',
      supplier_configured: true,
      supplier: 'digiflazz',
      stale: true,
      error: String(error instanceof Error ? error.message : error),
      destinations: fallbackDestinations,
      products: fallbackProducts,
    };
  }
}

async function digiflazzTransaction(env, { sku, customerNo, refId, maxPrice }) {
  const username = String(env.DIGIFLAZZ_USERNAME || '').trim();
  const apiKey = String(env.DIGIFLAZZ_API_KEY || '').trim();
  if (!username || !apiKey) throw new Error('DIGIFLAZZ_NOT_CONFIGURED');

  const body = {
    username,
    buyer_sku_code: sku,
    customer_no: customerNo,
    ref_id: refId,
    sign: md5Hex(username + apiKey + refId),
    max_price: Number(maxPrice || 0),
  };

  const response = await fetch(`${DIGIFLAZZ_RELAY_BASE_URL}/digiflazz/transaction`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || !payload?.data) {
    throw new Error(String(payload?.message || 'DIGIFLAZZ_TRANSACTION_ERROR'));
  }
  return payload.data;
}

function parseEsimDelivery(rawSn) {
  const raw = String(rawSn || '').trim();
  if (!raw) return { raw: '' };

  const lpaMatch = raw.match(/LPA:1\$[^\s,;|]+(?:\$[^\s,;|]+)?/i);
  const smdpMatch = raw.match(/(?:SM-DP\+|SMDP\+?|SM-DP)\s*(?:Address)?\s*[:=]\s*([^\s,;|]+)/i);
  const activationMatch = raw.match(/(?:Activation\s*Code|Kode\s*Aktivasi)\s*[:=]\s*([^\s,;|]+)/i);

  let smdpAddress = smdpMatch?.[1] || '';
  let activationCode = activationMatch?.[1] || '';

  if (lpaMatch?.[0]) {
    const parts = lpaMatch[0].split('
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

  if (request.method === 'GET' && path === '/api/payment-relay-check') {
    try {
      const [healthResponse, egressResponse] = await Promise.all([
        fetch(`${IPAYMU_RELAY_BASE_URL}/api/_healthcheck`, { headers: { 'cache-control': 'no-cache' } }),
        fetch(`${IPAYMU_RELAY_BASE_URL}/api/_egress`, { headers: { 'cache-control': 'no-cache' } }),
      ]);
      const health = await healthResponse.json();
      const egress = await egressResponse.json();
      return json({
        ok: healthResponse.ok && egressResponse.ok && health?.ok === true && egress?.ok === true,
        relay: health,
        egress,
      }, healthResponse.ok && egressResponse.ok ? 200 : 502);
    } catch {
      return json({ ok: false, error: 'PAYMENT_RELAY_UNREACHABLE' }, 502);
    }
  }

  if (request.method === 'GET' && path === '/api/config') {
    return json({
      environment: 'production',
      payment_environment: 'ipaymu-production',
      payment_configured: Boolean(env.IPAYMU_API_KEY && env.IPAYMU_VA),
      supplier_configured: Boolean(env.DIGIFLAZZ_USERNAME && env.DIGIFLAZZ_API_KEY),
      supplier: 'digiflazz',
      supplier_autofulfill: env.DIGIFLAZZ_AUTOFULFILL === 'true',
      turnstile_site_key: null,
    });
  }

  if (request.method === 'GET' && path === '/api/catalog') {
    return json(await getDigiflazzCatalog(env));
  }

  if (request.method === 'GET' && path === '/api/supplier-credential-check') {
    const configured = Boolean(env.DIGIFLAZZ_USERNAME && env.DIGIFLAZZ_API_KEY);
    if (!configured) {
      return json({ ok: false, configured: false, supplier: 'digiflazz', error: 'SUPPLIER_NOT_CONFIGURED' }, 503);
    }

    const catalog = await getDigiflazzCatalog(env);
    return json({
      ok: catalog.source === 'digiflazz' || catalog.source === 'digiflazz-cache',
      configured: true,
      supplier: 'digiflazz',
      source: catalog.source,
      active_products: catalog.products?.length || 0,
      destinations: catalog.destinations?.length || 0,
      outbound_ipv4: '151.243.222.93',
      error: catalog.error || null,
    }, (catalog.source === 'digiflazz' || catalog.source === 'digiflazz-cache') ? 200 : 503);
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

    const catalog = await getDigiflazzCatalog(env);
    const product = (catalog.products || []).find(
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
      supplier: product.supplier || null,
      supplierSku: product.supplier_sku || null,
      supplierCost: Number(product.supplier_price || 0),
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

    if (request.method === 'GET' && url.pathname === '/catalog') {
      const catalog = await this.state.storage.get('catalog:digiflazz');
      if (!catalog) return json({ error: 'NOT_FOUND' }, 404);
      return json(catalog);
    }

    if (request.method === 'POST' && url.pathname === '/catalog') {
      const catalog = await request.json();
      await this.state.storage.put('catalog:digiflazz', catalog);
      return json({ ok: true });
    }

    if (request.method === 'POST' && url.pathname === '/catalog/claim') {
      const body = await request.json();
      const intervalMs = Math.max(300000, Number(body?.intervalMs || 300000));
      const key = 'catalog:digiflazz:next-attempt-at';
      const now = Date.now();
      const nextAttemptAt = Number((await this.state.storage.get(key)) || 0);

      if (nextAttemptAt > now) {
        return json({
          allowed: false,
          retryAfter: new Date(nextAttemptAt).toISOString(),
        });
      }

      const next = now + intervalMs;
      await this.state.storage.put(key, next);
      return json({
        allowed: true,
        retryAfter: new Date(next).toISOString(),
      });
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
);
    if (!smdpAddress && parts[1]) smdpAddress = parts[1];
    if (!activationCode && parts[2]) activationCode = parts[2];
  }

  return {
    raw,
    qr_data: lpaMatch?.[0] || '',
    smdp_address: smdpAddress,
    activation_code: activationCode,
  };
}

function safeSupplierResult(data) {
  return {
    status: String(data?.status || '').trim(),
    rc: String(data?.rc || '').trim(),
    message: String(data?.message || '').trim(),
    sn: String(data?.sn || '').trim(),
    price: Number(data?.price || 0),
    buyer_sku_code: String(data?.buyer_sku_code || '').trim(),
    customer_no: String(data?.customer_no || '').trim(),
    ref_id: String(data?.ref_id || '').trim(),
  };
}

function publicOrder(order, id) {
  const delivery = order?.delivery && typeof order.delivery === 'object'
    ? order.delivery
    : parseEsimDelivery(order?.supplierSn || '');

  return {
    id,
    reference_id: order?.referenceId || '',
    status: order?.status || '',
    fulfillment_state: order?.fulfillmentState || '',
    product_title: order?.productTitle || '',
    amount: Number(order?.amount || 0),
    paid_at: order?.paidAt || null,
    fulfilled_at: order?.fulfilledAt || null,
    supplier_status: order?.supplierStatus || null,
    supplier_message: order?.supplierMessage || null,
    delivery: order?.fulfillmentState === 'DELIVERED' ? delivery : null,
  };
}

async function fulfillOrder(env, orderId) {
  const order = await getOrder(env, orderId);
  if (!order) return { ok: false, error: 'ORDER_NOT_FOUND' };
  if (order.status !== 'PAID') return { ok: false, error: 'ORDER_NOT_PAID' };
  if (order.fulfillmentState === 'DELIVERED') {
    return { ok: true, delivered: true, order: publicOrder(order, orderId) };
  }

  if (
    order.supplier !== 'digiflazz' ||
    !order.supplierSku ||
    !Number(order.supplierCost || 0)
  ) {
    await updateOrder(env, orderId, {
      fulfillmentState: 'SUPPLIER_CATALOG_REQUIRED',
      supplierMessage: 'Live supplier SKU is not attached to this order.',
    });
    return { ok: false, error: 'SUPPLIER_CATALOG_REQUIRED' };
  }

  const refId = order.supplierRefId || `ROAMINK-DF-${orderId}`;
  const customerNo = String(order.phone || '').replace(/\D/g, '') || orderId.replace(/-/g, '').slice(0, 16);

  await updateOrder(env, orderId, {
    fulfillmentState: 'SUPPLIER_PROCESSING',
    supplierRefId: refId,
    supplierLastAttemptAt: new Date().toISOString(),
  });

  let raw;
  try {
    raw = await digiflazzTransaction(env, {
      sku: order.supplierSku,
      customerNo,
      refId,
      maxPrice: Number(order.supplierCost || 0),
    });
  } catch (error) {
    await updateOrder(env, orderId, {
      fulfillmentState: 'SUPPLIER_RETRY',
      supplierMessage: String(error instanceof Error ? error.message : error).slice(0, 300),
    });
    return { ok: false, retry: true, error: 'SUPPLIER_TEMPORARY_ERROR' };
  }

  const result = safeSupplierResult(raw);
  const status = result.status.toLowerCase();

  if (status === 'sukses' || result.rc === '00') {
    const delivery = parseEsimDelivery(result.sn);
    const next = await updateOrder(env, orderId, {
      fulfillmentState: 'DELIVERED',
      supplierStatus: result.status || 'Sukses',
      supplierRc: result.rc,
      supplierMessage: result.message,
      supplierSn: result.sn,
      supplierPriceCharged: result.price,
      delivery,
      fulfilledAt: new Date().toISOString(),
    });
    return { ok: true, delivered: true, order: publicOrder(next, orderId) };
  }

  if (status === 'pending' || result.rc === '03') {
    await updateOrder(env, orderId, {
      fulfillmentState: 'SUPPLIER_PENDING',
      supplierStatus: result.status || 'Pending',
      supplierRc: result.rc,
      supplierMessage: result.message,
      supplierSn: result.sn,
      supplierPriceCharged: result.price,
    });
    return { ok: true, pending: true };
  }

  await updateOrder(env, orderId, {
    fulfillmentState: 'SUPPLIER_FAILED',
    supplierStatus: result.status || 'Gagal',
    supplierRc: result.rc,
    supplierMessage: result.message || 'Supplier transaction failed.',
    supplierSn: result.sn,
    supplierPriceCharged: result.price,
  });
  return { ok: false, failed: true, error: 'SUPPLIER_TRANSACTION_FAILED' };
}

async function listPendingSupplierOrders(env) {
  const response = await orderStore(env).fetch('https://orders/pending?limit=20');
  if (!response.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload.orders) ? payload.orders : [];
}

async function runMaintenance(env) {
  try {
    await getDigiflazzCatalog(env);
  } catch {}

  const pending = await listPendingSupplierOrders(env);
  for (const item of pending) {
    try {
      await fulfillOrder(env, item.id);
    } catch {}
  }
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

  if (request.method === 'GET' && path === '/api/payment-relay-check') {
    try {
      const [healthResponse, egressResponse] = await Promise.all([
        fetch(`${IPAYMU_RELAY_BASE_URL}/api/_healthcheck`, { headers: { 'cache-control': 'no-cache' } }),
        fetch(`${IPAYMU_RELAY_BASE_URL}/api/_egress`, { headers: { 'cache-control': 'no-cache' } }),
      ]);
      const health = await healthResponse.json();
      const egress = await egressResponse.json();
      return json({
        ok: healthResponse.ok && egressResponse.ok && health?.ok === true && egress?.ok === true,
        relay: health,
        egress,
      }, healthResponse.ok && egressResponse.ok ? 200 : 502);
    } catch {
      return json({ ok: false, error: 'PAYMENT_RELAY_UNREACHABLE' }, 502);
    }
  }

  if (request.method === 'GET' && path === '/api/config') {
    return json({
      environment: 'production',
      payment_environment: 'ipaymu-production',
      payment_configured: Boolean(env.IPAYMU_API_KEY && env.IPAYMU_VA),
      supplier_configured: Boolean(env.DIGIFLAZZ_USERNAME && env.DIGIFLAZZ_API_KEY),
      supplier: 'digiflazz',
      supplier_autofulfill: env.DIGIFLAZZ_AUTOFULFILL === 'true',
      turnstile_site_key: null,
    });
  }

  if (request.method === 'GET' && path === '/api/catalog') {
    return json(await getDigiflazzCatalog(env));
  }

  if (request.method === 'GET' && path === '/api/supplier-credential-check') {
    const configured = Boolean(env.DIGIFLAZZ_USERNAME && env.DIGIFLAZZ_API_KEY);
    if (!configured) {
      return json({ ok: false, configured: false, supplier: 'digiflazz', error: 'SUPPLIER_NOT_CONFIGURED' }, 503);
    }

    const catalog = await getDigiflazzCatalog(env);
    return json({
      ok: catalog.source === 'digiflazz' || catalog.source === 'digiflazz-cache',
      configured: true,
      supplier: 'digiflazz',
      source: catalog.source,
      active_products: catalog.products?.length || 0,
      destinations: catalog.destinations?.length || 0,
      outbound_ipv4: '151.243.222.93',
      error: catalog.error || null,
    }, (catalog.source === 'digiflazz' || catalog.source === 'digiflazz-cache') ? 200 : 503);
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

    const catalog = await getDigiflazzCatalog(env);
    const product = (catalog.products || []).find(
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
      supplier: product.supplier || null,
      supplierSku: product.supplier_sku || null,
      supplierCost: Number(product.supplier_price || 0),
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

    if (request.method === 'GET' && url.pathname === '/catalog') {
      const catalog = await this.state.storage.get('catalog:digiflazz');
      if (!catalog) return json({ error: 'NOT_FOUND' }, 404);
      return json(catalog);
    }

    if (request.method === 'POST' && url.pathname === '/catalog') {
      const catalog = await request.json();
      await this.state.storage.put('catalog:digiflazz', catalog);
      return json({ ok: true });
    }

    if (request.method === 'POST' && url.pathname === '/catalog/claim') {
      const body = await request.json();
      const intervalMs = Math.max(300000, Number(body?.intervalMs || 300000));
      const key = 'catalog:digiflazz:next-attempt-at';
      const now = Date.now();
      const nextAttemptAt = Number((await this.state.storage.get(key)) || 0);

      if (nextAttemptAt > now) {
        return json({
          allowed: false,
          retryAfter: new Date(nextAttemptAt).toISOString(),
        });
      }

      const next = now + intervalMs;
      await this.state.storage.put(key, next);
      return json({
        allowed: true,
        retryAfter: new Date(next).toISOString(),
      });
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
