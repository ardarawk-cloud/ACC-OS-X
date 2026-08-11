// ACC OS X — BUILD 250 RC2 QC SOURCE RECOVERY
// Scope: QC research-source recovery only.
// Meta Publish Connector, tokens, Page IDs, worker.js and publishing path are NOT modified.

import baseWorker from "./worker-research-reliability.js";

const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const PATCH_REVISION = "BUILD250_RC2_QC_SOURCE_RECOVERY";

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
    u.hash = "";
    return u.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function isUsefulExternalUrl(raw) {
  const normalized = normalizeUrl(raw);
  if (!normalized) return false;
  const h = new URL(normalized).hostname.toLowerCase();
  const blocked = [
    "google.com", "googleusercontent.com", "gstatic.com",
    "bing.com", "microsoft.com", "duckduckgo.com",
    "yahoo.com", "yandex.com", "facebook.com", "instagram.com",
    "tiktok.com", "youtube.com", "pinterest.com"
  ];
  return !blocked.some(d => h === d || h.endsWith("." + d));
}

function uniqueUsefulUrls(urls) {
  const out = [];
  const seen = new Set();
  for (const raw of urls || []) {
    const u = normalizeUrl(raw);
    if (!u || !isUsefulExternalUrl(u) || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function findResearchAsset(body) {
  const rows = Array.isArray(body?.context?.upstreamAssets) ? body.context.upstreamAssets : [];
  const index = rows.findIndex(item =>
    String(item?.stage || "").toUpperCase() === "RESEARCH" && text(item?.output)
  );
  return index >= 0 ? { index, asset: rows[index] } : null;
}

function extractTopic(raw) {
  const m = String(raw || "").match(/^\s*TOPIC\s*:\s*(.+)$/im);
  return m ? text(m[1]).replace(/\s+/g, " ").slice(0, 240) : "";
}

function modelText(result) {
  const direct = text(result?.response) || text(result?.result?.response) || text(result?.output_text);
  if (direct) return direct;
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.map(x => typeof x === "string" ? x : text(x?.text) || text(x?.content)).filter(Boolean).join("\n").trim();
  }
  return "";
}

async function parseQuickAction(response) {
  if (!response) return { success: false, result: null };
  try {
    const data = await response.json();
    return { success: Boolean(data?.success), result: data?.result ?? null };
  } catch {
    try {
      const raw = await response.text();
      return { success: response.ok, result: raw };
    } catch {
      return { success: false, result: null };
    }
  }
}

async function discoverCandidateUrls(env, topic, existing) {
  const queries = [
    `"${topic}"`,
    `${topic} official announcement`,
    `${topic} news`
  ];
  const found = [];

  for (const query of queries) {
    const q = encodeURIComponent(query);
    const engines = [
      `https://www.bing.com/search?q=${q}`,
      `https://html.duckduckgo.com/html/?q=${q}`,
      `https://www.google.com/search?q=${q}`
    ];
    for (const url of engines) {
      try {
        const res = await env.BROWSER.quickAction("links", {
          url,
          visibleLinksOnly: true,
          gotoOptions: { waitUntil: "domcontentloaded", timeout: 7000 }
        });
        const parsed = await parseQuickAction(res);
        if (parsed.success && Array.isArray(parsed.result)) found.push(...parsed.result);
      } catch {}
      if (found.length >= 18) break;
    }
    if (found.length >= 18) break;
  }

  const existingKeys = new Set((existing || []).map(normalizeUrl).filter(Boolean));
  return uniqueUsefulUrls(found).filter(u => !existingKeys.has(normalizeUrl(u))).slice(0, 10);
}

async function renderCandidates(env, urls) {
  const evidence = [];
  for (const url of urls.slice(0, 8)) {
    try {
      const res = await env.BROWSER.quickAction("markdown", {
        url,
        gotoOptions: { waitUntil: "domcontentloaded", timeout: 7000 }
      });
      const parsed = await parseQuickAction(res);
      const markdown = text(parsed.result);
      if (!parsed.success || markdown.length < 350) continue;
      evidence.push({ url, excerpt: markdown.replace(/\n{3,}/g, "\n\n").slice(0, 6500) });
      if (evidence.length >= 4) break;
    } catch {}
  }
  return evidence;
}

async function validateOneAdditionalSource(env, rawResearch, evidence) {
  if (!evidence.length) return "";
  const allowed = evidence.map(x => x.url);
  const bundle = evidence.map((e, i) => `PAGE ${i + 1}\nURL: ${e.url}\nCONTENT:\n${e.excerpt}`).join("\n\n---\n\n");
  const result = await env.AI.run(TEXT_MODEL, {
    messages: [
      {
        role: "system",
        content: [
          "You are ACC OS X QC Source Recovery.",
          "The existing research packet already passed the Research grounding contract before mobile context compaction.",
          "Select ONE additional URL only if its rendered page directly supports the exact existing TOPIC and at least one claim in VERIFIED_FACTS.",
          "Do not rewrite the research, topic, or facts.",
          "Return exactly one allowed URL and nothing else, or INSUFFICIENT."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `EXISTING RESEARCH PACKET:\n${rawResearch}`,
          `ALLOWED URLS:\n${allowed.join("\n")}`,
          `RENDERED PAGES:\n${bundle}`
        ].join("\n\n")
      }
    ],
    max_tokens: 180,
    temperature: 0
  });

  const out = modelText(result);
  if (!out || /^\s*INSUFFICIENT\b/i.test(out)) return "";
  const allowedMap = new Map(allowed.map(u => [normalizeUrl(u), u]));
  for (const url of urlsInText(out)) {
    const exact = allowedMap.get(normalizeUrl(url));
    if (exact) return exact;
  }
  return "";
}

function qcFailedOnlyForOneResearchUrl(payload) {
  const reply = text(payload?.reply);
  const count = Number(payload?.qc?.researchSourceCount);
  return count === 1 && /QC deterministic preflight failed:/i.test(reply) && /researchGrounded/i.test(reply);
}

async function recoverQcBody(env, body) {
  if (!env?.BROWSER || !env?.AI) return null;
  const found = findResearchAsset(body);
  if (!found) return null;

  const raw = text(found.asset.output);
  if (!/^\s*RESEARCH_PASS\b/i.test(raw)) return null;

  const existing = uniqueUsefulUrls(urlsInText(raw));
  if (existing.length !== 1) return null;

  const topic = extractTopic(raw);
  if (!topic) return null;

  const candidates = await discoverCandidateUrls(env, topic, existing);
  if (!candidates.length) return null;

  const evidence = await renderCandidates(env, candidates);
  const extra = await validateOneAdditionalSource(env, raw, evidence);
  if (!extra) return null;

  const cloned = JSON.parse(JSON.stringify(body));
  const target = cloned.context.upstreamAssets[found.index];
  const original = text(target.output);
  target.output = /\bSOURCES?\s*:/i.test(original)
    ? `${original}\n- ${extra}`
    : `${original}\n\nSOURCES:\n- ${extra}`;
  cloned.context.qcSourceRecovery = {
    applied: true,
    revision: PATCH_REVISION,
    originalSourceCount: 1,
    recoveredSource: extra
  };
  return cloned;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!(request.method === "POST" && url.pathname === "/api/acc-ai")) {
      return baseWorker.fetch(request, env, ctx);
    }

    let body = null;
    try {
      body = await request.clone().json();
    } catch {
      return baseWorker.fetch(request, env, ctx);
    }

    if (detectStage(body) !== "QC") return baseWorker.fetch(request, env, ctx);

    const first = await baseWorker.fetch(request.clone(), env, ctx);
    let payload = null;
    try {
      payload = await first.clone().json();
    } catch {
      return first;
    }

    if (!qcFailedOnlyForOneResearchUrl(payload)) return first;

    let repaired = null;
    try {
      repaired = await recoverQcBody(env, body);
    } catch {
      repaired = null;
    }
    if (!repaired) return first;

    const headers = new Headers(request.headers);
    headers.delete("content-length");
    const retry = new Request(request.url, {
      method: "POST",
      headers,
      body: JSON.stringify(repaired)
    });
    return baseWorker.fetch(retry, env, ctx);
  }
};
