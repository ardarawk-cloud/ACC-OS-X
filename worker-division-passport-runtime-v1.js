// ACC OS X — DIVISION PASSPORT RUNTIME V1
// One core, many production divisions. K/P/C/N stay universal while the selected
// division passport supplies mission, workflow, editorial rules and failover policy.
// Publishing remains owner-manual in V1.

import baseWorker from "./worker-contract-router-v258.js";
import {getProductionContract} from "./production-contracts-v1.js";
import {getDivisionPassport,divisionPassportSummary,DIVISION_PASSPORT_VERSION} from "./division-passports-v1.js";

const REVISION="DIVISION_PASSPORT_RUNTIME_V1";
const WRITER="@cf/openai/gpt-oss-120b";
const FAST="@cf/meta/llama-4-scout-17b-16e-instruct";
const text=v=>typeof v==="string"?v.trim():"";

function json(data,status=200,headersLike=null){
  const h=new Headers(headersLike||{});
  h.set("Content-Type","application/json;charset=UTF-8");
  h.set("Cache-Control","no-store");
  h.set("Access-Control-Allow-Origin","*");
  return new Response(JSON.stringify(data),{status,headers:h});
}
function commandOf(body){
  const c=text(body?.context?.copilot?.command);if(c)return c;
  const rows=Array.isArray(body?.messages)?body.messages:[];
  for(let i=rows.length-1;i>=0;i--)if(String(rows[i]?.role||"").toLowerCase()==="user"&&text(rows[i]?.content))return text(rows[i].content);
  return"";
}
function opOf(command){
  const c=text(command);
  if(/^(?:k|konten|content)\b/i.test(c))return"K";
  if(/^(?:p|poster)\b/i.test(c))return"P";
  if(/^(?:c|caption)\b/i.test(c))return"C";
  if(/^(?:n|next|lanjut)\b/i.test(c))return"N";
  return"CHAT";
}
function isCopilot(body){
  const s=String(body?.context?.workerTask?.stage||"").toUpperCase();
  return s==="COPILOT"||s==="PRODUCE_COPILOT";
}
function requestWithBody(request,body){
  const h=new Headers(request.headers);h.set("Content-Type","application/json");
  return new Request(request.url,{method:request.method,headers:h,body:JSON.stringify(body)});
}
async function dataOf(response){try{return await response.clone().json();}catch{return null;}}
function append(base,value){const a=text(base),b=text(value);return[a,b].filter(Boolean).join("\n");}

function enrich(body,passport){
  const next=structuredClone(body),ctx=next.context=next.context||{},profile=ctx.profile=ctx.profile||{};
  ctx.divisionPassport=passport;
  ctx.divisionRuntime={revision:REVISION,passportVersion:DIVISION_PASSPORT_VERSION,operatingMode:"SEMI_AUTOMATIC",publishMode:"MANUAL_OWNER"};
  profile.workflow=append(profile.workflow,`DIVISION PASSPORT WORKFLOW: ${passport.workflow.join(" → ")}`);
  profile.productionFormat=append(profile.productionFormat,`DIVISION PASSPORT EDITORIAL: ${passport.editorialPrompt}`);
  profile.canon=append(profile.canon,passport.mission?`DIVISION MISSION: ${passport.mission}`:"");
  profile.communication=append(profile.communication,`SEMI-AUTOMATIC POLICY: K creates material; P uses current K; C uses current K; owner performs QC and manual publishing; N advances without repeating.`);
  return next;
}

