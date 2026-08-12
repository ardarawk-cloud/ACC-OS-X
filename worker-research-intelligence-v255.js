// ACC OS X — BUILD 255 KAI RESEARCH INTELLIGENCE
// Newsroom-grade research packet before KAI Brain MATERIAL stage.
// TechVerse is latest-first. Publishing / Meta / caption path are untouched.

import baseWorker from "./worker-stage-normalizer.js";

const REVISION = "BUILD255_KAI_RESEARCH_INTELLIGENCE";
const DIRECTOR_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const CRITIC_MODEL = "@cf/zai-org/glm-4.7-flash";
const MIN_RESEARCH = 8.5;
const text = v => typeof v === "string" ? v.trim() : "";

function json(payload,status=200,headersLike=null){
  const headers=new Headers(headersLike||{});
  headers.set("Content-Type","application/json;charset=UTF-8");
  headers.set("Cache-Control","no-store");
  headers.set("Access-Control-Allow-Origin","*");
  return new Response(JSON.stringify(payload,null,2),{status,headers});
}

function stageOf(body){
  const s=String(body?.context?.workerTask?.stage||"").toUpperCase();
  if(s==="MATERIAL")return "SCRIPT";
  if(s==="PUBLISH")return "PUBLISHING";
  if(["RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"].includes(s))return s;
  const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");
  const m=joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  return m?String(m[1]).toUpperCase():"";
}

function modelText(result){
  const candidates=[result?.response,result?.result?.response,result?.text,result?.result?.text,result?.output_text,result?.result?.output_text,result?.choices?.[0]?.message?.content,result?.result?.choices?.[0]?.message?.content];
  for(const v of candidates){
    if(!text(v))continue;
    return text(v).replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/^```(?:text)?\s*|\s*```$/gi,"").trim();
  }
  if(typeof result==="string")return text(result).replace(/<think>[\s\S]*?<\/think>/gi,"").trim();
  return "";
}

async function runOnce(env,model,system,user,max_tokens=2200,temperature=.25){
  if(!env?.AI)throw new Error("AI binding unavailable");
  const result=await env.AI.run(model,{messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens,temperature});
  const out=modelText(result);
  if(!out)throw new Error(`${model} returned empty output`);
  return out;
}
async function resilient(env,primary,fallback,system,user,max_tokens=2200,temperature=.25){
  let err=null;
  for(let i=0;i<2;i++){try{return await runOnce(env,primary,system,user,max_tokens,temperature);}catch(e){err=e;}}
  if(fallback&&fallback!==primary){for(let i=0;i<2;i++){try{return await runOnce(env,fallback,system,user,max_tokens,temperature);}catch(e){err=e;}}}
  throw err||new Error("Research model returned no usable output");
}

function parseQuickAction(response){
  if(!response)return Promise.resolve({success:false,result:null});
  return (async()=>{
    try{const data=await response.json();return{success:Boolean(data?.success),result:data?.result??null};}
    catch{try{const raw=await response.text();return{success:response.ok,result:raw};}catch{return{success:false,result:null};}}
  })();
}

