// ACC OS X — DIVISION PASSPORT REGISTRY V1
// Channel = production division. Core executes universal K/P/C/N commands while
// each division owns its mission, editorial rules, research policy and workflow.

import {getProductionContract} from "./production-contracts-v1.js";

export const DIVISION_PASSPORT_VERSION = "ACC_DIVISION_PASSPORT_V1";

const base = (channelId, extra={}) => {
  const contract = getProductionContract(channelId);
  return {
    channelId,
    version: DIVISION_PASSPORT_VERSION,
    operatingMode: "SEMI_AUTOMATIC",
    workflow: ["K_CONTENT","P_POSTER","C_CAPTION","QC_OWNER","MANUAL_PUBLISH","N_NEXT"],
    publish: {mode:"MANUAL_OWNER", autoPublish:false},
    commands: {
      K:"Create finished content material according to this division passport.",
      P:"Create poster from the current K material; never change the topic.",
      C:"Create publish-ready caption from the current K material; never change the topic.",
      N:"Advance to a new non-repeating item according to the division passport."
    },
    research: {
      mode: contract.research.mode,
      minSources: contract.research.publishMinSources,
      targetSources: contract.research.targetSources,
      failurePolicy:"HOLD",
      evergreenFallback:false
    },
    batch: {count:contract.batch.count, series:contract.batch.series},
    visual: contract.visual,
    caption: contract.caption,
    editorialPrompt:"Follow the selected channel profile, mission, canon and active master context. Produce owner-facing output only.",
    ...extra
  };
};

