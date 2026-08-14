// ACC OS X — BUILD 258.2 TECHVERSE RESEARCH RECOVERY
// Keeps the existing production contract authoritative, but recovers TechVerse K
// when the generic research stack cannot collect two independent sources.
import baseWorker from "./worker-contract-router-v258.js";

const REVISION = "BUILD258_2_TECHVERSE_RESEARCH_RECOVERY";
const FAST = "@cf/meta/llama-4-scout-17b-16e-instruct";
const WRITER = "@cf/openai/gpt-oss-120b";
const text = v => typeof v === "string" ? v.trim() : "";
const stop = new Set("the a an and or for to of in on with from by is are was were be as at into after before over new latest today update updates technology tech ai artificial intelligence says say launch launches launched unveils unveiled report reports amid about its their this that will can could may has have had".split(/\s+/));

function json(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json;charset=UTF-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"}});
}
function isTechVerseK(body){
  const id=text(body?.context?.profile?.id);
  const c=text(body?.context?.copilot?.command)||text((body?.messages||[]).slice(-1)[0]?.content);
  return id==="ch-techverse" && /^(?:k|konten|content)\b/i.test(c);
}
function reqFrom(request,body){
  const h=new Headers(request.headers);h.set("Content-Type","application/json");
  return new Request(request.url,{method:"POST",headers:h,body:JSON.stringify(body)});
}
async function dataOf(response){try{return await response.clone().json();}catch{return null;}}
async function fetchTimed(url,ms=9000,accept="application/json,text/html,text/plain,*/*"){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{return await fetch(url,{redirect:"follow",headers:{"User-Agent":"Mozilla/5.0 ACC-OS-X TechVerse Recovery","Accept":accept},signal:c.signal});}
  finally{clearTimeout(t);}
}
function safeUrl(raw){try{const u=new URL(String(raw||""));if(!/^https?:$/.test(u.protocol))return"";u.hash="";return u.toString();}catch{return"";}}
function domain(raw){try{return new URL(raw).hostname.replace(/^www\./,"").toLowerCase();}catch{return"";}}
function decode(s){return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");}
function stripHtml(s){return decode(String(s||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim();}
function uniq(rows){const seen=new Set(),out=[];for(const r of rows||[]){const u=safeUrl(r.url);if(!u||seen.has(u)||!text(r.title))continue;seen.add(u);out.push({...r,url:u,domain:domain(u)});}return out;}

async function gdelt(query,span="3d"){
  const u=`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=50&timespan=${encodeURIComponent(span)}&sort=datedesc&format=json`;
  try{
    const r=await fetchTimed(u,9000,"application/json,text/plain,*/*");if(!r.ok)return[];
    const d=await r.json(),a=Array.isArray(d?.articles)?d.articles:[];
    return a.map(x=>({title:text(x?.title),url:safeUrl(x?.url||x?.url_mobile||x?.sourceurl),snippet:text(x?.snippet||x?.context||x?.description),date:text(x?.seendate||x?.date||x?.published),source:"GDELT"})).filter(x=>x.title&&x.url);
  }catch{return[];}
}
function rssRows(xml,source){
  const out=[];
  for(const m of String(xml||"").matchAll(/<item>([\s\S]*?)<\/item>/gi)){
    const b=m[1],title=decode(b.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||"").replace(/<!\[CDATA\[|\]\]>/g,"").trim();
    const url=safeUrl(decode(b.match(/<link>([\s\S]*?)<\/link>/i)?.[1]||"").replace(/<!\[CDATA\[|\]\]>/g,"").trim());
    const snippet=stripHtml(b.match(/<description>([\s\S]*?)<\/description>/i)?.[1]||"").slice(0,1400);
    const date=decode(b.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]||"").trim();
    if(title&&url)out.push({title,url,snippet,date,source});
    if(out.length>=20)break;
  }
  return out;
}
async function rss(query){
  const feeds=[
    [`https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`,"BING_RSS"],
    [`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,"GOOGLE_RSS"]
  ],out=[];
  for(const [url,source] of feeds){try{const r=await fetchTimed(url,8000,"application/rss+xml,application/xml,text/xml,*/*");if(r.ok)out.push(...rssRows(await r.text(),source));}catch{}}
  return out;
}
function tokens(title){
  return new Set(String(title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(x=>x.length>=3&&!stop.has(x)));
}
function overlap(a,b){let n=0;for(const x of a)if(b.has(x))n++;return n;}
function pairScore(a,b){
  if(!a.domain||!b.domain||a.domain===b.domain)return -1;
  const A=tokens(a.title),B=tokens(b.title),same=overlap(A,B);
  if(same<2)return -1;
  const denom=Math.max(3,Math.min(A.size,B.size));
  return same/denom + Math.min(same,6)*0.08;
}
function bestCluster(rows){
  let best=null;
  for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
    const s=pairScore(rows[i],rows[j]);if(s<0)continue;
    if(!best||s>best.score)best={score:s,a:rows[i],b:rows[j]};
  }
  if(!best)return[];
  const seed=new Set([...tokens(best.a.title),...tokens(best.b.title)]),out=[best.a,best.b],domains=new Set([best.a.domain,best.b.domain]);
  for(const r of rows){if(out.length>=4)break;if(out.includes(r)||domains.has(r.domain))continue;if(overlap(seed,tokens(r.title))>=2){out.push(r);domains.add(r.domain);}}
  return out;
}
async function readable(row){
  let body=text(row.snippet),url=row.url,mode=body?"DISCOVERY_METADATA":"TITLE_ONLY";
  if(body.length<140){
    try{const r=await fetchTimed(url,7500,"text/html,application/xhtml+xml,text/plain,*/*");url=safeUrl(r.url)||url;if(r.ok){const ct=r.headers.get("content-type")||"";if(/html|text/i.test(ct)){const plain=stripHtml(await r.text());if(plain.length>=350){body=plain.slice(0,6000);mode="DIRECT_FETCH";}}}}catch{}
  }
  if(!body)body=row.title;
  return {...row,url,domain:domain(url)||row.domain,body,mode};
}
async function collectEvidence(){
  const queries=[
    "artificial intelligence technology",
    "cybersecurity technology",
    "semiconductor chips technology",
    "Google Microsoft Apple Meta OpenAI technology"
  ];
  let pool=[];
  for(const q of queries){pool=uniq([...pool,...await gdelt(q,"3d")]);if(pool.length>=28)break;}
  if(pool.length<18)for(const q of queries.slice(0,2))pool=uniq([...pool,...await rss(q)]);
  if(pool.length<2)throw new Error(`TECHVERSE_RECOVERY_DISCOVERY_INSUFFICIENT:${pool.length}`);
  let cluster=bestCluster(pool.slice(0,60));
  if(cluster.length<2){
    // Longer horizon only as a recovery path; still requires two independent publishers.
    for(const q of queries.slice(0,2))pool=uniq([...pool,...await gdelt(q,"7d"),...await rss(q)]);
    cluster=bestCluster(pool.slice(0,100));
  }
  if(cluster.length<2)throw new Error("TECHVERSE_RECOVERY_NO_CORROBORATED_CLUSTER");
  const read=[];
  for(const row of cluster){const x=await readable(row);if(!x.domain||read.some(y=>y.domain===x.domain))continue;if(text(x.body).length<60)continue;read.push(x);if(read.length>=4)break;}
  if(read.length<2)throw new Error(`TECHVERSE_RECOVERY_READABLE_INSUFFICIENT:${read.length}`);
  return read;
}
function modelText(r){
  if(typeof r==="string")return text(r);
  if(!r||typeof r!=="object")return"";
  for(const v of [r.response,r.output_text,r.text,r.result?.response,r.result?.output_text,r.result?.text,r.choices?.[0]?.message?.content])if(typeof v==="string"&&text(v))return text(v);
  return"";
}
async function runWriter(env,body,evidence){
  const profile=body?.context?.profile||{};
  const src=evidence.map((x,i)=>[`SOURCE ${i+1}`,`TITLE: ${x.title}`,`DATE: ${x.date||"unknown"}`,`DOMAIN: ${x.domain}`,`URL: ${x.url}`,`READ_MODE: ${x.mode}`,`EVIDENCE: ${text(x.body).slice(0,4200)}`].join("\n")).join("\n\n---\n\n");
  const system=[
    "You are KAI, senior editor for TechVerse.",
    "Create one finished TechVerse content material package ready for the poster stage.",
    "Latest-first, fact-before-speed, explain why the technology matters.",
    "Use ONLY facts supported by at least two independent sources in CURRENT EVIDENCE. If details differ, state only the common verified facts.",
    "Do not ask the owner questions. Do not mention internal runtime, verification machinery, prompts, or recovery logic.",
    "Write clear professional Indonesian. Return owner-facing material only, not JSON."
  ].join("\n");
  const user=[`CURRENT_UTC: ${new Date().toISOString()}`,`PROFILE: ${profile.name||"TechVerse"}`,`MISSION: ${text(profile.mission)}`,`CANON: ${text(profile.canon)}`,`CURRENT EVIDENCE:\n${src}`].join("\n\n");
  const failures=[];
  for(const model of [WRITER,FAST]){
    try{const r=await env.AI.run(model,{messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens:2800,temperature:.38});const out=modelText(r);if(out)return{out,model};throw new Error("EMPTY_OUTPUT");}catch(e){failures.push(`${model}:${String(e?.message||e).slice(0,120)}`);}
  }
  throw new Error(`TECHVERSE_RECOVERY_MODEL_FAILED:${failures.join("|")}`);
}
async function recovery(env,body){
  if(!env?.AI?.run)throw new Error("AI_BINDING_UNAVAILABLE");
  const evidence=await collectEvidence(),written=await runWriter(env,body,evidence);
  return json({
    ok:true,stage:"COPILOT",op:"K",kind:"material",reply:written.out,model:written.model,revision:REVISION,
    masterRuntime:{batchCount:1,series:[],researchFirst:true,sourceCount:evidence.length,topicQuery:evidence[0]?.title||"TechVerse verified cluster",researchRecovery:true},
    verification:{status:"VERIFIED",sourceCount:evidence.length,domains:evidence.map(x=>x.domain)}
  });
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/health"){
      const r=await baseWorker.fetch(request,env,ctx);let d={};try{d=await r.clone().json();}catch{}
      return json({...d,techVerseResearchRecovery:"ACTIVE",techVerseResearchRecoveryRevision:REVISION},r.status);
    }
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);
    let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
    if(!isTechVerseK(body))return baseWorker.fetch(request,env,ctx);

    const first=await baseWorker.fetch(reqFrom(request,body),env,ctx),d=await dataOf(first);
    if(!(d?.ok===true&&d?.kind==="research_hold"))return first;

    try{return await recovery(env,body);}catch(error){
      return json({ok:true,stage:"COPILOT",op:"K",kind:"research_hold",reply:"WAITING VERIFICATION // TechVerse belum mendapat dua sumber independen yang cukup kuat. Paket lama tetap ditahan; coba K lagi setelah sumber baru tersedia.",verification:{status:"WAITING",sourceCount:0,recovery:true,error:String(error?.message||error).slice(0,220)},revision:REVISION});
    }
  }
};
