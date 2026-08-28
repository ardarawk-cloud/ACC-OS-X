// KAI ONE — Bali Wedding DJ launcher add-on v1
// Adds the owner's native Bali Wedding DJ APK to MY APPS without touching ACC publishing state.
(() => {
  "use strict";

  const REVISION = "KAI_ONE_BALI_WEDDING_DJ_LAUNCHER_V1";
  const ROOT_ID = "acc-home-launchpad";
  const APP_KEY = "bali-wedding-dj";
  const PACKAGE = "com.baliweddingdj.app";
  const ICON_B64 = "./assets/app-launcher/bali-wedding-dj.jpg.b64?rev=BWD_ICON_V1";
  const IS_NATIVE_SHELL = /ACCOSXNative\//i.test(navigator.userAgent || "");

  function toast(message){
    document.querySelector(".acc-owner-launch-toast")?.remove();
    const node=document.createElement("div");
    node.className="acc-owner-launch-toast";
    node.textContent=message;
    document.body.appendChild(node);
    setTimeout(()=>node.remove(),2400);
  }

  async function hydrateIcon(img){
    try{
      const response=await fetch(ICON_B64,{cache:"force-cache"});
      if(!response.ok) throw new Error("ICON_FETCH_FAILED");
      const b64=(await response.text()).trim();
      if(!b64) throw new Error("ICON_EMPTY");
      img.src=`data:image/jpeg;base64,${b64}`;
    }catch{
      img.style.display="none";
      img.parentElement?.querySelector(".acc-launch-icon-fallback")?.style.setProperty("z-index","1");
    }
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
        <img alt="" loading="lazy">
        <span class="acc-launch-icon-fallback">BWD</span>
      </div>
      <div class="acc-launch-title">Bali Wedding DJ</div>
      <div class="acc-launch-status">APK</div>
    `;
    const img=button.querySelector("img");
    img?.addEventListener("error",()=>{
      img.style.display="none";
      button.querySelector(".acc-launch-icon-fallback")?.style.setProperty("z-index","1");
    },{once:true});
    if(img) hydrateIcon(img);
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
    if(!tile){
      tile=createTile();
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
    if(!root?.querySelector(`[data-owner-app="${APP_KEY}"]`)) schedule();
  }).observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener("pageshow",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.ACCBaliWeddingDJLauncher={revision:REVISION,packageName:PACKAGE,render:schedule};
  schedule();
})();
