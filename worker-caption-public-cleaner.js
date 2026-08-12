// ACC OS X — BUILD 250 RC8.2 CAPTION PUBLIC CLEANER
// Final CAPTION-only public-format pass after RC8.1.
// Removes markdown/pseudo-heading residue and research-source bullet URLs without
// changing factual content, CTA, tags, hashtags, publish connector, tokens, or Page routing.

import captionWorker from "./worker-caption-label-recovery.js";

const PATCH_REVISION = "BUILD250_RC8_2_CAPTION_PUBLIC_CLEANER";
const text = v => typeof v === "string" ? v.trim() : "";

function stageOf(body){
  const s=String(body?.context?.workerTask?.stage||"").toUpperCase();
  if(s==="MATERIAL")return "SCRIPT";
  if(s==="PUBLISH")return "PUBLISHING";
  if(["RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"].includes(s))return s;
  const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");
  const m=joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  if(m)return String(m[1]).toUpperCase();
  return /Social Captioner/i.test(joined)?"CAPTION":"";
}

function isBulletSourceUrl(line){
  return /^\s*(?:[-*•]|\d+[.)])\s*https?:\/\/\S+\s*$/i.test(String(line||""));
}

function cleanMarkdownInline(line){
  let out=String(line||"");
  // Markdown headings only when followed by whitespace; normal hashtags remain intact.
  out=out.replace(/^\s{0,3}#{1,3}\s+/,"");
  // Remove markdown emphasis/code markers while preserving the text itself.
  out=out.replace(/\*\*([^*\n]+)\*\*/g,"$1");
  out=out.replace(/__([^_\n]+)__/g,"$1");
  out=out.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g,"$1");
  out=out.replace(/(?<!_)_([^_\n]+)_(?!_)/g,"$1");
  out=out.replace(/`([^`\n]+)`/g,"$1");
  return out;
}

function cleanCaption(raw){
  const lines=String(raw||"").split(/\r?\n/);
  const kept=[];
  for(const line of lines){
    if(isBulletSourceUrl(line))continue;
    const cleaned=cleanMarkdownInline(line).replace(/[ \t]{2,}/g," ").trimEnd();
    kept.push(cleaned);
  }
  return kept.join("\n")
    .replace(/\n{3,}/g,"\n\n")
    .trim();
}

function residualProblems(value){
  const out=text(value);
  const p=[];
  if(!out)p.push("emptyCaption");
  if(/```/.test(out))p.push("markdownFence");
  if(/^\s*(?:[-*•]|\d+[.)])\s*https?:\/\/\S+\s*$/im.test(out))p.push("researchSourceBullet");
  if(/\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`/.test(out))p.push("markdownResidue");
  return p;
}

function json(payload,status=200,headersLike=null){
  const headers=new Headers(headersLike||{});
  headers.set("Content-Type","application/json;charset=UTF-8");
  headers.set("Cache-Control","no-store");
  return new Response(JSON.stringify(payload,null,2),{status,headers});
}

async function health(request,env,ctx){
  const upstream=await captionWorker.fetch(request,env,ctx);
  try{
    const data=await upstream.clone().json();
    if(data&&typeof data==="object"){
      data.captionPublicCleaner="ACTIVE";
      data.captionPublicCleanerRevision=PATCH_REVISION;
      return json(data,upstream.status,upstream.headers);
    }
  }catch{}
  return upstream;
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return captionWorker.fetch(request,env,ctx);

    let body;
    try{body=await request.clone().json();}catch{return captionWorker.fetch(request,env,ctx);}
    if(stageOf(body)!=="CAPTION")return captionWorker.fetch(request,env,ctx);

    const upstream=await captionWorker.fetch(request,env,ctx);
    if(!upstream.ok)return upstream;

    let payload;
    try{payload=await upstream.clone().json();}catch{return upstream;}
    if(!payload||payload?.ok===false||!text(payload?.reply))return upstream;

    const before=text(payload.reply);
    const reply=cleanCaption(before);
    const defects=residualProblems(reply);
    if(defects.length){
      return json({
        ok:false,
        stage:"CAPTION",
        status:"CAPTION_PUBLIC_CLEANER_FAILED",
        error:`Caption public-format cleanup failed: ${defects.join(", ")}.`,
        errorDetail:{code:"CAPTION_PUBLIC_CLEANER_FAILED",problems:defects,revision:PATCH_REVISION}
      },422,upstream.headers);
    }

    return json({
      ...payload,
      reply,
      provider:`${text(payload.provider)||"ACC OS X"} + Caption Public Cleaner`,
      captionPublicCleaner:{revision:PATCH_REVISION,cleaned:reply!==before}
    },upstream.status,upstream.headers);
  }
};
