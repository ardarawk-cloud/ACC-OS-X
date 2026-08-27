// KAI ONE — ACC OS X Owner App Launcher v2
// One ACC OS X entry point for the owner's existing ACC apps. ACC OS X itself is intentionally excluded.
(() => {
  "use strict";

  const REVISION = "KAI_ONE_OWNER_APP_LAUNCHER_V2";
  const ROOT_ID = "acc-home-launchpad";
  const STYLE_ID = "acc-owner-app-launcher-v2-style";

  const APPS = [
    {
      key:"acc-cleaner", title:"ACC Cleaner", short:"CLEANER", accent:"#38bdf8", mode:"android",
      packageId:"com.acc.cleaner",
      iconFallback:"CL",
      fallbackUrl:"https://github.com/balinightlife666-web/ACC-Cleaner"
    },
    {
      key:"acc-dj", title:"ACC DJ", short:"DJ", accent:"#f8fafc", mode:"source",
      iconUrl:"https://raw.githubusercontent.com/balinightlife666-web/DJ-AM/main/icon-512.png",
      iconFallback:"DJ",
      fallbackUrl:"https://github.com/balinightlife666-web/DJ-AM"
    },
    {
      key:"entego", title:"ENTEGO", short:"ENTEGO", accent:"#22d3ee", mode:"division",
      divisionKey:"entego",
      iconUrl:"https://entego-pwa.ardarawk.workers.dev/icon-512.png?v=79",
      iconFallback:"E",
      fallbackUrl:"https://entego-pwa.ardarawk.workers.dev/"
    },
    {
      key:"kai-trade-x", title:"KAI TRADE X", short:"TRADE X", accent:"#60a5fa", mode:"android",
      packageId:"com.kaitradex.app.dev",
      iconFallback:"KX",
      fallbackUrl:"https://github.com/ardarawk-cloud/KAI-TRADE-X"
    },
    {
      key:"kai-trad", title:"KAI TRAD", short:"TRAD", accent:"#55e6a5", mode:"division",
      divisionKey:"trading",
      iconUrl:"https://kai-trad-pwa.ardarawk.workers.dev/kai-trad-logo.png",
      iconFallback:"K",
      fallbackUrl:"https://kai-trad-pwa.ardarawk.workers.dev/"
    },
    {
      key:"am-studio", title:"AM STUDIO", short:"STUDIO", accent:"#c084fc", mode:"division",
      divisionKey:"studio",
      iconUrl:"https://am-studio-pwa.ardarawk.workers.dev/icon.svg",
      iconFallback:"AM",
      fallbackUrl:"https://am-studio-pwa.ardarawk.workers.dev/"
    },
    {
      key:"nadmo-ai", title:"NADMO AI", short:"NADMO", accent:"#8b5cf6", mode:"android",
      packageId:"com.nadmo.ai",
      iconFallback:"N",
      fallbackUrl:"https://github.com/ardarawk-cloud/Nadmo-AI"
    },
    {
      key:"kai-casino-x", title:"KAI CASINO X", short:"CASINO", accent:"#fbbf24", mode:"android",
      packageId:"com.kai.casinox",
      iconFallback:"K",
      fallbackUrl:"https://github.com/ardarawk-cloud/kai-casino-x"
    },
    {
      key:"acc-media", title:"ACC Media Downloader", short:"MEDIA", accent:"#fb7185", mode:"android",
      packageId:"com.accbuilder.accmediadownloader",
      iconUrl:"https://raw.githubusercontent.com/ardarawk-cloud/ACC-Builder-Apk/main/apps/acc-media-downloader/icon.svg",
      iconFallback:"M",
      fallbackUrl:"https://github.com/ardarawk-cloud/ACC-Builder-Apk/tree/main/apps/acc-media-downloader"
    },
    {
      key:"ai-mashup", title:"AI Mashup", short:"MASHUP", accent:"#22d3ee", mode:"android",
      packageId:"com.accbuilder.aimashupbootlegstudio",
      iconUrl:"https://raw.githubusercontent.com/ardarawk-cloud/ACC-Builder-Apk/main/apps/ai-mashup-bootleg-studio/icon.svg",
      iconFallback:"AI",
      fallbackUrl:"https://github.com/ardarawk-cloud/ACC-Builder-Apk/tree/main/apps/ai-mashup-bootleg-studio"
    },
    {
      key:"acc-content-hub", title:"ACC Content Hub", short:"CONTENT", accent:"#fbbf24", mode:"android",
      packageId:"com.acc.contenthub",
      iconFallback:"ACC",
      fallbackUrl:"https://github.com/ardarawk-cloud/ACC-Content-Hub"
    }
  ];

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      #${ROOT_ID}{margin-top:18px;padding:16px 8px 10px;border-radius:20px;border:1px solid var(--line,#25324a);background:color-mix(in srgb,var(--panel,#10192d) 50%,transparent)}
      #${ROOT_ID} .acc-launch-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 6px 14px}
      #${ROOT_ID} .acc-launch-head .card-title{font-size:.95rem;letter-spacing:.05em}
      #${ROOT_ID} .acc-launch-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:16px 5px!important;align-items:start}
      #${ROOT_ID} .acc-launch-card{appearance:none!important;border:0!important;background:transparent!important;color:var(--text,#f8fafc)!important;padding:4px 1px 8px!important;min-width:0!important;min-height:112px!important;text-align:center!important;border-radius:16px!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;position:relative!important}
      #${ROOT_ID} .acc-launch-card:active{transform:scale(.95);background:color-mix(in srgb,var(--launch-accent) 8%,transparent)!important}
      #${ROOT_ID} .acc-launch-icon{width:64px!important;height:64px!important;margin:0 auto!important;display:grid!important;place-items:center!important;overflow:hidden!important;border-radius:19px!important;border:1px solid color-mix(in srgb,var(--launch-accent) 42%,var(--line,#25324a))!important;background:linear-gradient(145deg,color-mix(in srgb,var(--launch-accent) 14%,#071023),#071023)!important;box-shadow:0 9px 20px rgba(0,0,0,.25)!important;position:relative!important}
      #${ROOT_ID} .acc-launch-icon img{width:100%!important;height:100%!important;object-fit:cover!important;display:block}
      #${ROOT_ID} .acc-launch-icon-fallback{position:absolute;inset:0;display:grid;place-items:center;color:var(--launch-accent);font-size:1.08rem;font-weight:950;letter-spacing:-.04em;z-index:0}
      #${ROOT_ID} .acc-launch-title{margin-top:8px!important;font-size:.68rem!important;font-weight:900!important;line-height:1.18!important;letter-spacing:.005em!important;overflow:hidden!important;text-overflow:ellipsis!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;word-break:break-word}
      #${ROOT_ID} .acc-launch-status{margin-top:4px!important;font-size:.52rem!important;color:var(--muted,#8390aa)!important;line-height:1!important;display:block!important}
      #${ROOT_ID} .acc-launch-card>.eyebrow,#${ROOT_ID} .acc-launch-card>.acc-launch-desc,#${ROOT_ID} .acc-launch-card>.acc-launch-foot,#${ROOT_ID} .acc-launch-card>.acc-sync-line{display:none!important}
      #${ROOT_ID} .acc-launch-note{margin:2px 6px 0;color:var(--muted,#8390aa);font-size:.62rem;line-height:1.4;text-align:center}
      .acc-owner-launch-toast{position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:12000;max-width:min(88vw,440px);padding:10px 13px;border:1px solid var(--line2,#40506a);border-radius:12px;background:#071023;color:#f8fafc;font:700 .72rem/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;box-shadow:0 12px 32px rgba(0,0,0,.4);text-align:center}
      @media(max-width:360px){#${ROOT_ID} .acc-launch-icon{width:58px!important;height:58px!important;border-radius:17px!important}#${ROOT_ID} .acc-launch-grid{gap:14px 2px!important}#${ROOT_ID} .acc-launch-title{font-size:.62rem!important}}
      @media(min-width:760px){#${ROOT_ID} .acc-launch-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important}#${ROOT_ID} .acc-launch-icon{width:72px!important;height:72px!important}}
    `;
    document.head.appendChild(style);
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
    return state?.[app.divisionKey]?.manifest?.appUrl || app.fallbackUrl;
  }

  function androidIntent(app){
    const fallback=encodeURIComponent(app.fallbackUrl || location.href);
    return `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${app.packageId};S.browser_fallback_url=${fallback};end`;
  }

  function launch(app){
    if(!app) return;
    if(app.mode==="division"){
      location.assign(divisionUrl(app));
      return;
    }
    if(app.mode==="android"){
      // Future/native ACC OS X shell can expose a direct package bridge. Browser/PWA falls back to Android intent syntax.
      if(window.ACCNativeLauncher?.openPackage){
        try{ window.ACCNativeLauncher.openPackage(app.packageId); return; }catch{}
      }
      location.href=androidIntent(app);
      return;
    }
    // ACC DJ has a verified source/PWA project but no locked public deployment/package target in the current registry.
    toast("ACC DJ target belum terkunci — membuka source project sementara.");
    setTimeout(()=>location.assign(app.fallbackUrl),120);
  }

  function tile(app){
    const button=document.createElement("button");
    button.type="button";
    button.className="acc-launch-card mono";
    button.dataset.ownerApp=app.key;
    if(app.divisionKey) button.dataset.homeModule=app.divisionKey;
    button.style.setProperty("--launch-accent",app.accent);
    button.setAttribute("aria-label",`Open ${app.title}`);
    const icon=app.iconUrl ? `<img src="${esc(app.iconUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : "";
    button.innerHTML=`
      <div class="acc-launch-icon">${icon}<span class="acc-launch-icon-fallback">${esc(app.iconFallback || app.short || app.title.slice(0,2))}</span></div>
      <div class="acc-launch-title">${esc(app.title)}</div>
      <div class="acc-launch-status">${app.mode==="android"?"APK":app.mode==="division"?"WEB":"LINK"}</div>
      <div class="eyebrow"></div><div class="acc-launch-desc"></div><div class="acc-launch-foot"><span class="badge"></span></div>
    `;
    const img=button.querySelector("img");
    if(img) img.addEventListener("error",()=>{img.style.display="none";button.querySelector(".acc-launch-icon-fallback")?.style.setProperty("z-index","1");},{once:true});
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
        <div><div class="eyebrow">ACC PERSONAL COMMAND</div><h2 class="card-title" style="margin:3px 0 0">OWNER APP LAUNCHER</h2></div>
        <span class="badge">${APPS.length} APPS</span>
      </div>
      <div class="acc-launch-grid"></div>
      <div class="acc-launch-note">ACC OS X tidak ditampilkan di dalam launcher. Ini adalah pintu masuk utamanya.</div>
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
  window.ACCOwnerAppLauncher={revision:REVISION,apps:APPS.map(({key,title,mode,packageId,divisionKey})=>({key,title,mode,packageId,divisionKey})),render:schedule};
  schedule();
})();