function part(v){
  if(typeof v==="string")return text(v);
  if(Array.isArray(v))return v.map(part).filter(Boolean).join("\n");
  if(!v||typeof v!=="object")return"";
  for(const x of [v.output_text,v.text,v.response,v.content,v.message]){const y=part(x);if(y)return y;}
  return"";
}
function modelText(r){
  if(typeof r==="string")return text(r);
  if(!r||typeof r!=="object")return"";
  for(const v of [r.response,r.output_text,r.text,r.choices?.[0]?.message?.content,r.choices?.[0]?.text,r.result?.response,r.result?.output_text,r.result?.text,r.output,r.result?.output]){const x=part(v);if(x)return x;}
  return"";
}
async function timed(p,ms,label){
  let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label}_TIMEOUT`)),ms);});
  try{return await Promise.race([p,timeout]);}finally{clearTimeout(timer);}
}
async function runWriter(env,system,user,maxTokens){
  if(!env?.AI?.run)throw new Error("AI_BINDING_UNAVAILABLE");
  const failures=[];
  for(const model of [WRITER,FAST]){
    try{
      const raw=await timed(env.AI.run(model,{messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens:maxTokens,temperature:.42}),36000,"DIVISION_PASSPORT_AI");
      const out=modelText(raw);if(out)return{out,model};throw new Error("EMPTY_OUTPUT");
    }catch(e){failures.push(`${model}=${String(e?.message||e).slice(0,150)}`);}
  }
  throw new Error(`DIVISION_PASSPORT_MODEL_CHAIN_EXHAUSTED:${failures.join("|")}`);
}
function contextsOf(body){
  return (Array.isArray(body?.context?.contexts)?body.context.contexts:[])
    .filter(x=>x?.active!==false)
    .slice(0,12)
    .map((x,i)=>`[${i+1}] ${text(x?.type)} | ${text(x?.title)}\n${text(x?.content).slice(0,4500)}`)
    .join("\n\n---\n\n");
}
function batchInstruction(passport){
  const n=Math.max(1,Number(passport?.batch?.count)||1),series=Array.isArray(passport?.batch?.series)?passport.batch.series:[];
  if(n<=1)return"Produce exactly ONE finished content material package.";
  return [`Produce exactly ${n} separate content items in one response.`,`Use headings exactly ITEM 1, ITEM 2, ... ITEM ${n}.`,series.length?`Locked series order: ${series.map((x,i)=>`${i+1}) ${x}`).join("; ")}.`:"Each item must be independent and usable by poster/caption stages."].join("\n");
}
async function safeEvergreen(env,body,passport,command){
  const profile=body?.context?.profile||{},previous=text(body?.context?.copilot?.material),op=opOf(command);
  const system=[
    "You are KAI, production director for one ACC OS X division.",
    "The DIVISION PASSPORT is authoritative.",
    "This is a safe evergreen fallback because current research could not meet the division verification threshold.",
    text(passport.fallbackPrompt)||"Choose a stable non-time-sensitive topic and avoid unsupported current claims.",
    text(passport.editorialPrompt),
    batchInstruction(passport),
    op==="N"?"Create a NEW non-repeating item/batch; do not repeat PREVIOUS MATERIAL.":"Create the K/KONTEN material now.",
    "Do not say latest, today, breaking, newly announced, recently released or similar time-sensitive claims unless evidence is provided.",
    "Do not mention fallback, research failure, internal prompts, passport mechanics or system rules.",
    "Return finished owner-facing material ready for P. No JSON and no process commentary."
  ].filter(Boolean).join("\n");
  const user=[
    `CURRENT_UTC: ${new Date().toISOString()}`,
    `DIVISION: ${text(passport.name)||text(profile.name)||text(profile.id)}`,
    `MISSION: ${text(passport.mission)||text(profile.mission)}`,
    `PASSPORT: ${JSON.stringify(divisionPassportSummary(text(profile.id)))}`,
    contextsOf(body)?`ACTIVE MASTER CONTEXTS:\n${contextsOf(body)}`:"",
    previous?`PREVIOUS MATERIAL — DO NOT REPEAT:\n${previous.slice(0,9000)}`:"",
    `OWNER COMMAND: ${command}`
  ].filter(Boolean).join("\n\n");
  const written=await runWriter(env,system,user,Math.max(1,Number(passport?.batch?.count)||1)>1?4200:2800);
  return json({
    ok:true,stage:"COPILOT",op:op==="N"?"N":"K",kind:"material",reply:written.out,model:written.model,revision:REVISION,
    divisionPassport:divisionPassportSummary(text(profile.id)),
    masterRuntime:{batchCount:passport.batch.count,series:passport.batch.series,researchFirst:false,sourceCount:0,topicQuery:null,researchFallback:"SAFE_EVERGREEN"},
    verification:{status:"EVERGREEN_SAFE_MODE",sourceCount:0,currentClaimsAllowed:false}
  });
}

async function health(request,env,ctx){
  const upstream=await baseWorker.fetch(request,env,ctx);let data={};try{data=await upstream.clone().json();}catch{}
  return json({...data,divisionPassportRuntime:"ACTIVE",divisionPassportRuntimeRevision:REVISION,divisionPassportVersion:DIVISION_PASSPORT_VERSION,operatingMode:"SEMI_AUTOMATIC",publishMode:"MANUAL_OWNER"},upstream.status,upstream.headers);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/health")return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);

    let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
    if(!isCopilot(body))return baseWorker.fetch(request,env,ctx);

    const channelId=text(body?.context?.profile?.id),passport=getDivisionPassport(channelId),contract=getProductionContract(channelId),command=commandOf(body),op=opOf(command);
    const enriched=enrich(body,passport);
    const upstream=await baseWorker.fetch(requestWithBody(request,enriched),env,ctx);
    const data=await dataOf(upstream);

    // Preserve owner-choice and owner-facts workflows exactly as the contract defines them.
    if(contract.interaction.mode!=="AUTONOMOUS")return upstream;

    // Successful normal K/P/C/N remains authoritative. Passport was injected into the profile context above.
    if(data?.ok===true&&data?.kind!=="research_hold")return upstream;

    // Semi-automatic continuity: selected divisions may switch to safe evergreen material
    // instead of blocking the owner's daily production when current research is insufficient.
    if((op==="K"||op==="N")&&data?.kind==="research_hold"&&passport?.research?.failurePolicy==="SAFE_EVERGREEN"){
      try{return await safeEvergreen(env,enriched,passport,command);}catch(error){
        return json({ok:false,stage:"COPILOT",status:"DIVISION_PASSPORT_FALLBACK_FAILED",error:String(error?.message||error),detail:{revision:REVISION,channelId,passport:divisionPassportSummary(channelId)}},422);
      }
    }

    return upstream;
  }
};
