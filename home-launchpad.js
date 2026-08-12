// ACC OS X — HOME DIRECT DIVISION LAUNCHPAD v3
// HOME presentation/integration only. ACC CORE remains registry/detail center.
// Division appUrl from ACC Sync Hub is authoritative; fallback URLs only cover first-load sync delay.
(() => {
  "use strict";

  const STYLE_ID = "acc-home-launchpad-style";
  const LAUNCHPAD_ID = "acc-home-launchpad";

  const modules = {
    trading: {
      kicker: "ACC FINANCE // TRADING",
      title: "KAI TRAD",
      status: "FOUNDATION READY",
      accent: "#55e6a5",
      description: "Trading Command Center untuk robot trading, signal validation, risk control, journal, dan performance monitoring.",
      fallbackUrl: "https://kai-trad-pwa.ardarawk.workers.dev/"
    },
    entego: {
      kicker: "ACC BUSINESS // STARTUP",
      title: "ENTEGO",
      status: "WORKSPACE READY",
      accent: "#67e8f9",
      description: "Startup Operations workspace untuk Customer, Mitra, Admin, service flow, transaksi, dan operational monitoring.",
      fallbackUrl: "https://entego-pwa.ardarawk.workers.dev/"
    },
    studio: {
      kicker: "AM STUDIO // COMIC LIBRARY",
      title: "AM STUDIO",
      status: "READER FOUNDATION",
      accent: "#c28aff",
      description: "Library pribadi ACC untuk membaca komik dan IP AM STUDIO langsung dari ACC OS X.",
      fallbackUrl: "https://am-studio-pwa.ardarawk.workers.dev/"
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
      @media(max-width:760px){.acc-launch-grid{grid-template-columns:1fr}.acc-launch-card{min-height:160px}}
    `;
    document.head.appendChild(style);
  }

  async function launchDivision(key) {
    const module = modules[key];
    if (!module) return;

    const card = document.querySelector(`[data-home-module="${key}"]`);
    const openLabel = card?.querySelector(".acc-launch-open");
    const previous = openLabel?.textContent || "OPEN →";
    if (openLabel) openLabel.textContent = "OPENING…";

    try {
      if (window.ACCSyncHub?.refresh) {
        await Promise.race([
          window.ACCSyncHub.refresh(),
          new Promise(resolve => setTimeout(resolve, 1200))
        ]);
      }
      const state = window.ACCSyncHub?.getState?.() || {};
      const syncedUrl = state?.[key]?.manifest?.appUrl;
      const target = syncedUrl || module.fallbackUrl;
      window.location.assign(target);
    } catch {
      window.location.assign(module.fallbackUrl);
    } finally {
      if (openLabel) openLabel.textContent = previous;
    }
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
      <div class="acc-launch-foot"><span class="badge">${m.status}</span><span class="acc-launch-open">OPEN WEB →</span></div>
    `;
    button.addEventListener("click", () => launchDivision(key));
    return button;
  }

  function buildLaunchpad() {
    const box = document.createElement("div");
    box.id = LAUNCHPAD_ID;
    box.className = "acc-home-launchpad mono";
    box.innerHTML = `
      <div class="acc-launch-head">
        <div><div class="eyebrow">ACC PERSONAL COMMAND WORKSPACES</div><h2 class="card-title" style="margin-top:5px">OWNER LAUNCHPAD</h2><p class="muted small" style="margin:7px 0 0">1 tap langsung ke HOME web masing-masing divisi. Registry lengkap tetap di ACC CORE.</p></div>
        <span class="badge">3 DIRECT LINKS</span>
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

    section.querySelector(".grid.stats")?.remove();
    if (section.querySelector(`#${LAUNCHPAD_ID}`)) return;
    hero.insertAdjacentElement("afterend", buildLaunchpad());
    window.ACCSyncHub?.patchCards?.();
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

  const observer = new MutationObserver(() => {
    if (document.getElementById(LAUNCHPAD_ID)) return;
    schedulePatch();
  });
  observer.observe(document.documentElement, { childList:true, subtree:true });
  schedulePatch();
})();

(() => {
  if (document.querySelector('script[data-acc-sync-hub="v2"]')) return;
  const script = document.createElement("script");
  script.src = "./division-sync-hub-v2.js";
  script.dataset.accSyncHub = "v2";
  script.async = true;
  document.head.appendChild(script);
})();

// BUILD 253 — versioned Studio Poster Renderer + KAI Creative Client bridge.
(() => {
  const current = document.querySelector('script[data-acc-studio-poster]');
  if (!current || current.dataset.accStudioPoster !== "v2.53") {
    if (current) current.remove();
    const renderer = document.createElement("script");
    renderer.src = "./poster-studio-v1.js?rev=BUILD253_KAI_CREATIVE";
    renderer.dataset.accStudioPoster = "v2.53";
    renderer.async = false;
    document.head.appendChild(renderer);
  }

  if (!document.querySelector('script[data-acc-kai-creative="v1"]')) {
    const bridge = document.createElement("script");
    bridge.src = "./kai-creative-client.js?rev=BUILD253_KAI_CREATIVE_CLIENT_V1";
    bridge.dataset.accKaiCreative = "v1";
    bridge.async = false;
    document.head.appendChild(bridge);
  }
})();

// PWA OWNER SAFETY v1 — presentation/sound/brand convenience only.
// No AI engine, production Worker or Meta publishing connector changes.
(() => {
  if (document.querySelector('script[data-acc-owner-safety="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./pwa-owner-safety-v1.js?rev=PWA_OWNER_SAFETY_V1";
  script.dataset.accOwnerSafety = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// BUILD 256 — release identity bridge. Keeps installed PWA identity and data schema stable.
(() => {
  if (document.querySelector('script[data-acc-release="v256"]')) return;
  const script = document.createElement("script");
  script.src = "./release-version-v256.js?rev=BUILD256_RELEASE_SYNC";
  script.dataset.accRelease = "v256";
  script.async = false;
  document.head.appendChild(script);
})();
