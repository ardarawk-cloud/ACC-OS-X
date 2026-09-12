// KAI ONE — Launcher layout stability v5
// Canonical home order: MY APPS -> MY MAPS -> MY PROJECTS -> MY ADMIN -> phone categories.
// Logo rendering belongs exclusively to my-maps-launcher-v1.js.
(() => {
  "use strict";
  if (window.__ACC_LAUNCHER_LAYOUT_STABILITY_V5__) return;
  window.__ACC_LAUNCHER_LAYOUT_STABILITY_V5__ = true;

  const REVISION = "KAI_ONE_LAUNCHER_LAYOUT_STABILITY_V5_ADMIN_ORDER";

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
      const apps = document.getElementById("acc-home-launchpad");
      if (!apps) return false;

      const maps = document.getElementById("acc-my-maps");
      const projects = document.getElementById("acc-my-projects");
      const admin = document.getElementById("acc-my-admin");
      const phone = document.getElementById("acc-owner-phone-sections");

      let changed = false;
      if (maps) changed = placeAfter(maps, apps) || changed;
      const projectAnchor = maps || apps;
      if (projects) changed = placeAfter(projects, projectAnchor) || changed;
      const adminAnchor = projects || maps || apps;
      if (admin) changed = placeAfter(admin, adminAnchor) || changed;
      const phoneAnchor = admin || projects || maps || apps;
      if (phone) changed = placeAfter(phone, phoneAnchor) || changed;

      document.documentElement.dataset.accLauncherOrder = REVISION;
      return changed;
    } finally {
      arranging = false;
    }
  }

  function ensureMyAdmin(){
    if(document.querySelector('script[data-acc-my-admin="v1"]')) return;
    const script=document.createElement("script");
    script.src="./my-admin-launcher-v1.js?rev=KAI_ONE_MY_ADMIN_V1";
    script.dataset.accMyAdmin="v1";
    script.async=false;
    document.head.appendChild(script);
  }

  let queued = false;
  function schedule(delay = 0) {
    setTimeout(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        ensureMyAdmin();
        stabilize();
      });
    }, delay);
  }

  new MutationObserver(() => schedule(0)).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("pageshow", () => { schedule(0); schedule(120); schedule(520); });
  window.addEventListener("focus", () => schedule(0));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(0); });

  window.ACCLauncherLayoutStability = Object.freeze({ revision:REVISION, stabilize });
  ensureMyAdmin();
  schedule(0);
  schedule(120);
  schedule(520);
})();
