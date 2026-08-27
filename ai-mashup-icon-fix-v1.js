// KAI ONE — AI Mashup launcher icon local-asset fix v1
(() => {
  "use strict";
  const REVISION = "KAI_ONE_AI_MASHUP_LOCAL_ICON_V1";
  const LOCAL_ICON = "./assets/app-icons/ai-mashup.svg?rev=AI_MASHUP_LOCAL_V1";

  function patch(){
    const card = document.querySelector('[data-owner-app="ai-mashup"]');
    if (!card) return false;
    const img = card.querySelector('.acc-launch-icon img');
    if (!img) return false;
    if (img.dataset.localAiMashupIcon === REVISION) return true;
    img.dataset.localAiMashupIcon = REVISION;
    img.style.display = "block";
    img.src = LOCAL_ICON;
    img.addEventListener("error", () => {
      img.style.display = "none";
      card.querySelector('.acc-launch-icon-fallback')?.style.setProperty("z-index", "1");
    }, { once:true });
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
