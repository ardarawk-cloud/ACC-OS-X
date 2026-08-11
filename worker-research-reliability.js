// ACC OS X — BUILD 250 RESEARCH RELIABILITY PATCH
// Scope: Research fallback only. Original worker.js remains the primary engine.
// Real Meta publishing connector is NOT imported, edited, or replaced.

import originalWorker from "./worker.js";

const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const PATCH_REVISION = "BUILD250_RC1_END_TO_END_CONTEXT_FIX";

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


function isQcBody(body) {
  const joined = (Array.isArray(body?.messages) ? body.messages : [])
    .map(m => text(m?.content))
    .join("\n");
  return /(?:^|\n)STAGE:\s*QC\b/i.test(joined) || /Editorial QC Auditor/i.test(joined);
}


function detectBodyStage(body) {
  const joined = (Array.isArray(body?.messages) ? body.messages : [])
    .map(m => text(m?.content))
    .join("\n");
  const m = joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  return m ? String(m[1] || "").toUpperCase() : "";
}

function findStageAssetOutput(body, stage) {
  const rows = Array.isArray(body?.context?.upstreamAssets)
    ? body.context.upstreamAssets
    : [];
  const item = rows.find(x =>
    String(x?.stage || "").toUpperCase() === String(stage || "").toUpperCase() &&
    text(x?.output)
  );
  return text(item?.output);
}

