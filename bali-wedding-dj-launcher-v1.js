// KAI ONE — Bali Wedding DJ MY APPS exclusion shim v1
// Bali Wedding DJ is a client app. Keep its owner/admin surface in MY ADMIN, but never expose the client APK in MY APPS.
(() => {
  "use strict";

  const REVISION = "KAI_ONE_BWD_CLIENT_APP_EXCLUDED_FROM_MY_APPS_V1";
  const ROOT_ID = "acc-home-launchpad";
  const APP_KEY = "bali-wedding-dj";

  function reconcile(){
    const root=document.getElementById(ROOT_ID);
    const grid=root?.querySelector(".acc-launch-grid");
    if(!root || !grid) return false;

    grid.querySelectorAll(`[data-owner-app="${APP_KEY}"]`).forEach(tile=>tile.remove());
    const badge=root.querySelector(".acc-launch-head .badge");
    const count=grid.querySelectorAll(".acc-launch-card").length;
    if(badge) badge.textContent=`${count} APPS`;
    root.dataset.baliWeddingDjRevision=REVISION;
    return true;
  }

  let queued=false;
  function schedule(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;reconcile();});
    setTimeout(reconcile,120);
    setTimeout(reconcile,520);
  }

  new MutationObserver(()=>{
    if(document.querySelector(`#${ROOT_ID} [data-owner-app="${APP_KEY}"]`)) schedule();
  }).observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener("pageshow",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.ACCBaliWeddingDJLauncher={revision:REVISION,excludedFromMyApps:true,render:schedule};
  schedule();
})();
