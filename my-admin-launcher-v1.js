// KAI ONE — ACC OS X MY ADMIN launcher v2
// Owner-only shortcuts for real internal admin surfaces. ENTEGO Admin remains excluded while it is demo-only.
(() => {
  "use strict";
  if (window.__ACC_MY_ADMIN_V2__) return;
  window.__ACC_MY_ADMIN_V2__ = true;

  const REVISION = "KAI_ONE_MY_ADMIN_V2_COLLAPSIBLE";
  const ROOT_ID = "acc-my-admin";
  const STYLE_ID = "acc-my-admin-v2-style";
  const ACCORDION_STATE_KEY = "acc_legacy_launcher_accordion_v1";
  const IS_NATIVE_SHELL = /ACCOSXNative\//i.test(navigator.userAgent || "");

  const ADMINS = Object.freeze([
    {
      key:"bali-wedding-dj-admin",
      title:"Bali Wedding DJ Admin",
      accent:"#e6b85c",
      fallback:"BWD",
      kind:"APK / OWNER",
      native:["com.baliweddingdj.app"]
    },
    {
      key:"am-studio-admin",
      title:"AM STUDIO Admin",
      accent:"#ef4444",
      fallback:"AM",
      kind:"WEB / ADMIN",
      icon:"https://am-studio-pwa.ardarawk.workers.dev/icon.svg",
      web:"https://am-studio-pwa.ardarawk.workers.dev/"
    },
    {
      key:"am-digital-lab-crm",
      title:"AM DIGITAL LAB CRM",
      accent:"#22d3ee",
      fallback:"CRM",
      kind:"WEB / ADMIN",
      web:"https://am-digital-lab-crm.ardarawk.workers.dev/"
    }
  ]);

  function readAccordionState(){
    try{
      const value=JSON.parse(localStorage.getItem(ACCORDION_STATE_KEY)||"{}");
      return value && typeof value==="object" ? value : {};
    }catch{return {};}
  }

  function writeAccordionState(state){
    try{localStorage.setItem(ACCORDION_STATE_KEY,JSON.stringify(state));}catch{}
  }

  const accordionState=readAccordionState();

  function ensureStyle(){
    let style=document.getElementById(STYLE_ID);
    if(!style){
      style=document.createElement("style");
      style.id=STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent=`
      #${ROOT_ID}[data-admin-accordion="1"]{
        overflow:hidden!important;
        border:1px solid rgba(148,163,184,.16)!important;
        border-radius:22px!important;
        background:linear-gradient(180deg,rgba(10,18,34,.98),rgba(5,11,24,.98))!important;
        padding:0!important;
        margin:12px 0 0!important;
      }
      #${ROOT_ID}[data-admin-accordion="1"] .acc-launch-head{
        cursor:pointer!important;
        user-select:none!important;
        padding:15px 16px!important;
        margin:0!important;
        align-items:center!important;
        -webkit-tap-highlight-color:transparent!important;
      }
      #${ROOT_ID}[data-admin-accordion="1"] .acc-launch-head > .badge{margin-left:auto!important}
      #${ROOT_ID}[data-admin-accordion="1"] .acc-launch-grid{padding:2px 10px 17px!important}
      #${ROOT_ID}[data-expanded="0"] .acc-launch-grid{display:none!important}
    `;
  }

  function setExpanded(root,expanded){
    const head=root.querySelector(".acc-launch-head");
    const grid=root.querySelector(".acc-launch-grid");
    root.dataset.expanded=expanded?"1":"0";
    if(head) head.setAttribute("aria-expanded",expanded?"true":"false");
    if(grid) grid.style.setProperty("display",expanded?"grid":"none","important");
    accordionState.admin=expanded;
    writeAccordionState(accordionState);
  }

  function bindCollapse(root){
    const head=root.querySelector(".acc-launch-head");
    const grid=root.querySelector(".acc-launch-grid");
    if(!head||!grid) return;

    root.dataset.adminAccordion="1";
    head.setAttribute("role","button");
    head.setAttribute("tabindex","0");

    if(root.dataset.adminAccordionInitialized!=="2"){
      root.dataset.adminAccordionInitialized="2";
      setExpanded(root,accordionState.admin===true);
    }else{
      grid.style.setProperty("display",root.dataset.expanded==="1"?"grid":"none","important");
      head.setAttribute("aria-expanded",root.dataset.expanded==="1"?"true":"false");
    }

    if(head.dataset.adminAccordionBound!=="2"){
      head.dataset.adminAccordionBound="2";
      const toggle=event=>{
        if(event.type==="keydown" && !["Enter"," "].includes(event.key)) return;
        if(event.type==="keydown") event.preventDefault();
        setExpanded(root,root.dataset.expanded!=="1");
      };
      head.addEventListener("click",toggle);
      head.addEventListener("keydown",toggle);
    }
  }

  function toast(message){
    if(typeof window.showToast === "function"){
      window.showToast(message);
      return;
    }
    document.querySelector(".acc-owner-launch-toast")?.remove();
    const node=document.createElement("div");
    node.className="acc-owner-launch-toast";
    node.textContent=message;
    node.style.cssText="position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:99999;max-width:min(88vw,420px);padding:10px 13px;border:1px solid #40506a;border-radius:12px;background:#071023;color:#f8fafc;font:700 12px/1.4 ui-monospace,monospace;text-align:center;box-shadow:0 12px 30px rgba(0,0,0,.35)";
    document.body.appendChild(node);
    setTimeout(()=>node.remove(),2600);
  }

  function launch(admin){
    if(admin.native?.length){
      if(!IS_NATIVE_SHELL){
        toast("Buka dari APK ACC OS X untuk menjalankan Bali Wedding DJ Admin.");
        return;
      }
      location.href=`accapp://launch?packages=${encodeURIComponent(admin.native.join(","))}`;
      return;
    }
    if(admin.web) location.assign(admin.web);
  }

  function tile(admin){
    const button=document.createElement("button");
    button.type="button";
    button.className="acc-launch-card mono";
    button.dataset.ownerAdmin=admin.key;
    button.style.setProperty("--launch-accent",admin.accent);
    button.setAttribute("aria-label",`Open ${admin.title}`);
    button.innerHTML=`
      <div class="acc-launch-icon">
        ${admin.icon?`<img src="${admin.icon}" alt="" loading="lazy" referrerpolicy="no-referrer">`:""}
        <span class="acc-launch-icon-fallback">${admin.fallback}</span>
      </div>
      <div class="acc-launch-title">${admin.title}</div>
      <div class="acc-launch-kind">${admin.kind}</div>
    `;
    const img=button.querySelector("img");
    img?.addEventListener("error",()=>{img.style.display="none";},{once:true});
    button.addEventListener("click",event=>{
      event.preventDefault();
      launch(admin);
    });
    return button;
  }

  function render(){
    ensureStyle();
    const projects=document.getElementById("acc-my-projects");
    const maps=document.getElementById("acc-my-maps");
    const apps=document.getElementById("acc-home-launchpad");
    const anchor=projects || maps || apps;
    if(!anchor) return false;

    let root=document.getElementById(ROOT_ID);
    if(!root){
      root=document.createElement("section");
      root.id=ROOT_ID;
      root.className="acc-home-launchpad mono";
      anchor.insertAdjacentElement("afterend",root);
    }

    if(root.dataset.adminRevision!==REVISION){
      root.dataset.adminRevision=REVISION;
      root.innerHTML=`
        <div class="acc-launch-head">
          <div><div class="eyebrow">OWNER CONTROL</div><h2 class="card-title" style="margin-top:3px">MY ADMIN</h2></div>
          <span class="badge">${ADMINS.length} ADMIN</span>
        </div>
        <div class="acc-launch-grid"></div>
      `;
      const grid=root.querySelector(".acc-launch-grid");
      ADMINS.forEach(admin=>grid.appendChild(tile(admin)));
    }
    bindCollapse(root);
    return true;
  }

  let queued=false;
  function schedule(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;render();});
    setTimeout(render,120);
    setTimeout(render,520);
  }

  new MutationObserver(()=>{
    const root=document.getElementById(ROOT_ID);
    if(!root || root.dataset.adminRevision!==REVISION) schedule();
  }).observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener("pageshow",schedule);
  window.addEventListener("focus",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.ACCMyAdmin=Object.freeze({
    revision:REVISION,
    admins:ADMINS.map(({key,title,kind})=>({key,title,kind})),
    render:schedule
  });
  schedule();
})();
