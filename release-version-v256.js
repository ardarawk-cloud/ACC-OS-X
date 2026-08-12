// ACC OS X — BUILD 256 RELEASE IDENTITY BRIDGE
// Separates application release identity from the legacy Build 250 data-schema constant in app.js.
// No workflow, publishing, Meta mapping, or stored channel data is modified.
(() => {
  "use strict";

  const RELEASE = Object.freeze({
    build: 256,
    revision: "BUILD256_KAI_SYSTEM_ORCHESTRATOR",
    label: "BUILD 256",
    corePackageRevision: "BUILD255_2_BUDGETED_RESEARCH",
    corePackageLabel: "255.2",
    kaiSystemRevision: "BUILD256_KAI_SYSTEM_ORCHESTRATOR",
    kaiSystemLabel: "256",
    dataSchema: 250
  });

  window.ACCRelease = RELEASE;

  const patchText = () => {
    document.querySelectorAll(".build").forEach(node => {
      const value = String(node.textContent || "");
      if (/Build\s+250\s*•\s*ACC AI\s*\/\s*Cloudflare Workers AI/i.test(value)) {
        node.textContent = `Build ${RELEASE.build} • Core ${RELEASE.corePackageLabel} • KAI System ${RELEASE.kaiSystemLabel}`;
      }
    });

    document.querySelectorAll(".badge").forEach(node => {
      if (String(node.textContent || "").trim().toUpperCase() === "BUILD 250") {
        node.textContent = `BUILD ${RELEASE.build}`;
      }
    });

    const boot = document.querySelector("#boot .boot-sub");
    if (boot && /BUILD\s+250/i.test(String(boot.textContent || ""))) {
      boot.textContent = `ACC OS X • BUILD ${RELEASE.build}`;
    }
  };

  let queued = false;
  const queuePatch = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      patchText();
    });
  };

  const previousFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    try {
      const url = typeof input === "string" ? input : input?.url || "";
      const method = String(init?.method || (typeof input !== "string" ? input?.method : "GET") || "GET").toUpperCase();
      if (method === "POST" && /\/api\/acc-ai(?:\?|$)/.test(url) && typeof init?.body === "string") {
        const body = JSON.parse(init.body);
        body.context = body.context && typeof body.context === "object" ? body.context : {};
        body.context.client = body.context.client && typeof body.context.client === "object" ? body.context.client : {};
        body.context.client.build = RELEASE.build;
        body.context.client.revision = RELEASE.revision;
        body.context.client.dataSchema = RELEASE.dataSchema;
        body.context.client.corePackageRevision = RELEASE.corePackageRevision;
        body.context.client.kaiSystemRevision = RELEASE.kaiSystemRevision;
        init = {...init, body: JSON.stringify(body)};
      }
    } catch {}
    return previousFetch(input, init);
  };

  const observer = new MutationObserver(queuePatch);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  queuePatch();

  window.dispatchEvent(new CustomEvent("acc-release-ready", {detail: RELEASE}));
})();
