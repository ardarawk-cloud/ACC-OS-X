// KAI ONE — SYNC by Krisbow CCTV launcher add-on v1
// Adds the owner's installed SYNC by Krisbow app to MY APPS without touching publishing state.
(() => {
  "use strict";

  const REVISION = "KAI_ONE_SYNC_CCTV_LAUNCHER_V1";
  const ROOT_ID = "acc-home-launchpad";
  const APP_KEY = "sync-cctv";
  const PACKAGE = "com.kawanlama.smartklic";
  const IS_NATIVE_SHELL = /ACCOSXNative\//i.test(navigator.userAgent || "");

  function toast(message){
    document.querySelector(".acc-owner-launch-toast")?.remove();
    const node=document.createElement("div");
    node.className="acc-owner-launch-toast";
    node.textContent=message;
    document.body.appendChild(node);
    setTimeout(()=>node.remove(),2400);
  }

  function createTile(){
    const button=document.createElement("button");
    button.type="button";
    button.className="acc-launch-card mono";
    button.dataset.ownerApp=APP_KEY;
    button.style.setProperty("--launch-accent","#ff7a18");
    button.setAttribute("aria-label","Open SYNC CCTV");
    button.innerHTML=`
      <div class="acc-launch-icon">
        <svg viewBox="0 0 100 100" aria-hidden="true" style="width:100%;height:100%;display:block">
          <defs>
            <linearGradient id="accSyncCctvGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#ff2638"/>
              <stop offset="1" stop-color="#ffad12"/>
            </linearGradient>
          </defs>
          <rect x="4" y="4" width="92" height="92" rx="24" fill="url(#accSyncCctvGradient)"/>
          <path d="M24 39h52a7 7 0 0 1 7 7v21a7 7 0 0 1-7 7H24a7 7 0 0 1-7-7V46a7 7 0 0 1 7-7Z" fill="rgba(0,0,0,.16)"/>
          <circle cx="50" cy="56" r="13" fill="none" stroke="#fff" stroke-width="6"/>
          <circle cx="50" cy="56" r="4" fill="#fff"/>
          <path d="M31 39l7-10h24l7 10" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="acc-launch-title">SYNC CCTV</div>
      <div class="acc-launch-status">APK</div>
    `;
    button.addEventListener("click",event=>{
      event.preventDefault();
      if(!IS_NATIVE_SHELL){
        toast("Buka dari APK ACC OS X untuk menjalankan SYNC CCTV.");
        return;
      }
      location.href=`accapp://launch?packages=${encodeURIComponent(PACKAGE)}`;
    });
    return button;
  }

  function render(){
    const root=document.getElementById(ROOT_ID);
    const grid=root?.querySelector(".acc-launch-grid");
    if(!root || !grid) return false;

    let tile=grid.querySelector(`[data-owner-app="${APP_KEY}"]`);
    if(!tile){
      tile=createTile();
      grid.appendChild(tile);
    }

    const badge=root.querySelector(".acc-launch-head .badge");
    const count=grid.querySelectorAll(".acc-launch-card").length;
    if(badge) badge.textContent=`${count} APPS`;
    root.dataset.syncCctvRevision=REVISION;
    return true;
  }

  let queued=false;
  function schedule(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;render();});
    setTimeout(render,140);
    setTimeout(render,600);
  }

  new MutationObserver(()=>{
    const root=document.getElementById(ROOT_ID);
    if(!root?.querySelector(`[data-owner-app="${APP_KEY}"]`)) schedule();
  }).observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener("pageshow",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.ACCSyncCctvLauncher={revision:REVISION,packageName:PACKAGE,render:schedule};
  schedule();
})();
