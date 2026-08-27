// KAI ONE — ACC OS X MY APPS launcher v3
// One ACC OS X entry point for the owner's existing ACC apps. ACC OS X itself is intentionally excluded.
(() => {
  "use strict";

  const REVISION = "KAI_ONE_MY_APPS_V3_OFFICIAL_ICONS";
  const ROOT_ID = "acc-home-launchpad";
  const STYLE_ID = "acc-owner-app-launcher-v2-style";
  const IS_NATIVE_SHELL = /ACCOSXNative\//i.test(navigator.userAgent || "");

  const APPS = [
    {
      key:"acc-cleaner", title:"ACC Cleaner", short:"CLEANER", accent:"#38bdf8", mode:"android",
      packages:["com.acc.cleaner"],
      iconUrl:"./assets/app-launcher/acc-cleaner.svg?rev=OFFICIAL_V1",
      iconFallback:"CL"
    },
    {
      key:"acc-dj", title:"ACC DJ", short:"DJ", accent:"#f8fafc", mode:"web",
      iconUrl:"https://raw.githubusercontent.com/balinightlife666-web/DJ-AM/main/icon-192.png",
      iconFallback:"DJ",
      webUrl:"https://balinightlife666-web.github.io/DJ-AM/"
    },
    {
      key:"entego", title:"ENTEGO", short:"ENTEGO", accent:"#ff7a18", mode:"division",
      divisionKey:"entego",
      iconUrl:"https://entego-pwa.ardarawk.workers.dev/icon-512.png?v=79",
      iconFallback:"E",
      webUrl:"https://entego-pwa.ardarawk.workers.dev/"
    },
    {
      key:"kai-trade-x", title:"KAI TRADE X", short:"TRADE X", accent:"#60a5fa", mode:"android",
      packages:["com.kaitradex.app.dev","com.kaitradex.app"],
      iconUrl:"./assets/app-launcher/kai-trade-x.svg?rev=OFFICIAL_V1",
      iconFallback:"KX"
    },
    {
      key:"kai-trad", title:"KAI TRAD", short:"TRAD", accent:"#55e6a5", mode:"division",
      divisionKey:"trading",
      iconUrl:"https://kai-trad-pwa.ardarawk.workers.dev/kai-trad-logo.png",
      iconFallback:"K",
      webUrl:"https://kai-trad-pwa.ardarawk.workers.dev/"
    },
    {
      key:"am-studio", title:"AM STUDIO", short:"STUDIO", accent:"#c084fc", mode:"division",
      divisionKey:"studio",
      iconUrl:"https://am-studio-pwa.ardarawk.workers.dev/icon.svg",
      iconFallback:"AM",
      webUrl:"https://am-studio-pwa.ardarawk.workers.dev/"
    },
    {
      key:"nadmo-ai", title:"NADMO AI", short:"NADMO", accent:"#8b5cf6", mode:"android",
      packages:["com.nadmo.ai"],
      iconB64Url:"https://raw.githubusercontent.com/ardarawk-cloud/Nadmo-AI/main/assets/nadmo_icon_256.jpg.b64",
      iconFallback:"N"
    },
    {
      key:"kai-casino-x", title:"KAI CASINO X", short:"CASINO", accent:"#fbbf24", mode:"android",
      packages:["com.kai.casinox"],
      iconUrl:"./assets/app-launcher/kai-casino-x.svg?rev=OFFICIAL_V1",
      iconFallback:"KC"
    },
    {
      key:"acc-media", title:"ACC Media", short:"MEDIA", accent:"#fb7185", mode:"android",
      packages:["com.accbuilder.accmediadownloader"],
      iconUrl:"https://raw.githubusercontent.com/ardarawk-cloud/ACC-Builder-Apk/main/apps/acc-media-downloader/icon.svg",
      iconFallback:"M"
    },
    {
      key:"ai-mashup", title:"AI Mashup", short:"MASHUP", accent:"#22d3ee", mode:"android",
      packages:["com.accbuilder.aimashupbootlegstudio"],
      iconUrl:"https://raw.githubusercontent.com/ardarawk-cloud/ACC-Builder-Apk/main/apps/ai-mashup-bootleg-studio/icon.svg",
      iconFallback:"AI"
    },
    {
      key:"acc-content-hub", title:"ACC Content Hub", short:"CONTENT", accent:"#fbbf24", mode:"android",
      packages:["com.acc.contenthub"],
      iconUrl:"./assets/app-launcher/acc-content-hub.svg?rev=OFFICIAL_V1",
      iconFallback:"ACC"
    }
  ];

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  function ensureStyle(){
    let style=document.getElementById(STYLE_ID);
    if(!style){ style=document.createElement("style"); style.id=STYLE_ID; document.head.appendChild(style); }
    style.textContent=`
      #${ROOT_ID}{margin-top:14px;padding:12px 4px 9px!important;border:0!important;background:transparent!important;box-shadow:none!important}
      #${ROOT_ID} .acc-launch-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:0 4px 13px}
      #${ROOT_ID} .acc-launch-head .card-title{font-size:1rem;letter-spacing:.05em}
      #${ROOT_ID} .acc-launch-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:16px 7px!important;align-items:start}
      #${ROOT_ID} .acc-launch-card{appearance:none!important;border:0!important;background:transparent!important;color:var(--text,#f8fafc)!important;padding:3px 1px 6px!important;min-width:0!important;text-align:center!important;border-radius:16px!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;position:relative!important}
      #${ROOT_ID} .acc-launch-card:active{transform:scale(.94);background:color-mix(in srgb,var(--launch-accent) 7%,transparent)!important}
      #${ROOT_ID} .acc-launch-icon{width:min(16.5vw,68px)!important;height:min(16.5vw,68px)!important;min-width:55px!important;min-height:55px!important;margin:0 auto!important;display:grid!important;place-items:center!important;overflow:hidden!important;border-radius:20px!important;border:1px solid color-mix(in srgb,var(--launch-accent) 35%,#25324a)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--launch-accent) 14%,#071023),#050b16)!important;box-shadow:0 9px 22px rgba(0,0,0,.28)!important;position:relative!important}
      #${ROOT_ID} .acc-launch-icon img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;position:relative!important;z-index:1!important}
      #${ROOT_ID} .acc-launch-icon-fallback{position:absolute;inset:0;display:grid;place-items:center;color:var(--launch-accent);font-size:1rem;font-weight:950;letter-spacing:-.03em;z-index:0}
      #${ROOT_ID} .acc-launch-title{margin-top:8px!important;font-size:.69rem!important;font-weight:900!important;line-height:1.15!important;min-height:1.6em!important;overflow:hidden!important;text-overflow:ellipsis!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important}
      #${ROOT_ID} .acc-launch-status{margin-top:4px!important;color:var(--muted,#8390aa)!important;font-size:.5rem!important;font-weight:800!important;letter-spacing:.07em!important}
      #${ROOT_ID} .acc-launch-note{display:none!important}
      .acc-owner-launch-toast{position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:12000;max-width:min(88vw,440px);padding:10px 13px;border:1px solid var(--line2,#40506a);border-radius:12px;background:#071023;color:#f8fafc;font:700 .72rem/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 12px 32px rgba(0,0,0,.4);text-align:center}
      @media(max-width:345px){#${ROOT_ID} .acc-launch-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
      @media(min-width:700px){#${ROOT_ID} .acc-launch-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:18px 12px!important}#${ROOT_ID} .acc-launch-icon{width:74px!important;height:74px!important}#${ROOT_ID} .acc-launch-title{font-size:.75rem!important}}
    `;
  }

  function toast(message){
    document.querySelector(".acc-owner-launch-toast")?.remove();
    const node=document.createElement("div");
    node.className="acc-owner-launch-toast";
    node.textContent=message;
    document.body.appendChild(node);
    setTimeout(()=>node.remove(),2400);
  }

  function divisionUrl(app){
    const state=window.ACCSyncHub?.getState?.() || {};
    return state?.[app.divisionKey]?.manifest?.appUrl || app.webUrl;
  }

  function launchNative(app){
    if(!IS_NATIVE_SHELL){
      toast("Buka dari APK ACC OS X untuk menjalankan aplikasi Android.");
      return;
    }
    const packages=(app.packages || []).filter(Boolean);
    if(!packages.length){ toast("Target APK belum dikonfigurasi."); return; }
    location.href=`accapp://launch?packages=${encodeURIComponent(packages.join(","))}`;
  }

  function launch(app){
    if(!app) return;
    if(app.mode==="android") return launchNative(app);
    const url=app.mode==="division" ? divisionUrl(app) : app.webUrl;
    if(url) location.assign(url);
  }

  async function hydrateB64Icon(img, app){
    if(!img || !app.iconB64Url) return;
    try{
      const response=await fetch(app.iconB64Url,{cache:"force-cache"});
      if(!response.ok) throw new Error("ICON_FETCH_FAILED");
      const b64=(await response.text()).trim();
      if(!b64) throw new Error("ICON_EMPTY");
      img.src=`data:image/jpeg;base64,${b64}`;
    }catch{
      img.style.display="none";
      img.parentElement?.querySelector(".acc-launch-icon-fallback")?.style.setProperty("z-index","1");
    }
  }

  function tile(app){
    const button=document.createElement("button");
    button.type="button";
    button.className="acc-launch-card mono";
    button.dataset.ownerApp=app.key;
    if(app.divisionKey) button.dataset.homeModule=app.divisionKey;
    button.style.setProperty("--launch-accent",app.accent);
    button.setAttribute("aria-label",`Open ${app.title}`);
    const icon=app.iconUrl ? `<img src="${esc(app.iconUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : app.iconB64Url ? `<img alt="" loading="lazy">` : "";
    button.innerHTML=`
      <div class="acc-launch-icon">${icon}<span class="acc-launch-icon-fallback">${esc(app.iconFallback || app.short || app.title.slice(0,2))}</span></div>
      <div class="acc-launch-title">${esc(app.title)}</div>
      <div class="acc-launch-status">${app.mode==="android"?"APK":"WEB / PWA"}</div>
    `;
    const img=button.querySelector("img");
    if(img){
      img.addEventListener("error",()=>{img.style.display="none";button.querySelector(".acc-launch-icon-fallback")?.style.setProperty("z-index","1");},{once:true});
      if(app.iconB64Url) hydrateB64Icon(img,app);
    }
    button.addEventListener("click",event=>{event.preventDefault();launch(app);});
    return button;
  }

  function render(){
    ensureStyle();
    const root=document.getElementById(ROOT_ID);
    if(!root) return false;
    if(root.dataset.ownerLauncherRevision===REVISION) return true;
    root.dataset.ownerLauncherRevision=REVISION;
    root.innerHTML=`
      <div class="acc-launch-head">
        <div><div class="eyebrow">ACC PERSONAL COMMAND</div><h2 class="card-title" style="margin:3px 0 0">MY APPS</h2></div>
        <span class="badge">${APPS.length} APPS</span>
      </div>
      <div class="acc-launch-grid"></div>
    `;
    const grid=root.querySelector(".acc-launch-grid");
    APPS.forEach(app=>grid.appendChild(tile(app)));
    window.ACCSyncHub?.patchCards?.();
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
  const observer=new MutationObserver(()=>{
    const root=document.getElementById(ROOT_ID);
    if(!root || root.dataset.ownerLauncherRevision!==REVISION) schedule();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("pageshow",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.ACCOwnerAppLauncher={revision:REVISION,apps:APPS.map(({key,title,mode,packages,divisionKey})=>({key,title,mode,packages,divisionKey})),render:schedule};
  schedule();
})();
