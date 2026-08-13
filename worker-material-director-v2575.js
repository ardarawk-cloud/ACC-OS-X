// ACC OS X — BUILD 257.5 DETERMINISTIC CRITIC MATERIAL DIRECTOR
// MATERIAL quality path: GPT-OSS 120B writes; Llama 4 Scout independently judges via guided JSON.
// Strict 8.5 publication threshold, max two passes, bounded runtime. Publishing paths untouched.

import baseWorker from "./worker-stage-normalizer.js";

const RUNTIME_REVISION="BUILD257_5_DETERMINISTIC_CRITIC";
const CREATIVE_PROOF_REVISION="BUILD257_KAI_AUTONOMOUS_QUALITY_RECOVERY";
const THRESHOLD=8.5;
const MAX_PASSES=2;
const STAGE_BUDGET_MS=145000;
const MIN_CALL_WINDOW_MS=5000;
const DIRECTOR_MODELS=[
  {model:"@cf/openai/gpt-oss-120b",timeoutMs:26000},
  {model:"@cf/meta/llama-4-scout-17b-16e-instruct",timeoutMs:18000},
  {model:"@cf/zai-org/glm-4.7-flash",timeoutMs:14000}
];
const CRITIC_MODELS=[
  {model:"@cf/meta/llama-4-scout-17b-16e-instruct",timeoutMs:16000,guidedJson:true},
  {model:"@cf/openai/gpt-oss-120b",timeoutMs:18000}
];
const CRITIC_SCHEMA={
  type:"object",
  properties:{
    ACCURACY_SCORE:{type:"number",minimum:0,maximum:10},
    EDITORIAL_INTELLIGENCE_SCORE:{type:"number",minimum:0,maximum:10},
    ORIGINALITY_SCORE:{type:"number",minimum:0,maximum:10},
    HOOK_SCORE:{type:"number",minimum:0,maximum:10},
    CLARITY_SCORE:{type:"number",minimum:0,maximum:10},
    USEFULNESS_SCORE:{type:"number",minimum:0,maximum:10},
    CHANNEL_FIT_SCORE:{type:"number",minimum:0,maximum:10},
    ISSUES:{type:"string"}
  },
  required:["ACCURACY_SCORE","EDITORIAL_INTELLIGENCE_SCORE","ORIGINALITY_SCORE","HOOK_SCORE","CLARITY_SCORE","USEFULNESS_SCORE","CHANNEL_FIT_SCORE","ISSUES"],
  additionalProperties:false
};
const text=v=>typeof v==="string"?v.trim():"";

