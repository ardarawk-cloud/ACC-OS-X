// ACC OS X — PRODUCE COPILOT ITEM PUBLISH QUEUE V1
// Batch = production only. Publishing is always one selected item at a time.
(() => {
  "use strict";
  if (window.__ACC_COPILOT_ITEM_PUBLISH_QUEUE_V1__) return;
  window.__ACC_COPILOT_ITEM_PUBLISH_QUEUE_V1__ = true;

  const REVISION = "ITEM_PUBLISH_QUEUE_V1_NO_BULK_DEFAULT";
  const MAIN_KEY = "acc_os_x_ecosystem_v214";
  const STORE_KEY = "acc_os_x_produce_copilot_v1";
  const AI_ACCESS_KEY = "acc_os_x_ai_access_v1";
  const PUBLISH_ENDPOINT_KEY = "acc_os_x_publish_endpoint_v1";
  const PUBLISH_ACCESS_KEY = "acc_os_x_publish_access_v1";
  const DEFAULT_PUBLISH_ENDPOINT = "https://acc-publish-connector.ardarawk.workers.dev/api/acc-publish";
  const BULK_ID = "acc-copilot-publish-bulk-disabled";

  const txt = v => typeof v === "string" ? v.trim() : "";
  const now = () => new Date().toISOString();
  const uid = p => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

  function read(key, fallback = {}) {
    try { return JSON.parse(localStorage.getItem(key) || "") || fallback; }
    catch { return fallback; }
  }
  function main() { return read(MAIN_KEY, {}); }
  function store() {
    const s = read(STORE_KEY, {channels:{}});
    if (!s.channels) s.channels = {};
    return s;
  }
  function save(s) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }
    catch {}
  }
  function channelId() {
    return txt(document.getElementById("acc-produce-copilot-panel")?.dataset?.channelId) || txt(main().activeChannelId);
  }
  function lane(s, id) {
    if (!s.channels[id]) s.channels[id] = {messages:[], package:{}, updatedAt:now()};
    const r = s.channels[id];
    r.messages = Array.isArray(r.messages) ? r.messages : [];
    r.package = r.package || {};
    return r;
  }
  function batchSpec(id) {
    try {
      const spec = window.ACCCopilotBatchRuntime?.batchSpec?.(id);
      if (Number(spec?.count) > 1) return {count:Number(spec.count), labels:Array.isArray(spec.labels) ? spec.labels : []};
    } catch {}
    try {
      const c = window.ACCProductionContracts?.get?.(id);
      if (Number(c?.batch?.count) > 1) return {count:Number(c.batch.count), labels:Array.isArray(c.batch.series) ? c.batch.series : []};
    } catch {}
    return {count:1, labels:[]};
  }
  function contractBlocked(id) {
    try {
      const r = window.ACCProductionContracts?.state?.()?.channels?.[id];
      return Boolean(r && r.publishBlocked);
    } catch { return false; }
  }
  function target(m, id) { return m?.settings?.publishMappings?.[id] || null; }
  function status(value, error = false) {
    const el = document.getElementById("acc-copilot-status");
    if (el) {
      el.textContent = value || "";
      el.style.color = error ? "#ff8095" : "#8b9bb4";
    }
  }
  function addMessage(id, content) {
    const s = store(), r = lane(s, id), c = txt(content);
    r.messages.push({id:uid("msg"), role:"kai", type:"text", content:c, at:now()});
    r.messages = r.messages.slice(-40);
    r.updatedAt = now();
    save(s);
  }

  function ensureStyle() {
    if (document.getElementById("acc-item-publish-queue-v1-style")) return;
    const st = document.createElement("style");
    st.id = "acc-item-publish-queue-v1-style";
    st.textContent = `
      #${BULK_ID}{opacity:.72!important;cursor:not-allowed!important}
      .acc-item-publish-note{margin:8px 0 2px;padding:8px 10px;border-radius:9px;background:rgba(105,239,179,.07);border:1px solid rgba(105,239,179,.18);font-size:10px;line-height:1.4;color:#9db0c7}
      .acc-item-publish-note b{color:#69efb3}
      .acc-item-publish-actions{display:flex;align-items:center;gap:8px;margin-top:9px;flex-wrap:wrap}
      .acc-item-publish-btn{appearance:none;border:1px solid rgba(105,239,179,.42);background:rgba(105,239,179,.11);color:#69efb3;border-radius:9px;padding:9px 12px;font:900 10px/1 system-ui,sans-serif;letter-spacing:.05em}
      .acc-item-publish-btn:disabled{opacity:.48;cursor:not-allowed}
      .acc-item-publish-state{font:800 9px/1.25 system-ui,sans-serif;color:#91a3bb;letter-spacing:.04em}
      .acc-item-publish-state.done{color:#69efb3}
      .acc-item-publish-state.error{color:#ff8095}
    `;
    document.head.appendChild(st);
  }

  function restoreSingleButton() {
    const bulk = document.getElementById(BULK_ID);
    if (!bulk) return;
    bulk.id = "acc-copilot-publish";
    bulk.disabled = false;
    if (bulk.dataset.accOriginalText) bulk.textContent = bulk.dataset.accOriginalText;
    delete bulk.dataset.accQueueLocked;
    document.getElementById("acc-item-publish-note")?.remove();
  }

  function lockBulkButton() {
    let pub = document.getElementById("acc-copilot-publish") || document.getElementById(BULK_ID);
    if (!pub) return;
    if (pub.id !== BULK_ID) {
      pub.dataset.accOriginalText = txt(pub.textContent) || "PUBLISH APPROVED PACKAGE";
      pub.id = BULK_ID;
    }
    pub.dataset.accQueueLocked = "1";
    pub.disabled = true;
    pub.textContent = "BATCH READY • PUBLISH PER ITEM";
    pub.title = "Batch hanya untuk produksi. Pilih item yang akan dipublish.";
    if (!document.getElementById("acc-item-publish-note")) {
      const note = document.createElement("div");
      note.id = "acc-item-publish-note";
      note.className = "acc-item-publish-note";
      note.innerHTML = "<b>BATCH = PRODUKSI.</b> Publishing dilakukan satu per satu dari kartu item di atas. Tidak ada auto-publish massal.";
      pub.insertAdjacentElement("beforebegin", note);
    }
  }

  function itemState(r, index) {
    const poster = Array.isArray(r.package.batchPosters) ? r.package.batchPosters[index] : null;
    const caption = Array.isArray(r.package.batchCaptions) ? r.package.batchCaptions[index] : null;
    const published = Array.isArray(r.package.batchPublished) ? r.package.batchPublished[index] : null;
    if (published) return {ready:false, done:true, label:"PUBLISHED", poster, caption, published};
    if (!poster || !txt(poster.base64)) return {ready:false, done:false, label:"POSTER BELUM", poster, caption};
    if (!caption || !txt(caption.caption)) return {ready:false, done:false, label:"CAPTION BELUM", poster, caption};
    return {ready:true, done:false, label:"READY", poster, caption};
  }

  function decorateItems() {
    ensureStyle();
    const id = channelId();
    if (!id) return;
    const spec = batchSpec(id);
    if (spec.count <= 1) {
      restoreSingleButton();
      return;
    }
    lockBulkButton();
    const s = store(), r = lane(s, id), box = document.getElementById("acc-copilot-batch-runtime");
    if (!box) return;
    const cards = [...box.querySelectorAll(".acc-batch-item")];
    cards.forEach((card, index) => {
      if (index >= spec.count) return;
      const state = itemState(r, index);
      let actions = card.querySelector(".acc-item-publish-actions");
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "acc-item-publish-actions";
        card.appendChild(actions);
      }
      const blocked = contractBlocked(id);
      const disabled = state.done || !state.ready || blocked;
      const label = state.done ? "PUBLISHED" : state.ready ? `PUBLISH ITEM ${index + 1}` : state.label;
      const stateText = state.done ? `PUBLISHED • ${esc(String(state.published))}` : blocked ? "PACKAGE BELUM APPROVED" : state.label;
      actions.innerHTML = `<button type="button" class="acc-item-publish-btn" data-acc-publish-item="${index}" ${disabled ? "disabled" : ""}>${esc(label)}</button><span class="acc-item-publish-state ${state.done ? "done" : ""}" data-acc-item-state="${index}">${stateText}</span>`;
    });
  }

  async function publishItem(id, index, button) {
    const s = store(), r = lane(s, id), m = main(), spec = batchSpec(id), state = itemState(r, index);
    if (spec.count <= 1) throw new Error("CHANNEL_NOT_BATCH");
    if (state.done) throw new Error(`Item ${index + 1} sudah dipublish.`);
    if (!state.ready) throw new Error(`Item ${index + 1} belum lengkap.`);
    if (contractBlocked(id)) throw new Error("Package belum lolos gate K/P/C.");
    const t = target(m, id);
    if (!t) throw new Error("Meta Page channel belum di-map di Publishing Hub.");
    const access = localStorage.getItem(PUBLISH_ACCESS_KEY) || localStorage.getItem(AI_ACCESS_KEY) || "";
    if (!access) throw new Error("Connector access belum tersimpan.");

    const endpoint = localStorage.getItem(PUBLISH_ENDPOINT_KEY) || DEFAULT_PUBLISH_ENDPOINT;
    const platform = String(document.querySelector("#acc-produce-copilot-panel .meta")?.textContent || "Facebook").split("•").pop().trim().toUpperCase();
    const stamp = Date.now();
    const label = state.poster?.label || state.caption?.label || spec.labels[index] || `Item ${index + 1}`;
    const payload = {
      id: uid("copilot_item_publish"),
      sourceWorkflowId: `COPILOT_BATCH_ITEM:${id}`,
      sourceWorkflowRunKey: `copilot-item:${id}:${index + 1}:${stamp}`,
      sourceTaskId: null,
      channelId: id,
      channelName: txt(document.querySelector("#acc-produce-copilot-panel .acc-copilot-channel")?.textContent) || id,
      workspaceId: m.activeWorkspaceId || "acc-enterprise",
      platform,
      status: "QUEUED",
      attempts: 1,
      idempotencyKey: `copilot-item:${id}:${index + 1}:${stamp}`,
      externalPostId: null,
      publishedAt: null,
      error: null,
      createdAt: now(),
      updatedAt: now(),
      connector: t.connector || "META_FACEBOOK",
      sourceAssetId: null,
      target: t,
      pageId: t.pageId || null,
      pageName: t.pageName || null,
      instagramAccountId: t.instagramAccountId || null,
      content: {
        message: state.caption.caption,
        mediaUrl: null,
        imageBase64: state.poster.base64,
        mimeType: "image/jpeg"
      },
      clientRevision: REVISION,
      mediaSource: "PRODUCE_COPILOT_ITEM_QUEUE_BASE64",
      batchMeta: {index:index + 1, count:spec.count, label}
    };

    button.disabled = true;
    button.textContent = `PUBLISHING ${index + 1}…`;
    status(`Publishing item ${index + 1}/${spec.count}…`);
    const response = await fetch(endpoint, {
      method:"POST",
      headers:{"Content-Type":"application/json","Accept":"application/json","X-ACC-Access-Code":access},
      body:JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      const e = data?.error || {};
      throw new Error(e.message || e.code || data.message || `HTTP ${response.status}`);
    }

    const externalId = txt(data.externalPostId || data.postId || data.id || data.result?.id) || "PUBLISHED";
    const fresh = store(), laneFresh = lane(fresh, id);
    const published = Array.isArray(laneFresh.package.batchPublished) ? [...laneFresh.package.batchPublished] : [];
    const publishedMeta = Array.isArray(laneFresh.package.batchPublishedMeta) ? [...laneFresh.package.batchPublishedMeta] : [];
    published[index] = externalId;
    publishedMeta[index] = {externalPostId:externalId, publishedAt:now(), label, index:index + 1};
    laneFresh.package.batchPublished = published;
    laneFresh.package.batchPublishedMeta = publishedMeta;
    laneFresh.updatedAt = now();
    save(fresh);
    addMessage(id, `PUBLISH ITEM ${index + 1} SUCCESS ✅\n${label}`);
    status(`Item ${index + 1} published ✅`);
    try { window.ACCCopilotBatchRuntime?.render?.(); } catch {}
    setTimeout(decorateItems, 80);
  }

  document.addEventListener("click", async event => {
    const btn = event.target?.closest?.("[data-acc-publish-item]");
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const id = channelId(), index = Number(btn.dataset.accPublishItem);
    if (!id || !Number.isInteger(index) || index < 0) return;
    try {
      await publishItem(id, index, btn);
    } catch (error) {
      const message = String(error?.message || error);
      status(`ERROR // ${message}`, true);
      const stateEl = document.querySelector(`[data-acc-item-state="${index}"]`);
      if (stateEl) { stateEl.textContent = `ERROR • ${message}`; stateEl.classList.add("error"); }
      addMessage(id, `ERROR PUBLISH ITEM ${index + 1} // ${message}`);
      setTimeout(decorateItems, 120);
    }
  }, true);

  let timer = 0;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(decorateItems, 80);
  }
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  window.addEventListener("storage", event => {
    if (event.key === STORE_KEY || event.key === MAIN_KEY) schedule();
  });
  setInterval(schedule, 1200);
  schedule();

  window.ACCItemPublishQueue = Object.freeze({revision:REVISION, refresh:decorateItems});
})();
