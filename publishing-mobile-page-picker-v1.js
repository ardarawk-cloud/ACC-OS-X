// KAI ONE — Publishing Hub Mobile Page Picker v3
// Android-safe direct owner mapping. Does not depend on native <select>, <details>, or the legacy click handler.
(() => {
  "use strict";

  const REVISION = "KAI_ONE_DIRECT_OWNER_PAGE_MAP_V3_ANDROID_TOGGLE";
  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const SAFE_CARD_ID = "acc-safe-publish-admin";
  const PICKER_ID = "acc-mobile-page-picker-v1";
  const STYLE_ID = "acc-mobile-page-picker-style-v3";

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

  function currentChannelId(state = readState()) {
    return text(state?.activeChannelId);
  }

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

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PICKER_ID}{margin-top:12px;padding:12px;border:1px solid var(--line,#25324a);border-radius:14px;background:var(--panel3,#02081a);position:relative;z-index:4}
      #${PICKER_ID} .acc-mobile-page-list{display:grid;gap:8px;margin-top:9px}
      #${PICKER_ID} .acc-mobile-page-btn{width:100%;min-height:58px;text-align:left;padding:11px 12px;border:1px solid var(--line2,#40506a);border-radius:12px;background:var(--panel2,#071023);color:var(--text,#f8fafc);touch-action:manipulation;pointer-events:auto;-webkit-tap-highlight-color:transparent}
      #${PICKER_ID} .acc-mobile-page-btn strong{display:block;font-size:.83rem}
      #${PICKER_ID} .acc-mobile-page-btn span{display:block;margin-top:4px;color:var(--muted,#8390aa);font-size:.66rem;overflow-wrap:anywhere}
      #${PICKER_ID} .acc-mobile-page-btn.recommended{border-color:#55e6a5;background:rgba(10,161,116,.15)}
      #${PICKER_ID} .acc-mobile-page-btn.current{border-color:#3b82f6;background:rgba(59,130,246,.12)}
      #${PICKER_ID} .acc-mobile-page-btn:disabled{opacity:.72}
      #${PICKER_ID} .acc-mobile-pages-toggle{width:100%;min-height:48px;margin-top:10px;padding:10px 12px;text-align:left;border:1px solid var(--line,#25324a);border-radius:12px;background:transparent;color:var(--muted,#8390aa);font-size:.72rem;font-weight:900;letter-spacing:.05em;touch-action:manipulation;pointer-events:auto;-webkit-tap-highlight-color:transparent}
      #${PICKER_ID} .acc-direct-status{margin-top:8px;font-size:.7rem;color:var(--muted,#8390aa)}
    `;
    document.head.appendChild(style);
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
      ? state.settings.publishMappings
      : {};

    state.settings.publishMappings = {
      ...mappings,
      [channelId]: {
        connector:"META_FACEBOOK",
        pageId:String(available.id),
        pageName:available.name,
        source:"OWNER_DIRECT_ANDROID"
      }
    };

    if (!writeState(state)) return { ok:false, message:"Gagal menyimpan mapping ke PWA storage." };
    return { ok:true, page:available };
  }

  function makePageButton(channelId, page, options = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `acc-mobile-page-btn mono${options.recommended ? " recommended" : ""}${options.current ? " current" : ""}`;

    const strong = document.createElement("strong");
    strong.textContent = options.current
      ? `CURRENT → ${page.name}`
      : options.recommended
        ? `LINK NOW → ${page.name}`
        : `LINK PAGE → ${page.name}`;

    const detail = document.createElement("span");
    detail.textContent = `Page ID ${page.id}${options.recommended ? " • OWNER CONFIRMED" : ""}`;
    button.append(strong, detail);

    if (options.current) {
      button.disabled = true;
      return button;
    }

    let handled = false;
    const apply = event => {
      event.preventDefault();
      event.stopPropagation();
      if (handled) return;
      handled = true;
      button.disabled = true;
      strong.textContent = `SAVING → ${page.name}`;

      const result = directMap(channelId, page);
      if (!result.ok) {
        handled = false;
        button.disabled = false;
        strong.textContent = `ERROR — TAP AGAIN`;
        detail.textContent = result.message;
        return;
      }

      strong.textContent = `LINKED ✓ ${result.page.name}`;
      detail.textContent = `Page ID ${result.page.id} • reloading…`;
      setTimeout(() => location.reload(), 120);
    };

    button.addEventListener("pointerdown", apply, { passive:false });
    button.addEventListener("touchstart", apply, { passive:false });
    button.addEventListener("mousedown", apply, { passive:false });
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      if (!handled) apply(event);
    });
    return button;
  }

  function makeListToggle(list, count) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "acc-mobile-pages-toggle mono";
    let expanded = false;
    let lastToggleAt = 0;

    const render = () => {
      button.textContent = `${expanded ? "HIDE" : "SHOW ALL"} FACEBOOK PAGES (${count})`;
      button.setAttribute("aria-expanded", expanded ? "true" : "false");
      list.style.setProperty("display", expanded ? "grid" : "none", "important");
    };

    const toggle = event => {
      event.preventDefault();
      event.stopPropagation();
      const now = Date.now();
      if (now - lastToggleAt < 320) return;
      lastToggleAt = now;
      expanded = !expanded;
      render();
    };

    button.addEventListener("pointerdown", toggle, { passive:false });
    button.addEventListener("touchstart", toggle, { passive:false });
    button.addEventListener("mousedown", toggle, { passive:false });
    button.addEventListener("click", toggle, { passive:false });
    render();
    return button;
  }

  function patch() {
    ensureStyle();
    const card = document.getElementById(SAFE_CARD_ID);
    if (!card) {
      document.getElementById(PICKER_ID)?.remove();
      return;
    }
    if (card.querySelector(`#${PICKER_ID}`)) return;

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
    label.textContent = "DIRECT PAGE MAP • ANDROID SAFE";

    const help = document.createElement("div");
    help.className = "meta";
    help.style.marginTop = "4px";
    help.textContent = "Tidak memakai dropdown. Tap tombol Page untuk menyimpan mapping langsung ke PWA.";
    picker.append(label, help);

    const primary = document.createElement("div");
    primary.className = "acc-mobile-page-list";

    if (target?.pageId) {
      const current = pages.find(page => page.id === String(target.pageId)) || { id:String(target.pageId), name:text(target.pageName) || "Facebook Page" };
      primary.appendChild(makePageButton(channelId, current, { current:true }));
    } else if (recommended) {
      primary.appendChild(makePageButton(channelId, recommended, { recommended:true }));
    }
    picker.appendChild(primary);

    const remaining = ranked.filter(page => {
      if (target?.pageId && page.id === String(target.pageId)) return false;
      if (!target?.pageId && recommended && page.id === recommended.id) return false;
      return true;
    });

    if (!target?.pageId && remaining.length) {
      const all = document.createElement("div");
      all.className = "acc-mobile-page-list";
      remaining.forEach(page => all.appendChild(makePageButton(channelId, page)));
      picker.append(makeListToggle(all, remaining.length), all);
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

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener("pageshow", schedule);
  window.addEventListener("focus", schedule);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  schedule();
})();
