// KAI ONE — AI Mashup launcher icon native-first fix v2
(() => {
  "use strict";
  const REVISION = "KAI_ONE_AI_MASHUP_NATIVE_ICON_V2";
  const PACKAGE = "com.accbuilder.aimashupbootlegstudio";
  const LOCAL_ICON = "./assets/app-icons/ai-mashup.svg?rev=AI_MASHUP_LOCAL_V2";

  function nativeIcon(){
    const bridge = window.ACCAndroid;
    if (!bridge || typeof bridge.appIcon !== "function") return "";
    try { return String(bridge.appIcon(PACKAGE) || ""); }
    catch { return ""; }
  }

  function loadIcon(img, card, primary){
    const fallback = card.querySelector('.acc-launch-icon-fallback');
    const showFallback = () => {
      img.style.display = "none";
      fallback?.style.setProperty("z-index", "1");
    };
    const loadLocal = () => {
      img.style.display = "none";
      img.onload = () => {
        fallback?.style.setProperty("z-index", "0");
        img.style.display = "block";
      };
      img.onerror = showFallback;
      img.src = LOCAL_ICON;
    };

    img.style.display = "none";
    if (!primary) { loadLocal(); return; }
    img.onload = () => {
      fallback?.style.setProperty("z-index", "0");
      img.style.display = "block";
    };
    img.onerror = loadLocal;
    img.src = primary;
  }

  function patch(){
    const card = document.querySelector('[data-owner-app="ai-mashup"]');
    if (!card) return false;
    const img = card.querySelector('.acc-launch-icon img');
    if (!img) return false;
    if (img.dataset.localAiMashupIcon === REVISION) return true;
    img.dataset.localAiMashupIcon = REVISION;
    loadIcon(img, card, nativeIcon());
    return true;
  }

  let queued = false;
  function schedule(){
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; patch(); });
    setTimeout(patch, 120);
    setTimeout(patch, 520);
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("pageshow", schedule);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  window.ACCAiMashupIconFix = { revision:REVISION, patch:schedule };
  schedule();
})();
