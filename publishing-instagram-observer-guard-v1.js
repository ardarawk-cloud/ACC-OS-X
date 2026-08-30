// KAI ONE — Instagram bridge MutationObserver self-loop guard
(() => {
  "use strict";
  if (window.__ACCInstagramObserverGuardInstalled) return;
  const NativeMutationObserver = window.MutationObserver;
  if (typeof NativeMutationObserver !== "function") return;

  const isBridgeOwnedTarget = target => {
    if (!target || target.nodeType !== 1) return false;
    if (target.id === "acc-instagram-bridge-panel") return true;
    return Boolean(target.closest?.("#acc-instagram-bridge-panel"));
  };

  window.MutationObserver = class ACCInstagramSafeMutationObserver extends NativeMutationObserver {
    constructor(callback) {
      super((records, observer) => {
        const filtered = (records || []).filter(record => !isBridgeOwnedTarget(record.target));
        if (filtered.length) callback(filtered, observer);
      });
    }
  };

  window.__ACCInstagramObserverGuardInstalled = true;
})();
