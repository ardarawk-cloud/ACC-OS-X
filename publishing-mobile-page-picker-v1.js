// KAI ONE — Publishing Hub Mobile Page Picker v4
// Android/WebView-safe owner mapping. No native select, details/summary, or expand/collapse control.
(() => {
  "use strict";

  const REVISION = "KAI_ONE_DIRECT_OWNER_PAGE_MAP_V4_ALWAYS_VISIBLE";
  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const SAFE_CARD_ID = "acc-safe-publish-admin";
  const PICKER_ID = "acc-mobile-page-picker-v1";
  const STYLE_ID = "acc-mobile-page-picker-style-v4";

  const CONFIRMED_PAGE_BY_CHANNEL = {
    "ch-arda-gaming": { id:"1296361826889422", name:"Arda Gaming" },
    "ch-mr-laziz": { id:"102412098142218", name:"Mister Laziz" }
  };

  const text = value => typeof value === "string" ? value.trim() : "";
  const normalize = value => String(value || "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  }

  function writeState(state) {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      return true;
    } catch { return false; }
  }

  const currentChannelId = (state = readState()) => text(state?.activeChannelId);

  function metaPages(state = readState()) {
    return Array.isArray(state?.settings?.metaPages)
      ? state.settings.metaPages
          .map(page => ({ id:text(String(page?.id || "")), name:text(page?.name) }))
          .filter(page => page.id && page.name)
      : [];
  }

  function currentTarget(state, channelId) {
    const mappings = state?.settings?.publishMappings;
    return mappings && typeof mappings === "object" ? mappings[channelId] || null : null;
  }

  function scorePage(channelName, page) {
    const c = normalize(channelName);
    const p = normalize(page.name);
    if (!c || !p) return 0;
    if (c === p) return 100;
    if (c.includes(p) || p.includes(c)) return 82;
    const ct = new Set(c.split(" ").filter(Boolean));
    const pt = new Set(p.split(" ").filter(Boolean));
    let overlap = 0;
    ct.forEach(token => { if (pt.has(token)) overlap += 1; });
    return overlap ? Math.round((overlap / Math.max(ct.size, pt.size)) * 60) : 0;
  }

  function ensureStyle() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    style.textContent = `
      #${PICKER_ID}{margin-top:12px;padding:12px;border:1px solid var(--line,#25324a);border-radius:14px;background:var(--panel3,#02081a);position:relative;z-index:20}
      #${PICKER_ID} .acc-page-search{width:100%;min-height:46px;margin:10px 0;padding:10px 12px;border:1px solid var(--line2,#40506a);border-radius:12px;background:var(--panel2,#071023);color:var(--text,#f8fafc);font-size:.78rem;outline:none}
      #${PICKER_ID} .acc-page-group-title{margin:11px 0 7px;color:var(--muted,#8390aa);font-size:.68rem;font-weight:900;letter-spacing:.08em}
      #${PICKER_ID} .acc-mobile-page-list{display:grid!important;gap:8px!important;margin-top:7px!important}
      #${PICKER_ID} .acc-mobile-page-btn{display:block!important;width:100%!important;min-height:58px!important;text-align:left!important;padding:11px 12px!important;border:1px solid var(--line2,#40506a)!important;border-radius:12px!important;background:var(--panel2,#071023)!important;color:var(--text,#f8fafc)!important;touch-action:manipulation!important;pointer-events:auto!important;-webkit-tap-highlight-color:transparent!important;position:relative!important;z-index:21!important}
      #${PICKER_ID} .acc-mobile-page-btn strong{display:block;font-size:.83rem}
      #${PICKER_ID} .acc-mobile-page-btn span{display:block;margin-top:4px;color:var(--muted,#8390aa);font-size:.66rem;overflow-wrap:anywhere}
      #${PICKER_ID} .acc-mobile-page-btn.recommended{border-color:#55e6a5!important;background:rgba(10,161,116,.15)!important}
      #${PICKER_ID} .acc-mobile-page-btn.current{border-color:#3b82f6!important;background:rgba(59,130,246,.12)!important}
      #${PICKER_ID} .acc-mobile-page-btn:active{transform:scale(.985)}
      #${PICKER_ID} .acc-mobile-page-btn[hidden]{display:none!important}
      #${PICKER_ID} .acc-direct-status{margin-top:10px;font-size:.66rem;color:var(--muted,#8390aa)}
    `;
  }

  function directMap(channelId, requestedPage) {
    const state = readState();
    if (!channelId || currentChannelId(state) !== channelId) {
      return { ok:false, message:"Active channel berubah. Buka channel ini lagi." };
    }

    const available = metaPages(state).find(page => page.id === String(requestedPage.id));
    if (!available) {
      return { ok:false, message:`Page ${requestedPage.name} belum tersedia dari hasil Meta sync.` };
    }

    state.settings = state.settings && typeof state.settings === "object" ? state.settings : {};
    const mappings = state.settings.publishMappings && typeof state.settings.publishMappings === "object"
      ? state.settings.publishMappings : {};

    state.settings.publishMappings = {
      ...mappings,
      [channelId]: {
        connector:"META_FACEBOOK",
        pageId:String(available.id),
        pageName:available.name,
        source:"OWNER_DIRECT_ANDROID_V4"
      }
    };

    if (!writeState(state)) return { ok:false, message:"Gagal menyimpan mapping ke PWA storage." };
    return { ok:true, page:available };
  }

  function makePageButton(channelId, page, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `acc-mobile-page-btn mono${options.recommended ? " recommended" : ""}${options.current ? " current" : ""}`;
    button.dataset.pageName = normalize(page.name);
    button.dataset.pageId = String(page.id);

    const strong = document.createElement("strong");
    strong.textContent = options.current
      ? `CURRENT → ${page.name}`
      : options.recommended
        ? `BEST MATCH → ${page.name}`
        : `LINK PAGE → ${page.name}`;

    const detail = document.createElement("span");
    detail.textContent = `Page ID ${page.id}`;
    button.append(strong, detail);

    if (options.current) {
      button.disabled = true;
      return button;
    }

    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) return;
      button.disabled = true;
      strong.textContent = `SAVING → ${page.name}`;

      const result = directMap(channelId, page);
      if (!result.ok) {
        button.disabled = false;
        strong.textContent = `ERROR — TAP AGAIN`;
        detail.textContent = result.message;
        return;
      }

      strong.textContent = `LINKED ✓ ${result.page.name}`;
      detail.textContent = `Page ID ${result.page.id} • reloading…`;
      setTimeout(() => location.reload(), 180);
    }, { passive:false });

    return button;
  }

  function patch() {
    ensureStyle();
    const card = document.getElementById(SAFE_CARD_ID);
    if (!card) {
      document.getElementById(PICKER_ID)?.remove();
      return;
    }

    const existing = card.querySelector(`#${PICKER_ID}`);
    if (existing?.dataset?.revision === REVISION) return;
    existing?.remove();

    const state = readState();
    const channelId = currentChannelId(state);
    if (!channelId) return;
    const pages = metaPages(state);
    if (!pages.length) return;

    const channelName = text(card.querySelector("h3.card-title")?.textContent) || channelId;
    const target = currentTarget(state, channelId);
    const confirmed = CONFIRMED_PAGE_BY_CHANNEL[channelId] || null;
    const confirmedPage = confirmed ? pages.find(page => page.id === confirmed.id) || null : null;

    const ranked = pages
      .map(page => ({ ...page, score:scorePage(channelName, page) }))
      .sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
    const recommended = confirmedPage || ranked.find(page => page.score >= 35) || null;

    const picker = document.createElement("div");
    picker.id = PICKER_ID;
    picker.className = "mono";
    picker.dataset.revision = REVISION;

    const label = document.createElement("div");
    label.className = "eyebrow";
    label.textContent = "DIRECT PAGE MAP • ANDROID SAFE V4";

    const help = document.createElement("div");
    help.className = "meta";
    help.style.marginTop = "4px";
    help.textContent = "Semua Facebook Page ditampilkan langsung. Tidak ada tombol SHOW/HIDE. Tap nama Page untuk link.";
    picker.append(label, help);

    if (target?.pageId) {
      const current = pages.find(page => page.id === String(target.pageId)) || {
        id:String(target.pageId), name:text(target.pageName) || "Facebook Page"
      };
      const title = document.createElement("div");
      title.className = "acc-page-group-title";
      title.textContent = "CURRENT MAPPING";
      const currentList = document.createElement("div");
      currentList.className = "acc-mobile-page-list";
      currentList.appendChild(makePageButton(channelId, current, { current:true }));
      picker.append(title, currentList);
    } else if (recommended) {
      const title = document.createElement("div");
      title.className = "acc-page-group-title";
      title.textContent = "BEST MATCH";
      const best = document.createElement("div");
      best.className = "acc-mobile-page-list";
      best.appendChild(makePageButton(channelId, recommended, { recommended:true }));
      picker.append(title, best);
    }

    if (!target?.pageId) {
      const search = document.createElement("input");
      search.type = "search";
      search.className = "acc-page-search mono";
      search.placeholder = `Cari dari ${pages.length} Facebook Pages…`;
      search.autocomplete = "off";
      picker.appendChild(search);

      const title = document.createElement("div");
      title.className = "acc-page-group-title";
      title.textContent = `ALL FACEBOOK PAGES (${pages.length})`;
      picker.appendChild(title);

      const all = document.createElement("div");
      all.className = "acc-mobile-page-list";
      ranked.forEach(page => all.appendChild(makePageButton(channelId, page, {
        recommended: !!recommended && page.id === recommended.id
      })));
      picker.appendChild(all);

      search.addEventListener("input", () => {
        const q = normalize(search.value);
        all.querySelectorAll(".acc-mobile-page-btn").forEach(button => {
          const hay = `${button.dataset.pageName || ""} ${button.dataset.pageId || ""}`;
          button.hidden = !!q && !hay.includes(q);
        });
      });
    }

    const status = document.createElement("div");
    status.className = "acc-direct-status";
    status.textContent = `Revision ${REVISION}`;
    picker.appendChild(status);

    const oldForm = card.querySelector("#publish-page-select")?.closest(".form-grid");
    if (oldForm) {
      oldForm.style.opacity = ".35";
      oldForm.style.pointerEvents = "none";
      oldForm.insertAdjacentElement("afterend", picker);
    } else {
      card.appendChild(picker);
    }
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      patch();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("pageshow", schedule);
  window.addEventListener("focus", schedule);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  window.ACCMobilePagePicker = { revision:REVISION, render:schedule };
  schedule();
})();
