// ACC OS X — BUILD 257 POSTER BRIEF SAFETY
// Final safety normalizer after KAI Studio Board / Autonomous Recovery.
import baseWorker from "./worker-kai-brain-v257.js";

const REVISION="BUILD257_POSTER_BRIEF_SAFETY";
const text=v=>typeof v==="string"?v.trim():"";
function stageOf(body){const s=String(body?.context?.workerTask?.stage||"").toUpperCase();if(s==="MATERIAL")return"SCRIPT";if(s==="PUBLISH")return"PUBLISHING";if(["RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"].includes(s))return s;const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");const m=joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);return m?String(m[1]).toUpperCase():"";}
function extract(raw,label){const m=String(raw||"").match(new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`,`im`));return m?text(m[1]):"";}
function forbidden(raw){return /\b(?:diagram|chart|graph|dashboard|infographic|network map|flowchart|table|timeline)\b/i.test(String(raw||""));}
function rebuild(raw){
  const topic=extract(raw,"PUBLIC TOPIC")||"the verified public topic";
  const basis=forbidden(extract(raw,"PRIMARY VISUAL BASIS"))?`Premium editorial hero scene representing exactly: ${topic}.`:extract(raw,"PRIMARY VISUAL BASIS")||`Premium editorial hero scene representing exactly: ${topic}.`;
  return [
    `PUBLIC TOPIC: ${topic}`,
    `PRIMARY VISUAL BASIS: ${basis}`,
    `CREATIVE CONCEPT: ${extract(raw,"CREATIVE CONCEPT")||`One distinctive editorial metaphor or story moment making ${topic} immediately understandable without rendered text.`}`,
    `HERO SUBJECT: ${extract(raw,"HERO SUBJECT")||"One unmistakable primary subject with clear story meaning."}`,
    `COMPOSITION: ${extract(raw,"COMPOSITION")||"Cinematic editorial composition with deliberate foreground, midground and background hierarchy."}`,
    `CAMERA LANGUAGE: ${extract(raw,"CAMERA LANGUAGE")||"Purposeful editorial camera angle that makes the hero subject dominant."}`,
    `LIGHTING: ${extract(raw,"LIGHTING")||"Premium cinematic key light with dimensional depth and clear detail."}`,
    `COLOR DIRECTION: ${extract(raw,"COLOR DIRECTION")||"Disciplined channel-appropriate premium palette."}`,
    `ATMOSPHERE: ${extract(raw,"ATMOSPHERE")||"Sophisticated contemporary editorial mood, never generic stock-art energy."}`,
    `NEGATIVE SPACE: ${extract(raw,"NEGATIVE SPACE")||"Clean safe zones for deterministic headline, branding and information panels."}`,
    `EDITORIAL ENERGY: ${extract(raw,"EDITORIAL ENERGY")||"Specific, intelligent, story-driven and visually memorable."}`,
    "QUALITY TARGET: STUDIO CONTENT PREMIUM"
  ].join("\n");
}
function json(payload,status=200,headersLike=null){const headers=new Headers(headersLike||{});headers.set("Content-Type","application/json;charset=UTF-8");headers.set("Cache-Control","no-store");headers.set("Access-Control-Allow-Origin","*");return new Response(JSON.stringify(payload,null,2),{status,headers});}
export default{async fetch(request,env,ctx){const url=new URL(request.url);if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai")){const upstream=await baseWorker.fetch(request,env,ctx);let data={};try{data=await upstream.clone().json();}catch{}return json({...(data&&typeof data==="object"?data:{}),posterBriefSafety:"ACTIVE",posterBriefSafetyRevision:REVISION},upstream.status,upstream.headers);}if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}if(stageOf(body)!=="POSTER")return baseWorker.fetch(request,env,ctx);const upstream=await baseWorker.fetch(request,env,ctx);if(!upstream.ok)return upstream;let payload;try{payload=await upstream.clone().json();}catch{return upstream;}const raw=text(payload?.reply);if(!raw||payload?.ok===false)return upstream;const reply=forbidden(raw)?rebuild(raw):raw;return json({...payload,reply,provider:`${text(payload.provider)||"ACC OS X"} + Build257 Poster Safety`,posterBriefSafety:{revision:REVISION,sanitized:reply!==raw}},upstream.status,upstream.headers);}};
