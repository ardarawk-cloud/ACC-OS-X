// ACC OS X — BUILD 258.3 TECHVERSE RESEARCH RECOVERY
// Keeps the production contract authoritative while making TechVerse research
// resilient across GDELT, RSS publisher metadata, direct fetch, and Browser fallback.
import baseWorker from "./worker-contract-router-v258.js";

const REVISION = "BUILD258_3_TECHVERSE_RESEARCH_RECOVERY";
const FAST = "@cf/meta/llama-4-scout-17b-16e-instruct";
const WRITER = "@cf/openai/gpt-oss-120b";
const text = v => typeof v === "string" ? v.trim() : "";
const stop = new Set("the a an and or for to of in on with from by is are was were be as at into after before over new latest today update updates technology tech ai artificial intelligence says say launch launches launched unveils unveiled report reports amid about its their this that will can could may has have had more how why what when where who than using use used company companies platform platforms system systems announces announced reveal reveals revealed gets get got".split(/\s+/));

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
function host(raw){try{return new URL(raw).hostname.replace(/^www\./,"").toLowerCase();}catch{return"";}}
function publisherDomain(row){return text(row?.publisherDomain)||host(row?.url);}
function decode(s){return String(s||"").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");}
function stripHtml(s){return decode(String(s||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<noscript[\s\S]*?<\/noscript>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim();}
function cleanTitle(s){return decode(String(s||"")).replace(/\s+[\-–—|]\s+[^\-–—|]{2,70}$/," ").replace(/\s+/g," ").trim();}
function uniq(rows){
  const seen=new Set(),out=[];
  for(const r of rows||[]){
    const u=safeUrl(r.url),title=text(r.title);if(!u||!title)continue;
    const key=`${u}|${publisherDomain(r)}|${cleanTitle(title).toLowerCase()}`;if(seen.has(key))continue;seen.add(key);
    out.push({...r,url:u,publisherDomain:publisherDomain(r),cleanTitle:cleanTitle(title)});
  }
  return out;
}

async function gdelt(query,span="3d",max=60){
  const u=`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=${max}&timespan=${encodeURIComponent(span)}&sort=datedesc&format=json`;
  try{
    const r=await fetchTimed(u,10000,"application/json,text/plain,*/*");if(!r.ok)return[];
    const d=await r.json(),a=Array.isArray(d?.articles)?d.articles:[];
    return a.map(x=>{const url=safeUrl(x?.url||x?.url_mobile||x?.sourceurl);return{title:text(x?.title),url,snippet:text(x?.snippet||x?.context||x?.description),date:text(x?.seendate||x?.date||x?.published),source:"GDELT",publisherDomain:text(x?.domain)||host(url)};}).filter(x=>x.title&&x.url);
  }catch{return[];}
}
function rssRows(xml,source){
  const out=[];
  for(const m of String(xml||"").matchAll(/<item>([\s\S]*?)<\/item>/gi)){
    const b=m[1];
    const title=decode(b.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||"").replace(/<!\[CDATA\[|\]\]>/g,"").trim();
    const url=safeUrl(decode(b.match(/<link>([\s\S]*?)<\/link>/i)?.[1]||"").replace(/<!\[CDATA\[|\]\]>/g,"").trim());
    const snippet=stripHtml(b.match(/<description>([\s\S]*?)<\/description>/i)?.[1]||"").slice(0,1600);
    const date=decode(b.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]||"").trim();
    const sourceUrl=safeUrl(decode(b.match(/<source[^>]*\surl=["']([^"']+)["'][^>]*>/i)?.[1]||""));
    const sourceName=stripHtml(b.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1]||"");
    const bingSource=stripHtml(b.match(/<(?:News:)?Source>([\s\S]*?)<\/(?:News:)?Source>/i)?.[1]||"");
    const pdom=host(sourceUrl)||((source==="GOOGLE_RSS"||source==="BING_RSS")?text(sourceName||bingSource).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""):host(url));
    if(title&&url)out.push({title,url,snippet,date,source,publisherDomain:pdom,publisherName:sourceName||bingSource});
    if(out.length>=30)break;
  }
  return out;
}
async function rss(query){
  const feeds=[
    [`https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss`,"BING_RSS"],
    [`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,"GOOGLE_RSS"]
  ],out=[];
  for(const [url,source] of feeds){try{const r=await fetchTimed(url,9000,"application/rss+xml,application/xml,text/xml,*/*");if(r.ok)out.push(...rssRows(await r.text(),source));}catch{}}
  return out;
}
function tokens(title){
  return new Set(cleanTitle(title).toLowerCase().replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(x=>x.length>=3&&!stop.has(x)));
}
function overlap(a,b){let n=0;for(const x of a)if(b.has(x))n++;return n;}
function pairScore(a,b){
  const da=publisherDomain(a),db=publisherDomain(b);if(!da||!db||da===db)return -1;
  const A=tokens(a.title),B=tokens(b.title),same=overlap(A,B);if(same<2)return -1;
  const denom=Math.max(3,Math.min(A.size,B.size));return same/denom + Math.min(same,7)*0.09;
}
function bestCluster(rows,seed=null){
  const list=uniq(rows),out=[];
  if(seed){
    const S=tokens(seed.title),ranked=list.filter(x=>publisherDomain(x)&&publisherDomain(x)!==publisherDomain(seed)).map(x=>({x,score:overlap(S,tokens(x.title))})).filter(x=>x.score>=2).sort((a,b)=>b.score-a.score);
    if(ranked.length){out.push(seed,ranked[0].x);const domains=new Set(out.map(publisherDomain));for(const r of ranked.slice(1)){if(out.length>=4)break;if(domains.has(publisherDomain(r.x)))continue;out.push(r.x);domains.add(publisherDomain(r.x));}return out;}
  }
  let best=null;
  for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const s=pairScore(list[i],list[j]);if(s<0)continue;if(!best||s>best.score)best={score:s,a:list[i],b:list[j]};}
  if(!best)return[];
  const S=new Set([...tokens(best.a.title),...tokens(best.b.title)]),domains=new Set([publisherDomain(best.a),publisherDomain(best.b)]);out.push(best.a,best.b);
  for(const r of list){if(out.length>=4)break;if(out.includes(r)||domains.has(publisherDomain(r)))continue;if(overlap(S,tokens(r.title))>=2){out.push(r);domains.add(publisherDomain(r));}}
  return out;
}
function corroborationQuery(row){
  const parts=[...tokens(row.title)].slice(0,6);return parts.length>=2?parts.join(" "):cleanTitle(row.title).slice(0,120);
}
async function browserText(env,url){
  if(!env?.BROWSER)return"";
  try{const r=await env.BROWSER.quickAction("markdown",{url,gotoOptions:{waitUntil:"domcontentloaded",timeout:10000}});try{const d=await r.json();const x=d?.result;if(typeof x==="string")return text(x);}catch{}try{return text(await r.text());}catch{return"";}}catch{return"";}
}
async function readable(env,row){
  let body=text(row.snippet),url=row.url,mode=body.length>=120?"DISCOVERY_METADATA":"TITLE_ONLY",pdom=publisherDomain(row);
  const wrapper=/^(?:news\.google\.com|www\.bing\.com|bing\.com)$/i.test(host(url));
  if(!wrapper){
    try{const r=await fetchTimed(url,8500,"text/html,application/xhtml+xml,text/plain,*/*");url=safeUrl(r.url)||url;if(r.ok){const ct=r.headers.get("content-type")||"";if(/html|text/i.test(ct)){const plain=stripHtml(await r.text());if(plain.length>=350){body=plain.slice(0,6500);mode="DIRECT_FETCH";pdom=host(url)||pdom;}}}}catch{}
  }
  if(body.length<180){const md=await browserText(env,url);if(md.length>=300){body=md.slice(0,6500);mode="BROWSER_MARKDOWN";const h=host(url);if(h&&!/^(?:news\.google\.com|www\.bing\.com|bing\.com)$/i.test(h))pdom=h;}}
  if(body.length<80)body=[cleanTitle(row.title),text(row.snippet),text(row.publisherName)].filter(Boolean).join(" — ");
  return {...row,url,publisherDomain:pdom,body,mode};
}
async function broadPool(){
  const queries=[
    "(OpenAI OR Anthropic OR Microsoft OR Google OR Apple OR Meta)",
    "(cybersecurity OR ransomware OR vulnerability OR security)",
    "(semiconductor OR chip OR NVIDIA OR AMD OR Intel)",
    "(robotics OR quantum OR satellite OR computing)"
  ];
  let pool=[];
  for(const q of queries){pool=uniq([...pool,...await gdelt(q,"3d",60)]);if(pool.length>=45)break;}
  if(pool.length<30)for(const q of queries.slice(0,3))pool=uniq([...pool,...await rss(q)]);
  return pool;
}
async function collectEvidence(env){
  let pool=await broadPool();
  if(pool.length<2)throw new Error(`DISCOVERY_INSUFFICIENT:${pool.length}`);

  let cluster=bestCluster(pool.slice(0,120));
  if(cluster.length<2){
    // Instead of hoping a broad pool already contains duplicates, take fresh candidates
    // and actively search for independent corroboration of the same story.
    for(const seed of pool.slice(0,12)){
      const q=corroborationQuery(seed);if(!q)continue;
      const matches=uniq([seed,...await gdelt(q,"7d",50),...await rss(q)]);
      const c=bestCluster(matches,seed);if(c.length>=2){cluster=c;break;}
    }
  }
  if(cluster.length<2){
    // Final recovery window: broader recent pool, but still requires independent publishers.
    const extra=uniq([...await gdelt("(OpenAI OR Microsoft OR Google OR Apple OR NVIDIA)","14d",80),...await rss("OpenAI Microsoft Google Apple NVIDIA")]);
    pool=uniq([...pool,...extra]);cluster=bestCluster(pool.slice(0,180));
  }
  if(cluster.length<2)throw new Error("NO_CORROBORATED_CLUSTER");

  const read=[],domains=new Set();
  for(const row of cluster){
    const x=await readable(env,row),d=publisherDomain(x);if(!d||domains.has(d))continue;if(text(x.body).length<80)continue;
    read.push(x);domains.add(d);if(read.length>=4)break;
  }
  if(read.length<2)throw new Error(`READABLE_INSUFFICIENT:${read.length}`);
  return read;
}
function modelText(r){
  if(typeof r==="string")return text(r);if(!r||typeof r!=="object")return"";
  for(const v of [r.response,r.output_text,r.text,r.result?.response,r.result?.output_text,r.result?.text,r.choices?.[0]?.message?.content])if(typeof v==="string"&&text(v))return text(v);
  return"";
}
async function runWriter(env,body,evidence){
  const profile=body?.context?.profile||{};
  const src=evidence.map((x,i)=>[`SOURCE ${i+1}`,`TITLE: ${cleanTitle(x.title)}`,`DATE: ${x.date||"unknown"}`,`DOMAIN: ${publisherDomain(x)}`,`URL: ${x.url}`,`READ_MODE: ${x.mode}`,`EVIDENCE: ${text(x.body).slice(0,4300)}`].join("\n")).join("\n\n---\n\n");
  const system=[
    "You are KAI, senior editor for TechVerse.",
    "Create one finished TechVerse content material package ready for the poster stage.",
    "Latest-first, fact-before-speed, explain why the technology matters.",
    "Use ONLY claims common to at least two independent publishers in CURRENT EVIDENCE. Never merge unrelated stories merely because both are about technology.",
    "If details differ, state only the common verified core. Do not ask the owner questions.",
    "Do not mention runtime, verification machinery, prompts, research recovery, or internal workflow.",
    "Write clear professional Indonesian. Return owner-facing material only, not JSON."
  ].join("\n");
  const user=[`CURRENT_UTC: ${new Date().toISOString()}`,`PROFILE: ${profile.name||"TechVerse"}`,`MISSION: ${text(profile.mission)}`,`CANON: ${text(profile.canon)}`,`CURRENT EVIDENCE:\n${src}`].join("\n\n");
  const failures=[];
  for(const model of [WRITER,FAST]){
    try{const r=await env.AI.run(model,{messages:[{role:"system",content:system},{role:"user",content:user}],max_tokens:2800,temperature:.34});const out=modelText(r);if(out)return{out,model};throw new Error("EMPTY_OUTPUT");}catch(e){failures.push(`${model}:${String(e?.message||e).slice(0,120)}`);}
  }
  throw new Error(`MODEL_FAILED:${failures.join("|")}`);
}
async function recovery(env,body){
  if(!env?.AI?.run)throw new Error("AI_BINDING_UNAVAILABLE");
  const evidence=await collectEvidence(env),written=await runWriter(env,body,evidence);
  return json({ok:true,stage:"COPILOT",op:"K",kind:"material",reply:written.out,model:written.model,revision:REVISION,masterRuntime:{batchCount:1,series:[],researchFirst:true,sourceCount:evidence.length,topicQuery:cleanTitle(evidence[0]?.title)||"TechVerse verified cluster",researchRecovery:true},verification:{status:"VERIFIED",sourceCount:evidence.length,domains:evidence.map(publisherDomain)}});
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
      const code=String(error?.message||error).slice(0,160);
      return json({ok:true,stage:"COPILOT",op:"K",kind:"research_hold",reply:"WAITING VERIFICATION // TechVerse belum mendapat dua sumber independen yang cukup kuat. Paket lama tetap ditahan; coba K lagi setelah sumber baru tersedia.",verification:{status:"WAITING",sourceCount:0,recovery:true,errorCode:code},revision:REVISION});
    }
  }
};
