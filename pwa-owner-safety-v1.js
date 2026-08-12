// ACC OS X — PWA OWNER SAFETY v1
// UI-only patch: safer publish mapping controls, louder Experience feedback,
// and conservative Meta Page logo auto-seeding. Production/AI/Meta publish engine untouched.
(() => {
  "use strict";

  const REVISION = "PWA_OWNER_SAFETY_V1";
  const STORAGE_KEY = "acc_os_x_ecosystem_v214";
  const BRAND_DB_NAME = "acc-os-x-brand-assets-v1";
  const BRAND_DB_STORE = "logos";
  const SAFE_CARD_ID = "acc-safe-publish-admin";
  const CHANNEL_NOTE_ID = "acc-publish-safety-note";
  const LOGO_RELOAD_PREFIX = "acc-logo-seed-reload:";

  const text = value => typeof value === "string" ? value.trim() : "";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const normalizeName = value => String(value || "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch { return null; }
  }

  function writeState(state) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
    catch { return false; }
  }

  function currentChannelId(state) {
    return text(state?.activeChannelId);
  }

  function publishMappings(state) {
    const rows = state?.settings?.publishMappings;
    return rows && typeof rows === "object" ? rows : {};
  }

  function metaPages(state) {
    return Array.isArray(state?.settings?.metaPages) ? state.settings.metaPages : [];
  }

  function activeTarget(state, channelId) {
    return publishMappings(state)[channelId] || null;
  }

  function openBrandDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(BRAND_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(BRAND_DB_STORE)) db.createObjectStore(BRAND_DB_STORE, { keyPath:"channelId" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("BRAND_DB_OPEN_FAILED"));
    });
  }

  async function brandGet(channelId) {
    const db = await openBrandDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BRAND_DB_STORE, "readonly");
      const req = tx.objectStore(BRAND_DB_STORE).get(channelId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error("BRAND_DB_READ_FAILED"));
    }).finally(() => db.close());
  }

  async function brandPut(record) {
    const db = await openBrandDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BRAND_DB_STORE, "readwrite");
      tx.objectStore(BRAND_DB_STORE).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error("BRAND_DB_WRITE_FAILED"));
    }).finally(() => db.close());
  }

  function pageLogoUrl(pageId) {
    const id = String(pageId || "").replace(/[^0-9]/g, "");
    return id ? `https://graph.facebook.com/${id}/picture?type=large&redirect=1` : "";
  }

  function imageLoads(url, timeout = 5000) {
    return new Promise(resolve => {
      if (!url) return resolve(false);
      const img = new Image();
      let done = false;
      const finish = ok => { if (done) return; done = true; clearTimeout(timer); img.onload = img.onerror = null; resolve(ok); };
      const timer = setTimeout(() => finish(false), timeout);
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = url;
    });
  }

  async function seedLogo(channelId, page) {
    if (!channelId || !page?.id) return false;
    const state = readState();
    if (!state) return false;

    // User-uploaded/original logo always wins. Never overwrite any existing brand record.
    if (state.brandAssets?.[channelId]) return false;
    try { if (await brandGet(channelId)) return false; } catch {}

    const url = pageLogoUrl(page.id);
    if (!(await imageLoads(url))) return false;

    const now = Date.now();
    const name = `${text(page.name) || channelId}-facebook-page-logo`;
    try {
      await brandPut({
        channelId,
        dataUrl:url,
        name,
        mimeType:"image/jpeg",
        size:0,
        updatedAt:now,
        source:"META_PAGE_PROFILE"
      });
    } catch { return false; }

    const latest = readState();
    if (!latest) return false;
    latest.brandAssets = { ...(latest.brandAssets || {}), [channelId]: {
      name,
      mimeType:"image/jpeg",
      size:0,
      updatedAt:now,
      source:"META_PAGE_PROFILE",
      pageId:String(page.id),
      pageName:text(page.name)
    }};
    return writeState(latest);
  }

  function pageForChannel(state, channelId, channelName = "") {
    const mapped = activeTarget(state, channelId);
    if (mapped?.pageId) return { id:String(mapped.pageId), name:text(mapped.pageName) || channelName };
    const key = normalizeName(channelName);
    if (!key) return null;
    const match = metaPages(state).find(page => page?.id && normalizeName(page.name) === key);
    return match ? { id:String(match.id), name:text(match.name) } : null;
  }

  function channelRowsFromPublishingHub() {
    return [...document.querySelectorAll('button[data-action="open-channel"][data-channel]')]
      .map(button => ({
        id:text(button.dataset.channel),
        name:text(button.querySelector(".item-title")?.textContent)
      }))
      .filter(row => row.id && row.name);
  }

  async function seedKnownLogos() {
    const state = readState();
    if (!state) return;
    const jobs = [];

    // Direct mappings are highest-confidence because channelId -> PageId is explicit.
    for (const [channelId, target] of Object.entries(publishMappings(state))) {
      if (!target?.pageId || state.brandAssets?.[channelId]) continue;
      jobs.push([channelId, { id:String(target.pageId), name:text(target.pageName) || channelId }]);
    }

    // When Publishing Hub is visible, exact Page-name matches let us seed more channels safely.
    for (const row of channelRowsFromPublishingHub()) {
      if (state.brandAssets?.[row.id] || jobs.some(job => job[0] === row.id)) continue;
      const page = pageForChannel(state, row.id, row.name);
      if (page) jobs.push([row.id, page]);
    }

    for (const [channelId, page] of jobs.slice(0, 12)) {
      await seedLogo(channelId, page);
    }
  }

  async function seedCurrentChannelLogo() {
    const state = readState();
    if (!state) return;
    const channelId = currentChannelId(state);
    if (!channelId || state.brandAssets?.[channelId]) return;
    const openProduction = document.querySelector('[data-action="open-pipeline"]');
    if (!openProduction) return;
    const title = text(document.querySelector("section .card-title")?.textContent);
    const page = pageForChannel(state, channelId, title);
    if (!page) return;
    const seeded = await seedLogo(channelId, page);
    if (!seeded) return;

    const reloadKey = LOGO_RELOAD_PREFIX + channelId;
    if (!sessionStorage.getItem(reloadKey)) {
      sessionStorage.setItem(reloadKey, "1");
      location.reload();
    }
  }

  function channelPublishCard() {
    const hubButton = document.querySelector('[data-action="module-tab-system"][data-value="publishing"]');
    if (!hubButton || !document.querySelector('[data-action="open-pipeline"]')) return null;
    return hubButton.closest(".card");
  }

  function patchChannelPublishControls() {
    const card = channelPublishCard();
    if (!card) return;

    const selector = card.querySelector("#publish-page-select");
    selector?.closest(".form-grid")?.remove();
    card.querySelector('[data-action="unlink-publish-page"]')?.remove();

    const hubButton = card.querySelector('[data-action="module-tab-system"][data-value="publishing"]');
    if (hubButton) hubButton.textContent = "MANAGE IN PUBLISHING HUB";

    if (!card.querySelector(`#${CHANNEL_NOTE_ID}`)) {
      const note = document.createElement("div");
      note.id = CHANNEL_NOTE_ID;
      note.className = "meta";
      note.style.marginTop = "12px";
      note.textContent = "Page mapping controls dipindah ke Publishing Hub untuk mencegah link / unlink tidak sengaja.";
      const actions = hubButton?.closest(".actions");
      actions?.parentElement?.insertBefore(note, actions);
    }
  }

  function publishingHubRoot() {
    return [...document.querySelectorAll("h2.card-title")].find(el => text(el.textContent).toUpperCase() === "PUBLISHING HUB")?.closest("section") || null;
  }

  function buildSafeMappingCard(state) {
    const channelId = currentChannelId(state);
    if (!channelId) return null;
    const row = document.querySelector(`button[data-action="open-channel"][data-channel="${CSS.escape(channelId)}"]`);
    const channelName = text(row?.querySelector(".item-title")?.textContent) || channelId;
    const target = activeTarget(state, channelId);
    const pages = metaPages(state);

    const card = document.createElement("div");
    card.id = SAFE_CARD_ID;
    card.className = "card";
    card.style.marginTop = "16px";
    card.innerHTML = `
      <div class="row between wrap">
        <div class="grow">
          <div class="eyebrow">SAFE PAGE MAPPING • OWNER CONTROL</div>
          <h3 class="card-title" style="margin-top:4px">${esc(channelName)}</h3>
          <div class="meta">${target?.pageId ? `Current → ${esc(target.pageName || "Facebook Page")} • Page ID ${esc(target.pageId)}` : "Belum ada Facebook Page yang di-link."}</div>
        </div>
        <span class="${target?.pageId ? "status completed" : "status ready"}">${target?.pageId ? "READY" : "UNLINKED"}</span>
      </div>
      ${pages.length ? `
        <div class="form-grid two" style="margin-top:14px">
          <select id="publish-page-select" class="select mono">
            <option value="">Select Facebook Page…</option>
            ${pages.filter(page => page?.id && page?.name).map(page => `<option value="${esc(page.id)}" ${String(target?.pageId || "") === String(page.id) ? "selected" : ""}>${esc(page.name)}</option>`).join("")}
          </select>
          <button class="btn cyan mono" data-action="link-publish-page">${target?.pageId ? "LINK / REPLACE PAGE" : "LINK PAGE"}</button>
        </div>` : `<div class="meta" style="margin-top:13px">Sync Facebook Pages dulu untuk memilih target.</div>`}
      <div class="actions">
        <button class="btn primary mono" data-action="sync-meta-pages">SYNC FACEBOOK PAGES</button>
        ${target?.pageId ? `<button class="btn red mono" data-action="unlink-publish-page" data-ui-safe-unlink="1">UNLINK PAGE</button>` : ""}
      </div>
      <div class="meta" style="margin-top:10px">UNLINK dilindungi double-confirm. Tap sekali untuk arm, tap kedua dalam 4 detik untuk benar-benar unlink.</div>
    `;
    return card;
  }

  function patchPublishingHub() {
    const root = publishingHubRoot();
    if (!root) return;
    root.querySelector(`#${SAFE_CARD_ID}`)?.remove();
    const state = readState();
    if (!state) return;
    const card = buildSafeMappingCard(state);
    if (!card) return;
    const firstCard = root.querySelector(":scope > .card") || root.querySelector(".card");
    firstCard?.insertAdjacentElement("afterend", card);
  }

  let unlinkArmedUntil = 0;
  let unlinkButton = null;
  function protectUnlink(event) {
    const button = event.target?.closest?.('[data-ui-safe-unlink="1"]');
    if (!button) return false;
    const now = Date.now();
    if (button === unlinkButton && now < unlinkArmedUntil) {
      unlinkArmedUntil = 0;
      unlinkButton = null;
      button.textContent = "UNLINKING…";
      return false; // allow the app's real handler to execute
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    unlinkButton = button;
    unlinkArmedUntil = now + 4000;
    const original = "UNLINK PAGE";
    button.textContent = "TAP AGAIN TO CONFIRM UNLINK";
    setTimeout(() => {
      if (button === unlinkButton && Date.now() >= unlinkArmedUntil) {
        unlinkButton = null;
        unlinkArmedUntil = 0;
        if (button.isConnected) button.textContent = original;
      }
    }, 4100);
    return true;
  }

  let audioContext = null;
  function experiencePackFromTarget(target, state) {
    const soundButton = target?.closest?.('[data-action="experience-sound"][data-value]');
    if (soundButton) return text(soundButton.dataset.value).toUpperCase();
    return text(state?.experience?.soundPack || "CYBER").toUpperCase();
  }

  function loudUiSound(target, kind = "tap") {
    const state = readState();
    const pack = experiencePackFromTarget(target, state);
    if (!pack || pack === "OFF") return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audioContext || audioContext.state === "closed") audioContext = new AC();
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});

      const cfg = {
        CYBER:[760,.070,"sine"],
        MATRIX:[980,.060,"square"],
        MILITARY:[300,.075,"triangle"],
        WUXIA:[610,.090,"sine"],
        CLUB:[190,.085,"square"]
      }[pack] || [760,.070,"sine"];
      const [freq,dur,type] = cfg;
      const ctx = audioContext;
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      const overtoneGain = ctx.createGain();
      const peak = kind === "success" ? .17 : .135;
      const start = ctx.currentTime;

      osc.type = type;
      overtone.type = "sine";
      osc.frequency.value = kind === "success" ? freq * 1.25 : freq;
      overtone.frequency.value = osc.frequency.value * 2;
      gain.gain.setValueAtTime(peak, start);
      gain.gain.exponentialRampToValueAtTime(.0001, start + dur);
      overtoneGain.gain.setValueAtTime(peak * .22, start);
      overtoneGain.gain.exponentialRampToValueAtTime(.0001, start + Math.max(.04, dur * .72));
      osc.connect(gain); gain.connect(ctx.destination);
      overtone.connect(overtoneGain); overtoneGain.connect(ctx.destination);
      osc.start(start); overtone.start(start);
      osc.stop(start + dur); overtone.stop(start + Math.max(.04, dur * .72));
    } catch {}
  }

  function isSoundTarget(target) {
    return !!target?.closest?.("button,[data-action],.tab,.subtab,.module-tab");
  }

  let scheduled = false;
  function reconcile() {
    scheduled = false;
    patchChannelPublishControls();
    patchPublishingHub();
    seedKnownLogos().catch(() => {});
    seedCurrentChannelLogo().catch(() => {});
  }

  function scheduleReconcile() {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(reconcile);
    }
    setTimeout(reconcile, 90);
    setTimeout(reconcile, 360);
  }

  document.addEventListener("click", event => {
    if (protectUnlink(event)) return;
    scheduleReconcile();
  }, true);

  document.addEventListener("pointerdown", event => {
    if (!isSoundTarget(event.target)) return;
    const action = text(event.target?.closest?.("[data-action]")?.dataset.action);
    loudUiSound(event.target, /save|apply|link|start|open|sync|experience-sound/i.test(action) ? "success" : "tap");
  }, { capture:true, passive:true });

  window.addEventListener("pageshow", scheduleReconcile);
  window.addEventListener("focus", scheduleReconcile);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) scheduleReconcile(); });

  window.ACCOwnerSafety = { revision:REVISION, reconcile:scheduleReconcile, seedKnownLogos };
  scheduleReconcile();
})();
