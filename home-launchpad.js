// ACC OS X — HOME DIRECT DIVISION LAUNCHPAD v4
// Compact app-launcher presentation only. No new divisions/apps are added to ACC OS X.
// Division appUrl from ACC Sync Hub remains authoritative; fallbacks only cover sync delay.
(() => {
  "use strict";

  const STYLE_ID = "acc-home-launchpad-style";
  const LAUNCHPAD_ID = "acc-home-launchpad";

  const modules = {
    trading: {
      title: "KAI TRAD",
      accent: "#55e6a5",
      iconUrl: "https://kai-trad-pwa.ardarawk.workers.dev/kai-trad-logo.png",
      iconFallback: "K",
      fallbackUrl: "https://kai-trad-pwa.ardarawk.workers.dev/"
    },
    entego: {
      title: "ENTEGO",
      accent: "#67e8f9",
      iconUrl: "https://entego-pwa.ardarawk.workers.dev/icon-512.png?v=79",
      iconFallback: "E",
      fallbackUrl: "https://entego-pwa.ardarawk.workers.dev/"
    },
    studio: {
      title: "AM STUDIO",
      accent: "#c28aff",
      iconUrl: "https://am-studio-pwa.ardarawk.workers.dev/icon.svg",
      iconFallback: "AM",
      fallbackUrl: "https://am-studio-pwa.ardarawk.workers.dev/"
    }
  };

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .acc-home-launchpad{margin-top:18px;padding:14px 10px 8px;border-radius:20px;border:1px solid var(--line,#25324a);background:color-mix(in srgb,var(--panel,#10192d) 52%,transparent)}
      .acc-launch-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;padding:0 4px}
      .acc-launch-head .card-title{font-size:.94rem;letter-spacing:.05em}
      .acc-launch-head .muted{display:none}
      .acc-launch-head .badge{min-height:24px;padding:3px 8px;font-size:.6rem}
      .acc-launch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px 7px;align-items:start}
      .acc-launch-card{position:relative;appearance:none;border:0;background:transparent;color:var(--text,#f8fafc);padding:7px 3px 9px;min-width:0;min-height:118px;text-align:center;border-radius:18px;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      .acc-launch-card:active{background:color-mix(in srgb,var(--launch-accent) 8%,transparent);transform:scale(.97)}
      .acc-launch-icon{position:relative;width:72px;height:72px;margin:0 auto;display:grid;place-items:center;overflow:hidden;border-radius:21px;border:1px solid color-mix(in srgb,var(--launch-accent) 38%,var(--line,#25324a));background:linear-gradient(145deg,color-mix(in srgb,var(--launch-accent) 13%,#071023),#071023);box-shadow:0 10px 24px rgba(0,0,0,.24)}
      .acc-launch-icon img{width:100%;height:100%;object-fit:cover;display:block}
      .acc-launch-icon-fallback{position:absolute;inset:0;display:grid;place-items:center;color:var(--launch-accent);font-size:1.2rem;font-weight:950;letter-spacing:-.04em;z-index:0}
      .acc-launch-icon img+.acc-launch-icon-fallback{z-index:-1}
      .acc-launch-title{margin-top:9px;font-size:.78rem;font-weight:900;line-height:1.2;letter-spacing:.01em;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
      .acc-launch-status{display:flex;justify-content:center;align-items:center;gap:5px;margin-top:5px;color:var(--muted,#8390aa);font-size:.57rem;line-height:1}
      .acc-launch-status-dot{width:6px;height:6px;border-radius:50%;background:var(--launch-accent);box-shadow:0 0 9px color-mix(in srgb,var(--launch-accent) 70%,transparent)}
      .acc-launch-card>.eyebrow,.acc-launch-card>.acc-launch-desc,.acc-launch-card>.acc-launch-foot,.acc-launch-card>.acc-sync-line{display:none!important}
      @media(min-width:700px){.acc-launch-grid{grid-template-columns:repeat(6,minmax(0,1fr));}.acc-launch-card{min-height:126px}.acc-launch-icon{width:78px;height:78px}}
      @media(max-width:380px){.acc-home-launchpad{padding-left:5px;padding-right:5px}.acc-launch-grid{gap:8px 2px}.acc-launch-icon{width:66px;height:66px;border-radius:19px}.acc-launch-title{font-size:.72rem}}
    `;
    document.head.appendChild(style);
  }

  async function launchDivision(key) {
    const module = modules[key];
    if (!module) return;
    const card = document.querySelector(`[data-home-module="${key}"]`);
    if (card?.dataset.opening === "1") return;
    if (card) {
      card.dataset.opening = "1";
      card.setAttribute("aria-busy", "true");
    }
    try {
      if (window.ACCSyncHub?.refresh) {
        await Promise.race([
          window.ACCSyncHub.refresh(),
          new Promise(resolve => setTimeout(resolve, 1000))
        ]);
      }
      const state = window.ACCSyncHub?.getState?.() || {};
      const syncedUrl = state?.[key]?.manifest?.appUrl;
      window.location.assign(syncedUrl || module.fallbackUrl);
    } catch {
      window.location.assign(module.fallbackUrl);
    } finally {
      if (card) {
        delete card.dataset.opening;
        card.removeAttribute("aria-busy");
      }
    }
  }

  function moduleCard(key) {
    const m = modules[key];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "acc-launch-card mono";
    button.dataset.homeModule = key;
    button.style.setProperty("--launch-accent", m.accent);
    button.setAttribute("aria-label", `Open ${m.title}`);
    button.innerHTML = `
      <div class="acc-launch-icon">
        <img src="${m.iconUrl}" alt="" loading="lazy" referrerpolicy="no-referrer">
        <span class="acc-launch-icon-fallback">${m.iconFallback}</span>
      </div>
      <div class="acc-launch-title">${m.title}</div>
      <div class="acc-launch-status"><span class="acc-launch-status-dot"></span><span>OPEN</span></div>
      <div class="eyebrow"></div>
      <div class="acc-launch-desc"></div>
      <div class="acc-launch-foot"><span class="badge"></span><span class="acc-launch-open"></span></div>
    `;
    const img = button.querySelector("img");
    img?.addEventListener("error", () => { img.style.display = "none"; button.querySelector(".acc-launch-icon-fallback")?.style.setProperty("z-index", "1"); }, { once:true });
    button.addEventListener("click", () => launchDivision(key));
    return button;
  }

  function buildLaunchpad() {
    const box = document.createElement("div");
    box.id = LAUNCHPAD_ID;
    box.className = "acc-home-launchpad mono";
    box.innerHTML = `
      <div class="acc-launch-head">
        <div><div class="eyebrow">ACC PERSONAL COMMAND</div><h2 class="card-title" style="margin-top:3px">OWNER LAUNCHPAD</h2><p class="muted small"></p></div>
        <span class="badge">3 APPS</span>
      </div>
      <div class="acc-launch-grid"></div>
    `;
    const grid = box.querySelector(".acc-launch-grid");
    grid.append(moduleCard("trading"), moduleCard("entego"), moduleCard("studio"));
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

// BUILD 257 — release identity bridge. Keeps installed PWA identity and data schema stable.
(() => {
  if (document.querySelector('script[data-acc-release="v257"]')) return;
  const script = document.createElement("script");
  script.src = "./release-version-v257.js?rev=BUILD257_AUTONOMOUS_QUALITY_RECOVERY";
  script.dataset.accRelease = "v257";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — Publishing Hub unmatched Meta Page diagnostic (read-only).
(() => {
  if (document.querySelector('script[data-acc-meta-diagnostic="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-unmatched-meta-diagnostic-v1.js?rev=KAI_ONE_META_DIAGNOSTIC_V1";
  script.dataset.accMetaDiagnostic = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — Android/WebView tap-safe Meta Page picker.
(() => {
  if (document.querySelector('script[data-acc-mobile-page-picker="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-mobile-page-picker-v1.js?rev=KAI_ONE_MOBILE_PAGE_PICKER_V1";
  script.dataset.accMobilePagePicker = "v1";
  script.async = false;
  document.head.appendChild(script);
})();

// KAI ONE — owner-confirmed Page aliases.
(() => {
  if (document.querySelector('script[data-acc-page-aliases="v1"]')) return;
  const script = document.createElement("script");
  script.src = "./publishing-page-aliases-v1.js?rev=KAI_ONE_OWNER_PAGE_ALIASES_V1";
  script.dataset.accPageAliases = "v1";
  script.async = false;
  document.head.appendChild(script);
})();
