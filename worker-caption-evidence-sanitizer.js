// ACC OS X — BUILD 250 RC7.2 CAPTION EVIDENCE SANITIZER
// CAPTION-only outer gate. It bypasses the legacy caption wrapper chain for CAPTION,
// sanitizes Research/Material evidence, then calls the unchanged production worker.js.
// Non-CAPTION requests continue through worker-deploy-gate.js unchanged.

import baseWorker from "./worker-deploy-gate.js";
import productionWorker from "./worker.js";

const TEXT_MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const PATCH_REVISION = "BUILD250_RC7_2_CAPTION_EVIDENCE_SANITIZER";
const text = v => typeof v === "string" ? v.trim() : "";

function stageOf(body) {
  const s = String(body?.context?.workerTask?.stage || "").toUpperCase();
  if (s === "MATERIAL") return "SCRIPT";
  if (s === "PUBLISH") return "PUBLISHING";
  if (["RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"].includes(s)) return s;
  const joined = (Array.isArray(body?.messages) ? body.messages : []).map(m => text(m?.content)).join("\n");
  const m = joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  if (m) return String(m[1]).toUpperCase();
  return /Social Captioner/i.test(joined) ? "CAPTION" : "";
}

function visualInstruction(fragment) {
  const v = text(fragment);
  if (!v) return false;
  return (
    /\b(?:poster direction|visual direction|illustrative scene|visual representation|layout|logo placement|background artwork|artwork rendering|rendering|watermark|overlay|safe negative space|headline overlay)\b/i.test(v) ||
    /\b(?:this|the|our)\s+(?:poster|image|visual|graphic|diagram)\b/i.test(v) ||
    /\b(?:image|poster|visual|graphic|diagram)\b[^.!?\n]{0,140}\b(?:show|shows|showing|depict|depicts|depicting|orbit|scene|layout|render|rendered|illustrat|poster)\w*\b/i.test(v) ||
    /\b(?:show|shows|showing|depict|depicts|depicting)\w*\b[^.!?\n]{0,140}\b(?:diagram|image|visual|graphic|poster)\b/i.test(v)
  );
}

