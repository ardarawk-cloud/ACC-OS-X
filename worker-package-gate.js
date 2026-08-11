// ACC OS X — BUILD 250 PACKAGE DEPLOY GATE V2
// Final production entrypoint. It blocks only RESEARCH while GitHub's target package
// revision is newer than this live Worker package. Once matched, runtime bypasses the
// legacy deploy-gate wrapper and uses the existing quality chain directly.
// Meta publishing, tokens, Page IDs, worker.js and publishing payload/path are untouched.

import coreWorker from "./worker-stage-normalizer.js";
import captionWorker from "./worker-caption-evidence-sanitizer.js";

const PACKAGE_REVISION = "BUILD250_RC7_2_CAPTION_EVIDENCE_SANITIZER";
const GATE_REVISION = "BUILD250_PACKAGE_DEPLOY_GATE_V2";
const TARGET_URL = "https://raw.githubusercontent.com/ardarawk-cloud/ACC-OS-X/main/acc-deploy-target.json";
const text = v => typeof v === "string" ? v.trim() : "";

function json(data,status=200,headersLike=null){
  const headers=new Headers(headersLike||{});
  headers.set("Content-Type","application/json;charset=UTF-8");
  headers.set("Cache-Control","no-store");
  headers.set("Access-Control-Allow-Origin","*");
  return new Response(JSON.stringify(data,null,2),{status,headers});
}

function stageOf(body){
  const s=String(body?.context?.workerTask?.stage||"").toUpperCase();
  if(s==="MATERIAL")return "SCRIPT";
  if(s==="PUBLISH")return "PUBLISHING";
  if(["RESEARCH","SCRIPT","POSTER","CAPTION","QC","PUBLISHING"].includes(s))return s;
  const joined=(Array.isArray(body?.messages)?body.messages:[]).map(m=>text(m?.content)).join("\n");
  const m=joined.match(/(?:^|\n)STAGE:\s*(RESEARCH|SCRIPT|POSTER|CAPTION|QC|PUBLISHING)\b/i);
  if(m)return String(m[1]).toUpperCase();
  if(/Research Specialist/i.test(joined))return "RESEARCH";
  if(/Social Captioner/i.test(joined))return "CAPTION";
  return "";
}

async function targetState(){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),3500);
  try{
    const response=await fetch(`${TARGET_URL}?t=${Date.now()}`,{method:"GET",headers:{Accept:"application/json","Cache-Control":"no-cache"},cache:"no-store",signal:controller.signal});
    if(!response.ok)throw new Error(`GitHub target HTTP ${response.status}`);
    const target=await response.json();
    const expected=text(target?.expectedRevision);
    if(!expected)throw new Error("Invalid deploy target manifest");
    return {available:true,expected,label:text(target?.label),synchronized:expected===PACKAGE_REVISION};
  }catch(error){
    return {available:false,expected:"",label:"",synchronized:null,error:String(error?.message||error).slice(0,220)};
  }finally{clearTimeout(timer);}
}

async function health(request,env,ctx){
  const upstream=await coreWorker.fetch(request,env,ctx);
  let data={};
  try{data=await upstream.clone().json();}catch{}
  const target=await targetState();
  return json({
    ...(data&&typeof data==="object"?data:{}),
    packageDeployGate:"ACTIVE",
    packageDeployGateRevision:GATE_REVISION,
    packageRevision:PACKAGE_REVISION,
    deployTargetAvailable:target.available,
    deploymentSynchronized:target.synchronized,
    deployTargetRevision:target.expected||null,
    deployTargetLabel:target.label||null,
    ...(target.available?{}:{deployTargetWarning:target.error||"Target check unavailable"})
  },upstream.status,upstream.headers);
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&(url.pathname==="/health"||url.pathname==="/api/acc-ai"))return health(request,env,ctx);
    if(!(request.method==="POST"&&url.pathname==="/api/acc-ai"))return coreWorker.fetch(request,env,ctx);

    let body;
    try{body=await request.clone().json();}catch{return coreWorker.fetch(request,env,ctx);}
    const stage=stageOf(body);

    if(stage==="CAPTION")return captionWorker.fetch(request,env,ctx);

    if(stage==="RESEARCH"){
      const target=await targetState();
      if(target.available&&target.synchronized===false){
        return json({
          ok:false,
          stage:"RESEARCH",
          status:"DEPLOY_PENDING",
          error:"ACC OS X update is still syncing from GitHub to Cloudflare. No production was started. Retry shortly.",
          errorDetail:{
            code:"DEPLOY_PENDING",
            expectedRevision:target.expected,
            liveRevision:PACKAGE_REVISION,
            targetLabel:target.label||null,
            gateRevision:GATE_REVISION
          }
        },503);
      }
    }

    return coreWorker.fetch(request,env,ctx);
  }
};
