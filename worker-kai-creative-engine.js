// ACC OS X — BUILD 253 KAI CREATIVE ENGINE v1
// Adds deliberate editorial/art direction and an independent creative-critic pass
// before SCRIPT/POSTER outputs are allowed downstream. Publishing is untouched.

import baseWorker from "./worker-stage-normalizer.js";

const REVISION = "BUILD253_KAI_CREATIVE_ENGINE_V1";
const CREATIVE_MODEL = "@cf/zai-org/glm-4.7-flash";
const MIN_EDITORIAL = 8.0;
const MIN_CREATIVE = 8.2;
const MIN_ART = 8.2;
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
    result?.choices?.[0]?.message?.content,result?.result?.choices?.[0]?.message?.content
  ];
  for(const v of candidates)if(text(v))return text(v);
  if(typeof result==="string")return text(result);
  return "";
}

function contextPacket(body){
  const context=body?.context||{};
  const p=context?.profile||{};
  const rows=Array.isArray(context?.upstreamAssets)?context.upstreamAssets:[];
  const latest=stage=>rows.find(x=>String(x?.stage||"").toUpperCase()===stage&&text(x?.output));
  return {
    profile:{id:p.id||"",name:p.name||"",category:p.category||"",platform:p.platform||"",mission:p.mission||"",canon:p.canon||""},
    research:text(latest("RESEARCH")?.output).slice(0,10000),
    script:text(latest("SCRIPT")?.output).slice(0,6500),
    contexts:(Array.isArray(context?.contexts)?context.contexts:[]).slice(0,6).map(x=>({title:x?.title||"",content:text(x?.content).slice(0,1800)}))
  };
}

async function run(env,system,user,max_tokens=1800,temperature=.55){
  if(!env?.AI)throw new Error("AI binding unavailable");
  const result=await env.AI.run(CREATIVE_MODEL,{messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens,temperature});
  const out=modelText(result);
  if(!out)throw new Error("Creative model returned empty output");
  return out;
}

function score(raw,label){
  const m=String(raw||"").match(new RegExp(`${label}\\s*:\\s*(10(?:\\.0+)?|[0-9](?:\\.[0-9]+)?)`,`i`));
  return m?Math.max(0,Math.min(10,Number(m[1]))):0;
}
function issueText(raw){
  const m=String(raw||"").match(/ISSUES\s*:\s*([\s\S]*)/i);
  return text(m?.[1]).slice(0,1200);
}
function validScript(raw){
  const v=text(raw);
  return v.length>=220&&/\bPUBLIC_HEADLINE\s*:/i.test(v)&&!/^\s*(?:FAIL|ERROR)\b/i.test(v);
}
function validPoster(raw){
  const v=text(raw);
  const required=["PUBLIC TOPIC","PRIMARY VISUAL BASIS","CREATIVE CONCEPT","HERO SUBJECT","COMPOSITION","CAMERA LANGUAGE","LIGHTING","COLOR DIRECTION","ATMOSPHERE","NEGATIVE SPACE","EDITORIAL ENERGY","QUALITY TARGET"];
  return v.length>=420&&required.every(k=>new RegExp(`^\\s*${k}\\s*:`,`im`).test(v))&&!/\b(?:chart|graph|diagram|dashboard|flowchart|table|timeline)\b/i.test(v);
}

async function directScript(env,packet,baseReply,revisionNote=""){
  return run(env,[
    "You are KAI Editorial Director for ACC Studio Content.",
    "Think like a senior editor, strategist and storyteller, not a generic summarizer.",
    "Facts are locked to the supplied research. Never invent facts, numbers, quotes, causes, consequences or forecasts.",
    "Create a sharp editorial angle, a strong but accurate headline, a human hook, clear significance and useful takeaways.",
    "Avoid filler, repetition, generic AI prose, pseudo-markdown and internal/system language.",
    "Use the channel identity and mission when deciding voice and framing.",
    "Output plain text with PUBLIC_HEADLINE as an exact labeled line."
  ].join("\n"),[
    `CHANNEL:\n${JSON.stringify(packet.profile)}`,
    `RESEARCH (AUTHORITATIVE):\n${packet.research}`,
    `BASE MATERIAL:\n${baseReply}`,
    packet.contexts.length?`CHANNEL CONTEXT:\n${JSON.stringify(packet.contexts)}`:"",
    revisionNote,
    "Rewrite into publication-ready material. Preserve evidence discipline but maximize clarity, originality, editorial intelligence and reader interest."
  ].filter(Boolean).join("\n\n"),2200,.62);
}

