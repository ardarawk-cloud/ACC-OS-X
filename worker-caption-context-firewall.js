// ACC OS X — BUILD 250 RC7.1 CAPTION DIRECT PATH
// Scope: CAPTION only. Bypass the legacy caption-integrity wrapper ordering bug while
// preserving the same production worker.js engine, hard integrity checks and HARD QC.
// Meta Publish Connector, tokens, Page IDs, worker.js and publishing payload/path are NOT modified.

import baseWorker from "./worker-stage-normalizer.js";
import productionWorker from "./worker.js";

const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const PATCH_REVISION = "BUILD250_RC7_1_CAPTION_DIRECT_PATH";
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

function stripVisualFacts(raw) {
  const source = String(raw || "");
  if (!source) return "";
  const lines = source.split(/\r?\n/);
  const out = [];
  let skipping = false;
  const sectionHeader = /^\s*(TOPIC|VERIFIED_FACTS|SOURCE_NOTES|ANGLE|KEY_POINTS|VISUAL_FACTS|RISK_NOTES|SOURCES)\s*:/i;
  for (const line of lines) {
    const m = line.match(sectionHeader);
    if (m) {
      skipping = String(m[1]).toUpperCase() === "VISUAL_FACTS";
      if (skipping) continue;
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sanitizeCaptionBody(body) {
  const next = JSON.parse(JSON.stringify(body || {}));
  next.context = next.context || {};

  const rows = Array.isArray(next.context.upstreamAssets) ? next.context.upstreamAssets : [];
  next.context.upstreamAssets = rows
    .filter(row => String(row?.stage || "").toUpperCase() !== "POSTER")
    .map(row => {
      if (String(row?.stage || "").toUpperCase() !== "RESEARCH") return row;
      return { ...row, output: stripVisualFacts(row?.output) };
    });

  next.context.captionContextFirewall = {
    active: true,
    revision: PATCH_REVISION,
    posterContextRemoved: true,
    researchVisualFactsRemoved: true,
    directCaptionPath: true
  };

  const guard = [
    "STAGE: CAPTION",
    "CAPTION PUBLIC CONTEXT FIREWALL:",
    "Return ONLY the final public-facing caption about the verified topic and material facts.",
    "Do not describe or refer to this post's production artifact or visual format.",
    "Never mention our poster, generated image, diagram, illustrative scene, visual direction, layout, background, overlay, logo placement, rendering, watermark, or artwork.",
    "Do not narrate what the audience is seeing in the generated visual.",
    "Do not output quotation marks; paraphrase instead.",
    "Never output internal/system labels such as Caption, Result, Sources, VERIFIED_FACTS, SOURCE_NOTES, KEY_POINTS, VISUAL_FACTS, RISK_NOTES, PUBLIC_HEADLINE or PRIMARY VISUAL BASIS.",
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

function normalizeCaption(value) {
  return text(value)
    .replace(/^```[\w-]*\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/^\s*(?:Caption Output|Generated Caption|Result|Final Caption|Caption)\s*:?\s*/i, "")
    .replace(/[“”"]/g, "")
    .trim();
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

function containsInternalLeak(value) {
  const v = text(value).toLowerCase();
  if (!v) return false;
  return /\b(?:gm5|acc os x|acc core|mission terminal|context vault|publish core|ai router)\b|one[- ]button production|(?:research|caption|poster|script)\s+worker|internal workflow/.test(v);
}

function integrityProblems(value) {
  const out = text(value);
  const problems = [];
  if (!out) problems.push("emptyCaption");
  if (/```/.test(out)) problems.push("markdownFence");
  if (/^\s*(?:Caption Output|Generated Caption|Result|Final Caption|Caption)\s*:/i.test(out)) problems.push("wrapperLabel");
  if (containsInternalLeak(out)) problems.push("internalLeak");
  if (/\b(?:PUBLIC_HEADLINE|VERIFIED_FACTS|SOURCE_NOTES|KEY_POINTS|VISUAL_FACTS|RISK_NOTES|SOURCES|PRIMARY VISUAL BASIS)\s*:/i.test(out)) {
    problems.push("researchOrSystemLabel");
  }
  if (/<[^>]{2,80}>|\[(?:INSERT|PLACEHOLDER|TBD|TODO|TEXT|HEADLINE|CAPTION)[^\]]*\]|\blorem ipsum\b/i.test(out)) {
    problems.push("placeholderOrPseudoText");
  }
  if (productionLeak(out)) problems.push("productionVisualLeak");
  return [...new Set(problems)];
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

async function repairCaption(env, body, draft, problems) {
  if (!env?.AI) return "";
  const evidence = evidenceFrom(body);
  if (!evidence) return "";

  let previous = normalizeCaption(draft);
  let lastProblems = Array.isArray(problems) ? problems : integrityProblems(previous);

  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await env.AI.run(TEXT_MODEL, {
      messages: [
        {
          role: "system",
          content: [
            "You are ACC OS X Caption Public Integrity Firewall.",
            "Rewrite the draft into ONLY the final publish-ready public caption.",
            "Use only facts supported by EVIDENCE.",
            "Remove every defect listed in PROBLEMS.",
            "Do not mention the post's production format or visual asset, including poster, generated image, diagram, illustrative scene, visual representation, layout, background, overlay, logo placement, rendering, watermark, or artwork.",
            "Do not output quotation marks. Paraphrase instead.",
            "Never output internal labels, system labels, markdown fences, placeholders or commentary.",
            "Preserve the profile language, useful context, CTA/discussion question, credits/tags and hashtags.",
            "Do not add new facts.",
            "Return only the repaired caption."
          ].join("\n")
        },
        {
          role: "user",
          content: [
            `PROBLEMS:\n${lastProblems.join(", ") || "none"}`,
            `DRAFT:\n${String(previous || "").slice(0,2200)}`,
            `EVIDENCE:\n${evidence}`
          ].join("\n\n")
        }
      ],
      max_tokens: 1200,
      temperature: 0
    });

    const candidate = normalizeCaption(modelText(result));
    const nextProblems = integrityProblems(candidate);
    if (candidate && nextProblems.length === 0) return candidate;
    previous = candidate || previous;
    lastProblems = nextProblems.length ? nextProblems : lastProblems;
  }
  return "";
}

function jsonResponse(payload, upstream, status=upstream.status) {
  const headers = new Headers(upstream.headers);
  headers.set("Content-Type", "application/json;charset=UTF-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(payload, null, 2), { status, headers });
}

async function decorateHealth(request, env, ctx) {
  const upstream = await baseWorker.fetch(request, env, ctx);
  try {
    const data = await upstream.clone().json();
    if (data && typeof data === "object") {
      data.captionContextFirewall = "ACTIVE";
      data.captionContextFirewallRevision = PATCH_REVISION;
      data.captionDirectPath = "ACTIVE";
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

    // CAPTION uses the production core directly so the legacy outer caption guard
    // cannot fail before this firewall performs its own deterministic cleanup.
    const sanitizedBody = sanitizeCaptionBody(body);
    const upstream = await productionWorker.fetch(buildRequest(request, sanitizedBody), env, ctx);
    if (!upstream.ok) return upstream;

    let payload = null;
    try {
      payload = await upstream.clone().json();
    } catch {
      return upstream;
    }

    const draft = normalizeCaption(payload?.reply);
    if (!payload || payload?.ok === false || !draft) return upstream;

    const problems = integrityProblems(draft);
    if (problems.length === 0) {
      return jsonResponse({
        ...payload,
        reply: draft,
        provider: `${text(payload.provider) || "ACC OS X"} + Caption Direct Firewall`,
        captionContextFirewall: {
          applied: true,
          revision: PATCH_REVISION,
          directCaptionPath: true,
          repaired: false,
          problems: []
        }
      }, upstream);
    }

    let repaired = "";
    try {
      repaired = await repairCaption(env, sanitizedBody, draft, problems);
    } catch {
      repaired = "";
    }

    if (!repaired) {
      return jsonResponse({
        ok: false,
        stage: "CAPTION",
        status: "CAPTION_PUBLIC_FIREWALL_FAILED",
        error: "Caption Public Firewall could not produce a clean public caption.",
        errorDetail: {
          code: "CAPTION_PUBLIC_FIREWALL_FAILED",
          problems,
          revision: PATCH_REVISION
        }
      }, upstream, 422);
    }

    return jsonResponse({
      ...payload,
      reply: repaired,
      provider: `${text(payload.provider) || "ACC OS X"} + Caption Direct Firewall`,
      captionContextFirewall: {
        applied: true,
        revision: PATCH_REVISION,
        directCaptionPath: true,
        repaired: true,
        problems
      }
    }, upstream);
  }
};
