// ACC OS X — BUILD 257.6 PRODUCE COPILOT WORKER
// Semi-automatic channel-aware K/P/C/N production lane.
// This worker does not mutate automatic missions, Meta credentials, channel canon, or storage schema.

import baseWorker from "./worker-stage-normalizer.js";

const REVISION = "BUILD257_6_PRODUCE_COPILOT";
const TEXT_PRIMARY = "@cf/openai/gpt-oss-120b";
const TEXT_FALLBACK = "@cf/meta/llama-4-scout-17b-16e-instruct";
const FAST_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const text = v => typeof v === "string" ? v.trim() : "";

function json(data,status=200,headersLike=null){
  const h=new Headers(headersLike||{});
  h.set("Content-Type","application/json;charset=UTF-8");
  h.set("Cache-Control","no-store");
  h.set("Access-Control-Allow-Origin","*");
  return new Response(JSON.stringify(data),{status,headers:h});
}
function stageOf(body){
  const s=String(body?.context?.workerTask?.stage||"").toUpperCase();
  if(s==="COPILOT"||s==="PRODUCE_COPILOT") return "COPILOT";
  return "";
}
function cleanModelText(v){
  return text(v)
    .replace(/<think>[\s\S]*?<\/think>/gi,"")
    .replace(/^```(?:json|text)?\s*|\s*```$/gi,"")
    .trim();
}
function partText(v){
  if(typeof v==="string") return text(v);
  if(Array.isArray(v)) return v.map(partText).filter(Boolean).join("\n").trim();
  if(!v||typeof v!=="object") return "";
  for(const item of [v.output_text,v.text,v.response,v.content,v.message]){
    const out=partText(item); if(out) return out;
  }
  return "";
}
function modelText(r){
  if(typeof r==="string") return cleanModelText(r);
  if(!r||typeof r!=="object") return "";
  const candidates=[
    r.response,r.output_text,r.text,
    r.choices?.[0]?.message?.content,r.choices?.[0]?.text,
    r.result?.response,r.result?.output_text,r.result?.text,
    r.result?.choices?.[0]?.message?.content,
    r.output,r.result?.output
  ];
  for(const c of candidates){const out=partText(c);if(out)return cleanModelText(out);}
  return "";
}
async function timed(promise,ms,label){
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label}_TIMEOUT`)),ms);});
  try{return await Promise.race([promise,timeout]);}finally{clearTimeout(timer);}
}
async function runText(env,system,user,{primary=TEXT_PRIMARY,fallback=TEXT_FALLBACK,max_tokens=1800,temperature=.55}={}){
  if(!env?.AI) throw new Error("AI_BINDING_UNAVAILABLE");
  const failures=[];
  for(const model of [primary,fallback].filter((m,i,a)=>m&&a.indexOf(m)===i)){
    try{
      const raw=await timed(env.AI.run(model,{messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens,temperature}),26000,"TEXT_MODEL");
      const out=modelText(raw);
      if(!out) throw new Error("EMPTY_OUTPUT");
      return {text:out,model,failures};
    }catch(error){failures.push({model,error:String(error?.message||error).slice(0,160)});}
  }
  const err=new Error(`COPILOT_TEXT_CHAIN_EXHAUSTED: ${failures.map(x=>`${x.model}=${x.error}`).join(" | ")}`);
  err.failures=failures; throw err;
}
function commandOf(body){
  const explicit=text(body?.context?.copilot?.command);
  if(explicit) return explicit;
  const rows=Array.isArray(body?.messages)?body.messages:[];
  for(let i=rows.length-1;i>=0;i--) if(String(rows[i]?.role||"").toLowerCase()==="user"&&text(rows[i]?.content)) return text(rows[i].content);
  return "";
}
function opOf(command){
  const c=text(command);
  if(/^(?:k|konten|content)\b/i.test(c)) return "K";
  if(/^(?:p|poster)\b/i.test(c)) return "P";
  if(/^(?:c|caption)\b/i.test(c)) return "C";
  if(/^(?:n|next|lanjut)\b/i.test(c)) return "N";
  return "CHAT";
}
function packetOf(body){
  const c=body?.context||{}, p=c?.profile||{}, cp=c?.copilot||{};
  return {
    profile:{
      id:text(p.id),code:text(p.code),name:text(p.name),platform:text(p.platform)||"Facebook",
      category:text(p.category),department:text(p.department),workflow:text(p.workflow),
      mission:text(p.mission),canon:text(p.canon)
    },
    contexts:(Array.isArray(c.contexts)?c.contexts:[]).filter(x=>x?.active!==false).slice(0,12).map(x=>({
      type:text(x?.type),title:text(x?.title),version:text(x?.version),content:text(x?.content).slice(0,2600)
    })),
    research:text(cp.research).slice(0,12000),
    material:text(cp.material).slice(0,12000),
    caption:text(cp.caption).slice(0,8000),
    history:(Array.isArray(cp.history)?cp.history:[]).slice(-8).map(x=>({role:text(x?.role),content:text(x?.content).slice(0,1800)}))
  };
}
function masterBlock(packet){
  return [
    `CHANNEL PROFILE:\n${JSON.stringify(packet.profile)}`,
    packet.contexts.length?`LOCKED MASTER / CHANNEL CONTEXT:\n${JSON.stringify(packet.contexts)}`:"",
    packet.research?`AVAILABLE RESEARCH EVIDENCE:\n${packet.research}`:""
  ].filter(Boolean).join("\n\n");
}
async function makeContent(env,packet,command,isNext=false){
  const system=[
    "You are KAI, the senior content director inside ACC OS X Produce Copilot.",
    "You are operating ONLY for the selected channel shown in CHANNEL PROFILE.",
    "Treat LOCKED MASTER / CHANNEL CONTEXT as authoritative. Preserve canon, workflow, tone, series rules, continuity, language, credits and platform requirements.",
    "Never import rules from another channel.",
    "The owner is working semi-automatically and will review your output before the next command.",
    "If the channel master requires choices before production, obey that exact requirement instead of skipping it.",
    "For factual/current claims: use AVAILABLE RESEARCH EVIDENCE when present. If no evidence is supplied, do not invent dates, statistics, quotes or breaking-news facts.",
    isNext?"This is NEXT. Advance the current channel naturally, avoid repeating the previous package, and preserve continuity.":"",
    "Return only the useful owner-facing content/material. No internal scoring, no AI process narration, no JSON."
  ].filter(Boolean).join("\n");
  const user=[
    masterBlock(packet),
    packet.material?`PREVIOUS/CURRENT MATERIAL:\n${packet.material}`:"",
    packet.caption?`PREVIOUS CAPTION:\n${packet.caption}`:"",
    packet.history.length?`RECENT COPILOT CHAT:\n${packet.history.map(x=>`${x.role}: ${x.content}`).join("\n")}`:"",
    `OWNER COMMAND: ${command}`
  ].filter(Boolean).join("\n\n");
  return runText(env,system,user,{max_tokens:2200,temperature:.62});
}
async function makeCaption(env,packet,command){
  if(!packet.material) throw new Error("MATERIAL_REQUIRED_BEFORE_CAPTION");
  const system=[
    "You are KAI Social Caption Director inside ACC OS X.",
    "Write the final publish-ready caption for the selected channel only.",
    "Obey all LOCKED MASTER / CHANNEL CONTEXT rules, including language, opening greeting, credits/tags, CTA, hashtags, tone and platform format.",
    "Use CURRENT MATERIAL as the content source. Do not invent factual claims not present there.",
    "Return caption only. No labels such as CAPTION:, no analysis, no internal notes."
  ].join("\n");
  const user=[masterBlock(packet),`CURRENT MATERIAL:\n${packet.material}`,`OWNER COMMAND: ${command}`].join("\n\n");
  return runText(env,system,user,{primary:FAST_MODEL,fallback:TEXT_PRIMARY,max_tokens:1600,temperature:.45});
}
const POSTER_SCHEMA={
  type:"object",
  properties:{
    headline:{type:"string"},
    subhead:{type:"string"},
    visual_prompt:{type:"string"},
    badge:{type:"string"}
  },
  required:["headline","subhead","visual_prompt","badge"],
  additionalProperties:false
};
async function makePosterPlan(env,packet){
  if(!packet.material) throw new Error("MATERIAL_REQUIRED_BEFORE_POSTER");
  const prompt=[
    "You are KAI Visual Director for ACC OS X.",
    "Create a concise poster plan from the selected channel master and CURRENT MATERIAL.",
    "The generated hero artwork must contain NO typography, NO letters, NO logos, NO watermark. Text will be composited later by ACC OS X.",
    "visual_prompt must describe a premium cinematic vertical-social hero image, clear subject, strong composition, clean lighting, no embedded text.",
    "headline must be public-facing and <= 90 characters. subhead <= 120 characters. badge <= 32 characters.",
    masterBlock(packet),
    `CURRENT MATERIAL:\n${packet.material}`
  ].join("\n\n");
  let raw;
  try{
    raw=await timed(env.AI.run(FAST_MODEL,{prompt,max_tokens:650,temperature:.25,guided_json:POSTER_SCHEMA}),20000,"POSTER_PLAN");
  }catch{
    raw=await timed(env.AI.run(FAST_MODEL,{messages:[{role:"user",content:prompt+"\nReturn strict JSON only."}],max_tokens:650,temperature:.25}),20000,"POSTER_PLAN");
  }
  const out=modelText(raw);
  let plan;
  try{plan=JSON.parse(out.replace(/^```json\s*|\s*```$/gi,""));}catch{
    const fallback=await runText(env,"Return strict JSON with keys headline, subhead, visual_prompt, badge. No markdown.",prompt,{primary:FAST_MODEL,fallback:TEXT_PRIMARY,max_tokens:650,temperature:.2});
    plan=JSON.parse(fallback.text.replace(/^```json\s*|\s*```$/gi,""));
  }
  if(!text(plan?.visual_prompt)||!text(plan?.headline)) throw new Error("POSTER_PLAN_INVALID");
  const visualPrompt=[
    text(plan.visual_prompt).slice(0,1500),
    "premium editorial photography or cinematic illustration, high detail, strong mobile composition",
    "no text, no letters, no words, no logos, no watermark, no UI"
  ].join(", ");
  const image=await timed(env.AI.run(IMAGE_MODEL,{prompt:visualPrompt,steps:6,seed:Math.floor(Math.random()*2147483000)}),45000,"POSTER_IMAGE");
  const imageBase64=text(image?.image||image?.result?.image);
  if(!imageBase64) throw new Error("POSTER_IMAGE_EMPTY");
  return {
    plan:{
      headline:text(plan.headline).slice(0,110),
      subhead:text(plan.subhead).slice(0,150),
      badge:text(plan.badge).slice(0,40),
      visualPrompt
    },
    imageBase64
  };
}
async function chat(env,packet,command){
  const system=[
    "You are KAI inside ACC OS X Produce Copilot.",
    "Talk naturally with the owner about ONLY the currently selected channel.",
    "Read and obey the locked master context before answering.",
    "Keep answers operational and concise unless the owner asks for detail.",
    "Do not claim an action was published, deployed or generated unless this request actually performed it."
  ].join("\n");
  const user=[masterBlock(packet),packet.material?`CURRENT MATERIAL:\n${packet.material}`:"",`OWNER MESSAGE: ${command}`].filter(Boolean).join("\n\n");
  return runText(env,system,user,{primary:FAST_MODEL,fallback:TEXT_PRIMARY,max_tokens:1400,temperature:.5});
}

async function health(request,env,ctx){
  const upstream=await baseWorker.fetch(request,env,ctx);
  let data={}; try{data=await upstream.clone().json();}catch{}
  return json({...data,produceCopilot:"ACTIVE",produceCopilotRevision:REVISION,produceCopilotCommands:["K","P","C","N"],produceCopilotTextPrimary:TEXT_PRIMARY,produceCopilotTextFallback:TEXT_FALLBACK,produceCopilotImageModel:IMAGE_MODEL},upstream.status,upstream.headers);
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai")) return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai")) return baseWorker.fetch(request,env,ctx);
    let body; try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
    if(stageOf(body)!=="COPILOT") return baseWorker.fetch(request,env,ctx);
    const command=commandOf(body), op=opOf(command), packet=packetOf(body);
    if(!packet.profile.id||!packet.profile.name) return json({ok:false,status:"COPILOT_CONTEXT_MISSING",error:"Selected channel context is missing."},400);
    try{
      if(op==="P"){
        const poster=await makePosterPlan(env,packet);
        return json({ok:true,stage:"COPILOT",op,kind:"poster",reply:`Poster ${packet.profile.name} siap.`,...poster,revision:REVISION});
      }
      if(op==="C"){
        const result=await makeCaption(env,packet,command);
        return json({ok:true,stage:"COPILOT",op,kind:"caption",reply:result.text,model:result.model,revision:REVISION});
      }
      if(op==="K"||op==="N"){
        const result=await makeContent(env,packet,command,op==="N");
        return json({ok:true,stage:"COPILOT",op,kind:"material",reply:result.text,model:result.model,revision:REVISION});
      }
      const result=await chat(env,packet,command);
      return json({ok:true,stage:"COPILOT",op:"CHAT",kind:"chat",reply:result.text,model:result.model,revision:REVISION});
    }catch(error){
      return json({ok:false,stage:"COPILOT",status:"COPILOT_FAILED",error:String(error?.message||error),detail:{revision:REVISION,op,failures:error?.failures||null}},422);
    }
  }
};
