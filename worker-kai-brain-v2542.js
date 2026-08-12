// ACC OS X — BUILD 254.2 KAI BRAIN ITERATIVE STUDIO BOARD
// Qwen3 Master Director + structured independent critic + multi-pass revision board.
// Quality threshold stays strict; weak work is improved, not waved through.
// Publishing, Meta routing, tokens and caption path are untouched.

import baseWorker from "./worker-stage-normalizer.js";

const REVISION = "BUILD254_2_KAI_BRAIN_ITERATIVE_BOARD";
const DIRECTOR_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const CRITIC_MODEL = "@cf/zai-org/glm-4.7-flash";
const MIN_EDITORIAL = 8.5;
const MIN_CREATIVE = 8.5;
const MIN_ART = 8.5;
const MAX_BOARD_PASSES = 3;
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
    research:text(latest("RESEARCH")?.output).slice(0,14000),
    script:text(latest("SCRIPT")?.output).slice(0,8000),
    contexts:(Array.isArray(context?.contexts)?context.contexts:[]).slice(0,8).map(x=>({title:x?.title||"",content:text(x?.content).slice(0,2000)}))
  };
}

function numeric(raw,label){
  const m=String(raw||"").match(new RegExp(`^\\s*${label}\\s*:\\s*(10(?:\\.0+)?|[0-9](?:\\.[0-9]+)?)\\s*$`,`im`));
  return m?Math.max(0,Math.min(10,Number(m[1]))):0;
}
function issues(raw){const m=String(raw||"").match(/^\s*ISSUES\s*:\s*([\s\S]*)/im);return text(m?.[1]).slice(0,1800);}
function validScript(raw){const v=text(raw);return v.length>=260&&/\bPUBLIC_HEADLINE\s*:/i.test(v)&&!/^\s*(?:FAIL|ERROR)\b/i.test(v);}
function validPoster(raw){
  const v=text(raw);
  const required=["PUBLIC TOPIC","PRIMARY VISUAL BASIS","CREATIVE CONCEPT","HERO SUBJECT","COMPOSITION","CAMERA LANGUAGE","LIGHTING","COLOR DIRECTION","ATMOSPHERE","NEGATIVE SPACE","EDITORIAL ENERGY","QUALITY TARGET"];
  return v.length>=500&&required.every(k=>new RegExp(`^\\s*${k}\\s*:`,`im`).test(v))&&!/\b(?:chart|graph|diagram|dashboard|flowchart|table|timeline)\b/i.test(v);
}

function scriptAssessment(raw){
  const scores={
    accuracy:numeric(raw,"ACCURACY_SCORE"),
    editorial:numeric(raw,"EDITORIAL_INTELLIGENCE_SCORE"),
    originality:numeric(raw,"ORIGINALITY_SCORE"),
    hook:numeric(raw,"HOOK_SCORE"),
    clarity:numeric(raw,"CLARITY_SCORE"),
    usefulness:numeric(raw,"USEFULNESS_SCORE"),
    channelFit:numeric(raw,"CHANNEL_FIT_SCORE")
  };
  const weighted=(scores.accuracy*.25)+(scores.editorial*.15)+(scores.originality*.15)+(scores.hook*.10)+(scores.clarity*.10)+(scores.usefulness*.10)+(scores.channelFit*.15);
  const gate=Math.min(scores.accuracy,weighted);
  const weakest=Object.entries(scores).sort((a,b)=>a[1]-b[1]).slice(0,3).map(([k,v])=>`${k}:${v.toFixed(1)}`);
  return {scores,weighted:Number(weighted.toFixed(2)),gate:Number(gate.toFixed(2)),weakest,issues:issues(raw),raw:text(raw)};
}

