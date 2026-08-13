// ACC OS X — BUILD 258 RELEASE IDENTITY BRIDGE
// Application release 258; legacy data schema remains 250.
(() => {
  "use strict";
  const RELEASE=Object.freeze({
    build:258,
    revision:"BUILD258_PRODUCTION_CONTRACT_ENGINE",
    label:"BUILD 258",
    corePackageRevision:"BUILD257_KAI_AUTONOMOUS_QUALITY_RECOVERY",
    corePackageLabel:"257",
    kaiSystemRevision:"BUILD256_KAI_SYSTEM_ORCHESTRATOR",
    kaiSystemLabel:"256",
    dataSchema:250
  });
  window.ACCRelease=RELEASE;
  const patchText=()=>{
    document.querySelectorAll(".build").forEach(node=>{const value=String(node.textContent||"");if(/Build\s+(?:250|256|257)\s*•/i.test(value))node.textContent=`Build ${RELEASE.build} • Core ${RELEASE.corePackageLabel} • KAI System ${RELEASE.kaiSystemLabel}`;});
    document.querySelectorAll(".badge").forEach(node=>{const value=String(node.textContent||"").trim().toUpperCase();if(["BUILD 250","BUILD 256","BUILD 257"].includes(value))node.textContent=`BUILD ${RELEASE.build}`;});
    document.querySelectorAll(".item.row.between").forEach(row=>{const label=row.querySelector("span"),value=row.querySelector("strong");if(label&&value&&String(label.textContent||"").trim()==="New Version")value.textContent=String(RELEASE.build);});
    const boot=document.querySelector("#boot .boot-sub");if(boot&&/BUILD\s+(?:250|256|257)/i.test(String(boot.textContent||"")))boot.textContent=`ACC OS X • BUILD ${RELEASE.build}`;
  };
  let queued=false;const queuePatch=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patchText();});};
  const previousFetch=window.fetch.bind(window);
  window.fetch=async(input,init={})=>{
    const url=typeof input==="string"?input:input?.url||"",method=String(init?.method||(typeof input!=="string"?input?.method:"GET")||"GET").toUpperCase();
    if(method==="GET"&&/(?:^|\/)version\.json(?:\?|$)/.test(url)){
      const response=await previousFetch(input,init);if(!response.ok)return response;
      try{const data=await response.clone().json(),headers=new Headers(response.headers);headers.set("Content-Type","application/json;charset=UTF-8");headers.set("Cache-Control","no-store");return new Response(JSON.stringify({...data,version:RELEASE.dataSchema,appBuild:RELEASE.build,appRevision:RELEASE.revision,dataSchema:RELEASE.dataSchema,corePackageRevision:RELEASE.corePackageRevision,kaiSystemRevision:RELEASE.kaiSystemRevision}),{status:response.status,statusText:response.statusText,headers});}catch{return response;}
    }
    try{if(method==="POST"&&/\/api\/acc-ai(?:\?|$)/.test(url)&&typeof init?.body==="string"){const body=JSON.parse(init.body);body.context=body.context&&typeof body.context==="object"?body.context:{};body.context.client=body.context.client&&typeof body.context.client==="object"?body.context.client:{};body.context.client.build=RELEASE.build;body.context.client.revision=RELEASE.revision;body.context.client.dataSchema=RELEASE.dataSchema;body.context.client.corePackageRevision=RELEASE.corePackageRevision;body.context.client.kaiSystemRevision=RELEASE.kaiSystemRevision;init={...init,body:JSON.stringify(body)};}}catch{}
    return previousFetch(input,init);
  };
  const observer=new MutationObserver(queuePatch);observer.observe(document.documentElement,{childList:true,subtree:true});queuePatch();window.dispatchEvent(new CustomEvent("acc-release-ready",{detail:RELEASE}));
})();

// Produce Copilot base panel remains the proven 257.6 UI implementation.
(()=>{if(document.querySelector('script[data-acc-produce-copilot="v2576"]'))return;const script=document.createElement("script");script.src="./produce-copilot-v2576.js?rev=BUILD257_6_PRODUCE_COPILOT";script.dataset.accProduceCopilot="v2576";script.async=false;document.head.appendChild(script);})();
// Poster preview/storage fix remains underneath the Build 258 contract runtime injected by the Worker.
(()=>{if(document.querySelector('script[data-acc-copilot-preview-fix="v25762"]'))return;const script=document.createElement("script");script.src="./produce-copilot-preview-fix-v25762.js?rev=BUILD258_1_CONTRACT_HARDENING";script.dataset.accCopilotPreviewFix="v25762";script.async=false;document.head.appendChild(script);})();
