// ACC OS X — BUILD 257.7 ENTRY WRAPPER
// Loads the Channel Master Runtime without modifying legacy static source files.
import baseWorker from "./worker-copilot-master-runtime-v2577.js";

const REVISION="BUILD257_7_ENTRY_WRAPPER";
const LOADER=`
;(()=>{if(!document.querySelector('script[data-acc-master-runtime="v2577"]')){const s=document.createElement("script");s.src="./produce-copilot-master-runtime-v2577.js?rev=BUILD257_7_CHANNEL_MASTER_RUNTIME";s.dataset.accMasterRuntime="v2577";s.async=false;document.head.appendChild(s);}})();
;(()=>{if(!document.querySelector('script[data-acc-batch-runtime="v2577"]')){const s=document.createElement("script");s.src="./produce-copilot-batch-runtime-v2577.js?rev=BUILD257_7_BATCH_RUNTIME";s.dataset.accBatchRuntime="v2577";s.async=false;document.head.appendChild(s);}})();
`;
function json(data,status=200){const h=new Headers({"Content-Type":"application/json;charset=UTF-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});return new Response(JSON.stringify(data),{status,headers:h});}
function normalizeGuided(value){if(!value||typeof value!=="object")return value;const candidates=[value.response,value.result?.response,value.result,value.output,value.data];for(const x of candidates){if(x&&typeof x==="object"&&!Array.isArray(x))return x;}return value;}
function copilotEnv(env){if(!env?.AI?.run)return env;const original=env.AI;return{...env,AI:{run:async(model,args)=>{const result=await original.run(model,args);return args?.guided_json?normalizeGuided(result):result;}}};}
async function bodyOf(request){if(request.method!=="POST")return null;try{return await request.clone().json();}catch{return null;}}
function isCopilot(body){const stage=String(body?.context?.workerTask?.stage||"").toUpperCase();return stage==="COPILOT"||stage==="PRODUCE_COPILOT";}
function opOf(body){const c=String(body?.context?.copilot?.command||"").trim();if(/^(p|poster)\b/i.test(c))return"P";if(/^(c|caption)\b/i.test(c))return"C";return"";}
function staleBatch(body){const n=Math.max(1,Number(body?.context?.masterRuntime?.batchCount)||1);if(n<=1)return false;const op=opOf(body);if(op!=="P"&&op!=="C")return false;const material=String(body?.context?.copilot?.material||"");const found=new Set([...material.matchAll(/^\s*ITEM\s+(\d+)\b/gim)].map(m=>Number(m[1])));for(let i=1;i<=n;i++)if(!found.has(i))return true;return false;}

export default{
  async fetch(request,env,ctx){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/produce-copilot-preview-fix-v25762.js"&&env?.ASSETS){
      const upstream=await env.ASSETS.fetch(request);if(!upstream.ok)return upstream;
      const headers=new Headers(upstream.headers);headers.set("Content-Type","application/javascript;charset=UTF-8");headers.set("Cache-Control","no-cache, no-store, must-revalidate");
      return new Response(`${await upstream.text()}\n${LOADER}\nwindow.ACCBuild2577Entry=${JSON.stringify({revision:REVISION})};`,{status:upstream.status,headers});
    }
    if(url.pathname==="/api/acc-ai"){
      const body=await bodyOf(request);
      if(isCopilot(body)&&staleBatch(body))return json({ok:false,stage:"COPILOT",status:"BATCH_MATERIAL_STALE",error:"BATCH_MATERIAL_STALE_REGENERATE_K: Channel ini memakai batch master. Jalankan K sekali lagi agar material lama diganti dengan batch master baru sebelum P/C.",detail:{revision:REVISION,batchCount:Number(body?.context?.masterRuntime?.batchCount)||1}},422);
      return baseWorker.fetch(request,isCopilot(body)?copilotEnv(env):env,ctx);
    }
    return baseWorker.fetch(request,env,ctx);
  }
};
