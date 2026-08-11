// ACC OS X — BUILD 250 RC4 RESEARCH GROUNDING GATE
// Scope: enforce Research grounding BEFORE downstream stages.
// Meta Publish Connector, tokens, Page IDs, worker.js and publishing path are NOT modified.

import baseWorker from "./worker-research-source-anchor.js";

const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const PATCH_REVISION = "BUILD250_RC4_RESEARCH_GROUNDING_GATE";

const text = (v) => typeof v === "string" ? v.trim() : "";

function json(data, status=200, headers={}) {
  const h = new Headers(headers);
  h.set("Content-Type", "application/json;charset=UTF-8");
  h.set("Cache-Control", "no-store");
  h.set("Access-Control-Allow-Origin", "*");
  return new Response(JSON.stringify(data, null, 2), { status, headers: h });
}

function detectStage(body) {
  const joined = (Array.isArray(body?.messages) ? body.messages : [])
    .map(m => text(m?.content)).join("\n");
  const m = joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  return m ? String(m[1] || "").toUpperCase() : "";
}

function urlsInText(value) {
  return Array.from(String(value || "").matchAll(/https?:\/\/[^\s)\]}>]+/g))
    .map(m => m[0].replace(/[.,;:]+$/, ""));
}

function safeUrl(raw) {
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

function decodeSearchRedirect(raw) {
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase();
    if (h.includes("duckduckgo.com")) {
      const uddg = u.searchParams.get("uddg");
      if (uddg) return decodeURIComponent(uddg);
    }
    if (h.includes("google.") && u.pathname === "/url") {
      const q = u.searchParams.get("q") || u.searchParams.get("url");
      if (q) return q;
    }
    return raw;
  } catch {
    return raw;
  }
}

function isUsefulExternalUrl(raw) {
  const url = safeUrl(decodeSearchRedirect(raw));
  if (!url) return false;
  const h = new URL(url).hostname.toLowerCase();
  const blocked = [
    "google.com", "googleusercontent.com", "gstatic.com",
    "bing.com", "microsoft.com", "duckduckgo.com",
    "yahoo.com", "yandex.com", "facebook.com", "instagram.com",
    "tiktok.com", "youtube.com", "pinterest.com"
  ];
  return !blocked.some(d => h === d || h.endsWith("." + d));
}

