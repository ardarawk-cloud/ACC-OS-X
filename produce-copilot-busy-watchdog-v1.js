// ACC OS X — PRODUCE COPILOT BUSY WATCHDOG V1
// Prevents K/P/C/N controls from remaining disabled forever when /api/acc-ai hangs or aborts.
(() => {
  "use strict";
  if (window.__ACC_PRODUCE_BUSY_WATCHDOG_V1__) return;
  window.__ACC_PRODUCE_BUSY_WATCHDOG_V1__ = true;

  const REVISION = "PRODUCE_COPILOT_BUSY_WATCHDOG_V1_R1";
  const PANEL_ID = "acc-produce-copilot-panel";
  const CONTRACT_KEY = "acc_os_x_production_contract_runtime_v1";
  const originalFetch = window.fetch.bind(window);
  const txt = v => typeof v === "string" ? v.trim() : "";

  function operation(command) {
    const c = txt(command);
    if (/^(k|konten|content)\b/i.test(c)) return "K";
    if (/^(p|poster)\b/i.test(c)) return "P";
    if (/^(c|caption)\b/i.test(c)) return "C";
    if (/^(n|next|lanjut)\b/i.test(c)) return "N";
    return "CHAT";
  }

  function timeoutFor(op) {
    if (op === "P") return 240000; // poster batches can legitimately take longer
    if (op === "C") return 120000;
    if (op === "K" || op === "N") return 120000;
    return 120000;
  }

  function activeChannelId() {
    return txt(document.getElementById(PANEL_ID)?.dataset?.channelId);
  }

  function unlockUi(message, isError = true) {
    document.querySelectorAll(`#${PANEL_ID} button, #${PANEL_ID} input`).forEach(el => {
      if (el.id === "acc-copilot-publish") return;
      el.disabled = false;
    });
    const status = document.getElementById("acc-copilot-status");
    if (status) {
      status.textContent = message || "Siap.";
      status.style.color = isError ? "#ffb36b" : "#8b9bb4";
    }
  }

  function clearRunningGuard(channelId, op, reason = "REQUEST_TIMEOUT") {
    if (!channelId || op === "CHAT") return;
    try {
      const state = JSON.parse(localStorage.getItem(CONTRACT_KEY) || "{}");
      if (!state.channels || typeof state.channels !== "object") state.channels = {};
      const row = state.channels[channelId];
      if (!row) return;
      const running = `${op}_RUNNING`;
      if (row.reason === running) {
        row.reason = `${op}_FAILED`;
        if (op === "K" || op === "N") {
          row.materialReady = false;
          row.posterReady = false;
          row.captionReady = false;
        } else if (op === "P") row.posterReady = false;
        else if (op === "C") row.captionReady = false;
        row.publishBlocked = true;
        row.lastRuntimeFailure = reason;
        row.updatedAt = new Date().toISOString();
        localStorage.setItem(CONTRACT_KEY, JSON.stringify(state));
      }
    } catch {}
  }

  window.fetch = async (input, init = {}) => {
    const url = typeof input === "string" ? input : input?.url || "";
    const method = String(init?.method || (typeof input !== "string" ? input?.method : "GET") || "GET").toUpperCase();
    if (method !== "POST" || !/\/api\/acc-ai(?:$|\?)/.test(url) || typeof init?.body !== "string") {
      return originalFetch(input, init);
    }

    let body = null;
    try { body = JSON.parse(init.body); } catch { return originalFetch(input, init); }
    const stage = String(body?.context?.workerTask?.stage || "").toUpperCase();
    if (stage !== "COPILOT" && stage !== "PRODUCE_COPILOT") return originalFetch(input, init);

    const op = operation(body?.context?.copilot?.command || body?.messages?.slice(-1)?.[0]?.content);
    if (op === "CHAT") return originalFetch(input, init);

    const channelId = txt(body?.context?.profile?.id) || activeChannelId();
    const controller = new AbortController();
    const upstreamSignal = init?.signal;
    if (upstreamSignal) {
      if (upstreamSignal.aborted) controller.abort(upstreamSignal.reason);
      else upstreamSignal.addEventListener("abort", () => controller.abort(upstreamSignal.reason), {once:true});
    }

    const timeoutMs = timeoutFor(op);
    const timer = setTimeout(() => controller.abort(new DOMException("ACC_COPILOT_TIMEOUT", "AbortError")), timeoutMs);
    try {
      return await originalFetch(input, {...init, signal:controller.signal});
    } catch (error) {
      const timedOut = controller.signal.aborted;
      clearRunningGuard(channelId, op, timedOut ? "REQUEST_TIMEOUT" : "REQUEST_FAILED");
      if (timedOut) unlockUi(`${op} timeout — tombol sudah dibuka lagi. Coba ulang sekali.`, true);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  // UI safety net: if a stale K/P/C/N RUNNING state survived a reload, never keep controls dead forever.
  let busySince = 0;
  setInterval(() => {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) { busySince = 0; return; }
    const status = txt(document.getElementById("acc-copilot-status")?.textContent).toUpperCase();
    const gate = txt(panel.querySelector("[data-contract-gate]")?.textContent).toUpperCase();
    const busy = /SEDANG|RUNNING/.test(`${status} ${gate}`);
    if (!busy) { busySince = 0; return; }
    if (!busySince) busySince = Date.now();
    if (Date.now() - busySince < 250000) return;
    const channelId = activeChannelId();
    const op = gate.includes("P RUNNING") ? "P" : gate.includes("C RUNNING") ? "C" : gate.includes("N RUNNING") ? "N" : "K";
    clearRunningGuard(channelId, op, "STALE_BUSY_WATCHDOG");
    unlockUi("Proses terlalu lama dan sudah di-reset. Tombol aktif kembali.", true);
    busySince = 0;
  }, 1500);

  window.ACCProduceBusyWatchdog = Object.freeze({revision:REVISION, unlock:unlockUi});
})();
