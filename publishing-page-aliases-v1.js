// KAI ONE — Owner-confirmed Facebook Page alias mapping v2 / Build 8
(() => {
  "use strict";
  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const REVISION = "KAI_ONE_OWNER_PAGE_ALIASES_V2_BUILD8";
  const ALIASES = {
    "ch-arda-gaming": { id:"1296361826889422", name:"Arda Gaming" },
    "ch-mr-laziz": { id:"102412098142218", name:"Mister Laziz" }
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
      if (existing?.pageId) continue;
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

// KAI ONE — owner phone categories. Uses native installed-app icon bridge on Build 9+.
(() => {
  if (document.querySelector('script[data-acc-owner-phone-launcher="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./owner-phone-launcher-v1.js?rev=KAI_ONE_OWNER_PHONE_LAUNCHER_V1_BUILD9";
  script.dataset.accOwnerPhoneLauncher = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — Bali Wedding DJ native APK tile.
(() => {
  if (document.querySelector('script[data-acc-bali-wedding-dj-launcher="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./bali-wedding-dj-launcher-v1.js?rev=KAI_ONE_BALI_WEDDING_DJ_LAUNCHER_V2_BUILD8";
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

// KAI ONE — local AI Mashup icon hotfix.
(() => {
  if (document.querySelector('script[data-acc-ai-mashup-icon-fix="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./ai-mashup-icon-fix-v1.js?rev=KAI_ONE_AI_MASHUP_LOCAL_ICON_V1_BUILD8";
  script.dataset.accAiMashupIconFix = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — MY MAPS Roblox launcher using validated local sprite.
(() => {
  if (document.querySelector('script[data-acc-my-maps="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./my-maps-launcher-v1.js?rev=KAI_ONE_MY_MAPS_V4_VALID_SPRITE_BUILD8";
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