function posterAssessment(raw){
  const scores={
    relevance:numeric(raw,"TOPIC_RELEVANCE_SCORE"),
    originality:numeric(raw,"ORIGINALITY_SCORE"),
    story:numeric(raw,"STORY_IDEA_SCORE"),
    hero:numeric(raw,"HERO_CLARITY_SCORE"),
    composition:numeric(raw,"COMPOSITION_SCORE"),
    camera:numeric(raw,"CAMERA_SCORE"),
    lighting:numeric(raw,"LIGHTING_SCORE"),
    color:numeric(raw,"COLOR_SCORE"),
    negativeSpace:numeric(raw,"NEGATIVE_SPACE_SCORE"),
    brandFit:numeric(raw,"BRAND_FIT_SCORE"),
    generatability:numeric(raw,"GENERATABILITY_SCORE")
  };
  const creative=(scores.relevance*.25)+(scores.originality*.35)+(scores.story*.40);
  const art=(scores.hero*.18)+(scores.composition*.18)+(scores.camera*.10)+(scores.lighting*.12)+(scores.color*.10)+(scores.negativeSpace*.10)+(scores.brandFit*.12)+(scores.generatability*.10);
  const gate=Math.min(scores.relevance,creative,art);
  const weakest=Object.entries(scores).sort((a,b)=>a[1]-b[1]).slice(0,4).map(([k,v])=>`${k}:${v.toFixed(1)}`);
  return {scores,creative:Number(creative.toFixed(2)),art:Number(art.toFixed(2)),gate:Number(gate.toFixed(2)),weakest,issues:issues(raw),raw:text(raw)};
}

async function masterScript(env,packet,baseReply,note=""){
  const system=[
    "You are KAI Master Editorial Director for ACC Studio Content.",
    "Operate at senior newsroom and premium digital-media level; think before writing.",
    "Research is authoritative. Never invent facts, dates, numbers, quotes, causes, consequences or forecasts.",
    "Build a sharp angle, strong narrative hierarchy, human hook, specificity, usefulness, rhythm and channel identity.",
    "If a previous board critique is supplied, fix the underlying editorial weakness. Do not merely rephrase sentences.",
    "When originality or hook is weak, reconsider framing and opening. When usefulness is weak, restructure around what the reader learns. When accuracy is weak, remove unsupported implications.",
    "Reject generic AI prose, repetition, empty significance statements, padded conclusions and vague claims.",
    "The final copy must feel intentionally edited by a skilled human editor.",
    "Return plain public-facing text only and include exactly one PUBLIC_HEADLINE: line."
  ].join("\n");
  const user=[
    `CHANNEL:\n${JSON.stringify(packet.profile)}`,
    `AUTHORITATIVE RESEARCH:\n${packet.research}`,
    `CORE / CURRENT MATERIAL:\n${baseReply}`,
    packet.contexts.length?`CHANNEL CONTEXT:\n${JSON.stringify(packet.contexts)}`:"",
    note,
    "Produce the strongest evidence-faithful final material. Do not discuss your process."
  ].filter(Boolean).join("\n\n");
  return runResilient(env,DIRECTOR_MODEL,CRITIC_MODEL,system,user,2600,.62);
}

async function criticScript(env,packet,candidate){
  const system=[
    "You are an independent senior editorial board. Be strict, specific and internally consistent.",
    "Score each dimension 0-10. 8.5 means genuinely publication-ready premium work, not merely competent.",
    "Accuracy: every factual implication is supported by research. Generic polished prose cannot get high originality/hook scores.",
    "Judge the actual copy, not the prestige of the topic.",
    "Return exactly these lines and nothing before them:",
    "ACCURACY_SCORE: <number>",
    "EDITORIAL_INTELLIGENCE_SCORE: <number>",
    "ORIGINALITY_SCORE: <number>",
    "HOOK_SCORE: <number>",
    "CLARITY_SCORE: <number>",
    "USEFULNESS_SCORE: <number>",
    "CHANNEL_FIT_SCORE: <number>",
    "ISSUES: <specific fixes, especially the weakest dimensions>"
  ].join("\n");
  return runResilient(env,CRITIC_MODEL,DIRECTOR_MODEL,system,`CHANNEL:\n${JSON.stringify(packet.profile)}\n\nRESEARCH:\n${packet.research}\n\nCANDIDATE:\n${candidate}`,1100,.08);
}

