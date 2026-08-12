// ACC OS X — BUILD 254.1 KAI BRAIN DIRECT QWEN
// Qwen3 Master Director runs directly after the stable core worker.
// GLM is an independent critic when available, never a prerequisite for generation.
// Publishing, Meta routing, tokens and caption path are untouched.

import baseWorker from "./worker-stage-normalizer.js";

const REVISION = "BUILD254_1_KAI_BRAIN_DIRECT_QWEN";
const DIRECTOR_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const CRITIC_MODEL = "@cf/zai-org/glm-4.7-flash";
const MIN_EDITORIAL = 8.5;
const MIN_CREATIVE = 8.5;
const MIN_ART = 8.5;
const text = v => typeof v === "string" ? v.trim() : "";

function json(payload,status=200,headersLike=null){
  const headers=new Headers(headersLike||{});
  headers.set("Content-Type","application/json;charset=UTF-8");
  headers.set("Cache-Control","no-store");
  headers.set("Access-Control-Allow-Origin","*");
  return new Response(JSON.stringify(payload,null,2),{status,headers});
}

function stageOf(body){
  const s=String(body?.context?.workerTask?.stage||"").toUpperCase();
  if(s==="MATERIAL")return "SCRIPT";
  if(s==="PUBLISH")return "PUBLISHING";
  if(["RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"].includes(s))return s;
  const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");
  const m=joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  if(m)return String(m[1]).toUpperCase();
  if(/Material Creator|Scriptwriter AI/i.test(joined))return "SCRIPT";
  if(/Poster Creator/i.test(joined))return "POSTER";
  return "";
}

function modelText(result){
  const candidates=[
    result?.response,result?.result?.response,result?.text,result?.result?.text,
    result?.choices?.[0]?.message?.content,result?.result?.choices?.[0]?.message?.content,
    result?.output_text,result?.result?.output_text
  ];
  for(const v of candidates){
    if(!text(v))continue;
    return text(v).replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/^```(?:text)?\s*|\s*```$/gi,"").trim();
  }
  if(typeof result==="string")return text(result).replace(/<think>[\s\S]*?<\/think>/gi,"").trim();
  return "";
}

async function runOnce(env,model,system,user,max_tokens,temperature){
  if(!env?.AI)throw new Error("AI binding unavailable");
  const result=await env.AI.run(model,{messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens,temperature});
  const out=modelText(result);
  if(!out)throw new Error(`${model} returned empty output`);
  return out;
}

async function runResilient(env,primary,fallback,system,user,max_tokens=1800,temperature=.5){
  let lastError=null;
  for(let attempt=0;attempt<2;attempt++){
    try{return await runOnce(env,primary,system,user,max_tokens,temperature);}catch(error){lastError=error;}
  }
  if(fallback&&fallback!==primary){
    for(let attempt=0;attempt<2;attempt++){
      try{return await runOnce(env,fallback,system,user,max_tokens,temperature);}catch(error){lastError=error;}
    }
  }
  throw lastError||new Error("AI model returned no usable output");
}

function contextPacket(body){
  const context=body?.context||{};
  const p=context?.profile||{};
  const rows=Array.isArray(context?.upstreamAssets)?context.upstreamAssets:[];
  const latest=stage=>rows.find(x=>String(x?.stage||"").toUpperCase()===stage&&text(x?.output));
  return {
    profile:{id:p.id||"",name:p.name||"",category:p.category||"",platform:p.platform||"",mission:p.mission||"",canon:p.canon||""},
    research:text(latest("RESEARCH")?.output).slice(0,12000),
    script:text(latest("SCRIPT")?.output).slice(0,7000),
    contexts:(Array.isArray(context?.contexts)?context.contexts:[]).slice(0,6).map(x=>({title:x?.title||"",content:text(x?.content).slice(0,1800)}))
  };
}

function score(raw,label){
  const m=String(raw||"").match(new RegExp(`${label}\\s*:\\s*(10(?:\\.0+)?|[0-9](?:\\.[0-9]+)?)`,`i`));
  return m?Math.max(0,Math.min(10,Number(m[1]))):0;
}
function issues(raw){const m=String(raw||"").match(/ISSUES\s*:\s*([\s\S]*)/i);return text(m?.[1]).slice(0,1400);}
function validScript(raw){const v=text(raw);return v.length>=240&&/\bPUBLIC_HEADLINE\s*:/i.test(v)&&!/^\s*(?:FAIL|ERROR)\b/i.test(v);}
function validPoster(raw){
  const v=text(raw);
  const required=["PUBLIC TOPIC","PRIMARY VISUAL BASIS","CREATIVE CONCEPT","HERO SUBJECT","COMPOSITION","CAMERA LANGUAGE","LIGHTING","COLOR DIRECTION","ATMOSPHERE","NEGATIVE SPACE","EDITORIAL ENERGY","QUALITY TARGET"];
  return v.length>=480&&required.every(k=>new RegExp(`^\\s*${k}\\s*:`,`im`).test(v))&&!/\b(?:chart|graph|diagram|dashboard|flowchart|table|timeline)\b/i.test(v);
}

