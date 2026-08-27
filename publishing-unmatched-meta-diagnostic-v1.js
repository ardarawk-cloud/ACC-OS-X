// KAI ONE — Publishing Hub Unmatched Meta Diagnostic v1
// Presentation/diagnostic only. Never auto-links or mutates publish mappings.
(() => {
  "use strict";

  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const CARD_ID = "acc-unmatched-meta-diagnostic-v1";
  const STYLE_ID = "acc-unmatched-meta-diagnostic-style-v1";

  const readState = () => {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); }
    catch { return {}; }
  };

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${CARD_ID}{margin-top:14px;background:color-mix(in srgb,var(--panel2,#071023) 78%,transparent)}
      #${CARD_ID} .acc-meta-diag-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
      #${CARD_ID} .acc-meta-diag-col{display:grid;gap:8px;align-content:start}
      #${CARD_ID} .acc-meta-diag-row{padding:11px 12px;border:1px solid var(--line,#25324a);border-radius:13px;background:var(--panel3,#02081a)}
      #${CARD_ID} .acc-meta-diag-name{font-weight:900;line-height:1.3}
      #${CARD_ID} .acc-meta-diag-id{margin-top:4px;color:var(--muted,#8390aa);font-size:.72rem;overflow-wrap:anywhere}
      #${CARD_ID} .acc-meta-diag-empty{padding:12px;border:1px dashed var(--line2,#40506a);border-radius:13px;color:var(--muted,#8390aa);font-size:.76rem}
      #${CARD_ID} .acc-meta-diag-copy{margin-top:8px;min-height:32px;padding:5px 9px;font-size:.64rem;width:auto!important}
      @media(max-width:760px){#${CARD_ID} .acc-meta-diag-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function publishingSection() {
    return [...document.querySelectorAll("section.section")].find(section =>
      section.querySelector("h2.card-title")?.textContent?.trim().toUpperCase() === "PUBLISHING HUB"
    ) || null;
  }

  function discoveredPages() {
    const state = readState();
    const pages = Array.isArray(state?.settings?.metaPages) ? state.settings.metaPages : [];
    return pages
      .map(page => ({
        id: String(page?.id || "").trim(),
        name: String(page?.name || "").trim(),
        instagramBusinessAccount: page?.instagramBusinessAccount || page?.instagram_business_account || null,
      }))
      .filter(page => page.id && page.name);
  }

  function mappedPageIds(section) {
    const ids = new Set();
    const state = readState();
    const mappings = state?.settings?.publishMappings && typeof state.settings.publishMappings === "object"
      ? state.settings.publishMappings
      : {};

    Object.values(mappings).forEach(target => {
      const id = String(target?.pageId || "").trim();
      if (id) ids.add(id);
    });

    // Include bootstrap/legacy mappings rendered READY by app.js even when they are not persisted.
    section.querySelectorAll("button.item").forEach(item => {
      const eyebrow = item.querySelector(".eyebrow")?.textContent || "";
      const status = item.querySelector(".status")?.textContent?.trim().toUpperCase() || "";
      if (!/FACEBOOK/i.test(eyebrow) || status !== "READY") return;
      const meta = item.querySelector(".meta")?.textContent || "";
      const matches = meta.match(/\b\d{8,25}\b/g) || [];
      matches.forEach(id => ids.add(id));
    });
    return ids;
  }

  function unlinkedFacebookChannels(section) {
    const rows = [];
    section.querySelectorAll("button.item").forEach(item => {
      const eyebrow = item.querySelector(".eyebrow")?.textContent || "";
      const status = item.querySelector(".status")?.textContent?.trim().toUpperCase() || "";
      if (!/FACEBOOK/i.test(eyebrow) || status !== "UNLINKED") return;
      const name = item.querySelector(".item-title")?.textContent?.trim();
      const code = eyebrow.split("•")[0]?.trim() || "";
      if (name) rows.push({ name, code });
    });
    return rows;
  }

  function makeRow(title, detail, copyValue = "") {
    const row = document.createElement("div");
    row.className = "acc-meta-diag-row";

    const name = document.createElement("div");
    name.className = "acc-meta-diag-name";
    name.textContent = title;
    row.appendChild(name);

    const meta = document.createElement("div");
    meta.className = "acc-meta-diag-id";
    meta.textContent = detail;
    row.appendChild(meta);

    if (copyValue) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn dark mono acc-meta-diag-copy";
      button.textContent = "COPY PAGE ID";
      button.addEventListener("click", async event => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(copyValue);
          button.textContent = "COPIED";
          setTimeout(() => { button.textContent = "COPY PAGE ID"; }, 1200);
        } catch {
          button.textContent = copyValue;
        }
      });
      row.appendChild(button);
    }
    return row;
  }

  function makeEmpty(text) {
    const empty = document.createElement("div");
    empty.className = "acc-meta-diag-empty";
    empty.textContent = text;
    return empty;
  }

  function render() {
    ensureStyle();
    const section = publishingSection();
    if (!section) {
      document.getElementById(CARD_ID)?.remove();
      return;
    }

    const summary = section.querySelector(":scope > .card");
    if (!summary) return;

    const pages = discoveredPages();
    const mappedIds = mappedPageIds(section);
    const unmatched = pages.filter(page => !mappedIds.has(page.id));
    const unlinked = unlinkedFacebookChannels(section);

    let card = document.getElementById(CARD_ID);
    if (!card) {
      card = document.createElement("div");
      card.id = CARD_ID;
      card.className = "card mono";
      summary.insertAdjacentElement("afterend", card);
    }

    card.textContent = "";

    const top = document.createElement("div");
    top.className = "row between wrap";
    const copy = document.createElement("div");
    const eyebrow = document.createElement("div");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "META MAPPING DIAGNOSTIC • READ ONLY";
    const title = document.createElement("div");
    title.className = "item-title";
    title.style.marginTop = "4px";
    title.textContent = "UNMATCHED META PAGES";
    const help = document.createElement("div");
    help.className = "meta";
    help.style.marginTop = "5px";
    help.textContent = "Pages discovered by Meta but not assigned to a READY Facebook channel. No automatic mapping is performed here.";
    copy.append(eyebrow, title, help);
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = `${unmatched.length} UNMATCHED`;
    top.append(copy, badge);
    card.appendChild(top);

    const grid = document.createElement("div");
    grid.className = "acc-meta-diag-grid";

    const left = document.createElement("div");
    left.className = "acc-meta-diag-col";
    const leftLabel = document.createElement("div");
    leftLabel.className = "eyebrow";
    leftLabel.textContent = `AVAILABLE META PAGES • ${unmatched.length}`;
    left.appendChild(leftLabel);
    if (!unmatched.length) {
      left.appendChild(makeEmpty("No unmatched Facebook Pages. All discovered Pages are already mapped."));
    } else {
      unmatched.forEach(page => {
        const ig = page.instagramBusinessAccount;
        const igText = ig?.id ? ` • IG ${ig.username ? `@${ig.username} • ` : ""}${ig.id}` : "";
        left.appendChild(makeRow(page.name, `Page ID ${page.id}${igText}`, page.id));
      });
    }

    const right = document.createElement("div");
    right.className = "acc-meta-diag-col";
    const rightLabel = document.createElement("div");
    rightLabel.className = "eyebrow";
    rightLabel.textContent = `UNLINKED FACEBOOK CHANNELS • ${unlinked.length}`;
    right.appendChild(rightLabel);
    if (!unlinked.length) {
      right.appendChild(makeEmpty("No unlinked Facebook channels in the current Publishing Hub."));
    } else {
      unlinked.forEach(channel => right.appendChild(makeRow(channel.name, `${channel.code || "FACEBOOK"} • open the channel to choose a Page manually`)));
    }

    grid.append(left, right);
    card.appendChild(grid);
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      render();
    });
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("storage", schedule);
  document.addEventListener("click", event => {
    const action = event.target?.closest?.("[data-action]")?.getAttribute("data-action") || "";
    if (["sync-meta-pages", "link-publish-page", "unlink-publish-page", "module-tab-system", "open-channel"].includes(action)) {
      setTimeout(schedule, 100);
      setTimeout(schedule, 700);
    }
  }, true);
  schedule();
})();
