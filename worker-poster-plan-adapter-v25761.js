// ACC OS X — BUILD 257.6.1 POSTER PLAN ADAPTER
// Intercepts only Produce Copilot POSTER commands.
// Fixes structured-object / JSON-shape variance from Workers AI poster planning.
// All non-poster traffic delegates to BUILD 257.6 unchanged.

import baseGate from "./worker-build254-gate.js";

const REVISION = "BUILD257_6_1_POSTER_PLAN_ADAPTER";
const PLAN_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const PLAN_FALLBACK = "@cf/openai/gpt-oss-120b";
const IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const text = v => typeof v === "string" ? v.trim() : "";

const POSTER_SCHEMA = {
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

function json(data,status=200,headersLike=null){
  const h=new Headers(headersLike||{});
  h.set("Content-Type","application/json;charset=UTF-8");
  h.set("Cache-Control","no-store");
  h.set("Access-Control-Allow-Origin","*");
  return new Response(JSON.stringify(data),{status,headers:h});
}

function commandOf(body){
  const explicit=text(body?.context?.copilot?.command);
  if(explicit)return explicit;
  const rows=Array.isArray(body?.messages)?body.messages:[];
  for(let i=rows.length-1;i>=0;i--){
    if(String(rows[i]?.role||"").toLowerCase()==="user"&&text(rows[i]?.content))return text(rows[i].content);
  }
  return "";
}

function isCopilotPoster(body){
  const stage=String(body?.context?.workerTask?.stage||"").toUpperCase();
  if(stage!=="COPILOT"&&stage!=="PRODUCE_COPILOT")return false;
  return /^(?:p|poster)\b/i.test(commandOf(body));
}

function packetOf(body){
  const c=body?.context||{},p=c?.profile||{},cp=c?.copilot||{};
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
    material:text(cp.material).slice(0,12000)
  };
}

function masterBlock(packet){
  return [
    `CHANNEL PROFILE:\n${JSON.stringify(packet.profile)}`,
    packet.contexts.length?`LOCKED MASTER / CHANNEL CONTEXT:\n${JSON.stringify(packet.contexts)}`:"",
    packet.research?`AVAILABLE RESEARCH EVIDENCE:\n${packet.research}`:""
  ].filter(Boolean).join("\n\n");
}