function stripVisualFacts(raw) {
  const lines = String(raw || "").split(/\r?\n/);
  const out = [];
  let skipping = false;
  const header = /^\s*(TOPIC|VERIFIED_FACTS|SOURCE_NOTES|ANGLE|KEY_POINTS|VISUAL_FACTS|RISK_NOTES|SOURCES)\s*:/i;
  for (const line of lines) {
    const m = line.match(header);
    if (m) {
      skipping = String(m[1]).toUpperCase() === "VISUAL_FACTS";
      if (skipping) continue;
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n");
}

function stripVisualSentences(raw) {
  const keptLines = [];
  for (const line of String(raw || "").split(/\r?\n/)) {
    if (!text(line)) { keptLines.push(""); continue; }
    const parts = line.match(/[^.!?]+[.!?]?/g) || [line];
    const kept = parts.map(text).filter(part => part && !visualInstruction(part));
    if (kept.length) keptLines.push(kept.join(" "));
  }
  return keptLines.join("\n").replace(/[ \t]{2,}/g," ").replace(/\n{3,}/g,"\n\n").trim();
}

function sanitizeEvidence(stage, output) {
  const s = String(stage || "").toUpperCase();
  let value = String(output || "");
  if (s === "RESEARCH") value = stripVisualFacts(value);
  if (["RESEARCH","SCRIPT","MATERIAL"].includes(s)) value = stripVisualSentences(value);
  return value;
}

function sanitizeBody(body) {
  const next = JSON.parse(JSON.stringify(body || {}));
  next.context = next.context || {};
  const rows = Array.isArray(next.context.upstreamAssets) ? next.context.upstreamAssets : [];
  next.context.upstreamAssets = rows
    .filter(row => String(row?.stage || "").toUpperCase() !== "POSTER")
    .map(row => ({...row, output:sanitizeEvidence(row?.stage, row?.output)}));
  next.context.captionEvidenceSanitizer = {active:true, revision:PATCH_REVISION};
  const guard = [
    "STAGE: CAPTION",
    "Return ONLY the final public-facing caption.",
    "Use verified public facts from the sanitized Research and Material context only.",
    "Ignore any internal production or visual-format wording that may remain.",
    "Do not describe how the post should look or narrate the generated asset.",
    "Do not output quotation marks, internal labels, markdown wrappers, placeholders or debug commentary.",
    "Preserve the profile language, tone, CTA, credits/tag rules, discussion prompt and hashtags.",
    "Do not add new factual claims."
  ].join("\n");
  next.messages = [{role:"system",content:guard}, ...(Array.isArray(next.messages)?next.messages:[])];
  return next;
}

function requestWithBody(request, body) {
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request.url,{method:request.method,headers,body:JSON.stringify(body)});
}

function normalizeCaption(value) {
  return stripVisualSentences(text(value)
    .replace(/^```[\w-]*\s*/i,"")
    .replace(/```\s*$/i,"")
    .replace(/^\s*(?:Caption Output|Generated Caption|Result|Final Caption|Caption)\s*:?\s*/i,"")
    .replace(/[“”\"]/g,"")
    .trim());
}

function problems(value) {
  const out = text(value);
  const p = [];
  if (!out) p.push("emptyCaption");
  if (/```/.test(out)) p.push("markdownFence");
  if (/^\s*(?:Caption Output|Generated Caption|Result|Final Caption|Caption)\s*:/i.test(out)) p.push("wrapperLabel");
  if (/\b(?:gm5|acc os x|acc core|mission terminal|context vault|publish core|ai router)\b|one[- ]button production|(?:research|caption|poster|script)\s+worker|internal workflow/i.test(out)) p.push("internalLeak");
  if (/\b(?:PUBLIC_HEADLINE|VERIFIED_FACTS|SOURCE_NOTES|KEY_POINTS|VISUAL_FACTS|RISK_NOTES|SOURCES|PRIMARY VISUAL BASIS)\s*:/i.test(out)) p.push("researchOrSystemLabel");
  if (/<[^>]{2,80}>|\[(?:INSERT|PLACEHOLDER|TBD|TODO|TEXT|HEADLINE|CAPTION)[^\]]*\]|\blorem ipsum\b/i.test(out)) p.push("placeholderOrPseudoText");
  if (visualInstruction(out)) p.push("productionVisualLeak");
  return [...new Set(p)];
}

function modelText(result) {
  const direct = text(result?.response) || text(result?.result?.response) || text(result?.output_text);
  if (direct) return direct;
  const c = result?.choices?.[0]?.message?.content;
  if (typeof c === "string") return c.trim();
  if (Array.isArray(c)) return c.map(x => typeof x === "string" ? x : text(x?.text)||text(x?.content)).filter(Boolean).join("\n").trim();
  return text(result?.choices?.[0]?.text);
}

function evidence(body) {
  const rows = Array.isArray(body?.context?.upstreamAssets) ? body.context.upstreamAssets : [];
  return rows.filter(row => ["RESEARCH","SCRIPT","MATERIAL"].includes(String(row?.stage||"").toUpperCase()))
    .map(row => `${String(row?.stage||"").toUpperCase()}:\n${sanitizeEvidence(row?.stage,row?.output).slice(0,6500)}`)
    .join("\n\n").slice(0,12000);
}

async function repair(env, body, draft, initial) {
  const source = evidence(body);
  if (!env?.AI || !source) return {caption:"",problems:initial};
  let previous = normalizeCaption(draft);
  let last = initial;
  for (let attempt=1; attempt<=2; attempt++) {
    const result = await env.AI.run(TEXT_MODEL,{
      messages:[
        {role:"system",content:[
          "Return ONLY a clean publish-ready public caption.",
          "Use only facts in EVIDENCE.",
          "Remove all defects in PROBLEMS and all internal production/visual-format wording.",
          "Do not output quotation marks, internal labels, markdown wrappers, placeholders or commentary.",
          "Preserve language, useful context, CTA/discussion question, credits/tags and hashtags.",
          "Do not add facts."
        ].join("\n")},
        {role:"user",content:`PROBLEMS:\n${last.join(", ")||"none"}\n\nDRAFT:\n${previous.slice(0,2200)}\n\nEVIDENCE:\n${source}`}
      ],max_tokens:1200,temperature:0
    });
    const candidate = normalizeCaption(modelText(result));
    const next = problems(candidate);
    if (candidate && next.length===0) return {caption:candidate,problems:[]};
    previous = candidate || previous;
    last = next.length ? next : last;
  }
  return {caption:"",problems:last};
}

function json(payload,status=200,headersLike=null) {
  const headers = new Headers(headersLike||{});
  headers.set("Content-Type","application/json;charset=UTF-8");
  headers.set("Cache-Control","no-store");
  return new Response(JSON.stringify(payload,null,2),{status,headers});
}

async function health(request,env,ctx) {
  const upstream = await baseWorker.fetch(request,env,ctx);
  try {
    const data = await upstream.clone().json();
    if (data && typeof data === "object") {
      data.captionEvidenceSanitizer = "ACTIVE";
      data.captionEvidenceSanitizerRevision = PATCH_REVISION;
      return json(data,upstream.status,upstream.headers);
    }
  } catch {}
  return upstream;
}

export default {
  async fetch(request,env,ctx) {
    const url = new URL(request.url);
    if (request.method==="GET" && (url.pathname==="/health" || url.pathname==="/api/acc-ai")) return health(request,env,ctx);
    if (!(request.method==="POST" && url.pathname==="/api/acc-ai")) return baseWorker.fetch(request,env,ctx);

    let body;
    try { body = await request.clone().json(); } catch { return baseWorker.fetch(request,env,ctx); }
    if (stageOf(body)!=="CAPTION") return baseWorker.fetch(request,env,ctx);

    const cleanBody = sanitizeBody(body);
    const upstream = await productionWorker.fetch(requestWithBody(request,cleanBody),env,ctx);
    if (!upstream.ok) return upstream;

    let payload;
    try { payload = await upstream.clone().json(); } catch { return upstream; }
    const raw = text(payload?.reply);
    if (!payload || payload?.ok===false || !raw) return upstream;

    const cleaned = normalizeCaption(raw);
    const initial = problems(cleaned);
    if (cleaned && initial.length===0) {
      return json({...payload,reply:cleaned,provider:`${text(payload.provider)||"ACC OS X"} + Caption Evidence Sanitizer`,captionEvidenceSanitizer:{revision:PATCH_REVISION,repaired:false}},upstream.status,upstream.headers);
    }

    let fixed = {caption:"",problems:initial};
    try { fixed = await repair(env,cleanBody,cleaned||raw,initial); } catch {}
    if (!fixed.caption) {
      const finalProblems = fixed.problems?.length ? fixed.problems : initial;
      return json({ok:false,stage:"CAPTION",status:"CAPTION_EVIDENCE_SANITIZER_FAILED",error:`Caption blocked: ${finalProblems.join(", ")||"unknown integrity defect"}.`,errorDetail:{code:"CAPTION_EVIDENCE_SANITIZER_FAILED",problems:finalProblems,revision:PATCH_REVISION}},422,upstream.headers);
    }

    return json({...payload,reply:fixed.caption,provider:`${text(payload.provider)||"ACC OS X"} + Caption Evidence Sanitizer`,captionEvidenceSanitizer:{revision:PATCH_REVISION,repaired:true,initialProblems:initial}},upstream.status,upstream.headers);
  }
};
