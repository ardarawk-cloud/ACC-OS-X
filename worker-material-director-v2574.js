// ACC OS X — BUILD 257.4 RESILIENT MODEL I/O MATERIAL DIRECTOR
// SCRIPT/MATERIAL-only reliability hardening around GPT-OSS 120B.
// Normalizes Workers AI Chat Completions, text response and Responses API output shapes.
// Strict 8.5 publication threshold remains fail-closed. Poster/publishing paths are untouched.

import baseWorker from "./worker-stage-normalizer.js";

const RUNTIME_REVISION="BUILD257_4_RESILIENT_MODEL_IO";
const CREATIVE_PROOF_REVISION="BUILD257_KAI_AUTONOMOUS_QUALITY_RECOVERY";
const DIRECTOR_MODELS=[
  {model:"@cf/openai/gpt-oss-120b",timeoutMs:22000},
  {model:"@cf/qwen/qwen3-30b-a3b-fp8",timeoutMs:12000},
  {model:"@cf/zai-org/glm-4.7-flash",timeoutMs:9000}
];
const CRITIC_MODELS=[
  {model:"@cf/zai-org/glm-4.7-flash",timeoutMs:12000},
  {model:"@cf/qwen/qwen3-30b-a3b-fp8",timeoutMs:8000}
];
const THRESHOLD=8.5;
const MAX_PASSES=2;
const STAGE_BUDGET_MS=145000;
const MIN_CALL_WINDOW_MS=4500;
const text=v=>typeof v==="string"?v.trim():"";

function json(data,status=200,headersLike=null){const h=new Headers(headersLike||{});h.set("Content-Type","application/json;charset=UTF-8");h.set("Cache-Control","no-store");h.set("Access-Control-Allow-Origin","*");return new Response(JSON.stringify(data,null,2),{status,headers:h});}
function stageOf(body){const s=String(body?.context?.workerTask?.stage||"").toUpperCase();if(s==="MATERIAL"||s==="SCRIPT")return"SCRIPT";const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");return /(?:^|\n)STAGE:\s*(?:SCRIPT|MATERIAL)\b/i.test(joined)||/Material Creator|Scriptwriter AI/i.test(joined)?"SCRIPT":"";}

function partText(v){
  if(typeof v==="string")return text(v);
  if(Array.isArray(v))return v.map(partText).filter(Boolean).join("\n").trim();
  if(!v||typeof v!=="object")return"";
  const direct=[v.output_text,v.text,v.response];
  for(const item of direct){const out=partText(item);if(out)return out;}
  if(v.type==="output_text"||v.type==="text"){const out=partText(v.text||v.content);if(out)return out;}
  const content=partText(v.content);if(content)return content;
  const message=partText(v.message);if(message)return message;
  return"";
}
function modelText(r){
  if(typeof r==="string")return cleanModelText(r);
  if(!r||typeof r!=="object")return"";
  const candidates=[
    r.response,r.output_text,r.text,
    r.choices?.[0]?.message?.content,
    r.choices?.[0]?.text,
    r.result?.response,r.result?.output_text,r.result?.text,
    r.result?.choices?.[0]?.message?.content,
    r.output,
    r.result?.output
  ];
  for(const candidate of candidates){const out=partText(candidate);if(out)return cleanModelText(out);}
  return"";
}
function cleanModelText(v){return text(v).replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/^```(?:json|text)?\s*|\s*```$/gi,"").trim();}
function errorCode(error){return String(error?.message||error||"UNKNOWN").replace(/\s+/g," ").slice(0,180);}

async function runOne(env,spec,system,user,max_tokens,temperature,deadline){
  if(!env?.AI)throw new Error("AI_BINDING_UNAVAILABLE");
  const remaining=deadline-Date.now();
  if(remaining<MIN_CALL_WINDOW_MS)throw new Error("MODEL_STAGE_BUDGET_EXHAUSTED");
  const timeoutMs=Math.max(MIN_CALL_WINDOW_MS,Math.min(spec.timeoutMs,remaining-500));
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`MODEL_TIMEOUT:${spec.model}`)),timeoutMs);});
  try{
    const raw=await Promise.race([
      env.AI.run(spec.model,{messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens,temperature}),
      timeout
    ]);
    const out=modelText(raw);
    if(!out)throw new Error(`MODEL_EMPTY_OUTPUT:${spec.model}`);
    return{text:out,model:spec.model};
  }finally{clearTimeout(timer);}
}
async function runChain(env,specs,system,user,max_tokens,temperature,deadline){
  const failures=[];
  for(const spec of specs){
    if(deadline-Date.now()<MIN_CALL_WINDOW_MS)break;
    try{return{...(await runOne(env,spec,system,user,max_tokens,temperature,deadline)),failures};}
    catch(error){failures.push({model:spec.model,error:errorCode(error)});}
  }
  const err=new Error(`MODEL_CHAIN_EXHAUSTED: ${failures.map(x=>`${x.model}=${x.error}`).join(" | ")||"no callable model"}`);
  err.modelFailures=failures;
  throw err;
}

