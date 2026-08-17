// ACC OS X — BRAIN RUNTIME RESCUE V9
// Poster quality hard lock: image model creates HERO IMAGE ONLY; ACC canvas owns all typography/layout.
// Prevents poster-within-poster gibberish and adds channel-specific subject grounding for YOLO, Titik Tanya and Warisan Bali.
import baseWorker from "./worker-brain-runtime-rescue-v8.js";
import {getProductionContract} from "./production-contracts-v1.js";
import {getDivisionPassport} from "./division-passports-v1.js";

const REVISION="BRAIN_RUNTIME_RESCUE_V9_HERO_IMAGE_ONLY_CHANNEL_LOCK";
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
function cleanMarkdown(v){return text(String(v||"").replace(/^\s*(?:#{1,6}\s*)?(?:\*{1,3}|_{1,3})?\s*(?:ITEM|KONTEN|CONTENT)\s+[1-8]\b[^\n]*\n?/i,"").replace(/^\s*(?:#{1,6}\s*)?(?:\*{1,3}|_{1,3})?\s*[1-8][\).:\-]\s+[^\n]*\n?/i,"").replace(/^#{1,6}\s*/gm,"").replace(/[*_`>#]/g,"").replace(/\s+/g," "));}
function concise(v,max){let s=text(v).replace(/\s+/g," ");if(s.length<=max)return s;const cut=s.slice(0,max+1),at=cut.lastIndexOf(" ");return`${cut.slice(0,at>max*.55?at:max).replace(/[,:;\-–—]+$/g,"").trim()}…`;}
function field(raw,name){const re=new RegExp(`(?:^|\\n)\\s*(?:[*_]{0,3})${name}(?:[*_]{0,3})\\s*:\\s*(.+)`,`i`);return text(String(raw||"").match(re)?.[1]||"").replace(/[*_`#]+/g,"").trim();}
function cleanTopic(v){
  return concise(text(v).replace(/^\s*(?:Topik|Topic|Judul|Title|Headline)\s*:\s*/i,"").replace(/\s+(?:Sudut\s+Pandang\s+(?:Positif|Negatif)|Positive\s+View|Negative\s+View)\b.*$/i,"").replace(/\s+(?:Materi|Content)\s*:\s*.*$/i,"").replace(/[\s\-–—:]+$/g,""),72);
}
function headlineOf(item,profile,id){
  const explicit=field(item,"Judul")||field(item,"Title")||field(item,"Headline")||field(item,"Topik")||field(item,"Topic");
  if(explicit)return cleanTopic(explicit);
  const plain=cleanMarkdown(item);
  if(id==="ch-yolo"){const m=plain.match(/(?:Topik|Topic)\s*:\s*(.+?)(?=\s+Sudut\s+Pandang|\s+Positive\s+View|\s+Negative\s+View|$)/i);if(m?.[1])return cleanTopic(m[1]);}
  return cleanTopic((plain.split(/[.!?]\s/)[0]||profile.name||"ACC OS X"));
}
const HERO_ONLY=[
  "IMAGE-ONLY CINEMATIC HERO SCENE, NOT A POSTER, NOT A FLYER, NOT A MAGAZINE COVER, NOT A TITLE CARD, NOT AN INFOGRAPHIC, NOT A USER INTERFACE",
  "absolutely no typography and no pseudo-typography: no readable or unreadable letters, words, numbers, glyphs, symbols that resemble writing, captions, labels, signs, banners, logos, watermarks or UI",
  "avoid all text-bearing objects: no phone screen content, computer interface, books with writing, documents, newspapers, cards, packaging labels, billboards, menus, clothing print or wall signs",
  "one clean dominant visual idea, natural readable lighting, premium composition, uncluttered background, generous clean negative space for later ACC OS X canvas typography"
].join(". ");
function channelDirection(id,headline,material,visual){
  if(id==="ch-yolo")return[
    "balanced dual-concept editorial scene showing two sides of the SAME topic in one coherent composition",
    `topic: ${headline}`,
    "use a clean left-versus-right or foreground-versus-background visual contrast: one side conveys the benefit/positive consequence, the other side conveys the risk/negative consequence",
    "do not moralize and do not substitute random people; prefer objects, environment, gesture and light contrast directly tied to the topic",
    "if digital technology is involved, devices may appear only with blank dark screens and absolutely no interface or writing"
  ].join(". ");
  if(id==="ch-titik-tanya")return[
    `philosophical symbolic scene for the question/theme: ${headline}`,
    "one strong visual metaphor, contemplative and human-scale, cinematic realism or refined conceptual illustration",
    "do not literally write the question inside the image and do not make a poster-within-poster"
  ].join(". ");
  if(id==="ch-warisan-bali")return[
    `culturally grounded Bali heritage scene directly representing: ${headline}`,
    "prioritize authentic Balinese architecture, offerings, temple details, landscape, objects, hands or community activity that matches the material",
    "when people are necessary for a Balinese ritual/tradition topic, use context-appropriate Balinese attire and setting; never substitute generic pan-Indonesian ceremonial costume",
    "if cultural detail is uncertain, use accurate place/object/environmental symbolism instead of inventing clothing or ritual"
  ].join(". ");
  return[`direct visual representation of: ${headline}`,visual?.template?`visual direction: ${visual.template}`:"",visual?.heroPolicy?`subject policy: ${visual.heroPolicy}`:""].filter(Boolean).join(". ");
}
function planOf(profile,contract,item,label,id){
  const headline=headlineOf(item,profile,id),plain=cleanMarkdown(item),material=field(item,"Materi")||field(item,"Content")||plain,visual=contract?.visual||{};
  let subhead="";
  if(id==="ch-yolo")subhead="Dua sisi satu topik: manfaat dan risikonya.";
  else subhead=concise(text(material).replace(new RegExp(headline.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"),"").replace(/^\s*[:\-–—]+\s*/,""),112);
  const prompt=[channelDirection(id,headline,material,visual),`story context for visual grounding only: ${concise(material,650)}`,visual?.palette?`color/atmosphere direction: ${visual.palette}`:"",Array.isArray(visual?.avoid)&&visual.avoid.length?`also avoid: ${visual.avoid.join(", ")}`:"",HERO_ONLY].filter(Boolean).join(". ").slice(0,2600);
  return{headline,subhead,badge:concise(label||profile.name||"ACC OS X",32),subjectAnchor:headline,visualPrompt:prompt,planMode:"V9_HERO_IMAGE_ONLY"};
}
async function image(env,prompt){
  if(!env?.AI?.run)throw new Error("AI_BINDING_UNAVAILABLE");
  const errors=[];
  for(let i=0;i<2;i++){
    try{const raw=await timed(env.AI.run(IMAGE,{prompt,steps:8}),52000,"P_V9_IMAGE"),b64=text(raw?.image||raw?.result?.image);if(b64)return b64;throw new Error("EMPTY_IMAGE");}
    catch(e){errors.push(String(e?.message||e));}
  }
  throw new Error(`POSTER_IMAGE_UNAVAILABLE:${errors.join("|")}`);
}
async function producePoster(env,body){
  const safe=brainSafe(body);if(!safe.ok)return json({ok:false,stage:"COPILOT",status:"BRAIN_V9_BLOCKED",error:safe.error,detail:{revision:REVISION,...safe}},409);
  const material=text(body?.context?.copilot?.material);if(!material)return json({ok:false,stage:"COPILOT",status:"P_V9_MATERIAL_REQUIRED",error:"MATERIAL_REQUIRED_BEFORE_POSTER",detail:{revision:REVISION}},422);
  const id=safe.id,profile=body?.context?.profile||{},passport=getDivisionPassport(id),contract=getProductionContract(id),spec=specOf(body,passport,contract),items=splitMaterial(material,spec.n);
  if(items.length!==spec.n)return json({ok:false,stage:"COPILOT",status:"P_V9_MATERIAL_SHAPE_INVALID",error:`P_V9_REQUIRES_${spec.n}_MATERIAL_ITEM${spec.n===1?"":"S"}`,detail:{revision:REVISION,channelId:id,batchCount:spec.n,detectedItems:items.length}},422);
  const plans=items.map((item,i)=>planOf(profile,contract,item,spec.series[i]||profile.name||`Item ${i+1}`,id)),images=[];
  for(const p of plans)images.push(await image(env,p.visualPrompt));
  const common={ok:true,stage:"COPILOT",op:"P",revision:REVISION,brainLock:{channelId:id,brainId:safe.expected,isolation:"HARD_1_TO_1",workflowAuthority:"CHANNEL_MASTER_LOCK",status:"VERIFIED"},masterRuntime:{...(body?.context?.masterRuntime||{}),batchCount:spec.n,series:spec.series,workflowAuthority:"LOCKED_CHANNEL_MASTER",globalEngineRole:"EXECUTION_ONLY",posterExecutionPath:"V9_HERO_IMAGE_ONLY"},posterPolicy:{canvasTypography:true,aiHeroImageOnly:true,noAiText:true,noPosterWithinPoster:true,channelVisualLock:true}};
  if(spec.n===1)return json({...common,kind:"poster",reply:`Poster ${profile.name||passport?.name||id} siap.`,plan:plans[0],imageBase64:images[0]});
  return json({...common,kind:"poster_batch",reply:`${spec.n} poster ${profile.name||passport?.name||id} siap.`,posters:items.map((item,i)=>({index:i+1,label:spec.series[i]||`Item ${i+1}`,material:item,plan:plans[i],imageBase64:images[i]}))});
}
async function health(request,env,ctx){const r=await baseWorker.fetch(request,env,ctx);let d={};try{d=await r.clone().json();}catch{}return json({...d,brainRuntimeRescueV9:"ACTIVE",brainRuntimeRescueV9Revision:REVISION,posterHeroImageOnly:"ACTIVE",posterWithinPoster:"BLOCKED",yoloDualConceptLock:"ACTIVE",warisanBaliCultureLock:"ACTIVE"},r.status,r.headers);}

export default{async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(request.method==="GET"&&url.pathname==="/health")return health(request,env,ctx);
  if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);
  let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
  if(!isCopilot(body)||opOf(body)!=="P")return baseWorker.fetch(request,env,ctx);
  try{return await producePoster(env,body);}catch(error){return json({ok:false,stage:"COPILOT",status:"P_V9_FAILED",error:String(error?.message||error),detail:{revision:REVISION,channelId:text(body?.context?.profile?.id)}},422);}
}};
