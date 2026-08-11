// ACC OS X — BUILD 250 RESEARCH RELIABILITY PATCH
// Scope: Research fallback only. Original worker.js remains the primary engine.
// Real Meta publishing connector is NOT imported, edited, or replaced.

import originalWorker from "./worker.js";

const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const PATCH_REVISION = "BUILD250_RESEARCH_RELIABILITY_V1";

const text = (v) => typeof v === "string" ? v.trim() : "";

function json(data, status=200, headers={}) {
  const h = new Headers(headers);
  h.set("Content-Type","application/json;charset=UTF-8");
  h.set("Cache-Control","no-store");
  h.set("Access-Control-Allow-Origin","*");
  return new Response(JSON.stringify(data,null,2), {status, headers:h});
}

function safeUrl(raw) {
  try {
    const u = new URL(raw);
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (
      h === "localhost" || h.endsWith(".local") ||
      /^127\./.test(h) || /^10\./.test(h) ||
      /^192\.168\./.test(h) || /^169\.254\./.test(h)
    ) return null;
    return u.toString();
  } catch {
    return null;
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
  const decoded = decodeSearchRedirect(raw);
  const url = safeUrl(decoded);
  if (!url) return false;
  const h = new URL(url).hostname.toLowerCase();
  const blocked = [
    "google.com","googleusercontent.com","gstatic.com",
    "bing.com","microsoft.com","duckduckgo.com",
    "yahoo.com","yandex.com","facebook.com","instagram.com",
    "tiktok.com","youtube.com","pinterest.com"
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
    if (!u) continue;
    const normalized = u.replace(/#.*$/,"");
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

async function parseQuickAction(response) {
  if (!response) return {success:false,result:null,status:0};
  const status = response.status || 0;
  try {
    const data = await response.json();
    return {
      success:Boolean(data?.success),
      result:data?.result ?? null,
      status,
      data
    };
  } catch {
    try {
      const raw = await response.text();
      return {success:response.ok,result:raw,status};
    } catch {
      return {success:false,result:null,status};
    }
  }
}

function urlsInText(value) {
  return Array.from(String(value || "").matchAll(/https?:\/\/[^\s)\]}>]+/g))
    .map(m => m[0].replace(/[.,;:]+$/,""));
}

function modelContentToText(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(part => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object") {
        return text(part.text) || text(part.content) || text(part.output_text) || "";
      }
      return "";
    }).filter(Boolean).join("\n").trim();
  }
  return "";
}

function extractModelText(result) {
  return text(result?.response) ||
    text(result?.result?.response) ||
    modelContentToText(result?.choices?.[0]?.message?.content) ||
    modelContentToText(result?.output) ||
    text(result?.output_text) ||
    text(result?.choices?.[0]?.text) || "";
}

function cleanQueries(value) {
  return (Array.isArray(value) ? value : [])
    .map(q => text(q).replace(/\s+/g," ").slice(0,180))
    .filter(Boolean)
    .slice(0,3);
}

function fallbackQueries(body, failurePayload) {
  const fromFailure = cleanQueries(failurePayload?.errorDetail?.queries);
  if (fromFailure.length) return fromFailure;

  const profile = body?.context?.profile || {};
  const name = text(profile.name) || "channel";
  const category = text(profile.category) || "news";
  return [
    `${category} latest news`,
    `${category} major announcement`,
    `${name} ${category} news`
  ];
}

