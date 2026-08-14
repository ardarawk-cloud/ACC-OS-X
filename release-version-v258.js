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
  const detectRuntime=()=>{
    const params=new URLSearchParams(location.search);
    const ua=String(navigator.userAgent||"");
    const android=params.get("native")==="android"||/\bACCOSXAndroid\//i.test(ua);
    if(android)return Object.freeze({id:"android",label:"ANDROID APP",native:true,standalone:true});
    const standalone=Boolean(window.matchMedia?.("(display-mode: standalone)")?.matches||navigator.standalone===true);
    return Object.freeze({id:standalone?"pwa":"browser",label:standalone?"PWA INSTALLED":"BROWSER",native:false,standalone});
  };
  const RUNTIME=detectRuntime();
  window.ACCRelease=RELEASE;
  window.ACCRuntime=RUNTIME;

  // Presentation-only sorting. Channel/division IDs, registry order, passports,
  // workflow and Current State remain untouched; only the visible profile select
  // options are reordered A-Z for faster lookup on mobile.
  const sortProfileSelects=()=>{
    document.querySelectorAll("select").forEach(select=>{
      const options=Array.from(select.options||[]);
      const profiles=options.filter(option=>/^ch-/i.test(String(option.value||"")));
      if(profiles.length<2)return;
      const sorted=[...profiles].sort((a,b)=>String(a.textContent||"").trim().localeCompare(String(b.textContent||"").trim(),"id",{sensitivity:"base",numeric:true}));
      const already=profiles.every((option,index)=>option===sorted[index]);
      if(already)return;
      const selected=select.value;
      const profileSet=new Set(profiles);
      const fixed=options.filter(option=>!profileSet.has(option));
      fixed.forEach(option=>select.appendChild(option));
      sorted.forEach(option=>select.appendChild(option));
      select.value=selected;
      select.dataset.displaySort="AZ";
    });
  };

  const patchText=()=>{
    document.querySelectorAll(".build").forEach(node=>{const value=String(node.textContent||"");if(/Build\s+(?:250|256|257)\s*•/i.test(value))node.textContent=`Build ${RELEASE.build} • Core ${RELEASE.corePackageLabel} • KAI System ${RELEASE.kaiSystemLabel}`;});
    document.querySelectorAll(".badge").forEach(node=>{const value=String(node.textContent||"").trim().toUpperCase();if(["BUILD 250","BUILD 256","BUILD 257"].includes(value))node.textContent=`BUILD ${RELEASE.build}`;});
    document.querySelectorAll(".brand-line .badge").forEach(node=>{const value=String(node.textContent||"").trim().toUpperCase();if(["BROWSER","PWA INSTALLED","ANDROID APP"].includes(value)){node.textContent=RUNTIME.label;node.dataset.runtime=RUNTIME.id;}});
    document.querySelectorAll(".item.row.between").forEach(row=>{const label=row.querySelector("span"),value=row.querySelector("strong");if(!label||!value)return;const name=String(label.textContent||"").trim();if(name==="New Version")value.textContent=String(RELEASE.build);if(name==="PWA"){label.textContent="RUNTIME";value.textContent=RUNTIME.label;}});
    const boot=document.querySelector("#boot .boot-sub");if(boot&&/BUILD\s+(?:250|256|257)/i.test(String(boot.textContent||"")))boot.textContent=`ACC OS X • BUILD ${RELEASE.build}`;
    sortProfileSelects();
  };
  let queued=false;const queuePatch=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patchText();});};
  const previousFetch=window.fetch.bind(window);
  window.fetch=async(input,init={})=>{
    const url=typeof input==="string"?input:input?.url||"",method=String(init?.method||(typeof input!=="string"?input?.method:"GET")||"GET").toUpperCase();
    if(method==="GET"&&/(?:^|\/)version\.json(?:\?|$)/.test(url)){
      const response=await previousFetch(input,init);if(!response.ok)return response;
      try{const data=await response.clone().json(),headers=new Headers(response.headers);headers.set("Content-Type","application/json;charset=UTF-8");headers.set("Cache-Control","no-store");return new Response(JSON.stringify({...data,version:RELEASE.dataSchema,appBuild:RELEASE.build,appRevision:RELEASE.revision,dataSchema:RELEASE.dataSchema,corePackageRevision:RELEASE.corePackageRevision,kaiSystemRevision:RELEASE.kaiSystemRevision,runtime:RUNTIME.id}),{status:response.status,statusText:response.statusText,headers});}catch{return response;}
    }
    try{if(method==="POST"&&/\/api\/acc-ai(?:\?|$)/.test(url)&&typeof init?.body==="string"){const body=JSON.parse(init.body);body.context=body.context&&typeof body.context==="object"?body.context:{};body.context.client=body.context.client&&typeof body.context.client==="object"?body.context.client:{};body.context.client.build=RELEASE.build;body.context.client.revision=RELEASE.revision;body.context.client.dataSchema=RELEASE.dataSchema;body.context.client.corePackageRevision=RELEASE.corePackageRevision;body.context.client.kaiSystemRevision=RELEASE.kaiSystemRevision;body.context.client.runtime=RUNTIME.id;init={...init,body:JSON.stringify(body)};}}catch{}
    return previousFetch(input,init);
  };
  const observer=new MutationObserver(queuePatch);observer.observe(document.documentElement,{childList:true,subtree:true});queuePatch();window.dispatchEvent(new CustomEvent("acc-release-ready",{detail:{...RELEASE,runtime:RUNTIME}}));
})();

// Produce Copilot base panel remains the proven 257.6 UI implementation.
(()=>{if(document.querySelector('script[data-acc-produce-copilot="v2576"]'))return;const script=document.createElement("script");script.src="./produce-copilot-v2576.js?rev=BUILD257_6_PRODUCE_COPILOT";script.dataset.accProduceCopilot="v2576";script.async=false;document.head.appendChild(script);})();
// Poster preview/storage fix remains underneath the Build 258 contract runtime injected by the Worker.
(()=>{if(document.querySelector('script[data-acc-copilot-preview-fix="v25762"]'))return;const script=document.createElement("script");script.src="./produce-copilot-preview-fix-v25762.js?rev=BUILD258_1_CONTRACT_HARDENING";script.dataset.accCopilotPreviewFix="v25762";script.async=false;document.head.appendChild(script);})();
