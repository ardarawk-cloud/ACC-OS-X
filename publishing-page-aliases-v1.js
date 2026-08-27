// KAI ONE — Owner-confirmed Facebook Page alias mapping v1
(() => {
  "use strict";
  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const REVISION = "KAI_ONE_OWNER_PAGE_ALIASES_V1";
  const ALIASES = {
    "ch-arda-gaming": { id:"1296361826889422", name:"Arda Gaming" }
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
