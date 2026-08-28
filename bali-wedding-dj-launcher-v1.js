// KAI ONE — Bali Wedding DJ launcher add-on v3
// Uses a real same-origin JPG materialized during Cloudflare deploy.
(() => {
  "use strict";

  const REVISION = "KAI_ONE_BALI_WEDDING_DJ_LAUNCHER_V3_DIRECT_JPG";
  const ROOT_ID = "acc-home-launchpad";
  const APP_KEY = "bali-wedding-dj";
  const PACKAGE = "com.baliweddingdj.app";
  const ICON_URL = "./assets/app-launcher/bali-wedding-dj.jpg?rev=BWD_ICON_V3_DIRECT_JPG";
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
    button.style.setProperty("--launch-accent","#e6b85c");
    button.setAttribute("aria-label","Open Bali Wedding DJ");
    button.innerHTML=`
      <div class="acc-launch-icon">
        <img src="${ICON_URL}" alt="" loading="lazy">
        <span class="acc-launch-icon-fallback">BWD</span>
      </div>
      <div class="acc-launch-title">Bali Wedding DJ</div>
      <div class="acc-launch-status">APK</div>
    `;
    const img=button.querySelector("img");
    if(img) img.addEventListener("error",()=>{
      img.style.display="none";
      img.parentElement?.querySelector(".acc-launch-icon-fallback")?.style.setProperty("z-index","1");
    },{once:true});
    button.addEventListener("click",event=>{
      event.preventDefault();
      if(!IS_NATIVE_SHELL){
        toast("Buka dari APK ACC OS X untuk menjalankan Bali Wedding DJ.");
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
    if(tile && tile.dataset.bwdRevision!==REVISION){ tile.remove(); tile=null; }
    if(!tile){
      tile=createTile();
      tile.dataset.bwdRevision=REVISION;
      grid.appendChild(tile);
    }

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
    requestAnimationFrame(()=>{queued=false;render();});
    setTimeout(render,140);
    setTimeout(render,600);
  }

  new MutationObserver(()=>{
    const root=document.getElementById(ROOT_ID);
    if(!root?.querySelector(`[data-owner-app="${APP_KEY}"][data-bwd-revision="${REVISION}"]`)) schedule();
  }).observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener("pageshow",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.ACCBaliWeddingDJLauncher={revision:REVISION,packageName:PACKAGE,render:schedule};
  schedule();
})();
