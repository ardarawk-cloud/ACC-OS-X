// KAI ONE — ACC OS X direct Facebook Page mode for former IG bridge channels v1
// Owner decision: CH-102/103/104 publish through their confirmed Facebook Pages.
(() => {
  "use strict";
  if (window.__ACC_SOCIAL_PAGE_MODE_V1__) return;
  window.__ACC_SOCIAL_PAGE_MODE_V1__ = true;

  const REVISION = "KAI_ONE_SOCIAL_PAGE_MODE_V1_DIRECT_FACEBOOK";
  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const TARGETS = Object.freeze({
    "ch-balinightlife": Object.freeze({ code:"CH-102", pageId:"100218739134875", pageName:"Bali Night Life" }),
    "ch-bali-wedding-dj": Object.freeze({ code:"CH-103", pageId:"531554537184461", pageName:"Bali Wedding Dj" }),
    "ch-aku-cinta-malam": Object.freeze({ code:"CH-104", pageId:"247103353870163", pageName:"Aku Cinta Malam" })
  });
  const TARGET_IDS = new Set(Object.keys(TARGETS));

  const readState = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch { return {}; }
  };

  const writeState = state => {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); return true; }
    catch { return false; }
  };

  const setText = (node, value) => {
    const next = String(value ?? "");
    if (node && node.textContent !== next) node.textContent = next;
  };

  const setClass = (node, value) => {
    if (node && node.className !== value) node.className = value;
  };

  function ensureFacebookMappings() {
    const state = readState();
    state.settings = state.settings || {};
    const pages = Array.isArray(state.settings.metaPages) ? state.settings.metaPages : [];
    const mappings = state.settings.publishMappings && typeof state.settings.publishMappings === "object"
      ? { ...state.settings.publishMappings }
      : {};
    let changed = false;

    for (const [channelId, target] of Object.entries(TARGETS)) {
      const pageVisible = pages.some(page => String(page?.id || "") === target.pageId);
      const existing = mappings[channelId];
      const alreadyConfirmed = String(existing?.pageId || "") === target.pageId;
      if (!pageVisible && !alreadyConfirmed) continue;
      if (alreadyConfirmed && String(existing?.connector || "") === "META_FACEBOOK" && !existing?.instagramAccountId) continue;
      mappings[channelId] = {
        connector:"META_FACEBOOK",
        pageId:target.pageId,
        pageName:target.pageName,
        source:"OWNER_SOCIAL_PAGE_MODE"
      };
      changed = true;
    }

    if (changed) {
      state.settings.publishMappings = mappings;
      writeState(state);
    }
    return state;
  }

  const mappingFor = (channelId, state = readState()) => {
    const mappings = state?.settings?.publishMappings;
    return mappings && typeof mappings === "object" ? mappings[channelId] || null : null;
  };

  function setStat(card, label, value) {
    if (!card) return;
    for (const stat of card.querySelectorAll(".stat")) {
      const name = stat.querySelector("span")?.textContent?.trim();
      if (name !== label) continue;
      setText(stat.querySelector("strong"), value);
    }
  }

  function patchPublishingHub() {
    const heading = [...document.querySelectorAll("h1,h2,h3")].find(node => node.textContent?.trim() === "PUBLISHING HUB");
    const hubCard = heading?.closest?.(".card");
    const buttons = [...document.querySelectorAll('[data-action="open-channel"][data-channel]')];
    if (!buttons.length) return;

    const state = ensureFacebookMappings();
    let fbChannels = 0;
    let igChannels = 0;
    let fbMapped = 0;
    let igMapped = 0;

    for (const button of buttons) {
      const id = String(button.dataset.channel || "");
      const eyebrow = button.querySelector(".eyebrow");
      const meta = button.querySelector(".meta");
      const status = button.querySelector(".status");
      const target = TARGETS[id];
      const mapping = mappingFor(id, state);

      let platform = "facebook";
      if (target) {
        setText(eyebrow, `${target.code} • Facebook`);
        const ready = String(mapping?.pageId || "") === target.pageId;
        setText(meta, ready ? `→ ${target.pageName} • ${target.pageId}` : "Facebook Page link required");
        if (status) {
          setText(status, ready ? "READY" : "UNLINKED");
          setClass(status, ready ? "status completed" : "status ready");
        }
        button.dataset.accSocialPageMode = REVISION;
        platform = "facebook";
      } else {
        const text = String(eyebrow?.textContent || "").toLowerCase();
        platform = text.includes("instagram") ? "instagram" : "facebook";
      }

      if (platform === "instagram") {
        igChannels += 1;
        if (mapping?.instagramAccountId) igMapped += 1;
      } else {
        fbChannels += 1;
        if (mapping?.pageId) fbMapped += 1;
      }
    }

    const total = buttons.length;
    const mapped = fbMapped + igMapped;
    if (hubCard) {
      setStat(hubCard, "FB CHANNELS", fbChannels);
      setStat(hubCard, "FB MAPPED", fbMapped);
      setStat(hubCard, "IG CHANNELS", igChannels);
      setStat(hubCard, "IG READY", igMapped);
      setStat(hubCard, "TOTAL CHANNELS", total);
      setStat(hubCard, "TARGETS READY", mapped);
      setStat(hubCard, "ACTION NEEDED", Math.max(0, total - mapped));
      setText(hubCard.querySelector(".badge"), `${mapped}/${total} TARGETS READY`);
      setText(hubCard.querySelector("p.muted.small"), "Current ACC social publishing channels use isolated Facebook Page mappings through the external Meta connector.");
    }

    const igSync = document.querySelector("[data-acc-ig-sync]");
    const igPanel = document.getElementById("acc-instagram-bridge-panel");
    if (igChannels === 0) {
      if (igSync && igSync.style.display !== "none") igSync.style.display = "none";
      if (igPanel && igPanel.style.display !== "none") igPanel.style.display = "none";
    } else {
      if (igSync && igSync.style.display === "none") igSync.style.display = "";
      if (igPanel && igPanel.style.display === "none") igPanel.style.display = "";
    }
  }

  function activeTarget() {
    const state = readState();
    const id = String(document.documentElement.dataset.accSocialPageActive || state?.activeChannelId || state?.activeProfileId || "");
    return TARGETS[id] ? { id, ...TARGETS[id] } : null;
  }

  function patchActiveChannelUi() {
    const active = activeTarget();
    if (!active) return;
    const mapping = mappingFor(active.id);
    const ready = String(mapping?.pageId || "") === active.pageId;

    for (const eyebrow of document.querySelectorAll(".eyebrow")) {
      const text = eyebrow.textContent?.trim() || "";
      if (text === `${active.code} • Instagram`) setText(eyebrow, `${active.code} • Facebook`);
      if (text === "PUBLISH TARGET • INSTAGRAM") setText(eyebrow, "PUBLISH TARGET • FACEBOOK");
    }

    for (const card of document.querySelectorAll(".card")) {
      const publishEyebrow = [...card.querySelectorAll(".eyebrow")].find(node => node.textContent?.trim() === "PUBLISH TARGET • FACEBOOK");
      if (!publishEyebrow) continue;
      const title = card.querySelector(".item-title");
      const meta = card.querySelector(".meta");
      const status = card.querySelector(".status");
      setText(title, ready ? active.pageName : "Facebook Page belum linked");
      setText(meta, ready ? `Page ID ${active.pageId} • OWNER_SOCIAL_PAGE_MODE` : "Sync Page dari Publishing Hub.");
      if (status) {
        setText(status, ready ? "READY" : "LINK REQUIRED");
        setClass(status, ready ? "status completed" : "status ready");
      }
    }
  }

  document.addEventListener("click", event => {
    const button = event.target?.closest?.('[data-action="open-channel"][data-channel]');
    if (!button) return;
    const id = String(button.dataset.channel || "");
    document.documentElement.dataset.accSocialPageActive = TARGET_IDS.has(id) ? id : "";
    schedule();
  }, true);

  // Run after the Instagram safety wrapper. For the three owner-converted channels,
  // rewrite the final publish request to the confirmed Facebook Page target before
  // the safety wrapper evaluates the payload. Other channels remain untouched.
  const upstreamFetch = window.fetch.bind(window);
  window.fetch = async function accSocialPageFetch(input, init = {}) {
    try {
      const method = String(init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
      const url = String(typeof input === "string" ? input : input?.url || "");
      if (method === "POST" && /acc-publish/i.test(url) && typeof init?.body === "string" && init.body.trim().startsWith("{")) {
        const payload = JSON.parse(init.body);
        const channelId = String(payload?.channelId || payload?.job?.channelId || "");
        const target = TARGETS[channelId];
        if (target) {
          payload.platform = "FACEBOOK";
          payload.connector = "META_FACEBOOK";
          payload.pageId = target.pageId;
          payload.pageName = target.pageName;
          payload.target = {
            ...(payload.target && typeof payload.target === "object" ? payload.target : {}),
            connector:"META_FACEBOOK",
            pageId:target.pageId,
            pageName:target.pageName,
            source:"OWNER_SOCIAL_PAGE_MODE"
          };
          delete payload.target.instagramAccountId;
          delete payload.target.instagramUsername;
          delete payload.target.instagramName;
          init = { ...init, body:JSON.stringify(payload) };
        }
      }
    } catch {}
    return upstreamFetch(input, init);
  };

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      patchPublishingHub();
      patchActiveChannelUi();
    });
    setTimeout(() => { patchPublishingHub(); patchActiveChannelUi(); }, 120);
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("pageshow", schedule);
  window.addEventListener("focus", schedule);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });

  window.ACCSocialPageMode = Object.freeze({ revision:REVISION, targets:TARGETS, reconcile:ensureFacebookMappings, render:schedule });
  schedule();
})();
