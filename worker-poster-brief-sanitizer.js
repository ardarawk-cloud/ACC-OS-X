// ACC OS X — BUILD 250 RC8 POSTER BRIEF SANITIZER
// POSTER-only response normalizer. Removes chart/graph/diagram wording from an
// already-converted illustrative poster brief so semantic QC cannot misread
// negative instructions as an affirmative request for unsupported data visuals.
// Meta publishing, tokens, Page IDs, worker.js and publish payload/path are untouched.

import baseWorker from "./worker-stage-normalizer.js";

const PATCH_REVISION = "BUILD250_RC8_POSTER_BRIEF_SANITIZER";
const text = v => typeof v === "string" ? v.trim() : "";

function stageOf(body){
  const s=String(body?.context?.workerTask?.stage||"").toUpperCase();
  if(s==="MATERIAL")return "SCRIPT";
  if(s==="PUBLISH")return "PUBLISHING";
  if(["RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"].includes(s))return s;
  const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");
  const m=joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  return m?String(m[1]).toUpperCase():"";
}

function extractLine(raw,label){
  const re=new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`,`im`);
  const m=String(raw||"").match(re);
  return m?text(m[1]):"";
}

function needsSanitize(raw){
  return /\b(?:diagram|chart|graph|dashboard|infographic|network map|flowchart|table|timeline)\b/i.test(String(raw||""));
}

function cleanBrief(raw){
  const topic=extractLine(raw,"PUBLIC TOPIC") || "the verified public topic";
  let basis=extractLine(raw,"PRIMARY VISUAL BASIS");
  if(!basis || needsSanitize(basis)){
    basis=`Illustrative editorial scene representing exactly: ${topic}. Show only people, objects, places, or actions directly supported by this public topic.`;
  }
  return [
    `PUBLIC TOPIC: ${topic}`,
    `PRIMARY VISUAL BASIS: ${basis}`,
    "Create one clean editorial artwork/background for this exact public topic and nothing adjacent.",
    "Use a single topic-faithful illustrative scene with strong subject clarity.",
    "Represent only people, objects, institutions, locations, or actions supported by PRIMARY VISUAL BASIS or directly implied by PUBLIC TOPIC.",
    "Do not invent numbers, dashboards, UI panels, unrelated devices, unrelated industries, or unsupported factual visual claims.",
    "No headline, logo, watermark, signage, UI text, letters, pseudo-text, or ACC/internal terminology inside the AI artwork.",
    "Keep safe negative space for deterministic headline/logo overlays."
  ].join("\n");
}

function json(payload,status=200,headersLike=null){
  const headers=new Headers(headersLike||{});
  headers.set("Content-Type","application/json;charset=UTF-8");
  headers.set("Cache-Control","no-store");
  return new Response(JSON.stringify(payload,null,2),{status,headers});
}

async function health(request,env,ctx){
  const upstream=await baseWorker.fetch(request,env,ctx);
  try{
    const data=await upstream.clone().json();
    if(data&&typeof data==="object"){
      data.posterBriefSanitizer="ACTIVE";
      data.posterBriefSanitizerRevision=PATCH_REVISION;
      return json(data,upstream.status,upstream.headers);
    }
  }catch{}
  return upstream;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);

    let body;
    try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
    if(stageOf(body)!=="POSTER")return baseWorker.fetch(request,env,ctx);

    const upstream=await baseWorker.fetch(request,env,ctx);
    if(!upstream.ok)return upstream;

    let payload;
    try{payload=await upstream.clone().json();}catch{return upstream;}
    const raw=text(payload?.reply);
    if(!payload||payload?.ok===false||!raw)return upstream;

    const reply=needsSanitize(raw)?cleanBrief(raw):raw;
    return json({
      ...payload,
      reply,
      provider:`${text(payload.provider)||"ACC OS X"} + Poster Brief Sanitizer`,
      posterBriefSanitizer:{revision:PATCH_REVISION,sanitized:reply!==raw}
    },upstream.status,upstream.headers);
  }
};
