// ACC OS X — BUILD 257.7 ENTRY WRAPPER
// Leaves legacy static files untouched and appends Channel Master Runtime loaders
// only when the already-existing Produce Copilot preview-fix script is requested.
import baseWorker from "./worker-copilot-master-runtime-v2577.js";

const REVISION="BUILD257_7_ENTRY_WRAPPER";
const LOADER=`
;(()=>{if(!document.querySelector('script[data-acc-master-runtime="v2577"]')){const s=document.createElement("script");s.src="./produce-copilot-master-runtime-v2577.js?rev=BUILD257_7_CHANNEL_MASTER_RUNTIME";s.dataset.accMasterRuntime="v2577";s.async=false;document.head.appendChild(s);}})();
;(()=>{if(!document.querySelector('script[data-acc-batch-runtime="v2577"]')){const s=document.createElement("script");s.src="./produce-copilot-batch-runtime-v2577.js?rev=BUILD257_7_BATCH_RUNTIME";s.dataset.accBatchRuntime="v2577";s.async=false;document.head.appendChild(s);}})();
`;

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
    return baseWorker.fetch(request,env,ctx);
  }
};
