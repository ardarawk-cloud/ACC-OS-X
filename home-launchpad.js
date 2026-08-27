// ACC OS X — OWNER APP LAUNCHPAD v5
// One front door for Arda's ACC phone apps. ACC OS X itself is intentionally excluded.
(() => {
  "use strict";

  const STYLE_ID = "acc-home-launchpad-style";
  const LAUNCHPAD_ID = "acc-home-launchpad";
  const IS_NATIVE_SHELL = /ACCOSXNative\//i.test(navigator.userAgent || "");

  const apps = [
    {key:"cleaner", title:"ACC Cleaner", accent:"#38bdf8", fallback:"CLN", native:["com.acc.cleaner"]},
    {key:"dj", title:"ACC DJ", accent:"#f8fafc", fallback:"DJ", icon:"https://raw.githubusercontent.com/balinightlife666-web/DJ-AM/main/icon-192.png", web:"https://balinightlife666-web.github.io/DJ-AM/"},
    {key:"entego", title:"ENTEGO", accent:"#ff7a18", fallback:"E", icon:"https://entego-pwa.ardarawk.workers.dev/icon-512.png?v=79", web:"https://entego-pwa.ardarawk.workers.dev/", syncKey:"entego"},
    {key:"trade-x", title:"KAI TRADE X", accent:"#55d7ff", fallback:"KX", native:["com.kaitradex.app.dev","com.kaitradex.app"]},
    {key:"trad", title:"KAI TRAD", accent:"#60a5fa", fallback:"K", icon:"https://kai-trad-pwa.ardarawk.workers.dev/kai-trad-logo.png", web:"https://kai-trad-pwa.ardarawk.workers.dev/", syncKey:"trading"},
    {key:"studio", title:"AM STUDIO", accent:"#ef4444", fallback:"AM", icon:"https://am-studio-pwa.ardarawk.workers.dev/icon.svg", web:"https://am-studio-pwa.ardarawk.workers.dev/", syncKey:"studio"},
    {key:"nadmo", title:"NADMO AI", accent:"#22d3ee", fallback:"N", native:["com.nadmo.ai"]},
    {key:"casino", title:"KAI CASINO X", accent:"#facc15", fallback:"KC", native:["com.kai.casinox"]},
    {key:"media", title:"ACC Media", accent:"#ff2d55", fallback:"M", icon:"https://raw.githubusercontent.com/ardarawk-cloud/ACC-Builder-Apk/main/apps/acc-media-downloader/icon.svg", native:["com.accbuilder.accmediadownloader"]},
    {key:"mashup", title:"AI Mashup", accent:"#a855f7", fallback:"AI", icon:"https://raw.githubusercontent.com/ardarawk-cloud/ACC-Builder-Apk/main/apps/ai-mashup-bootleg-studio/icon.svg", native:["com.accbuilder.aimashupbootlegstudio"]},
    {key:"content", title:"ACC Content Hub", accent:"#fbbf24", fallback:"ACC", native:["com.acc.contenthub"]}
  ];

  function ensureStyle(){
    let style=document.getElementById(STYLE_ID);
    if(!style){style=document.createElement("style");style.id=STYLE_ID;document.head.appendChild(style);}
    style.textContent=`
      .acc-home-launchpad{margin-top:14px;padding:12px 4px 8px;background:transparent!important;border:0!important;box-shadow:none!important}
      .acc-launch-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin:0 3px 13px}
      .acc-launch-head .card-title{font-size:1rem;letter-spacing:.04em}
      .acc-launch-head .muted{display:none}
      .acc-launch-head .badge{min-height:24px;padding:3px 8px;font-size:.6rem}
      .acc-launch-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px 7px;align-items:start}
      .acc-launch-card{appearance:none;border:0;background:transparent;color:var(--text,#f8fafc);padding:3px 1px 5px;min-width:0;text-align:center;border-radius:16px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .acc-launch-card:active{transform:scale(.94);background:color-mix(in srgb,var(--launch-accent) 7%,transparent)}
      .acc-launch-icon{position:relative;width:min(16.5vw,68px);height:min(16.5vw,68px);min-width:55px;min-height:55px;margin:0 auto;display:grid;place-items:center;overflow:hidden;border-radius:20px;border:1px solid color-mix(in srgb,var(--launch-accent) 35%,#25324a);background:linear-gradient(145deg,color-mix(in srgb,var(--launch-accent) 14%,#071023),#050b16);box-shadow:0 9px 22px rgba(0,0,0,.28)}
      .acc-launch-icon img{width:100%;height:100%;object-fit:cover;display:block;position:relative;z-index:1}
      .acc-launch-icon-fallback{position:absolute;inset:0;display:grid;place-items:center;color:var(--launch-accent);font-size:1rem;font-weight:950;letter-spacing:-.03em;z-index:0}
      .acc-launch-title{margin-top:8px;font-size:.69rem;font-weight:900;line-height:1.15;min-height:1.6em;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
      .acc-launch-kind{margin-top:4px;color:var(--muted,#8390aa);font-size:.5rem;font-weight:800;letter-spacing:.07em}
      @media(min-width:700px){.acc-launch-grid{grid-template-columns:repeat(6,minmax(0,1fr));gap:18px 12px}.acc-launch-icon{width:74px;height:74px}.acc-launch-title{font-size:.75rem}}
      @media(max-width:345px){.acc-launch-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    `;
  }

  function notifyNativeShell(){
    const msg="APK native dibuka lewat ACC OS X Android Shell. Pasang/update ACC OS X Shell agar launcher APK aktif.";
    if(typeof window.showToast==="function") window.showToast(msg); else alert(msg);
  }

  async function launch(app){
    if(app.native?.length){
      if(!IS_NATIVE_SHELL){notifyNativeShell();return;}
      const q=encodeURIComponent(app.native.join(","));
      window.location.href=`accapp://launch?packages=${q}`;
      return;
    }

    let url=app.web;
    if(app.syncKey){
      try{
        if(window.ACCSyncHub?.refresh){
          await Promise.race([window.ACCSyncHub.refresh(),new Promise(r=>setTimeout(r,700))]);
        }
        url=window.ACCSyncHub?.getState?.()?.[app.syncKey]?.manifest?.appUrl || url;
      }catch{}
    }
    if(url) window.location.assign(url);
  }

  function appCard(app){
    const button=document.createElement("button");
    button.type="button";
    button.className="acc-launch-card mono";
    button.dataset.ownerApp=app.key;
    button.style.setProperty("--launch-accent",app.accent);
    button.setAttribute("aria-label",`Open ${app.title}`);
    button.innerHTML=`
      <div class="acc-launch-icon">
        ${app.icon?`<img src="${app.icon}" alt="" loading="lazy" referrerpolicy="no-referrer">`:""}
        <span class="acc-launch-icon-fallback">${app.fallback}</span>
      </div>
      <div class="acc-launch-title">${app.title}</div>
      <div class="acc-launch-kind">${app.native?.length?"APK":"WEB / PWA"}</div>`;
    const img=button.querySelector("img");
    img?.addEventListener("error",()=>{img.style.display="none";},{once:true});
    button.addEventListener("click",()=>launch(app));
    return button;
  }

  function buildLaunchpad(){
    const box=document.createElement("div");
    box.id=LAUNCHPAD_ID;
    box.className="acc-home-launchpad mono";
    box.innerHTML=`<div class="acc-launch-head"><div><div class="eyebrow">ACC PERSONAL COMMAND</div><h2 class="card-title" style="margin-top:3px">MY APPS</h2></div><span class="badge">${apps.length} APPS</span></div><div class="acc-launch-grid"></div>`;
    const grid=box.querySelector(".acc-launch-grid");
    apps.forEach(app=>grid.appendChild(appCard(app)));
    return box;
  }

  function patchHome(){
    ensureStyle();
    const hero=document.querySelector(".acc250-hero");
    if(!hero)return;
    const section=hero.closest("section");
    if(!section)return;
    const registryButton=section.querySelector('button[data-action="module-tab-system"][data-value="registry"]');
    if(registryButton)registryButton.parentElement?.remove();
    [...section.querySelectorAll(".card")].forEach(card=>{const eyebrow=card.querySelector(".eyebrow");if(eyebrow&&eyebrow.textContent.trim().toUpperCase()==="CLASSIFICATION POLICY")card.remove();});
    section.querySelector(".grid.stats")?.remove();
    document.getElementById(LAUNCHPAD_ID)?.remove();
    hero.insertAdjacentElement("afterend",buildLaunchpad());
    window.ACCSyncHub?.patchCards?.();
  }

  let queued=false;
  const schedule=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;patchHome();});};
  const observer=new MutationObserver(()=>{if(!document.getElementById(LAUNCHPAD_ID))schedule();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  schedule();
})();

