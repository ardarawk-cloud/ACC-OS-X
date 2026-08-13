// ACC OS X — BUILD 257.7 ENTRY WRAPPER
// Leaves legacy static files untouched and appends Channel Master Runtime loaders
// only when the already-existing Produce Copilot preview-fix script is requested.
import baseWorker from "./worker-copilot-master-runtime-v2577.js";

const REVISION="BUILD257_7_ENTRY_WRAPPER";
const LOADER=`
;(()=>{if(!document.querySelector('script[data-acc-master-runtime="v2577"]')){const s=document.createElement("script");s.src="./produce-copilot-master-runtime-v2577.js?rev=BUILD257_7_CHANNEL_MASTER_RUNTIME";s.dataset.accMasterRuntime="v2577";s.async=false;document.head.appendChild(s);}})();
;(()=>{if(!document.querySelector('script[data-acc-batch-runtime="v2577"]')){const s=document.createElement("script");s.src="./produce-copilot-batch-runtime-v2577.js?rev=BUILD257_7_BATCH_RUNTIME";s.dataset.accBatchRuntime="v2577";s.async=false;document.head.appendChild(s);}})();
`;

function normalizeGuided(value){
  if(!value||typeof value!=="object")return value;
  const candidates=[value.response,value.result?.response,value.result,value.output,value.data];
  for(const x of candidates){if(x&&typeof x==="object"&&!Array.isArray(x))return x;}
  return value;
}
function copilotEnv(env){
  if(!env?.AI?.run)return env;
  const original=env.AI;
  const AI={
    run:async(model,args)=>{
      const result=await original.run(model,args);
      return args?.guided_json?normalizeGuided(result):result;
    }
  };
  return {...env,AI};
}
async function isCopilotRequest(request){
  if(request.method!=="POST")return false;
  try{
    const body=await request.clone().json();
    const stage=String(body?.context?.workerTask?.stage||"").toUpperCase();
    return stage==="COPILOT"||stage==="PRODUCE_COPILOT";
  }catch{return false;}
}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/produce-copilot-preview-fix-v25762.js"&&env?.ASSETS){
      const upstream=await env.ASSETS.fetch(request);
      if(!upstream.ok)return upstream;
      const headers=new Headers(upstream.headers);
      headers.set("Content-Type","application/javascript;charset=UTF-8");
      headers.set("Cache-Control","no-cache, no-store, must-revalidate");
      return new Response(`${await upstream.text()}\n${LOADER}\nwindow.ACCBuild2577Entry=${JSON.stringify({revision:REVISION})};`,{status:upstream.status,headers});
    }
    const useCopilotEnv=url.pathname==="/api/acc-ai"&&await isCopilotRequest(request);
    return baseWorker.fetch(request,useCopilotEnv?copilotEnv(env):env,ctx);
  }
};
