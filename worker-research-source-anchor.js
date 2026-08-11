// ACC OS X — BUILD 250 RC6 BRIDGE GROUNDING INLINE
// Scope: preserve already-validated Research source URLs through the current mobile context bridge.
// Meta Publish Connector, tokens, Page IDs, worker.js and publishing path are NOT modified.

import baseWorker from "./worker-qc-source-recovery.js";

const PATCH_REVISION = "BUILD250_RC6_BRIDGE_GROUNDING_INLINE";

const text = (v) => typeof v === "string" ? v.trim() : "";

function detectStage(body) {
  const joined = (Array.isArray(body?.messages) ? body.messages : [])
    .map(m => text(m?.content))
    .join("\n");
  const m = joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  return m ? String(m[1] || "").toUpperCase() : "";
}

function urlsInText(value) {
  return Array.from(String(value || "").matchAll(/https?:\/\/[^\s)\]}>]+/g))
    .map(m => m[0].replace(/[.,;:]+$/, ""));
}

function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return "";
    const h = u.hostname.toLowerCase();
    if (
      h === "localhost" || h.endsWith(".local") ||
      /^127\./.test(h) || /^10\./.test(h) ||
      /^192\.168\./.test(h) || /^169\.254\./.test(h)
    ) return "";
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function uniqueUrls(urls) {
  const out = [];
  const seen = new Set();
  for (const raw of urls || []) {
    const u = normalizeUrl(raw);
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function anchorResearchReply(reply) {
  const raw = text(reply);
  if (!/^\s*RESEARCH_PASS\b/i.test(raw)) return { reply: raw, applied: false, urls: [] };
  if (/\bGROUNDING_URLS\s*:/i.test(raw)) {
    const urls = uniqueUrls(urlsInText(raw)).slice(0, 2);
    return { reply: raw, applied: urls.length >= 2, urls };
  }

  const urls = uniqueUrls(urlsInText(raw)).slice(0, 2);
  if (urls.length < 2) return { reply: raw, applied: false, urls };

  // IMPORTANT: both URLs stay on the FIRST SOURCE_NOTES content line.
  // BUILD250 Context Bridge currently truncates multi-line sections at the first
  // line boundary, so this bridge-compatible form keeps both validated URLs alive.
  const anchor = `GROUNDING_URLS: ${urls[0]} ${urls[1]}`;
  let next = raw;

  if (/^\s*SOURCE_NOTES\s*:/im.test(next)) {
    next = next.replace(
      /^(\s*SOURCE_NOTES\s*:)\s*/im,
      `$1\n${anchor}\n`
    );
  } else if (/^\s*ANGLE\s*:/im.test(next)) {
    next = next.replace(
      /^(\s*ANGLE\s*:)/im,
      `SOURCE_NOTES:\n${anchor}\n\n$1`
    );
  } else {
    next = `${next}\n\nSOURCE_NOTES:\n${anchor}`;
  }

  return { reply: next, applied: true, urls };
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
      data.researchSourceAnchor = "ACTIVE";
      data.researchSourceAnchorRevision = PATCH_REVISION;
      data.bridgeGroundingInline = "ACTIVE";
      return jsonResponse(data, upstream);
    }
  } catch {}
  return upstream;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (
      request.method === "GET" &&
      (url.pathname === "/health" || url.pathname === "/api/acc-ai")
    ) {
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

    if (detectStage(body) !== "RESEARCH") {
      return baseWorker.fetch(request, env, ctx);
    }

    const upstream = await baseWorker.fetch(request, env, ctx);
    if (!upstream.ok) return upstream;

    let payload = null;
    try {
      payload = await upstream.clone().json();
    } catch {
      return upstream;
    }

    if (!payload || payload?.ok === false || !text(payload?.reply)) return upstream;

    const anchored = anchorResearchReply(payload.reply);
    if (!anchored.applied) return upstream;

    return jsonResponse({
      ...payload,
      reply: anchored.reply,
      researchSourceAnchor: {
        applied: true,
        revision: PATCH_REVISION,
        sourceCount: anchored.urls.length,
        urls: anchored.urls,
        inlineForContextBridge: true
      }
    }, upstream);
  }
};
