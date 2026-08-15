// ACC OS X — DIVISION PASSPORT RUNTIME V1 R3
// One core, many production divisions. K/P/C/N stay universal while each selected
// division passport owns mission, workflow, editorial rules and research failover.
// Publishing remains owner-manual.

import baseWorker from "./worker-contract-router-v258.js";
import {getProductionContract} from "./production-contracts-v1.js";
import {getDivisionPassport,DIVISION_PASSPORT_VERSION} from "./division-passports-v1.js";

const REVISION="DIVISION_PASSPORT_RUNTIME_V1_R3_PUBLISHER_METADATA_RECOVERY";
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

function effectiveResearch(passport,contract){
  const p=passport?.research||{},c=contract?.research||{};
  const minSources=Math.max(0,Number(p.minSources??c.publishMinSources??0)||0);
  const targetSources=Math.max(minSources,Number(p.targetSources??c.targetSources??minSources)||0);
  const evergreenFallback=Boolean(p.evergreenFallback||c.fallbackToEvergreen);
  let failurePolicy=text(p.failurePolicy).toUpperCase();
  if(evergreenFallback)failurePolicy="SAFE_EVERGREEN";
  else if(minSources===0&&!contract?.publish?.requireVerifiedEvidence)failurePolicy="CONTINUE";
  else if(!failurePolicy)failurePolicy="HOLD";
  return {mode:text(p.mode||c.mode||"NONE"),minSources,targetSources,failurePolicy,evergreenFallback};
}
function runtimeSummary(channelId,passport,contract){
  const research=effectiveResearch(passport,contract);
  return {channelId,name:passport?.name||channelId,version:passport?.version||DIVISION_PASSPORT_VERSION,operatingMode:passport?.operatingMode||"SEMI_AUTOMATIC",workflow:passport?.workflow||[],researchMode:research.mode,researchFailurePolicy:research.failurePolicy,researchMinSources:research.minSources,researchTargetSources:research.targetSources,batchCount:passport?.batch?.count||contract?.batch?.count||1,publishMode:passport?.publish?.mode||"MANUAL_OWNER"};
}
function effectivePassport(passport,contract){return {...passport,research:effectiveResearch(passport,contract)};}
function enrich(body,passport,contract,recoveryAttempt=0){
  const next=structuredClone(body),ctx=next.context=next.context||{},profile=ctx.profile=ctx.profile||{},effective=effectivePassport(passport,contract);
  ctx.divisionPassport=effective;
  ctx.divisionRuntime={revision:REVISION,passportVersion:DIVISION_PASSPORT_VERSION,operatingMode:"SEMI_AUTOMATIC",publishMode:"MANUAL_OWNER",workflowAuthority:"DIVISION_PASSPORT",researchFailurePolicy:effective.research.failurePolicy};
  profile.workflow=append(profile.workflow,`DIVISION PASSPORT WORKFLOW: ${(effective.workflow||[]).join(" → ")}`);
  profile.productionFormat=append(profile.productionFormat,`DIVISION PASSPORT EDITORIAL: ${effective.editorialPrompt||""}`);
  profile.canon=append(profile.canon,effective.mission?`DIVISION MISSION: ${effective.mission}`:"");
  profile.communication=append(profile.communication,"SEMI-AUTOMATIC POLICY: K creates material; P uses current K; C uses current K; owner performs QC and manual publishing; N advances without repeating.");
  if(recoveryAttempt>0)profile.workflow=append(profile.workflow,`AUTO RESEARCH RECOVERY ${recoveryAttempt}: do not wait for owner; use publisher-metadata corroboration and require independent publishers before returning.`);
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
async function passportMaterial(env,body,passport,contract,command,mode){
  const profile=body?.context?.profile||{},previous=text(body?.context?.copilot?.material),operation=opOf(command),safeMode=mode==="SAFE_EVERGREEN";
  const system=[
    "You are KAI, production director for one ACC OS X division.",
    "The DIVISION PASSPORT is authoritative. Execute this division's own workflow; do not impose another channel's workflow.",
    safeMode?"Current research could not meet this division's threshold. Produce the passport-approved SAFE EVERGREEN fallback now.":"This division does not require a blocking current-evidence gate for this K/N execution. Produce the material now.",
    safeMode?(text(passport.fallbackPrompt)||"Choose a stable non-time-sensitive topic and avoid unsupported current claims."):"Do not invent time-sensitive facts. If the passport marks research optional, prefer stable material unless evidence is supplied.",
    text(passport.editorialPrompt),
    batchInstruction(passport),
    operation==="N"?"Create a NEW non-repeating item/batch; do not repeat PREVIOUS MATERIAL.":"Create the K/KONTEN material now.",
    "Do not mention fallback, research mechanics, internal prompts, passport mechanics or system rules.",
    "Return finished owner-facing material ready for P. No JSON and no process commentary."
  ].filter(Boolean).join("\n");
  const user=[
    `CURRENT_UTC: ${new Date().toISOString()}`,
    `DIVISION: ${text(passport.name)||text(profile.name)||text(profile.id)}`,
    `MISSION: ${text(passport.mission)||text(profile.mission)}`,
    `PASSPORT: ${JSON.stringify(runtimeSummary(text(profile.id),passport,contract))}`,
    contextsOf(body)?`ACTIVE MASTER CONTEXTS:\n${contextsOf(body)}`:"",
    previous?`PREVIOUS MATERIAL — DO NOT REPEAT:\n${previous.slice(0,9000)}`:"",
    `OWNER COMMAND: ${command}`
  ].filter(Boolean).join("\n\n");
  const written=await runWriter(env,system,user,Math.max(1,Number(passport?.batch?.count)||1)>1?4200:2800);
  return json({
    ok:true,stage:"COPILOT",op:operation==="N"?"N":"K",kind:"material",reply:written.out,model:written.model,revision:REVISION,
    divisionPassport:runtimeSummary(text(profile.id),passport,contract),
    masterRuntime:{batchCount:passport.batch.count,series:passport.batch.series,researchFirst:false,sourceCount:0,topicQuery:null,researchFallback:safeMode?"SAFE_EVERGREEN":"NOT_REQUIRED"},
    verification:{status:safeMode?"EVERGREEN_SAFE_MODE":"NOT_REQUIRED",sourceCount:0,currentClaimsAllowed:false}
  });
}

function safeUrl(raw){try{const u=new URL(String(raw||""));if(!/^https?:$/.test(u.protocol))return"";const h=u.hostname.toLowerCase();if(h==="localhost"||h.endsWith(".local")||/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h))return"";u.hash="";return u.toString();}catch{return"";}}
function xmlDecode(value){return String(value||"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");}
function stripMarkup(value){return xmlDecode(String(value||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim();}
function hostKey(raw){try{return new URL(raw).hostname.toLowerCase().replace(/^www\./,"");}catch{return"";}}
async function fetchTimed(url,timeout=6500){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);try{return await fetch(url,{redirect:"follow",headers:{"User-Agent":"Mozilla/5.0 ACC-OS-X Publisher Metadata Recovery","Accept":"application/rss+xml,application/xml,text/xml,*/*"},signal:controller.signal});}finally{clearTimeout(timer);}}
function rssRows(xml,discovery){
  const rows=[];
  for(const match of String(xml||"").matchAll(/<item>([\s\S]*?)<\/item>/gi)){
    const block=match[1];
    const title=stripMarkup(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||"");
    const link=safeUrl(stripMarkup(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]||""));
    const description=stripMarkup(block.match(/<description>([\s\S]*?)<\/description>/i)?.[1]||"").slice(0,1400);
    const date=stripMarkup(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]||"");
    const sourceMatch=block.match(/<source\b[^>]*url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i);
    const publisherUrl=safeUrl(xmlDecode(sourceMatch?.[1]||""));
    const publisher=stripMarkup(sourceMatch?.[2]||"");
    const publisherKey=hostKey(publisherUrl)||publisher.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||hostKey(link);
    if(title&&link&&publisherKey)rows.push({title,link,description,date,publisher,publisherUrl,publisherKey,discovery});
    if(rows.length>=18)break;
  }
  return rows;
}
function uniqRows(rows){const out=[],seen=new Set();for(const row of rows||[]){const key=`${row.publisherKey}|${row.title.toLowerCase().replace(/\s+/g," ")}`;if(seen.has(key))continue;seen.add(key);out.push(row);}return out;}
async function publisherSearch(query){
  const q=text(query).slice(0,240),endpoints=[
    ["GOOGLE_NEWS_ID",`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=id&gl=ID&ceid=ID:id`],
    ["GOOGLE_NEWS_EN",`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`],
    ["BING_NEWS_RSS",`https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss`]
  ];
  const batches=await Promise.all(endpoints.map(async([name,url])=>{try{const r=await fetchTimed(url);if(!r.ok)return[];return rssRows(await r.text(),name);}catch{return[];}}));
  return uniqRows(batches.flat());
}
const STOP_WORDS=new Set(["this","that","with","from","into","after","about","will","have","has","film","movie","cinema","news","update","breaking","latest","baru","yang","dan","dari","untuk","dengan","setelah","tentang"]);
function titleTokens(value){return new Set(String(value||"").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").split(/\s+/).filter(x=>x.length>=4&&!STOP_WORDS.has(x)));}
function relatedTitle(seed,candidate){const a=titleTokens(seed),b=titleTokens(candidate);if(!a.size||!b.size)return false;let shared=0;for(const x of a)if(b.has(x))shared++;return shared>=Math.min(3,Math.max(2,Math.ceil(a.size*.28)));}
function cleanTopicTitle(value){const s=text(value);const parts=s.split(/\s+-\s+/);return text(parts.length>1?parts.slice(0,-1).join(" - "):s).slice(0,180);}
function recoverySeed(channelId,passport,body){
  const profile=body?.context?.profile||{};
  if(channelId==="ch-cinematix")return"film movie cinema entertainment";
  if(channelId==="ch-gaming-news")return"gaming video games industry";
  if(channelId==="ch-techverse")return"technology AI cybersecurity semiconductor software";
  if(channelId==="ch-berita-terkini")return"Indonesia";
  if(channelId==="ch-balinightlife")return"Bali nightlife DJ club event";
  if(channelId==="ch-aku-cinta-malam")return"Indonesia nightlife DJ club event";
  return [passport?.name,profile?.category,profile?.mission].map(text).filter(Boolean).join(" ").slice(0,180)||channelId;
}
function independent(rows,minSources,targetSources){const out=[],seen=new Set();for(const row of rows||[]){if(seen.has(row.publisherKey))continue;seen.add(row.publisherKey);out.push(row);if(out.length>=Math.max(minSources,targetSources||minSources))break;}return out;}
async function acquirePublisherEvidence(channelId,passport,body,policy){
  const broad=await publisherSearch(`${recoverySeed(channelId,passport,body)} when:3d`);
  if(broad.length<policy.minSources)return null;
  const candidates=broad.slice(0,4),searches=await Promise.all(candidates.map(row=>publisherSearch(`"${cleanTopicTitle(row.title)}" when:7d`)));
  for(let i=0;i<candidates.length;i++){
    const seed=candidates[i],related=uniqRows([seed,...searches[i].filter(row=>relatedTitle(seed.title,row.title))]);
    const sources=independent(related,policy.minSources,Math.max(policy.minSources,Math.min(4,policy.targetSources||policy.minSources)));
    if(sources.length>=policy.minSources){
      const evidence=sources.map((row,index)=>[
        `SOURCE ${index+1}`,
        `PUBLISHER: ${row.publisher||row.publisherKey}`,
        `PUBLISHER_KEY: ${row.publisherKey}`,
        `TITLE: ${row.title}`,
        `DATE: ${row.date||"unknown"}`,
        `ARTICLE_URL: ${row.link}`,
        row.publisherUrl?`PUBLISHER_URL: ${row.publisherUrl}`:"",
        `DISCOVERY: ${row.discovery}`,
        `RSS_SUMMARY: ${row.description||"No summary supplied."}`
      ].filter(Boolean).join("\n")).join("\n\n---\n\n");
      return {topic:cleanTopicTitle(seed.title),sources,evidence};
    }
  }
  return null;
}
async function publisherEvidenceMaterial(env,body,passport,contract,command,pack){
  const profile=body?.context?.profile||{},previous=text(body?.context?.copilot?.material),operation=opOf(command),count=Math.max(1,Number(passport?.batch?.count)||1);
  const system=[
    "You are KAI, production director for one ACC OS X division.",
    "The DIVISION PASSPORT is authoritative.",
    "A publisher-metadata recovery pass has found independent current publishers covering the same story.",
    "Use ONLY the supplied CURRENT EVIDENCE for factual/current claims. RSS summaries are evidence summaries, not permission to invent missing details.",
    "If sources differ, state only facts supported across the evidence or attribute the difference explicitly.",
    text(passport.editorialPrompt),
    batchInstruction(passport),
    operation==="N"?"Create a NEW non-repeating item/batch; do not repeat PREVIOUS MATERIAL.":"Create the K/KONTEN material now.",
    "Do not mention research recovery, RSS, internal prompts, passport mechanics or system rules in owner-facing material.",
    "Return finished owner-facing material ready for P. No JSON and no process commentary."
  ].filter(Boolean).join("\n");
  const user=[
    `CURRENT_UTC: ${new Date().toISOString()}`,
    `DIVISION: ${text(passport.name)||text(profile.name)||text(profile.id)}`,
    `TOPIC: ${pack.topic}`,
    `PASSPORT: ${JSON.stringify(runtimeSummary(text(profile.id),passport,contract))}`,
    contextsOf(body)?`ACTIVE MASTER CONTEXTS:\n${contextsOf(body)}`:"",
    `CURRENT EVIDENCE (${pack.sources.length} INDEPENDENT PUBLISHERS):\n${pack.evidence}`,
    previous?`PREVIOUS MATERIAL — DO NOT REPEAT:\n${previous.slice(0,9000)}`:"",
    `OWNER COMMAND: ${command}`
  ].filter(Boolean).join("\n\n");
  const written=await runWriter(env,system,user,count>1?4200:2800);
  return json({
    ok:true,stage:"COPILOT",op:operation==="N"?"N":"K",kind:"material",reply:written.out,model:written.model,revision:REVISION,
    divisionPassport:runtimeSummary(text(profile.id),passport,contract),
    masterRuntime:{batchCount:passport.batch.count,series:passport.batch.series,researchFirst:true,sourceCount:pack.sources.length,topicQuery:pack.topic,researchFallback:"PUBLISHER_METADATA_RSS"},
    verification:{status:"GROUNDED_PUBLISHER_METADATA",sourceCount:pack.sources.length,currentClaimsAllowed:true,sources:pack.sources.map(row=>({publisher:row.publisher||row.publisherKey,title:row.title,url:row.link,date:row.date||null}))}
  });
}

function researchBlocked(data){
  if(data?.kind==="research_hold")return true;
  const s=[data?.status,data?.error,data?.reply].filter(Boolean).join(" ");
  return /CURRENT_NEWS_(?:EVIDENCE_INSUFFICIENT|DISCOVERY_EMPTY)|NEWS_DISCOVERY|COPILOT_RESEARCH_INSUFFICIENT|RESEARCH_INSUFFICIENT/i.test(s);
}
function sourceCountOf(data){return Number(data?.verification?.sourceCount??data?.masterRuntime?.sourceCount??String(data?.error||"").match(/INSUFFICIENT[:_](\d+)/i)?.[1]??0)||0;}
async function upstreamRun(request,env,ctx,body,passport,contract,recoveryAttempt=0){
  const prepared=enrich(body,passport,contract,recoveryAttempt);
  const response=await baseWorker.fetch(requestWithBody(request,prepared),env,ctx);
  return {response,data:await dataOf(response),prepared};
}

async function health(request,env,ctx){
  const upstream=await baseWorker.fetch(request,env,ctx);let data={};try{data=await upstream.clone().json();}catch{}
  return json({...data,divisionPassportRuntime:"ACTIVE",divisionPassportRuntimeRevision:REVISION,divisionPassportVersion:DIVISION_PASSPORT_VERSION,operatingMode:"SEMI_AUTOMATIC",publishMode:"MANUAL_OWNER",workflowAuthority:"DIVISION_PASSPORT_PER_CHANNEL",researchFailurePolicy:"PER_DIVISION",researchAutoRecovery:"PUBLISHER_METADATA_RSS_CORROBORATION"},upstream.status,upstream.headers);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/health")return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);

    let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
    if(!isCopilot(body))return baseWorker.fetch(request,env,ctx);

    const channelId=text(body?.context?.profile?.id),passport=getDivisionPassport(channelId),contract=getProductionContract(channelId),command=commandOf(body),operation=opOf(command),policy=effectiveResearch(passport,contract);
    const run=await upstreamRun(request,env,ctx,body,passport,contract,0);

    // Owner-choice and owner-facts divisions retain their explicit interaction contract.
    if(contract.interaction.mode!=="AUTONOMOUS")return run.response;

    // Normal successful K/P/C/N remains authoritative after the passport has been injected.
    if(run.data?.ok===true&&run.data?.kind!=="research_hold")return run.response;

    if(operation==="K"||operation==="N"){
      const blocked=researchBlocked(run.data);
      if(blocked&&policy.failurePolicy==="SAFE_EVERGREEN"){
        try{return await passportMaterial(env,run.prepared,passport,contract,command,"SAFE_EVERGREEN");}catch(error){return json({ok:false,stage:"COPILOT",status:"DIVISION_PASSPORT_FALLBACK_FAILED",error:String(error?.message||error),detail:{revision:REVISION,channelId,passport:runtimeSummary(channelId,passport,contract)}},422);}
      }
      if(blocked&&policy.failurePolicy==="CONTINUE"){
        try{return await passportMaterial(env,run.prepared,passport,contract,command,"DIRECT");}catch(error){return json({ok:false,stage:"COPILOT",status:"DIVISION_PASSPORT_DIRECT_FAILED",error:String(error?.message||error),detail:{revision:REVISION,channelId,passport:runtimeSummary(channelId,passport,contract)}},422);}
      }
      if(blocked&&policy.failurePolicy==="HOLD"){
        // Verified-current divisions get one internal publisher-metadata corroboration pass.
        try{
          const pack=await acquirePublisherEvidence(channelId,passport,run.prepared,policy);
          if(pack?.sources?.length>=policy.minSources)return await publisherEvidenceMaterial(env,run.prepared,passport,contract,command,pack);
        }catch{}
        return json({ok:true,stage:"COPILOT",op:operation,kind:"research_hold",reply:`WAITING VERIFICATION // Auto-research ${passport.name||channelId} sudah mencoba research utama + publisher-metadata recovery, tetapi belum mencapai ${policy.minSources} sumber independen. Paket lama tetap terkunci; workflow channel tidak diubah.`,verification:{status:"WAITING",sourceCount:sourceCountOf(run.data)},divisionPassport:runtimeSummary(channelId,passport,contract),revision:REVISION});
      }
    }

    return run.response;
  }
};