async function critiqueScript(env,packet,candidate){
  return run(env,[
    "You are KAI Senior Editorial Critic. Be strict.",
    "Score the candidate from 0-10 for editorial intelligence, factual discipline, originality, clarity, hook strength, channel fit and usefulness.",
    "A polished but generic rewrite must score below 8.",
    "Any invented/unsupported factual implication must score below 6.",
    "Return exactly: EDITORIAL_SCORE: <number> then ISSUES: <brief actionable critique>."
  ].join("\n"),`RESEARCH:\n${packet.research}\n\nCANDIDATE:\n${candidate}`,700,.15);
}

async function directPoster(env,packet,baseReply,revisionNote=""){
  return run(env,[
    "You are KAI Senior Art Director for ACC Studio Content.",
    "Design one premium editorial hero artwork concept that would survive review by a professional media studio.",
    "Do not produce final typography or layout; the deterministic Studio Renderer adds branding and text later.",
    "The AI artwork must have one unmistakable hero idea, strong cinematic composition, visual depth, premium lighting, deliberate color, emotional/editorial energy and useful negative space.",
    "Avoid generic stock-art composition, random futuristic scenery, decorative technology with no story meaning, floating icons, fake interfaces, pseudo-text and visual clichés.",
    "Never invent factual visual claims. Every factual visual element must be supported by research or be a clearly illustrative metaphor for the exact topic.",
    "Do not use the words chart, graph, diagram, dashboard, flowchart, table or timeline anywhere in the output.",
    "Return plain text using exactly these labels: PUBLIC TOPIC, PRIMARY VISUAL BASIS, CREATIVE CONCEPT, HERO SUBJECT, COMPOSITION, CAMERA LANGUAGE, LIGHTING, COLOR DIRECTION, ATMOSPHERE, NEGATIVE SPACE, EDITORIAL ENERGY, QUALITY TARGET."
  ].join("\n"),[
    `CHANNEL:\n${JSON.stringify(packet.profile)}`,
    `RESEARCH (AUTHORITATIVE):\n${packet.research}`,
    `MATERIAL:\n${packet.script}`,
    `BASE POSTER BRIEF:\n${baseReply}`,
    packet.contexts.length?`CHANNEL CONTEXT:\n${JSON.stringify(packet.contexts)}`:"",
    revisionNote,
    "Create a distinctive, feasible, premium art direction. QUALITY TARGET must say: STUDIO CONTENT PREMIUM."
  ].filter(Boolean).join("\n\n"),1900,.72);
}

async function critiquePoster(env,packet,candidate){
  return run(env,[
    "You are KAI Visual Creative Director and ruthless studio critic.",
    "Evaluate the art direction before image generation.",
    "CREATIVE_SCORE measures originality, editorial idea, emotional impact and non-generic concept quality.",
    "ART_DIRECTION_SCORE measures hero clarity, composition, camera, lighting, color, depth, negative space, brand fit and image-generation feasibility.",
    "Generic AI imagery, vague futuristic scenes, weak hero subject or merely decorative visuals must score below 8.",
    "Unsupported factual visualization must score below 6.",
    "Return exactly three lines: CREATIVE_SCORE: <number>; ART_DIRECTION_SCORE: <number>; ISSUES: <brief actionable critique>."
  ].join("\n"),`CHANNEL: ${packet.profile.name}\n\nRESEARCH:\n${packet.research}\n\nART DIRECTION:\n${candidate}`,850,.12);
}

