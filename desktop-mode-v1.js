// KAI ONE — ACC OS X DESKTOP MODE v1
// One web core, platform-aware presentation. No Android emulation.
(() => {
  "use strict";
  if (window.__ACC_DESKTOP_MODE_V1__) return;
  window.__ACC_DESKTOP_MODE_V1__ = true;

  const REVISION = "KAI_ONE_DESKTOP_MODE_V1";
  const STYLE_ID = "acc-desktop-mode-v1-style";
  const NATIVE_SHELL = /ACCOSXNative\//i.test(navigator.userAgent || "");
  let desktop = false;

  function detect(){
    const ua = navigator.userAgent || "";
    const mobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const finePointer = Boolean(window.matchMedia?.("(pointer:fine)")?.matches);
    const wide = window.innerWidth >= 900;
    desktop = !NATIVE_SHELL && !mobileUA && (finePointer || wide);

    const root = document.documentElement;
    root.classList.toggle("acc-desktop-mode", desktop);
    root.classList.toggle("acc-android-native", NATIVE_SHELL);
    root.dataset.accPlatform = NATIVE_SHELL ? "ANDROID_NATIVE" : desktop ? "DESKTOP_WEB" : "MOBILE_WEB";
    window.dispatchEvent(new CustomEvent("acc-platform-change",{detail:{desktop,nativeShell:NATIVE_SHELL,platform:root.dataset.accPlatform,revision:REVISION}}));
  }

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      html.acc-desktop-mode body{min-width:760px}
      html.acc-desktop-mode .main{max-width:1600px;padding:18px 24px 90px}
      html.acc-desktop-mode .header{max-width:1552px;margin:18px auto 0;padding:20px 22px}
      html.acc-desktop-mode .tabs{max-width:1552px;margin:12px auto 0;padding:8px}
      html.acc-desktop-mode .tab,
      html.acc-desktop-mode .subtab,
      html.acc-desktop-mode .module-tab,
      html.acc-desktop-mode .btn,
      html.acc-desktop-mode .acc-launch-card{transition:transform .12s ease,border-color .12s ease,background-color .12s ease,box-shadow .12s ease}
      html.acc-desktop-mode .tab:hover,
      html.acc-desktop-mode .subtab:hover,
      html.acc-desktop-mode .module-tab:hover,
      html.acc-desktop-mode .btn:not(:disabled):hover{transform:translateY(-1px);border-color:var(--accent,#a855f7)}
      html.acc-desktop-mode .acc-launch-grid{grid-template-columns:repeat(8,minmax(0,1fr))!important;gap:20px 14px!important}
      html.acc-desktop-mode .acc-launch-card:hover{transform:translateY(-3px);background:rgba(255,255,255,.025)}
      html.acc-desktop-mode .acc-launch-icon{width:78px!important;height:78px!important;min-width:78px!important;min-height:78px!important;border-radius:22px!important}
      html.acc-desktop-mode .acc-launch-title{font-size:.76rem!important}
      html.acc-desktop-mode .acc-launch-card[data-desktop-availability="ANDROID_ONLY"]{opacity:.62}
      html.acc-desktop-mode .acc-launch-card[data-desktop-availability="ANDROID_ONLY"]:hover{transform:none;background:rgba(255,255,255,.015)}
      html.acc-desktop-mode .acc-launch-card[data-desktop-availability="ANDROID_ONLY"] .acc-launch-kind{color:#fbbf24!important}
      html.acc-desktop-mode .select-grid{grid-template-columns:1.5fr 1.35fr .75fr}
      html.acc-desktop-mode .ai-console{width:min(44vw,620px)}
      @media(min-width:1200px){
        html.acc-desktop-mode .cards{grid-template-columns:repeat(3,minmax(0,1fr))}
        html.acc-desktop-mode .worker-grid,
        html.acc-desktop-mode .module-grid,
        html.acc-desktop-mode .health-grid,
        html.acc-desktop-mode .badge-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      }
    `;
    document.head.appendChild(style);
  }

  let resizeTimer=0;
  window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(detect,120);});
  window.addEventListener("pageshow",detect);
  ensureStyle();
  detect();

  window.ACCPlatform = Object.freeze({
    revision: REVISION,
    get isDesktop(){ return desktop; },
    get isNativeAndroid(){ return NATIVE_SHELL; },
    get mode(){ return NATIVE_SHELL ? "ANDROID_NATIVE" : desktop ? "DESKTOP_WEB" : "MOBILE_WEB"; }
  });
})();