async function masterPoster(env,packet,baseReply,note=""){
  const system=[
    "You are KAI Master Art Director for a premium technology/media studio.",
    "Create one distinctive, image-generatable editorial hero concept for the exact public topic.",
    "The image itself contains no typography; deterministic Studio Renderer adds all text and branding.",
    "Use one unmistakable visual idea with narrative meaning, dominant hero subject, cinematic depth, intentional camera, premium lighting, disciplined color and clean negative space.",
    "If a board critique is supplied, solve the weak concept or composition at root level, not by adding decorative detail.",
    "Avoid generic AI futurism, stock illustration, decorative cityscapes, floating icons, random devices, fake interfaces and visual clutter.",
    "All factual visual claims must be supported by research. Metaphors must remain clearly illustrative.",
    "Never use the words chart, graph, diagram, dashboard, flowchart, table or timeline.",
    "Return exactly these labels: PUBLIC TOPIC, PRIMARY VISUAL BASIS, CREATIVE CONCEPT, HERO SUBJECT, COMPOSITION, CAMERA LANGUAGE, LIGHTING, COLOR DIRECTION, ATMOSPHERE, NEGATIVE SPACE, EDITORIAL ENERGY, QUALITY TARGET."
  ].join("\n");
  const user=[
    `CHANNEL:\n${JSON.stringify(packet.profile)}`,
    `AUTHORITATIVE RESEARCH:\n${packet.research}`,
    packet.script?`MATERIAL:\n${packet.script}`:"",
    `CORE / CURRENT POSTER BRIEF:\n${baseReply}`,
    note,
    "QUALITY TARGET must be STUDIO CONTENT PREMIUM. Make the concept specific enough that an image model cannot default to generic scenery."
  ].filter(Boolean).join("\n\n");
  return runResilient(env,DIRECTOR_MODEL,CRITIC_MODEL,system,user,2400,.72);
}

async function criticPoster(env,packet,candidate){
  const system=[
    "You are an independent visual creative board for premium editorial media.",
    "Score each dimension 0-10. 8.5 means studio-ready premium art direction.",
    "Generic AI aesthetics, vague futurism, weak story meaning or weak hero hierarchy must score low.",
    "Unsupported factual visuals must score below 6 on relevance.",
    "Return exactly these lines and nothing before them:",
    "TOPIC_RELEVANCE_SCORE: <number>",
    "ORIGINALITY_SCORE: <number>",
    "STORY_IDEA_SCORE: <number>",
    "HERO_CLARITY_SCORE: <number>",
    "COMPOSITION_SCORE: <number>",
    "CAMERA_SCORE: <number>",
    "LIGHTING_SCORE: <number>",
    "COLOR_SCORE: <number>",
    "NEGATIVE_SPACE_SCORE: <number>",
    "BRAND_FIT_SCORE: <number>",
    "GENERATABILITY_SCORE: <number>",
    "ISSUES: <specific fixes, especially the weakest dimensions>"
  ].join("\n");
  return runResilient(env,CRITIC_MODEL,DIRECTOR_MODEL,system,`CHANNEL:\n${JSON.stringify(packet.profile)}\n\nRESEARCH:\n${packet.research}\n\nART DIRECTION:\n${candidate}`,1300,.08);
}

function scriptRevisionNote(assessment,pass){
  return [
    `STUDIO BOARD REVISION PASS ${pass}.`,
    `Current gate score: ${assessment.gate.toFixed(2)}/10; weighted editorial: ${assessment.weighted.toFixed(2)}/10.`,
    `Weakest dimensions: ${assessment.weakest.join(", ")}.`,
    assessment.issues?`Board issues: ${assessment.issues}`:"",
    "Rebuild the weak editorial decisions. Do not preserve a weak angle merely for continuity with the previous draft."
  ].filter(Boolean).join("\n");
}
function posterRevisionNote(assessment,pass){
  return [
    `STUDIO BOARD REVISION PASS ${pass}.`,
    `Current gate score: ${assessment.gate.toFixed(2)}/10; creative: ${assessment.creative.toFixed(2)}/10; art direction: ${assessment.art.toFixed(2)}/10.`,
    `Weakest dimensions: ${assessment.weakest.join(", ")}.`,
    assessment.issues?`Board issues: ${assessment.issues}`:"",
    "If the central visual idea is generic, replace it. Do not merely add more objects or effects."
  ].filter(Boolean).join("\n");
}