function json(data,status=200,headersLike=null){const h=new Headers(headersLike||{});h.set("Content-Type","application/json;charset=UTF-8");h.set("Cache-Control","no-store");h.set("Access-Control-Allow-Origin","*");return new Response(JSON.stringify(data,null,2),{status,headers:h});}
function stageOf(body){const s=String(body?.context?.workerTask?.stage||"").toUpperCase();if(s==="MATERIAL"||s==="SCRIPT")return"SCRIPT";const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");return /(?:^|\n)STAGE:\s*(?:SCRIPT|MATERIAL)\b/i.test(joined)||/Material Creator|Scriptwriter AI/i.test(joined)?"SCRIPT":"";}
function cleanModelText(v){return text(v).replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/^```(?:json|text)?\s*|\s*```$/gi,"").trim();}
function partText(v){if(typeof v==="string")return text(v);if(Array.isArray(v))return v.map(partText).filter(Boolean).join("\n").trim();if(!v||typeof v!=="object")return"";for(const k of ["output_text","text","content","message"]){const out=partText(v[k]);if(out)return out;}return"";}
function modelText(r){
  if(typeof r==="string")return cleanModelText(r);
  if(!r||typeof r!=="object")return"";
  if(r.response&&typeof r.response==="object"&&!Array.isArray(r.response))return JSON.stringify(r.response);
  if(r.result?.response&&typeof r.result.response==="object"&&!Array.isArray(r.result.response))return JSON.stringify(r.result.response);
  const candidates=[r.response,r.output_text,r.text,r.choices?.[0]?.message?.content,r.choices?.[0]?.text,r.result?.response,r.result?.output_text,r.result?.text,r.result?.choices?.[0]?.message?.content,r.output,r.result?.output];
  for(const c of candidates){const out=partText(c);if(out)return cleanModelText(out);}
  return"";
}
function errorCode(e){return String(e?.message||e||"UNKNOWN").replace(/\s+/g," ").slice(0,220);}
function packetOf(body){const c=body?.context||{},p=c?.profile||{},rows=Array.isArray(c?.upstreamAssets)?c.upstreamAssets:[];const latest=stage=>rows.find(x=>String(x?.stage||"").toUpperCase()===stage&&text(x?.output));return{profile:{id:p.id||"",name:p.name||"",category:p.category||"",platform:p.platform||"",mission:p.mission||"",canon:p.canon||""},research:text(latest("RESEARCH")?.output).slice(0,18000),contexts:(Array.isArray(c?.contexts)?c.contexts:[]).filter(x=>x?.active!==false).slice(0,8).map(x=>({type:x?.type||"",title:x?.title||"",content:text(x?.content).slice(0,1800)}))};}
function cleanKey(v){return String(v||"").toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"");}
function criticObject(raw){const s=cleanModelText(raw);try{const o=JSON.parse(s);return o&&typeof o==="object"&&!Array.isArray(o)?o:null;}catch{return null;}}
function metric(raw,label){const obj=criticObject(raw);if(obj){for(const [k,v] of Object.entries(obj)){if(cleanKey(k)===cleanKey(label)){const n=Number(v);if(Number.isFinite(n))return Math.max(0,Math.min(10,n));}}}const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const m=String(raw||"").match(new RegExp(`["']?${escaped}["']?\\s*[:=]\\s*["']?(10(?:\\.0+)?|[0-9](?:\\.[0-9]+)?)`,`i`));return m?Math.max(0,Math.min(10,Number(m[1]))):null;}
function issueText(raw){const obj=criticObject(raw);if(obj){for(const [k,v] of Object.entries(obj)){if(cleanKey(k)==="ISSUES")return text(String(v)).slice(0,1200);}}const m=String(raw||"").match(/ISSUES\s*[:=]\s*([\s\S]*)/i);return text(m?.[1]).replace(/\s+/g," ").slice(0,1200);}
function scoreCritic(raw){const labels=["ACCURACY_SCORE","EDITORIAL_INTELLIGENCE_SCORE","ORIGINALITY_SCORE","HOOK_SCORE","CLARITY_SCORE","USEFULNESS_SCORE","CHANNEL_FIT_SCORE"],values={},missing=[];for(const label of labels){const n=metric(raw,label);if(n===null)missing.push(label);else values[label]=n;}if(missing.length){const err=new Error(`CRITIC_FORMAT_INVALID: missing ${missing.join(", ")}`);err.criticFormat={missing,preview:text(raw).slice(0,700)};throw err;}const s={accuracy:values.ACCURACY_SCORE,editorial:values.EDITORIAL_INTELLIGENCE_SCORE,originality:values.ORIGINALITY_SCORE,hook:values.HOOK_SCORE,clarity:values.CLARITY_SCORE,usefulness:values.USEFULNESS_SCORE,channelFit:values.CHANNEL_FIT_SCORE};const weighted=(s.accuracy*.25)+(s.editorial*.15)+(s.originality*.15)+(s.hook*.10)+(s.clarity*.10)+(s.usefulness*.10)+(s.channelFit*.15);return{scores:s,weighted:Number(weighted.toFixed(2)),gate:Number(Math.min(s.accuracy,weighted).toFixed(2)),issues:issueText(raw)};}
function normalizeMaterial(raw){let v=text(raw);if(v.length<300||/^\s*(?:FAIL|ERROR)\b/i.test(v))return"";if(/(?:^|\n)\s*PUBLIC_HEADLINE\s*:/i.test(v))return v;const h=v.match(/(?:^|\n)\s*(?:HEADLINE|TITLE|JUDUL)\s*:\s*(.+)/i)?.[1]||v.split(/\r?\n/).map(x=>x.replace(/^\s*[-*#>]+\s*/,"").trim()).find(x=>x.length>=12);return h?`PUBLIC_HEADLINE: ${h.slice(0,160)}\n${v}`:"";}
function recoveryMode(score){if(!score)return"PRIMARY_BUILD";if(score.scores?.accuracy<THRESHOLD)return"EVIDENCE_DISCIPLINE";if(score.scores?.originality<THRESHOLD||score.scores?.hook<THRESHOLD)return"ANGLE_REBUILD";return"TARGETED_EDITORIAL_REWRITE";}

async function runOne(env,spec,system,user,maxTokens,temperature,deadline,purpose){
  if(!env?.AI)throw new Error("AI_BINDING_UNAVAILABLE");
  const remaining=deadline-Date.now();if(remaining<MIN_CALL_WINDOW_MS)throw new Error("MODEL_STAGE_BUDGET_EXHAUSTED");
  const timeoutMs=Math.max(MIN_CALL_WINDOW_MS,Math.min(spec.timeoutMs,remaining-500));
  const req={messages:[{role:"system",content:system},{role:"user",content:user}],stream:false,temperature};
  if(spec.model==="@cf/zai-org/glm-4.7-flash"){req.max_completion_tokens=maxTokens;req.reasoning_effort="low";}else req.max_tokens=maxTokens;
  if(purpose==="critic"&&spec.guidedJson)req.guided_json=CRITIC_SCHEMA;
  let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`MODEL_TIMEOUT:${spec.model}`)),timeoutMs);});
  try{const raw=await Promise.race([env.AI.run(spec.model,req),timeout]);const out=modelText(raw);if(!out)throw new Error(`MODEL_EMPTY_OUTPUT:${spec.model}`);return{text:out,model:spec.model};}finally{clearTimeout(timer);}
}
async function runChain(env,specs,system,user,maxTokens,temperature,deadline,purpose){const failures=[];for(const spec of specs){if(deadline-Date.now()<MIN_CALL_WINDOW_MS)break;try{return{...(await runOne(env,spec,system,user,maxTokens,temperature,deadline,purpose)),failures};}catch(e){failures.push({model:spec.model,error:errorCode(e)});}}const err=new Error(`MODEL_CHAIN_EXHAUSTED: ${failures.map(x=>`${x.model}=${x.error}`).join(" | ")||"no callable model"}`);err.modelFailures=failures;throw err;}

