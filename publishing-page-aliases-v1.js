// KAI ONE — Owner-confirmed Facebook Page alias mapping v4 / Maps V17 loader / Projects V3 loader
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

(() => {
  if (document.querySelector('script[data-acc-owner-app-launcher="v2"]')) return;
  const script = document.createElement("script");
  script.src = "./owner-app-launcher-v2.js?rev=KAI_ONE_OWNER_APP_LAUNCHER_V3_OFFICIAL_ICONS_BUILD8";
  script.dataset.accOwnerAppLauncher = "v2";
  script.async = false;
  document.head.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-acc-owner-phone-launcher="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./owner-phone-launcher-v1.js?rev=KAI_ONE_OWNER_PHONE_LAUNCHER_V2_INSTALLED_ONLY_BUILD10";
  script.dataset.accOwnerPhoneLauncher = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-acc-bali-wedding-dj-launcher="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./bali-wedding-dj-launcher-v1.js?rev=KAI_ONE_BALI_WEDDING_DJ_LAUNCHER_V4_NATIVE_ICON";
  script.dataset.accBaliWeddingDjLauncher = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-acc-sync-cctv-launcher="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./sync-cctv-launcher-v1.js?rev=KAI_ONE_SYNC_CCTV_LAUNCHER_V1_BUILD8";
  script.dataset.accSyncCctvLauncher = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-acc-build8-ui="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./build8-ui-stabilization-v1.js?rev=KAI_ONE_BUILD8_UI_V1";
  script.dataset.accBuild8Ui = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-acc-publish-sync-reconcile="v2"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-sync-reconcile-v2.js?rev=KAI_ONE_PUBLISH_SYNC_RECONCILE_V2_BUILD8";
  script.dataset.accPublishSyncReconcile = "v2";
  script.async = false;
  document.head.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-acc-ai-mashup-icon-fix="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./ai-mashup-icon-fix-v1.js?rev=KAI_ONE_AI_MASHUP_NATIVE_ICON_V2";
  script.dataset.accAiMashupIconFix = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — MY MAPS V17 authoritative loader.
(() => {
  if (document.querySelector('script[data-acc-my-maps="v17"]')) return;
  const old = document.querySelector('script[data-acc-my-maps]');
  if (old) old.remove();
  const script = document.createElement("script");
  script.src = "./my-maps-launcher-v1.js?rev=KAI_ONE_MY_MAPS_V17_ROBLOX_ICON_PROXY";
  script.dataset.accMyMaps = "v17";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — MY PROJECTS V3 authoritative loader.
(() => {
  if (document.querySelector('script[data-acc-my-projects="v3"]')) return;
  const old = document.querySelector('script[data-acc-my-projects]');
  if (old) old.remove();
  const script = document.createElement("script");
  script.src = "./my-projects-launcher-v1.js?rev=KAI_ONE_MY_PROJECTS_V3_MAP_ORDER";
  script.dataset.accMyProjects = "v3";
  script.async = false;
  document.head.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-acc-launcher-layout-stability="v4"]')) return;
  const old = document.querySelector('script[data-acc-launcher-layout-stability]');
  if (old) old.remove();
  const script = document.createElement("script");
  script.src = "./launcher-layout-stability-v1.js?rev=KAI_ONE_LAUNCHER_LAYOUT_STABILITY_V4_ORDER_ONLY";
  script.dataset.accLauncherLayoutStability = "v4";
  script.async = false;
  document.head.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-acc-legacy-launcher-accordion="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./legacy-launcher-accordion-v1.js?rev=KAI_ONE_LEGACY_LAUNCHER_ACCORDION_V2_FORCE_DISPLAY";
  script.dataset.accLegacyLauncherAccordion = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-acc-page-search-touch="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-page-search-hotfix-v1.js?rev=KAI_ONE_PAGE_SEARCH_TOUCH_V1";
  script.dataset.accPageSearchTouch = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-acc-instagram-observer-guard="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-instagram-observer-guard-v1.js?rev=KAI_ONE_INSTAGRAM_OBSERVER_GUARD_V1";
  script.dataset.accInstagramObserverGuard = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

(() => {
  if (document.querySelector('script[data-acc-instagram-bridge="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-instagram-bridge-v1.js?rev=KAI_ONE_INSTAGRAM_BRIDGE_V2_SAFE_FALLBACK";
  script.dataset.accInstagramBridge = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — direct Facebook Page mode for CH-102/103/104.
// Loaded after the Instagram safety wrapper so these owner-converted channels
// are rewritten to META_FACEBOOK without weakening safety for any real IG target.
(() => {
  if (document.querySelector('script[data-acc-social-page-mode="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-social-page-mode-v1.js?rev=KAI_ONE_SOCIAL_PAGE_MODE_V1_DIRECT_FACEBOOK";
  script.dataset.accSocialPageMode = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — Publishing Hub stat repaint fix v2.
// The canonical stat component is .card.compact + .stat-label + .stat-value.
// Runtime evidence confirmed Page mappings were correct; only these displayed
// counters remained stale because v1 targeted non-existent .stat/strong nodes.
(() => {
  "use strict";
  if (window.__ACC_SOCIAL_PAGE_STAT_REPAINT_V2__) return;
  window.__ACC_SOCIAL_PAGE_STAT_REPAINT_V2__ = true;
  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const REVISION = "KAI_ONE_SOCIAL_PAGE_STAT_REPAINT_V2_DOM_SELECTORS";
  const STAT_LABELS = [
    "FB CHANNELS","FB MAPPED","IG CHANNELS","IG READY",
    "PAGES FOUND","TOTAL CHANNELS","TARGETS READY","ACTION NEEDED"
  ];

  const readState = () => {
    try { const v = JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); return v && typeof v === "object" ? v : {}; }
    catch { return {}; }
  };

  const setText = (node, value) => {
    const next = String(value ?? "");
    if (node && node.textContent !== next) node.textContent = next;
  };

  function repaint() {
    const heading = [...document.querySelectorAll("h1,h2,h3")].find(node => node.textContent?.trim() === "PUBLISHING HUB");
    const hubCard = heading?.closest?.(".card");
    const buttons = [...document.querySelectorAll('[data-action="open-channel"][data-channel]')];
    if (!hubCard || !buttons.length) return false;

    const state = readState();
    const mappings = state?.settings?.publishMappings && typeof state.settings.publishMappings === "object" ? state.settings.publishMappings : {};
    const pages = Array.isArray(state?.settings?.metaPages) ? state.settings.metaPages : [];
    let fbChannels = 0, igChannels = 0, fbMapped = 0, igMapped = 0;

    for (const button of buttons) {
      const id = String(button.dataset.channel || "");
      const platformText = String(button.querySelector(".eyebrow")?.textContent || "").toLowerCase();
      const isIg = platformText.includes("instagram");
      const mapping = mappings[id] || null;
      if (isIg) {
        igChannels += 1;
        if (mapping?.instagramAccountId) igMapped += 1;
      } else {
        fbChannels += 1;
        if (mapping?.pageId) fbMapped += 1;
      }
    }

    const total = buttons.length;
    const mapped = fbMapped + igMapped;
    const values = [fbChannels, fbMapped, igChannels, igMapped, pages.length, total, mapped, Math.max(0, total - mapped)];
    const statValues = new Map();
    for (const card of hubCard.querySelectorAll(".card.compact")) {
      const label = card.querySelector(".stat-label")?.textContent?.trim();
      const valueNode = card.querySelector(".stat-value");
      if (label && valueNode) statValues.set(label, valueNode);
    }
    STAT_LABELS.forEach((label, index) => setText(statValues.get(label), values[index]));
    setText(hubCard.querySelector(".badge"), `${mapped}/${total} TARGETS READY`);
    document.documentElement.dataset.accSocialPageStats = REVISION;
    return true;
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; repaint(); });
    setTimeout(repaint, 180);
    setTimeout(repaint, 700);
  }

  new MutationObserver(schedule).observe(document.documentElement, {childList:true,subtree:true});
  window.addEventListener("pageshow", schedule);
  window.addEventListener("focus", schedule);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  document.addEventListener("click", event => {
    if (event.target?.closest?.('[data-action="sync-meta-pages"], [data-action="module-tab-system"], [data-action="open-channel"]')) schedule();
  }, true);
  window.ACCSocialPageStatRepaint = Object.freeze({revision:REVISION,repaint:schedule});
  schedule();
})();