function packetOf(body){const c=body?.context||{},p=c?.profile||{},rows=Array.isArray(c?.upstreamAssets)?c.upstreamAssets:[];const latest=stage=>rows.find(x=>String(x?.stage||"").toUpperCase()===stage&&text(x?.output));return{profile:{id:p.id||"",name:p.name||"",category:p.category||"",platform:p.platform||"",mission:p.mission||"",canon:p.canon||""},research:text(latest("RESEARCH")?.output).slice(0,18000),contexts:(Array.isArray(c?.contexts)?c.contexts:[]).filter(x=>x?.active!==false).slice(0,8).map(x=>({type:x?.type||"",title:x?.title||"",content:text(x?.content).slice(0,1800)}))};}
function cleanKey(v){return String(v||"").toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_+|_+$/g,"");}
function criticObject(raw){const s=text(raw).replace(/^```(?:json)?\s*|\s*```$/gi,"");try{const o=JSON.parse(s);return o&&typeof o==="object"&&!Array.isArray(o)?o:null;}catch{return null;}}
function metric(raw,label){const obj=criticObject(raw);if(obj){for(const [k,v] of Object.entries(obj)){if(cleanKey(k)===cleanKey(label)){const n=Number(v);if(Number.isFinite(n))return Math.max(0,Math.min(10,n));}}}const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");const m=String(raw||"").match(new RegExp(`["']?${escaped}["']?\\s*[:=]\\s*["']?(10(?:\\.0+)?|[0-9](?:\\.[0-9]+)?)`,`i`));return m?Math.max(0,Math.min(10,Number(m[1]))):null;}
function issueText(raw){const obj=criticObject(raw);if(obj){for(const [k,v] of Object.entries(obj)){if(cleanKey(k)==="ISSUES")return text(Array.isArray(v)?v.join("; "):String(v)).slice(0,1200);}}const m=String(raw||"").match(/ISSUES\s*[:=]\s*([\s\S]*)/i);return text(m?.[1]).replace(/\s+/g," ").slice(0,1200);}
function scoreCritic(raw){const labels=["ACCURACY_SCORE","EDITORIAL_INTELLIGENCE_SCORE","ORIGINALITY_SCORE","HOOK_SCORE","CLARITY_SCORE","USEFULNESS_SCORE","CHANNEL_FIT_SCORE"],values={},missing=[];for(const label of labels){const n=metric(raw,label);if(n===null)missing.push(label);else values[label]=n;}if(missing.length){const err=new Error(`CRITIC_FORMAT_INVALID: missing ${missing.join(", ")}`);err.criticFormat={missing,preview:text(raw).slice(0,600)};throw err;}const s={accuracy:values.ACCURACY_SCORE,editorial:values.EDITORIAL_INTELLIGENCE_SCORE,originality:values.ORIGINALITY_SCORE,hook:values.HOOK_SCORE,clarity:values.CLARITY_SCORE,usefulness:values.USEFULNESS_SCORE,channelFit:values.CHANNEL_FIT_SCORE};const weighted=(s.accuracy*.25)+(s.editorial*.15)+(s.originality*.15)+(s.hook*.10)+(s.clarity*.10)+(s.usefulness*.10)+(s.channelFit*.15);return{scores:s,weighted:Number(weighted.toFixed(2)),gate:Number(Math.min(s.accuracy,weighted).toFixed(2)),issues:issueText(raw)};}
function normalizeMaterial(raw){let v=text(raw);if(v.length<300||/^\s*(?:FAIL|ERROR)\b/i.test(v))return"";if(/(?:^|\n)\s*PUBLIC_HEADLINE\s*:/i.test(v))return v;const h=v.match(/(?:^|\n)\s*(?:HEADLINE|TITLE|JUDUL)\s*:\s*(.+)/i)?.[1]||v.split(/\r?\n/).map(x=>x.replace(/^\s*[-*#>]+\s*/,"").trim()).find(x=>x.length>=12);return h?`PUBLIC_HEADLINE: ${h.slice(0,160)}\n${v}`:"";}
function recoveryMode(score){if(!score)return"PRIMARY_BUILD";if(score.scores?.accuracy<THRESHOLD)return"EVIDENCE_DISCIPLINE";if(score.scores?.originality<THRESHOLD||score.scores?.hook<THRESHOLD)return"ANGLE_REBUILD";return"TARGETED_EDITORIAL_REWRITE";}

async function writeMaterial(env,packet,baseReply,pass,prior,deadline){const mode=recoveryMode(prior);const system=[
  "You are KAI MASTER EDITORIAL DIRECTOR, the senior human-level content editor for ACC Studio.",
  "Create publication-ready material, not a summary. Lead with a distinctive evidence-supported angle and a strong human reason to care.",
  "The minimum publication standard is 8.5/10 across accuracy, editorial intelligence, originality, hook, clarity, usefulness and channel fit.",
  "AUTHORITATIVE RESEARCH is the factual boundary. Never invent names, dates, numbers, quotes, causes, outcomes, forecasts or attribution.",
  "Transform verified facts into original story logic: WHY IT MATTERS -> WHAT IS NEW/IMPORTANT -> HUMAN/INDUSTRY IMPACT -> MEMORABLE TAKEAWAY.",
  "Avoid generic AI phrases, filler, repetitive transitions, empty hype, listicle voice and vague conclusions.",
  "Every paragraph must add a new verified fact, useful interpretation, or concrete relevance. Prefer specificity over breadth.",
  "Preserve the locked channel mission/canon and natural public language implied by the channel context.",
  mode==="EVIDENCE_DISCIPLINE"?"Previous weakness was accuracy. Remove every implication not directly supported by research; prefer fewer stronger claims.":"",
  mode==="ANGLE_REBUILD"?"Previous weakness was hook/originality. Discard the old framing completely and choose a sharper evidence-supported angle.":"",
  mode==="TARGETED_EDITORIAL_REWRITE"?"Use the critic feedback to rebuild weak dimensions at root level rather than cosmetically rephrasing.":"",
  prior?.issues?`CRITIC FEEDBACK TO FIX: ${prior.issues}`:"",
  "OUTPUT RULES: First line exactly PUBLIC_HEADLINE: <headline>. Then polished public-facing material only. No internal notes, no scores, no research-process narration."
].filter(Boolean).join("\n");const user=[`CHANNEL PROFILE:\n${JSON.stringify(packet.profile)}`,packet.contexts.length?`LOCKED CHANNEL CONTEXT:\n${JSON.stringify(packet.contexts)}`:"",`AUTHORITATIVE RESEARCH:\n${packet.research}`,baseReply?`OPTIONAL CORE DRAFT (replace freely if weak):\n${baseReply}`:"",`EDITORIAL PASS: ${pass}/${MAX_PASSES} | MODE: ${mode}`].filter(Boolean).join("\n\n");return runChain(env,DIRECTOR_MODELS,system,user,2200,pass===1?.48:.36,deadline);}
async function critique(env,packet,candidate,deadline){const system=["You are a strict independent Editor-in-Chief. Judge actual public material, not formatting.","8.5 means genuinely publication-ready premium editorial work; do not inflate scores.","Accuracy must remain fully inside supplied research. Originality means non-generic framing, not invented facts.","Return ONE compact JSON object only with numeric keys ACCURACY_SCORE, EDITORIAL_INTELLIGENCE_SCORE, ORIGINALITY_SCORE, HOOK_SCORE, CLARITY_SCORE, USEFULNESS_SCORE, CHANNEL_FIT_SCORE and a short ISSUES string."].join("\n");const user=`CHANNEL:\n${JSON.stringify(packet.profile)}\n\nAUTHORITATIVE RESEARCH:\n${packet.research}\n\nMATERIAL:\n${candidate}`;return runChain(env,CRITIC_MODELS,system,user,700,.05,deadline);}

async function buildMaterial(env,packet,baseReply,deadline){let best=null,lastDirectorModel=null,lastCriticModel=null,modelFailures=[];for(let pass=1;pass<=MAX_PASSES;pass++){if(deadline-Date.now()<MIN_CALL_WINDOW_MS)break;const prior=best;let written;try{written=await writeMaterial(env,packet,baseReply,pass,prior,deadline);lastDirectorModel=written.model;modelFailures.push(...written.failures);}catch(error){modelFailures.push(...(error?.modelFailures||[]));if(pass<MAX_PASSES)continue;error.modelFailures=modelFailures;throw error;}const candidate=normalizeMaterial(written.text);if(!candidate){modelFailures.push({model:lastDirectorModel||"DIRECTOR",error:"DIRECTOR_FORMAT_INVALID"});if(pass<MAX_PASSES)continue;const err=new Error("DIRECTOR_FORMAT_INVALID");err.modelFailures=modelFailures;throw err;}let judged;try{judged=await critique(env,packet,candidate,deadline);lastCriticModel=judged.model;modelFailures.push(...judged.failures);}catch(error){modelFailures.push(...(error?.modelFailures||[]));if(pass<MAX_PASSES)continue;error.modelFailures=modelFailures;throw error;}const score=scoreCritic(judged.text);if(!best||score.gate>best.gate)best={...score,candidate,pass,directorModel:lastDirectorModel,criticModel:lastCriticModel};if(score.gate>=THRESHOLD)return{reply:candidate,meta:{revision:CREATIVE_PROOF_REVISION,runtimeRevision:RUNTIME_REVISION,role:"KAI_RESILIENT_120B_MASTER_EDITORIAL_DIRECTOR",model:lastDirectorModel||DIRECTOR_MODELS[0].model,primaryModel:DIRECTOR_MODELS[0].model,criticModel:lastCriticModel||CRITIC_MODELS[0].model,threshold:THRESHOLD,boardPasses:pass,recoveryApplied:pass>1,recoveryMode:recoveryMode(prior),editorialScore:score.gate,weightedEditorialScore:score.weighted,dimensionScores:score.scores,criticIssues:score.issues,modelFailures}};}const err=new Error(`Resilient editorial board blocked material (best ${Number(best?.gate||0).toFixed(1)}/10 after ${MAX_PASSES} passes)`);err.recovery={bestScore:best?.gate??null,lastScores:best?.scores||{},diagnostic:best?.issues||"QUALITY_BELOW_THRESHOLD",directorModel:best?.directorModel||lastDirectorModel||DIRECTOR_MODELS[0].model,criticModel:best?.criticModel||lastCriticModel||CRITIC_MODELS[0].model};err.modelFailures=modelFailures;throw err;}

async function health(request,env,ctx){const up=await baseWorker.fetch(request,env,ctx);let d={};try{d=await up.clone().json();}catch{}return json({...(d&&typeof d==="object"?d:{}),kaiMaterialDirector:"ACTIVE",kaiMaterialRevision:RUNTIME_REVISION,kaiMaterialDirectorModel:DIRECTOR_MODELS[0].model,kaiMaterialDirectorFallbacks:DIRECTOR_MODELS.slice(1).map(x=>x.model),kaiMaterialCriticModel:CRITIC_MODELS[0].model,kaiMaterialCriticFallbacks:CRITIC_MODELS.slice(1).map(x=>x.model),kaiMaterialThreshold:THRESHOLD,kaiMaterialPasses:MAX_PASSES,kaiMaterialStageBudgetMs:STAGE_BUDGET_MS,kaiMaterialResponseAdapter:"CHAT_COMPLETIONS_TEXT_RESPONSES_API_CONTENT_PARTS",kaiMaterialFallbackPolicy:"EMPTY_TIMEOUT_ERROR_ARE_RETRYABLE_WITHIN_STAGE_BUDGET"},up.status,up.headers);}

export default{async fetch(request,env,ctx){const url=new URL(request.url);if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}if(stageOf(body)!=="SCRIPT")return baseWorker.fetch(request,env,ctx);const deadline=Date.now()+STAGE_BUDGET_MS;const upstream=await baseWorker.fetch(request,env,ctx);if(!upstream.ok)return upstream;let payload;try{payload=await upstream.clone().json();}catch{return upstream;}const baseReply=text(payload?.reply);try{const packet=packetOf(body);if(!packet.research)throw new Error("AUTHORITATIVE_RESEARCH_CONTEXT_MISSING");const refined=await buildMaterial(env,packet,baseReply,deadline);return json({...payload,ok:true,reply:refined.reply,provider:`${text(payload.provider)||"ACC OS X"} + Resilient GPT-OSS 120B Material Director`,kaiCreative:refined.meta},200,upstream.headers);}catch(error){const r=error?.recovery&&typeof error.recovery==="object"?error.recovery:{};const c=error?.criticFormat&&typeof error.criticFormat==="object"?error.criticFormat:{};const failures=Array.isArray(error?.modelFailures)?error.modelFailures.slice(-8):[];const modelIo=/MODEL_(?:CHAIN|EMPTY|TIMEOUT|STAGE)|AI_BINDING|DIRECTOR_FORMAT/.test(String(error?.message||error));const status=modelIo?"KAI_MODEL_IO_BLOCKED":"KAI_BRAIN_QUALITY_BLOCKED";return json({ok:false,stage:"SCRIPT",status,error:`${status}: ${String(error?.message||error)}`,errorDetail:{code:status,revision:RUNTIME_REVISION,creativeProofRevision:CREATIVE_PROOF_REVISION,stage:"SCRIPT",recoveryAttempted:true,...r,...(Object.keys(c).length?{criticFormat:c}:{}),...(failures.length?{modelFailures:failures}:{}),message:String(error?.message||error)}},422,upstream.headers);}}};