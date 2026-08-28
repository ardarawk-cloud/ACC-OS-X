// KAI ONE — Legacy launcher accordion v2
// Makes MY APPS / MY MAPS / MY PROJECTS truly expand-collapse, even against older !important grid rules.
(() => {
  "use strict";
  if (window.__ACC_LEGACY_LAUNCHER_ACCORDION_V2__) return;
  window.__ACC_LEGACY_LAUNCHER_ACCORDION_V2__ = true;

  const REVISION = "KAI_ONE_LEGACY_LAUNCHER_ACCORDION_V2_FORCE_DISPLAY";
  const STYLE_ID = "acc-legacy-launcher-accordion-v2-style";
  const STATE_KEY = "acc_legacy_launcher_accordion_v1";
  const TARGETS = [
    { root:"acc-home-launchpad", head:".acc-launch-head", body:".acc-launch-grid", key:"apps" },
    { root:"acc-my-maps", head:".acc-map-head", body:".acc-map-grid", key:"maps" },
    { root:"acc-my-projects", head:".acc-project-head", body:".acc-project-grid", key:"projects" }
  ];

  function readState(){
    try { const value=JSON.parse(localStorage.getItem(STATE_KEY)||"{}"); return value && typeof value==="object" ? value : {}; }
    catch { return {}; }
  }
  function writeState(state){ try { localStorage.setItem(STATE_KEY,JSON.stringify(state)); } catch {} }
  const state=readState();

  function ensureStyle(){
    let style=document.getElementById(STYLE_ID);
    if(!style){ style=document.createElement("style"); style.id=STYLE_ID; document.head.appendChild(style); }
    style.textContent=`
      #acc-home-launchpad[data-legacy-accordion="1"],
      #acc-my-maps[data-legacy-accordion="1"],
      #acc-my-projects[data-legacy-accordion="1"]{
        overflow:hidden!important;
        border:1px solid rgba(148,163,184,.16)!important;
        border-radius:22px!important;
        background:linear-gradient(180deg,rgba(10,18,34,.98),rgba(5,11,24,.98))!important;
        padding:0!important;
        margin:12px 0 0!important;
      }
      [data-legacy-accordion="1"] [data-legacy-accordion-head="1"]{
        cursor:pointer!important;
        user-select:none!important;
        padding:15px 16px!important;
        margin:0!important;
        align-items:center!important;
        -webkit-tap-highlight-color:transparent!important;
      }
      [data-legacy-accordion="1"] [data-legacy-accordion-head="1"]::after{
        content:"⌄";
        flex:0 0 auto;
        display:grid;
        place-items:center;
        width:28px;height:28px;
        margin-left:2px;
        border:1px solid rgba(148,163,184,.24);
        border-radius:999px;
        color:#94a3b8;
        font-size:.9rem;
        transition:transform .15s ease,color .15s ease,border-color .15s ease;
      }
      [data-legacy-accordion="1"][data-expanded="1"] [data-legacy-accordion-head="1"]::after{
        transform:rotate(180deg);
        color:#e2e8f0;
        border-color:rgba(226,232,240,.35);
      }
      [data-legacy-accordion="1"] [data-legacy-accordion-head="1"] > .badge{margin-left:auto!important}
      [data-legacy-accordion="1"] [data-legacy-accordion-body="1"]{padding:2px 10px 17px!important}
      #acc-home-launchpad[data-expanded="0"] .acc-launch-grid,
      #acc-my-maps[data-expanded="0"] .acc-map-grid,
      #acc-my-projects[data-expanded="0"] .acc-project-grid{display:none!important}
    `;
  }

  function applyBodyDisplay(root,target,expanded){
    const body=root.querySelector(target.body);
    if(!body) return;
    body.style.setProperty("display",expanded?"grid":"none","important");
  }

  function setExpanded(root,target,expanded){
    root.dataset.expanded=expanded?"1":"0";
    const head=root.querySelector(target.head);
    if(head) head.setAttribute("aria-expanded",expanded?"true":"false");
    applyBodyDisplay(root,target,expanded);
    state[target.key]=expanded;
    writeState(state);
  }

  function bind(target){
    const root=document.getElementById(target.root);
    if(!root) return false;
    const head=root.querySelector(target.head);
    const body=root.querySelector(target.body);
    if(!head||!body) return false;

    root.dataset.legacyAccordion="1";
    root.dataset.accordionRevision=REVISION;
    head.dataset.legacyAccordionHead="1";
    body.dataset.legacyAccordionBody="1";
    head.setAttribute("role","button");
    head.setAttribute("tabindex","0");

    if(root.dataset.accordionInitialized!=="2"){
      root.dataset.accordionInitialized="2";
      const initial=state[target.key]===true;
      setExpanded(root,target,initial);
    } else {
      applyBodyDisplay(root,target,root.dataset.expanded==="1");
    }

    if(head.dataset.accordionBound!=="2"){
      head.dataset.accordionBound="2";
      const toggle=event=>{
        if(event.type==="keydown" && !["Enter"," "].includes(event.key)) return;
        if(event.type==="keydown") event.preventDefault();
        setExpanded(root,target,root.dataset.expanded!=="1");
      };
      head.addEventListener("click",toggle);
      head.addEventListener("keydown",toggle);
    }
    return true;
  }

  function render(){
    ensureStyle();
    TARGETS.forEach(bind);
  }

  let queued=false;
  function schedule(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;render();});
    setTimeout(render,120);
    setTimeout(render,520);
  }

  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("pageshow",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.ACCLegacyLauncherAccordion={revision:REVISION,render:schedule};
  schedule();
})();
