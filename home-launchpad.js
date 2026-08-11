// ACC OS X — HOME LAUNCHPAD v1
// Scope: HOME presentation only. Registry remains in ACC CORE.
// No production, AI, Meta publishing, token, Page ID, or backend workflow logic is modified.
(() => {
  "use strict";

  const STYLE_ID = "acc-home-launchpad-style";
  const LAUNCHPAD_ID = "acc-home-launchpad";
  const MODAL_ID = "acc-home-module-modal";

  const modules = {
    trading: {
      kicker: "ACC FINANCE // TRADING",
      title: "KAI TRAD",
      status: "FOUNDATION READY",
      accent: "#55e6a5",
      description: "Trading Command Center untuk robot trading, signal validation, risk control, journal, dan performance monitoring.",
      slots: ["Trading Dashboard", "Strategy Engine", "Risk Control", "Bot Status", "Trade Journal", "Performance Analytics"]
    },
    entego: {
      kicker: "ACC BUSINESS // STARTUP",
      title: "ENTEGO",
      status: "WORKSPACE READY",
      accent: "#67e8f9",
      description: "Startup Operations workspace untuk Customer, Mitra, Admin, service flow, transaksi, dan operational monitoring.",
      slots: ["Customer App", "Mitra App", "Admin Center", "Service Flow", "Order & Transaction", "Operations Monitor"]
    },
    studio: {
      kicker: "AM STUDIO // COMIC LIBRARY",
      title: "AM STUDIO",
      status: "READER FOUNDATION",
      accent: "#c28aff",
      description: "Library pribadi ACC untuk membaca komik dan IP AM STUDIO langsung dari ACC OS X.",
      slots: ["Arda Moron Universe", "13 Pintu Neraka", "Sun Gokong", "Legenda Ling Tian", "The Legendary Decks", "Comic Reader"]
    }
  };

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .acc-home-launchpad{margin-top:22px}
      .acc-launch-head{display:flex;align-items:end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}
      .acc-launch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .acc-launch-card{position:relative;overflow:hidden;text-align:left;min-height:188px;padding:17px;border-radius:20px;border:1px solid var(--line,#25324a);background:linear-gradient(160deg,var(--panel,#10192d),var(--panel2,#071023));color:var(--text,#f8fafc);appearance:none}
      .acc-launch-card:before{content:"";position:absolute;inset:auto -30px -60px auto;width:150px;height:150px;border-radius:999px;background:var(--launch-accent);opacity:.09;filter:blur(2px)}
      .acc-launch-card:active{transform:scale(.99)}
      .acc-launch-icon{width:44px;height:44px;display:grid;place-items:center;border-radius:14px;border:1px solid color-mix(in srgb,var(--launch-accent) 40%,transparent);background:color-mix(in srgb,var(--launch-accent) 12%,transparent);color:var(--launch-accent);font-size:1.18rem;font-weight:900}
      .acc-launch-title{font-size:1.18rem;font-weight:900;margin-top:14px;letter-spacing:.04em}
      .acc-launch-desc{font-size:.76rem;color:var(--muted,#8390aa);margin-top:7px;line-height:1.5}
      .acc-launch-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:17px}
      .acc-launch-open{color:var(--launch-accent);font-size:.72rem;font-weight:900;letter-spacing:.06em}
      .acc-module-modal-wrap{position:fixed;inset:0;z-index:12000;background:rgba(0,0,0,.76);display:grid;place-items:center;padding:14px}
      .acc-module-modal{width:min(94vw,760px);max-height:90vh;overflow:auto;border-radius:24px;border:1px solid var(--line2,#40506a);background:linear-gradient(180deg,var(--panel,#10192d),var(--bg,#020617));padding:18px;color:var(--text,#f8fafc);box-shadow:0 24px 80px rgba(0,0,0,.45)}
      .acc-module-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
      .acc-module-close{width:40px;height:40px;border-radius:12px;border:1px solid var(--line2,#40506a);background:var(--panel2,#071023);color:var(--text,#f8fafc);font-weight:900}
      .acc-slot-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:16px}
      .acc-slot{padding:13px;border-radius:14px;border:1px solid var(--line,#25324a);background:rgba(0,0,0,.16)}
      .acc-slot-name{font-weight:900;font-size:.84rem}
      .acc-slot-state{margin-top:5px;font-size:.66rem;color:var(--muted,#8390aa)}
      .acc-reader-note{margin-top:14px;padding:12px;border-radius:14px;border:1px solid rgba(194,138,255,.25);background:rgba(112,55,170,.12);font-size:.75rem;color:#d9c1ff}
      @media(max-width:760px){.acc-launch-grid{grid-template-columns:1fr}.acc-launch-card{min-height:160px}.acc-slot-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function moduleCard(key, icon) {
    const m = modules[key];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "acc-launch-card mono";
    button.dataset.homeModule = key;
    button.style.setProperty("--launch-accent", m.accent);
    button.innerHTML = `
      <div class="acc-launch-icon">${icon}</div>
      <div class="eyebrow" style="margin-top:13px">${m.kicker}</div>
      <div class="acc-launch-title">${m.title}</div>
      <div class="acc-launch-desc">${m.description}</div>
      <div class="acc-launch-foot"><span class="badge">${m.status}</span><span class="acc-launch-open">OPEN →</span></div>
    `;
    button.addEventListener("click", () => openModule(key));
    return button;
  }

  function openModule(key) {
    closeModule();
    const m = modules[key];
    if (!m) return;
    const wrap = document.createElement("div");
    wrap.id = MODAL_ID;
    wrap.className = "acc-module-modal-wrap mono";
    const readerNote = key === "studio"
      ? `<div class="acc-reader-note">COMIC READER FOUNDATION // Slot ini disiapkan untuk cover, episode library, page reader, bookmark, dan continue-reading. File komik akan ditautkan ke Asset Library saat reader backend diaktifkan.</div>`
      : "";
    wrap.innerHTML = `
      <div class="acc-module-modal" role="dialog" aria-modal="true" aria-label="${m.title}">
        <div class="acc-module-top">
          <div>
            <div class="eyebrow">${m.kicker}</div>
            <h2 class="card-title" style="margin-top:5px;color:${m.accent}">${m.title}</h2>
            <p class="muted small" style="margin:9px 0 0">${m.description}</p>
          </div>
          <button type="button" class="acc-module-close" aria-label="Close">×</button>
        </div>
        <div class="acc-slot-grid">
          ${m.slots.map(slot => `<div class="acc-slot"><div class="acc-slot-name">${slot}</div><div class="acc-slot-state">FOUNDATION SLOT • READY FOR BUILD</div></div>`).join("")}
        </div>
        ${readerNote}
      </div>
    `;
    wrap.querySelector(".acc-module-close")?.addEventListener("click", closeModule);
    wrap.addEventListener("click", e => { if (e.target === wrap) closeModule(); });
    document.body.appendChild(wrap);
  }

  function closeModule() {
    document.getElementById(MODAL_ID)?.remove();
  }

  function buildLaunchpad() {
    const box = document.createElement("div");
    box.id = LAUNCHPAD_ID;
    box.className = "acc-home-launchpad mono";
    box.innerHTML = `
      <div class="acc-launch-head">
        <div><div class="eyebrow">ACC PERSONAL COMMAND WORKSPACES</div><h2 class="card-title" style="margin-top:5px">OWNER LAUNCHPAD</h2><p class="muted small" style="margin:7px 0 0">HOME untuk workspace yang paling sering dipakai. Registry lengkap tetap di ACC CORE.</p></div>
        <span class="badge">3 WORKSPACES</span>
      </div>
      <div class="acc-launch-grid"></div>
    `;
    const grid = box.querySelector(".acc-launch-grid");
    grid.append(moduleCard("trading", "↗"), moduleCard("entego", "E"), moduleCard("studio", "AM"));
    return box;
  }

  function patchHome() {
    ensureStyle();
    const hero = document.querySelector(".acc250-hero");
    if (!hero) return;
    const section = hero.closest("section");
    if (!section) return;

    const registryButton = section.querySelector('button[data-action="module-tab-system"][data-value="registry"]');
    if (registryButton) registryButton.parentElement?.remove();

    [...section.querySelectorAll(".card")].forEach(card => {
      const eyebrow = card.querySelector(".eyebrow");
      if (eyebrow && eyebrow.textContent.trim().toUpperCase() === "CLASSIFICATION POLICY") card.remove();
    });

    if (section.querySelector(`#${LAUNCHPAD_ID}`)) return;
    const stats = section.querySelector(".grid.stats");
    const launchpad = buildLaunchpad();
    if (stats) stats.insertAdjacentElement("afterend", launchpad);
    else hero.insertAdjacentElement("afterend", launchpad);
  }

  let queued = false;
  const schedulePatch = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      patchHome();
    });
  };

  const observer = new MutationObserver(schedulePatch);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModule(); });
  schedulePatch();
})();
