// KAI ONE — Bali Wedding DJ launcher add-on v4
// Native APK icon first; same-origin JPG fallback for web/non-native contexts.
(() => {
  "use strict";

  const REVISION = "KAI_ONE_BALI_WEDDING_DJ_LAUNCHER_V4_NATIVE_ICON";
  const ROOT_ID = "acc-home-launchpad";
  const APP_KEY = "bali-wedding-dj";
  const PACKAGE = "com.baliweddingdj.app";
  const ICON_URL = "./assets/app-launcher/bali-wedding-dj.jpg?rev=BWD_ICON_V4_NATIVE_FALLBACK";
  const IS_NATIVE_SHELL = /ACCOSXNative\//i.test(navigator.userAgent || "");

  function toast(message){
    document.querySelector(".acc-owner-launch-toast")?.remove();
    const node=document.createElement("div");
    node.className="acc-owner-launch-toast";
    node.textContent=message;
    document.body.appendChild(node);
    setTimeout(()=>node.remove(),2400);
  }

  function nativeIcon(){
    const bridge=window.ACCAndroid;
    if(!bridge || typeof bridge.appIcon!=="function") return "";
    try { return String(bridge.appIcon(PACKAGE)||""); }
    catch { return ""; }
  }

  function hydrateIcon(button){
    const img=button.querySelector("img");
    const fallback=button.querySelector(".acc-launch-icon-fallback");
    if(!img) return;

    const showFallback=()=>{
      img.style.display="none";
      fallback?.style.setProperty("z-index","1");
    };
    const loadLocal=()=>{
      img.style.display="none";
      img.onload=()=>{
        fallback?.style.setProperty("z-index","0");
        img.style.display="block";
      };
      img.onerror=showFallback;
      img.src=ICON_URL;
    };

    const primary=nativeIcon();
    if(!primary){ loadLocal(); return; }
    img.style.display="none";
    img.onload=()=>{
      fallback?.style.setProperty("z-index","0");
      img.style.display="block";
    };
    img.onerror=loadLocal;
    img.src=primary;
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
        <img alt="" style="display:none">
        <span class="acc-launch-icon-fallback">BWD</span>
      </div>
      <div class="acc-launch-title">Bali Wedding DJ</div>
      <div class="acc-launch-status">APK</div>
    `;
    hydrateIcon(button);
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
