// KAI ONE — Instagram bridge observer + Android direct-touch guard v4
// Legacy deploy marker retained: KAI_ONE_INSTAGRAM_DIRECT_TOUCH_V3
(() => {
  "use strict";
  if (window.__ACCInstagramObserverGuardInstalled) return;

  const REVISION = "KAI_ONE_INSTAGRAM_SYNC_TIMEOUT_V4";
  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const ENDPOINT_KEY = "acc_os_x_publish_endpoint_v1";
  const ACCESS_KEY = "acc_os_x_publish_access_v1";
  const AI_ACCESS_KEY = "acc_os_x_ai_access_v1";
  const DEFAULT_ENDPOINT = "https://acc-publish-connector.ardarawk.workers.dev/api/acc-publish";
  const NativeMutationObserver = window.MutationObserver;
  const directFetch = window.fetch.bind(window);

  const readState = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch { return {}; }
  };
  const writeState = state => {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); return true; }
    catch { return false; }
  };
  const accessCode = () => localStorage.getItem(ACCESS_KEY) || localStorage.getItem(AI_ACCESS_KEY) || "";
  const baseEndpoint = () => String(localStorage.getItem(ENDPOINT_KEY) || DEFAULT_ENDPOINT).replace(/\/?$/, "");
  const childEndpoint = suffix => `${baseEndpoint()}/${suffix}`;
  const isR618 = value => /R6[_\.\-]?18|REAL_META_R6_18_INSTAGRAM_BRIDGE/i.test(String(value || ""));
  const norm = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

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

  const normalizeAccount = item => ({
    id: String(item?.id || ""),
    username: String(item?.username || ""),
    name: String(item?.name || ""),
    pageId: String(item?.pageId || ""),
    pageName: String(item?.pageName || ""),
    source: String(item?.source || "")
  });

  const accountsFromPages = data => {
    const out = [];
    const seen = new Set();
    for (const page of Array.isArray(data?.pages) ? data.pages : []) {
      const ig = page?.instagramBusinessAccount || page?.instagram_business_account || null;
      if (!ig?.id || seen.has(String(ig.id))) continue;
      seen.add(String(ig.id));
      out.push(normalizeAccount({
        id: ig.id,
        username: ig.username,
        name: ig.name,
        pageId: page.id,
        pageName: page.name,
        source: `${page.source || "META_PAGE"}_IG_DISCOVERY`
      }));
    }
    return out;
  };

  const instagramChannels = () => [...document.querySelectorAll('[data-action="open-channel"][data-channel]')]
    .map(button => ({
      id: button.dataset.channel || "",
      name: button.querySelector(".item-title")?.textContent?.trim() || "",
      platform: button.querySelector(".eyebrow")?.textContent || ""
    }))
    .filter(item => item.id && /instagram/i.test(item.platform));

  const mappingFor = account => ({
    connector: "META_INSTAGRAM",
    instagramAccountId: String(account.id),
    instagramUsername: String(account.username || account.name || ""),
    instagramName: String(account.name || ""),
    pageId: String(account.pageId || ""),
    pageName: String(account.pageName || ""),
    source: "OWNER_IG_AUTO_EXACT_V4"
  });

  const autoMapExact = (state, accounts) => {
    state.settings = state.settings || {};
    const mappings = state.settings.publishMappings && typeof state.settings.publishMappings === "object"
      ? { ...state.settings.publishMappings }
      : {};
    let linked = 0;
    for (const channel of instagramChannels()) {
      if (mappings[channel.id]?.instagramAccountId) continue;
      const key = norm(channel.name);
      const hits = accounts.filter(account => [account.username, account.name, account.pageName].some(value => norm(value) === key));
      if (hits.length !== 1) continue;
      mappings[channel.id] = mappingFor(hits[0]);
      linked += 1;
    }
    state.settings.publishMappings = mappings;
    return linked;
  };

  const fetchJsonWithTimeout = async (url, access, timeoutMs = 8000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await directFetch(url, {
        method: "GET",
        headers: { "X-ACC-Access-Code": access, Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal
      });
      const data = await response.json().catch(() => ({}));
      return { response, data };
    } catch (error) {
      if (error?.name === "AbortError") throw new Error(`TIMEOUT_${Math.round(timeoutMs / 1000)}S`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };

  const ensureStatus = button => {
    let status = document.getElementById("acc-instagram-direct-sync-status");
    if (status) return status;
    status = document.createElement("div");
    status.id = "acc-instagram-direct-sync-status";
    status.className = "context-content mono";
    status.style.marginTop = "10px";
    button?.parentElement?.insertAdjacentElement("afterend", status);
    return status;
  };

  const setStatus = (button, text, tone = "") => {
    const status = ensureStatus(button);
    status.className = `context-content mono ${tone}`.trim();
    status.textContent = text;
  };

  let syncing = false;
  let lastSyncAt = 0;
  const boundedSync = async button => {
    if (syncing) return;
    const access = accessCode();
    if (!access) {
      setStatus(button, "IG SYNC ERROR • CONNECTOR ACCESS PIN BELUM TERSIMPAN", "red");
      button.textContent = "SYNC INSTAGRAM ACCOUNTS";
      return;
    }

    syncing = true;
    button.disabled = true;
    button.textContent = "SYNCING INSTAGRAM…";
    setStatus(button, "MENGHUBUNGI META INSTAGRAM…");

    try {
      let accounts = [];
      let revision = "";
      let mode = "";
      let firstError = "";

      try {
        const { response, data } = await fetchJsonWithTimeout(childEndpoint("instagram-accounts"), access, 8000);
        if (!response.ok || !data?.ok || !Array.isArray(data.accounts)) {
          throw new Error(data?.error?.code || `HTTP_${response.status}`);
        }
        accounts = data.accounts.map(normalizeAccount).filter(item => item.id);
        revision = String(data.revision || "");
        mode = "INSTAGRAM_ENDPOINT";
      } catch (error) {
        firstError = String(error?.message || error);
        setStatus(button, `IG ENDPOINT ${firstError} • COBA FALLBACK META PAGES…`, "amber");
        const { response, data } = await fetchJsonWithTimeout(childEndpoint("pages"), access, 9000);
        if (!response.ok || !data?.ok) throw new Error(data?.error?.code || data?.error?.message || `HTTP_${response.status}`);
        accounts = accountsFromPages(data);
        revision = String(data.revision || "");
        mode = "PAGE_NESTED_IG_FALLBACK";
      }

      const state = readState();
      state.settings = state.settings || {};
      state.settings.metaInstagramAccounts = accounts;
      state.settings.lastMetaInstagramSync = new Date().toISOString();
      state.settings.metaInstagramRevision = revision;
      state.settings.metaInstagramDiscoveryMode = mode;
      state.settings.metaInstagramPublishReady = isR618(revision);
      state.settings.metaInstagramLastError = "";
      const linked = autoMapExact(state, accounts);
      if (!writeState(state)) throw new Error("LOCAL_STORAGE_WRITE_FAILED");

      setStatus(button, `IG SYNC DONE ✅ • ${accounts.length} ACCOUNT • ${linked} AUTO-MAPPED`, "green");
      window.ACCInstagramBridge?.render?.();
    } catch (error) {
      const message = String(error?.message || error || "UNKNOWN_ERROR");
      const state = readState();
      state.settings = state.settings || {};
      state.settings.metaInstagramLastError = message;
      state.settings.lastMetaInstagramSync = new Date().toISOString();
      writeState(state);
      setStatus(button, `IG SYNC ERROR • ${message}`, "red");
    } finally {
      syncing = false;
      button.disabled = false;
      button.textContent = "SYNC INSTAGRAM ACCOUNTS";
      button.style.pointerEvents = "auto";
      button.style.touchAction = "manipulation";
    }
  };

  const eventElement = event => {
    const target = event?.target;
    if (target?.nodeType === 1) return target;
    return target?.parentElement || null;
  };
  const syncButtonFromEvent = event => eventElement(event)?.closest?.("[data-acc-ig-sync]") || null;

  const intercept = event => {
    const button = syncButtonFromEvent(event);
    if (!button) return;

    // Always swallow the full Android pointer/touch/click chain so the older
    // bridge handler can never start an unbounded duplicate request.
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation?.();
    event.stopPropagation?.();

    const now = Date.now();
    if (now - lastSyncAt < 900) return;
    lastSyncAt = now;
    boundedSync(button);
  };

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
    if (!syncing) {
      button.disabled = false;
      button.setAttribute("aria-disabled", "false");
      if (/SYNCING INSTAGRAM/i.test(button.textContent || "")) button.textContent = "SYNC INSTAGRAM ACCOUNTS";
    }
  };

  // Recovery for a stale V3 page that was already left displaying SYNCING.
  setTimeout(hardenButton, 120);
  setTimeout(hardenButton, 900);
  window.addEventListener("pageshow", hardenButton);
  window.addEventListener("focus", hardenButton);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) hardenButton(); });
  setInterval(hardenButton, 1200);

  window.__ACCInstagramObserverGuardInstalled = true;
  window.ACCInstagramTouchGuard = { revision: REVISION, harden: hardenButton, sync: boundedSync };
})();
