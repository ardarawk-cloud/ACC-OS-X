// ACC OS X — BUILD 257.5 PRODUCTION GATE + BUILD 256 SYSTEM ORCHESTRATOR ROUTE
// Budgeted KAI Research Intelligence feeds GPT-OSS 120B MATERIAL generation with a deterministic Llama 4 critic.
// BUILD 257.5 keeps the strict 8.5 threshold and two-pass bounded runtime while removing reasoning-critic empty-output brittleness.
// Poster, caption, publishing, Meta routing and stored channel data remain unchanged.
import coreWorker from "./worker-stage-normalizer.js";
import researchWorker from "./worker-research-intelligence-v2552.js";
import materialWorker from "./worker-material-director-v2575.js";
import systemWorker from "./worker-kai-system-orchestrator-v256.js";
import captionWorker from "./worker-caption-public-cleaner.js";
import posterWorker from "./worker-poster-brief-sanitizer-v254.js";
import qcWorker from "./worker-studio-poster-qc-v254.js";

const APP_BUILD=257;
const APP_REVISION="BUILD257_KAI_AUTONOMOUS_QUALITY_RECOVERY";
const DATA_SCHEMA=250;
const PACKAGE_REVISION="BUILD257_5_DETERMINISTIC_CRITIC";
const GATE_REVISION="BUILD257_5_PRODUCTION_GATE";
const SYSTEM_REVISION="BUILD256_KAI_SYSTEM_ORCHESTRATOR";
const TARGET_URL="https://raw.githubusercontent.com/ardarawk-cloud/ACC-OS-X/main/acc-deploy-target.json";
const text=v=>typeof v==="string"?v.trim():"";
function json(data,status=200,headersLike=null){const headers=new Headers(headersLike||{});headers.set("Content-Type","application/json;charset=UTF-8");headers.set("Cache-Control","no-store");headers.set("Access-Control-Allow-Origin","*");return new Response(JSON.stringify(data,null,2),{status,headers});}
function latestUserText(body){const rows=Array.isArray(body?.messages)?body.messages:[];for(let i=rows.length-1;i>=0;i--){if(String(rows[i]?.role||"").toLowerCase()==="user"&&text(rows[i]?.content))return text(rows[i].content);}return"";}
function looksLikeSystemIntent(body){
  const user=latestUserText(body);
  if(!user)return false;
  const action=/\b(?:audit|auditing|cek|check|periksa|inspect|optim(?:asi|alkan|ize|ization)|sinkron(?:isasi|kan|ize|ization)|debug|diagnos|perbaiki|fix|repair|deploy|deployment|repo|repository|worker|routing|arsitektur|architecture|system health|kesehatan sistem|version|revision|build)\b/i.test(user);
  const target=/\b(?:ACC OS X|ACC CORE|KAI|PWA|system|sistem|repo|repository|worker|deploy|deployment|workflow|AI routing|orchestrator|Cloudflare|GitHub|storage|service worker)\b/i.test(user);
  return action&&target;
}
function stageOf(body){
  const s=String(body?.context?.workerTask?.stage||"").toUpperCase();
  if(s==="MATERIAL")return"SCRIPT";
  if(s==="PUBLISH")return"PUBLISHING";
  if(["SYSTEM","RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"].includes(s))return s;
  const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");
  const m=joined.match(/(?:^|\n)STAGE:\s*(SYSTEM|RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  if(m)return String(m[1]).toUpperCase();
  if(/Research Specialist/i.test(joined))return"RESEARCH";
  if(/Material Creator|Scriptwriter AI/i.test(joined))return"SCRIPT";
  if(/Poster Creator/i.test(joined))return"POSTER";
  if(/Social Captioner/i.test(joined))return"CAPTION";
  if(/Editorial QC Auditor/i.test(joined))return"QC";
  if(looksLikeSystemIntent(body))return"SYSTEM";
  return"";
}
async function targetState(){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),3500);try{const response=await fetch(`${TARGET_URL}?t=${Date.now()}`,{method:"GET",headers:{Accept:"application/json","Cache-Control":"no-cache"},cache:"no-store",signal:controller.signal});if(!response.ok)throw new Error(`GitHub target HTTP ${response.status}`);const target=await response.json();const expected=text(target?.expectedRevision);if(!expected)throw new Error("Invalid deploy target manifest");return{available:true,expected,label:text(target?.label),synchronized:expected===PACKAGE_REVISION};}catch(error){return{available:false,expected:"",label:"",synchronized:null,error:String(error?.message||error).slice(0,220)};}finally{clearTimeout(timer);}}
async function health(request,env,ctx){const upstream=await qcWorker.fetch(request,env,ctx);let data={};try{data=await upstream.clone().json();}catch{}const target=await targetState();return json({...(data&&typeof data==="object"?data:{}),appBuild:APP_BUILD,appRevision:APP_REVISION,dataSchema:DATA_SCHEMA,packageDeployGate:"ACTIVE",packageDeployGateRevision:GATE_REVISION,packageRevision:PACKAGE_REVISION,kaiResearchIntelligence:"ACTIVE",kaiResearchRevision:"BUILD255_2_BUDGETED_RESEARCH",kaiResearchPolicy:"LATEST_FIRST_PRIMARY_SOURCE_PREFERRED_BUDGETED",kaiResearchAcquisition:"SEQUENTIAL_OFFICIAL_HUBS_TARGETED_NEWS_DIRECT_FIRST_BROWSER_FALLBACK",kaiResearchExternalBudget:24,kaiResearchBrowserBudget:6,kaiResearchThreshold:8.5,kaiBrain:"ACTIVE",kaiBrainRevision:"BUILD257_2_STRUCTURED_QUALITY_PROTOCOL",kaiCreativeProofRevision:"BUILD257_KAI_AUTONOMOUS_QUALITY_RECOVERY",kaiMaterialDirector:"ACTIVE",kaiMaterialRevision:"BUILD257_5_DETERMINISTIC_CRITIC",kaiMaterialDirectorModel:"@cf/openai/gpt-oss-120b",kaiMaterialDirectorFallbacks:["@cf/meta/llama-4-scout-17b-16e-instruct","@cf/zai-org/glm-4.7-flash"],kaiMaterialCriticModel:"@cf/meta/llama-4-scout-17b-16e-instruct",kaiMaterialCriticFallbacks:["@cf/openai/gpt-oss-120b"],kaiMaterialCriticProtocol:"LLAMA4_GUIDED_JSON_PRIMARY",kaiRecovery:"ACTIVE",kaiRecoveryPolicy:"DETERMINISTIC_CRITIC_TWO_PASS_STRICT_8_5_FAIL_CLOSED",kaiRecoveryPasses:2,kaiMaterialStageBudgetMs:145000,kaiDirectorModel:"@cf/openai/gpt-oss-120b",kaiCriticModel:"@cf/meta/llama-4-scout-17b-16e-instruct",kaiSystemOrchestrator:"ACTIVE",kaiSystemRevision:SYSTEM_REVISION,kaiSystemMode:"READ_ONLY_EVIDENCE_GROUNDED",kaiSystemRepoRead:"PUBLIC_RAW_GITHUB",kaiSystemRepoWrite:"UNAVAILABLE",kaiSystemDeployWrite:"UNAVAILABLE",creativeFlow:"BUDGETED_RESEARCH_TO_GPT_OSS_120B_TO_LLAMA4_GUIDED_JSON_CRITIC_TO_STRICT_STUDIO_PIPELINE",kaiStudioBoardPasses:2,studioPosterRendererRequired:true,studioPosterRendererRevision:"BUILD252_STUDIO_POSTER_V2",deployTargetAvailable:target.available,deploymentSynchronized:target.synchronized,deployTargetRevision:target.expected||null,deployTargetLabel:target.label||null,...(target.available?{}:{deployTargetWarning:target.error||"Target check unavailable"})},upstream.status,upstream.headers);}
export default{async fetch(request,env,ctx){const url=new URL(request.url);if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return coreWorker.fetch(request,env,ctx);let body;try{body=await request.clone().json();}catch{return coreWorker.fetch(request,env,ctx);}const stage=stageOf(body);if(stage==="SYSTEM")return systemWorker.fetch(request,env,ctx);if(stage==="SCRIPT")return materialWorker.fetch(request,env,ctx);if(stage==="POSTER")return posterWorker.fetch(request,env,ctx);if(stage==="CAPTION")return captionWorker.fetch(request,env,ctx);if(stage==="QC")return qcWorker.fetch(request,env,ctx);if(stage==="RESEARCH"){const target=await targetState();if(target.available&&target.synchronized===false)return json({ok:false,stage:"RESEARCH",status:"DEPLOY_PENDING",error:"ACC OS X Build 257.5 deterministic critic runtime is still syncing from GitHub to Cloudflare. No production was started. Retry shortly.",errorDetail:{code:"DEPLOY_PENDING",expectedRevision:target.expected,liveRevision:PACKAGE_REVISION,targetLabel:target.label||null,gateRevision:GATE_REVISION}},503);return researchWorker.fetch(request,env,ctx);}return coreWorker.fetch(request,env,ctx);}};