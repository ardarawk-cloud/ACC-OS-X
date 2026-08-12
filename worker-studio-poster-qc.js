// ACC OS X — BUILD 253 INTELLIGENT STUDIO POSTER QC
// Studio QC now checks real evidence + KAI creative/art-direction scores + renderer proof.
// It no longer treats a raw fact-count proxy as the main definition of visual quality.

import baseWorker from "./worker-stage-normalizer.js";

const REVISION = "BUILD253_INTELLIGENT_STUDIO_POSTER_QC_V1";
const STANDARD = "STUDIO_CONTENT_V2";
const TECHVERSE_BENCHMARK = "TECHVERSE_POSTER_QUALITY_BENCHMARK_V2";
const CREATIVE_ENGINE = "BUILD253_KAI_CREATIVE_ENGINE_V1";
const MIN_EDITORIAL = 8.0;
const MIN_CREATIVE = 8.2;
const MIN_ART = 8.2;
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
function isContentChannel(context){return String(context?.profile?.kind||"").toUpperCase()==="CHANNEL";}
function hasBlocks(meta,required){const blocks=Array.isArray(meta?.layoutBlocks)?meta.layoutBlocks:[];return required.every(name=>blocks.includes(name));}
function n(v){const x=Number(v);return Number.isFinite(x)?x:0;}

function validateStudio(context){
  const meta=context?.studioPosterQuality;
  const channelId=text(context?.profile?.id);
  const failures=[];
  if(!meta||typeof meta!=="object")failures.push("studioRendererProofMissing");
  else{
    if(meta.standard!==STANDARD)failures.push("studioStandardV2Missing");
    if(!String(meta.rendererRevision||"").startsWith("BUILD252_STUDIO_POSTER_V2"))failures.push("rendererRevisionInvalid");
    if(String(meta.channelId||"")!==channelId)failures.push("channelMismatch");
    if(n(meta.width)!==1080||n(meta.height)!==1920)failures.push("posterSizeInvalid");
    if(text(meta.headline).length<14)failures.push("headlineWeak");
    if(text(meta.editorialHierarchy)!=="NEWSROOM_DENSE_V2")failures.push("editorialHierarchyMissing");
    if(text(meta.heroTreatment)!=="EDITORIAL_HERO_FRAME")failures.push("heroTreatmentMissing");
    if(n(meta.informationCards)<6)failures.push("informationArchitectureTooThin");
    if(n(meta.densityScore)<8)failures.push("studioDensityBelowThreshold");
    if(!hasBlocks(meta,["brandHeader","dateVerification","categoryRibbon","heroFrame","headlineHierarchy","editorialDeck","keyMetric","whyItMatters","threeKeyPoints","bottomLine","verifiedSources","studioFooter"]))failures.push("studioLayoutIncomplete");

    // Intelligence gate: creative quality is judged before rendering by a separate critic pass.
    if(text(meta.kaiCreativeEngineRevision)!==CREATIVE_ENGINE)failures.push("kaiCreativeEngineProofMissing");
    if(text(meta.intelligenceGate)!=="KAI_CREATIVE_CRITIC_V1")failures.push("kaiCreativeCriticProofMissing");
    if(n(meta.kaiEditorialScore)<MIN_EDITORIAL)failures.push("kaiEditorialScoreLow");
    if(n(meta.kaiCreativeScore)<MIN_CREATIVE)failures.push("kaiCreativeScoreLow");
    if(n(meta.kaiArtDirectionScore)<MIN_ART)failures.push("kaiArtDirectionScoreLow");

    // Evidence gate: quality needs real support, but does not require an arbitrary 3-fact count.
    if(n(meta.sourceCount)<1)failures.push("verifiedSourceMissing");
    if(n(meta.factsCount)<2&&n(meta.evidenceScore)<5)failures.push("evidenceCoverageLow");

    if(channelId==="ch-techverse"){
      if(meta.benchmark!==TECHVERSE_BENCHMARK)failures.push("techverseBenchmarkV2Missing");
      if(meta.visualKitVersion!=="TECHVERSE_VISUAL_KIT_V2")failures.push("techverseVisualKitV2Missing");
      if(meta.brandLock!=="TECHVERSE_EDITORIAL_IDENTITY_LOCKED")failures.push("techverseBrandIdentityMissing");
    }
  }
  return {ok:failures.length===0,failures,meta:meta||null};
}

function snapshot(meta){return {
  rendererRevision:meta?.rendererRevision||null,
  creativeEngineRevision:meta?.kaiCreativeEngineRevision||null,
  editorialScore:n(meta?.kaiEditorialScore),creativeScore:n(meta?.kaiCreativeScore),artDirectionScore:n(meta?.kaiArtDirectionScore),
  sourceCount:n(meta?.sourceCount),factsCount:n(meta?.factsCount),evidenceScore:n(meta?.evidenceScore),densityScore:n(meta?.densityScore),
  informationCards:n(meta?.informationCards),benchmark:meta?.benchmark||null,visualKitVersion:meta?.visualKitVersion||null
};}

async function health(request,env,ctx){
  const upstream=await baseWorker.fetch(request,env,ctx);
  let data={};try{data=await upstream.clone().json();}catch{}
  return json({...(data&&typeof data==="object"?data:{}),studioPosterQc:"ACTIVE",studioPosterQcRevision:REVISION,studioPosterStandard:STANDARD,techversePosterBenchmark:TECHVERSE_BENCHMARK,kaiCreativeEngineRequired:CREATIVE_ENGINE,kaiEditorialThreshold:MIN_EDITORIAL,kaiCreativeThreshold:MIN_CREATIVE,kaiArtDirectionThreshold:MIN_ART,verifiedSourceRequired:true,minEvidenceFacts:2},upstream.status,upstream.headers);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return baseWorker.fetch(request,env,ctx);
    let body;try{body=await request.clone().json();}catch{return baseWorker.fetch(request,env,ctx);}
    if(stageOf(body)!=="QC"||!isContentChannel(body?.context))return baseWorker.fetch(request,env,ctx);

    const studio=validateStudio(body.context);
    if(!studio.ok){
      return json({
        ok:true,
        reply:[
          "FAIL",
          `Studio Intelligence QC failed: ${studio.failures.join(", ")}.`,
          `Received quality: ${JSON.stringify(snapshot(studio.meta))}.`,
          "Publish blocked. KAI Creative Engine / Studio Renderer must regenerate a stronger production package."
        ].join("\n"),
        model:"ACC_KAI_INTELLIGENT_STUDIO_QC",
        provider:"ACC OS X KAI Creative + Studio QC Gate",
        mode:"PRODUCTION_AI",
        studioPosterQc:{revision:REVISION,standard:STANDARD,passed:false,failures:studio.failures,received:snapshot(studio.meta)}
      },200);
    }

    const upstream=await baseWorker.fetch(request,env,ctx);
    if(!upstream.ok)return upstream;
    try{
      const data=await upstream.clone().json();
      return json({...data,studioPosterQc:{revision:REVISION,standard:STANDARD,passed:true,...snapshot(studio.meta),layoutBlocks:studio.meta?.layoutBlocks||[],verifiedSourceHosts:studio.meta?.verifiedSourceHosts||[]}},upstream.status,upstream.headers);
    }catch{return upstream;}
  }
};