export const DIVISION_PASSPORTS = Object.freeze({
  "ch-techverse": base("ch-techverse",{
    name:"TechVerse",
    mission:"Explore Today. Build Tomorrow. Explain technology clearly and professionally.",
    editorialPrompt:"Latest First; Fact Before Speed; Explain, do not merely report. Prefer a verified current technology story. Explain what happened, why it matters, and the practical implication for readers. Indonesian owner-facing material; professional and educational.",
    research:{mode:"CURRENT_NEWS",minSources:2,targetSources:3,failurePolicy:"SAFE_EVERGREEN",evergreenFallback:true},
    fallbackPrompt:"If current news cannot be verified with two independent sources, DO NOT stop production. Switch to a timeless technology explainer. Do not claim it happened today/latest/current. Choose a useful foundational topic in AI, cybersecurity, semiconductors, software, internet infrastructure, consumer technology or digital literacy. Fact before speed remains authoritative."
  }),
  "ch-balinightlife": base("ch-balinightlife",{
    name:"BALINIGHTLIFE",
    mission:"International Bali nightlife media.",
    editorialPrompt:"English-first. Produce the locked News / Event & Lifestyle / Community batch. Current event facts must be verified. Preserve official venue, DJ/talent and organizer/promoter credits when relevant.",
    research:{mode:"CURRENT_EVENTS_H1_H7",minSources:2,targetSources:3,failurePolicy:"HOLD",evergreenFallback:false}
  }),
  "ch-bali-wedding-dj": base("ch-bali-wedding-dj",{
    name:"Bali Wedding DJ",
    editorialPrompt:"Premium wedding entertainment marketing. Prioritize trust, service value, inquiry quality and booking conversion. Elegant professional English. Never invent clients, testimonials, prices or availability."
  }),
  "ch-aku-cinta-malam": base("ch-aku-cinta-malam",{
    name:"Aku Cinta Malam",
    editorialPrompt:"Indonesia nightlife media. Produce News / Event & Lifestyle / Community as separate items. Preserve venue and talent credits. Current event claims require verification.",
    research:{mode:"CURRENT_NIGHTLIFE",minSources:2,targetSources:3,failurePolicy:"HOLD",evergreenFallback:false}
  }),
  "ch-arda-gaming": base("ch-arda-gaming",{
    name:"Arda Gaming HOK",
    editorialPrompt:"Honor of Kings only. Respect the four-choice owner workflow. Useful Indonesian gaming content; do not fabricate patch notes, events or hero changes."
  }),
  "ch-nadya-gaming": base("ch-nadya-gaming",{
    name:"Nadya Gaming",
    editorialPrompt:"Relaxed Roblox lifestyle. Only Club Roblox and Gunung are approved until revised. Keep content audience-friendly and do not introduce other games."
  }),
  "ch-dunia-bintang": base("ch-dunia-bintang",{
    name:"Dunia Bintang",
    editorialPrompt:"Child-friendly Roblox content, simple cheerful Indonesian, sequential episodes, no free-item-code text."
  }),
  "ch-motocamp": base("ch-motocamp",{
    name:"Motocamp ID",
    editorialPrompt:"Produce the five locked series: Tips Motocamp; Spot & Rute; Gear & Setup; Story & Inspirasi; Berita Motocamp. Practical Indonesian voice and clear safety context."
  }),
  "ch-semesta-berbisik": base("ch-semesta-berbisik",{
    name:"Semesta Berbisik",
    editorialPrompt:"Produce the five locked daily spiritual/reflection series. Keep language reflective, non-medical, non-certain and never guarantee predictions."
  }),
  "ch-konten-islami": base("ch-konten-islami",{
    name:"Konten Islami",
    editorialPrompt:"Respectful Islamic educational/reflection content. Never fabricate scripture, hadith attribution or religious rulings. Avoid depicting prophets."
  }),
  "ch-berita-terkini": base("ch-berita-terkini",{
    name:"Berita Terkini",
    editorialPrompt:"Current general news only. Freshness and verification are mandatory; explain facts without speculation.",
    research:{mode:"CURRENT_NEWS",minSources:2,targetSources:3,failurePolicy:"HOLD",evergreenFallback:false}
  }),
  "ch-gaming-news": base("ch-gaming-news",{
    name:"ARDMRN Gaming News",
    editorialPrompt:"Current gaming news first. Verify the selected story, explain why it matters to players, and avoid invented screenshots, patches or announcements.",
    research:{mode:"CURRENT_NEWS",minSources:2,targetSources:3,failurePolicy:"HOLD",evergreenFallback:false}
  }),
  "ch-cinematix": base("ch-cinematix",{
    name:"ARDMRN Cinematix",
    editorialPrompt:"Film news first. Produce Breaking News / Fakta / Update Terbaru. Verify current claims and avoid copyrighted poster reuse or invented talent information.",
    research:{mode:"CURRENT_NEWS",minSources:2,targetSources:3,failurePolicy:"HOLD",evergreenFallback:false}
  }),
  "ch-ardmrn-insight": base("ch-ardmrn-insight",{
    name:"ARDMRN Insight",
    editorialPrompt:"Everything Worth Knowing. Research-first explanatory content: concise premise, verified context, key facts, significance and discussion angle.",
    research:{mode:"TOPIC_GROUNDED",minSources:1,targetSources:2,failurePolicy:"SAFE_EVERGREEN",evergreenFallback:true},
    fallbackPrompt:"If fresh research is temporarily unavailable, choose a stable educational topic that does not depend on current events and avoid unsupported precise claims."
  }),
  "ch-yolo": base("ch-yolo",{
    name:"YOLO — Dua Sisi Kehidupan",
    editorialPrompt:"A thinking laboratory, not motivational preaching. Every batch explores two sides of an issue with nuance. Produce five independent series items."
  }),
  "ch-titik-tanya": base("ch-titik-tanya",{
    name:"Titik Tanya",
    editorialPrompt:"Reflective question-led content. Invite thought without forcing a single answer. Advance sequentially and avoid repeating the previous question."
  }),
  "ch-putri-ayah": base("ch-putri-ayah",{
    name:"Putri Ayah",
    editorialPrompt:"Produce the five locked father-daughter series with warm natural Indonesian and strict character/relationship continuity."
  }),
  "ch-serigala-senja": base("ch-serigala-senja",{
    name:"Serigala Senja",
    editorialPrompt:"Five-series twilight/night narrative-reflection batch. Preserve wolf identity, mood and sequential continuity."
  }),
  "ch-warisan-bali": base("ch-warisan-bali",{
    name:"Warisan Bali",
    editorialPrompt:"Produce the five locked Bali heritage series. Cultural and religious accuracy is mandatory. Caption begins Om Swastiastu. Do not invent sacred ritual details.",
    research:{mode:"CULTURAL_FACT_CHECK",minSources:0,targetSources:2,failurePolicy:"SAFE_EVERGREEN",evergreenFallback:true},
    fallbackPrompt:"If external research is unavailable, choose a stable non-time-sensitive Bali cultural topic and avoid precise ritual, calendar or scripture claims that cannot be verified."
  }),
  "ch-jejak-nusantara": base("ch-jejak-nusantara",{
    name:"Jejak Nusantara",
    editorialPrompt:"Research-first documentary history. Clearly separate established facts from interpretation; never present fiction as historical fact."
  }),
  "ch-lentera-weton": base("ch-lentera-weton",{
    name:"Lentera Weton",
    editorialPrompt:"Two-item Javanese weton/primbon batch. Present as cultural tradition/reflection, never guaranteed prediction."
  }),
  "ch-tukang-tambang": base("ch-tukang-tambang",{
    name:"Tukang Tambang",
    editorialPrompt:"Web3 learning/bootcamp content. Educational and safety-first. Never guarantee earnings or give unsafe wallet instructions."
  }),
  "ch-hikayat-pohon-ganja": base("ch-hikayat-pohon-ganja",{
    name:"Hikayat Pohon Ganja",
    editorialPrompt:"Education and research about Cannabis history, botany, culture, environment and responsible public understanding. Evidence-first; no drug promotion or unsafe use instructions."
  }),
  "ch-distorsi-sejarah-punk": base("ch-distorsi-sejarah-punk",{
    name:"Distorsi Sejarah Punk",
    editorialPrompt:"Alternative-history/punk storytelling. Clearly distinguish historical baseline from fictional divergence."
  }),
  "ch-planet-fauna": base("ch-planet-fauna",{
    name:"Planet Fauna",
    editorialPrompt:"Species-accurate animal education. Fact-check biology/ecology and never substitute the wrong species."
  }),
  "ch-ark-garage": base("ch-ark-garage",{
    name:"ARK Garage",
    editorialPrompt:"Vehicle/garage education. Part and vehicle accuracy plus safety are mandatory; avoid unsafe modification guidance."
  }),
  "ch-ruang-dj": base("ch-ruang-dj",{
    name:"Ruang DJ",
    editorialPrompt:"DJ education, gear, culture and professional attitude. Preserve artist/brand credits when relevant and never invent equipment facts."
  }),
  "ch-mr-laziz": base("ch-mr-laziz",{
    name:"Mr Laziz",
    editorialPrompt:"Owner-approved food/product facts only. Never invent products, prices, offers, ingredients, availability or claims."
  })
});

export const DEFAULT_DIVISION_PASSPORT = Object.freeze(base("generic-channel"));

export function getDivisionPassport(channelId){
  return DIVISION_PASSPORTS[channelId] || Object.freeze({...DEFAULT_DIVISION_PASSPORT,channelId});
}

export function divisionPassportSummary(channelId){
  const p=getDivisionPassport(channelId);
  return {
    channelId:p.channelId,
    name:p.name||channelId,
    version:p.version,
    operatingMode:p.operatingMode,
    workflow:p.workflow,
    researchMode:p.research.mode,
    researchFailurePolicy:p.research.failurePolicy,
    batchCount:p.batch.count,
    publishMode:p.publish.mode
  };
}
