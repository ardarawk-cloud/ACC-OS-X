import {handleSocial} from './social-queue.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/_healthcheck') {
      return Response.json({ok:true,service:'nadmo-contenthub'}, {headers:{'cache-control':'no-store'}});
    }
    if (url.pathname.startsWith('/api/social/')) {
      if (request.method === 'OPTIONS') return new Response(null,{status:405});
      return handleSocial(request,env,url);
    }
    // Fail closed for unknown API routes. Never return SPA HTML as API success.
    if (url.pathname.startsWith('/api/')) {
      return Response.json({ok:false,error:{code:'NOT_FOUND'}},{status:404,headers:{'cache-control':'no-store'}});
    }
    return env.ASSETS.fetch(request);
  }
};