async function refineScript(env,packet,baseReply){
  let candidate=await directScript(env,packet,baseReply);
  if(!validScript(candidate))candidate=await directScript(env,packet,baseReply,"Previous draft failed required structure. Ensure PUBLIC_HEADLINE exists and output is complete.");
  let critique=await critiqueScript(env,packet,candidate);
  let editorial=score(critique,"EDITORIAL_SCORE");
  if(editorial<MIN_EDITORIAL){
    candidate=await directScript(env,packet,candidate,`Senior critic issues to fix:\n${issueText(critique)}`);
    critique=await critiqueScript(env,packet,candidate);
    editorial=score(critique,"EDITORIAL_SCORE");
  }
  if(!validScript(candidate)||editorial<MIN_EDITORIAL)throw new Error(`Editorial quality below studio threshold (${editorial.toFixed(1)}/10)`);
  return {reply:candidate,meta:{revision:REVISION,model:CREATIVE_MODEL,role:"KAI_EDITORIAL_DIRECTOR",editorialScore:editorial,threshold:MIN_EDITORIAL,criticIssues:issueText(critique)}};
}

async function refinePoster(env,packet,baseReply){
  let candidate=await directPoster(env,packet,baseReply);
  if(!validPoster(candidate))candidate=await directPoster(env,packet,baseReply,"Previous draft failed required structure or used forbidden visualization language. Rebuild cleanly with every required label.");
  let critique=await critiquePoster(env,packet,candidate);
  let creative=score(critique,"CREATIVE_SCORE"), art=score(critique,"ART_DIRECTION_SCORE");
  if(creative<MIN_CREATIVE||art<MIN_ART){
    candidate=await directPoster(env,packet,candidate,`Studio critic rejected the previous direction. Fix these issues:\n${issueText(critique)}\nMake the new concept more specific, cinematic, non-generic and compositionally deliberate without inventing facts.`);
    critique=await critiquePoster(env,packet,candidate);
    creative=score(critique,"CREATIVE_SCORE"); art=score(critique,"ART_DIRECTION_SCORE");
  }
  if(!validPoster(candidate)||creative<MIN_CREATIVE||art<MIN_ART)throw new Error(`Poster creativity below studio threshold (creative ${creative.toFixed(1)}, art ${art.toFixed(1)})`);
  return {reply:candidate,meta:{revision:REVISION,model:CREATIVE_MODEL,role:"KAI_ART_DIRECTOR",creativeScore:creative,artDirectionScore:art,creativeThreshold:MIN_CREATIVE,artThreshold:MIN_ART,criticIssues:issueText(critique)}};
}

async function health(request,env,ctx){
  const upstream=await baseWorker.fetch(request,env,ctx);
  let data={}; try{data=await upstream.clone().json();}catch{}
  return json({...(data&&typeof data==="object"?data:{}),kaiCreativeEngine:"ACTIVE",kaiCreativeEngineRevision:REVISION,kaiCreativeModel:CREATIVE_MODEL,kaiEditorialThreshold:MIN_EDITORIAL,kaiCreativeThreshold:MIN_CREATIVE,kaiArtDirectionThreshold:MIN_ART},upstream.status,upstream.headers);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);

    let body; try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
    const stage=stageOf(body);
    if(stage!=="SCRIPT"&&stage!=="POSTER")return baseWorker.fetch(request,env,ctx);

    const upstream=await baseWorker.fetch(request,env,ctx);
    if(!upstream.ok)return upstream;
    let payload; try{payload=await upstream.clone().json();}catch{return upstream;}
    const baseReply=text(payload?.reply);
    if(!baseReply||payload?.ok===false)return upstream;

    try{
      const packet=contextPacket(body);
      if(!packet.research)throw new Error("Authoritative research context missing");
      const refined=stage==="SCRIPT"?await refineScript(env,packet,baseReply):await refinePoster(env,packet,baseReply);
      return json({...payload,reply:refined.reply,provider:`${text(payload.provider)||"ACC OS X"} + KAI Creative Engine`,kaiCreative:refined.meta},upstream.status,upstream.headers);
    }catch(error){
      return json({ok:false,stage,status:"CREATIVE_QUALITY_BLOCKED",error:`KAI_CREATIVE_QUALITY_BLOCKED: ${String(error?.message||error)}`,errorDetail:{code:"KAI_CREATIVE_QUALITY_BLOCKED",revision:REVISION,stage,message:String(error?.message||error)}},422,upstream.headers);
    }
  }
};
