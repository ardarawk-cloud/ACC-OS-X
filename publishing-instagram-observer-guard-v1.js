// KAI ONE — Instagram bridge observer + Android direct-touch guard v3
(() => {
  "use strict";
  if (window.__ACCInstagramObserverGuardInstalled) return;

  const REVISION = "KAI_ONE_INSTAGRAM_DIRECT_TOUCH_V3";
  const NativeMutationObserver = window.MutationObserver;

  if (typeof NativeMutationObserver === "function") {
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
  }

  let lastSyncAt = 0;
  const eventElement = event => {
    const target = event?.target;
    if (target?.nodeType === 1) return target;
    return target?.parentElement || null;
  };

  const syncButtonFromEvent = event => eventElement(event)?.closest?.("[data-acc-ig-sync]") || null;

  const runDirectSync = (event, button) => {
    const now = Date.now();
    if (now - lastSyncAt < 900) return;
    lastSyncAt = now;
    if (event?.cancelable) event.preventDefault();
    event?.stopImmediatePropagation?.();
    event?.stopPropagation?.();
    if (button) {
      button.style.pointerEvents = "auto";
      button.style.touchAction = "manipulation";
      button.style.position = "relative";
      button.style.zIndex = "50";
      button.textContent = "SYNCING INSTAGRAM…";
    }
    const bridge = window.ACCInstagramBridge;
    if (bridge && typeof bridge.sync === "function") {
      Promise.resolve(bridge.sync()).catch(() => {});
    } else {
      setTimeout(() => {
        const lateBridge = window.ACCInstagramBridge;
        if (lateBridge && typeof lateBridge.sync === "function") Promise.resolve(lateBridge.sync()).catch(() => {});
      }, 80);
    }
  };

  const intercept = event => {
    const button = syncButtonFromEvent(event);
    if (!button) return;
    runDirectSync(event, button);
  };

  // Registered BEFORE the bridge's own delegated handlers. This prevents the
  // Android WebView pointerdown/touchstart/click chain from cancelling itself.
  ["pointerdown", "touchstart", "mousedown", "click"].forEach(type => {
    document.addEventListener(type, intercept, { capture: true, passive: false });
  });

  const hardenButton = () => {
    const button = document.querySelector("[data-acc-ig-sync]");
    if (!button) return;
    button.style.pointerEvents = "auto";
    button.style.touchAction = "manipulation";
    button.style.position = "relative";
    button.style.zIndex = "50";
    button.disabled = false;
    button.setAttribute("aria-disabled", "false");
  };

  window.addEventListener("pageshow", hardenButton);
  window.addEventListener("focus", hardenButton);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) hardenButton(); });
  setInterval(hardenButton, 800);

  window.__ACCInstagramObserverGuardInstalled = true;
  window.ACCInstagramTouchGuard = { revision: REVISION, harden: hardenButton };
})();
