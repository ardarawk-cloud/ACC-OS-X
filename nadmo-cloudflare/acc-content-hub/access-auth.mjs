// Validate Cloudflare Access's signed JWT at the origin (not a client-supplied login flag).
// Access application audience and issuer are public routing metadata, not secrets.
export const ACCESS_AUD = '2f415c8e5189eaf72ae4abccebbdcd04aec9ef0bbe70dac74c8c93e80d4226c2';
export const ACCESS_ISS = 'https://misty-math-2c16.cloudflareaccess.com';
let cachedKeys = null, validUntil = 0;

function base64urlBytes(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw Error('malformed token');
  const text = value.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(text.padEnd(Math.ceil(text.length / 4) * 4, '='));
  return Uint8Array.from(raw, ch => ch.charCodeAt(0));
}

function parsePart(value) {
  return JSON.parse(new TextDecoder().decode(base64urlBytes(value)));
}

async function publicKeys() {
  if (cachedKeys && Date.now() < validUntil) return cachedKeys;
  const response = await fetch(ACCESS_ISS + '/cdn-cgi/access/certs', {headers:{'Accept':'application/json'}});
  if (!response.ok) throw Error('Access JWKS unavailable');
  const result = await response.json();
  if (!Array.isArray(result.keys) || result.keys.length === 0) throw Error('Access JWKS invalid');
  cachedKeys = result.keys;
  validUntil = Date.now() + 5 * 60 * 1000;
  return cachedKeys;
}

export async function accessOwnerVerified(request, env) {
  const requiredEmail = String(env.NADMO_SOCIAL_OWNER_EMAIL || '').trim().toLowerCase();
  if (!requiredEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requiredEmail)) return false;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 15000) return false;
  const pieces = token.split('.');
  if (pieces.length !== 3) return false;
  try {
    const [h,p,s] = pieces;
    const header = parsePart(h);
    const payload = parsePart(p);
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length > 256) return false;
    if (payload.iss !== ACCESS_ISS || String(payload.email || '').trim().toLowerCase() !== requiredEmail) return false;
    const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audience.includes(ACCESS_AUD)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(payload.exp) || now >= payload.exp) return false;
    if (!Number.isFinite(payload.iat) || payload.iat > now + 60) return false;
    if (payload.nbf !== undefined && (!Number.isFinite(payload.nbf) || now < payload.nbf)) return false;
    const keys = await publicKeys();
    const jwk = keys.find(k => k.kid === header.kid && k.kty === 'RSA' && typeof k.n === 'string' && typeof k.e === 'string');
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk',{kty:'RSA',n:jwk.n,e:jwk.e,alg:'RS256',ext:true},{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    const bytes = new TextEncoder().encode(h + '.' + p);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,base64urlBytes(s),bytes);
  } catch {
    return false; // failure is denial, never fall back to a weaker client key
  }
}