async function collectSearchLinks(env, queries) {
  const found = [];
  const diagnostics = [];

  for (const query of queries) {
    const encoded = encodeURIComponent(query);
    const searchPages = [
      `https://www.bing.com/search?q=${encoded}`,
      `https://html.duckduckgo.com/html/?q=${encoded}`,
      `https://www.google.com/search?q=${encoded}`
    ];

    for (const searchUrl of searchPages) {
      if (found.length >= 16) break;
      try {
        const response = await env.BROWSER.quickAction("links", {
          url: searchUrl,
          visibleLinksOnly: true,
          gotoOptions: {waitUntil:"domcontentloaded", timeout:8000}
        });
        const parsed = await parseQuickAction(response);
        diagnostics.push({
          query,
          engine:new URL(searchUrl).hostname,
          status:parsed.status,
          success:parsed.success,
          resultCount:Array.isArray(parsed.result) ? parsed.result.length : 0
        });
        if (parsed.success && Array.isArray(parsed.result)) {
          found.push(...parsed.result);
        }
      } catch (err) {
        diagnostics.push({
          query,
          engine:new URL(searchUrl).hostname,
          success:false,
          error:String(err?.message || err).slice(0,180)
        });
      }
    }
    if (found.length >= 16) break;
  }

  return {urls:uniqueUrls(found).slice(0,12), diagnostics};
}

async function fetchEvidencePages(env, urls) {
  const evidence = [];
  const diagnostics = [];

  for (const url of urls.slice(0,8)) {
    if (evidence.length >= 4) break;
    try {
      const response = await env.BROWSER.quickAction("markdown", {
        url,
        gotoOptions:{waitUntil:"domcontentloaded", timeout:8000}
      });
      const parsed = await parseQuickAction(response);
      const markdown = text(parsed.result);

      diagnostics.push({
        url,
        status:parsed.status,
        success:parsed.success,
        chars:markdown.length
      });

      if (!parsed.success || markdown.length < 350) continue;

      evidence.push({
        url,
        domain:new URL(url).hostname,
        excerpt:markdown.replace(/\n{3,}/g,"\n\n").slice(0,7000)
      });
    } catch (err) {
      diagnostics.push({
        url,
        success:false,
        error:String(err?.message || err).slice(0,180)
      });
    }
  }

  return {evidence, diagnostics};
}

function cleanTopic(value, max=220) {
  return text(value)
    .replace(/\b(?:VERIFIED_FACTS|SOURCE_NOTES|KEY_POINTS|VISUAL_FACTS|RISK_NOTES|PUBLIC_HEADLINE)\s*:/gi," ")
    .replace(/\s+/g," ")
    .replace(/[<>{}\[\]]/g," ")
    .trim()
    .slice(0,max);
}

function extractTopic(value) {
  const m = String(value || "").match(/^\s*TOPIC\s*:\s*(.+)$/im);
  return m ? cleanTopic(m[1]) : "";
}

function containsInternalLeak(value) {
  const v = text(value).toLowerCase();
  if (!v) return false;
  return /\b(?:gm5|acc os x|acc core|mission terminal|context vault|publish core|ai router)\b|one[- ]button production|(?:research|caption|poster|script)\s+worker|internal workflow/.test(v);
}

