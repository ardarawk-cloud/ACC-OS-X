// ACC OS X — BUILD 257.6.4 RESILIENT NEWS DISCOVERY
// Replaces single-source news acquisition for research-first Produce Copilot K/N.
// Discovery chain: Bing News RSS -> Google News RSS -> Browser search links.
// Non-news K/N and all P/C/Automatic Mission/Meta publishing traffic delegate unchanged.

import baseWorker from "./worker-copilot-autonomous-execution-v25763.js";

const REVISION = "BUILD257_6_4_RESILIENT_NEWS_DISCOVERY";
const PRIMARY_MODEL = "@cf/openai/gpt-oss-120b";
const FAST_MODEL = "@cf/meta/llama-4-scout-17b-16e-instruct";
const text = v => typeof v === "string" ? v.trim() : "";

function json(data,status=200,headersLike=null){
  const h=new Headers(headersLike||{});
  h.set("Content-Type","application/json;charset=UTF-8");
  h.set("Cache-Control","no-store");
  h.set("Access-Control-Allow-Origin","*");
  return new Response(JSON.stringify(data),{status,headers:h});
}

function commandOf(body){
  const explicit=text(body?.context?.copilot?.command);
  if(explicit)return explicit;
  const rows=Array.isArray(body?.messages)?body.messages:[];
  for(let i=rows.length-1;i>=0;i--){
    if(String(rows[i]?.role||"").toLowerCase()==="user"&&text(rows[i]?.content))return text(rows[i].content);
  }
  return "";
}

function opOf(command){
  const c=text(command);
  if(/^(?:k|konten|content)\b/i.test(c))return "K";
  if(/^(?:n|next|lanjut)\b/i.test(c))return "N";
  return "";
}

function packetOf(body){
  const c=body?.context||{},p=c?.profile||{},cp=c?.copilot||{};
  return {
    profile:{
      id:text(p.id),code:text(p.code),name:text(p.name),platform:text(p.platform)||"Facebook",
      category:text(p.category),department:text(p.department),workflow:text(p.workflow),
      mission:text(p.mission),canon:text(p.canon),kind:text(p.kind)
    },
    contexts:(Array.isArray(c.contexts)?c.contexts:[]).filter(x=>x?.active!==false).slice(0,14).map(x=>({
      type:text(x?.type),title:text(x?.title),version:text(x?.version),content:text(x?.content).slice(0,3200)
    })),
    material:text(cp.material).slice(0,12000),
    history:(Array.isArray(cp.history)?cp.history:[]).slice(-10).map(x=>({role:text(x?.role),content:text(x?.content).slice(0,1800)}))
  };
}

function fingerprint(packet){
  return [
    packet.profile.name,packet.profile.category,packet.profile.department,packet.profile.workflow,
    packet.profile.mission,packet.profile.canon,
    ...packet.contexts.flatMap(x=>[x.title,x.type,x.content])
  ].filter(Boolean).join("\n").toLowerCase();
}

function isResearchFirst(packet){
  return /\b(berita|news|breaking|terkini|terbaru|aktual|current\s+(?:news|issue|event)|latest\s+first|latest\s+news|trending|trend\s+terbaru|freshness|fact\s*before\s*speed|research[- ]first|verify\s+facts|verifikasi\s+fakta|event\s+guide|h\+1|gaming\s+news|film\s+news)\b/i.test(fingerprint(packet));
}

function isResearchCopilot(body){
  const stage=String(body?.context?.workerTask?.stage||"").toUpperCase();
  if(stage!=="COPILOT"&&stage!=="PRODUCE_COPILOT")return false;
  if(!opOf(commandOf(body)))return false;
  return isResearchFirst(packetOf(body));
}

function contextText(packet){
  return [
    `CHANNEL PROFILE:\n${JSON.stringify(packet.profile)}`,
    packet.contexts.length?`LOCKED CHANNEL MASTER / CONTEXT:\n${JSON.stringify(packet.contexts)}`:"",
    packet.material?`PREVIOUS/CURRENT MATERIAL:\n${packet.material}`:"",
    packet.history.length?`RECENT COPILOT HISTORY:\n${packet.history.map(x=>`${x.role}: ${x.content}`).join("\n")}`:""
  ].filter(Boolean).join("\n\n");
}

