// ACC OS X — BUILD 250 RC7 CAPTION CONTEXT FIREWALL
// Scope: isolate public caption generation from poster/visual-production context.
// Meta Publish Connector, tokens, Page IDs, worker.js and publishing payload/path are NOT modified.

import baseWorker from "./worker-stage-normalizer.js";

const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const PATCH_REVISION = "BUILD250_RC7_CAPTION_CONTEXT_FIREWALL";
const text = v => typeof v === "string" ? v.trim() : "";

function canonicalStage(body) {
  const structured = String(body?.context?.workerTask?.stage || "").toUpperCase();
  if (structured === "MATERIAL") return "SCRIPT";
  if (structured === "PUBLISH") return "PUBLISHING";
  if (["RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"].includes(structured)) return structured;

  const joined = (Array.isArray(body?.messages) ? body.messages : [])
    .map(m => text(m?.content)).join("\n");
  const explicit = joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  if (explicit) return String(explicit[1] || "").toUpperCase();
  if (/Social Captioner/i.test(joined)) return "CAPTION";
  return "";
}

function sectionWithoutVisualFacts(raw) {
  const source = String(raw || "");
  if (!source) return "";
  return source
    .replace(
      /^\s*VISUAL_FACTS\s*:\s*[\s\S]*?(?=^\s*(?:RISK_NOTES|SOURCES|ANGLE|KEY_POINTS|SOURCE_NOTES|VERIFIED_FACTS|TOPIC)\s*:|$)/gim,
      ""
    )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeCaptionBody(body) {
  const next = JSON.parse(JSON.stringify(body || {}));
  next.context = next.context || {};

  const rows = Array.isArray(next.context.upstreamAssets) ? next.context.upstreamAssets : [];
  next.context.upstreamAssets = rows
    .filter(row => String(row?.stage || "").toUpperCase() !== "POSTER")
    .map(row => {
      if (String(row?.stage || "").toUpperCase() !== "RESEARCH") return row;
      return { ...row, output: sectionWithoutVisualFacts(row?.output) };
    });

  next.context.captionContextFirewall = {
    active: true,
    revision: PATCH_REVISION,
    posterContextRemoved: true,
    researchVisualFactsRemoved: true
  };

  const guard = [
    "CAPTION PUBLIC CONTEXT FIREWALL:",
    "Write only the final public-facing caption about the verified topic and material facts.",
    "Do not describe or refer to this post's production artifact or visual format.",
    "Never mention our poster, image, diagram, illustrative scene, visual direction, layout, background, overlay, logo placement, rendering, or artwork.",
    "Do not narrate what the audience is seeing in the generated visual.",
    "If a real external diagram/image is itself a verified news fact, mention it only when VERIFIED_FACTS explicitly establishes that external artifact; otherwise omit it.",
    "Preserve the profile language, tone, CTA, credits/tag rules, discussion prompt and hashtags.",
    "Do not add new factual claims."
  ].join("\n");

  const messages = Array.isArray(next.messages) ? next.messages : [];
  next.messages = [{ role: "system", content: guard }, ...messages];
  return next;
}

function buildRequest(request, body) {
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(body)
  });
}

function productionLeak(value) {
  const out = text(value);
  if (!out) return false;
  return (
    /\b(?:poster direction|visual direction|illustrative scene|visual representation|layout|logo placement|background artwork|artwork rendering|rendering|watermark|overlay)\b/i.test(out) ||
    /\b(?:this|the|our)\s+(?:poster|image|visual|graphic|diagram)\b/i.test(out) ||
    /\b(?:image|poster|visual)\s+(?:shows?|depicts?|should|will|features?)\b/i.test(out) ||
    /\bdiagram\s+(?:of|showing|depicting)\b/i.test(out)
  );
}

function modelText(result) {
  const direct = text(result?.response) || text(result?.result?.response) || text(result?.output_text);
  if (direct) return direct;
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map(x => typeof x === "string" ? x : text(x?.text) || text(x?.content))
      .filter(Boolean).join("\n").trim();
  }
  return text(result?.choices?.[0]?.text);
}

function evidenceFrom(body) {
  const rows = Array.isArray(body?.context?.upstreamAssets) ? body.context.upstreamAssets : [];
  return rows
    .filter(row => ["RESEARCH","SCRIPT","MATERIAL"].includes(String(row?.stage || "").toUpperCase()))
    .map(row => `${String(row?.stage || "").toUpperCase()}:\n${String(row?.output || "").slice(0,6500)}`)
    .join("\n\n")
    .slice(0,12000);
}

async function repairCaptionLeak(env, body, draft) {
  if (!env?.AI) return "";
  const evidence = evidenceFrom(body);
  if (!evidence) return "";

  const result = await env.AI.run(TEXT_MODEL, {
    messages: [
      {
        role: "system",
        content: [
          "You are ACC OS X Caption Public Firewall.",
          "Rewrite the draft into ONLY the final publish-ready public caption.",
          "Use only facts supported by EVIDENCE.",
          "Remove all references to the post's production format or visual asset, including poster, generated image, diagram, illustrative scene, visual representation, layout, background, overlay, logo placement, rendering, or artwork.",
          "Do not narrate what the audience is seeing in our visual.",
          "If an external diagram/image is itself explicitly verified in EVIDENCE, it may remain only as a real-world fact; otherwise remove it.",
          "Preserve the original language, useful context, CTA/discussion question, credits/tags and hashtags.",
          "Do not add new facts, internal labels, markdown wrappers or commentary.",
          "Return only the repaired caption."
        ].join("\n")
      },
      {
        role: "user",
        content: `DRAFT:\n${String(draft || "").slice(0,2200)}\n\nEVIDENCE:\n${evidence}`
      }
    ],
    max_tokens: 1200,
    temperature: 0
  });

  const repaired = modelText(result);
  return repaired && !productionLeak(repaired) ? repaired : "";
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
      data.captionContextFirewall = "ACTIVE";
      data.captionContextFirewallRevision = PATCH_REVISION;
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

    if (canonicalStage(body) !== "CAPTION") {
      return baseWorker.fetch(request, env, ctx);
    }

    const sanitizedBody = sanitizeCaptionBody(body);
    const upstream = await baseWorker.fetch(buildRequest(request, sanitizedBody), env, ctx);
    if (!upstream.ok) return upstream;

    let payload = null;
    try {
      payload = await upstream.clone().json();
    } catch {
      return upstream;
    }

    const draft = text(payload?.reply);
    if (!payload || payload?.ok === false || !draft) return upstream;

    if (!productionLeak(draft)) {
      return jsonResponse({
        ...payload,
        captionContextFirewall: {
          applied: true,
          revision: PATCH_REVISION,
          posterContextRemoved: true,
          visualLeakRepair: false
        }
      }, upstream);
    }

    let repaired = "";
    try {
      repaired = await repairCaptionLeak(env, sanitizedBody, draft);
    } catch {
      repaired = "";
    }

    if (!repaired) {
      // Preserve the original output so HARD QC remains authoritative.
      return jsonResponse({
        ...payload,
        captionContextFirewall: {
          applied: true,
          revision: PATCH_REVISION,
          posterContextRemoved: true,
          visualLeakRepair: false,
          leakDetected: true
        }
      }, upstream);
    }

    return jsonResponse({
      ...payload,
      reply: repaired,
      provider: `${text(payload.provider) || "ACC OS X"} + Caption Context Firewall`,
      captionContextFirewall: {
        applied: true,
        revision: PATCH_REVISION,
        posterContextRemoved: true,
        visualLeakRepair: true
      }
    }, upstream);
  }
};
