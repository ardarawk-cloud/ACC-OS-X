// ACC OS X — BUILD 252 STUDIO POSTER QC GATE v2
// Content-channel QC requires deterministic Studio Poster v2 proof before semantic QC may approve publish.
// TechVerse additionally requires dense newsroom hierarchy, verified-source presence and Visual Kit v2.

import baseWorker from "./worker-stage-normalizer.js";

const REVISION = "BUILD252_STUDIO_POSTER_QC_V2";
const STANDARD = "STUDIO_CONTENT_V2";
const TECHVERSE_BENCHMARK = "TECHVERSE_POSTER_QUALITY_BENCHMARK_V2";
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
  return String(context?.profile?.kind||"").toUpperCase()==="CHANNEL";
}

function hasBlocks(meta, required){
  const blocks=Array.isArray(meta?.layoutBlocks)?meta.layoutBlocks:[];
  return required.every(name=>blocks.includes(name));
}

function validateStudio(context){
  const meta=context?.studioPosterQuality;
  const channelId=text(context?.profile?.id);
  const failures=[];

  if(!meta||typeof meta!=="object")failures.push("studioRendererProofMissing");
  else{
    if(meta.standard!==STANDARD)failures.push("studioStandardV2Missing");
    if(!String(meta.rendererRevision||"").startsWith("BUILD252_STUDIO_POSTER_V2"))failures.push("rendererRevisionInvalid");
    if(String(meta.channelId||"")!==channelId)failures.push("channelMismatch");
    if(Number(meta.width)!==1080||Number(meta.height)!==1920)failures.push("posterSizeInvalid");
    if(text(meta.headline).length<14)failures.push("headlineWeak");
    if(text(meta.editorialHierarchy)!=="NEWSROOM_DENSE_V2")failures.push("editorialHierarchyMissing");
    if(text(meta.heroTreatment)!=="EDITORIAL_HERO_FRAME")failures.push("heroTreatmentMissing");
    if(Number(meta.informationCards||0)<6)failures.push("informationArchitectureTooThin");
    if(Number(meta.densityScore||0)<8)failures.push("studioDensityBelowThreshold");
    if(!hasBlocks(meta,["brandHeader","dateVerification","categoryRibbon","heroFrame","headlineHierarchy","editorialDeck","keyMetric","whyItMatters","threeKeyPoints","bottomLine","verifiedSources","studioFooter"])) failures.push("studioLayoutIncomplete");

    if(channelId==="ch-techverse"){
      if(meta.benchmark!==TECHVERSE_BENCHMARK)failures.push("techverseBenchmarkV2Missing");
      if(meta.visualKitVersion!=="TECHVERSE_VISUAL_KIT_V2")failures.push("techverseVisualKitV2Missing");
      if(meta.brandLock!=="TECHVERSE_EDITORIAL_IDENTITY_LOCKED")failures.push("techverseBrandIdentityMissing");
      if(Number(meta.factsCount||0)<3)failures.push("techverseInformationDensityLow");
      if(Number(meta.sourceCount||0)<1)failures.push("techverseVerifiedSourceMissing");
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
    studioPosterStandard:STANDARD,
    techversePosterBenchmark:TECHVERSE_BENCHMARK,
    minStudioDensityScore:8,
    minTechverseFacts:3,
    verifiedSourceRequired:true
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
          `Studio Poster QC v2 failed: ${studio.failures.join(", ")}.`,
          "Poster is below Studio Content quality and publish is blocked. Regenerate through BUILD 252 Studio Poster Renderer v2."
        ].join("\n"),
        model:"ACC_DETERMINISTIC_STUDIO_POSTER_QC_V2",
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
          visualKitVersion:studio.meta?.visualKitVersion||null,
          layoutBlocks:studio.meta?.layoutBlocks||[],
          factsCount:Number(studio.meta?.factsCount||0),
          sourceCount:Number(studio.meta?.sourceCount||0),
          informationCards:Number(studio.meta?.informationCards||0),
          densityScore:Number(studio.meta?.densityScore||0)
        }
      },upstream.status,upstream.headers);
    }catch{return upstream;}
  }
};