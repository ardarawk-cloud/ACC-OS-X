// ACC OS X — BUILD 258 PRODUCTION CONTRACTS V1
// Shared deterministic contracts for Produce Copilot and future Automatic Mission.
// AI fills creative fields inside these contracts; AI does not decide the workflow itself.

export const CONTRACT_VERSION = "ACC_PRODUCTION_CONTRACTS_V1";

const base = (id, extra={}) => ({
  id,
  version: CONTRACT_VERSION,
  interaction: {mode:"AUTONOMOUS", options:[]},
  batch: {count:1, series:[]},
  research: {mode:"NONE", targetSources:0, publishMinSources:0, allowIndexEvidence:true, fallbackToEvergreen:false},
  material: {language:"id-ID", format:"SINGLE", noInternalProcess:true},
  visual: {template:"EDITORIAL", heroPolicy:"SUBJECT_LOCK", palette:"CHANNEL_MASTER", avoid:["unrelated stock portrait","fabricated logos","watermark","text inside generated hero image"]},
  caption: {language:"id-ID", prefix:"", requiredCredits:false},
  publish: {requireCompletePackage:true, requireVerifiedEvidence:false},
  next: {mode:"NEW_ITEM"},
  ...extra
});

const batch = (id, series, extra={}) => base(id, {
  batch:{count:series.length,series},
  material:{language:"id-ID",format:"NUMBERED_ITEMS",noInternalProcess:true},
  ...extra
});

const currentNews = (id, extra={}) => base(id, {
  research:{mode:"CURRENT_NEWS",targetSources:3,publishMinSources:2,allowIndexEvidence:true,fallbackToEvergreen:false},
  publish:{requireCompletePackage:true,requireVerifiedEvidence:true},
  ...extra
});

