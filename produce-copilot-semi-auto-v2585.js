// ACC OS X — BUILD 258.5 SEMI-AUTO PUBLISH UX
// In semi-automatic production, an unmapped Meta page is not an error.
// Complete K/P/C packages remain owner-ready for manual posting; real Meta publishing stays available when mapped.
(() => {
  "use strict";
  if(window.__ACC_SEMI_AUTO_PUBLISH_V2585__)return;
  window.__ACC_SEMI_AUTO_PUBLISH_V2585__=true;

  const REVISION="BUILD258_5_SEMI_AUTO_PUBLISH_UX";
  const MAIN_KEY="acc_os_x_ecosystem_v214";
  const COPILOT_KEY="acc_os_x_produce_copilot_v1";
  const PANEL_ID="acc-produce-copilot-panel";
  const FALLBACK_MAPPED=new Set(["ch-tukang-tambang"]);
  const text=v=>typeof v==="string"?v.trim():"";

  function read(key){try{return JSON.parse(localStorage.getItem(key)||"{}");}catch{return{};}}
  function activeId(){return text(document.getElementById(PANEL_ID)?.dataset?.channelId);}
  function packageReady(id){
    const row=read(COPILOT_KEY)?.channels?.[id],pkg=row?.package||{};
    if(!text(pkg.posterBase64)||!text(pkg.caption)||text(pkg.publishedPostId))return false;
    const gate=document.querySelector("#acc-produce-copilot-panel [data-contract-gate]");
    return !gate||/PUBLISH READY/i.test(text(gate.textContent));
  }
  function mapped(id){
    if(FALLBACK_MAPPED.has(id))return true;
    return Boolean(read(MAIN_KEY)?.settings?.publishMappings?.[id]);
  }
  function ensureStyle(){
    if(document.getElementById("acc-semi-auto-v2585-style"))return;
    const s=document.createElement("style");s.id="acc-semi-auto-v2585-style";
    s.textContent=`.acc-copilot-publish.manual-ready{background:#0daa7b!important;border-color:rgba(105,239,179,.55)!important;opacity:1!important;filter:none!important}.acc-manual-ready-note{margin-top:8px;font-size:10px;line-height:1.45;color:#69efb3;font-weight:800}`;
    document.head.appendChild(s);
  }
  function setStatus(message){const el=document.getElementById("acc-copilot-status");if(!el)return;el.textContent=message;el.style.color="#69efb3";}
  function paint(){
    ensureStyle();
    const id=activeId(),panel=document.getElementById(PANEL_ID),btn=document.getElementById("acc-copilot-publish");if(!id||!panel||!btn)return;
    const ready=packageReady(id),hasMap=mapped(id);
    let note=panel.querySelector("[data-manual-ready-note]");
    if(ready&&!hasMap){
      btn.disabled=false;btn.classList.add("manual-ready");btn.dataset.publishMode="MANUAL_OWNER";btn.textContent="✓ MANUAL PUBLISH READY";btn.title="Poster + caption lengkap. Posting manual; Meta mapping belum diperlukan.";
      if(!note){note=document.createElement("div");note.className="acc-manual-ready-note";note.dataset.manualReadyNote="1";btn.insertAdjacentElement("afterend",note);}note.textContent="SEMI AUTO • Paket lengkap. Posting manual aktif; mapping Meta bisa disiapkan nanti saat auto-publish diaktifkan.";
      const status=document.getElementById("acc-copilot-status");if(status&&/Meta Page channel ini belum di-map/i.test(text(status.textContent)))setStatus("MANUAL PUBLISH READY // Meta mapping tidak diperlukan pada mode semi-auto.");
    }else{
      btn.classList.remove("manual-ready");delete btn.dataset.publishMode;if(note)note.remove();
    }
  }
  document.addEventListener("click",event=>{
    const btn=event.target?.closest?.("#acc-copilot-publish");if(!btn)return;
    const id=activeId();if(!id||!packageReady(id)||mapped(id))return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    setStatus("MANUAL PUBLISH READY // Poster + caption lengkap. Posting manual; Meta mapping tidak diperlukan.");
    paint();
  },true);
  let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paint();});}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener("storage",schedule);setInterval(schedule,1000);schedule();
  window.ACCSemiAutoPublish=Object.freeze({revision:REVISION,mode:"MANUAL_OWNER",refresh:paint});
})();