async function writeMaterial(env,packet,baseReply,pass,prior,deadline){const mode=recoveryMode(prior);const system=[
  "You are KAI MASTER EDITORIAL DIRECTOR for ACC Studio.",
  "Produce publication-ready material, not a summary. Use a distinctive evidence-supported angle, strong opening, useful context and channel-specific voice.",
  "The minimum standard is 8.5/10 across accuracy, editorial intelligence, originality, hook, clarity, usefulness and channel fit.",
  "AUTHORITATIVE RESEARCH is the factual boundary. Never invent names, dates, numbers, quotes, causes, outcomes, forecasts or attribution.",
  "Transform facts into story logic: WHY IT MATTERS -> WHAT IS NEW/IMPORTANT -> HUMAN/INDUSTRY IMPACT -> MEMORABLE TAKEAWAY.",
  "Avoid generic AI phrases, filler, repetitive transitions, empty hype, listicle voice and vague conclusions.",
  mode==="EVIDENCE_DISCIPLINE"?"Accuracy was weak. Remove every implication not directly supported by research; prefer fewer stronger claims.":"",
  mode==="ANGLE_REBUILD"?"Hook/originality was weak. Replace the framing from first principles with a sharper evidence-supported angle.":"",
  mode==="TARGETED_EDITORIAL_REWRITE"?"Rebuild the critic-identified weak dimensions at root level, not cosmetically.":"",
  prior?.issues?`CRITIC FEEDBACK TO FIX: ${prior.issues}`:"",
  "OUTPUT: First line exactly PUBLIC_HEADLINE: <headline>. Then polished public-facing material only. No scores or internal notes."
].filter(Boolean).join("\n");const user=[`CHANNEL PROFILE:\n${JSON.stringify(packet.profile)}`,packet.contexts.length?`LOCKED CHANNEL CONTEXT:\n${JSON.stringify(packet.contexts)}`:"",`AUTHORITATIVE RESEARCH:\n${packet.research}`,baseReply?`OPTIONAL CORE DRAFT:\n${baseReply}`:"",`EDITORIAL PASS: ${pass}/${MAX_PASSES} | MODE: ${mode}`].filter(Boolean).join("\n\n");return runChain(env,DIRECTOR_MODELS,system,user,2300,pass===1?.46:.34,deadline,"director");}
async function critique(env,packet,candidate,deadline){const system=["You are a strict independent Editor-in-Chief.","Judge the actual public material against the supplied research and channel profile.","8.5 means genuinely publication-ready premium editorial work; do not inflate scores.","Accuracy must remain fully inside supplied research. Originality means non-generic framing, never invented facts.","Return only the required structured score object and concise ISSUES."].join("\n");const user=`CHANNEL:\n${JSON.stringify(packet.profile)}\n\nAUTHORITATIVE RESEARCH:\n${packet.research}\n\nMATERIAL:\n${candidate}`;return runChain(env,CRITIC_MODELS,system,user,1100,.05,deadline,"critic");}

