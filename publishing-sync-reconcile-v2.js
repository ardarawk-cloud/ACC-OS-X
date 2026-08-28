// KAI ONE — Publishing sync reconcile v2
// Auto-links only owner-confirmed Page IDs or unique exact-name matches from the current Meta sync.
(() => {
  "use strict";
  if (window.__ACC_PUBLISH_SYNC_RECONCILE_V2__) return;
  window.__ACC_PUBLISH_SYNC_RECONCILE_V2__ = true;

  const REVISION = "KAI_ONE_PUBLISH_SYNC_RECONCILE_V2_BUILD8";
  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const EXCLUDED_CHANNELS = new Set([
    "ch-ardmrn-insight",
    "ch-ark-garage"
  ]);
  const CONFIRMED = {
    "ch-arda-gaming": { id:"1296361826889422", name:"Arda Gaming" },
    "ch-mr-laziz": { id:"102412098142218", name:"Mister Laziz" }
  };

  const text = value => String(value ?? "").trim();
  const normalize = value => text(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function publishingSection() {
    return [...document.querySelectorAll("section.section")].find(section =>
      section.querySelector("h2.card-title")?.textContent?.trim().toUpperCase() === "PUBLISHING HUB"
    ) || null;
  }

  function facebookRows(section) {
    if (!section) return [];
    return [...section.querySelectorAll('button.item[data-action="open-channel"][data-channel]')]
      .map(item => {
        const eyebrow = text(item.querySelector(".eyebrow")?.textContent);
        const name = text(item.querySelector(".item-title")?.textContent);
        const status = text(item.querySelector(".status")?.textContent).toUpperCase();
        return {
          channelId:text(item.dataset.channel),
          name,
          eyebrow,
          status
        };
      })
      .filter(row => row.channelId && row.name && /FACEBOOK/i.test(row.eyebrow));
  }

  function discoveredPages(state) {
    const pages = Array.isArray(state?.settings?.metaPages) ? state.settings.metaPages : [];
    return pages.map(page => ({
      id:text(page?.id),
      name:text(page?.name)
    })).filter(page => page.id && page.name);
  }

  function applyMapping(state, channelId, page, source) {
    state.settings = state.settings && typeof state.settings === "object" ? state.settings : {};
    state.settings.publishMappings = state.settings.publishMappings && typeof state.settings.publishMappings === "object"
      ? state.settings.publishMappings
      : {};
    if (state.settings.publishMappings[channelId]?.pageId) return false;
    state.settings.publishMappings[channelId] = {
      connector:"META_FACEBOOK",
      pageId:String(page.id),
      pageName:page.name,
      source
    };
    return true;
  }

  function reconcile() {
    const section = publishingSection();
    if (!section) return false;

    const state = readState();
    const pages = discoveredPages(state);
    if (!pages.length) return false;

    const mappings = state?.settings?.publishMappings && typeof state.settings.publishMappings === "object"
      ? state.settings.publishMappings
      : {};
    const rows = facebookRows(section);
    let changed = false;

    for (const row of rows) {
      if (EXCLUDED_CHANNELS.has(row.channelId)) continue;
      if (mappings[row.channelId]?.pageId || state?.settings?.publishMappings?.[row.channelId]?.pageId) continue;

      const confirmed = CONFIRMED[row.channelId];
      if (confirmed) {
        const exactId = pages.find(page => page.id === confirmed.id);
        if (exactId) {
          changed = applyMapping(state, row.channelId, exactId, "OWNER_ALIAS_LOCK") || changed;
          continue;
        }
      }

      if (row.status && row.status !== "UNLINKED") continue;
      const key = normalize(row.name);
      if (!key) continue;
      const exactMatches = pages.filter(page => normalize(page.name) === key);
      if (exactMatches.length !== 1) continue;
      changed = applyMapping(state, row.channelId, exactMatches[0], "AUTO_EXACT_MATCH_V2") || changed;
    }

    if (!changed || !writeState(state)) return false;
    document.documentElement.dataset.accPublishReconciled = REVISION;
    setTimeout(() => location.reload(), 180);
    return true;
  }

  let queued = false;
  function schedule(delay = 0) {
    setTimeout(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        reconcile();
      });
    }, delay);
  }

  new MutationObserver(() => schedule(60)).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("pageshow", () => schedule(80));
  window.addEventListener("focus", () => schedule(80));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(80); });
  document.addEventListener("click", event => {
    const action = event.target?.closest?.("[data-action]")?.dataset?.action || "";
    if (["sync-meta-pages", "module-tab-system", "open-channel"].includes(action)) {
      schedule(250);
      schedule(900);
    }
  }, true);

  window.ACCPublishSyncReconcile = Object.freeze({ revision:REVISION, reconcile });
  schedule(120);
})();