function cleanModelText(v){
  return text(v).replace(/<think>[\s\S]*?<\/think>/gi,"").replace(/^```(?:text|json)?\s*|\s*```$/gi,"").trim();
}

function partText(v){
  if(typeof v==="string")return text(v);
  if(Array.isArray(v))return v.map(partText).filter(Boolean).join("\n").trim();
  if(!v||typeof v!=="object")return "";
  for(const item of [v.output_text,v.text,v.response,v.content,v.message]){
    const out=partText(item); if(out)return out;
  }
  return "";
}

function modelText(r){
  if(typeof r==="string")return cleanModelText(r);
  if(!r||typeof r!=="object")return "";
  const candidates=[r.response,r.output_text,r.text,r.choices?.[0]?.message?.content,r.choices?.[0]?.text,r.result?.response,r.result?.output_text,r.result?.text,r.result?.choices?.[0]?.message?.content,r.output,r.result?.output];
  for(const c of candidates){const out=partText(c);if(out)return cleanModelText(out);}
  return "";
}

async function timed(promise,ms,label){
  let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(`${label}_TIMEOUT`)),ms);});
  try{return await Promise.race([promise,timeout]);}finally{clearTimeout(timer);}
}

async function runAI(env,system,user,{max_tokens=2200,temperature=.35,primary=PRIMARY_MODEL,fallback=FAST_MODEL,timeout=30000}={}){
  if(!env?.AI)throw new Error("AI_BINDING_UNAVAILABLE");
  const failures=[];
  for(const model of [primary,fallback].filter((m,i,a)=>m&&a.indexOf(m)===i)){
    try{
      const raw=await timed(env.AI.run(model,{messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens,temperature}),timeout,"COPILOT_AI");
      const out=modelText(raw);
      if(!out)throw new Error("EMPTY_OUTPUT");
      return {text:out,model};
    }catch(error){failures.push(`${model}=${String(error?.message||error).slice(0,160)}`);}
  }
  throw new Error(`COPILOT_MODEL_CHAIN_EXHAUSTED: ${failures.join(" | ")}`);
}

function decodeXml(s){
  return String(s||"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
}

function stripHtml(raw){
  return decodeXml(String(raw||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<noscript[\s\S]*?<\/noscript>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim();
}

function safeUrl(raw){
  try{
    const u=new URL(String(raw||""));
    if(!/^https?:$/.test(u.protocol))return "";
    const h=u.hostname.toLowerCase();
    if(h==="localhost"||h.endsWith(".local")||/^127\./.test(h)||/^10\./.test(h)||/^192\.168\./.test(h)||/^169\.254\./.test(h))return "";
    u.hash="";
    return u.toString();
  }catch{return "";}
}

function unwrapSearchUrl(raw){
  const url=safeUrl(raw); if(!url)return "";
  try{
    const u=new URL(url),h=u.hostname.toLowerCase();
    if(h.includes("google.")&&u.pathname==="/url")return safeUrl(u.searchParams.get("q")||u.searchParams.get("url")||"");
    if(h.includes("duckduckgo.com")){const x=u.searchParams.get("uddg");if(x)return safeUrl(decodeURIComponent(x));}
    return url;
  }catch{return url;}
}

function usefulPublisherUrl(raw){
  const url=unwrapSearchUrl(raw); if(!url)return "";
  try{
    const h=new URL(url).hostname.toLowerCase();
    const blocked=["google.com","google.co.id","googleusercontent.com","gstatic.com","bing.com","microsoft.com","duckduckgo.com","yahoo.com","facebook.com","instagram.com","tiktok.com","youtube.com","pinterest.com"];
    if(blocked.some(d=>h===d||h.endsWith("."+d)))return "";
    return url;
  }catch{return "";}
}

async function fetchWithTimeout(url,timeout=7500){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeout);
  try{
    return await fetch(url,{redirect:"follow",headers:{"User-Agent":"Mozilla/5.0 ACC-OS-X Copilot Research","Accept":"text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8"},signal:controller.signal});
  }finally{clearTimeout(timer);}
}

function rssItems(xml,source){
  const rows=[];
  for(const item of String(xml||"").matchAll(/<item>([\s\S]*?)<\/item>/gi)){
    const block=item[1];
    const title=decodeXml(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||"").trim();
    const link=safeUrl(decodeXml(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1]||"").trim());
    const description=stripHtml(block.match(/<description>([\s\S]*?)<\/description>/i)?.[1]||"").slice(0,900);
    const pubDate=decodeXml(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]||"").trim();
    if(title&&link)rows.push({title,link,description,pubDate,discovery:source});
    if(rows.length>=8)break;
  }
  return rows;
}