async function buildMaterial(env,packet,baseReply,deadline){let best=null,lastDirectorModel=null,lastCriticModel=null,modelFailures=[];for(let pass=1;pass<=MAX_PASSES;pass++){if(deadline-Date.now()<MIN_CALL_WINDOW_MS)break;const prior=best;let written;try{written=await writeMaterial(env,packet,baseReply,pass,prior,deadline);lastDirectorModel=written.model;modelFailures.push(...written.failures);}catch(e){modelFailures.push(...(e?.modelFailures||[]));if(pass<MAX_PASSES)continue;e.modelFailures=modelFailures;throw e;}const candidate=normalizeMaterial(written.text);if(!candidate){modelFailures.push({model:lastDirectorModel||"DIRECTOR",error:"DIRECTOR_FORMAT_INVALID"});if(pass<MAX_PASSES)continue;const err=new Error("DIRECTOR_FORMAT_INVALID");err.modelFailures=modelFailures;throw err;}let judged;try{judged=await critique(env,packet,candidate,deadline);lastCriticModel=judged.model;modelFailures.push(...judged.failures);}catch(e){modelFailures.push(...(e?.modelFailures||[]));if(pass<MAX_PASSES)continue;e.modelFailures=modelFailures;throw e;}let score;try{score=scoreCritic(judged.text);}catch(e){modelFailures.push({model:lastCriticModel||"CRITIC",error:errorCode(e)});if(pass<MAX_PASSES)continue;e.modelFailures=modelFailures;throw e;}if(!best||score.gate>best.gate)best={...score,candidate,pass,directorModel:lastDirectorModel,criticModel:lastCriticModel};if(score.gate>=THRESHOLD)return{reply:candidate,meta:{revision:CREATIVE_PROOF_REVISION,runtimeRevision:RUNTIME_REVISION,role:"KAI_120B_DIRECTOR_LLAMA4_DETERMINISTIC_CRITIC",model:lastDirectorModel,primaryModel:DIRECTOR_MODELS[0].model,criticModel:lastCriticModel,threshold:THRESHOLD,boardPasses:pass,recoveryApplied:pass>1,recoveryMode:recoveryMode(prior),editorialScore:score.gate,weightedEditorialScore:score.weighted,dimensionScores:score.scores,criticIssues:score.issues,modelFailures}};}const err=new Error(`Deterministic editorial board blocked material (best ${Number(best?.gate||0).toFixed(1)}/10 after ${MAX_PASSES} passes)`);err.recovery={bestScore:best?.gate??null,lastScores:best?.scores||{},diagnostic:best?.issues||"QUALITY_BELOW_THRESHOLD",directorModel:best?.directorModel||lastDirectorModel||DIRECTOR_MODELS[0].model,criticModel:best?.criticModel||lastCriticModel||CRITIC_MODELS[0].model};err.modelFailures=modelFailures;throw err;}

