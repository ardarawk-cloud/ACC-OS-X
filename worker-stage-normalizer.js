// ACC OS X — BUILD 250 RC5 STAGE NORMALIZER
// Scope: canonicalize stage identity from structured request context before existing RC4/RC3/RC2 wrappers.
// Meta Publish Connector, tokens, Page IDs, worker.js and publishing payload/path are NOT modified.

import baseWorker from "./worker-research-grounding-gate.js";

const PATCH_REVISION = "BUILD250_RC5_STAGE_NORMALIZER";
const VALID_STAGES = new Set(["RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"]);

const text = v => typeof v === "string" ? v.trim() : "";

function canonicalStage(body) {
  const structured = String(body?.context?.workerTask?.stage || "").toUpperCase();
  if (structured === "MATERIAL") return "SCRIPT";
  if (structured === "PUBLISH") return "PUBLISHING";
  if (VALID_STAGES.has(structured)) return structured;

  const joined = (Array.isArray(body?.messages) ? body.messages : [])
    .map(m => text(m?.content))
    .join("\n");

  const explicit = joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  if (explicit) return String(explicit[1] || "").toUpperCase();

  if (/Research Specialist/i.test(joined)) return "RESEARCH";
  if (/Scriptwriter AI|Material Creator/i.test(joined)) return "SCRIPT";
  if (/Poster Creator/i.test(joined)) return "POSTER";
  if (/Social Captioner/i.test(joined)) return "CAPTION";
  if (/Editorial QC Auditor/i.test(joined)) return "QC";
  if (/Publishing Agent/i.test(joined)) return "PUBLISHING";
  return "";
}

function hasExplicitStage(body, stage) {
  const joined = (Array.isArray(body?.messages) ? body.messages : [])
    .map(m => text(m?.content))
    .join("\n");
  return new RegExp(`(?:^|\\n)STAGE:\\s*${stage}\\b`, "i").test(joined);
}

function canonicalRequest(request, body, stage) {
  if (!stage || hasExplicitStage(body, stage)) return request;

  const cloned = JSON.parse(JSON.stringify(body || {}));
  const messages = Array.isArray(cloned.messages) ? cloned.messages : [];
  cloned.messages = [{ role:"system", content:`STAGE: ${stage}` }, ...messages];

  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(cloned)
  });
}

function jsonResponse(payload, upstream) {
  const headers = new Headers(upstream.headers);
  headers.set("Content-Type", "application/json;charset=UTF-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(payload, null, 2), {
    status: upstream.status,
    headers
  });
}

async function decorateHealth(request, env, ctx) {
  const upstream = await baseWorker.fetch(request, env, ctx);
  try {
    const data = await upstream.clone().json();
    if (data && typeof data === "object") {
      data.stageNormalizer = "ACTIVE";
      data.stageNormalizerRevision = PATCH_REVISION;
      return jsonResponse(data, upstream);
    }
  } catch {}
  return upstream;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/health" || url.pathname === "/api/acc-ai")) {
      return decorateHealth(request, env, ctx);
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

    const stage = canonicalStage(body);
    const normalized = canonicalRequest(request, body, stage);
    return baseWorker.fetch(normalized, env, ctx);
  }
};