async function rssDiscovery(query){
  const endpoints=[
    {name:"BING_NEWS_RSS",url:`https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`},
    {name:"GOOGLE_NEWS_RSS",url:`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=id&gl=ID&ceid=ID:id`}
  ];
  const out=[];
  for(const ep of endpoints){
    try{
      const response=await fetchWithTimeout(ep.url,7000);
      if(!response.ok)continue;
      out.push(...rssItems(await response.text(),ep.name));
    }catch{}
    if(out.length>=8)break;
  }
  return out;
}

async function quickResult(response){
  if(!response)return null;
  try{const d=await response.json();return d?.result??null;}catch{}
  try{return await response.text();}catch{return null;}
}

function linkRows(value,source){
  if(!Array.isArray(value))return [];
  const out=[];
  for(const item of value){
    const raw=typeof item==="string"?item:(item?.url||item?.href||item?.link||"");
    const link=usefulPublisherUrl(raw); if(!link)continue;
    const title=text(typeof item==="object"?(item?.text||item?.title||item?.label):"")||new URL(link).hostname;
    out.push({title,link,description:"",pubDate:"",discovery:source});
  }
  return out;
}

async function browserDiscovery(env,query){
  if(!env?.BROWSER)return [];
  const pages=[
    {name:"BROWSER_BING_NEWS",url:`https://www.bing.com/news/search?q=${encodeURIComponent(query)}`},
    {name:"BROWSER_GOOGLE_NEWS",url:`https://www.google.com/search?tbm=nws&q=${encodeURIComponent(query)}`},
    {name:"BROWSER_DDG",url:`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query+" news")}`}
  ];
  const out=[];
  for(const page of pages){
    try{
      const response=await env.BROWSER.quickAction("links",{url:page.url,visibleLinksOnly:true,gotoOptions:{waitUntil:"domcontentloaded",timeout:8000}});
      out.push(...linkRows(await quickResult(response),page.name));
    }catch{}
    if(out.length>=8)break;
  }
  return out;
}

function uniqueRows(rows){
  const out=[],seen=new Set();
  for(const row of rows||[]){
    const link=safeUrl(row?.link); if(!link||seen.has(link))continue;
    seen.add(link);out.push({...row,link});
  }
  return out;
}

async function discoverMulti(env,query){
  let rows=uniqueRows(await rssDiscovery(query));
  if(rows.length<4)rows=uniqueRows([...rows,...await browserDiscovery(env,query)]);
  if(!rows.length)throw new Error("NEWS_DISCOVERY_ALL_SOURCES_EMPTY");
  return rows.slice(0,10);
}

async function deriveBroadQuery(env,packet,command){
  const system=[
    "You are ACC OS X News Assignment Router.",
    "Return one broad but channel-specific query for discovering the freshest candidate stories right now.",
    "Do not ask the owner questions. Do not explain workflow. Return exactly QUERY: <query>."
  ].join("\n");
  const user=[`CURRENT_TIME_UTC: ${new Date().toISOString()}`,contextText(packet),`OWNER COMMAND: ${command}`].join("\n\n");
  try{
    const r=await runAI(env,system,user,{primary:FAST_MODEL,fallback:PRIMARY_MODEL,max_tokens:160,temperature:.1,timeout:16000});
    const m=r.text.match(/^\s*QUERY\s*:\s*(.+)$/im); if(text(m?.[1]))return text(m[1]).slice(0,180);
  }catch{}
  return `${packet.profile.name} berita terbaru hari ini`;
}

