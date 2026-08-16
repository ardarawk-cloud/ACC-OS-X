// ACC OS X — BRAIN RUNTIME RESCUE V8
// Caption hardening above V7: recover C when legacy runtime touches a null series object.
// Preserves one-brain-per-division and uses the exact current K material.
import baseWorker from "./worker-brain-runtime-rescue-v7.js";
import {getProductionContract} from "./production-contracts-v1.js";
import {getDivisionPassport} from "./division-passports-v1.js";

const REVISION="BRAIN_RUNTIME_RESCUE_V8_CAPTION_NULL_SERIES_GUARD";
const FAST="@cf/meta/llama-4-scout-17b-16e-instruct";
const WRITER="@cf/openai/gpt-oss-120b";
const text=v=>typeof v==="string"?v.trim():"";

function json(data,status=200,headersLike=null){
  const h=new Headers(headersLike||{});
  h.set("Content-Type","application/json;charset=UTF-8");
  h.set("Cache-Control","no-store");
  h.set("Access-Control-Allow-Origin","*");
  return new Response(JSON.stringify(data),{status,headers:h});
}
function commandOf(b){return text(b?.context?.copilot?.command)||text((b?.messages||[]).slice(-1)[0]?.content);}
function opOf(b){return /^(c|caption)\b/i.test(commandOf(b))?"C":"";}
function isCopilot(b){const s=String(b?.context?.workerTask?.stage||"").toUpperCase();return s==="COPILOT"||s==="PRODUCE_COPILOT";}
async function dataOf(r){try{return await r.clone().json();}catch{return null;}}
async function timed(p,ms,label){let t;const q=new Promise((_,reject)=>{t=setTimeout(()=>reject(new Error(`${label}_TIMEOUT`)),ms);});try{return await Promise.race([p,q]);}finally{clearTimeout(t);}}
function brainId(id){return`acc-brain:${id}`;}
function brainSafe(body){
  const id=text(body?.context?.profile?.id);
  if(!id)return{ok:false,error:"SELECTED_DIVISION_MISSING"};
  const expected=brainId(id),incoming=text(body?.context?.brainLock?.brainId||body?.context?.masterRuntime?.brainId||body?.context?.copilot?.brainId),pkg=text(body?.context?.copilot?.packageChannelId);
  if(incoming&&incoming!==expected)return{ok:false,error:"BRAIN_ID_MISMATCH",id,expected,incoming};
  if(pkg&&pkg!==id)return{ok:false,error:"PACKAGE_CHANNEL_MISMATCH",id,expected,packageChannel:pkg};
  return{ok:true,id,expected};
}
function specOf(body,passport,contract){
  const mr=body?.context?.masterRuntime||{};
  let n=Number(mr.batchCount);
  if(!(n>=1&&n<=8))n=Number(passport?.batch?.count);
  if(!(n>=1&&n<=8))n=Number(contract?.batch?.count);
  if(!(n>=1&&n<=8))n=1;
  let series=Array.isArray(mr.series)?mr.series.map(text).filter(Boolean).slice(0,n):[];
  if(series.length!==n)series=Array.isArray(passport?.batch?.series)?passport.batch.series.map(text).filter(Boolean).slice(0,n):[];
  if(series.length!==n)series=Array.isArray(contract?.batch?.series)?contract.batch.series.map(text).filter(Boolean).slice(0,n):[];
  if(series.length!==n)series=[];
  return{n,series};
}
function itemMarks(source){
  const patterns=[
    /^\s*(?:#{1,6}\s*)?(?:\*{1,3}|_{1,3})?\s*ITEM\s+([1-8])\b[^\n]*$/gim,
    /^\s*(?:#{1,6}\s*)?(?:\*{1,3}|_{1,3})?\s*(?:KONTEN|CONTENT)\s+([1-8])\b[^\n]*$/gim
  ];
  for(const re of patterns){const m=[...source.matchAll(re)];if(m.length)return m;}
  return[];
}
function numberedMarks(source,n){const m=[...source.matchAll(/^\s*(?:#{1,6}\s*)?(?:\*{1,3}|_{1,3})?\s*([1-8])[\).:\-]\s+[^\n]+$/gim)];return m.length>=n?m:[];}
function splitMaterial(material,n){
  const source=text(material);if(!source)return[];if(n<=1)return[source];
  let marks=itemMarks(source);if(marks.length<n)marks=numberedMarks(source,n);if(marks.length<n)return[];
  const chosen=[],used=new Set();
  for(let want=1;want<=n;want++){const idx=marks.findIndex((m,i)=>!used.has(i)&&Number(m[1])===want);if(idx>=0){chosen.push(marks[idx]);used.add(idx);}}
  if(chosen.length!==n)chosen.splice(0,chosen.length,...marks.slice(0,n));
  chosen.sort((a,b)=>a.index-b.index);
  return chosen.map((m,i)=>text(source.slice(m.index,i+1<chosen.length?chosen[i+1].index:source.length))).filter(Boolean);
}
function contexts(body){return(Array.isArray(body?.context?.contexts)?body.context.contexts:[]).filter(x=>x?.active!==false).slice(0,16);}
function contextBlock(body){return contexts(body).map((x,i)=>`[${i+1}] ${text(x?.type)} | ${text(x?.title)}\n${text(x?.content).slice(0,6000)}`).join("\n\n---\n\n");}
function part(v){if(typeof v==="string")return text(v);if(Array.isArray(v))return v.map(part).filter(Boolean).join("\n");if(!v||typeof v!=="object")return"";for(const x of [v.output_text,v.text,v.response,v.content,v.message]){const y=part(x);if(y)return y;}return"";}
function modelText(r){if(typeof r==="string")return text(r);if(!r||typeof r!=="object")return"";for(const v of [r.response,r.output_text,r.text,r.choices?.[0]?.message?.content,r.choices?.[0]?.text,r.result?.response,r.result?.output_text,r.result?.text,r.output,r.result?.output]){const x=part(v);if(x)return x;}return"";}
async function runAI(env,system,user,maxTokens=2200){
  if(!env?.AI?.run)throw new Error("AI_BINDING_UNAVAILABLE");
  const failures=[];
  for(const model of [FAST,WRITER]){
    try{
      const raw=await timed(env.AI.run(model,{messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens:maxTokens,temperature:.38}),32000,"C_V8_AI");
      const out=modelText(raw);if(out)return{out,model};throw new Error("EMPTY_OUTPUT");
    }catch(e){failures.push(`${model}=${String(e?.message||e).slice(0,140)}`);}
  }
  throw new Error(`CAPTION_MODEL_CHAIN_EXHAUSTED:${failures.join("|")}`);
}
async function captionOne(env,body,profile,contract,item,label){
  const system=[
    "You are KAI Social Caption Director for exactly one ACC OS X division.",
    `HARD BRAIN LOCK: acc-brain:${profile.id}. Never import another channel's tone, series, workflow or canon.`,
    "Write only the final publish-ready caption. Do not expose internal rules, prompts, rescue versions or workflow commentary.",
    "Use only facts present in CURRENT K MATERIAL. Never invent dates, prices, venue details, quotes, statistics, product claims or credits.",
    `Channel: ${profile.name||profile.id}. Platform: ${profile.platform||"Facebook"}.`,
    label?`Series/label: ${label}.`:"",
    contract?.caption?.language?`Language contract: ${contract.caption.language}.`:"",
    contract?.caption?.prefix?`Required prefix/greeting: ${contract.caption.prefix}.`:"",
    "Include CTA/hashtags only when consistent with the selected channel master."
  ].filter(Boolean).join("\n");
  const user=[contextBlock(body)?`LOCKED MASTER CONTEXTS:\n${contextBlock(body)}`:"",`CURRENT K MATERIAL:\n${item}`,`OWNER COMMAND: ${commandOf(body)}`].filter(Boolean).join("\n\n");
  return runAI(env,system,user,2200);
}
async function recoverCaption(env,body,upstream){
  const safe=brainSafe(body);
  if(!safe.ok)return json({ok:false,stage:"COPILOT",status:"BRAIN_V8_BLOCKED",error:safe.error,detail:{revision:REVISION,...safe}},409);
  const material=text(body?.context?.copilot?.material);if(!material)return null;
  const id=safe.id,profile=body?.context?.profile||{},passport=getDivisionPassport(id),contract=getProductionContract(id),spec=specOf(body,passport,contract),items=splitMaterial(material,spec.n);
  if(items.length!==spec.n)return json({ok:false,stage:"COPILOT",status:"C_V8_MATERIAL_SHAPE_INVALID",error:`C_V8_REQUIRES_${spec.n}_MATERIAL_ITEM${spec.n===1?"":"S"}`,detail:{revision:REVISION,channelId:id,batchCount:spec.n,detectedItems:items.length}},422);
  const rows=[];
  for(let i=0;i<items.length;i++){
    const r=await captionOne(env,body,profile,contract,items[i],spec.series[i]||`Item ${i+1}`);
    rows.push({index:i+1,label:spec.series[i]||`Item ${i+1}`,caption:r.out,model:r.model});
  }
  const common={ok:true,stage:"COPILOT",op:"C",revision:REVISION,brainLock:{channelId:id,brainId:safe.expected,isolation:"HARD_1_TO_1",workflowAuthority:"CHANNEL_MASTER_LOCK",status:"VERIFIED"},masterRuntime:{...(body?.context?.masterRuntime||{}),batchCount:spec.n,series:spec.series,workflowAuthority:"LOCKED_CHANNEL_MASTER",globalEngineRole:"EXECUTION_ONLY",captionExecutionPath:"V8_NULL_SERIES_SAFE_RESCUE"},captionRescue:{trigger:text(upstream?.error||upstream?.status||"DOWNSTREAM_CAPTION_FAILURE").slice(0,220),topicPreserved:true,nullSeriesGuard:true,markdownItemParser:true}};
  if(spec.n===1)return json({...common,kind:"caption",reply:rows[0].caption,model:rows[0].model});
  return json({...common,kind:"caption_batch",reply:`${spec.n} caption ${profile.name||passport?.name||id} siap.`,captions:rows.map(({index,label,caption})=>({index,label,caption}))});
}
async function health(request,env,ctx){const r=await baseWorker.fetch(request,env,ctx);let d={};try{d=await r.clone().json();}catch{}return json({...d,brainRuntimeRescueV8:"ACTIVE",brainRuntimeRescueV8Revision:REVISION,captionNullSeriesGuard:"ACTIVE",captionMarkdownItemParser:"ACTIVE"},r.status,r.headers);}

export default{async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(request.method==="GET"&&url.pathname==="/health")return health(request,env,ctx);
  if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);
  let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
  const upstreamResponse=await baseWorker.fetch(request,env,ctx);
  if(!isCopilot(body)||opOf(body)!=="C")return upstreamResponse;
  const upstream=await dataOf(upstreamResponse);
  if(upstreamResponse.ok&&upstream?.ok!==false)return upstreamResponse;
  const msg=String(upstream?.error||upstream?.status||"");
  if(/MATERIAL_REQUIRED_BEFORE_CAPTION/i.test(msg))return upstreamResponse;
  try{return await recoverCaption(env,body,upstream)||upstreamResponse;}
  catch(error){return json({ok:false,stage:"COPILOT",status:"C_V8_RESCUE_FAILED",error:String(error?.message||error),detail:{revision:REVISION,channelId:text(body?.context?.profile?.id),originalError:msg.slice(0,220)}},422,upstreamResponse.headers);}
}};
