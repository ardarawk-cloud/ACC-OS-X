// ACC OS X — KAI AUTOPILOT MEDIA UI CLEANUP v1
// Android runtime proved the normal media picker already supports multi-select.
// Remove the redundant folder action until a real native watched-folder bridge exists.
(() => {
  "use strict";
  if (window.__ACC_KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V1__) return;
  window.__ACC_KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V1__ = true;

  const REVISION = "KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V1";

  function patch(){
    const panel = document.getElementById("acc-kai-autopilot-panel");
    if(!panel) return;

    panel.dataset.mediaUiRevision = REVISION;

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