async function chooseTopic(env,packet,rows){
  const candidates=rows.slice(0,8).map((r,i)=>`${i+1}. ${r.title}\nURL: ${r.link}\nDATE: ${r.pubDate||"unknown"}`).join("\n\n");
  const system=[
    "You are ACC OS X Assignment Editor.",
    "Select ONE current story with the highest editorial value for the selected channel.",
    "Prefer specific consequential stories over generic trend pages.",
    "Return exactly TOPIC_QUERY: <short query that can find corroborating reports on the same story>."
  ].join("\n");
  const user=[`CURRENT_TIME_UTC: ${new Date().toISOString()}`,contextText(packet),`CANDIDATES:\n${candidates}`].join("\n\n");
  const r=await runAI(env,system,user,{primary:FAST_MODEL,fallback:PRIMARY_MODEL,max_tokens:180,temperature:.1,timeout:18000});
  const m=r.text.match(/^\s*TOPIC_QUERY\s*:\s*(.+)$/im);
  return text(m?.[1])||text(rows[0]?.title);
}

async function readArticle(env,row){
  let finalUrl=row.link,content="",mode="DISCOVERY_SNIPPET";
  try{
    const response=await fetchWithTimeout(row.link,7000);
    finalUrl=safeUrl(response.url)||row.link;
    if(response.ok){
      const ct=response.headers.get("content-type")||"";
      if(/html|text/i.test(ct)){
        const plain=stripHtml(await response.text());
        if(plain.length>=500){content=plain.slice(0,6500);mode="DIRECT_FETCH";}
      }
    }
  }catch{}
  if(!content&&env?.BROWSER){
    try{
      const response=await env.BROWSER.quickAction("markdown",{url:finalUrl,gotoOptions:{waitUntil:"domcontentloaded",timeout:8000}});
      const result=await quickResult(response),md=text(result);
      if(md.length>=350){content=md.slice(0,6500);mode="BROWSER_MARKDOWN";}
    }catch{}
  }
  if(!content)content=[row.title,row.description].filter(Boolean).join("\n");
  return {...row,link:finalUrl,content,mode};
}

async function acquireEvidence(env,packet,command){
  const broadQuery=await deriveBroadQuery(env,packet,command);
  const candidates=await discoverMulti(env,broadQuery);
  const topicQuery=await chooseTopic(env,packet,candidates);
  let topicRows=await discoverMulti(env,topicQuery);
  topicRows=uniqueRows([...topicRows,...candidates.filter(r=>String(r.title||"").toLowerCase().includes(String(topicQuery||"").toLowerCase().split(" ")[0]||"___"))]);
  const rows=[];
  const hosts=new Set();
  for(const row of topicRows.slice(0,7)){
    if(rows.length>=4)break;
    const read=await readArticle(env,row);
    if(text(read.content).length<120)continue;
    let host="";try{host=new URL(read.link).hostname.toLowerCase();}catch{}
    if(host&&hosts.has(host)&&rows.length<2)continue;
    if(host)hosts.add(host);
    rows.push(read);
  }
  if(rows.length<2)throw new Error(`COPILOT_RESEARCH_INSUFFICIENT: ${rows.length} usable corroborating sources for ${topicQuery}`);
  const evidence=rows.map((r,i)=>[
    `SOURCE ${i+1}`,
    `TITLE: ${r.title}`,
    `PUBLISHED: ${r.pubDate||"unknown"}`,
    `URL: ${r.link}`,
    `DISCOVERY: ${r.discovery||"unknown"}`,
    `READ_MODE: ${r.mode}`,
    `CONTENT: ${r.content}`
  ].join("\n")).join("\n\n---\n\n");
  return {broadQuery,topicQuery,rows,evidence};
}

function invalidOwnerFacing(value){
  return /\b(apakah\s+(?:anda|kamu)|silakan\s+pilih|pilih\s+salah\s+satu|saya\s+(?:memerlukan|membutuhkan)\s+(?:informasi|detail)|tolong\s+tentukan|saya\s+akan\s+mencari|kita\s+(?:perlu|harus)\s+mencari|berdasarkan\s+workflow\s+rules|sesuai\s+workflow\s+rules|locked\s+master|master\s+context|aturan\s+acc|internal\s+workflow|please\s+choose|need\s+more\s+(?:information|details))\b/i.test(String(value||""));
}

