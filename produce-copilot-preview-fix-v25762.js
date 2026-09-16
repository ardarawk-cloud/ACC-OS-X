// ACC OS X — PRODUCE COPILOT PREVIEW RUNTIME
// Single responsibility: compact poster storage and restore poster preview.
// HARD RULE: this module never reads, writes, restores, locks, or animates viewport/page scroll.
(() => {
  "use strict";
  if (window.__ACC_PRODUCE_COPILOT_PREVIEW_RUNTIME_V1__) return;
  window.__ACC_PRODUCE_COPILOT_PREVIEW_RUNTIME_V1__ = true;

  const REVISION = "BUILD257_6_4_PREVIEW_ONLY_NO_SCROLL_CONTROL";
  const STORE_KEY = "acc_os_x_produce_copilot_v1";
  const PANEL_ID = "acc-produce-copilot-panel";
  const PREVIEW_ATTR = "data-copilot-restored-preview";
  const STYLE_ID = "acc-copilot-preview-runtime-style";

  const text = value => typeof value === "string" ? value.trim() : "";
  const nativeSetItem = Storage.prototype.setItem;

  function compactStoreObject(store) {
    let changed = false;
    if (!store || typeof store !== "object" || !store.channels || typeof store.channels !== "object") {
      return {store, changed};
    }

    for (const row of Object.values(store.channels)) {
      if (!row || typeof row !== "object") continue;

      if (row.package && typeof row.package === "object" && text(row.package.posterBase64) && row.package.posterDataUrl) {
        row.package.posterDataUrl = "";
        changed = true;
      }

      if (!Array.isArray(row.messages)) continue;
      for (const message of row.messages) {
        if (message?.type === "poster" && message.image) {
          delete message.image;
          changed = true;
        }
      }
    }

    return {store, changed};
  }

  // Keep only one poster payload copy. This hook changes storage payload only; it has zero UI/scroll behavior.
  Storage.prototype.setItem = function(key, value) {
    if (this === window.localStorage && key === STORE_KEY && typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        value = JSON.stringify(compactStoreObject(parsed).store);
      } catch {}
    }
    return nativeSetItem.call(this, key, value);
  };

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function compactExistingStorage() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const result = compactStoreObject(parsed);
      if (result.changed) nativeSetItem.call(localStorage, STORE_KEY, JSON.stringify(result.store));
    } catch {}
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    document.getElementById("acc-copilot-preview-fix-style")?.remove();
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .acc-copilot-restored-note{margin-top:7px;font-size:9px;letter-spacing:.08em;color:#69efb3;font-weight:900}
      .acc-copilot-restored-poster{width:min(100%,360px);display:block;border-radius:13px;border:1px solid rgba(255,255,255,.12);margin-top:8px;cursor:zoom-in;background:#050914}
    `;
    document.head.appendChild(style);
  }

  function openPreview(src) {
    if (!src) return;
    const modal = document.createElement("div");
    modal.className = "acc-copilot-modal";
    modal.innerHTML = `<img src="${src}" alt="Poster preview"><button type="button">TUTUP</button>`;
    modal.addEventListener("click", event => {
      if (event.target === modal || event.target?.tagName === "BUTTON") modal.remove();
    });
    document.body.appendChild(modal);
  }

  function activeChannelId() {
    return text(document.getElementById(PANEL_ID)?.dataset?.channelId);
  }

  function latestPosterMessageIndex(row) {
    if (!Array.isArray(row?.messages)) return -1;
    for (let index = row.messages.length - 1; index >= 0; index -= 1) {
      if (row.messages[index]?.type === "poster") return index;
    }
    return -1;
  }

  function restorePreview() {
    ensureStyle();

    const panel = document.getElementById(PANEL_ID);
    const chat = document.getElementById("acc-copilot-chat");
    const channelId = activeChannelId();
    if (!panel || !chat || !channelId) return;

    const row = readStore()?.channels?.[channelId];
    const base64 = text(row?.package?.posterBase64);
    if (!base64) return;

    const messageIndex = latestPosterMessageIndex(row);
    if (messageIndex < 0) return;

    const messageNode = [...chat.querySelectorAll(".acc-copilot-msg")][messageIndex];
    const bubble = messageNode?.querySelector(".acc-copilot-bubble");
    if (!bubble || bubble.querySelector(".acc-copilot-poster") || bubble.querySelector(`[${PREVIEW_ATTR}]`)) return;

    const src = `data:image/jpeg;base64,${base64}`;
    const note = document.createElement("div");
    note.className = "acc-copilot-restored-note";
    note.setAttribute(PREVIEW_ATTR, "1");
    note.textContent = "POSTER PREVIEW • TAP TO OPEN";

    const image = document.createElement("img");
    image.className = "acc-copilot-restored-poster";
    image.setAttribute(PREVIEW_ATTR, "1");
    image.src = src;
    image.alt = "Poster preview";
    image.addEventListener("click", () => openPreview(src));

    bubble.append(note, image);
  }

  let framePending = false;
  function scheduleRestore() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(() => {
      framePending = false;
      restorePreview();
    });
  }

  const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation =>
      mutation.target instanceof Node &&
      (document.getElementById(PANEL_ID)?.contains(mutation.target) || mutation.target === document.body)
    )) scheduleRestore();
  });
  observer.observe(document.documentElement, {childList:true, subtree:true});

  window.addEventListener("storage", event => {
    if (event.key === STORE_KEY) scheduleRestore();
  });
  window.addEventListener("pageshow", scheduleRestore);

  compactExistingStorage();
  scheduleRestore();

  window.ACCProduceCopilotPreviewFix = Object.freeze({
    revision: REVISION,
    restore: restorePreview,
    scrollControl: false
  });
})();
