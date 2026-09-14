// ACC OS X — BUILD 257.6.3 PRODUCE COPILOT POSTER PREVIEW + SCROLL STABILITY FIX
// Keeps one poster payload copy in localStorage, restores the latest poster preview in chat,
// and prevents K/P/C/N or Publish rerenders from jumping the owner viewport.
// Does not change AI generation, K/C/N logic, Automatic Mission, Meta mapping, credentials, or publishing.
(() => {
  "use strict";
  if (window.__ACC_PRODUCE_COPILOT_PREVIEW_FIX_V25762__) return;
  window.__ACC_PRODUCE_COPILOT_PREVIEW_FIX_V25762__ = true;

  const REVISION = "BUILD257_6_3_POSTER_PREVIEW_SCROLL_STABILITY";
  const STORE_KEY = "acc_os_x_produce_copilot_v1";
  const PANEL_ID = "acc-produce-copilot-panel";
  const PREVIEW_ATTR = "data-copilot-restored-preview";
  const LOCK_TTL_MS = 45000;

  const text = v => typeof v === "string" ? v.trim() : "";
  const originalSetItem = Storage.prototype.setItem;
  let viewportLock = null;
  let restoringViewport = false;

  function compactStoreObject(store) {
    let changed = false;
    if (!store || typeof store !== "object" || !store.channels || typeof store.channels !== "object") return {store, changed};
    for (const row of Object.values(store.channels)) {
      if (!row || typeof row !== "object") continue;
      if (row.package && typeof row.package === "object" && text(row.package.posterBase64)) {
        if (row.package.posterDataUrl) {
          row.package.posterDataUrl = "";
          changed = true;
        }
      }
      if (Array.isArray(row.messages)) {
        for (const msg of row.messages) {
          if (msg?.type === "poster" && msg.image) {
            delete msg.image;
            changed = true;
          }
        }
      }
    }
    return {store, changed};
  }

  Storage.prototype.setItem = function(key, value) {
    if (this === window.localStorage && key === STORE_KEY && typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        const normalized = compactStoreObject(parsed).store;
        value = JSON.stringify(normalized);
      } catch {}
    }
    return originalSetItem.call(this, key, value);
  };

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
    catch { return {}; }
  }

  function compactExistingStorage() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const result = compactStoreObject(parsed);
      if (result.changed) originalSetItem.call(localStorage, STORE_KEY, JSON.stringify(result.store));
    } catch {}
  }

  function activeChannelId() {
    return text(document.getElementById(PANEL_ID)?.dataset?.channelId);
  }

  function latestPosterMessageIndex(row) {
    if (!Array.isArray(row?.messages)) return -1;
    for (let i = row.messages.length - 1; i >= 0; i--) {
      if (row.messages[i]?.type === "poster") return i;
    }
    return -1;
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

  function ensurePreviewStyle() {
    if (document.getElementById("acc-copilot-preview-fix-style")) return;
    const style = document.createElement("style");
    style.id = "acc-copilot-preview-fix-style";
    style.textContent = `
      #${PANEL_ID}{overflow-anchor:none}
      #${PANEL_ID} .acc-copilot-chat{overflow-anchor:none}
      .acc-copilot-restored-note{margin-top:7px;font-size:9px;letter-spacing:.08em;color:#69efb3;font-weight:900}
      .acc-copilot-restored-poster{width:min(100%,360px);display:block;border-radius:13px;border:1px solid rgba(255,255,255,.12);margin-top:8px;cursor:zoom-in;background:#050914}
    `;
    document.head.appendChild(style);
  }

  function restorePreview() {
    ensurePreviewStyle();
    compactExistingStorage();

    const panel = document.getElementById(PANEL_ID);
    const chat = document.getElementById("acc-copilot-chat");
    const channelId = activeChannelId();
    if (!panel || !chat || !channelId) return;

    const store = readStore();
    const row = store?.channels?.[channelId];
    const base64 = text(row?.package?.posterBase64);
    if (!base64) return;

    const messageIndex = latestPosterMessageIndex(row);
    if (messageIndex < 0) return;

    const messageNodes = [...chat.querySelectorAll(".acc-copilot-msg")];
    const messageNode = messageNodes[messageIndex];
    const bubble = messageNode?.querySelector(".acc-copilot-bubble");
    if (!bubble) return;

    if (bubble.querySelector(".acc-copilot-poster")) return;
    if (bubble.querySelector(`[${PREVIEW_ATTR}]`)) return;

    const src = `data:image/jpeg;base64,${base64}`;
    const note = document.createElement("div");
    note.className = "acc-copilot-restored-note";
    note.setAttribute(PREVIEW_ATTR, "1");
    note.textContent = "POSTER PREVIEW • TAP TO OPEN";

    const img = document.createElement("img");
    img.className = "acc-copilot-restored-poster";
    img.setAttribute(PREVIEW_ATTR, "1");
    img.src = src;
    img.alt = "Poster preview";
    img.addEventListener("click", () => openPreview(src));

    bubble.append(note, img);
  }

  function anchorDescriptor(target) {
    if (!(target instanceof Element)) return null;
    const commandButton = target.closest("[data-copilot-command]");
    if (commandButton) return {kind:"command", value:text(commandButton.dataset.copilotCommand)};
    const publishButton = target.closest("#acc-copilot-publish");
    if (publishButton) return {kind:"publish"};
    const form = target.closest("#acc-copilot-form");
    if (form) return {kind:"form"};
    return null;
  }

  function resolveAnchor(descriptor) {
    if (!descriptor) return null;
    if (descriptor.kind === "command") {
      return [...document.querySelectorAll(`#${PANEL_ID} [data-copilot-command]`)]
        .find(node => text(node.dataset.copilotCommand) === descriptor.value) || null;
    }
    if (descriptor.kind === "publish") return document.getElementById("acc-copilot-publish");
    if (descriptor.kind === "form") return document.getElementById("acc-copilot-form");
    return null;
  }

  function captureViewportLock(event) {
    const panel = document.getElementById(PANEL_ID);
    if (!panel || !(event.target instanceof Element) || !panel.contains(event.target)) return;
    const descriptor = anchorDescriptor(event.target);
    if (!descriptor) return;
    const anchor = resolveAnchor(descriptor) || event.target;
    const rect = anchor.getBoundingClientRect();
    viewportLock = {
      descriptor,
      targetTop: rect.top,
      fallbackX: window.scrollX,
      fallbackY: window.scrollY,
      expiresAt: Date.now() + LOCK_TTL_MS
    };
  }

  function cancelViewportLock() {
    if (!restoringViewport) viewportLock = null;
  }

  function restoreViewportLock() {
    if (!viewportLock) return;
    if (Date.now() > viewportLock.expiresAt) {
      viewportLock = null;
      return;
    }
    const anchor = resolveAnchor(viewportLock.descriptor);
    restoringViewport = true;
    try {
      if (anchor) {
        const delta = anchor.getBoundingClientRect().top - viewportLock.targetTop;
        if (Math.abs(delta) > 0.5) window.scrollBy({top:delta, left:0, behavior:"auto"});
      } else if (Math.abs(window.scrollY - viewportLock.fallbackY) > 0.5) {
        window.scrollTo({top:viewportLock.fallbackY, left:viewportLock.fallbackX, behavior:"auto"});
      }
    } finally {
      requestAnimationFrame(() => { restoringViewport = false; });
    }
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      restorePreview();
      restoreViewportLock();
    });
  }

  document.addEventListener("pointerdown", captureViewportLock, true);
  document.addEventListener("submit", captureViewportLock, true);
  document.addEventListener("touchmove", cancelViewportLock, {capture:true, passive:true});
  document.addEventListener("wheel", cancelViewportLock, {capture:true, passive:true});
  document.addEventListener("keydown", event => {
    if (["PageUp","PageDown","Home","End","ArrowUp","ArrowDown"," "].includes(event.key)) cancelViewportLock();
  }, true);

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  window.addEventListener("storage", event => { if (event.key === STORE_KEY) schedule(); });
  setInterval(schedule, 900);

  compactExistingStorage();
  schedule();
  window.ACCProduceCopilotPreviewFix = Object.freeze({revision:REVISION, restore:restorePreview});
})();