async function browserResearchFallback(env, body, failurePayload) {
  if (!env.BROWSER || !env.AI) return null;

  const queries = fallbackQueries(body, failurePayload);
  const discovery = await collectSearchLinks(env, queries);

  if (discovery.urls.length < 2) return null;

  const verified = await fetchEvidencePages(env, discovery.urls);

  // Browser fallback must have readable evidence from at least two pages.
  // This keeps QC/source standards intact instead of passing URL-only discovery.
  if (verified.evidence.length < 2) return null;

  const allowedUrls = verified.evidence.map(x => x.url).slice(0,4);
  const evidenceBundle = verified.evidence.map((e,i) =>
    `VERIFIED PAGE ${i+1}\nURL: ${e.url}\nCONTENT:\n${e.excerpt}`
  ).join("\n\n---\n\n");

  const profile = body?.context?.profile || {};
  const publicContext = {
    name:profile.name || "",
    category:profile.category || "",
    platform:profile.platform || "",
    communication:profile.communication || "",
    mission:profile.mission || "",
    canon:profile.canon || ""
  };

  const result = await env.AI.run(TEXT_MODEL, {
    messages:[
      {
        role:"system",
        content:[
          "You are ACC OS X Research AI in strict browser-evidence fallback mode.",
          "Use ONLY the VERIFIED PAGE CONTENT supplied by the user.",
          "Choose ONE exact, current, publication-worthy public topic supported by at least two supplied pages.",
          "Do not invent facts, dates, numbers, names, quotes, events, implications, or URLs.",
          "Keep all facts on the same topic.",
          "Never expose ACC/GM5/workflow/debug wording as public content.",
          "Return plain text with these sections exactly:",
          "RESEARCH_PASS",
          "TOPIC:",
          "VERIFIED_FACTS:",
          "SOURCE_NOTES:",
          "ANGLE:",
          "KEY_POINTS:",
          "VISUAL_FACTS:",
          "RISK_NOTES:",
          "SOURCES:"
        ].join("\n")
      },
      {
        role:"user",
        content:[
          `PUBLIC CHANNEL CONTEXT:\n${JSON.stringify(publicContext)}`,
          `QUERY PLAN:\n${queries.join("\n")}`,
          `ALLOWED SOURCE URLS:\n${allowedUrls.join("\n")}`,
          `VERIFIED PAGE CONTENT:\n${evidenceBundle}`
        ].join("\n\n")
      }
    ],
    max_tokens:1800,
    temperature:0.1
  });

  let reply = extractModelText(result);
  if (!reply) return null;

  const topic = extractTopic(reply);
  const hasFacts = /\bVERIFIED_FACTS\s*:/i.test(reply);
  if (!topic || containsInternalLeak(topic) || !hasFacts) return null;

  // Deterministically bind source list to the pages actually rendered.
  const withoutSources = reply.replace(/\n\s*SOURCES?\s*:[\s\S]*$/i,"").trim();
  const boundSources = allowedUrls.map(u => `- ${u}`).join("\n");
  reply = `${withoutSources}\n\nSOURCES:\n${boundSources}`;

  if (!/^\s*RESEARCH_PASS\b/i.test(reply)) {
    reply = `RESEARCH_PASS\n${reply}`;
  }

  return json({
    ok:true,
    reply,
    model:TEXT_MODEL,
    provider:"ACC Browser Search Fallback + Cloudflare Workers AI",
    mode:"PRODUCTION_AI",
    research:{
      query:queries[0] || "",
      queries,
      topicMode:"DISCOVERY",
      discoveryModel:"BROWSER_QUICK_ACTIONS",
      transport:"BROWSER_SEARCH_FALLBACK",
      sourceCount:allowedUrls.length,
      sources:allowedUrls,
      browserVerifiedCount:verified.evidence.length,
      patchRevision:PATCH_REVISION
    }
  });
}

async function decorateHealth(request, env, ctx) {
  const upstream = await originalWorker.fetch(request, env, ctx);
  try {
    const data = await upstream.clone().json();
    if (data && typeof data === "object") {
      data.browserBinding = Boolean(env.BROWSER);
      data.researchTransport = "NATIVE_WEB_SEARCH_THEN_RSS_NEWS_THEN_BROWSER_SEARCH_FALLBACK";
      data.researchReliabilityPatch = PATCH_REVISION;
      const headers = new Headers(upstream.headers);
      return json(data, upstream.status, headers);
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
      return originalWorker.fetch(request, env, ctx);
    }

    let body = null;
    try {
      body = await request.clone().json();
    } catch {
      return originalWorker.fetch(request, env, ctx);
    }

    const upstream = await originalWorker.fetch(request, env, ctx);

    if (upstream.status !== 422) return upstream;

    let failurePayload = null;
    try {
      failurePayload = await upstream.clone().json();
    } catch {
      return upstream;
    }

    const failureCode = text(failurePayload?.errorDetail?.code);
    if (failureCode !== "RESEARCH_FAILED_NO_USABLE_SOURCES") {
      return upstream;
    }

    try {
      const fallback = await browserResearchFallback(env, body, failurePayload);
      return fallback || upstream;
    } catch {
      // Fail closed: keep the original Research failure rather than weakening grounding.
      return upstream;
    }
  }
};