function stripCaptionShell(value) {
  return text(value)
    .replace(/^```[\w-]*\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^\s*(?:Caption Output|Generated Caption|Result|Final Caption|Caption)\s*:?\s*/i, "")
    .trim();
}

function unsupportedQuotedFragments(caption, evidence) {
  const corpus = String(evidence || "").toLowerCase().replace(/\s+/g, " ");
  const out = [];
  // IMPORTANT: only paired DOUBLE quotes count as attributed quote-like text.
  // Apostrophes in normal words/contractions (e.g. NVIDIA's, it's) must not
  // create a false unsupportedQuotedText failure.
  const patterns = [
    /"([^"]{8,160})"/g,
    /“([^”]{8,160})”/g
  ];
  for (const re of patterns) {
    for (const match of String(caption || "").matchAll(re)) {
      const fragment = text(match[1]).toLowerCase().replace(/\s+/g, " ");
      if (fragment && !corpus.includes(fragment)) out.push(fragment);
    }
  }
  return [...new Set(out)];
}

function hardCaptionProblems(problems) {
  const hard = new Set([
    "emptyCaption",
    "markdownFence",
    "wrapperLabel",
    "internalLeak",
    "researchOrSystemLabel",
    "placeholderOrPseudoText",
    "unsupportedQuotedText"
  ]);
  return (Array.isArray(problems) ? problems : []).filter(p => hard.has(p));
}

function captionIntegrityProblems(caption, body, evidence) {
  const out = stripCaptionShell(caption);
  const profile = body?.context?.profile || {};
  const name = text(profile.name).toLowerCase();
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
  if (unsupportedQuotedFragments(out, evidence).length) problems.push("unsupportedQuotedText");

  if (out.length > 1900) problems.push("captionTooLong");

  if (name === "techverse") {
    if (out.length < 420) problems.push("techverseTooShort");
    if (out.length > 1500) problems.push("techverseTooLong");
    if (!/\?/.test(out)) problems.push("discussionPromptMissing");
    const hashtags = out.match(/#[\p{L}\p{N}_]+/gu) || [];
    if (hashtags.length < 2) problems.push("hashtagsMissing");
  }

  return [...new Set(problems)];
}

async function repairCaptionIntegrity(env, body, upstream) {
  if (!env.AI) return null;

  let payload = null;
  try {
    payload = await upstream.clone().json();
  } catch {
    return null;
  }

  if (!payload || payload?.ok === false || !text(payload?.reply)) return null;

  const draft = stripCaptionShell(payload.reply);
  const profile = body?.context?.profile || {};
  const research = findStageAssetOutput(body, "RESEARCH").slice(0,7000);
  const material = (findStageAssetOutput(body, "MATERIAL") || findStageAssetOutput(body, "SCRIPT")).slice(0,7000);
  const evidence = `${research}\n\n${material}`.trim();

  if (!evidence) return null;

  let previous = draft;
  let lastProblems = captionIntegrityProblems(previous, body, evidence);
  let lastHardProblems = hardCaptionProblems(lastProblems);

  // Do NOT rewrite a caption that already has no concrete integrity defect.
  // The original stage worker remains authoritative; HARD QC keeps the final say.
  if (draft && lastHardProblems.length === 0) {
    const next = {
      ...payload,
      reply: draft,
      provider: `${text(payload.provider) || "ACC OS X"} + ACC Caption Integrity Guard (PASS-THROUGH)`,
      captionIntegrityGuard: {
        applied: false,
        revision: PATCH_REVISION,
        attempts: 0,
        length: draft.length,
        softWarnings: lastProblems
      }
    };
    const headers = new Headers(upstream.headers);
    return json(next, upstream.status, headers);
  }

  // Repair only concrete defects (internal leaks, wrappers, placeholders,
  // unsupported quoted text, etc.). Quality preferences stay with HARD QC.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const result = await env.AI.run(TEXT_MODEL, {
      messages: [
        {
          role: "system",
          content: [
            "You are ACC OS X Caption Integrity Guard.",
            "Rewrite the draft into ONLY the final public caption.",
            "SOURCE OF TRUTH: use ONLY facts already present in RESEARCH EVIDENCE and MATERIAL EVIDENCE.",
            "Do not add a new fact, statistic, name, organization, location, consequence, prediction, opinion, quote, slogan, campaign line, headline, or pseudo-text.",
            "Do not use quotation marks in the public caption. Paraphrase instead. Only an exact verified quote from the supplied evidence may be quoted, but prefer no quotes.",
            "Remove invented quotation-style slogans, faux campaign names, fake headlines, placeholders, labels, and internal/system terminology.",
            "Write natural public-facing prose. Never output system labels such as Caption, Result, Sources, VERIFIED_FACTS or internal/debug labels. Public editorial structure such as concise takeaways is allowed when the Channel Passport requires it.",
            "Preserve the Channel Passport language, tone, credits/tag requirements, platform style, productionFormat, and communication rules exactly.",
            "Preserve evidence strength: concerns/opinions remain attributed concerns/opinions.",
            "End with one natural audience discussion question when appropriate.",
            "Keep hashtags concise and relevant; do not invent branded campaign hashtags.",
            "For TechVerse specifically: professional journalistic + educational Facebook tone, clear why-it-matters context, compact paragraphs, one discussion question, and 3-6 relevant hashtags. Aim roughly 650-1400 characters.",
            "Return the corrected caption only. No explanation, no markdown fences."
          ].join("\n")
        },
        {
          role: "user",
          content: [
            `CHANNEL PROFILE:\n${JSON.stringify({
              name: profile.name || "",
              category: profile.category || "",
              platform: profile.platform || "",
              productionFormat: profile.productionFormat || "",
              communication: profile.communication || "",
              mission: profile.mission || "",
              canon: profile.canon || ""
            })}`,
            `RESEARCH EVIDENCE:\n${research}`,
            `MATERIAL EVIDENCE:\n${material}`,
            `DRAFT TO REPAIR:\n${previous}`,
            `KNOWN PROBLEMS:\n${lastProblems.join(", ") || "semantic integrity / pseudo-text risk"}`
          ].join("\n\n")
        }
      ],
      max_tokens: 1200,
      temperature: attempt === 1 ? 0.08 : 0
    });

    const candidate = stripCaptionShell(extractModelText(result));
    const problems = captionIntegrityProblems(candidate, body, evidence);
    const hardProblems = hardCaptionProblems(problems);

    // Integrity Guard only hard-blocks concrete integrity defects.
    // Length / CTA / hashtag preferences are quality signals and remain the
    // responsibility of the existing HARD QC gate.
    if (candidate && hardProblems.length === 0) {
      const next = {
        ...payload,
        reply: candidate,
        provider: `${text(payload.provider) || "ACC OS X"} + ACC Caption Integrity Guard`,
        captionIntegrityGuard: {
          applied: true,
          revision: PATCH_REVISION,
          attempts: attempt,
          length: candidate.length,
          softWarnings: problems
        }
      };
      const headers = new Headers(upstream.headers);
      return json(next, upstream.status, headers);
    }

    previous = candidate || previous;
    lastProblems = problems;
  }

  return json({
    ok: false,
    stage: "CAPTION",
    status: "CAPTION_INTEGRITY_FAILED",
    error: "Caption Integrity Guard found a concrete integrity defect after automatic repair.",
    errorDetail: {
      code: "CAPTION_INTEGRITY_FAILED",
      problems: lastProblems,
      hardProblems: hardCaptionProblems(lastProblems),
      revision: PATCH_REVISION
    }
  }, 422);
}

function normalizeUrlKey(raw) {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}${u.search}`.replace(/\/$/,"");
  } catch {
    return "";
  }
}

function findResearchAsset(body) {
  const rows = Array.isArray(body?.context?.upstreamAssets)
    ? body.context.upstreamAssets
    : [];
  const index = rows.findIndex(item =>
    String(item?.stage || "").toUpperCase() === "RESEARCH" &&
    text(item?.output)
  );
  return index >= 0 ? {rows,index,asset:rows[index]} : null;
}

