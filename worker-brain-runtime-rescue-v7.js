// ACC OS X — BRAIN RUNTIME RESCUE V7
// Poster hardening above V6: tolerate markdown ITEM headings and never send unsupported image seed fields.
// Preserves one-brain-per-division and the current K material.
import baseWorker from "./worker-brain-runtime-rescue-v6.js";
import {getProductionContract} from "./production-contracts-v1.js";
import {getDivisionPassport} from "./division-passports-v1.js";

const REVISION="BRAIN_RUNTIME_RESCUE_V7_POSTER_SCHEMA_HARDENING";
const IMAGE="@cf/black-forest-labs/flux-1-schnell";
const text=v=>typeof v==="string"?v.trim():"";

function json(data,status=200,headersLike=null){
  const h=new Headers(headersLike||{});
  h.set("Content-Type","application/json;charset=UTF-8");
  h.set("Cache-Control","no-store");
  h.set("Access-Control-Allow-Origin","*");
  return new Response(JSON.stringify(data),{status,headers:h});
}
function commandOf(b){return text(b?.context?.copilot?.command)||text((b?.messages||[]).slice(-1)[0]?.content);}
function opOf(b){return /^(p|poster)\b/i.test(commandOf(b))?"P":"";}
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

// Accept: ITEM 1, **ITEM 1**, ### ITEM 1, *ITEM 1 - title*, etc.
function itemMarks(source){
  const patterns=[
    /^\s*(?:#{1,6}\s*)?(?:\*{1,3}|_{1,3})?\s*ITEM\s+([1-8])\b[^\n]*$/gim,
    /^\s*(?:#{1,6}\s*)?(?:\*{1,3}|_{1,3})?\s*(?:KONTEN|CONTENT)\s+([1-8])\b[^\n]*$/gim
  ];
  for(const re of patterns){const m=[...source.matchAll(re)];if(m.length)return m;}
  return[];
}
function numberedMarks(source,n){
  const m=[...source.matchAll(/^\s*(?:#{1,6}\s*)?(?:\*{1,3}|_{1,3})?\s*([1-8])[\).:\-]\s+[^\n]+$/gim)];
  return m.length>=n?m:[];
}
function splitMaterial(material,n){
  const source=text(material);
  if(!source)return[];
  if(n<=1)return[source];
  let marks=itemMarks(source);
  if(marks.length<n)marks=numberedMarks(source,n);
  if(marks.length<n)return[];
  // Prefer one block per expected item number, but stay tolerant of formatting drift.
  const chosen=[];
  const used=new Set();
  for(let want=1;want<=n;want++){
    const idx=marks.findIndex((m,i)=>!used.has(i)&&Number(m[1])===want);
    if(idx>=0){chosen.push(marks[idx]);used.add(idx);}
  }
  if(chosen.length!==n)chosen.splice(0,chosen.length,...marks.slice(0,n));
  chosen.sort((a,b)=>a.index-b.index);
  return chosen.map((m,i)=>text(source.slice(m.index,i+1<chosen.length?chosen[i+1].index:source.length))).filter(Boolean);
}
function stripMarkdown(v){
  return text(String(v||"")
    .replace(/^\s*(?:#{1,6}\s*)?(?:\*{1,3}|_{1,3})?\s*(?:ITEM|KONTEN|CONTENT)\s+[1-8]\b[^\n]*\n?/i,"")
    .replace(/^\s*(?:#{1,6}\s*)?(?:\*{1,3}|_{1,3})?\s*[1-8][\).:\-]\s+[^\n]*\n?/i,"")
    .replace(/^#{1,6}\s*/gm,"")
    .replace(/[*_`>#]/g,"")
    .replace(/\s+/g," "));
}
function concise(v,max){let s=text(v).replace(/\s+/g," ");if(s.length<=max)return s;const cut=s.slice(0,max+1),at=cut.lastIndexOf(" ");return `${cut.slice(0,at>max*.55?at:max).replace(/[,:;\-–—]+$/g,"").trim()}…`;}
function field(raw,name){
  const re=new RegExp(`(?:^|\\n)\\s*(?:[*_]{0,3})${name}(?:[*_]{0,3})\\s*:\\s*(.+)`,`i`);
  return text(String(raw||"").match(re)?.[1]||"").replace(/[*_`#]+/g,"").trim();
}
function headlineOf(item,profile){
  const explicit=field(item,"Judul")||field(item,"Title")||field(item,"Headline");
  if(explicit)return concise(explicit,76);
  const plain=stripMarkdown(item);
  const first=text(plain.split(/[.!?]\s/)[0])||profile.name||"ACC OS X";
  return concise(first.replace(/^(Materi|Content)\s*:\s*/i,""),76);
}
function planOf(profile,contract,item,label){
  const plain=stripMarkdown(item),headline=headlineOf(item,profile);
  const material=field(item,"Materi")||field(item,"Content")||plain;
  const rest=text(material.replace(headline,""));
  const subhead=concise(rest||profile.mission||"",118);
  const subject=concise(headline,145);
  const visual=contract?.visual||{};
  const prompt=[
    `vertical 9:16 premium social editorial hero for ${profile.name||profile.id}`,
    `dominant subject: ${subject}`,
    `story context: ${material.slice(0,900)}`,
    visual.template?`template direction: ${visual.template}`:"",
    visual.heroPolicy?`hero policy: ${visual.heroPolicy}`:"",
    visual.palette?`palette direction: ${visual.palette}`:"",
    Array.isArray(visual.avoid)&&visual.avoid.length?`avoid: ${visual.avoid.join(", ")}`:"",
    "preserve the exact current K topic and selected channel identity",
    "if a real named person appears and no authoritative reference image is supplied, do not synthesize an identifiable face or lookalike; use an identity-safe object, environment, silhouette, or institutional scene",
    "image only; absolutely no readable typography, letters, words, numbers, captions, signs, logos, watermark or UI",
    "natural readable lighting, one clear dominant subject, premium composition, clean negative space for later typography overlay"
  ].filter(Boolean).join(". ").slice(0,2600);
  return{headline,subhead,badge:concise(label||profile.name||"ACC OS X",32),subjectAnchor:subject,visualPrompt:prompt,planMode:"V7_DETERMINISTIC_SCHEMA_SAFE"};
}
async function image(env,prompt){
  if(!env?.AI?.run)throw new Error("AI_BINDING_UNAVAILABLE");
  const errors=[];
  for(let i=0;i<2;i++){
    try{
      // IMPORTANT: FLUX schema currently rejects /seed. Keep payload minimal and supported.
      const raw=await timed(env.AI.run(IMAGE,{prompt,steps:6}),52000,"P_V7_IMAGE");
      const b64=text(raw?.image||raw?.result?.image);
      if(b64)return b64;
      throw new Error("EMPTY_IMAGE");
    }catch(e){errors.push(String(e?.message||e));}
  }
  throw new Error(`POSTER_IMAGE_UNAVAILABLE:${errors.join("|")}`);
}
async function recoverPoster(env,body,upstream){
  const safe=brainSafe(body);
  if(!safe.ok)return json({ok:false,stage:"COPILOT",status:"BRAIN_V7_BLOCKED",error:safe.error,detail:{revision:REVISION,...safe}},409);
  const material=text(body?.context?.copilot?.material);
  if(!material)return null;
  const id=safe.id,profile=body?.context?.profile||{},passport=getDivisionPassport(id),contract=getProductionContract(id),spec=specOf(body,passport,contract),items=splitMaterial(material,spec.n);
  if(items.length!==spec.n)return json({ok:false,stage:"COPILOT",status:"P_V7_MATERIAL_SHAPE_INVALID",error:`P_V7_REQUIRES_${spec.n}_MATERIAL_ITEM${spec.n===1?"":"S"}`,detail:{revision:REVISION,channelId:id,batchCount:spec.n,detectedItems:items.length}},422);
  const plans=items.map((item,i)=>planOf(profile,contract,item,spec.series[i]||profile.name||`Item ${i+1}`));
  const images=[];
  for(let i=0;i<plans.length;i++)images.push(await image(env,plans[i].visualPrompt));
  const common={
    ok:true,stage:"COPILOT",op:"P",revision:REVISION,
    brainLock:{channelId:id,brainId:safe.expected,isolation:"HARD_1_TO_1",workflowAuthority:"CHANNEL_MASTER_LOCK",status:"VERIFIED"},
    masterRuntime:{...(body?.context?.masterRuntime||{}),batchCount:spec.n,series:spec.series,workflowAuthority:"LOCKED_CHANNEL_MASTER",globalEngineRole:"EXECUTION_ONLY",posterExecutionPath:"V7_SCHEMA_SAFE_RESCUE"},
    posterRescue:{trigger:text(upstream?.error||upstream?.status||"DOWNSTREAM_POSTER_FAILURE").slice(0,220),topicPreserved:true,markdownItemParser:true,unsupportedSeedRemoved:true}
  };
  if(spec.n===1)return json({...common,kind:"poster",reply:`Poster ${profile.name||passport?.name||id} siap.`,plan:plans[0],imageBase64:images[0]});
  return json({...common,kind:"poster_batch",reply:`${spec.n} poster ${profile.name||passport?.name||id} siap.`,posters:items.map((item,i)=>({index:i+1,label:spec.series[i]||`Item ${i+1}`,material:item,plan:plans[i],imageBase64:images[i]}))});
}
async function health(request,env,ctx){
  const r=await baseWorker.fetch(request,env,ctx);let d={};try{d=await r.clone().json();}catch{}
  return json({...d,brainRuntimeRescueV7:"ACTIVE",brainRuntimeRescueV7Revision:REVISION,posterMarkdownItemParser:"ACTIVE",posterImageSeedField:"REMOVED"},r.status,r.headers);
}

export default{async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(request.method==="GET"&&url.pathname==="/health")return health(request,env,ctx);
  if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);
  let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
  const upstreamResponse=await baseWorker.fetch(request,env,ctx);
  if(!isCopilot(body)||opOf(body)!=="P")return upstreamResponse;
  const upstream=await dataOf(upstreamResponse);
  if(upstreamResponse.ok&&upstream?.ok!==false)return upstreamResponse;
  const msg=String(upstream?.error||upstream?.status||"");
  if(/MATERIAL_REQUIRED_BEFORE_POSTER/i.test(msg))return upstreamResponse;
  try{return await recoverPoster(env,body,upstream)||upstreamResponse;}
  catch(error){return json({ok:false,stage:"COPILOT",status:"P_V7_RESCUE_FAILED",error:String(error?.message||error),detail:{revision:REVISION,channelId:text(body?.context?.profile?.id),originalError:msg.slice(0,220)}},422,upstreamResponse.headers);}
}};
