// KAI ONE — Publishing Hub Mobile Page Picker v1
// Adds tap-safe page buttons under the owner mapping card for Android/WebView
// environments where the native <select> popup is unreliable.
(() => {
  "use strict";

  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const SAFE_CARD_ID = "acc-safe-publish-admin";
  const PICKER_ID = "acc-mobile-page-picker-v1";
  const STYLE_ID = "acc-mobile-page-picker-style-v1";

  const CONFIRMED_PAGE_BY_CHANNEL = {
    "ch-arda-gaming": "1296361826889422",
    "ch-mr-laziz": "102412098142218"
  };

  const text = value => typeof value === "string" ? value.trim() : "";
  const normalize = value => String(value || "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  function readState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); }
    catch { return {}; }
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PICKER_ID}{margin-top:12px;padding:12px;border:1px solid var(--line,#25324a);border-radius:14px;background:var(--panel3,#02081a)}
      #${PICKER_ID} .acc-mobile-page-list{display:grid;gap:8px;margin-top:9px}
      #${PICKER_ID} .acc-mobile-page-btn{width:100%;min-height:54px;text-align:left;padding:10px 12px;border:1px solid var(--line2,#40506a);border-radius:12px;background:var(--panel2,#071023);color:var(--text,#f8fafc)}
      #${PICKER_ID} .acc-mobile-page-btn strong{display:block;font-size:.83rem}
      #${PICKER_ID} .acc-mobile-page-btn span{display:block;margin-top:3px;color:var(--muted,#8390aa);font-size:.66rem}
      #${PICKER_ID} .acc-mobile-page-btn.recommended{border-color:#55e6a5;background:rgba(10,161,116,.13)}
      #${PICKER_ID} details{margin-top:10px}
      #${PICKER_ID} summary{cursor:pointer;color:var(--muted,#8390aa);font-size:.72rem;font-weight:900;letter-spacing:.05em}
    `;
    document.head.appendChild(style);
  }

  function currentChannelId() {
    return text(readState()?.activeChannelId);
  }

  function optionRows(select) {
    return [...(select?.options || [])]
      .map(option => ({ id:text(option.value), name:text(option.textContent) }))
      .filter(row => row.id && row.name);
  }

  function scorePage(channelName, row) {
    const c = normalize(channelName);
    const p = normalize(row.name);
    if (!c || !p) return 0;
    if (c === p) return 100;
    if (c.includes(p) || p.includes(c)) return 80;
    const ct = new Set(c.split(" ").filter(Boolean));
    const pt = new Set(p.split(" ").filter(Boolean));
    let overlap = 0;
    ct.forEach(token => { if (pt.has(token)) overlap += 1; });
    return overlap ? Math.round((overlap / Math.max(ct.size, pt.size)) * 60) : 0;
  }

  function invokeRealLink(card, select, pageId) {
    select.value = pageId;
    select.dispatchEvent(new Event("change", { bubbles:true }));
    const realLink = card.querySelector('[data-action="link-publish-page"]');
    if (!realLink) return;
    realLink.click();
  }

  function pageButton(card, select, row, recommended = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `acc-mobile-page-btn mono${recommended ? " recommended" : ""}`;
    button.innerHTML = `<strong>${recommended ? "LINK → " : "LINK PAGE → "}${row.name}</strong><span>Page ID ${row.id}${recommended ? " • RECOMMENDED" : ""}</span>`;
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      button.disabled = true;
      button.querySelector("strong").textContent = `LINKING → ${row.name}`;
      invokeRealLink(card, select, row.id);
      setTimeout(() => { if (button.isConnected) button.disabled = false; }, 1200);
    });
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

    const select = card.querySelector("#publish-page-select");
    if (!select) return;
    const rows = optionRows(select);
    if (!rows.length) return;

    const channelId = currentChannelId();
    const channelName = text(card.querySelector("h3.card-title")?.textContent) || channelId;
    const confirmedId = CONFIRMED_PAGE_BY_CHANNEL[channelId] || "";
    const confirmed = confirmedId ? rows.find(row => row.id === confirmedId) : null;

    const ranked = rows
      .map(row => ({ ...row, score:scorePage(channelName, row) }))
      .sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
    const recommended = confirmed || ranked.find(row => row.score >= 35) || null;

    const picker = document.createElement("div");
    picker.id = PICKER_ID;
    picker.className = "mono";

    const label = document.createElement("div");
    label.className = "eyebrow";
    label.textContent = "MOBILE QUICK PICK • TAP-SAFE";
    picker.appendChild(label);

    const help = document.createElement("div");
    help.className = "meta";
    help.style.marginTop = "4px";
    help.textContent = "Alternatif tombol untuk Android jika dropdown Select Facebook Page tidak merespons.";
    picker.appendChild(help);

    const primary = document.createElement("div");
    primary.className = "acc-mobile-page-list";
    if (recommended) primary.appendChild(pageButton(card, select, recommended, true));
    picker.appendChild(primary);

    const remaining = ranked.filter(row => !recommended || row.id !== recommended.id);
    if (remaining.length) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = `SHOW ALL FACEBOOK PAGES (${remaining.length})`;
      details.appendChild(summary);
      const all = document.createElement("div");
      all.className = "acc-mobile-page-list";
      remaining.forEach(row => all.appendChild(pageButton(card, select, row, false)));
      details.appendChild(all);
      picker.appendChild(details);
    }

    const form = select.closest(".form-grid") || select.parentElement;
    form?.insertAdjacentElement("afterend", picker);
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
  document.addEventListener("click", event => {
    const action = event.target?.closest?.("[data-action]")?.getAttribute("data-action") || "";
    if (["open-channel","module-tab-system","sync-meta-pages","link-publish-page"].includes(action)) {
      setTimeout(schedule, 80);
      setTimeout(schedule, 500);
    }
  }, true);
  schedule();
})();