async function masterScript(env,packet,baseReply,note=""){
  const system=[
    "You are KAI Master Editorial Director for ACC Studio Content.",
    "Operate at senior newsroom and premium digital-media level.",
    "Research is authoritative. Never invent facts, dates, numbers, quotes, causes, consequences or forecasts.",
    "Improve angle, narrative hierarchy, hook, specificity, usefulness, rhythm and channel identity.",
    "Reject generic AI prose, repetition, empty significance statements and padded conclusions.",
    "The final copy must feel intentionally edited by a skilled human editor.",
    "Return plain public-facing text only and include exactly one PUBLIC_HEADLINE: line."
  ].join("\n");
  const user=[
    `CHANNEL:\n${JSON.stringify(packet.profile)}`,
    `AUTHORITATIVE RESEARCH:\n${packet.research}`,
    `CORE MATERIAL:\n${baseReply}`,
    packet.contexts.length?`CHANNEL CONTEXT:\n${JSON.stringify(packet.contexts)}`:"",
    note,
    "Produce the strongest evidence-faithful final material."
  ].filter(Boolean).join("\n\n");
  return runResilient(env,DIRECTOR_MODEL,CRITIC_MODEL,system,user,2400,.58);
}

async function criticScript(env,packet,candidate){
  const system=[
    "You are an independent senior editorial board critic. Be difficult to impress.",
    "Score 0-10 on accuracy discipline, editorial intelligence, originality, hook, clarity, usefulness and channel fit.",
    "Generic polished prose cannot exceed 7.9. Unsupported implications cannot exceed 5.9.",
    "Return exactly EDITORIAL_SCORE: <number> then ISSUES: <actionable critique>."
  ].join("\n");
  return runResilient(env,CRITIC_MODEL,DIRECTOR_MODEL,system,`RESEARCH:\n${packet.research}\n\nFINAL CANDIDATE:\n${candidate}`,850,.1);
}

async function masterPoster(env,packet,baseReply,note=""){
  const system=[
    "You are KAI Master Art Director for a premium technology/media studio.",
    "Create one distinctive, image-generatable editorial hero concept for the exact public topic.",
    "The image itself contains no typography; deterministic Studio Renderer adds all text and branding.",
    "Use one unmistakable visual idea with narrative meaning, dominant hero subject, cinematic depth, intentional camera, premium lighting, disciplined color and clean negative space.",
    "Avoid generic AI futurism, stock illustration, decorative cityscapes, floating icons, random devices, fake interfaces and visual clutter.",
    "All factual visual claims must be supported by research. Metaphors must remain clearly illustrative.",
    "Never use the words chart, graph, diagram, dashboard, flowchart, table or timeline.",
    "Return exactly these labels: PUBLIC TOPIC, PRIMARY VISUAL BASIS, CREATIVE CONCEPT, HERO SUBJECT, COMPOSITION, CAMERA LANGUAGE, LIGHTING, COLOR DIRECTION, ATMOSPHERE, NEGATIVE SPACE, EDITORIAL ENERGY, QUALITY TARGET."
  ].join("\n");
  const user=[
    `CHANNEL:\n${JSON.stringify(packet.profile)}`,
    `AUTHORITATIVE RESEARCH:\n${packet.research}`,
    packet.script?`MATERIAL:\n${packet.script}`:"",
    `CORE POSTER BRIEF:\n${baseReply}`,
    note,
    "QUALITY TARGET must be STUDIO CONTENT PREMIUM. Make the concept specific enough that an image model cannot default to generic scenery."
  ].filter(Boolean).join("\n\n");
  return runResilient(env,DIRECTOR_MODEL,CRITIC_MODEL,system,user,2200,.68);
}

async function criticPoster(env,packet,candidate){
  const system=[
    "You are an independent visual creative board critic for premium editorial media.",
    "CREATIVE_SCORE judges originality, story idea, immediate relevance and emotional/editorial impact.",
    "ART_DIRECTION_SCORE judges hero clarity, composition, camera, depth, lighting, color discipline, negative space, brand fit and image-generation feasibility.",
    "Generic AI aesthetics or weak subject storytelling cannot exceed 7.9. Unsupported factual visuals cannot exceed 5.9.",
    "Return exactly CREATIVE_SCORE: <number>; ART_DIRECTION_SCORE: <number>; ISSUES: <actionable critique>."
  ].join("\n");
  return runResilient(env,CRITIC_MODEL,DIRECTOR_MODEL,system,`CHANNEL: ${packet.profile.name}\n\nRESEARCH:\n${packet.research}\n\nART DIRECTION:\n${candidate}`,950,.1);
}

