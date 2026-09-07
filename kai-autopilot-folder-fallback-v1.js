// ACC OS X — KAI AUTOPILOT MEDIA UI CLEANUP v2
// Android runtime proved the normal media picker already supports multi-select.
// Keep one media button and place Standalone Autopilot after the manual Produce panel.
(() => {
  "use strict";
  if (window.__ACC_KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V2__) return;
  window.__ACC_KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V2__ = true;

  const REVISION = "KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V2_MANUAL_FIRST";

  function placeAfterManual(panel){
    const manual = document.getElementById("acc-produce-copilot-panel");
    if(!manual?.parentElement || !panel) return;
    if(manual.nextElementSibling !== panel){
      manual.parentElement.insertBefore(panel, manual.nextSibling);
    }
  }

  function patch(){
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
