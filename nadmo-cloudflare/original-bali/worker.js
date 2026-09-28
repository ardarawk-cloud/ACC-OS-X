export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/_healthcheck') {
      return Response.json({ ok: true, service: 'nadmo-cloudflare' }, { headers: { 'cache-control': 'no-store' } });
    }
    return env.ASSETS.fetch(request);
  },
};