async function repairQcResearchContext(env, body) {
  const found = findResearchAsset(body);
  if (!found || !env.BROWSER || !env.AI) return body;

  const raw = text(found.asset.output);
  const currentUrls = uniqueUrls(urlsInText(raw));
  if (currentUrls.length >= 2) return body;

  const topic = extractTopic(raw);
  if (!topic || containsInternalLeak(topic)) return body;

  const profile = body?.context?.profile || {};
  const category = text(profile.category);
  const queries = [
    `"${topic}"`,
    `${topic}${category ? ` ${category}` : ""}`,
    `${topic} official announcement news`
  ];

  const discovery = await collectSearchLinks(env, queries);
  const candidates = uniqueUrls([...currentUrls, ...discovery.urls]).slice(0,10);
  if (candidates.length < 2) return body;

  const verified = await fetchEvidencePages(env, candidates);
  if (verified.evidence.length < 2) return body;

  const allowed = verified.evidence.map(x => x.url).slice(0,6);
  const evidenceBundle = verified.evidence.map((e,i) =>
    `PAGE ${i+1}\nURL: ${e.url}\nCONTENT:\n${e.excerpt}`
  ).join("\n\n---\n\n");

  const validator = await env.AI.run(TEXT_MODEL, {
    messages:[
      {
        role:"system",
        content:[
          "You validate research sources for an existing ACC OS X research packet.",
          "Do NOT rewrite the topic or facts.",
          "Select ONLY URLs whose rendered page directly supports the existing TOPIC and at least one claim in VERIFIED_FACTS.",
          "Never select a page merely because keywords are similar.",
          "Return exactly:",
          "SUPPORTED_URLS:",
          "- <exact allowed URL>",
          "- <exact allowed URL>",
          "Return INSUFFICIENT if fewer than two pages genuinely support the packet."
        ].join("\n")
      },
      {
        role:"user",
        content:[
          `EXISTING RESEARCH PACKET:\n${raw}`,
          `ALLOWED URLS:\n${allowed.join("\n")}`,
          `RENDERED PAGES:\n${evidenceBundle}`
        ].join("\n\n")
      }
    ],
    max_tokens:500,
    temperature:0
  });

  const validatorText = extractModelText(validator);
  if (!validatorText || /^\s*INSUFFICIENT\b/i.test(validatorText)) return body;

  const allowedMap = new Map(allowed.map(u => [normalizeUrlKey(u), u]));
  const selected = [];
  for (const u of urlsInText(validatorText)) {
    const exact = allowedMap.get(normalizeUrlKey(u));
    if (exact && !selected.includes(exact)) selected.push(exact);
  }
  if (selected.length < 2) return body;

  const cloned = JSON.parse(JSON.stringify(body));
  const target = cloned.context.upstreamAssets[found.index];
  const withoutSources = text(target.output)
    .replace(/\n\s*SOURCES?\s*:[\s\S]*$/i,"")
    .trim();

  // This server-side repair exists because the mobile client currently sends
  // a truncated Research asset into QC. We restore only source URLs that were
  // re-rendered and semantically validated against the same existing packet.
  target.output = `${withoutSources}\n\nSOURCES:\n${selected.slice(0,4).map(u => `- ${u}`).join("\n")}`;
  cloned.context.researchContextRepair = {
    applied:true,
    revision:PATCH_REVISION,
    sourceCount:selected.length
  };
  return cloned;
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
      data.researchTransport = "NATIVE_WEB_SEARCH_THEN_RSS_NEWS_THEN_BROWSER_SEARCH_FALLBACK_PLUS_QC_CONTEXT_GUARD";
      data.captionIntegrityGuard = "ACTIVE";
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

    let effectiveBody = body;

    // QC CONTEXT GUARD:
    // The client currently trims upstream asset text before QC. If that trim
    // leaves fewer than two Research URLs, restore only browser-rendered,
    // AI-validated URLs for the exact same Research packet.
    if (isQcBody(body)) {
      try {
        effectiveBody = await repairQcResearchContext(env, body);
      } catch {
        effectiveBody = body;
      }
    }

    let upstreamRequest = request;
    if (effectiveBody !== body) {
      const headers = new Headers(request.headers);
      headers.set("Content-Type","application/json");
      upstreamRequest = new Request(request.url, {
        method:"POST",
        headers,
        body:JSON.stringify(effectiveBody)
      });
    }

    const upstream = await originalWorker.fetch(upstreamRequest, env, ctx);

    if (detectBodyStage(body) === "CAPTION" && upstream.ok) {
      try {
        const guardedCaption = await repairCaptionIntegrity(env, body, upstream);
        if (guardedCaption) return guardedCaption;
      } catch {
        // Fail closed only if a bad caption is detected by the guard path.
        // Otherwise preserve the original worker response.
      }
    }

    if (upstream.status !== 422) return upstream;

    let failurePayload = null;
    try {
      failurePayload = await upstream.clone().json();
    } catch {
      return upstream;
    }

    const failureCode = text(failurePayload?.errorDetail?.code);
    if (
      failureCode !== "RESEARCH_FAILED_NO_USABLE_SOURCES" &&
      failureCode !== "RESEARCH_FAILED_GROUNDING_CONTRACT"
    ) {
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
