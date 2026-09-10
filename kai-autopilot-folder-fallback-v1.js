// ACC OS X — KAI AUTOPILOT MEDIA UI CLEANUP v5
// Android runtime UX hardening:
// - keep one media button and manual-first layout
// - normalize empty Android picker MIME types before the base Autopilot ingests them
// - move owner instruction above AUTO ROUTE
// - show clear READY TO ROUTE feedback
// - keep mobile page scrolling while collapsing old history and very long latest text output
(() => {
  "use strict";
  if (window.__ACC_KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V5__) return;
  window.__ACC_KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V5__ = true;

  const REVISION = "KAI_AUTOPILOT_SINGLE_MEDIA_BUTTON_V5_ANDROID_PICKER_FEEDBACK_COMPACT";
  const STORE_KEY = "acc_os_x_kai_autopilot_v1";
  const SCROLL_STYLE_ID = "acc-produce-mobile-page-scroll-v3";
  const HISTORY_TOGGLE_ID = "acc-copilot-history-toggle";
  const LATEST_TOGGLE_ID = "acc-copilot-latest-toggle";
  const MOBILE_HISTORY_KEEP = 1;

  const MIME_BY_EXT = Object.freeze({
    jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png", webp:"image/webp", gif:"image/gif", heic:"image/heic", heif:"image/heif", bmp:"image/bmp",
    mp4:"video/mp4", mov:"video/quicktime", m4v:"video/x-m4v", webm:"video/webm", mkv:"video/x-matroska", avi:"video/x-msvideo", "3gp":"video/3gpp"
  });

  function inferMime(file){
    const current = String(file?.type || "").toLowerCase();
    if(/^image\//.test(current) || /^video\//.test(current)) return current;
    const name = String(file?.name || "").toLowerCase();
    const ext = name.includes(".") ? name.split(".").pop() : "";
    return MIME_BY_EXT[ext] || "";
  }

  function setAutopilotStatus(text, error=false){
    const node = document.getElementById("acc-autopilot-status");
    if(!node) return;
    node.textContent = text || "";
    node.style.color = error ? "#ff8095" : "#8796ad";
  }

  function readAutopilotState(){
    try{return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");}catch{return {};}
  }

  function refreshReadyStatus(){
    const state = readAutopilotState();
    const jobs = Array.isArray(state.jobs) ? state.jobs : [];
    const latest = jobs[jobs.length - 1];
    if(!latest || latest.status !== "INBOX") return;
    const node = document.getElementById("acc-autopilot-status");
    if(!node) return;
    const current = String(node.textContent || "").trim();
    if(!current || /kosong|tidak ada media|diproses|menyimpan|dipilih/i.test(current)){
      const pending = jobs.filter(job => job.status === "INBOX").length;
      node.textContent = `${latest.fileName || "Media"} • READY TO ROUTE${pending > 1 ? ` • ${pending} INBOX` : ""}`;
      node.style.color = "#69efb3";
    }
  }

  function normalizeAndroidPicker(event){
    const target = event.target;
    if(!target || target.id !== "acc-autopilot-file-input") return;
    const original = [...(target.files || [])];
    if(!original.length) return;

    const accepted = original.filter(file => inferMime(file));
    if(!accepted.length){
      setAutopilotStatus("File terpilih tidak terbaca sebagai foto/video.", true);
      return;
    }

    let normalized = false;
    try{
      if(typeof DataTransfer === "function" && typeof File === "function"){
        const transfer = new DataTransfer();
        for(const file of accepted){
          const inferred = inferMime(file);
          const current = String(file.type || "");
          if(!current && inferred){
            transfer.items.add(new File([file], file.name || "media", {type:inferred,lastModified:file.lastModified || Date.now()}));
            normalized = true;
          }else{
            transfer.items.add(file);
          }
        }
        if(normalized || accepted.length !== original.length) target.files = transfer.files;
      }
    }catch{}

    setAutopilotStatus(`${accepted.length} media dipilih • memasukkan ke ACC Inbox…`);
    setTimeout(refreshReadyStatus, 900);
  }

  // Capture phase runs before the base Autopilot input change handler.
  document.addEventListener("change", normalizeAndroidPicker, true);

  function ensureMobilePageScroll(){
    if(document.getElementById(SCROLL_STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = SCROLL_STYLE_ID;
    style.textContent = `
      #acc-kai-autopilot-panel .acc-auto-actions{grid-template-columns:1fr!important}
      #acc-kai-autopilot-panel #acc-autopilot-route{width:100%;min-height:48px;margin-top:10px}
      #acc-kai-autopilot-panel #acc-autopilot-instruction{margin-top:10px}
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
        #acc-produce-copilot-panel .acc-copilot-latest-clamped .acc-copilot-bubble{
          max-height:360px!important;
          overflow:hidden!important;
          position:relative!important;
        }
        #${HISTORY_TOGGLE_ID},#${LATEST_TOGGLE_ID}{
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

  function patchLatestOutput(){
    if(!window.matchMedia?.("(max-width:760px)")?.matches) return;
    const manual = document.getElementById("acc-produce-copilot-panel");
    const chat = manual?.querySelector("#acc-copilot-chat");
    if(!manual || !chat) return;

    const messages = [...chat.children].filter(el => el.classList?.contains("acc-copilot-msg"));
    const latest = messages[messages.length - 1];
    let toggle = manual.querySelector(`#${LATEST_TOGGLE_ID}`);
    if(!latest){toggle?.remove();return;}

    messages.forEach(message => { if(message !== latest) message.classList.remove("acc-copilot-latest-clamped"); });
    const bubble = latest.querySelector(".acc-copilot-bubble");
    const isPoster = !!bubble?.querySelector("img");
    if(!bubble || isPoster || bubble.scrollHeight <= 430){
      latest.classList.remove("acc-copilot-latest-clamped");
      toggle?.remove();
      return;
    }

    const expanded = manual.dataset.latestExpanded === "1";
    latest.classList.toggle("acc-copilot-latest-clamped", !expanded);

    if(!toggle){
      toggle = document.createElement("button");
      toggle.id = LATEST_TOGGLE_ID;
      toggle.type = "button";
      toggle.addEventListener("click", () => {
        manual.dataset.latestExpanded = manual.dataset.latestExpanded === "1" ? "0" : "1";
        patchLatestOutput();
      });
    }
    const historyToggle = manual.querySelector(`#${HISTORY_TOGGLE_ID}`);
    if(historyToggle) historyToggle.insertAdjacentElement("beforebegin", toggle);
    else chat.insertAdjacentElement("afterend", toggle);

    toggle.textContent = expanded ? "COLLAPSE OUTPUT" : "VIEW FULL OUTPUT";
    toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function placeAfterManual(panel){
    const manual = document.getElementById("acc-produce-copilot-panel");
    if(!manual?.parentElement || !panel) return;
    if(manual.nextElementSibling !== panel){
      manual.parentElement.insertBefore(panel, manual.nextSibling);
    }
  }

  function patchAutopilotLayout(panel){
    document.getElementById("acc-autopilot-folder")?.remove();
    document.getElementById("acc-autopilot-folder-input")?.remove();

    const dropCopy = panel.querySelector("#acc-autopilot-drop .acc-auto-desc");
    if(dropCopy){
      const next = "Pilih satu atau beberapa foto/video. Setelah masuk, media akan tampil sebagai READY TO ROUTE.";
      if(dropCopy.textContent !== next) dropCopy.textContent = next;
    }

    const add = document.getElementById("acc-autopilot-add");
    if(add && String(add.textContent||"").trim() !== "+ ADD MEDIA") add.textContent = "+ ADD MEDIA";

    const instruction = document.getElementById("acc-autopilot-instruction");
    const route = document.getElementById("acc-autopilot-route");
    const actions = add?.closest(".acc-auto-actions");
    if(instruction){
      instruction.placeholder = "Perintah sebelum route. Contoh: 'Posting ke Bali Wedding DJ. Buat caption wedding premium dari media ini.'";
    }
    if(actions && instruction && route){
      if(actions.nextElementSibling !== instruction) actions.insertAdjacentElement("afterend", instruction);
      if(instruction.nextElementSibling !== route) instruction.insertAdjacentElement("afterend", route);
    }

    const status = document.getElementById("acc-autopilot-status");
    if(status && /^Android mode:/i.test(String(status.textContent||"").trim())) status.textContent = "";
    refreshReadyStatus();
  }

  function patch(){
    ensureMobilePageScroll();

    const manual = document.getElementById("acc-produce-copilot-panel");
    if(manual){
      manual.dataset.mobileScrollRevision = REVISION;
      patchMobileHistory();
      patchLatestOutput();
    }

    const panel = document.getElementById("acc-kai-autopilot-panel");
    if(!panel) return;
    panel.dataset.mediaUiRevision = REVISION;
    placeAfterManual(panel);
    patchAutopilotLayout(panel);
  }

  let queued = false;
  const schedule = () => {
    if(queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; patch(); });
  };

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener("pageshow",schedule);
  window.addEventListener("focus",schedule);
  window.addEventListener("resize",schedule);
  window.addEventListener("storage",event=>{if(event.key===STORE_KEY)setTimeout(schedule,0);});
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden) schedule(); });
  schedule();
})();