async function timed(promise,ms,label){
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label}_TIMEOUT`)),ms);});
  try{return await Promise.race([promise,timeout]);}finally{clearTimeout(timer);}
}

function parseJsonString(raw){
  const s=text(raw).replace(/^```(?:json)?\s*|\s*```$/gi,"").trim();
  if(!s)return null;
  try{return JSON.parse(s);}catch{}
  const first=s.indexOf("{"),last=s.lastIndexOf("}");
  if(first>=0&&last>first){try{return JSON.parse(s.slice(first,last+1));}catch{}}
  return null;
}

function planCandidate(value,depth=0){
  if(depth>5||value==null)return null;
  if(typeof value==="string")return planCandidate(parseJsonString(value),depth+1);
  if(Array.isArray(value)){
    for(const item of value){const p=planCandidate(item,depth+1);if(p)return p;}
    return null;
  }
  if(typeof value!=="object")return null;
  if(text(value.headline)&&text(value.visual_prompt)){
    return {
      headline:text(value.headline),
      subhead:text(value.subhead),
      visual_prompt:text(value.visual_prompt),
      badge:text(value.badge)||"UPDATE"
    };
  }
  for(const key of ["response","result","output","output_text","text","content","message","data","choices"]){
    const p=planCandidate(value?.[key],depth+1);if(p)return p;
  }
  if(value?.choices?.[0]){
    const p=planCandidate(value.choices[0],depth+1);if(p)return p;
  }
  return null;
}

async function generatePlan(env,prompt){
  const failures=[];
  const attempts=[
    [PLAN_MODEL,{messages:[{role:"user",content:prompt}],max_tokens:650,temperature:.2,guided_json:POSTER_SCHEMA}],
    [PLAN_MODEL,{messages:[{role:"user",content:prompt+"\nReturn strict JSON only with headline, subhead, visual_prompt, badge."}],max_tokens:650,temperature:.2}],
    [PLAN_FALLBACK,{messages:[{role:"system",content:"Return strict JSON only. Keys: headline, subhead, visual_prompt, badge."},{role:"user",content:prompt}],max_tokens:650,temperature:.2}]
  ];
  for(const [model,args] of attempts){
    try{
      const raw=await timed(env.AI.run(model,args),22000,"POSTER_PLAN");
      const plan=planCandidate(raw);
      if(plan)return {plan,model,failures};
      failures.push({model,error:"UNRECOGNIZED_STRUCTURED_OUTPUT"});
    }catch(error){failures.push({model,error:String(error?.message||error).slice(0,180)});}
  }
  const err=new Error("POSTER_PLAN_INVALID");err.failures=failures;throw err;
}

async function runPoster(request,env,body){
  if(!env?.AI)return json({ok:false,stage:"COPILOT",status:"COPILOT_FAILED",error:"AI_BINDING_UNAVAILABLE",detail:{revision:REVISION,op:"P"}},422);
  const packet=packetOf(body);
  if(!packet.profile.id||!packet.profile.name)return json({ok:false,stage:"COPILOT",status:"COPILOT_CONTEXT_MISSING",error:"Selected channel context is missing."},400);
  if(!packet.material)return json({ok:false,stage:"COPILOT",status:"COPILOT_FAILED",error:"MATERIAL_REQUIRED_BEFORE_POSTER",detail:{revision:REVISION,op:"P"}},422);

  const prompt=[
    "You are KAI Visual Director for ACC OS X.",
    "Create one premium poster plan from the selected channel master and CURRENT MATERIAL.",
    "Obey the selected channel visual identity and locked context; never import another channel style.",
    "Hero artwork must contain NO typography, NO letters, NO logos, NO watermark. ACC OS X composites text later.",
    "visual_prompt: premium cinematic vertical social hero image, clear subject, clean lighting, strong mobile composition.",
    "headline <= 90 characters. subhead <= 120 characters. badge <= 32 characters.",
    masterBlock(packet),
    `CURRENT MATERIAL:\n${packet.material}`
  ].join("\n\n");

  try{
    const planned=await generatePlan(env,prompt);
    const plan=planned.plan;
    const visualPrompt=[
      text(plan.visual_prompt).slice(0,1500),
      "premium editorial photography or cinematic illustration, high detail, strong mobile composition",
      "no text, no letters, no words, no logos, no watermark, no UI"
    ].join(", ");
    const image=await timed(env.AI.run(IMAGE_MODEL,{prompt:visualPrompt,steps:6,seed:Math.floor(Math.random()*2147483000)}),45000,"POSTER_IMAGE");
    const imageBase64=text(image?.image||image?.result?.image);
    if(!imageBase64)throw new Error("POSTER_IMAGE_EMPTY");
    return json({
      ok:true,stage:"COPILOT",op:"P",kind:"poster",reply:`Poster ${packet.profile.name} siap.`,
      plan:{headline:text(plan.headline).slice(0,110),subhead:text(plan.subhead).slice(0,150),badge:text(plan.badge).slice(0,40),visualPrompt},
      imageBase64,model:planned.model,revision:REVISION,posterPlanAdapter:"STRUCTURED_OBJECT_TOLERANT"
    });
  }catch(error){
    return json({ok:false,stage:"COPILOT",status:"COPILOT_FAILED",error:String(error?.message||error),detail:{revision:REVISION,op:"P",failures:error?.failures||null}},422);
  }
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai")){
      const upstream=await baseGate.fetch(request,env,ctx);
      let data={};try{data=await upstream.clone().json();}catch{}
      return json({...data,produceCopilotPosterAdapter:"ACTIVE",produceCopilotPosterAdapterRevision:REVISION,produceCopilotPosterPlanProtocol:"STRUCTURED_OBJECT_TOLERANT"},upstream.status,upstream.headers);
    }
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseGate.fetch(request,env,ctx);
    let body;try{body=await request.clone().json();}catch{return baseGate.fetch(request,env,ctx);}
    if(!isCopilotPoster(body))return baseGate.fetch(request,env,ctx);
    return runPoster(request,env,body);
  }
};
