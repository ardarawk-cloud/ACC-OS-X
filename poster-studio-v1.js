// ACC OS X — BUILD 251 STUDIO POSTER RENDERER v1
// Client-side deterministic editorial poster assembly.
// AI supplies hero artwork; this layer adds studio-grade information architecture.
(() => {
  "use strict";

  const STATE_KEY = "acc_os_x_ecosystem_v214";
  const REVISION = "BUILD251_STUDIO_POSTER_V1";
  const STANDARD = "STUDIO_CONTENT_V1";
  const BENCHMARK = "TECHVERSE_POSTER_QUALITY_BENCHMARK_V1";
  const nativeToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const upstreamFetch = window.fetch.bind(window);

  const kits = {
    "ch-techverse": {
      channelName: "TECHVERSE",
      category: "TECH NEWS",
      tagline: "EXPLORE TODAY. BUILD TOMORROW.",
      bg: "#031426", panel: "#071f36", panel2: "#0a2d49", accent: "#16c7ff", accent2: "#2f8cff", text: "#ffffff", muted: "#a9c7da"
    },
    "ch-balinightlife": {
      channelName: "BALINIGHTLIFE",
      category: "NIGHTLIFE",
      tagline: "BALI AFTER DARK",
      bg: "#110719", panel: "#1b0d28", panel2: "#27103b", accent: "#ff4fd8", accent2: "#36d9ff", text: "#ffffff", muted: "#d3b7db"
    },
    "ch-aku-cinta-malam": {
      channelName: "AKU CINTA MALAM",
      category: "NIGHTLIFE",
      tagline: "NEWS • EVENT • COMMUNITY",
      bg: "#120710", panel: "#24101f", panel2: "#35142c", accent: "#ff4d8d", accent2: "#9e6bff", text: "#ffffff", muted: "#d8b3c8"
    },
    "ch-warisan-bali": {
      channelName: "WARISAN BALI",
      category: "BUDAYA BALI",
      tagline: "WARISAN • FILOSOFI • TRADISI",
      bg: "#191008", panel: "#2b1c0e", panel2: "#3a2714", accent: "#f0b84e", accent2: "#d8892f", text: "#fff8eb", muted: "#d8c3a0"
    }
  };

  const fallbackKit = {
    channelName: "ACC MEDIA",
    category: "STUDIO CONTENT",
    tagline: "PREMIUM EDITORIAL",
    bg: "#07111f", panel: "#0d1c30", panel2: "#132a45", accent: "#59d5ff", accent2: "#7a8cff", text: "#ffffff", muted: "#b7c7d8"
  };

  const text = v => typeof v === "string" ? v.trim() : "";
  const safeState = () => {
    try { return JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); }
    catch { return {}; }
  };

  const latestAsset = (state, channelId, stage) => {
    const rows = Array.isArray(state?.assets) ? state.assets : [];
    return rows.find(a => a?.channelId === channelId && String(a?.stage || "").toUpperCase() === stage && text(a?.output)) || null;
  };

  const section = (raw, name, nextNames=[]) => {
    const stop = nextNames.join("|");
    const re = new RegExp(`^\\s*${name}\\s*:\\s*([\\s\\S]*?)${stop ? `(?=^\\s*(?:${stop})\\s*:|$)` : "$"}`, "im");
    const m = String(raw || "").match(re);
    return m ? text(m[1]) : "";
  };

  const cleanLine = value => text(value)
    .replace(/^[-*•#>\d.)\s]+/, "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\b(?:VERIFIED_FACTS|SOURCE_NOTES|KEY_POINTS|VISUAL_FACTS|RISK_NOTES|SOURCES|PUBLIC_HEADLINE)\s*:/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const clamp = (value, max=120) => {
    const v = cleanLine(value);
    if (v.length <= max) return v;
    const cut = v.slice(0, max - 1).replace(/\s+\S*$/, "");
    return `${cut || v.slice(0, max - 1)}…`;
  };

  const extractHeadline = (scriptRaw, channelName) => {
    const m = String(scriptRaw || "").match(/(?:^|\n)\s*(?:PUBLIC_HEADLINE|HEADLINE)\s*:\s*(.+)/i);
    return clamp((m?.[1] || channelName || "ACC MEDIA").replace(/^["'“”]+|["'“”]+$/g, ""), 92);
  };

  const factCandidates = researchRaw => {
    const names = ["TOPIC","VERIFIED_FACTS","SOURCE_NOTES","ANGLE","KEY_POINTS","VISUAL_FACTS","RISK_NOTES","SOURCES"];
    const facts = section(researchRaw, "VERIFIED_FACTS", names.filter(x => x !== "VERIFIED_FACTS"));
    const points = section(researchRaw, "KEY_POINTS", names.filter(x => x !== "KEY_POINTS"));
    return `${facts}\n${points}`
      .split(/\r?\n|(?<=[.!?])\s+(?=[A-Z0-9])/)
      .map(cleanLine)
      .filter(v => v && v.length >= 18 && !/^https?:/i.test(v) && !/\bsource\b\s*:/i.test(v));
  };

  const unique = rows => {
    const out = [], seen = new Set();
    for (const row of rows) {
      const key = row.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
      if (!key || seen.has(key)) continue;
      seen.add(key); out.push(row);
    }
    return out;
  };

  const extractMetric = rows => {
    for (const row of rows) {
      const m = row.match(/(?:^|\s)(\d+(?:[.,]\d+)?\s*(?:%|x|k|m|b|juta|miliar|triliun|million|billion|tb|gb|mw|gw|km|tahun|year|users?))(?:\b|\s)/i);
      if (m) return { value: m[1].toUpperCase(), label: clamp(row.replace(m[1], ""), 70) || "KEY FACT" };
    }
    return null;
  };

  const wrap = (ctx, value, maxWidth, maxLines=3) => {
    const words = String(value || "").split(/\s+/).filter(Boolean);
    const lines = []; let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line); line = word;
        if (lines.length >= maxLines - 1) break;
      } else line = next;
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
      lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;:!?]?$/, "") + "…";
    }
    return lines;
  };

  const roundRect = (ctx, x, y, w, h, r) => {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  const fillRound = (ctx, x, y, w, h, r, fill, stroke=null) => {
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  };

  const drawLabel = (ctx, value, x, y, kit) => {
    ctx.font = "800 25px Arial, sans-serif";
    const w = Math.min(410, ctx.measureText(value).width + 34);
    fillRound(ctx, x, y, w, 50, 15, kit.accent, null);
    ctx.fillStyle = "#03111d"; ctx.textBaseline = "middle";
    ctx.fillText(value, x + 17, y + 26);
    return w;
  };

  const drawTextLines = (ctx, lines, x, y, lineHeight) => {
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  };

  const renderStudioPoster = canvas => {
    if (!canvas || canvas.width !== 1080 || canvas.height !== 1920) return null;
    const state = safeState();
    const channelId = text(state?.activeChannelId);
    if (!channelId) return null;

    const researchRaw = latestAsset(state, channelId, "RESEARCH")?.output || "";
    const scriptRaw = latestAsset(state, channelId, "SCRIPT")?.output || "";
    if (!researchRaw || !scriptRaw) return null;

    const kit = {...fallbackKit, ...(kits[channelId] || {})};
    const channelName = kit.channelName === fallbackKit.channelName
      ? (text(state?.activeChannelName) || channelId.replace(/^ch-/, "").replace(/-/g, " ").toUpperCase())
      : kit.channelName;
    const headline = extractHeadline(scriptRaw, channelName);
    const rawFacts = unique(factCandidates(researchRaw));
    const facts = rawFacts.slice(0, 4).map(v => clamp(v, 128));
    const metric = extractMetric(rawFacts);
    const angle = clamp(section(researchRaw, "ANGLE", ["KEY_POINTS","VISUAL_FACTS","RISK_NOTES","SOURCES"]), 130);
    const takeaway = angle || facts[0] || headline;

    const ctx = canvas.getContext("2d", {alpha:false});
    if (!ctx) return null;
    ctx.save();

    const heroShade = ctx.createLinearGradient(0, 250, 0, 1250);
    heroShade.addColorStop(0, "rgba(2,11,22,.08)");
    heroShade.addColorStop(.72, "rgba(2,11,22,.03)");
    heroShade.addColorStop(1, "rgba(2,11,22,.58)");
    ctx.fillStyle = heroShade; ctx.fillRect(0, 250, 1080, 1000);
    ctx.strokeStyle = kit.accent; ctx.globalAlpha = .62; ctx.lineWidth = 3;
    ctx.strokeRect(42, 286, 996, 850); ctx.globalAlpha = 1;

    fillRound(ctx, 44, 46, 735, 212, 28, "rgba(3,15,30,.91)", `${kit.accent}88`);
    ctx.fillStyle = kit.accent; ctx.fillRect(44, 46, 10, 212);
    ctx.fillStyle = kit.text; ctx.textBaseline = "top";
    ctx.font = "900 44px Arial, sans-serif"; ctx.fillText(channelName, 78, 76);
    ctx.font = "700 22px Arial, sans-serif"; ctx.fillStyle = kit.muted; ctx.fillText(kit.tagline, 80, 134);
    drawLabel(ctx, kit.category, 79, 173, kit);
    const dateText = new Intl.DateTimeFormat("en", {day:"2-digit", month:"short", year:"numeric"}).format(new Date()).toUpperCase();
    ctx.font = "700 20px Arial, sans-serif"; ctx.fillStyle = kit.muted; ctx.fillText(dateText, 505, 190);

    const lower = ctx.createLinearGradient(0, 1120, 0, 1920);
    lower.addColorStop(0, "rgba(3,15,30,.20)");
    lower.addColorStop(.12, "rgba(3,15,30,.94)");
    lower.addColorStop(1, "rgba(1,8,18,.99)");
    ctx.fillStyle = lower; ctx.fillRect(0, 1110, 1080, 810);
    ctx.fillStyle = kit.accent; ctx.fillRect(0, 1110, 1080, 8);

    ctx.fillStyle = kit.text; ctx.textBaseline = "top";
    let headlineSize = 76;
    ctx.font = `900 ${headlineSize}px Arial, sans-serif`;
    let headlineLines = wrap(ctx, headline, 940, 3);
    while (headlineLines.length > 2 && headlineSize > 62) {
      headlineSize -= 4; ctx.font = `900 ${headlineSize}px Arial, sans-serif`;
      headlineLines = wrap(ctx, headline, 940, 3);
    }
    drawTextLines(ctx, headlineLines, 58, 1155, headlineSize * 1.03);

    const headlineBottom = 1155 + headlineLines.length * headlineSize * 1.03;
    ctx.fillStyle = kit.accent2; ctx.fillRect(58, headlineBottom + 12, 150, 7);

    const cardsY = Math.max(1422, headlineBottom + 52);
    const cardH = 172;
    if (metric) {
      fillRound(ctx, 58, cardsY, 278, cardH, 24, kit.panel, `${kit.accent}77`);
      ctx.fillStyle = kit.accent; ctx.font = "900 52px Arial, sans-serif"; ctx.fillText(metric.value, 82, cardsY + 27);
      ctx.fillStyle = kit.muted; ctx.font = "700 19px Arial, sans-serif";
      drawTextLines(ctx, wrap(ctx, metric.label, 225, 3), 82, cardsY + 95, 26);
    }

    const insightX = metric ? 356 : 58;
    const insightW = metric ? 666 : 964;
    fillRound(ctx, insightX, cardsY, insightW, cardH, 24, kit.panel2, `${kit.accent2}77`);
    ctx.fillStyle = kit.accent; ctx.font = "800 21px Arial, sans-serif"; ctx.fillText("WHY IT MATTERS", insightX + 24, cardsY + 22);
    ctx.fillStyle = kit.text; ctx.font = "700 24px Arial, sans-serif";
    const insight = facts.find(f => !metric || !f.includes(metric.value)) || facts[0] || takeaway;
    drawTextLines(ctx, wrap(ctx, insight, insightW - 48, 4), insightX + 24, cardsY + 59, 31);

    const stripY = cardsY + cardH + 20;
    fillRound(ctx, 58, stripY, 964, 118, 22, "rgba(8,29,50,.92)", `${kit.accent}55`);
    ctx.fillStyle = kit.accent2; ctx.font = "800 20px Arial, sans-serif"; ctx.fillText("THE CORE", 82, stripY + 19);
    ctx.fillStyle = kit.text; ctx.font = "700 23px Arial, sans-serif";
    drawTextLines(ctx, wrap(ctx, takeaway, 886, 2), 82, stripY + 51, 31);

    const footerY = 1842;
    ctx.fillStyle = "rgba(255,255,255,.14)"; ctx.fillRect(58, footerY - 13, 964, 1);
    ctx.fillStyle = kit.muted; ctx.font = "700 19px Arial, sans-serif";
    ctx.fillText(`${channelName}  •  ${kit.tagline}`, 58, footerY + 7);
    ctx.textAlign = "right"; ctx.fillStyle = kit.accent; ctx.fillText("STUDIO CONTENT", 1022, footerY + 7); ctx.textAlign = "left";

    ctx.restore();

    const meta = {
      standard: STANDARD,
      rendererRevision: REVISION,
      benchmark: channelId === "ch-techverse" ? BENCHMARK : "ACC_STUDIO_CONTENT_BENCHMARK_V1",
      channelId,
      channelName,
      width: 1080,
      height: 1920,
      headline,
      factsCount: facts.length,
      keyMetric: metric?.value || null,
      layoutBlocks: ["brandHeader","categoryDate","heroFrame","headline","factCard","whyItMatters","coreStrip","footer"],
      renderedAt: new Date().toISOString()
    };
    window.__ACC_STUDIO_POSTER_LAST__ = meta;
    return meta;
  };

  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    try {
      if (this.width === 1080 && this.height === 1920 && (!type || /image\/(?:jpeg|jpg)/i.test(type))) {
        renderStudioPoster(this);
      }
    } catch (error) {
      console.warn("ACC Studio Poster renderer skipped", error);
    }
    return nativeToDataURL.call(this, type, quality);
  };

  const qcStage = body => {
    const direct = String(body?.context?.workerTask?.stage || "").toUpperCase();
    if (direct === "QC") return true;
    const joined = (Array.isArray(body?.messages) ? body.messages : []).map(m => text(m?.content)).join("\n");
    return /(?:^|\n)STAGE:\s*QC\b/i.test(joined) || /Editorial QC Auditor/i.test(joined);
  };

  window.fetch = async (input, init={}) => {
    try {
      const url = typeof input === "string" ? input : input?.url || "";
      const method = String(init?.method || (typeof input !== "string" ? input?.method : "GET") || "GET").toUpperCase();
      if (method === "POST" && /\/api\/acc-ai(?:\?|$)/.test(url) && typeof init?.body === "string") {
        const body = JSON.parse(init.body);
        if (qcStage(body)) {
          const meta = window.__ACC_STUDIO_POSTER_LAST__;
          const profileId = text(body?.context?.profile?.id);
          const age = meta?.renderedAt ? Date.now() - Date.parse(meta.renderedAt) : Infinity;
          if (meta && meta.channelId === profileId && age >= 0 && age < 15 * 60 * 1000) {
            body.context = body.context || {};
            body.context.studioPosterQuality = meta;
            init = {...init, body: JSON.stringify(body)};
          }
        }
      }
    } catch {}
    return upstreamFetch(input, init);
  };

  window.ACCStudioPoster = Object.freeze({
    revision: REVISION,
    standard: STANDARD,
    benchmark: BENCHMARK,
    getLast: () => window.__ACC_STUDIO_POSTER_LAST__ || null
  });
})();
