// ACC OS X — BUILD 250 RC8.1 CAPTION LABEL RECOVERY
// CAPTION-only fallback. Existing RC7.2 remains primary. This recovery runs only when
// RC7.2 fails solely because a research/system label survived AI repair.
// Meta publishing, tokens, Page IDs, worker.js and publish payload/path are untouched.

import captionWorker from "./worker-caption-evidence-sanitizer.js";
import productionWorker from "./worker.js";

const PATCH_REVISION = "BUILD250_RC8_1_CAPTION_LABEL_RECOVERY";
const text = v => typeof v === "string" ? v.trim() : "";
const LABEL_RE = /^\s*(?:[-*#]+\s*)?(?:PUBLIC_HEADLINE|VERIFIED_FACTS|SOURCE_NOTES|KEY_POINTS|VISUAL_FACTS|RISK_NOTES|SOURCES|PRIMARY VISUAL BASIS)\s*:/i;

function stageOf(body){
  const s=String(body?.context?.workerTask?.stage||"").toUpperCase();
  if(s==="MATERIAL")return "SCRIPT";
  if(s==="PUBLISH")return "PUBLISHING";
  if(["RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"].includes(s))return s;
  const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");
  const m=joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  if(m)return String(m[1]).toUpperCase();
  return /Social Captioner/i.test(joined)?"CAPTION":"";
}

function requestWithBody(request,body){
  const headers=new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request.url,{method:request.method,headers,body:JSON.stringify(body)});
}

function sanitizeBody(body){
  const next=JSON.parse(JSON.stringify(body||{}));
  next.context=next.context||{};
  const rows=Array.isArray(next.context.upstreamAssets)?next.context.upstreamAssets:[];
  next.context.upstreamAssets=rows.filter(row=>String(row?.stage||"").toUpperCase()!=="POSTER");
  next.context.captionLabelRecovery={active:true,revision:PATCH_REVISION};
  next.messages=[{
    role:"system",
    content:[
      "STAGE: CAPTION",
      "Return ONLY the final public-facing publish-ready caption.",
      "Never output research/system section labels such as PUBLIC_HEADLINE, VERIFIED_FACTS, SOURCE_NOTES, KEY_POINTS, VISUAL_FACTS, RISK_NOTES, SOURCES, or PRIMARY VISUAL BASIS.",
      "Do not describe poster/image/diagram/layout/visual production instructions.",
      "Do not output markdown wrappers, placeholders, debug commentary, or internal ACC terminology.",
      "Use only verified public facts from the supplied Research and Material context.",
      "Preserve the channel language, useful context, CTA/discussion prompt, credits/tags and hashtags.",
      "Do not add factual claims."
    ].join("\n")
  },...(Array.isArray(next.messages)?next.messages:[])];
  return next;
}

function stripSystemLabelLines(raw){
  return String(raw||"")
    .split(/\r?\n/)
    .filter(line=>!LABEL_RE.test(line))
    .join("\n")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}

function normalize(value){
  return stripSystemLabelLines(text(value)
    .replace(/^```[\w-]*\s*/i,"")
    .replace(/```\s*$/i,"")
    .replace(/^\s*(?:Caption Output|Generated Caption|Result|Final Caption|Caption)\s*:?\s*/i,"")
    .replace(/[“”\"]/g,"")
    .trim());
}

function visualLeak(v){
  const out=text(v);
  return /\b(?:poster direction|visual direction|illustrative scene|visual representation|layout|logo placement|background artwork|artwork rendering|rendering|watermark|overlay|safe negative space|headline overlay)\b/i.test(out) ||
    /\b(?:this|the|our)\s+(?:poster|image|visual|graphic|diagram)\b/i.test(out) ||
    /\b(?:image|poster|visual|graphic|diagram)\b[^.!?\n]{0,140}\b(?:show|shows|showing|depict|depicts|depicting|scene|layout|render|rendered|illustrat|poster)\w*\b/i.test(out);
}

function problems(value){
  const out=text(value);
  const p=[];
  if(!out)p.push("emptyCaption");
  if(/```/.test(out))p.push("markdownFence");
  if(LABEL_RE.test(out)||/^.*\b(?:PUBLIC_HEADLINE|VERIFIED_FACTS|SOURCE_NOTES|KEY_POINTS|VISUAL_FACTS|RISK_NOTES|SOURCES|PRIMARY VISUAL BASIS)\s*:/im.test(out))p.push("researchOrSystemLabel");
  if(/\b(?:gm5|acc os x|acc core|mission terminal|context vault|publish core|ai router)\b|one[- ]button production|(?:research|caption|poster|script)\s+worker|internal workflow/i.test(out))p.push("internalLeak");
  if(/<[^>]{2,80}>|\[(?:INSERT|PLACEHOLDER|TBD|TODO|TEXT|HEADLINE|CAPTION)[^\]]*\]|\blorem ipsum\b/i.test(out))p.push("placeholderOrPseudoText");
  if(visualLeak(out))p.push("productionVisualLeak");
  return [...new Set(p)];
}

function onlyLabelFailure(payload){
  const list=Array.isArray(payload?.errorDetail?.problems)?payload.errorDetail.problems:[];
  return payload?.status==="CAPTION_EVIDENCE_SANITIZER_FAILED" && list.length===1 && list[0]==="researchOrSystemLabel";
}

function json(payload,status=200,headersLike=null){
  const headers=new Headers(headersLike||{});
  headers.set("Content-Type","application/json;charset=UTF-8");
  headers.set("Cache-Control","no-store");
  return new Response(JSON.stringify(payload,null,2),{status,headers});
}

async function recover(request,env,ctx,body,sourceResponse){
  const cleanBody=sanitizeBody(body);
  const regenerated=await productionWorker.fetch(requestWithBody(request,cleanBody),env,ctx);
  if(!regenerated.ok)return sourceResponse;
  let payload;
  try{payload=await regenerated.clone().json();}catch{return sourceResponse;}
  const candidate=normalize(payload?.reply);
  const defects=problems(candidate);
  if(!candidate||defects.length)return sourceResponse;
  return json({
    ...payload,
    reply:candidate,
    provider:`${text(payload?.provider)||"ACC OS X"} + Caption Label Recovery`,
    captionLabelRecovery:{revision:PATCH_REVISION,recovered:true,trigger:"researchOrSystemLabel"}
  },regenerated.status,regenerated.headers);
}

async function health(request,env,ctx){
  const upstream=await captionWorker.fetch(request,env,ctx);
  try{
    const data=await upstream.clone().json();
    if(data&&typeof data==="object"){
      data.captionLabelRecovery="ACTIVE";
      data.captionLabelRecoveryRevision=PATCH_REVISION;
      return json(data,upstream.status,upstream.headers);
    }
  }catch{}
  return upstream;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return captionWorker.fetch(request,env,ctx);

    let body;
    try{body=await request.clone().json();}catch{return captionWorker.fetch(request,env,ctx);}
    if(stageOf(body)!=="CAPTION")return captionWorker.fetch(request,env,ctx);

    const first=await captionWorker.fetch(request.clone(),env,ctx);
    if(first.ok)return first;
    let failure;
    try{failure=await first.clone().json();}catch{return first;}
    if(!onlyLabelFailure(failure))return first;

    try{return await recover(request,env,ctx,body,first);}catch{return first;}
  }
};