function uniqueUrls(urls) {
  const out = [];
  const seen = new Set();
  for (const raw of urls || []) {
    const decoded = decodeSearchRedirect(raw);
    if (!isUsefulExternalUrl(decoded)) continue;
    const u = safeUrl(decoded);
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function extractTopic(raw) {
  const m = String(raw || "").match(/^\s*TOPIC\s*:\s*(.+)$/im);
  return m ? text(m[1]).replace(/\s+/g, " ").slice(0, 240) : "";
}

function extractVerifiedFacts(raw) {
  const m = String(raw || "").match(/^\s*VERIFIED_FACTS\s*:\s*([\s\S]*?)(?=^\s*(?:SOURCE_NOTES|ANGLE|KEY_POINTS|VISUAL_FACTS|RISK_NOTES|SOURCES)\s*:|$)/im);
  return m ? text(m[1]).slice(0, 5000) : "";
}

function modelText(result) {
  const direct = text(result?.response) || text(result?.result?.response) || text(result?.output_text);
  if (direct) return direct;
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map(x => typeof x === "string" ? x : text(x?.text) || text(x?.content))
      .filter(Boolean).join("\n").trim();
  }
  return text(result?.choices?.[0]?.text);
}

async function parseQuickAction(response) {
  if (!response) return { success:false, result:null };
  try {
    const data = await response.json();
    return { success:Boolean(data?.success), result:data?.result ?? null };
  } catch {
    try {
      const raw = await response.text();
      return { success:response.ok, result:raw };
    } catch {
      return { success:false, result:null };
    }
  }
}

async function discoverUrls(env, topic, existing) {
  const profileQueries = [
    `"${topic}"`,
    `${topic} official announcement`,
    `${topic} news`
  ];
  const found = [];
  for (const query of profileQueries) {
    const q = encodeURIComponent(query);
    const engines = [
      `https://www.bing.com/search?q=${q}`,
      `https://html.duckduckgo.com/html/?q=${q}`,
      `https://www.google.com/search?q=${q}`
    ];
    for (const searchUrl of engines) {
      try {
        const response = await env.BROWSER.quickAction("links", {
          url: searchUrl,
          visibleLinksOnly: true,
          gotoOptions: { waitUntil:"domcontentloaded", timeout:8000 }
        });
        const parsed = await parseQuickAction(response);
        if (parsed.success && Array.isArray(parsed.result)) found.push(...parsed.result);
      } catch {}
      if (found.length >= 18) break;
    }
    if (found.length >= 18) break;
  }
  const existingSet = new Set((existing || []).map(safeUrl).filter(Boolean));
  return uniqueUrls(found).filter(u => !existingSet.has(safeUrl(u))).slice(0, 10);
}

async function renderPages(env, urls) {
  const evidence = [];
  for (const url of urls.slice(0, 8)) {
    try {
      const response = await env.BROWSER.quickAction("markdown", {
        url,
        gotoOptions: { waitUntil:"domcontentloaded", timeout:8000 }
      });
      const parsed = await parseQuickAction(response);
      const markdown = text(parsed.result);
      if (!parsed.success || markdown.length < 350) continue;
      evidence.push({ url, excerpt:markdown.replace(/\n{3,}/g, "\n\n").slice(0, 7000) });
      if (evidence.length >= 4) break;
    } catch {}
  }
  return evidence;
}

async function validateAdditionalUrls(env, research, evidence, needed) {
  if (!evidence.length || needed <= 0) return [];
  const allowed = evidence.map(x => x.url);
  const bundle = evidence.map((e, i) =>
    `PAGE ${i + 1}\nURL: ${e.url}\nCONTENT:\n${e.excerpt}`
  ).join("\n\n---\n\n");

  const result = await env.AI.run(TEXT_MODEL, {
    messages: [
      {
        role: "system",
        content: [
          "You are ACC OS X Research Grounding Gate.",
          "Repair source grounding only; do not rewrite the topic or facts.",
          `Select exactly ${needed} additional URL${needed === 1 ? "" : "s"} only if each rendered page directly supports the existing TOPIC and at least one VERIFIED_FACT.`,
          "Use ONLY exact URLs from ALLOWED URLS.",
          "Return SUPPORTED_URLS followed by one URL per line, or INSUFFICIENT if the requirement cannot be met."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `TOPIC:\n${extractTopic(research)}`,
          `VERIFIED_FACTS:\n${extractVerifiedFacts(research)}`,
          `ALLOWED URLS:\n${allowed.join("\n")}`,
          `RENDERED PAGES:\n${bundle}`
        ].join("\n\n")
      }
    ],
    max_tokens: 300,
    temperature: 0
  });

  const out = modelText(result);
  if (!out || /^\s*INSUFFICIENT\b/i.test(out)) return [];
  const allowedMap = new Map(allowed.map(u => [safeUrl(u), u]));
  const selected = [];
  for (const raw of urlsInText(out)) {
    const exact = allowedMap.get(safeUrl(raw));
    if (exact && !selected.includes(exact)) selected.push(exact);
  }
  return selected.slice(0, needed);
}

function appendGroundingUrls(raw, urls) {
  const existing = uniqueUrls(urlsInText(raw));
  const merged = uniqueUrls([...existing, ...urls]).slice(0, 4);
  if (merged.length < 2) return raw;

  const anchor = `GROUNDING_URLS:\n${merged.slice(0, 2).map(u => `- ${u}`).join("\n")}`;
  let next = String(raw || "");

  if (/\bGROUNDING_URLS\s*:/i.test(next)) {
    next = next.replace(/GROUNDING_URLS\s*:[\s\S]*?(?=^\s*(?:ANGLE|KEY_POINTS|VISUAL_FACTS|RISK_NOTES|SOURCES)\s*:|$)/im, anchor + "\n");
  } else if (/^\s*SOURCE_NOTES\s*:/im.test(next)) {
    next = next.replace(/^(\s*SOURCE_NOTES\s*:)\s*/im, `$1\n${anchor}\n`);
  } else if (/^\s*ANGLE\s*:/im.test(next)) {
    next = next.replace(/^(\s*ANGLE\s*:)/im, `SOURCE_NOTES:\n${anchor}\n\n$1`);
  } else {
    next += `\n\nSOURCE_NOTES:\n${anchor}`;
  }

  const sourceBlock = next.match(/\bSOURCES?\s*:[\s\S]*$/i)?.[0] || "";
  const sourceSet = new Set(uniqueUrls(urlsInText(sourceBlock)));
  const missingFromSources = merged.filter(u => !sourceSet.has(u));
  if (/\bSOURCES?\s*:/i.test(next)) {
    next += missingFromSources.length ? `\n${missingFromSources.map(u => `- ${u}`).join("\n")}` : "";
  } else {
    next += `\n\nSOURCES:\n${merged.slice(0, 2).map(u => `- ${u}`).join("\n")}`;
  }
  return next;
}

async function repairWeakResearch(env, reply) {
  if (!env?.BROWSER || !env?.AI) return null;
  const raw = text(reply);
  const existing = uniqueUrls(urlsInText(raw));
  if (existing.length >= 2) return raw;
  const topic = extractTopic(raw);
  const facts = extractVerifiedFacts(raw);
  if (!topic || !facts) return null;

  const candidates = await discoverUrls(env, topic, existing);
  if (!candidates.length) return null;
  const evidence = await renderPages(env, candidates);
  const needed = 2 - existing.length;
  const selected = await validateAdditionalUrls(env, raw, evidence, needed);
  if (selected.length < needed) return null;

  const repaired = appendGroundingUrls(raw, selected);
  return uniqueUrls(urlsInText(repaired)).length >= 2 ? repaired : null;
}

async function decorateHealth(request, env, ctx) {
  const upstream = await baseWorker.fetch(request, env, ctx);
  try {
    const data = await upstream.clone().json();
    if (data && typeof data === "object") {
      data.researchGroundingGate = "ACTIVE";
      data.researchGroundingGateRevision = PATCH_REVISION;
      return json(data, upstream.status, upstream.headers);
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

    if (detectStage(body) !== "RESEARCH") return baseWorker.fetch(request, env, ctx);

    const upstream = await baseWorker.fetch(request, env, ctx);
    if (!upstream.ok) return upstream;

    let payload = null;
    try {
      payload = await upstream.clone().json();
    } catch {
      return upstream;
    }

    const reply = text(payload?.reply);
    if (!payload || payload?.ok === false || !reply) return upstream;

    const currentUrls = uniqueUrls(urlsInText(reply));
    if (/^\s*RESEARCH_PASS\b/i.test(reply) && currentUrls.length >= 2) return upstream;

    let repaired = null;
    try {
      repaired = await repairWeakResearch(env, reply);
    } catch {
      repaired = null;
    }

    if (!repaired) {
      return json({
        ok:false,
        stage:"RESEARCH",
        status:"RESEARCH_GROUNDING_GATE_FAILED",
        error:"Research did not satisfy the two-source grounding contract before downstream production.",
        errorDetail:{
          code:"RESEARCH_FAILED_GROUNDING_CONTRACT",
          sourceCount:currentUrls.length,
          revision:PATCH_REVISION
        }
      }, 422, upstream.headers);
    }

    return json({
      ...payload,
      reply:repaired,
      provider:`${text(payload.provider) || "ACC OS X"} + Research Grounding Gate`,
      researchGroundingGate:{
        applied:true,
        revision:PATCH_REVISION,
        sourceCount:uniqueUrls(urlsInText(repaired)).length
      }
    }, upstream.status, upstream.headers);
  }
};
