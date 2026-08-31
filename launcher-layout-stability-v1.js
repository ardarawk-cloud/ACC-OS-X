// KAI ONE — Launcher layout + MY MAPS icon stability v1
// Canonical home order: MY APPS -> MY MAPS -> MY PROJECTS -> phone categories.
(() => {
  "use strict";
  if (window.__ACC_LAUNCHER_LAYOUT_STABILITY_V1__) return;
  window.__ACC_LAUNCHER_LAYOUT_STABILITY_V1__ = true;

  const REVISION = "KAI_ONE_LAUNCHER_LAYOUT_STABILITY_V1_NATIVE_FIRST";
  const STYLE_ID = "acc-launcher-layout-stability-v1-style";
  const NATIVE_SPRITE = "/__acc_native/maps-sprite.jpg?rev=KAI_ONE_MAPS_NATIVE_STABLE_V11";
  const WEB_SPRITE = "./assets/app-icons/my-maps-icons-sprite.jpg?rev=KAI_ONE_MAPS_WEB_STABLE_V11";

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    if (style.dataset.revision === REVISION) return;
    style.dataset.revision = REVISION;
    style.textContent = `
      #acc-my-maps .acc-map-sprite{
        background-image:url("${NATIVE_SPRITE}"),url("${WEB_SPRITE}")!important;
        background-repeat:no-repeat,no-repeat!important;
        background-size:400% 200%,400% 200%!important;
        background-position:var(--sprite-x) var(--sprite-y),var(--sprite-x) var(--sprite-y)!important;
      }
    `;
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
      if (mapRoot) mapRoot.dataset.spriteSource = "ANDROID_NATIVE_THEN_WEB_FALLBACK_V11";
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

  // Warm the network fallback. Android native asset remains the first render source.
  try {
    const preload = new Image();
    preload.src = WEB_SPRITE;
  } catch {}

  new MutationObserver(() => schedule(0)).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("pageshow", () => { schedule(0); schedule(120); schedule(520); });
  window.addEventListener("focus", () => schedule(0));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(0); });

  window.ACCLauncherLayoutStability = Object.freeze({ revision:REVISION, stabilize });
  schedule(0);
  schedule(120);
  schedule(520);
})();
