// ACC OS X — BUILD 251 STUDIO POSTER QC GATE
// Content-channel QC requires proof that the final 1080x1920 poster passed the
// deterministic Studio Poster Renderer before semantic QC may approve publishing.

import baseWorker from "./worker-stage-normalizer.js";

const REVISION = "BUILD251_STUDIO_POSTER_QC_V1";
const STANDARD = "STUDIO_CONTENT_V1";
const text = v => typeof v === "string" ? v.trim() : "";

function json(data,status=200,headersLike=null){
  const headers=new Headers(headersLike||{});
  headers.set("Content-Type","application/json;charset=UTF-8");
  headers.set("Cache-Control","no-store");
  headers.set("Access-Control-Allow-Origin","*");
  return new Response(JSON.stringify(data,null,2),{status,headers});
}

function stageOf(body){
  const direct=String(body?.context?.workerTask?.stage||"").toUpperCase();
  if(direct==="QC")return "QC";
  const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");
  return /(?:^|\n)STAGE:\s*QC\b/i.test(joined)||/Editorial QC Auditor/i.test(joined)?"QC":"";
}

function isContentChannel(context){
  const kind=String(context?.profile?.kind||"").toUpperCase();
  return kind==="CHANNEL";
}

function validateStudio(context){
  const meta=context?.studioPosterQuality;
  const channelId=text(context?.profile?.id);
  const failures=[];
  if(!meta||typeof meta!=="object")failures.push("studioRendererProofMissing");
  else{
    if(meta.standard!==STANDARD)failures.push("studioStandardMissing");
    if(!String(meta.rendererRevision||"").startsWith("BUILD251_STUDIO_POSTER"))failures.push("rendererRevisionInvalid");
    if(String(meta.channelId||"")!==channelId)failures.push("channelMismatch");
    if(Number(meta.width)!==1080||Number(meta.height)!==1920)failures.push("posterSizeInvalid");
    if(text(meta.headline).length<8)failures.push("headlineWeak");
    if(!Array.isArray(meta.layoutBlocks)||meta.layoutBlocks.length<7)failures.push("studioLayoutIncomplete");
    if(channelId==="ch-techverse"){
      if(meta.benchmark!=="TECHVERSE_POSTER_QUALITY_BENCHMARK_V1")failures.push("techverseBenchmarkMissing");
      if(Number(meta.factsCount||0)<2)failures.push("techverseInformationDensityLow");
    }
  }
  return {ok:failures.length===0,failures,meta:meta||null};
}

async function health(request,env,ctx){
  const upstream=await baseWorker.fetch(request,env,ctx);
  let data={};
  try{data=await upstream.clone().json();}catch{}
  return json({
    ...(data&&typeof data==="object"?data:{}),
    studioPosterQc:"ACTIVE",
    studioPosterQcRevision:REVISION,
    studioPosterStandard:STANDARD
  },upstream.status,upstream.headers);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);

    let body;
    try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
    if(stageOf(body)!=="QC"||!isContentChannel(body?.context))return baseWorker.fetch(request,env,ctx);

    const studio=validateStudio(body.context);
    if(!studio.ok){
      return json({
        ok:true,
        reply:[
          "FAIL",
          `Studio Poster QC failed: ${studio.failures.join(", ")}.`,
          "Final poster must be assembled by BUILD 251 Studio Poster Renderer before publish."
        ].join("\n"),
        model:"ACC_DETERMINISTIC_STUDIO_POSTER_QC",
        provider:"ACC OS X Studio Poster QC Gate",
        mode:"PRODUCTION_AI",
        studioPosterQc:{revision:REVISION,standard:STANDARD,passed:false,failures:studio.failures}
      },200);
    }

    const upstream=await baseWorker.fetch(request,env,ctx);
    if(!upstream.ok)return upstream;
    try{
      const data=await upstream.clone().json();
      return json({
        ...data,
        studioPosterQc:{
          revision:REVISION,
          standard:STANDARD,
          passed:true,
          benchmark:studio.meta?.benchmark||null,
          layoutBlocks:studio.meta?.layoutBlocks||[],
          factsCount:Number(studio.meta?.factsCount||0)
        }
      },upstream.status,upstream.headers);
    }catch{return upstream;}
  }
};
