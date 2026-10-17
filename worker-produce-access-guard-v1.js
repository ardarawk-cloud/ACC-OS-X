// ACC OS X — PRODUCE OWNER ACCESS GUARD v1
// Outermost auth fence for all generative production endpoints.
// Rescue layers may recover model/runtime failures, but never authentication failures.
import baseWorker from "./worker-map-icon-proxy-v1.js";

const REVISION = "PRODUCE_OWNER_ACCESS_GUARD_V1";
const GUARDED = new Set(["/api/acc-ai", "/api/acc-image"]);

function json(data, status = 200, headersLike = null) {
  const headers = new Headers(headersLike || {});
  headers.set("Content-Type", "application/json;charset=UTF-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "Content-Type,X-ACC-Access-Code");
  return new Response(JSON.stringify(data), { status, headers });
}

function expectedAccess(env) {
  return String(env?.ACC_AI_ACCESS_CODE || env?.ACC_ACCESS_CODE || "").trim();
}

function deny(request, env) {
  const expected = expectedAccess(env);
  const supplied = String(request.headers.get("X-ACC-Access-Code") || "").trim();
  if (!supplied) {
    return json({ok:false,error:"ACCESS_CODE_REQUIRED: ACC AI access code required.",errorDetail:{code:"ACCESS_CODE_REQUIRED",message:"ACC AI access code required."},produceAccessGuard:REVISION},401);
  }
  if (expected && supplied !== expected) {
    return json({ok:false,error:"ACCESS_DENIED: Invalid ACC AI access code.",errorDetail:{code:"ACCESS_DENIED",message:"Invalid ACC AI access code."},produceAccessGuard:REVISION},403);
  }
  return null;
}

async function health(request, env, ctx) {
  const upstream = await baseWorker.fetch(request, env, ctx);
  let payload = {};
  try { payload = await upstream.clone().json(); } catch {}
  return json({
    ...payload,
    produceAccessGuard:"ACTIVE",
    produceAccessGuardRevision:REVISION,
    produceAuthPolicy:"OWNER_CODE_REQUIRED_FOR_GENERATIVE_POST",
    accessSecretConfigured:Boolean(expectedAccess(env))
  }, upstream.status, upstream.headers);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && GUARDED.has(url.pathname)) {
      return new Response(null,{status:204,headers:{
        "Access-Control-Allow-Origin":"*",
        "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
        "Access-Control-Allow-Headers":"Content-Type,X-ACC-Access-Code",
        "Access-Control-Max-Age":"86400"
      }});
    }

    if (request.method === "GET" && url.pathname === "/api/produce-health") {
      return json({
        ok:true,
        service:"ACC OS X Produce",
        produceAccessGuard:"ACTIVE",
        revision:REVISION,
        aiBinding:Boolean(env?.AI),
        browserBinding:Boolean(env?.BROWSER),
        accessSecretConfigured:Boolean(expectedAccess(env)),
        commands:["K","P","C","N"],
        auth:"OWNER_CODE_REQUIRED"
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return health(request, env, ctx);
    }

    if (request.method === "POST" && GUARDED.has(url.pathname)) {
      const blocked = deny(request, env);
      if (blocked) return blocked;
    }

    return baseWorker.fetch(request, env, ctx);
  }
};