async function refineScript(env,packet,baseReply){
  let current=baseReply;
  let best={candidate:"",assessment:{gate:0,weighted:0,weakest:[],issues:""},pass:0};
  for(let pass=1;pass<=MAX_BOARD_PASSES;pass++){
    let candidate=await masterScript(env,packet,current,pass===1?"":scriptRevisionNote(best.assessment,pass));
    if(!validScript(candidate))candidate=await masterScript(env,packet,current,"Previous output failed required public structure. Rebuild fully and include exactly one PUBLIC_HEADLINE line.");
    const critique=await criticScript(env,packet,candidate);
    const assessment=scriptAssessment(critique);
    if(validScript(candidate)&&assessment.gate>best.assessment.gate)best={candidate,assessment,pass};
    if(validScript(candidate)&&assessment.gate>=MIN_EDITORIAL){
      return {reply:candidate,meta:{revision:REVISION,role:"KAI_MASTER_EDITORIAL_BOARD",model:DIRECTOR_MODEL,criticModel:CRITIC_MODEL,editorialScore:assessment.gate,weightedEditorialScore:assessment.weighted,threshold:MIN_EDITORIAL,boardPasses:pass,dimensionScores:assessment.scores,criticIssues:assessment.issues}};
    }
    current=candidate;
    best.assessment=best.assessment.gate>=assessment.gate?best.assessment:assessment;
  }
  const a=best.assessment;
  throw new Error(`Master editorial quality below threshold (best ${Number(a.gate||0).toFixed(1)}/10 after ${MAX_BOARD_PASSES} board passes; weakest ${Array.isArray(a.weakest)?a.weakest.join(", "):"unknown"})`);
}

async function refinePoster(env,packet,baseReply){
  let current=baseReply;
  let best={candidate:"",assessment:{gate:0,creative:0,art:0,weakest:[],issues:""},pass:0};
  for(let pass=1;pass<=MAX_BOARD_PASSES;pass++){
    let candidate=await masterPoster(env,packet,current,pass===1?"":posterRevisionNote(best.assessment,pass));
    if(!validPoster(candidate))candidate=await masterPoster(env,packet,current,"Previous output failed required structure or used forbidden visualization language. Rebuild every required label cleanly.");
    const critique=await criticPoster(env,packet,candidate);
    const assessment=posterAssessment(critique);
    if(validPoster(candidate)&&assessment.gate>best.assessment.gate)best={candidate,assessment,pass};
    if(validPoster(candidate)&&assessment.creative>=MIN_CREATIVE&&assessment.art>=MIN_ART&&assessment.gate>=Math.min(MIN_CREATIVE,MIN_ART)){
      return {reply:candidate,meta:{revision:REVISION,role:"KAI_MASTER_ART_BOARD",model:DIRECTOR_MODEL,criticModel:CRITIC_MODEL,creativeScore:assessment.creative,artDirectionScore:assessment.art,creativeThreshold:MIN_CREATIVE,artThreshold:MIN_ART,boardPasses:pass,dimensionScores:assessment.scores,criticIssues:assessment.issues}};
    }
    current=candidate;
    best.assessment=best.assessment.gate>=assessment.gate?best.assessment:assessment;
  }
  const a=best.assessment;
  throw new Error(`Master poster quality below threshold (best creative ${Number(a.creative||0).toFixed(1)}, art ${Number(a.art||0).toFixed(1)}, gate ${Number(a.gate||0).toFixed(1)} after ${MAX_BOARD_PASSES} board passes; weakest ${Array.isArray(a.weakest)?a.weakest.join(", "):"unknown"})`);
}

async function health(request,env,ctx){
  const upstream=await baseWorker.fetch(request,env,ctx);
  let data={};try{data=await upstream.clone().json();}catch{}
  return json({
    ...(data&&typeof data==="object"?data:{}),
    kaiBrain:"ACTIVE",
    kaiBrainRevision:REVISION,
    kaiDirectorModel:DIRECTOR_MODEL,
    kaiIndependentCriticModel:CRITIC_MODEL,
    kaiBrainFlow:"CORE_TO_QWEN_ITERATIVE_STUDIO_BOARD",
    kaiStudioBoardPasses:MAX_BOARD_PASSES,
    kaiMasterEditorialThreshold:MIN_EDITORIAL,
    kaiMasterCreativeThreshold:MIN_CREATIVE,
    kaiMasterArtThreshold:MIN_ART
  },upstream.status,upstream.headers);
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
      return json({...payload,reply:refined.reply,provider:`${text(payload.provider)||"ACC OS X"} + KAI Brain 254.2 Studio Board`,kaiCreative:refined.meta},upstream.status,upstream.headers);
    }catch(error){
      return json({ok:false,stage,status:"KAI_BRAIN_QUALITY_BLOCKED",error:`KAI_BRAIN_QUALITY_BLOCKED: ${String(error?.message||error)}`,errorDetail:{code:"KAI_BRAIN_QUALITY_BLOCKED",revision:REVISION,stage,message:String(error?.message||error)}},422,upstream.headers);
    }
  }
};
