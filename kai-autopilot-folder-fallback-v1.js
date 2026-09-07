// ACC OS X — KAI AUTOPILOT MEDIA UI CLEANUP v3
// Android runtime proved the normal media picker already supports multi-select.
// Keep one media button, place Standalone Autopilot after manual Produce, and remove nested mobile chat scrolling.
(() => {
  "use strict";
  if (window.__ACC_KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V3__) return;
  window.__ACC_KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V3__ = true;

  const REVISION = "KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V3_MANUAL_FIRST_MOBILE_SCROLL";
  const SCROLL_STYLE_ID = "acc-produce-mobile-page-scroll-v1";

  function ensureMobilePageScroll(){
    if(document.getElementById(SCROLL_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = SCROLL_STYLE_ID;
    style.textContent = `
      @media (max-width:760px){
        #acc-produce-copilot-panel .acc-copilot-chat{
          max-height:none!important;
          height:auto!important;
          overflow:visible!important;
          overflow-y:visible!important;
          overscroll-behavior:auto!important;
          touch-action:pan-y!important;
          scroll-behavior:auto!important;
          -webkit-overflow-scrolling:auto!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function placeAfterManual(panel){
    const manual = document.getElementById("acc-produce-copilot-panel");
    if(!manual?.parentElement || !panel) return;
    if(manual.nextElementSibling !== panel){
      manual.parentElement.insertBefore(panel, manual.nextSibling);
    }
  }

  function patch(){
    ensureMobilePageScroll();

    const manual = document.getElementById("acc-produce-copilot-panel");
    if(manual) manual.dataset.mobileScrollRevision = REVISION;

    const panel = document.getElementById("acc-kai-autopilot-panel");
    if(!panel) return;

    panel.dataset.mediaUiRevision = REVISION;
    placeAfterManual(panel);

    document.getElementById("acc-autopilot-folder")?.remove();
    document.getElementById("acc-autopilot-folder-input")?.remove();

    const dropCopy = panel.querySelector("#acc-autopilot-drop .acc-auto-desc");
    if(dropCopy){
      const next = "Pilih satu atau beberapa foto/video. File disimpan lokal di device (IndexedDB), bukan dimasukkan ke channel selector.";
      if(dropCopy.textContent !== next) dropCopy.textContent = next;
    }

    const add = document.getElementById("acc-autopilot-add");
    if(add && String(add.textContent||"").trim() !== "+ ADD MEDIA") add.textContent = "+ ADD MEDIA";

    const status = document.getElementById("acc-autopilot-status");
    if(status && /^Android mode:/i.test(String(status.textContent||"").trim())) status.textContent = "";
  }

  let queued = false;
  const schedule = () => {
    if(queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; patch(); });
  };

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("pageshow",schedule);
  window.addEventListener("focus",schedule);
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden) schedule(); });
  schedule();
})();
