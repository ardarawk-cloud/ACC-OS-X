// ACC OS X — DIVISION SYNC HUB v2
// Stable read-only division sync. No DOM mutation observer loop.
(() => {
  "use strict";

  const CACHE_KEY = "acc_os_x_division_sync_v2";
  const REFRESH_MS = 5 * 60 * 1000;
  const TIMEOUT_MS = 5000;

  const DIVISIONS = {
    trading: {
      manifestUrl: "https://raw.githubusercontent.com/ardarawk-cloud/kai-trad-pwa./main/acc-sync.json",
      repoUrl: "https://github.com/ardarawk-cloud/kai-trad-pwa."
    },
    entego: {
      manifestUrl: "https://raw.githubusercontent.com/ardarawk-cloud/Entego-PWA/main/acc-sync.json",
      repoUrl: "https://github.com/ardarawk-cloud/Entego-PWA"
    },
    studio: {
      manifestUrl: "https://raw.githubusercontent.com/ardarawk-cloud/AM-Studio-PWA/main/acc-sync.json",
      repoUrl: "https://github.com/ardarawk-cloud/AM-Studio-PWA"
    }
  };

  let state = readCache();
  let refreshPromise = null;
  let refreshTimer = null;

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(state)); } catch {}
  }

  function cleanStatus(value) {
    return String(value || "UNKNOWN").replace(/_/g, " ").trim();
  }

  async function fetchJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, {
        method: "GET",
        headers: { "Accept": "application/json", "Cache-Control": "no-cache" },
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data?.schema !== "ACC_DIVISION_SYNC_V1") throw new Error("Invalid sync manifest");
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function syncOne(key) {
    const source = DIVISIONS[key];
    try {
      const manifest = await fetchJson(source.manifestUrl);
      state[key] = {
        manifest,
        syncedAt: new Date().toISOString(),
        online: true,
        repoUrl: source.repoUrl
      };
    } catch (error) {
      const previous = state[key] || {};
      state[key] = {
        ...previous,
        online: false,
        error: String(error?.message || error).slice(0, 160),
        repoUrl: source.repoUrl,
        checkedAt: new Date().toISOString()
      };
    }
  }

  function statusText(entry) {
    if (!entry?.manifest) return entry?.online === false ? "SYNC OFFLINE" : "SYNCING";
    const version = entry.manifest.version ? ` • ${entry.manifest.version}` : "";
    return `${entry.online === false ? "CACHED" : "SYNCED"}${version}`;
  }

  function setTextIfChanged(node, value) {
    if (!node) return;
    const next = String(value ?? "");
    if (node.textContent !== next) node.textContent = next;
  }

  function patchCard(key, entry) {
    const card = document.querySelector(`[data-home-module="${key}"]`);
    if (!card) return false;

    const badge = card.querySelector(".acc-launch-foot .badge");
    if (badge) {
      setTextIfChanged(badge, statusText(entry));
      const title = entry?.manifest?.operationalStatus || "";
      if (badge.title !== title) badge.title = title;
      const opacity = entry?.online === false ? ".7" : "1";
      if (badge.style.opacity !== opacity) badge.style.opacity = opacity;
    }

    let line = card.querySelector(".acc-sync-line");
    if (!line) {
      line = document.createElement("div");
      line.className = "acc-sync-line";
      line.style.cssText = "margin-top:9px;font-size:.68rem;color:var(--muted,#8390aa);line-height:1.4";
      card.querySelector(".acc-launch-desc")?.insertAdjacentElement("afterend", line);
    }

    const text = entry?.manifest
      ? `DIVISION: ${cleanStatus(entry.manifest.operationalStatus)} • ${entry.manifest.ownerRole || "DIVISION TEAM"}`
      : entry?.online === false
        ? "DIVISION SYNC: cached/unavailable"
        : "DIVISION SYNC: connecting";
    setTextIfChanged(line, text);
    return true;
  }

  function patchCards() {
    let found = false;
    Object.keys(DIVISIONS).forEach(key => {
      if (patchCard(key, state[key])) found = true;
    });
    return found;
  }

  async function refresh() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      await Promise.all(Object.keys(DIVISIONS).map(syncOne));
      writeCache();
      patchCards();
      return state;
    })().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  function scheduleCardPatch() {
    patchCards();
    setTimeout(patchCards, 250);
    setTimeout(patchCards, 900);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
  window.addEventListener("online", refresh);
  window.addEventListener("focus", refresh);

  window.ACCSyncHub = {
    revision: "ACC_SYNC_HUB_V2_STABLE",
    refresh,
    patchCards,
    getState: () => JSON.parse(JSON.stringify(state))
  };

  scheduleCardPatch();
  refresh();
  refreshTimer = setInterval(refresh, REFRESH_MS);
})();