async function refineScript(env,packet,baseReply){
  let candidate=await masterScript(env,packet,baseReply);
  if(!validScript(candidate))candidate=await masterScript(env,packet,baseReply,"Previous result failed required structure. Rebuild fully and keep PUBLIC_HEADLINE.");
  let critique=await criticScript(env,packet,candidate);
  let editorial=score(critique,"EDITORIAL_SCORE");
  if(editorial<MIN_EDITORIAL){
    candidate=await masterScript(env,packet,candidate,`Independent critic issues:\n${issues(critique)}`);
    critique=await criticScript(env,packet,candidate);
    editorial=score(critique,"EDITORIAL_SCORE");
  }
  if(!validScript(candidate)||editorial<MIN_EDITORIAL)throw new Error(`Master editorial quality below threshold (${editorial.toFixed(1)}/10)`);
  return {reply:candidate,meta:{revision:REVISION,role:"KAI_MASTER_EDITORIAL_DIRECTOR",model:DIRECTOR_MODEL,criticModel:CRITIC_MODEL,editorialScore:editorial,threshold:MIN_EDITORIAL,criticIssues:issues(critique)}};
}

async function refinePoster(env,packet,baseReply){
  let candidate=await masterPoster(env,packet,baseReply);
  if(!validPoster(candidate))candidate=await masterPoster(env,packet,baseReply,"Previous result failed required structure. Rebuild all required labels without forbidden visualization language.");
  let critique=await criticPoster(env,packet,candidate);
  let creative=score(critique,"CREATIVE_SCORE"),art=score(critique,"ART_DIRECTION_SCORE");
  if(creative<MIN_CREATIVE||art<MIN_ART){
    candidate=await masterPoster(env,packet,candidate,`Independent critic issues:\n${issues(critique)}`);
    critique=await criticPoster(env,packet,candidate);
    creative=score(critique,"CREATIVE_SCORE");
    art=score(critique,"ART_DIRECTION_SCORE");
  }
  if(!validPoster(candidate)||creative<MIN_CREATIVE||art<MIN_ART)throw new Error(`Master poster quality below threshold (creative ${creative.toFixed(1)}, art ${art.toFixed(1)})`);
  return {reply:candidate,meta:{revision:REVISION,role:"KAI_MASTER_ART_DIRECTOR",model:DIRECTOR_MODEL,criticModel:CRITIC_MODEL,creativeScore:creative,artDirectionScore:art,creativeThreshold:MIN_CREATIVE,artThreshold:MIN_ART,criticIssues:issues(critique)}};
}

async function health(request,env,ctx){
  const upstream=await baseWorker.fetch(request,env,ctx);
  let data={};try{data=await upstream.clone().json();}catch{}
  return json({...(data&&typeof data==="object"?data:{}),kaiBrain:"ACTIVE",kaiBrainRevision:REVISION,kaiDirectorModel:DIRECTOR_MODEL,kaiIndependentCriticModel:CRITIC_MODEL,kaiBrainFlow:"CORE_DIRECT_TO_QWEN_MASTER_WITH_RESILIENT_CRITIC",kaiMasterEditorialThreshold:MIN_EDITORIAL,kaiMasterCreativeThreshold:MIN_CREATIVE,kaiMasterArtThreshold:MIN_ART},upstream.status,upstream.headers);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);
    let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
    const stage=stageOf(body);
    if(stage!=="SCRIPT"&&stage!=="POSTER")return baseWorker.fetch(request,env,ctx);

    const upstream=await baseWorker.fetch(request,env,ctx);
    if(!upstream.ok)return upstream;
    let payload;try{payload=await upstream.clone().json();}catch{return upstream;}
    const baseReply=text(payload?.reply);
    if(!baseReply||payload?.ok===false)return upstream;

    try{
      const packet=contextPacket(body);
      if(!packet.research)throw new Error("Authoritative research context missing");
      const refined=stage==="SCRIPT"?await refineScript(env,packet,baseReply):await refinePoster(env,packet,baseReply);
      return json({...payload,reply:refined.reply,provider:`${text(payload.provider)||"ACC OS X"} + KAI Brain 254.1`,kaiCreative:refined.meta},upstream.status,upstream.headers);
    }catch(error){
      return json({ok:false,stage,status:"KAI_BRAIN_QUALITY_BLOCKED",error:`KAI_BRAIN_QUALITY_BLOCKED: ${String(error?.message||error)}`,errorDetail:{code:"KAI_BRAIN_QUALITY_BLOCKED",revision:REVISION,stage,message:String(error?.message||error)}},422,upstream.headers);
    }
  }
};
