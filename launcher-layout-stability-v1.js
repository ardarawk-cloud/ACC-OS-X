// KAI ONE — Launcher layout + MY MAPS icon stability v3
// Canonical home order: MY APPS -> MY MAPS -> MY PROJECTS -> phone categories.
// Map logos load from the committed base64 source, then stay as an in-memory data URI.
(() => {
  "use strict";
  if (window.__ACC_LAUNCHER_LAYOUT_STABILITY_V3__) return;
  window.__ACC_LAUNCHER_LAYOUT_STABILITY_V3__ = true;

  const REVISION = "KAI_ONE_LAUNCHER_LAYOUT_STABILITY_V3_DIRECT_B64";
  const STYLE_ID = "acc-launcher-layout-stability-v1-style";
  const B64_URL = "./assets/app-icons/my-maps-icons-sprite.jpg.b64?rev=KAI_ONE_MAPS_B64_V13";
  const NATIVE_SPRITE = "/__acc_native/maps-sprite.jpg?rev=KAI_ONE_MAPS_NATIVE_STABLE_V13";
  const WEB_SPRITE = "./assets/app-icons/my-maps-icons-sprite.jpg?rev=KAI_ONE_MAPS_WEB_STABLE_V13";

  let spritePromise = null;

  function spriteDataUrl() {
    const value = String(window.ACCMyMapsSpriteDataUrl || "");
    return value.startsWith("data:image/") ? value : "";
  }

  function acceptBase64(raw) {
    const clean = String(raw || "").replace(/[^A-Za-z0-9+/=]/g, "");
    if (clean.length < 1024 || !clean.startsWith("/9j/")) return false;
    window.ACCMyMapsSpriteDataUrl = `data:image/jpeg;base64,${clean}`;
    return true;
  }

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }

    const inline = spriteDataUrl();
    const mode = inline ? "DIRECT_B64_DATA_URI_V13" : "NATIVE_THEN_WEB_V13";
    if (style.dataset.revision === REVISION && style.dataset.spriteMode === mode) return;

    style.dataset.revision = REVISION;
    style.dataset.spriteMode = mode;
    style.textContent = inline
      ? `
        #acc-my-maps .acc-map-sprite{
          background-image:url("${inline}")!important;
          background-repeat:no-repeat!important;
          background-size:400% 200%!important;
          background-position:var(--sprite-x) var(--sprite-y)!important;
          opacity:1!important;
        }
      `
      : `
        #acc-my-maps .acc-map-sprite{
          background-image:url("${NATIVE_SPRITE}"),url("${WEB_SPRITE}")!important;
          background-repeat:no-repeat,no-repeat!important;
          background-size:400% 200%,400% 200%!important;
          background-position:var(--sprite-x) var(--sprite-y),var(--sprite-x) var(--sprite-y)!important;
        }
      `;

    const mapRoot = document.getElementById("acc-my-maps");
    if (mapRoot) mapRoot.dataset.spriteSource = mode;
  }

  function loadInlineSprite() {
    if (spriteDataUrl()) {
      ensureStyle();
      return Promise.resolve(true);
    }
    if (spritePromise) return spritePromise;

    spritePromise = fetch(B64_URL, { cache:"no-store", credentials:"same-origin" })
      .then(response => {
        if (!response.ok) throw new Error(`sprite b64 ${response.status}`);
        return response.text();
      })
      .then(text => {
        if (!acceptBase64(text)) throw new Error("invalid sprite b64");
        ensureStyle();
        schedule(0);
        schedule(80);
        return true;
      })
      .catch(() => {
        ensureStyle();
        return false;
      });

    return spritePromise;
  }

  function placeAfter(node, anchor) {
    if (!node || !anchor || node === anchor) return false;
    if (anchor.nextElementSibling === node) return false;
    anchor.insertAdjacentElement("afterend", node);
    return true;
  }

  let arranging = false;
  function stabilize() {
    if (arranging) return false;
    arranging = true;
    try {
      ensureStyle();
      loadInlineSprite();

      const apps = document.getElementById("acc-home-launchpad");
      if (!apps) return false;

      const maps = document.getElementById("acc-my-maps");
      const projects = document.getElementById("acc-my-projects");
      const phone = document.getElementById("acc-owner-phone-sections");

      let changed = false;
      if (maps) changed = placeAfter(maps, apps) || changed;

      const projectAnchor = maps || apps;
      if (projects) changed = placeAfter(projects, projectAnchor) || changed;

      const phoneAnchor = projects || maps || apps;
      if (phone) changed = placeAfter(phone, phoneAnchor) || changed;

      document.documentElement.dataset.accLauncherOrder = REVISION;
      const mapRoot = document.getElementById("acc-my-maps");
      if (mapRoot) mapRoot.dataset.spriteSource = spriteDataUrl() ? "DIRECT_B64_DATA_URI_V13" : "NATIVE_THEN_WEB_V13";
      return changed;
    } finally {
      arranging = false;
    }
  }

  let queued = false;
  function schedule(delay = 0) {
    setTimeout(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        stabilize();
      });
    }, delay);
  }

  new MutationObserver(() => schedule(0)).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("pageshow", () => { schedule(0); schedule(120); schedule(520); });
  window.addEventListener("focus", () => schedule(0));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(0); });

  window.ACCLauncherLayoutStability = Object.freeze({ revision:REVISION, stabilize });
  loadInlineSprite();
  schedule(0);
  schedule(120);
  schedule(520);
})();
