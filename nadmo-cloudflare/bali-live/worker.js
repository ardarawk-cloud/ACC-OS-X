const EULER_BASE = 'https://tiktok.eulerstream.com';
const TIKTOK_USERNAME = 'ardamoron';
const BUILD_ID = 'cloudflare-migration-20260929';

function j(data, status = 200) {
  return Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
function systemFor(command) {
  const base = [
    'You are BALI AI, a concise AI co-host for a public TikTok LIVE from Bali.',
    'Reply in the viewer language; default to casual Indonesian.',
    'Keep the answer under 45 words.',
    'Answer directly with no preamble.',
    'Keep content suitable for a public livestream.'
  ];
  const modes = {
    curhat: 'Be warm, grounded, supportive, and brief.',
    tanya: 'Answer directly. If uncertain, say so instead of inventing facts.',
    roast: 'Give a playful light roast. Avoid protected traits, trauma, disability, and serious hardship.',
    quote: 'Write one original short quote inspired by the message.',
    jodoh: 'Treat this as playful entertainment, not a factual prediction.'
  };
  return base.concat(modes[command] || modes.tanya).join('\n');
}
async function mintEulerJwt(env) {
  if (!env.EULER_API_KEY) return { configured: false };
  const meRes = await fetch(EULER_BASE + '/accounts/me', { headers: { 'X-Api-Key': env.EULER_API_KEY } });
  const me = await meRes.json();
  if (!meRes.ok) throw new Error('Euler account lookup failed');
  const accountId = me?.account?.id ?? me?.data?.account?.id ?? me?.id ?? me?.account_id;
  if (!accountId) throw new Error('Euler account id missing');
  const jwtRes = await fetch(EULER_BASE + '/accounts/' + accountId + '/jwt/create', {
    method: 'POST',
    headers: { 'X-Api-Key': env.EULER_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ limits: { minute: 10, hour: 60, day: 300 }, expireAfter: 7200, name: 'bali-live-browser' })
  });
  const jwt = await jwtRes.json();
  if (!jwtRes.ok) throw new Error('Euler JWT creation failed');
  const token = jwt?.token ?? jwt?.data?.token;
  if (!token) throw new Error('Euler JWT token missing');
  return { configured: true, token, username: TIKTOK_USERNAME, expiresIn: 7200 };
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/_healthcheck') return j({ ok: true, mode: 'cloudflare', username: TIKTOK_USERNAME, buildId: BUILD_ID });
    if (request.method === 'GET' && url.pathname === '/api/euler-jwt') {
      try { return j(await mintEulerJwt(env)); } catch (e) { return j({ error: 'TikTok cloud connection unavailable' }, 502); }
    }
    if (request.method === 'POST' && url.pathname === '/api/ai') {
      try {
        const input = await request.json();
        const raw = String(input?.command || 'ai').toLowerCase();
        const command = raw === 'ai' ? 'tanya' : raw;
        const text = String(input?.text || '').trim().replace(/\s+/g, ' ').slice(0, 500);
        const username = String(input?.username || 'viewer').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 64);
        if (!text) return j({ error: 'Message required' }, 400);
        if (!['curhat','tanya','roast','quote','jodoh'].includes(command)) return j({ error: 'Unsupported command' }, 400);
        const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [
            { role: 'system', content: systemFor(command) },
            { role: 'user', content: 'Viewer @' + username + ': ' + text }
          ],
          max_tokens: 120,
          temperature: 0.7
        });
        const answer = String(result?.response || result?.result?.response || '').trim().slice(0, 500) || 'Aku belum punya jawaban yang pas buat itu.';
        return j({ answer });
      } catch (e) { return j({ error: 'AI failed to answer' }, 502); }
    }
    return env.ASSETS.fetch(request);
  }
};
