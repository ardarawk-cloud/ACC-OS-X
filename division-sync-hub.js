// ACC OS X — DIVISION SYNC HUB v1
// Read-only sync from division-owned repositories into ACC OS X HOME.
// Divisions remain the source of truth. No write-back is performed.
(() => {
  "use strict";

  const CACHE_KEY = "acc_os_x_division_sync_v1";
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
  let refreshTimer = null;
  let refreshPromise = null;

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

  async function refresh() {
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      await Promise.all(Object.keys(DIVISIONS).map(syncOne));
      writeCache();
      patchCards();
      patchOpenModal();
      return state;
    })().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  function statusText(entry) {
    if (!entry?.manifest) return entry?.online === false ? "SYNC OFFLINE" : "SYNCING";
    const version = entry.manifest.version ? ` • ${entry.manifest.version}` : "";
    return `${entry.online === false ? "CACHED" : "SYNCED"}${version}`;
  }

  function patchCard(key, entry) {
    const card = document.querySelector(`[data-home-module="${key}"]`);
    if (!card) return;

    const badge = card.querySelector(".acc-launch-foot .badge");
    if (badge) {
      badge.textContent = statusText(entry);
      badge.title = entry?.manifest?.operationalStatus || "";
      if (entry?.online === false) badge.style.opacity = ".7";
      else badge.style.opacity = "1";
    }

    let line = card.querySelector(".acc-sync-line");
    if (!line) {
      line = document.createElement("div");
      line.className = "acc-sync-line";
      line.style.cssText = "margin-top:9px;font-size:.68rem;color:var(--muted,#8390aa);line-height:1.4";
      card.querySelector(".acc-launch-desc")?.insertAdjacentElement("afterend", line);
    }

    if (entry?.manifest) {
      line.textContent = `DIVISION: ${cleanStatus(entry.manifest.operationalStatus)} • ${entry.manifest.ownerRole || "DIVISION TEAM"}`;
    } else {
      line.textContent = entry?.online === false ? "DIVISION SYNC: cached/unavailable" : "DIVISION SYNC: connecting";
    }
  }

  function patchCards() {
    Object.entries(DIVISIONS).forEach(([key]) => patchCard(key, state[key]));
  }

  function currentModalKey() {
    const modal = document.getElementById("acc-home-module-modal");
    if (!modal) return null;
    const title = modal.querySelector(".card-title")?.textContent?.trim()?.toUpperCase();
    if (title === "KAI TRAD") return "trading";
    if (title === "ENTEGO") return "entego";
    if (title === "AM STUDIO") return "studio";
    return null;
  }

  function patchOpenModal() {
    const modal = document.getElementById("acc-home-module-modal");
    const key = currentModalKey();
    if (!modal || !key) return;
    const entry = state[key];
    const manifest = entry?.manifest;
    const panel = modal.querySelector(".acc-module-modal");
    if (!panel) return;

    let syncBox = panel.querySelector(".acc-division-sync-box");
    if (!syncBox) {
      syncBox = document.createElement("div");
      syncBox.className = "acc-division-sync-box";
      syncBox.style.cssText = "margin-top:14px;padding:12px;border:1px solid var(--line,#25324a);border-radius:14px;background:rgba(0,0,0,.14)";
      panel.appendChild(syncBox);
    }

    const appUrl = manifest?.appUrl || null;
    const targetUrl = appUrl || entry?.repoUrl || DIVISIONS[key].repoUrl;
    syncBox.innerHTML = `
      <div class="eyebrow">ACC SYNC HUB</div>
      <div style="font-weight:900;margin-top:5px">${statusText(entry)}</div>
      <div class="muted small" style="margin-top:6px">${manifest ? `${cleanStatus(manifest.operationalStatus)} • source: ${manifest.repository}` : "Waiting for division manifest."}</div>
      <button type="button" class="btn mono" data-division-open style="margin-top:10px;width:100%">${appUrl ? "OPEN DIVISION WEB" : "OPEN DIVISION REPOSITORY"}</button>
    `;
    syncBox.querySelector("[data-division-open]")?.addEventListener("click", () => {
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    });
  }

  function schedule() {
    clearInterval(refreshTimer);
    refreshTimer = setInterval(refresh, REFRESH_MS);
  }

  const observer = new MutationObserver(() => {
    patchCards();
    patchOpenModal();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refresh();
  });
  window.addEventListener("online", refresh);
  window.addEventListener("focus", refresh);

  window.ACCSyncHub = {
    refresh,
    getState: () => JSON.parse(JSON.stringify(state))
  };

  patchCards();
  refresh();
  schedule();
})();
