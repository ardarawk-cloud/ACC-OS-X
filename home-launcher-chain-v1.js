// KAI ONE — ACC OS X HOME LAUNCHER CHAIN v1
// Canonical HOME order: MY APPS -> MY MAPS -> MY PROJECTS -> MY ADMIN -> phone categories.
(() => {
  "use strict";
  if(window.__ACC_HOME_LAUNCHER_CHAIN_V1__) return;
  window.__ACC_HOME_LAUNCHER_CHAIN_V1__=true;

  const REVISION="KAI_ONE_HOME_LAUNCHER_CHAIN_V1";
  const isHome=()=>Boolean(document.querySelector('.tab.active[data-value="enterprise"]'));
  const isNativeAndroid=()=>Boolean(
    window.ACCPlatform?.isNativeAndroid ||
    /ACCOSX(?:Native|Android)\//i.test(navigator.userAgent||"") ||
    window.ACCAndroid
  );

  function loadScript(key,src){
    return new Promise((resolve,reject)=>{
      const existing=document.querySelector(`script[data-acc-home-chain="${key}"]`);
      if(existing){
        if(existing.dataset.loaded==="1") return resolve();
        existing.addEventListener("load",()=>resolve(),{once:true});
        existing.addEventListener("error",()=>reject(new Error(`LOAD_FAILED:${key}`)),{once:true});
        return;
      }
      const script=document.createElement("script");
      script.src=src;
      script.async=false;
      script.dataset.accHomeChain=key;
      script.addEventListener("load",()=>{script.dataset.loaded="1";resolve();},{once:true});
      script.addEventListener("error",()=>reject(new Error(`LOAD_FAILED:${key}`)),{once:true});
      document.head.appendChild(script);
    });
  }

  let running=false;
  async function boot(){
    if(running || !isHome()) return;
    running=true;
    try{
      window.ACCHomeLaunchpad?.render?.();
      if(!document.getElementById("acc-home-launchpad")) return;

      await loadScript("maps","./my-maps-launcher-v1.js?rev=KAI_ONE_MY_MAPS_V18_MOUNT_BBYA_CORRECT_PLACE");
      window.ACCMyMaps?.render?.();

      await loadScript("projects","./my-projects-launcher-v1.js?rev=KAI_ONE_MY_PROJECTS_V4_APK_PROJECT");
      window.ACCMyProjects?.render?.();

      await loadScript("admin","./my-admin-launcher-v1.js?rev=KAI_ONE_MY_ADMIN_V3_BWD_OWNER_PACKAGE");
      const adminScript=document.querySelector('script[data-acc-home-chain="admin"]');
      if(adminScript) adminScript.dataset.accMyAdmin="v3";
      window.ACCMyAdmin?.render?.();

      if(isNativeAndroid()){
        await loadScript("phone","./owner-phone-launcher-v1.js?rev=KAI_ONE_OWNER_PHONE_LAUNCHER_V3_FAST_TAP_BUILD10");
        window.ACCOwnerPhoneLauncher?.render?.();
      }else{
        document.getElementById("acc-owner-phone-sections")?.remove();
      }

      await loadScript("layout","./launcher-layout-stability-v1.js?rev=KAI_ONE_LAUNCHER_LAYOUT_STABILITY_V6_BWD_ADMIN_OWNER");
      window.ACCLauncherLayoutStability?.stabilize?.();

      document.documentElement.dataset.accHomeLauncherChain=REVISION;
    }catch(error){
      console.warn("[ACC HOME CHAIN]",error);
    }finally{
      running=false;
    }
  }

  let queued=false;
  function schedule(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;boot();});
  }

  window.addEventListener("acc-core-rendered",event=>{
    if(!event?.detail?.tab || event.detail.tab==="enterprise") schedule();
  });
  window.addEventListener("pageshow",schedule);
  window.addEventListener("focus",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});

  window.ACCHomeLauncherChain=Object.freeze({revision:REVISION,render:schedule});
  schedule();
})();
