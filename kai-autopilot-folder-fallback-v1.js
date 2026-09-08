// ACC OS X — KAI AUTOPILOT MEDIA UI CLEANUP v4
// Android runtime proved the normal media picker already supports multi-select.
// Keep one media button, place Standalone Autopilot after manual Produce, use page scroll on mobile,
// and collapse older Produce history so long sessions do not make the page excessively tall.
(() => {
  "use strict";
  if (window.__ACC_KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V4__) return;
  window.__ACC_KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V4__ = true;

  const REVISION = "KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V4_MANUAL_FIRST_MOBILE_HISTORY";
  const SCROLL_STYLE_ID = "acc-produce-mobile-page-scroll-v2";
  const HISTORY_TOGGLE_ID = "acc-copilot-history-toggle";
  const MOBILE_HISTORY_KEEP = 2;

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
        #acc-produce-copilot-panel .acc-copilot-history-hidden{display:none!important}
        #${HISTORY_TOGGLE_ID}{
          width:100%;
          min-height:42px;
          margin-top:8px;
          border-radius:11px;
          border:1px solid rgba(255,255,255,.10);
          background:rgba(255,255,255,.035);
          color:#d9e1ee;
          font-weight:900;
          font-size:11px;
          letter-spacing:.05em;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function patchMobileHistory(){
    if(!window.matchMedia?.("(max-width:760px)")?.matches) return;
    const manual = document.getElementById("acc-produce-copilot-panel");
    const chat = manual?.querySelector("#acc-copilot-chat");
    if(!manual || !chat) return;

    const messages = [...chat.children].filter(el => el.classList?.contains("acc-copilot-msg"));
    const hiddenCount = Math.max(0, messages.length - MOBILE_HISTORY_KEEP);
    const expanded = manual.dataset.historyExpanded === "1";

    messages.forEach((message,index) => {
      const shouldHide = !expanded && index < messages.length - MOBILE_HISTORY_KEEP;
      message.classList.toggle("acc-copilot-history-hidden", shouldHide);
    });

    let toggle = manual.querySelector(`#${HISTORY_TOGGLE_ID}`);
    if(hiddenCount <= 0){
      toggle?.remove();
      return;
    }

    if(!toggle){
      toggle = document.createElement("button");
      toggle.id = HISTORY_TOGGLE_ID;
      toggle.type = "button";
      chat.insertAdjacentElement("afterend", toggle);
      toggle.addEventListener("click", () => {
        manual.dataset.historyExpanded = manual.dataset.historyExpanded === "1" ? "0" : "1";
        patchMobileHistory();
      });
    }

    toggle.textContent = expanded ? "HIDE HISTORY" : `SHOW HISTORY (${hiddenCount})`;
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
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
    if(manual){
      manual.dataset.mobileScrollRevision = REVISION;
      patchMobileHistory();
    }

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
  window.addEventListener("resize",schedule);
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden) schedule(); });
  schedule();
})();