(() => {
  if (document.querySelector('script[data-acc-sync-hub="v2"]')) return;
  const script = document.createElement("script");
  script.src = "./division-sync-hub-v2.js";
  script.dataset.accSyncHub = "v2";
  script.async = true;
  document.head.appendChild(script);
})();

// BUILD 253 — versioned Studio Poster Renderer + KAI Creative Client bridge.
(() => {
  const current = document.querySelector('script[data-acc-studio-poster]');
  if (!current || current.dataset.accStudioPoster !== "v2.53") {
    if (current) current.remove();
    const renderer = document.createElement("script");
    renderer.src = "./poster-studio-v1.js?rev=BUILD253_KAI_CREATIVE";
    renderer.dataset.accStudioPoster = "v2.53";
    renderer.async = false;
    document.head.appendChild(renderer);
  }

  if (!document.querySelector('script[data-acc-kai-creative="v1"]')) {
    const bridge = document.createElement("script");
    bridge.src = "./kai-creative-client.js?rev=BUILD253_KAI_CREATIVE_CLIENT_V1";
    bridge.dataset.accKaiCreative = "v1";
    bridge.async = false;
    document.head.appendChild(bridge);
  }
})();

// PWA OWNER SAFETY v1 — presentation/sound/brand convenience only.
(() => {
  if (document.querySelector('script[data-acc-owner-safety="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./pwa-owner-safety-v1.js?rev=PWA_OWNER_SAFETY_V1";
  script.dataset.accOwnerSafety = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// BUILD 257 — release identity bridge. Keeps installed PWA identity and data schema stable.
(() => {
  if (document.querySelector('script[data-acc-release="v257"]')) return;
  const script = document.createElement("script");
  script.src = "./release-version-v257.js?rev=BUILD257_AUTONOMOUS_QUALITY_RECOVERY";
  script.dataset.accRelease = "v257";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — Publishing Hub unmatched Meta Page diagnostic (read-only).
(() => {
  if (document.querySelector('script[data-acc-meta-diagnostic="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-unmatched-meta-diagnostic-v1.js?rev=KAI_ONE_META_DIAGNOSTIC_V1";
  script.dataset.accMetaDiagnostic = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — Android/WebView tap-safe Meta Page picker.
(() => {
  if (document.querySelector('script[data-acc-mobile-page-picker="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-mobile-page-picker-v1.js?rev=KAI_ONE_MOBILE_PAGE_PICKER_V1";
  script.dataset.accMobilePagePicker = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — owner-confirmed Page aliases.
(() => {
  if (document.querySelector('script[data-acc-page-aliases="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-page-aliases-v1.js?rev=KAI_ONE_OWNER_PAGE_ALIASES_V1";
  script.dataset.accPageAliases = "v1";
  script.async = false;
  document.head.appendChild(script);
})();
