import {handleSocial} from './social-queue.mjs';
import {accessOwnerVerified} from './access-auth.mjs';
import {handleMedia} from './social-media.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/_healthcheck') {
      return Response.json({ ok: true, service: 'nadmo-cloudflare' }, { headers: { 'cache-control': 'no-store' } });
    }
    if (url.pathname === '/api/social/media' || url.pathname.startsWith('/api/social/media/')) {
      if (!env.NADMO_SOCIAL_OWNER_EMAIL) return Response.json({ok:false,error:{code:'NOT_CONFIGURED'}},{status:503});
      if (!await accessOwnerVerified(request,env)) return Response.json({ok:false,error:{code:'UNAUTHORIZED'}},{status:401});
      return handleMedia(request,env,url);
    }
    if (url.pathname.startsWith('/api/social/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 405 });
      return handleSocial(request, env, url);
    }
    // Preserve every legacy Content Hub route and static asset fallback.
    return env.ASSETS.fetch(request);
  },
};