function safeUrl(raw){
  try{
    const u=new URL(raw);if(!/^https?:$/.test(u.protocol))return"";
    const h=u.hostname.toLowerCase();
    if(h==="localhost"||h.endsWith(".local")||/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h))return"";
    if(["google.com","bing.com","duckduckgo.com","facebook.com","instagram.com","tiktok.com","youtube.com","pinterest.com"].some(d=>h===d||h.endsWith("."+d)))return"";
    u.hash="";return u.toString().replace(/\/$/,"");
  }catch{return"";}
}
function decodeRedirect(raw){
  try{
    const u=new URL(raw),h=u.hostname.toLowerCase();
    if(h.includes("duckduckgo.com")){const x=u.searchParams.get("uddg");if(x)return decodeURIComponent(x);}
    if(h.includes("google.")&&u.pathname==="/url"){const x=u.searchParams.get("q")||u.searchParams.get("url");if(x)return x;}
    return raw;
  }catch{return raw;}
}
function uniqueUrls(values){
  const out=[],seen=new Set();
  for(const raw of values||[]){const u=safeUrl(decodeRedirect(raw));if(!u||seen.has(u))continue;seen.add(u);out.push(u);}
  return out;
}
function urlsIn(value){return uniqueUrls(Array.from(String(value||"").matchAll(/https?:\/\/[^\s)\]}>"']+/g)).map(m=>typeof m==="string"?m:m?.[0]));}

function profileOf(body){const p=body?.context?.profile||{};return{id:p.id||"",name:p.name||"",category:p.category||"",platform:p.platform||"",mission:p.mission||"",canon:p.canon||"",kind:p.kind||""};}
function baseTopic(raw){const m=String(raw||"").match(/^\s*TOPIC\s*:\s*(.+)$/im);return text(m?.[1]).slice(0,260);}
function currentDateLabel(){return new Date().toISOString().slice(0,10);}

async function discover(env,profile,baseReply){
  if(!env?.BROWSER)return [];
  const day=currentDateLabel();
  const topic=baseTopic(baseReply);
  const tech=profile.id==="ch-techverse"||/techverse/i.test(profile.name);
  const queries=tech?[
    `latest technology news ${day} official announcement AI chips cybersecurity cloud software`,
    `latest AI technology product research announcement ${day} official blog`
  ]:[
    topic?`"${topic}" official source ${day}`:`${profile.name} latest official source ${day}`,
    topic?`${topic} primary source news`:`${profile.category||profile.name} latest news`
  ];
  const searchUrls=[];
  for(const q of queries){const x=encodeURIComponent(q);searchUrls.push(`https://www.bing.com/search?q=${x}`,`https://html.duckduckgo.com/html/?q=${x}`);}
  const batches=await Promise.all(searchUrls.map(async url=>{
    try{const r=await env.BROWSER.quickAction("links",{url,visibleLinksOnly:true,gotoOptions:{waitUntil:"domcontentloaded",timeout:9000}});const p=await parseQuickAction(r);return p.success&&Array.isArray(p.result)?p.result:[];}catch{return[];}
  }));
  return uniqueUrls(batches.flat()).slice(0,16);
}

async function renderEvidence(env,urls){
  if(!env?.BROWSER)return[];
  const jobs=urls.slice(0,8).map(async url=>{
    try{
      const r=await env.BROWSER.quickAction("markdown",{url,gotoOptions:{waitUntil:"domcontentloaded",timeout:9000}});
      const p=await parseQuickAction(r);const md=text(p.result);
      if(!p.success||md.length<350)return null;
      return{url,content:md.replace(/\n{3,}/g,"\n\n").slice(0,6500)};
    }catch{return null;}
  });
  return (await Promise.all(jobs)).filter(Boolean).slice(0,6);
}

function evidenceBundle(rows){return rows.map((e,i)=>`SOURCE ${i+1}\nURL: ${e.url}\nCONTENT:\n${e.content}`).join("\n\n---\n\n");}
function allowedUrls(rows){return rows.map(x=>x.url);}
function selectedUrls(raw,rows){const allow=new Map(rows.map(x=>[safeUrl(x.url),x.url]));const out=[];for(const u of urlsIn(raw)){const exact=allow.get(safeUrl(u));if(exact&&!out.includes(exact))out.push(exact);}return out;}
function factCount(raw){const m=String(raw||"").match(/^\s*VERIFIED_FACTS\s*:\s*([\s\S]*?)(?=^\s*[A-Z][A-Z_ ]+\s*:|$)/im);if(!m)return 0;return (m[1].match(/^\s*[-•]\s+/gm)||[]).length;}
function hasRequired(raw){const s=String(raw||"");return /^\s*RESEARCH_PASS\b/im.test(s)&&/^\s*TOPIC\s*:/im.test(s)&&/^\s*RECENCY\s*:/im.test(s)&&/^\s*VERIFIED_FACTS\s*:/im.test(s)&&/^\s*WHY_IT_MATTERS\s*:/im.test(s)&&/^\s*ANGLE\s*:/im.test(s)&&/^\s*VISUAL_FACTS\s*:/im.test(s)&&/^\s*SOURCES\s*:/im.test(s);}
function score(raw,label){const m=String(raw||"").match(new RegExp(`${label}\\s*:\\s*(10(?:\\.0+)?|[0-9](?:\\.[0-9]+)?)`,`i`));return m?Math.max(0,Math.min(10,Number(m[1]))):0;}
function issues(raw){const m=String(raw||"").match(/ISSUES\s*:\s*([\s\S]*)/i);return text(m?.[1]).slice(0,1400);}

async function synthesize(env,profile,baseReply,evidence,note=""){
  const tech=profile.id==="ch-techverse"||/techverse/i.test(profile.name);
  const system=[
    "You are KAI Research Director for ACC Studio Content, operating like a rigorous senior newsroom researcher.",
    tech?"TECHVERSE RULE: Latest First. Prefer the newest consequential technology development supported by the rendered sources. Reject stale evergreen topics when newer supported developments exist.":"Prefer current, consequential, source-grounded information.",
    "Use ONLY facts supported by RENDERED SOURCES. Do not use memory to add facts, dates, numbers, quotes, causes, consequences or forecasts.",
    "Prefer primary/official sources when present; secondary reporting may add context but must not replace primary evidence when available.",
    "Choose one coherent topic. Separate fact from interpretation. If a claim is uncertain, omit it.",
    "Every source URL in the output must be copied exactly from ALLOWED URLS.",
    "For TechVerse, favor developments from the last 30 days when the rendered evidence supports them.",
    "Return plain text in exactly this public production structure:",
    "RESEARCH_PASS",
    "TOPIC: ...",
    "PUBLIC_HEADLINE: ...",
    "RECENCY: ...",
    "VERIFIED_FACTS:",
    "- at least four precise evidence-backed facts",
    "CONTEXT: ...",
    "WHY_IT_MATTERS: ...",
    "COUNTERPOINT_OR_RISK: ...",
    "ANGLE: ...",
    "KEY_POINTS:",
    "- ...",
    "VISUAL_FACTS:",
    "- only visually representable facts supported by evidence",
    "RISK_NOTES: ...",
    "SOURCE_NOTES:",
    "GROUNDING_URLS: <at least two exact allowed URLs on this same line>",
    "SOURCES:",
    "- exact allowed URL"
  ].join("\n");
  const user=[
    `CURRENT_DATE: ${currentDateLabel()}`,
    `CHANNEL:\n${JSON.stringify(profile)}`,
    baseReply?`BASE RESEARCH FROM CORE (NOT AUTHORITATIVE IF RENDERED SOURCES CONTRADICT IT):\n${baseReply}`:"",
    `ALLOWED URLS:\n${allowedUrls(evidence).join("\n")}`,
    `RENDERED SOURCES:\n${evidenceBundle(evidence)}`,
    note,
    "Produce the strongest newsroom-grade evidence packet possible without inventing anything."
  ].filter(Boolean).join("\n\n");
  return resilient(env,DIRECTOR_MODEL,CRITIC_MODEL,system,user,2800,.28);
}

async function audit(env,profile,candidate,evidence){
  const system=[
    "You are an independent Research Standards Board. Be strict and evidence-first.",
    "Judge only against the rendered evidence provided.",
    "Score 0-10 for RECENCY_SCORE, SOURCE_AUTHORITY_SCORE, EVIDENCE_SCORE, SPECIFICITY_SCORE, EDITORIAL_VALUE_SCORE, and OVERALL_RESEARCH_SCORE.",
    "Any unsupported claim caps EVIDENCE_SCORE and OVERALL_RESEARCH_SCORE below 6.",
    "A stale/generic TechVerse topic caps RECENCY_SCORE and OVERALL_RESEARCH_SCORE below 8.",
    "A packet relying only on low-authority secondary sources cannot exceed 8.4 unless no better source exists and this limitation is explicit.",
    "Return exactly those six score lines followed by ISSUES: <specific actionable critique>."
  ].join("\n");
  return resilient(env,CRITIC_MODEL,DIRECTOR_MODEL,system,[`CHANNEL: ${profile.name}`,`CURRENT_DATE: ${currentDateLabel()}`,`RENDERED EVIDENCE:\n${evidenceBundle(evidence)}`,`CANDIDATE:\n${candidate}`].join("\n\n"),1100,.08);
}

async function buildResearch(env,profile,baseReply){
  const existing=urlsIn(baseReply);
  const discovered=await discover(env,profile,baseReply);
  const candidates=uniqueUrls([...existing,...discovered]).slice(0,12);
  const evidence=await renderEvidence(env,candidates);
  if(evidence.length<2)throw new Error(`insufficient rendered evidence (${evidence.length} usable sources)`);

  let candidate=await synthesize(env,profile,baseReply,evidence);
  let auditRaw=await audit(env,profile,candidate,evidence);
  let overall=score(auditRaw,"OVERALL_RESEARCH_SCORE");
  let passes=1;
  if(overall<MIN_RESEARCH||!hasRequired(candidate)||selectedUrls(candidate,evidence).length<2||factCount(candidate)<4){
    candidate=await synthesize(env,profile,baseReply,evidence,`Research Standards Board rejected the previous packet. Fix these issues exactly:\n${issues(auditRaw)}\nRebuild the packet rather than merely polishing wording. Use stronger supported facts, a sharper evidence-backed angle and the newest supported topic.`);
    auditRaw=await audit(env,profile,candidate,evidence);
    overall=score(auditRaw,"OVERALL_RESEARCH_SCORE");passes=2;
  }
  const sources=selectedUrls(candidate,evidence);
  if(!hasRequired(candidate)||sources.length<2||factCount(candidate)<4||overall<MIN_RESEARCH){
    throw new Error(`research quality below studio threshold (${overall.toFixed(1)}/10 after ${passes} board pass${passes===1?"":"es"}; sources ${sources.length}; facts ${factCount(candidate)})`);
  }
  return{reply:candidate,meta:{revision:REVISION,role:"KAI_RESEARCH_DIRECTOR",model:DIRECTOR_MODEL,criticModel:CRITIC_MODEL,researchScore:overall,threshold:MIN_RESEARCH,boardPasses:passes,sourceCount:sources.length,factCount:factCount(candidate),recencyScore:score(auditRaw,"RECENCY_SCORE"),sourceAuthorityScore:score(auditRaw,"SOURCE_AUTHORITY_SCORE"),evidenceScore:score(auditRaw,"EVIDENCE_SCORE"),specificityScore:score(auditRaw,"SPECIFICITY_SCORE"),editorialValueScore:score(auditRaw,"EDITORIAL_VALUE_SCORE"),criticIssues:issues(auditRaw)}};
}

async function health(request,env,ctx){
  const upstream=await baseWorker.fetch(request,env,ctx);let data={};try{data=await upstream.clone().json();}catch{}
  return json({...(data&&typeof data==="object"?data:{}),kaiResearchIntelligence:"ACTIVE",kaiResearchRevision:REVISION,kaiResearchDirectorModel:DIRECTOR_MODEL,kaiResearchCriticModel:CRITIC_MODEL,kaiResearchThreshold:MIN_RESEARCH,techverseResearchPolicy:"LATEST_FIRST_PRIMARY_SOURCE_PREFERRED"},upstream.status,upstream.headers);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);
    let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
    if(stageOf(body)!=="RESEARCH")return baseWorker.fetch(request,env,ctx);

    const upstream=await baseWorker.fetch(request,env,ctx);if(!upstream.ok)return upstream;
    let payload;try{payload=await upstream.clone().json();}catch{return upstream;}
    const baseReply=text(payload?.reply);if(!baseReply||payload?.ok===false)return upstream;
    try{
      const profile=profileOf(body);
      const refined=await buildResearch(env,profile,baseReply);
      return json({...payload,reply:refined.reply,provider:`${text(payload.provider)||"ACC OS X"} + KAI Research Intelligence`,kaiResearch:refined.meta},upstream.status,upstream.headers);
    }catch(error){
      return json({ok:false,stage:"RESEARCH",status:"KAI_RESEARCH_QUALITY_BLOCKED",error:`KAI_RESEARCH_QUALITY_BLOCKED: ${String(error?.message||error)}`,errorDetail:{code:"KAI_RESEARCH_QUALITY_BLOCKED",revision:REVISION,message:String(error?.message||error)}},422,upstream.headers);
    }
  }
};
