// ACC OS X — BUILD 250 AUTOMATIC DEPLOY SYNCHRONIZATION GATE
// Purpose: stop a new mission from starting while GitHub main is ahead of the live Cloudflare Worker.
// Scope: RESEARCH mission-entry gate + health observability only.
// Meta publishing, tokens, Page IDs, worker.js and publishing payload/path are NOT modified.

import baseWorker from "./worker-caption-context-firewall.js";

const GATE_REVISION = "BUILD250_AUTO_DEPLOY_GATE_V1";
const TARGET_URL = "https://raw.githubusercontent.com/ardarawk-cloud/ACC-OS-X/main/acc-deploy-target.json";

const text = v => typeof v === "string" ? v.trim() : "";

function json(data, status=200, sourceHeaders=null) {
  const headers = new Headers(sourceHeaders || {});
  headers.set("Content-Type", "application/json;charset=UTF-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function canonicalStage(body) {
  const structured = String(body?.context?.workerTask?.stage || "").toUpperCase();
  if (structured === "MATERIAL") return "SCRIPT";
  if (structured === "PUBLISH") return "PUBLISHING";
  if (["RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"].includes(structured)) return structured;

  const joined = (Array.isArray(body?.messages) ? body.messages : [])
    .map(m => text(m?.content)).join("\n");
  const explicit = joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  if (explicit) return String(explicit[1] || "").toUpperCase();
  if (/Research Specialist/i.test(joined)) return "RESEARCH";
  return "";
}

async function readBaseHealth(request, env, ctx) {
  const url = new URL(request.url);
  url.pathname = "/api/acc-ai";
  url.search = "";
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  const response = await baseWorker.fetch(new Request(url.toString(), { method:"GET", headers }), env, ctx);
  try {
    return { response, data:await response.clone().json() };
  } catch {
    return { response, data:null };
  }
}

async function readTarget() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const separator = TARGET_URL.includes("?") ? "&" : "?";
    const response = await fetch(`${TARGET_URL}${separator}t=${Date.now()}`, {
      method:"GET",
      headers:{ "Accept":"application/json", "Cache-Control":"no-cache" },
      cache:"no-store",
      signal:controller.signal
    });
    if (!response.ok) throw new Error(`GitHub target HTTP ${response.status}`);
    const target = await response.json();
    if (!text(target?.healthField) || !text(target?.expectedRevision)) throw new Error("Invalid deploy target manifest");
    return { ok:true, target };
  } catch (error) {
    return { ok:false, error:String(error?.message || error).slice(0,220) };
  } finally {
    clearTimeout(timer);
  }
}

async function deploymentState(request, env, ctx) {
  const [base, remote] = await Promise.all([
    readBaseHealth(request, env, ctx),
    readTarget()
  ]);

  const health = base.data && typeof base.data === "object" ? base.data : {};
  if (!remote.ok) {
    return {
      synchronized:null,
      targetAvailable:false,
      targetError:remote.error,
      health,
      baseResponse:base.response
    };
  }

  const target = remote.target;
  const field = text(target.healthField);
  const expected = text(target.expectedRevision);
  const actual = text(health?.[field]);
  return {
    synchronized:Boolean(actual && actual === expected),
    targetAvailable:true,
    field,
    expected,
    actual,
    label:text(target.label),
    health,
    baseResponse:base.response
  };
}

async function healthResponse(request, env, ctx) {
  const state = await deploymentState(request, env, ctx);
  const payload = {
    ...(state.health || {}),
    deployGate:"ACTIVE",
    deployGateRevision:GATE_REVISION,
    deployTargetAvailable:state.targetAvailable,
    deploymentSynchronized:state.synchronized,
    deployTargetField:state.field || null,
    deployTargetRevision:state.expected || null,
    deployLiveRevision:state.actual || null,
    deployTargetLabel:state.label || null
  };
  if (!state.targetAvailable) payload.deployTargetWarning = state.targetError || "Target check unavailable";
  return json(payload, state.baseResponse?.status || 200, state.baseResponse?.headers);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/health" || url.pathname === "/api/acc-ai")) {
      return healthResponse(request, env, ctx);
    }

    if (!(request.method === "POST" && url.pathname === "/api/acc-ai")) {
      return baseWorker.fetch(request, env, ctx);
    }

    let body = null;
    try {
      body = await request.clone().json();
    } catch {
      return baseWorker.fetch(request, env, ctx);
    }

    // Only gate the mission-entry Research stage. Once a mission has started,
    // an unrelated GitHub update must not interrupt MATERIAL/POSTER/CAPTION/QC.
    if (canonicalStage(body) !== "RESEARCH") {
      return baseWorker.fetch(request, env, ctx);
    }

    const state = await deploymentState(request, env, ctx);

    // Fail-open only when GitHub target lookup is temporarily unavailable.
    // This prevents GitHub availability from becoming a production dependency.
    if (state.targetAvailable && state.synchronized === false) {
      return json({
        ok:false,
        stage:"RESEARCH",
        status:"DEPLOY_PENDING",
        error:"ACC OS X update is still syncing from GitHub to Cloudflare. No production was started. Retry shortly.",
        errorDetail:{
          code:"DEPLOY_PENDING",
          targetField:state.field,
          expectedRevision:state.expected,
          liveRevision:state.actual || null,
          targetLabel:state.label || null,
          gateRevision:GATE_REVISION
        }
      }, 503);
    }

    return baseWorker.fetch(request, env, ctx);
  }
};
