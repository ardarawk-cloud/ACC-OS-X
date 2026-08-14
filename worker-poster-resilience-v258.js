// ACC OS X — BUILD 258.5 POSTER QUALITY GUARD
// P is contract-driven. AI generates the clean hero visual; ACC canvas owns all typography.
// Named real people are never replaced by an invented lookalike when no authoritative reference image exists.
import baseWorker from "./worker-build2577-entry.js";
import {getProductionContract,contractSummary} from "./production-contracts-v1.js";

const REVISION="BUILD258_5_POSTER_QUALITY_GUARD";
const FAST="@cf/meta/llama-4-scout-17b-16e-instruct";
const IMAGE="@cf/black-forest-labs/flux-1-schnell";
const text=v=>typeof v==="string"?v.trim():"";
const PLAN_SCHEMA={type:"object",properties:{headline:{type:"string"},subhead:{type:"string"},badge:{type:"string"},subject_anchor:{type:"string"},visual_prompt:{type:"string"}},required:["headline","subhead","badge","subject_anchor","visual_prompt"],additionalProperties:false};
const NO_TEXT_VISUAL="clean image-only hero, absolutely no typography, no readable text, no letters, no words, no numbers, no captions, no labels, no signs, no banners, no lower thirds, no UI, no logo, no watermark; leave clean negative space for ACC OS X typography overlay";
function json(x,s=200){return new Response(JSON.stringify(x),{status:s,headers:{"Content-Type":"application/json;charset=UTF-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}});}
function op(body){const c=text(body?.context?.copilot?.command);return /^(p|poster)\b/i.test(c)?"P":"";}
function isCopilot(body){const s=String(body?.context?.workerTask?.stage||"").toUpperCase();return s==="COPILOT"||s==="PRODUCE_COPILOT";}
function structured(raw){if(!raw||typeof raw!=="object")return null;for(const x of [raw,raw.response,raw.result?.response,raw.result,raw.output,raw.data])if(x&&typeof x==="object"&&!Array.isArray(x))return x;return null;}
async function timed(p,ms,label){let t;const q=new Promise((_,r)=>{t=setTimeout(()=>r(new Error(`${label}_TIMEOUT`)),ms);});try{return await Promise.race([p,q]);}finally{clearTimeout(t);}}
function split(material,count){if(count<=1)return[text(material)];const m=[...String(material||"").matchAll(/^\s*ITEM\s+(\d+)\b[^\n]*\n?/gim)];if(m.length<count)return[];return m.slice(0,count).map((x,i)=>text(String(material).slice(x.index,i+1<m.length?m[i+1].index:String(material).length))).filter(Boolean);}
function strip(s){return text(String(s||"").replace(/^\s*ITEM\s+\d+[^\n]*\n?/i,"").replace(/^#{1,6}\s*/gm,"").replace(/[*_`>#]/g,"").replace(/\s+/g," "));}
function concise(value,max){let s=text(value).replace(/\s+/g," ");if(s.length<=max)return s;const cut=s.slice(0,max+1),at=cut.lastIndexOf(" ");return `${cut.slice(0,at>max*.58?at:max).replace(/[,:;\-–—]+$/g,"").trim()}…`;}
function namedRealPerson(item){
  const s=String(item||"");
  const patterns=[
    /\b(?:Presiden|President|Perdana Menteri|Prime Minister|Menteri|Minister|Gubernur|Governor|Wakil Presiden|Vice President|Ketua|Chairman|CEO)\s+([A-ZÀ-ÖØ-Ý][\p{L}.'’-]+(?:\s+[A-ZÀ-ÖØ-Ý][\p{L}.'’-]+){0,3})/u,
    /\b(?:Mr\.?|Mrs\.?|Dr\.?|Prof\.?)\s+([A-ZÀ-ÖØ-Ý][\p{L}.'’-]+(?:\s+[A-ZÀ-ÖØ-Ý][\p{L}.'’-]+){0,3})/u
  ];
  for(const re of patterns){const m=s.match(re);if(m?.[1])return text(m[1]);}
  return"";
}
function removePersonName(value,name){let s=text(value);if(!name)return s;for(const part of [name,...name.split(/\s+/).filter(x=>x.length>3)]){try{s=s.replace(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi"),"the public official");}catch{}}return s;}
function identitySafeVisual(contract,item,name){
  const body=strip(item).toLowerCase();
  const cues=[];
  if(/apbn|anggaran|budget|fiskal|defisit|ekonomi/.test(body))cues.push("Indonesian public-finance policy setting, red-and-white national flag colors, parliament or government briefing environment, abstract budget and economy visual cues without any numbers or text");
  else if(/pemilu|election|politik|government|pemerintah|dpr|parlemen/.test(body))cues.push("Indonesian government or parliament environment, national flag, official architecture, wide editorial establishing shot");
  else cues.push(`institutional editorial scene directly representing the reported event, ${contract.visual.template} style`);
  return [
    ...cues,
    "REAL-PERSON IDENTITY GUARD: the story references a real public figure but no authoritative reference image is supplied",
    "do not generate, imitate, approximate, or substitute any identifiable human face or lookalike",
    "prefer architecture, objects, flags, environment, hands without identity, back-view silhouette, or a wide scene with no recognizable face",
    NO_TEXT_VISUAL
  ].join(". ");
}
function visualSafety(contract,item,prompt){
  const person=namedRealPerson(item);
  if(person)return{person,subject:"identity-safe institutional scene",prompt:identitySafeVisual(contract,item,person)};
  return{person:"",subject:"",prompt:[text(prompt),`hero policy ${contract.visual.heroPolicy}`,`avoid ${(contract.visual.avoid||[]).join(", ")}`,NO_TEXT_VISUAL,"natural readable lighting, professional composition, high detail"].filter(Boolean).join(". ").slice(0,2600)};
}
function fallbackPlan(profile,contract,item,index){
  const body=strip(item),first=(body.split(/[.!?]\s/)[0]||profile.name),headline=concise(first,76),subhead=concise(body.slice(first.length).trim()||profile.mission||"",118),label=contract.batch.series?.[index]||profile.name;
  const subject=concise(first.replace(/^[-–—\s]+/,""),135),safe=visualSafety(contract,item,[`vertical 9:16 ${contract.visual.template} editorial`,`dominant hero subject: ${subject}`,`channel ${profile.name}`,`palette ${contract.visual.palette}`,"single clear visual story, no decorative information panels"].join(". "));
  return{headline,subhead,badge:concise(label,32),subjectAnchor:safe.subject||subject,visualPrompt:safe.prompt,identityGuard:Boolean(safe.person),planMode:"DETERMINISTIC_FALLBACK"};
}
async function makePlan(env,profile,contract,item,index){
  const fb=fallbackPlan(profile,contract,item,index),person=namedRealPerson(item);
  try{
    const raw=await timed(env.AI.run(FAST,{messages:[{role:"system",content:[
      "Create a grounded social poster HERO brief. ACC OS X canvas renders all visible typography later.",
      `Template: ${contract.visual.template}.`,
      `Hero policy: ${contract.visual.heroPolicy}.`,
      `Avoid: ${(contract.visual.avoid||[]).join("; ")}.`,
      "headline must be concise and factual, ideally <= 76 characters; subhead <= 118 characters.",
      "visual_prompt describes IMAGE CONTENT ONLY. Never copy article sentences, quotes, hashtags, dates, monetary values, percentages, headlines, or captions into visual_prompt.",
      "The dominant hero subject must directly represent the material. Do not use an unrelated attractive person as a substitute.",
      person?"A real named public figure is present. Because no authoritative reference image is supplied, DO NOT request or synthesize that person's face or any lookalike. Use an identity-safe institutional/environmental scene instead.":"",
      NO_TEXT_VISUAL
    ].filter(Boolean).join("\n")},{role:"user",content:item}],max_tokens:760,temperature:.12,guided_json:PLAN_SCHEMA}),22000,"POSTER_PLAN"),p=structured(raw);
    if(text(p?.headline)&&text(p?.subject_anchor)&&text(p?.visual_prompt)){
      const basePrompt=person?removePersonName(p.visual_prompt,person):text(p.visual_prompt),safe=visualSafety(contract,item,basePrompt);
      return{headline:concise(p.headline,76),subhead:concise(p.subhead,118),badge:concise(text(p.badge)||fb.badge,32),subjectAnchor:safe.subject||concise(person?removePersonName(p.subject_anchor,person):p.subject_anchor,150),visualPrompt:safe.prompt,identityGuard:Boolean(safe.person),planMode:"AI_STRUCTURED"};
    }
  }catch{}
  return fb;
}
async function image(env,prompt){const errors=[];for(let i=0;i<2;i++){try{const r=await timed(env.AI.run(IMAGE,{prompt,steps:6}),52000,"POSTER_IMAGE"),b=text(r?.image||r?.result?.image);if(b)return b;throw new Error("EMPTY");}catch(e){errors.push(String(e?.message||e));}}throw new Error(`POSTER_IMAGE_UNAVAILABLE:${errors.join("|")}`);}
async function produce(env,body){
  const profile=body?.context?.profile||{},channelId=text(profile.id),contract=getProductionContract(channelId),material=text(body?.context?.copilot?.material);
  if(!material)throw new Error("MATERIAL_REQUIRED_BEFORE_POSTER");
  const items=split(material,contract.batch.count);if(items.length!==contract.batch.count)throw new Error(`CONTRACT_MATERIAL_SHAPE_INVALID_RUN_K:${contract.batch.count}`);
  const plans=await Promise.all(items.map((x,i)=>makePlan(env,profile,contract,x,i))),images=await Promise.all(plans.map(x=>image(env,x.visualPrompt)));
  if(items.length===1)return{ok:true,stage:"COPILOT",op:"P",kind:"poster",reply:`Poster ${profile.name||channelId} siap.`,plan:plans[0],imageBase64:images[0],revision:REVISION,posterPolicy:{canvasTypography:true,noAiText:true,realPersonIdentityGuard:true},contract:contractSummary(channelId)};
  return{ok:true,stage:"COPILOT",op:"P",kind:"poster_batch",reply:`${items.length} poster ${profile.name||channelId} siap.`,posters:items.map((material,i)=>({index:i+1,label:contract.batch.series[i]||`Item ${i+1}`,material,plan:plans[i],imageBase64:images[i]})),revision:REVISION,posterPolicy:{canvasTypography:true,noAiText:true,realPersonIdentityGuard:true},contract:contractSummary(channelId)};
}
export default{async fetch(request,env,ctx){const url=new URL(request.url);if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}if(!isCopilot(body)||op(body)!=="P")return baseWorker.fetch(request,env,ctx);try{return json(await produce(env,body));}catch(e){return json({ok:false,stage:"COPILOT",status:"POSTER_CONTRACT_BLOCKED",error:String(e?.message||e),detail:{revision:REVISION,contract:contractSummary(text(body?.context?.profile?.id))}},422);}}};
