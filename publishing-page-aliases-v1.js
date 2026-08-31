// KAI ONE — Owner-confirmed Facebook Page alias mapping v4 / Maps V8 cache reset
// Legacy deploy validation marker retained intentionally: KAI_ONE_MY_MAPS_V8_CACHE_RESET
(() => {
  "use strict";
  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const REVISION = "KAI_ONE_OWNER_PAGE_ALIASES_V4_SOCIAL_PAGE_GATEWAY";
  const ALIASES = {
    "ch-arda-gaming": { id:"1296361826889422", name:"Arda Gaming" },
    "ch-mr-laziz": { id:"102412098142218", name:"Mister Laziz" },
    "ch-balinightlife": { id:"100218739134875", name:"Bali Night Life" },
    "ch-bali-wedding-dj": { id:"531554537184461", name:"Bali Wedding Dj" },
    "ch-aku-cinta-malam": { id:"247103353870163", name:"Aku Cinta Malam" }
  };

  function readState(){
    try { const v = JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); return v && typeof v === "object" ? v : {}; }
    catch { return {}; }
  }
  function writeState(state){
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); return true; }
    catch { return false; }
  }
  function reconcile(){
    const state = readState();
    const pages = Array.isArray(state?.settings?.metaPages) ? state.settings.metaPages : [];
    if (!pages.length) return false;
    state.settings = state.settings || {};
    state.settings.publishMappings = state.settings.publishMappings && typeof state.settings.publishMappings === "object" ? state.settings.publishMappings : {};
    let changed = false;
    for (const [channelId, alias] of Object.entries(ALIASES)) {
      const existing = state.settings.publishMappings[channelId];
      if (String(existing?.pageId || "") === alias.id) continue;
      const page = pages.find(item => String(item?.id || "") === alias.id);
      if (!page) continue;
      state.settings.publishMappings[channelId] = {
        connector:"META_FACEBOOK",
        pageId:alias.id,
        pageName:alias.name,
        source:"OWNER_ALIAS_LOCK"
      };
      changed = true;
    }
    if (changed) writeState(state);
    return changed;
  }

  function schedule(){
    setTimeout(reconcile, 80);
    setTimeout(reconcile, 500);
  }
  window.addEventListener("pageshow", schedule);
  window.addEventListener("focus", schedule);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  document.addEventListener("click", event => {
    const action = event.target?.closest?.("[data-action]")?.dataset?.action || "";
    if (["sync-meta-pages","open-channel","module-tab-system"].includes(action)) schedule();
  }, true);
  window.ACCPageAliases = { revision:REVISION, reconcile };
  schedule();
})();

// KAI ONE — full owner app launcher loader. Kept separate from ACC Core registry/publishing logic.
(() => {
  if (document.querySelector('script[data-acc-owner-app-launcher="v2"]')) return;
  const script = document.createElement("script");
  script.src = "./owner-app-launcher-v2.js?rev=KAI_ONE_OWNER_APP_LAUNCHER_V3_OFFICIAL_ICONS_BUILD8";
  script.dataset.accOwnerAppLauncher = "v2";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — owner phone categories. Build 10 shows installed Android apps only.
(() => {
  if (document.querySelector('script[data-acc-owner-phone-launcher="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./owner-phone-launcher-v1.js?rev=KAI_ONE_OWNER_PHONE_LAUNCHER_V2_INSTALLED_ONLY_BUILD10";
  script.dataset.accOwnerPhoneLauncher = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — Bali Wedding DJ native APK tile.
(() => {
  if (document.querySelector('script[data-acc-bali-wedding-dj-launcher="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./bali-wedding-dj-launcher-v1.js?rev=KAI_ONE_BALI_WEDDING_DJ_LAUNCHER_V4_NATIVE_ICON";
  script.dataset.accBaliWeddingDjLauncher = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — SYNC by Krisbow CCTV native APK tile.
(() => {
  if (document.querySelector('script[data-acc-sync-cctv-launcher="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./sync-cctv-launcher-v1.js?rev=KAI_ONE_SYNC_CCTV_LAUNCHER_V1_BUILD8";
  script.dataset.accSyncCctvLauncher = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// Build 8 — mobile publish result stabilization.
(() => {
  if (document.querySelector('script[data-acc-build8-ui="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./build8-ui-stabilization-v1.js?rev=KAI_ONE_BUILD8_UI_V1";
  script.dataset.accBuild8Ui = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// Build 8 — exact-safe Meta Page reconciliation after sync.
(() => {
  if (document.querySelector('script[data-acc-publish-sync-reconcile="v2"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-sync-reconcile-v2.js?rev=KAI_ONE_PUBLISH_SYNC_RECONCILE_V2_BUILD8";
  script.dataset.accPublishSyncReconcile = "v2";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — AI Mashup native APK icon hotfix.
(() => {
  if (document.querySelector('script[data-acc-ai-mashup-icon-fix="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./ai-mashup-icon-fix-v1.js?rev=KAI_ONE_AI_MASHUP_NATIVE_ICON_V2";
  script.dataset.accAiMashupIconFix = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — MY MAPS Build 10 native Android asset renderer with web JPG fallback.
(() => {
  if (document.querySelector('script[data-acc-my-maps="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./my-maps-launcher-v1.js?rev=KAI_ONE_MY_MAPS_V10_NATIVE_ANDROID_ASSET";
  script.dataset.accMyMaps = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — MY PROJECTS ChatGPT launcher.
(() => {
  if (document.querySelector('script[data-acc-my-projects="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./my-projects-launcher-v1.js?rev=KAI_ONE_MY_PROJECTS_V2_VECTOR_ICONS_BUILD8";
  script.dataset.accMyProjects = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — deterministic launcher order + native-first MY MAPS icon fallback.
(() => {
  if (document.querySelector('script[data-acc-launcher-layout-stability="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./launcher-layout-stability-v1.js?rev=KAI_ONE_LAUNCHER_LAYOUT_STABILITY_V1_NATIVE_FIRST";
  script.dataset.accLauncherLayoutStability = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — compact accordion for legacy launcher sections.
(() => {
  if (document.querySelector('script[data-acc-legacy-launcher-accordion="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./legacy-launcher-accordion-v1.js?rev=KAI_ONE_LEGACY_LAUNCHER_ACCORDION_V2_FORCE_DISPLAY";
  script.dataset.accLegacyLauncherAccordion = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — Android-safe Page search + quick diagnostic filter.
(() => {
  if (document.querySelector('script[data-acc-page-search-touch="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-page-search-hotfix-v1.js?rev=KAI_ONE_PAGE_SEARCH_TOUCH_V1";
  script.dataset.accPageSearchTouch = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — guard the IG bridge observer from reacting to its own panel writes.
(() => {
  if (document.querySelector('script[data-acc-instagram-observer-guard="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-instagram-observer-guard-v1.js?rev=KAI_ONE_INSTAGRAM_OBSERVER_GUARD_V1";
  script.dataset.accInstagramObserverGuard = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — Instagram Business/Creator sync + owner-controlled mapping.
(() => {
  if (document.querySelector('script[data-acc-instagram-bridge="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-instagram-bridge-v1.js?rev=KAI_ONE_INSTAGRAM_BRIDGE_V2_SAFE_FALLBACK";
  script.dataset.accInstagramBridge = "v1";
  script.async = false;
  document.head.appendChild(script);
})();