export const PRODUCTION_CONTRACTS = Object.freeze({
  "ch-techverse": currentNews("techverse.v1",{
    visual:{template:"TECH_EDITORIAL",heroPolicy:"TECH_SUBJECT_LOCK",palette:"ELECTRIC_BLUE_CARBON_TITANIUM",avoid:["unrelated lifestyle portrait","fantasy tech","fabricated product branding","text inside hero image"]},
    caption:{language:"en-ID",prefix:"",requiredCredits:false},
    next:{mode:"LATEST_NON_REPEAT"}
  }),
  "ch-balinightlife": batch("balinightlife.v1",["News","Event & Lifestyle","Community"],{
    research:{mode:"CURRENT_EVENTS_H1_H7",targetSources:3,publishMinSources:2,allowIndexEvidence:true,fallbackToEvergreen:false},
    material:{language:"en-US",format:"NUMBERED_ITEMS",noInternalProcess:true},
    visual:{template:"NIGHTLIFE_REELS",heroPolicy:"VENUE_EVENT_LOCK",palette:"PROJECT_MIDNIGHT",avoid:["invented DJ identity","unrelated club stock portrait","fake venue branding","text inside hero image"]},
    caption:{language:"en-US",prefix:"",requiredCredits:true},
    publish:{requireCompletePackage:true,requireVerifiedEvidence:true},
    next:{mode:"NEXT_EVENT_BATCH"}
  }),
  "ch-bali-wedding-dj": base("bali-wedding-dj.v1",{
    material:{language:"en-US",format:"SINGLE",noInternalProcess:true},
    visual:{template:"PREMIUM_WEDDING",heroPolicy:"SERVICE_MOMENT_LOCK",palette:"ELEGANT_PREMIUM",avoid:["cheap party aesthetic","fake client testimonial","text inside hero image"]},
    caption:{language:"en-US",prefix:"",requiredCredits:false}
  }),
  "ch-aku-cinta-malam": batch("aku-cinta-malam.v1",["News","Event & Lifestyle","Community"],{
    research:{mode:"CURRENT_NIGHTLIFE",targetSources:3,publishMinSources:2,allowIndexEvidence:true,fallbackToEvergreen:false},
    visual:{template:"INDONESIA_NIGHTLIFE",heroPolicy:"VENUE_EVENT_LOCK",palette:"NIGHTLIFE",avoid:["fake venue","invented artist","text inside hero image"]},
    caption:{language:"id-ID",prefix:"",requiredCredits:true},
    publish:{requireCompletePackage:true,requireVerifiedEvidence:true}
  }),
  "ch-arda-gaming": base("arda-gaming-hok.v1",{
    interaction:{mode:"CHOICE_REQUIRED",options:["Gameplay Match","Honor of Kings News/Updates","Hero Education","Interactive/Community Content"]},
    research:{mode:"OPTIONAL_CURRENT",targetSources:2,publishMinSources:0,allowIndexEvidence:true,fallbackToEvergreen:true},
    visual:{template:"HOK_GAMING",heroPolicy:"GAME_TOPIC_LOCK",palette:"GAMING",avoid:["non-HOK game","fabricated patch detail","text inside hero image"]}
  }),
  "ch-nadya-gaming": base("nadya-gaming.v1",{
    interaction:{mode:"CHOICE_REQUIRED",options:["Club Roblox","Gunung"]},
    visual:{template:"ROBLOX_LIFESTYLE",heroPolicy:"ROBLOX_SCENE_LOCK",palette:"BLUE_NEON",avoid:["other Roblox games","mature unsafe scene","text inside hero image"]}
  }),
  "ch-dunia-bintang": base("dunia-bintang.v1",{
    visual:{template:"ROBLOX_KIDS",heroPolicy:"KID_SAFE_GAME_LOCK",palette:"BRIGHT_KIDS",avoid:["mature content","free item code text","text inside hero image"]},
    next:{mode:"SEQUENTIAL_EPISODE"}
  }),
  "ch-motocamp": batch("motocamp.v1",["Tips Motocamp","Spot & Rute","Gear & Setup","Story & Inspirasi","Berita Motocamp"],{
    research:{mode:"MIXED_LAST_ITEM_CURRENT",targetSources:2,publishMinSources:0,allowIndexEvidence:true,fallbackToEvergreen:true},
    visual:{template:"MOTOCAMP_SERIES",heroPolicy:"MOTORCAMP_SUBJECT_LOCK",palette:"OUTDOOR",avoid:["unsafe riding depiction","unrelated motorcycle portrait","text inside hero image"]}
  }),
  "ch-semesta-berbisik": batch("semesta-berbisik.v1",["Pesan Semesta","Tarot Harian","Energi Zodiak","Afirmasi Harian","Pesan Semesta Penutup"],{
    visual:{template:"SPIRITUAL_SERIES",heroPolicy:"SYMBOLIC_SERIES_LOCK",palette:"COSMIC_PREMIUM",avoid:["medical certainty","guaranteed prediction","text inside hero image"]}
  }),
  "ch-konten-islami": batch("konten-islami.v1",["Prayer Reminder","Heart Reflection","One-Minute Learning","Stories of Prophets/Companions","Daily Dua & Dzikir"],{
    research:{mode:"REFERENCE_SENSITIVE",targetSources:0,publishMinSources:0,allowIndexEvidence:false,fallbackToEvergreen:true},
    visual:{template:"ISLAMIC_PREMIUM",heroPolicy:"RESPECTFUL_SYMBOLIC_LOCK",palette:"GREEN_GOLD",avoid:["depiction of prophets","fabricated scripture quote","text inside hero image"]}
  }),
  "ch-berita-terkini": currentNews("berita-terkini.v1",{
    visual:{template:"GENERAL_NEWS",heroPolicy:"EVENT_OBJECT_PLACE_LOCK",palette:"NEWS",avoid:["generic model portrait","fabricated event photo","text inside hero image"]},
    next:{mode:"LATEST_NON_REPEAT"}
  }),
  "ch-gaming-news": currentNews("ardmrn-gaming-news.v1",{
    visual:{template:"GAMING_NEWS",heroPolicy:"GAME_EVENT_LOCK",palette:"GAMING_MEDIA",avoid:["unrelated game","fabricated screenshot","text inside hero image"]},
    next:{mode:"LATEST_NON_REPEAT"}
  }),
  "ch-cinematix": batch("ardmrn-cinematix.v1",["Breaking News","Fakta","Update Terbaru"],{
    research:{mode:"CURRENT_NEWS",targetSources:3,publishMinSources:2,allowIndexEvidence:true,fallbackToEvergreen:false},
    visual:{template:"FILM_EDITORIAL",heroPolicy:"FILM_TOPIC_ORIGINAL_VISUAL",palette:"CINEMATIC",avoid:["copyrighted poster reuse","fabricated actor identity","text inside hero image"]},
    publish:{requireCompletePackage:true,requireVerifiedEvidence:true}
  }),
  "ch-ardmrn-insight": base("ardmrn-insight.v1",{
    research:{mode:"TOPIC_GROUNDED",targetSources:2,publishMinSources:1,allowIndexEvidence:true,fallbackToEvergreen:true},
    visual:{template:"INSIGHT_EDITORIAL",heroPolicy:"CONCEPT_SUBJECT_LOCK",palette:"PREMIUM_EDITORIAL",avoid:["unsupported factual graphic","text inside hero image"]}
  }),
  "ch-yolo": batch("yolo.v1",["Series 1","Series 2","Series 3","Series 4","Series 5"],{
    visual:{template:"YOLO_TWO_SIDES",heroPolicy:"DUAL_CONCEPT_LOCK",palette:"BLACK_GOLD",avoid:["one-sided moralizing","generic corporate stock photo","text inside hero image"]}
  }),
  "ch-titik-tanya": base("titik-tanya.v1",{
    visual:{template:"REFLECTIVE_QUESTION",heroPolicy:"CONCEPT_LOCK",palette:"REFLECTIVE",avoid:["literal answer visual","text inside hero image"]},
    next:{mode:"SEQUENTIAL_EPISODE"}
  }),
  "ch-putri-ayah": batch("putri-ayah.v1",["Ayah → Putri","Putri → Ayah","Momen Ayah & Putri","Pelajaran Hidup","Quotes & Renungan"],{
    visual:{template:"FATHER_DAUGHTER",heroPolicy:"LOCKED_CHARACTER_REFERENCE",palette:"WARM_FAMILY",avoid:["face drift","unrelated family","text inside hero image"]}
  }),
  "ch-serigala-senja": batch("serigala-senja.v1",["Night Series 1","Night Series 2","Night Series 3","Night Series 4","Night Series 5"],{
    visual:{template:"WOLF_TWILIGHT",heroPolicy:"WOLF_PROTAGONIST_LOCK",palette:"TWILIGHT",avoid:["human protagonist replacing wolf","daylight mismatch","text inside hero image"]},
    next:{mode:"SEQUENTIAL_EPISODE"}
  }),
  "ch-warisan-bali": batch("warisan-bali.v1",["Edukasi","Kalender Bali & Rahinan","Filosofi","Tradisi & Kehidupan Bali","Inspirasi Bali"],{
    research:{mode:"CULTURAL_FACT_CHECK",targetSources:2,publishMinSources:0,allowIndexEvidence:true,fallbackToEvergreen:true},
    visual:{template:"WARISAN_BALI",heroPolicy:"BALINESE_CULTURAL_SUBJECT_LOCK",palette:"BALI_HERITAGE",avoid:["random tourist portrait","generic Western lifestyle scene","fake sacred ritual","costume stereotype","text inside hero image"]},
    caption:{language:"id-ID",prefix:"Om Swastiastu.",requiredCredits:false}
  }),
  "ch-jejak-nusantara": base("jejak-nusantara.v1",{
    research:{mode:"HISTORICAL_FACT_CHECK",targetSources:2,publishMinSources:1,allowIndexEvidence:true,fallbackToEvergreen:true},
    visual:{template:"NUSANTARA_DOCUMENTARY",heroPolicy:"HISTORICAL_SUBJECT_LOCK",palette:"GOLD_BROWN_PARCHMENT",avoid:["modern stock portrait","fiction presented as fact","text inside hero image"]},
    next:{mode:"SEQUENTIAL_ROADMAP"}
  }),
  "ch-lentera-weton": batch("lentera-weton.v1",["Weton Hari Ini","Primbon/Tips"],{
    visual:{template:"WETON_PREMIUM",heroPolicy:"JAVANESE_SYMBOLIC_LOCK",palette:"BLACK_GOLD_BROWN",avoid:["guaranteed prediction","text inside hero image"]}
  }),
  "ch-tukang-tambang": base("tukang-tambang.v1",{
    research:{mode:"OPTIONAL_CURRENT",targetSources:2,publishMinSources:0,allowIndexEvidence:true,fallbackToEvergreen:true},
    visual:{template:"WEB3_BOOTCAMP",heroPolicy:"PROJECT_LEARNING_LOCK",palette:"CYBER_MINING",avoid:["guaranteed earning claim","unsafe wallet instruction","text inside hero image"]}
  }),
  "ch-hikayat-pohon-ganja": base("hikayat-pohon-ganja.v1",{
    research:{mode:"HISTORICAL_FACT_CHECK",targetSources:2,publishMinSources:1,allowIndexEvidence:true,fallbackToEvergreen:true},
    visual:{template:"FOREST_HERITAGE",heroPolicy:"HISTORICAL_BOTANICAL_LOCK",palette:"FOREST_HERITAGE",avoid:["drug promotion","unsafe instruction","text inside hero image"]}
  }),
  "ch-distorsi-sejarah-punk": base("distorsi-sejarah-punk.v1",{
    research:{mode:"HISTORICAL_BASELINE",targetSources:2,publishMinSources:1,allowIndexEvidence:true,fallbackToEvergreen:true},
    visual:{template:"PUNK_ALT_HISTORY",heroPolicy:"HISTORY_DIVERGENCE_LOCK",palette:"PUNK",avoid:["fiction presented as established fact","text inside hero image"]}
  }),
  "ch-planet-fauna": base("planet-fauna.v1",{
    research:{mode:"FACT_CHECK",targetSources:2,publishMinSources:1,allowIndexEvidence:true,fallbackToEvergreen:true},
    visual:{template:"FAUNA_EDITORIAL",heroPolicy:"SPECIES_LOCK",palette:"NATURE",avoid:["wrong species","anthropomorphic distortion","text inside hero image"]}
  }),
  "ch-ark-garage": base("ark-garage.v1",{
    research:{mode:"FACT_CHECK",targetSources:2,publishMinSources:1,allowIndexEvidence:true,fallbackToEvergreen:true},
    visual:{template:"GARAGE_EDITORIAL",heroPolicy:"VEHICLE_PART_LOCK",palette:"GARAGE",avoid:["unsafe modification depiction","wrong vehicle/part","text inside hero image"]}
  }),
  "ch-ruang-dj": base("ruang-dj.v1",{
    research:{mode:"OPTIONAL_CURRENT",targetSources:2,publishMinSources:0,allowIndexEvidence:true,fallbackToEvergreen:true},
    visual:{template:"DJ_EDITORIAL",heroPolicy:"GEAR_CULTURE_LOCK",palette:"DJ_MEDIA",avoid:["invented artist identity","wrong equipment","text inside hero image"]},
    caption:{language:"id-ID",prefix:"",requiredCredits:true}
  }),
  "ch-mr-laziz": base("mr-laziz.v1",{
    interaction:{mode:"OWNER_FACTS_ONLY",options:[]},
    research:{mode:"NONE",targetSources:0,publishMinSources:0,allowIndexEvidence:false,fallbackToEvergreen:false},
    visual:{template:"FOOD_BRAND",heroPolicy:"APPROVED_PRODUCT_LOCK",palette:"BRAND_MASTER",avoid:["invented product","invented price","invented offer","text inside hero image"]}
  })
});

export const DEFAULT_PRODUCTION_CONTRACT = Object.freeze(base("generic-channel.v1"));

export function getProductionContract(channelId){
  return PRODUCTION_CONTRACTS[channelId] || DEFAULT_PRODUCTION_CONTRACT;
}

export function contractSummary(channelId){
  const c=getProductionContract(channelId);
  return {
    id:c.id,
    version:c.version,
    interaction:c.interaction.mode,
    batchCount:c.batch.count,
    series:c.batch.series,
    researchMode:c.research.mode,
    publishMinSources:c.research.publishMinSources,
    visualTemplate:c.visual.template,
    heroPolicy:c.visual.heroPolicy
  };
}
