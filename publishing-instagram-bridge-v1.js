// KAI ONE — Instagram Business bridge UI v1
(() => {
  "use strict";

  const REVISION = "KAI_ONE_INSTAGRAM_BRIDGE_V1";
  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const ENDPOINT_KEY = "acc_os_x_publish_endpoint_v1";
  const ACCESS_KEY = "acc_os_x_publish_access_v1";
  const AI_ACCESS_KEY = "acc_os_x_ai_access_v1";
  const DEFAULT_ENDPOINT = "https://acc-publish-connector.ardarawk.workers.dev/api/acc-publish";
  const PANEL_ID = "acc-instagram-bridge-panel";

  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  const norm = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  function readState() {
    try {
      const value = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      return value && typeof value === "object" ? value : {};
    } catch { return {}; }
  }
  function writeState(state) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); return true; }
    catch { return false; }
  }
  function accessCode() { return localStorage.getItem(ACCESS_KEY) || localStorage.getItem(AI_ACCESS_KEY) || ""; }
  function baseEndpoint() { return localStorage.getItem(ENDPOINT_KEY) || DEFAULT_ENDPOINT; }
  function igEndpoint() {
    const endpoint = String(baseEndpoint() || "").replace(/\/?$/, "");
    if (/\/api\/acc-publish$/i.test(endpoint)) return `${endpoint}/instagram-accounts`;
    return `${endpoint}/instagram-accounts`;
  }

  function instagramChannels() {
    return [...document.querySelectorAll('[data-action="open-channel"][data-channel]')]
      .map(button => ({
        id: button.dataset.channel || "",
        name: button.querySelector(".item-title")?.textContent?.trim() || "",
        platform: button.querySelector(".eyebrow")?.textContent || ""
      }))
      .filter(item => item.id && /instagram/i.test(item.platform));
  }

  function getAccounts(state = readState()) {
    const rows = state?.settings?.metaInstagramAccounts;
    return Array.isArray(rows) ? rows : [];
  }
  function getMappings(state = readState()) {
    const value = state?.settings?.publishMappings;
    return value && typeof value === "object" ? value : {};
  }

  function exactCandidate(channel, accounts) {
    const key = norm(channel.name);
    const hits = accounts.filter(account => [account.username, account.name, account.pageName].some(value => norm(value) === key));
    return hits.length === 1 ? hits[0] : null;
  }

  function mappingFor(account, source = "OWNER_IG_LINK") {
    return {
      connector: "META_INSTAGRAM",
      instagramAccountId: String(account.id),
      instagramUsername: String(account.username || account.name || ""),
      instagramName: String(account.name || ""),
      pageId: String(account.pageId || ""),
      pageName: String(account.pageName || ""),
      source
    };
  }

  function autoMapExact(state, channels, accounts) {
    state.settings = state.settings || {};
    const mappings = { ...getMappings(state) };
    let linked = 0;
    for (const channel of channels) {
      if (mappings[channel.id]?.instagramAccountId) continue;
      const account = exactCandidate(channel, accounts);
      if (!account) continue;
      mappings[channel.id] = mappingFor(account, "OWNER_IG_AUTO_EXACT");
      linked += 1;
    }
    state.settings.publishMappings = mappings;
    return linked;
  }

  function link(channelId, accountId) {
    const state = readState();
    const account = getAccounts(state).find(item => String(item.id) === String(accountId));
    if (!account) return;
    state.settings = state.settings || {};
    state.settings.publishMappings = { ...getMappings(state), [channelId]: mappingFor(account) };
    if (!writeState(state)) return;
    renderPanel();
    setTimeout(() => location.reload(), 120);
  }

  function unlink(channelId) {
    const state = readState();
    state.settings = state.settings || {};
    const mappings = { ...getMappings(state) };
    delete mappings[channelId];
    state.settings.publishMappings = mappings;
    if (!writeState(state)) return;
    renderPanel();
    setTimeout(() => location.reload(), 120);
  }

  let busy = false;
  let lastError = "";
  async function syncInstagram() {
    if (busy) return;
    const access = accessCode();
    if (!access) {
      lastError = "Connector Access PIN belum tersimpan.";
      renderPanel();
      return;
    }
    busy = true;
    lastError = "";
    renderPanel();
    try {
      const response = await fetch(igEndpoint(), { method: "GET", headers: { "X-ACC-Access-Code": access, Accept: "application/json" }, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data?.error?.message || data?.error?.code || `HTTP_${response.status}`);
      const accounts = (Array.isArray(data.accounts) ? data.accounts : [])
        .map(item => ({
          id: String(item.id || ""),
          username: String(item.username || ""),
          name: String(item.name || ""),
          pageId: String(item.pageId || ""),
          pageName: String(item.pageName || ""),
          source: String(item.source || "")
        }))
        .filter(item => item.id);
      const state = readState();
      state.settings = state.settings || {};
      state.settings.metaInstagramAccounts = accounts;
      state.settings.lastMetaInstagramSync = new Date().toISOString();
      state.settings.metaInstagramRevision = String(data.revision || "");
      const linked = autoMapExact(state, instagramChannels(), accounts);
      if (!writeState(state)) throw new Error("LOCAL_STORAGE_WRITE_FAILED");
      if (linked > 0) setTimeout(() => location.reload(), 160);
    } catch (error) {
      lastError = String(error?.message || error);
    } finally {
      busy = false;
      renderPanel();
    }
  }

  function buttonHtml(channelId, account) {
    const label = account.username ? `@${account.username}` : (account.name || account.id);
    const sub = account.pageName ? ` • ${account.pageName}` : "";
    return `<button type="button" class="btn dark mono" data-acc-ig-link="${esc(channelId)}" data-acc-ig-account="${esc(account.id)}" style="width:100%;text-align:left;justify-content:flex-start;white-space:normal">LINK IG → ${esc(label)}${esc(sub)}</button>`;
  }

  function renderPanel() {
    const fbSync = document.querySelector('[data-action="sync-meta-pages"]');
    const hubCard = fbSync?.closest?.(".card");
    if (!hubCard) return;
    const actions = fbSync.closest(".actions");
    if (actions && !actions.querySelector("[data-acc-ig-sync]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn purple mono";
      button.dataset.accIgSync = "1";
      button.textContent = "SYNC INSTAGRAM ACCOUNTS";
      actions.insertBefore(button, fbSync.nextSibling);
    }

    const state = readState();
    const accounts = getAccounts(state);
    const mappings = getMappings(state);
    const channels = instagramChannels();
    let panel = document.getElementById(PANEL_ID);
    if (!panel) {
      panel = document.createElement("div");
      panel.id = PANEL_ID;
      panel.className = "card mono";
      panel.style.marginTop = "16px";
      hubCard.insertAdjacentElement("afterend", panel);
    }

    const mappedCount = channels.filter(channel => mappings[channel.id]?.instagramAccountId).length;
    const accountRows = channels.map(channel => {
      const current = mappings[channel.id];
      const currentLabel = current?.instagramUsername ? `@${current.instagramUsername}` : (current?.instagramName || "");
      return `<div class="item" style="margin-top:12px">
        <div class="row between wrap"><div class="grow"><div class="eyebrow">${esc(channel.name)}</div><div class="item-title">${current?.instagramAccountId ? `→ ${esc(currentLabel)} • ${esc(current.instagramAccountId)}` : "Instagram account belum di-link"}</div><div class="meta">${current?.pageName ? `Linked Facebook Page: ${esc(current.pageName)}` : "Pilih IG Business/Creator account yang benar."}</div></div><span class="${current?.instagramAccountId ? "status completed" : "status ready"}">${current?.instagramAccountId ? "READY" : "IG BRIDGE"}</span></div>
        ${current?.instagramAccountId ? `<div class="actions"><button type="button" class="btn dark mono" data-acc-ig-unlink="${esc(channel.id)}">UNLINK IG</button></div>` : (accounts.length ? `<div class="actions" style="display:grid;grid-template-columns:1fr;gap:8px">${accounts.map(account => buttonHtml(channel.id, account)).join("")}</div>` : "")}
      </div>`;
    }).join("");

    panel.innerHTML = `<div class="row between wrap"><div><div class="eyebrow">META INSTAGRAM • BUSINESS / CREATOR</div><h3 class="card-title">INSTAGRAM BRIDGE</h3><p class="muted small">Sync akun IG yang terhubung ke Facebook Pages. Mapping disimpan per channel dan tidak mengubah Page Facebook.</p></div><span class="badge">${mappedCount}/${channels.length} IG READY</span></div>
      <div class="grid stats" style="margin-top:14px"><div class="stat"><span>IG ACCOUNTS</span><strong>${accounts.length}</strong></div><div class="stat"><span>IG CHANNELS</span><strong>${channels.length}</strong></div></div>
      ${busy ? `<div class="context-content" style="margin-top:12px">SYNCING INSTAGRAM…</div>` : ""}
      ${lastError ? `<div class="context-content red" style="margin-top:12px">IG SYNC ERROR • ${esc(lastError)}</div>` : ""}
      ${state?.settings?.metaInstagramRevision ? `<div class="meta" style="margin-top:10px">Connector: ${esc(state.settings.metaInstagramRevision)} • Last IG sync: ${esc(state.settings.lastMetaInstagramSync || "—")}</div>` : ""}
      <div class="list" style="margin-top:12px">${accountRows || `<div class="item"><div class="meta">Belum ada channel Instagram di Publishing Hub.</div></div>`}</div>`;
  }

  function fireOnce(key, fn) {
    const now = Date.now();
    const slot = fireOnce.cache || (fireOnce.cache = new Map());
    if (now - (slot.get(key) || 0) < 550) return;
    slot.set(key, now);
    fn();
  }

  function handle(event) {
    const sync = event.target?.closest?.("[data-acc-ig-sync]");
    const linkButton = event.target?.closest?.("[data-acc-ig-link][data-acc-ig-account]");
    const unlinkButton = event.target?.closest?.("[data-acc-ig-unlink]");
    if (!sync && !linkButton && !unlinkButton) return;
    if (event.type !== "click") event.preventDefault();
    if (sync) return fireOnce("sync", syncInstagram);
    if (linkButton) return fireOnce(`link:${linkButton.dataset.accIgLink}:${linkButton.dataset.accIgAccount}`, () => link(linkButton.dataset.accIgLink, linkButton.dataset.accIgAccount));
    if (unlinkButton) return fireOnce(`unlink:${unlinkButton.dataset.accIgUnlink}`, () => unlink(unlinkButton.dataset.accIgUnlink));
  }

  ["pointerdown", "touchstart", "mousedown", "click"].forEach(type => document.addEventListener(type, handle, { capture: true, passive: false }));

  const observer = new MutationObserver(() => renderPanel());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("pageshow", renderPanel);
  window.addEventListener("focus", renderPanel);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderPanel(); });
  setTimeout(renderPanel, 100);
  setTimeout(renderPanel, 700);

  window.ACCInstagramBridge = { revision: REVISION, sync: syncInstagram, render: renderPanel };
})();