async function generateMaterial(env,packet,command,op,evidencePack,repair=""){
  const system=[
    "You are KAI, senior editorial producer inside ACC OS X Produce Copilot.",
    "K/N are execution commands. Produce the finished owner-facing material now.",
    "Read the channel master silently. Never quote or explain internal ACC/master/workflow rules.",
    "Do not ask the owner to choose topic, date, category, angle or audience when the channel master and evidence are sufficient.",
    "Use ONLY CURRENT EVIDENCE for factual/current claims. If sources disagree, state only the common verified facts.",
    "Select the strongest publishable angle yourself and make the material ready for the next P command.",
    op==="N"?"Advance to the next valid story/item and avoid repeating the previous material.":"Create the K/KONTEN material for the selected channel.",
    repair?"The previous draft violated execution policy. Replace it completely; do not mention the rejection.":""
  ].filter(Boolean).join("\n");
  const user=[
    `CURRENT_TIME_UTC: ${new Date().toISOString()}`,
    contextText(packet),
    `CURRENT EVIDENCE:\nBROAD_QUERY: ${evidencePack.broadQuery}\nTOPIC_QUERY: ${evidencePack.topicQuery}\n${evidencePack.evidence}`,
    `OWNER COMMAND: ${command}`,
    repair?`REJECTED DRAFT:\n${repair.slice(0,4500)}`:""
  ].filter(Boolean).join("\n\n");
  return runAI(env,system,user,{max_tokens:2800,temperature:.42,timeout:32000});
}

async function executeResearchCopilot(env,body){
  const command=commandOf(body),op=opOf(command),packet=packetOf(body);
  if(!packet.profile.id||!packet.profile.name)throw new Error("COPILOT_CONTEXT_MISSING");
  const evidence=await acquireEvidence(env,packet,command);
  let result=await generateMaterial(env,packet,command,op,evidence);
  if(invalidOwnerFacing(result.text)){
    result=await generateMaterial(env,packet,command,op,evidence,result.text);
    if(invalidOwnerFacing(result.text))throw new Error("COPILOT_EXECUTION_POLICY_BLOCKED_NON_EXECUTING_OUTPUT");
  }
  return {
    ok:true,stage:"COPILOT",op,kind:"material",reply:result.text,model:result.model,revision:REVISION,
    copilotExecution:{mode:"EXECUTE_NOT_INTERVIEW",freshResearch:true,discoveryChain:["BING_NEWS_RSS","GOOGLE_NEWS_RSS","BROWSER_SEARCH"],broadQuery:evidence.broadQuery,topicQuery:evidence.topicQuery,sourceCount:evidence.rows.length}
  };
}

async function health(request,env,ctx){
  const upstream=await baseWorker.fetch(request,env,ctx);
  let data={};try{data=await upstream.clone().json();}catch{}
  return json({
    ...(data&&typeof data==="object"?data:{}),
    copilotNewsDiscovery:"ACTIVE",
    copilotNewsDiscoveryRevision:REVISION,
    copilotNewsDiscoveryChain:["BING_NEWS_RSS","GOOGLE_NEWS_RSS","BROWSER_BING_NEWS","BROWSER_GOOGLE_NEWS","BROWSER_DDG"],
    copilotNewsAssignment:"BROAD_DISCOVERY_TO_TOPIC_CORROBORATION",
    copilotNewsMinSources:2
  },upstream.status,upstream.headers);
}

export default {
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);
    let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
    if(!isResearchCopilot(body))return baseWorker.fetch(request,env,ctx);
    try{return json(await executeResearchCopilot(env,body),200);}
    catch(error){return json({ok:false,stage:"COPILOT",status:"COPILOT_NEWS_RESEARCH_FAILED",error:String(error?.message||error),detail:{revision:REVISION,op:opOf(commandOf(body)),discovery:"MULTI_SOURCE_FAIL_CLOSED"}},422);}
  }
};