async function health(request,env,ctx){const up=await baseWorker.fetch(request,env,ctx);let d={};try{d=await up.clone().json();}catch{}return json({...(d&&typeof d==="object"?d:{}),kaiMaterialDirector:"ACTIVE",kaiMaterialRevision:RUNTIME_REVISION,kaiMaterialDirectorModel:DIRECTOR_MODELS[0].model,kaiMaterialDirectorFallbacks:DIRECTOR_MODELS.slice(1).map(x=>x.model),kaiMaterialCriticModel:CRITIC_MODELS[0].model,kaiMaterialCriticFallbacks:CRITIC_MODELS.slice(1).map(x=>x.model),kaiMaterialCriticProtocol:"LLAMA4_GUIDED_JSON_PRIMARY",kaiMaterialThreshold:THRESHOLD,kaiMaterialPasses:MAX_PASSES,kaiMaterialStageBudgetMs:STAGE_BUDGET_MS},up.status,up.headers);}

export default{async fetch(request,env,ctx){const url=new URL(request.url);if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}if(stageOf(body)!=="SCRIPT")return baseWorker.fetch(request,env,ctx);const deadline=Date.now()+STAGE_BUDGET_MS;const upstream=await baseWorker.fetch(request,env,ctx);if(!upstream.ok)return upstream;let payload;try{payload=await upstream.clone().json();}catch{return upstream;}const baseReply=text(payload?.reply);try{const packet=packetOf(body);if(!packet.research)throw new Error("AUTHORITATIVE_RESEARCH_CONTEXT_MISSING");const refined=await buildMaterial(env,packet,baseReply,deadline);return json({...payload,ok:true,reply:refined.reply,provider:`${text(payload.provider)||"ACC OS X"} + GPT-OSS 120B / Llama 4 Deterministic Critic`,kaiCreative:refined.meta},200,upstream.headers);}catch(error){const r=error?.recovery&&typeof error.recovery==="object"?error.recovery:{};const c=error?.criticFormat&&typeof error.criticFormat==="object"?error.criticFormat:{};const failures=Array.isArray(error?.modelFailures)?error.modelFailures.slice(-10):[];const modelIo=/MODEL_(?:CHAIN|EMPTY|TIMEOUT|STAGE)|AI_BINDING|DIRECTOR_FORMAT|CRITIC_FORMAT/.test(String(error?.message||error));const status=modelIo?"KAI_MODEL_IO_BLOCKED":"KAI_BRAIN_QUALITY_BLOCKED";return json({ok:false,stage:"SCRIPT",status,error:`${status}: ${String(error?.message||error)}`,errorDetail:{code:status,revision:RUNTIME_REVISION,creativeProofRevision:CREATIVE_PROOF_REVISION,stage:"SCRIPT",recoveryAttempted:true,...r,...(Object.keys(c).length?{criticFormat:c}:{}),...(failures.length?{modelFailures:failures}:{}),message:String(error?.message||error)}},422,upstream.headers);}}};
