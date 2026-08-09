
(() => {
  "use strict";

  const ROOT = document.getElementById("root");
  const CURRENT_VERSION = 215;
  const PACKAGE_REVISION = "R6.11H-STORAGE-QUOTA-FIX";
  const BACKUP_FORMAT = "ACC_OS_X_BACKUP";
  const STORAGE_KEY = "acc_os_x_ecosystem_v214";
  const AI_ACCESS_STORAGE_KEY = "acc_os_x_ai_access_v1";
  const PUBLISH_ENDPOINT_STORAGE_KEY = "acc_os_x_publish_endpoint_v1";
  const PUBLISH_ACCESS_STORAGE_KEY = "acc_os_x_publish_access_v1";
  const AUTO_PUBLISH_REAL_TARGETS = true;
  const REAL_PUBLISH_TARGETS = {
    "ch-tukang-tambang": {connector:"META_FACEBOOK",pageId:"101420769205689",pageName:"Tukang Tambang"}
  };
  const LEGACY_KEYS = [
    "acc_os_x_ecosystem_v213",
    "acc_os_x_ecosystem_v212",
    "acc_os_x_ecosystem_v211",
    "acc_os_x_ecosystem_v210",
    "acc_os_x_ai_core_v204",
    "acc_os_x_operations_core_v203",
    "acc_os_x_beta_core_v202",
    "acc_os_x_safe_scroll_v201"
  ];
  const RECOVERY_KEY = "acc_os_x_recovery_payload";


  const THEME_PRESETS = [
    {id:"neon-x",name:"NEON X",tag:"ACC DEFAULT",vars:{bg:"#020617",panel:"#10192d",panel2:"#071023",panel3:"#02081a",line:"#25324a",line2:"#40506a",text:"#f8fafc",muted:"#8390aa",accent:"#a855f7",accentStrong:"#7e22ce",accentBright:"#d084ff",accentSoft:"#3b0764",accentSoft2:"#17112c",accentHot:"#9d0cff",accent2:"#3b82f6",accent2Bright:"#60a5fa"}},
    {id:"hikayat",name:"HIKAYAT POHON GANJA",tag:"FOREST HERITAGE",vars:{bg:"#061109",panel:"#0d1d12",panel2:"#0b2211",panel3:"#07140a",line:"#24452d",line2:"#3f6748",text:"#f3faef",muted:"#91a991",accent:"#79c267",accentStrong:"#2f7d32",accentBright:"#b7f397",accentSoft:"#17391d",accentSoft2:"#102816",accentHot:"#4fae4e",accent2:"#c4a84b",accent2Bright:"#e8d27a"}},
    {id:"electric-blue",name:"ELECTRIC BLUE",tag:"TECH MODE",vars:{bg:"#020712",panel:"#09172a",panel2:"#061425",panel3:"#020b18",line:"#17365a",line2:"#2d5b86",text:"#f3f8ff",muted:"#8297b6",accent:"#2f8cff",accentStrong:"#1557b8",accentBright:"#77baff",accentSoft:"#082955",accentSoft2:"#071d38",accentHot:"#1478ff",accent2:"#22d3ee",accent2Bright:"#67e8f9"}},
    {id:"gold-black",name:"GOLD BLACK",tag:"EXECUTIVE",vars:{bg:"#080704",panel:"#17140c",panel2:"#121008",panel3:"#0c0a05",line:"#40391f",line2:"#675b2a",text:"#fffaf0",muted:"#a89d7f",accent:"#d7b64a",accentStrong:"#92751d",accentBright:"#ffe28a",accentSoft:"#3a2f0d",accentSoft2:"#241f0c",accentHot:"#e8be2f",accent2:"#f59e0b",accent2Bright:"#fcd34d"}},
    {id:"crimson-core",name:"CRIMSON CORE",tag:"RED ALERT",vars:{bg:"#100408",panel:"#251018",panel2:"#1d0b12",panel3:"#12060b",line:"#5a2434",line2:"#83384d",text:"#fff5f6",muted:"#b78c98",accent:"#fb4d6d",accentStrong:"#b51f43",accentBright:"#ff8aa1",accentSoft:"#551128",accentSoft2:"#35101c",accentHot:"#ff315c",accent2:"#f97316",accent2Bright:"#fdba74"}},
    {id:"cyber-mint",name:"CYBER MINT",tag:"CLEAN SIGNAL",vars:{bg:"#03100f",panel:"#0a211f",panel2:"#071a19",panel3:"#041311",line:"#22504b",line2:"#3c766f",text:"#effcf9",muted:"#86aaa4",accent:"#2dd4bf",accentStrong:"#0f766e",accentBright:"#7ff4e7",accentSoft:"#0c3b37",accentSoft2:"#0a2b28",accentHot:"#14b8a6",accent2:"#38bdf8",accent2Bright:"#7dd3fc"}},
    {id:"midnight-club",name:"MIDNIGHT CLUB",tag:"NIGHTLIFE",vars:{bg:"#06030f",panel:"#171028",panel2:"#100a21",panel3:"#090516",line:"#3b275b",line2:"#62418a",text:"#fff5ff",muted:"#a391b9",accent:"#ec4899",accentStrong:"#a21caf",accentBright:"#f9a8d4",accentSoft:"#4a103d",accentSoft2:"#2d1234",accentHot:"#d946ef",accent2:"#22d3ee",accent2Bright:"#67e8f9"}},
    {id:"ember",name:"EMBER",tag:"HOT ENGINE",vars:{bg:"#100804",panel:"#24150d",panel2:"#1b1009",panel3:"#120a05",line:"#58361e",line2:"#82502d",text:"#fff8ef",muted:"#b39a83",accent:"#f97316",accentStrong:"#c2410c",accentBright:"#fdba74",accentSoft:"#54230b",accentSoft2:"#35190c",accentHot:"#fb5d0b",accent2:"#fbbf24",accent2Bright:"#fde68a"}},
    {id:"ice",name:"ICE",tag:"ARCTIC GLASS",vars:{bg:"#020b13",panel:"#0b1b29",panel2:"#071522",panel3:"#03101a",line:"#27485f",line2:"#47708a",text:"#f4fbff",muted:"#8ea7b8",accent:"#7dd3fc",accentStrong:"#0369a1",accentBright:"#bae6fd",accentSoft:"#0a3550",accentSoft2:"#09283d",accentHot:"#38bdf8",accent2:"#a5b4fc",accent2Bright:"#c7d2fe"}},
    {id:"matrix",name:"MATRIX",tag:"TERMINAL GREEN",vars:{bg:"#010802",panel:"#071608",panel2:"#051205",panel3:"#020b03",line:"#1f4724",line2:"#376d3d",text:"#ecffec",muted:"#7ca17e",accent:"#39ff63",accentStrong:"#12852a",accentBright:"#9affaa",accentSoft:"#0b3b15",accentSoft2:"#09280f",accentHot:"#20df49",accent2:"#16a34a",accent2Bright:"#86efac"}},
    {id:"sakura",name:"SAKURA",tag:"SOFT NEON",vars:{bg:"#10070e",panel:"#251522",panel2:"#1d101a",panel3:"#120810",line:"#563249",line2:"#7c4c6c",text:"#fff7fb",muted:"#b197a9",accent:"#f472b6",accentStrong:"#be185d",accentBright:"#fbcfe8",accentSoft:"#501631",accentSoft2:"#351421",accentHot:"#ec4899",accent2:"#c084fc",accent2Bright:"#e9d5ff"}},
    {id:"monochrome",name:"MONOCHROME",tag:"NO DISTRACTION",vars:{bg:"#08090b",panel:"#17191d",panel2:"#111317",panel3:"#0b0d10",line:"#343840",line2:"#555b65",text:"#f5f5f5",muted:"#9a9ea6",accent:"#d4d4d8",accentStrong:"#71717a",accentBright:"#fafafa",accentSoft:"#303036",accentSoft2:"#232328",accentHot:"#a1a1aa",accent2:"#94a3b8",accent2Bright:"#cbd5e1"}}
  ];

  const DEFAULT_CUSTOM_THEME = {accent:"#a855f7",accent2:"#3b82f6",bg:"#020617",panel:"#10192d"};

  const INITIALIZED_PROFILE_IDS = [
    "ch-ardmrn-insight",
    "ch-hikayat-pohon-ganja",
    "ch-distorsi-sejarah-punk",
    "ch-planet-fauna",
    "ch-ark-garage",
    "ch-ruang-dj",
    "ch-mr-laziz"
  ];

  const CHANNEL_ID_MIGRATION = {
    "ch-acc-tech":"sys-acc-core-test",
    "ch-acc-finance":"biz-sumber-cuan",
    "ch-semesta":"ch-semesta-berbisik",
    "ch-blackjack":"ch-legendary-decks",
    "ch-gokong-battle":"ch-sun-gokong-battle",
    "ch-gokong-journey":"ch-sun-gokong-journey",
    "ch-audio":"sys-studio-os-lab",
    "ch-papa-sauce":"op-papa-sauce",
    "ch-income-lab":"biz-sumber-cuan",
    "ch-bali-virtual-nightlife":"creative-bali-nightlife",
    "ch-acc-core-lab":"sys-acc-core-test",
    "ch-am-studio-lab":"sys-studio-os-lab"
  };

  const channel = (id,code,name,dept,category,extra={}) => ({
    id,code,name,dept,category,kind:"CHANNEL",status:"ACTIVE",platform:"Facebook",passportVersion:5,
    cadence:"Production profile",workflow:"NEXT → KONTEN → POSTER → CAPTION → NEXT",
    mission:`Operate ${name} as an isolated ACC production profile.`,
    canon:`Preserve the locked identity, workflow and current state of ${name}.`,...extra
  });
  const series = (id,code,name,category,extra={}) => ({
    id,code,name,dept:"AM Studio",category,kind:"STUDIO_SERIES",status:"ACTIVE",platform:"Facebook",
    cadence:"Sequential production",workflow:"Passport → Current State → Episode Objective → Scene/Comic → Caption → QC → Publish",
    mission:`Produce ${name} with isolated canon, current state, assets and archive.`,
    canon:`AM STUDIO canon continuity is mandatory for ${name}.`,...extra
  });

  const WORKSPACES = [
    {
      id:"acc-enterprise",code:"ACC-ENT",name:"ACC Enterprise",
      profileLabel:"CHANNEL",collectionLabel:"CHANNELS",
      description:"Media channels and publishing brands only. Projects, departments, operations and system labs are excluded.",
      channels:[
        channel("ch-techverse","CH-101","TechVerse","Technology","Tech Media",{cadence:"Editorial",workflow:"Latest-first research → content → poster → caption → QC → publish",productionFormat:"Latest First; Fact Before Speed; Explain significance. Facebook caption is long-form, journalistic, educational and SEO-friendly with key takeaways, discussion prompt and hashtags.",communication:"Clear, professional and educational. Explain why the technology matters without sacrificing accuracy for speed.",mission:"Explore Today. Build Tomorrow.",canon:"Clean futuristic Electric Blue, Carbon Black and Titanium Silver. Fact before speed."}),
        channel("ch-balinightlife","CH-102","BALINIGHTLIFE","Nightlife","Project Midnight",{platform:"Instagram",cadence:"3 posts/session",workflow:"Research H+1–H+7 events → verify → 3 separate Reels → captions with venue/talent/promoter tags",productionFormat:"One session equals three separate Instagram/Reels posts. Event information is monitored H+1 to H+7 and verified before production.",communication:"English-first for an international audience. Captions must tag official venue, DJ/talent and organizer/promoter accounts whenever relevant.",mission:"English-first Bali nightlife media for an international audience.",canon:"Project Midnight identity; English copy; official partner credits are mandatory."}),
        channel("ch-bali-wedding-dj","CH-103","Bali Wedding DJ","Entertainment","Premium Wedding",{platform:"Instagram",cadence:"Campaign-based",workflow:"Lead insight → trust content → package value → inquiry → booking follow-up",productionFormat:"Marketing content prioritizes trust, inquiry quality, package value and booking conversion.",communication:"Professional, elegant English. Inquiry flow: greeting → event details → availability → package value → deposit → follow-up.",mission:"Premium wedding entertainment brand focused on trust, inquiries and bookings.",canon:"Elegant premium presentation and professional English inquiry workflow."}),
        channel("ch-aku-cinta-malam","CH-104","Aku Cinta Malam","Nightlife","Indonesia Nightlife",{platform:"Instagram",cadence:"3 Reels/day",workflow:"National monitoring → verify → News / Event & Lifestyle / Community",productionFormat:"Three separate daily Reels: News; Event & Lifestyle; Community. Monitor public nightlife information across Indonesia before curation and verification.",communication:"Audience-friendly nightlife media. Preserve venue, talent and partner credits/tags whenever relevant.",mission:"Nightlife information across Indonesia.",canon:"Three separate Reels; venue and talent credits must be preserved."}),
        channel("ch-arda-gaming","CH-105","Arda Gaming HOK","Gaming","Honor of Kings",{cadence:"1 content/day",workflow:"Present four themes → owner chooses one → create content package",productionFormat:"Before generating daily content, always present exactly four choices: Gameplay Match; Honor of Kings News/Updates; Hero Education; Interactive/Community Content. Wait for owner selection.",communication:"Indonesian gaming tone: clear, useful and community-friendly.",mission:"Gameplay, educational content and Honor of Kings updates.",canon:"Always present four theme choices before production."}),
        channel("ch-nadya-gaming","CH-106","Nadya Gaming","Gaming","Roblox Lifestyle",{cadence:"1 content/day",workflow:"Select Club Roblox or Gunung → lifestyle story → poster → caption",productionFormat:"One content per day. Only two games are approved: Club Roblox and Gunung.",communication:"Relaxed Roblox lifestyle voice; use mature-audience notice only when needed.",mission:"Roblox lifestyle content.",canon:"Only Club Roblox and Gunung are allowed until revised."}),
        channel("ch-dunia-bintang","CH-107","Dunia Bintang","Gaming","Roblox Kids",{cadence:"1 content/day",workflow:"Kid-friendly game rotation → episode → poster → caption",productionFormat:"One content per day with random kid-friendly Roblox games and sequential episode numbering.",communication:"Simple, cheerful and child-friendly Indonesian.",mission:"Safe and varied Roblox content for children.",canon:"Avoid repetition; continue sequential episode numbering; no free item code text."}),
        channel("ch-motocamp","CH-108","Motocamp ID","Outdoor","Motorcycle Camping",{cadence:"Up to 5/day",workflow:"Tips Motocamp / Spot & Rute / Gear & Setup / Story & Inspirasi / Berita Motocamp → independent poster and caption",productionFormat:"Five locked core series: Tips Motocamp; Spot & Rute; Gear & Setup; Story & Inspirasi; Berita Motocamp. Maximum five contents per day.",communication:"Practical Indonesian outdoor/motorcycle voice with clear safety and route context.",mission:"Motorcycle camping information and community content.",canon:"Five core series locked; rotate visual templates by series."}),
        channel("ch-semesta-berbisik","CH-109","Semesta Berbisik","Spiritual","Tarot & Astrology",{cadence:"5 series/day",workflow:"Pesan Semesta → Tarot Harian → Energi Zodiak → Afirmasi Harian → Pesan Semesta Penutup",productionFormat:"Locked daily batch of five separate series: 1) Pesan Semesta, 2) Tarot Harian, 3) Energi Zodiak, 4) Afirmasi Harian, 5) Pesan Semesta Penutup. K=5 materials, P=5 separate posters, C=5 captions.",communication:"Bahasa Indonesia; santai, reflektif, spiritual dan mudah dipahami.",mission:"Daily spiritual reflection through tarot, astrology and affirmations.",canon:"Each poster contains only its own series; five-series batch is locked."}),
        channel("ch-konten-islami","CH-110","Konten Islami","Religion","Islamic Education",{cadence:"5 series/day",workflow:"Prayer Reminder → Heart Reflection → One-Minute Learning → Stories of Prophets/Companions → Daily Dua & Dzikir",productionFormat:"Always produce the full five-series daily batch. K=5 materials, P=5 separate posters, C=5 captions.",communication:"Bahasa Indonesia yang santun, menenangkan, edukatif dan tidak sensasional.",mission:"Premium Islamic reminders and education.",canon:"Always produce the full five-series batch for daily content."}),
        channel("ch-berita-terkini","CH-111","Berita Terkini","News","General News",{cadence:"Freshness-driven",workflow:"Search requested-date news → verify → prioritize fresh/high-engagement non-repeat → poster → caption",productionFormat:"Check the requested date first, prioritize fresh and high-engagement stories, verify before production and avoid previously used topics.",communication:"Neutral, clear Indonesian news writing; separate verified facts from analysis.",mission:"Timely general news with reliable verification.",canon:"Freshness and no-repeat rules are mandatory."}),
        channel("ch-gaming-news","CH-112","ARDMRN Gaming","News","Gaming Media",{cadence:"1 content/day",workflow:"Research latest credible gaming news → select high-engagement non-repeat → analyze → premium poster → caption",productionFormat:"One content per day with current research, analysis, discussion angle and no repeated stories.",communication:"Indonesian gamer-journalist voice: informed, analytical and community-friendly.",mission:"Gaming journalism, analysis and community discussion.",canon:"Use current credible sources and avoid repeated stories."}),
        channel("ch-cinematix","CH-113","ARDMRN Cinematix","News","Film News",{cadence:"3 content/day",workflow:"Breaking News → Fakta → Update Terbaru → original poster → caption",productionFormat:"Three daily content slots: Breaking News; Fakta; Update Terbaru. Research current film information and avoid repeats.",communication:"Indonesian film-media voice: cinematic, informative and analytical.",mission:"Film news and cinematic insight.",canon:"Original visuals; no copyrighted poster reuse."}),
        channel("ch-ardmrn-insight","CH-114","ARDMRN Insight","Insight","Knowledge Media",{status:"READY",passportVersion:5,initializedBuild:213,cadence:"Owner-scheduled",workflow:"Topic → grounded research → insight script → original poster → caption → QC → publish",mission:"Turn complex ideas, facts and observations into clear, useful and discussion-worthy insight content.",canon:"Research first. Explain significance clearly, distinguish fact from interpretation and never publish unsupported claims."}),
        channel("ch-yolo","CH-115","YOLO","Lifestyle","Two-Sided Discussion",{cadence:"5 series/day",workflow:"Five-topic batch → positive vs negative perspective → separate poster → discussion caption",productionFormat:"Five-series daily batch. K=5 materials, P=5 separate posters, C=5 captions. Topics may include YOLO, FOMO, Hustle Culture, Overthinking, Self Love, Minimalisme, Quarter Life Crisis, Fear and Success.",communication:"Balanced Indonesian discussion tone; show both benefits and risks without preaching.",mission:"Explore modern lifestyle ideas from two sides.",canon:"Premium black-gold identity with balanced discussion."}),
        channel("ch-titik-tanya","CH-116","Titik Tanya","Thought","Perspective",{cadence:"Sequential",workflow:"One question → many perspectives → sequential episode poster → caption",productionFormat:"Twelve-part structure is locked. Welcome and Episode 001 — Kenapa Aku Adalah Aku? are canon; continue sequentially from Episode 002.",communication:"Reflective Indonesian; invite multiple perspectives rather than forcing a single answer.",mission:"Satu Pertanyaan. Banyak Perspektif.",canon:"Continue sequentially from locked canon."}),
        channel("ch-putri-ayah","CH-117","Putri Ayah","Family","Father-Daughter",{cadence:"5 sessions/day",workflow:"Ayah→Putri → Putri→Ayah → Momen Ayah & Putri → Pelajaran Hidup → Quotes & Renungan",productionFormat:"Locked five-session daily batch: 1) Ayah→Putri, 2) Putri→Ayah, 3) Momen Ayah & Putri, 4) Pelajaran Hidup, 5) Quotes & Renungan. K=5 materials, P=5 separate posters, C=5 captions.",communication:"Warm, emotional Indonesian centered on the father-daughter bond.",mission:"Emotional father-daughter content.",canon:"Five-session workflow and character faces are locked."}),
        channel("ch-serigala-senja","CH-118","Serigala Senja","Story","Wolf Lore",{cadence:"5 night sessions",workflow:"Five-night series batch → rotating independent poster templates → captions",productionFormat:"Five-series nightly batch. K=5 materials, P=5 separate posters, C=5 captions.",communication:"Atmospheric, reflective Indonesian with strong twilight/wolf-lore mood.",mission:"Atmospheric wolf-character stories and reflections.",canon:"Fixed episode numbering and wolf protagonist lore."}),
        channel("ch-warisan-bali","CH-119","Warisan Bali","Culture","Hindu Bali",{cadence:"5 series/session",workflow:"One ACC session → five materials → five independent posters → five captions",productionFormat:"One production session equals a locked five-series batch. K=5 materials, P=5 separate posters, C=5 captions.",communication:"Respectful Indonesian cultural voice. Every caption begins with Om Swastiastu.",mission:"Preserve and communicate Balinese Hindu heritage.",canon:"Caption begins Om Swastiastu; five-series batch is locked."}),
        channel("ch-jejak-nusantara","CH-120","Jejak Nusantara","History","Nusantara History",{cadence:"Chronological roadmap",workflow:"Chronological roadmap → research-first verification → documentary poster → caption",productionFormat:"Follow the locked chronology from prehistory toward the present; use different templates by series and documentary presentation.",communication:"Clear Indonesian historical narration; distinguish evidence, interpretation and uncertainty.",mission:"Indonesian history from prehistory to today.",canon:"Gold-brown parchment documentary identity."}),
        channel("ch-lentera-weton","CH-121","Lentera Weton","Culture","Primbon Jawa",{cadence:"2 content/day",workflow:"Weton Hari Ini → Primbon/Tips → rotating poster → caption",productionFormat:"Two daily contents: Weton Hari Ini and Primbon/Tips. Rotate premium templates and avoid consecutive repetition.",communication:"Accessible Indonesian with respectful Javanese cultural framing.",mission:"Daily Javanese weton and primbon education.",canon:"Black-gold-brown palette and no consecutive template repetition."}),
        channel("ch-tukang-tambang","CH-122","Tukang Tambang","Web3","Bootcamp",{cadence:"Daily learning",workflow:"News / learning / review / security → project scoring → poster → caption",productionFormat:"Structured bootcamp with quizzes and progress tracking. Score projects on credibility, reward, Android usability, risk and capital; prioritize free Android opportunities.",communication:"Mentor-style Indonesian: practical, security-conscious and explicit about risk.",mission:"Android-first Web3 learning and project evaluation.",canon:"Prioritize free Android opportunities and security."}),
        channel("ch-hikayat-pohon-ganja","CH-123","Hikayat Pohon Ganja","Editorial","Culture & History",{status:"READY",passportVersion:5,initializedBuild:213,cadence:"Owner-scheduled",workflow:"Historical topic → source verification → educational narrative → original poster → caption → QC → publish",mission:"Present cultural and historical narratives through responsible, research-led editorial storytelling.",canon:"Educational and historical framing only. Separate verified history from interpretation; do not promote unsafe or illegal activity."}),
        channel("ch-distorsi-sejarah-punk","CH-124","Distorsi Sejarah Punk","Editorial","Alternative History",{status:"READY",passportVersion:5,initializedBuild:213,cadence:"Owner-scheduled",workflow:"Verified historical baseline → divergence point → speculative scenario → punk visual → caption → QC → publish",mission:"Explore alternative-history scenarios with a distinct punk editorial identity while preserving historical literacy.",canon:"Clearly label speculation. Never present fictional divergence as established history; preserve the punk visual and editorial identity."}),
        channel("ch-planet-fauna","CH-125","Planet Fauna","Nature","Animal Media",{status:"READY",passportVersion:5,initializedBuild:213,cadence:"Owner-scheduled",workflow:"Species/topic selection → credible fact check → educational story → fauna poster → caption → QC → publish",mission:"Create engaging, accurate and conservation-aware animal content for broad audiences.",canon:"Do not fabricate animal facts, taxonomy, behavior or conservation status. Keep depictions respectful and educational."}),
        channel("ch-ark-garage","CH-126","ARK Garage","Automotive","Garage Media",{status:"READY",passportVersion:5,initializedBuild:213,cadence:"Owner-scheduled",workflow:"Automotive topic → specification and safety check → garage script → poster → caption → QC → publish",mission:"Deliver practical automotive, garage, build and enthusiast content with clear technical context.",canon:"Verify specifications and safety information. Distinguish factory data, opinion and modification claims; avoid unsafe instructions."}),
        channel("ch-ruang-dj","CH-127","Ruang DJ","Music","DJ Media",{status:"READY",passportVersion:5,initializedBuild:213,cadence:"Owner-scheduled",workflow:"DJ topic → verify gear/music context → educational or culture script → poster → caption with credits → QC → publish",mission:"Cover DJ culture, performance, equipment and learning in an accessible professional format.",canon:"Respect music rights and credits. Verify equipment claims, event details and artist information before publication."}),
        channel("ch-mr-laziz","CH-128","Mr Laziz","Brand Media","Food & Lifestyle",{status:"READY",passportVersion:5,initializedBuild:213,cadence:"Owner-scheduled",workflow:"Approved brand topic or product → factual details → visual concept → caption → QC → publish",mission:"Operate Mr Laziz as a consistent food-and-lifestyle brand media profile.",canon:"Use only owner-approved products, prices, offers and claims. Preserve brand identity and never invent commercial details."})
      ]
    },
    {
      id:"am-studio",code:"AM-STD",name:"AM Studio / Studio OS",
      profileLabel:"SERIES",collectionLabel:"STUDIO SERIES",
      description:"Original IP, comics and animation series. These are production series, not public channel entities.",
      channels:[
        series("ch-13-pintu","SR-201","13 Pintu Neraka","Supernatural Mystery",{mission:"Indonesian supernatural investigation across thirteen infernal gates.",canon:"Master Character Roster and Character Bibles are locked."}),
        series("ch-amu","SR-202","Arda Moron Universe","Cyberpunk Superhero",{mission:"Neo Avalon cyberpunk superhero universe powered by the modular SŌRAI System.",canon:"Arda Moron age 17; human-first, ninja-first, modular SŌRAI; bright cinematic comic style."}),
        series("ch-sun-gokong-journey","SR-203","Sun Gokong — Versi Perjalanan","Journey Fantasy",{mission:"Bright journey version featuring five travelers.",canon:"White-gold identity; Tang Sancang bald without crown; high image sharpness."}),
        series("ch-sun-gokong-battle","SR-204","Sun Gokong — Versi Pertarungan","Chinese Fantasy Action",{mission:"Combat-focused Sun Gokong epic across thirteen arcs.",canon:"Anthropomorphic monkey warrior; black-gold-red armor, red scarf and locked cover."}),
        series("ch-royal-gambler","SR-205","Royal Gambler / Blackjack","Casino Dark Fantasy",{status:"LINKED",mission:"Legacy Royal Gambler production conversation linked to The Legendary Decks Universe.",canon:"Blackjack replaces the former Royal Gambler hero name; preserve linked history."}),
        series("ch-legendary-decks","SR-206","The Legendary Decks Universe","Casino Dark Fantasy",{mission:"The Dealer, seven legendary decks and hero Blackjack in Crownhaven.",canon:"American comic, gentleman casino aura and steampunk gothic identity."}),
        series("ch-han-you","SR-207","Han You — Pewaris Api Abadi","Artifact Fantasy",{mission:"Artefak: Pewaris Api Abadi and the journey of Han You.",canon:"Direct scene production; no separate cover; Han You has no ponytail."}),
        series("ch-han-kera","SR-208","Han Kera","Monkey Warrior",{mission:"Original anthropomorphic monkey warrior series inside Ling Tian Universe.",canon:"Never humanize face; preserve muzzle, fur, ears, tail, monkey hands and feet."}),
        series("ch-personal-comic","SR-209","Animasi FB / Arda Comics Studio","Personal Series",{cadence:"1 content/day alternating",mission:"Personal Facebook comic with Arda as the recurring main character.",canon:"Locked face, hair, facial hair, tattoos and cinematic multi-panel template."}),
        series("ch-ling-tian","SR-210","Legenda Ling Tian Universe","Cinematic Wuxia",{mission:"Epic Chinese fantasy universe with consistent wuxia worldbuilding.",canon:"Master Visual Style locked: characters, costumes, weapons and world continuity."}),
        series("ch-konoha","SR-211","Animasi Konoha","Animated Satire",{mission:"Fast-production satirical animation series.",canon:"Couples edition every five editions; vertical Reels; AM STUDIO mark."}),
        series("ch-warung-republik","SR-212","Otonk Lennon / Warung Republik","Current-Issue Satire",{mission:"Satirical commentary through the Otonk Lennon character.",canon:"Otonk Lennon design and Episode 15 visual benchmark are locked."}),
        series("ch-arda-family","SR-213","Arda Family","Animated Family",{mission:"Animated family stories featuring the locked seven-character family.",canon:"Gina always hijab; Novi no hijab and tattooed; Nadia shoulder-length hair; bright golden-hour style."})
      ]
    }
  ];

  const PLANNED_SERIES = [
    {id:"plan-mahkota-matahari",code:"PL-301",name:"Mahkota Matahari Artefak",parent:"Legenda Ling Tian Universe",status:"LOCKED",trigger:"Awaiting canon debut"},
    {id:"plan-yue-shen",code:"PL-302",name:"Yue Shen — Cermin Bulan",parent:"Legenda Ling Tian Universe",status:"LOCKED",trigger:"Awaiting canon debut"},
    {id:"plan-pohon-kehidupan",code:"PL-303",name:"Pohon Kehidupan",parent:"Legenda Ling Tian Universe",status:"LOCKED",trigger:"Awaiting canon debut"},
    {id:"plan-han-bing",code:"PL-304",name:"Han Bing — Pedang Es Abadi",parent:"Legenda Ling Tian Universe",status:"LOCKED",trigger:"Awaiting canon debut"},
    {id:"plan-kipas-angin",code:"PL-305",name:"Kipas Angin Surgawi",parent:"Legenda Ling Tian Universe",status:"LOCKED",trigger:"Awaiting canon debut"},
    {id:"plan-tombak-petir",code:"PL-306",name:"Tombak Petir Ungu",parent:"Legenda Ling Tian Universe",status:"LOCKED",trigger:"Awaiting canon debut"},
    {id:"plan-shui-yue",code:"PL-307",name:"Shui Yue — Mutiara Samudra",parent:"Legenda Ling Tian Universe",status:"LOCKED",trigger:"Awaiting canon debut"}
  ];

  const CORPORATE_UNITS = [
    {id:"corp-cto",code:"CORP-01",name:"CTO",type:"Executive Office",status:"ACTIVE",description:"ACC architecture, ACC OS X, PWA, deployment, roadmap and system integration.",linked:["Preview Gemini Link — continuation chat; not counted as a separate entity"]},
    {id:"corp-am-studio",code:"CORP-02",name:"AM Studio",type:"Studio Department",status:"ACTIVE",description:"Original IP, creative production and Studio OS operations."},
    {id:"corp-accounting",code:"CORP-03",name:"Accounting Lead",type:"Business Operations Department",status:"ACTIVE",description:"Accounting governance and PAPA SAUCE LAB bookkeeping."},
    {id:"corp-production",code:"CORP-04",name:"Productions Department",type:"Production Operations",status:"ACTIVE",description:"Cross-channel production orchestration and batch workflow."},
    {id:"corp-income",code:"CORP-05",name:"Income Department",type:"Revenue & Monetization",status:"ACTIVE",description:"Online income research, monetization and revenue projects."}
  ];

  const CREATIVE_PROJECTS = [
    {id:"creative-bali-nightlife",code:"CR-01",name:"Bali Virtual Nightlife Project",type:"Roblox Game",status:"DEFERRED",description:"Bali Virtual Nightlife 24/7 with VIP, tips, automated music/lights and rooftop pool party.",sourceChats:["Bali Virtual Nightlife Project"]},
    {id:"creative-becak-ebike",code:"CR-02",name:"Becak E-Bike",type:"Creative Product",status:"CONCEPT",description:"One parent project with game and real-world concept workstreams.",workstreams:["Project Game Becak E-Bike","Project Becak E-Bike"],sourceChats:["Project Game Becak E-Bike","Project Becak E-Bike"]}
  ];

  const BUSINESS_PROJECTS = [
    {id:"biz-grab-marketing",code:"BZ-01",name:"Grab Marketing",type:"Marketing Project",status:"ACTIVE",description:"Business Lab marketing project."},
    {id:"biz-entego",code:"BZ-02",name:"Startup ENTEGO",type:"Startup Venture",status:"PLANNING",description:"Startup project with its own master plan."},
    {id:"biz-manado-hotplate",code:"BZ-03",name:"Manado Hot-Plate",type:"F&B Venture",status:"PLANNING",description:"Business Lab food and beverage project."},
    {id:"biz-sumber-cuan",code:"BZ-04",name:"Sumber Cuan Otomatis dari HP",type:"Income Lab Project",status:"ACTIVE",description:"Smartphone-first laboratory for testing online income sources."}
  ];

  const BUSINESS_OPERATIONS = [
    {id:"op-papa-sauce",code:"OPS-01",name:"PAPA SAUCE LAB",type:"Business Operation",status:"ACTIVE",description:"Operational accounting, stock, expenses, distribution and reconciliation.",canon:"Never assume data or change balances without explicit instruction."}
  ];

  const SYSTEM_ENVIRONMENTS = [
    {id:"sys-acc-core-test",code:"SYS-01",name:"ACC Core Test Lab",type:"Internal QA Environment",status:"INTERNAL",description:"Preserves Build 210 validation missions, migration history and system QC."},
    {id:"sys-studio-os-lab",code:"SYS-02",name:"Studio OS Legacy QA",type:"Migration-Only Environment",status:"LEGACY",description:"Retains migrated internal records; hidden from production profile selection."}
  ];

  const MODULES = [
    {id:"registry",icon:"▦",name:"Registry Center",desc:"Separate channels, studio series, projects, corporate units, operations and system environments."},
    {id:"studio",icon:"◈",name:"Studio OS",desc:"Production Layer backend, workflow continuity and creative operations."},
    {id:"gemini",icon:"✦",name:"ACC AI Console",desc:"Embedded assistant with free Local Safe Mode and optional server AI connection."},
    {id:"vault",icon:"▣",name:"Knowledge Vault",desc:"Production profile passport, canon, current state and context packages."},
    {id:"graph",icon:"⌘",name:"Graph Inspector",desc:"Visual map of workspaces, modules, workers and data flow."},
    {id:"analytics",icon:"▥",name:"Analytics",desc:"Operational production, asset, queue and worker metrics."},
    {id:"scheduler",icon:"◷",name:"Scheduler",desc:"Create future missions and dispatch them into Production Queue."},
    {id:"notifications",icon:"◉",name:"Notification Center",desc:"Operational alerts, approvals, failures and update messages."},
    {id:"backup",icon:"⇩",name:"Backup Center",desc:"Local snapshots, JSON export, import and recovery mode."},
    {id:"updates",icon:"↻",name:"Update Center",desc:"Permanent PWA identity and future in-app update controls."},
    {id:"health",icon:"♡",name:"System Health",desc:"PWA, network, storage, cache and data integrity status."},
    {id:"experience",icon:"✧",name:"Experience OS",desc:"ACC DNA, personality, ambience, sound, badges and plugin identity."}
  ];

  const STAGES = ["READY","RESEARCH","SCRIPT","POSTER","CAPTION","QC","APPROVAL","COMPLETED"];
  const GM5_STAGES = ["READY","RESEARCH","MATERIAL","POSTER","CAPTION","QC","PUBLISH","VERIFY","DONE"];
  const GM5_WORKER_MAP = {RESEARCH:"RESEARCH",MATERIAL:"SCRIPT",POSTER:"POSTER",CAPTION:"CAPTION",QC:"QC"};
  const PROGRESS = {READY:0,RESEARCH:15,SCRIPT:30,POSTER:45,CAPTION:60,QC:75,APPROVAL:90,COMPLETED:100};
  const ROUTES = {
    RESEARCH:{worker:"RESEARCH_WORKER",label:"Research Specialist"},
    SCRIPT:{worker:"SCRIPT_WORKER",label:"Scriptwriter AI"},
    MATERIAL:{worker:"SCRIPT_WORKER",label:"Material Creator"},
    POSTER:{worker:"POSTER_WORKER",label:"Poster Creator"},
    CAPTION:{worker:"CAPTION_WORKER",label:"Social Captioner"},
    QC:{worker:"QC_WORKER",label:"Editorial QC Auditor"},
    PUBLISH:{worker:"PUBLISHING_WORKER",label:"Publishing Agent"},
    VERIFY:{worker:"QC_WORKER",label:"Publish Verifier"},
    PUBLISHING:{worker:"PUBLISHING_WORKER",label:"Publishing Agent"}
  };
  const WORKER_TYPES = Object.values(ROUTES);
  const PRIORITY_WEIGHT = {HIGH:3,NORMAL:2,LOW:1};

  const channelMap = {};
  WORKSPACES.forEach(workspace => workspace.channels.forEach(profile => {
    channelMap[profile.id] = {...profile,workspaceId:workspace.id,workspaceName:workspace.name};
  }));
  const entityMap = {...channelMap};
  const registerEntities = (items,registryName) => items.forEach(entity => {
    entityMap[entity.id] = {...entity,registryName,workspaceId:null,workspaceName:registryName};
  });
  registerEntities(PLANNED_SERIES,"Planned Studio Series");
  registerEntities(CORPORATE_UNITS,"Corporate Registry");
  registerEntities(CREATIVE_PROJECTS,"Creative Project Registry");
  registerEntities(BUSINESS_PROJECTS,"Business Project Registry");
  registerEntities(BUSINESS_OPERATIONS,"Business Operations Registry");
  registerEntities(SYSTEM_ENVIRONMENTS,"System Registry");

  const ui = {
    tab:"enterprise",
    productionTab:"pipeline",
    ecosystemTab:"launcher",
    developerMode:false,
    registrySearch:"",
    toast:"",
    modalTaskId:null,
    assetSearch:"",
    archiveSearch:"",
    contextDraftTitle:"",
    contextDraftContent:"",
    routeGoal:"Produce the next approved content package",
    routeStage:"RESEARCH",
    queueTitle:"Daily Production Mission",
    queuePriority:"NORMAL",
    scheduleTitle:"Scheduled Production Mission",
    scheduleWhen:"",
    updateAvailable:false,
    updateVersion:null,
    swWaiting:false,
    aiConsoleOpen:false,
    aiInput:"",
    aiLoading:false,
    aiError:"",
    aiStatus:"LOCAL_SAFE",
    aiAccessDraft:"",
    aiAccessOpen:false,
    aiActionFeedback:"",
    gm5Running:false,
    gm5Stage:"READY",
    gm5Error:"",
    gm5CompletedStages:[],
    gm5StartedAt:null,
    gm5FinishedAt:null
  };


  const EXPERIENCE_DEFAULTS = {
    dnaName: "Founder Edition",
    personality: "FOUNDER",
    soundPack: "CYBER",
    atmosphere: "NONE",
    atmosphereIntensity: 35,
    wallpaperData: "",
    wallpaperOpacity: 18,
    wallpaperBlur: 3,
    wallpaperDim: 45,
    badges: ["FOUNDER", "EARLY_ADOPTER", "FIRST_PRODUCTION"],
    plugins: { production:true, themeDeck:true, kai:true, backup:true, scheduler:true }
  };

  const EXPERIENCE_PERSONALITIES = {
    FOUNDER:{name:"Founder",icon:"⚡",tone:"Santai, cepat, kreatif, direct, tetap profesional."},
    CEO:{name:"CEO",icon:"💼",tone:"Ringkas, strategis, fokus keputusan, risiko, dan hasil."},
    NINJA:{name:"Ninja",icon:"🥷",tone:"Taktis, pendek, mission-oriented, minim basa-basi."},
    WUXIA:{name:"Wuxia",icon:"☯",tone:"Elegan, tenang, metafora kultivasi ringan tanpa mengganggu kejelasan."},
    CHILL:{name:"Chill",icon:"🌿",tone:"Santai, hangat, ringan, tetap produktif."}
  };

  const EXPERIENCE_SOUND_PACKS = {
    OFF:{name:"Off",icon:"🔇"},
    CYBER:{name:"Cyber Click",icon:"⚡"},
    MATRIX:{name:"Matrix Beep",icon:"🟢"},
    MILITARY:{name:"Tactical Radio",icon:"🎖️"},
    WUXIA:{name:"Wuxia Chime",icon:"⚔️"},
    CLUB:{name:"Night Club",icon:"🎧"}
  };

  const EXPERIENCE_ATMOSPHERES = {
    NONE:{name:"None",icon:"○"},
    FOREST:{name:"Forest Mist",icon:"🌿"},
    COSMIC:{name:"Cosmic Dust",icon:"🌌"},
    RAIN:{name:"Rain",icon:"🌧️"},
    MATRIX:{name:"Digital Rain",icon:"🟢"},
    EMBERS:{name:"Embers",icon:"🔥"},
    NIGHT:{name:"Night City",icon:"🌃"},
    MILITARY:{name:"Tactical Grid",icon:"🎖️"}
  };

  const ensureExperience=()=>{
    state.experience={
      ...EXPERIENCE_DEFAULTS,
      ...(state.experience||{}),
      plugins:{...EXPERIENCE_DEFAULTS.plugins,...((state.experience||{}).plugins||{})}
    };
    return state.experience;
  };

  const saveExperience=(next)=>{
    state.experience={...ensureExperience(),...next,plugins:{...ensureExperience().plugins,...((next||{}).plugins||{})}};
    save(); applyExperience();
  };

  const playUiSound=(kind="tap")=>{
    const exp=ensureExperience(); if(exp.soundPack==="OFF")return;
    try{
      const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
      const ctx=new AC(),osc=ctx.createOscillator(),gain=ctx.createGain();
      const map={CYBER:[680,.045],MATRIX:[880,.035],MILITARY:[220,.05],WUXIA:[520,.07],CLUB:[110,.055]};
      const [freq,dur]=map[exp.soundPack]||map.CYBER;
      osc.type=exp.soundPack==="CLUB"?"square":"sine";
      osc.frequency.value=kind==="success"?freq*1.35:freq;
      gain.gain.setValueAtTime(.035,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+dur);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+dur);
      setTimeout(()=>ctx.close(),150);
    }catch{}
  };

  const applyExperience=()=>{
    const exp=ensureExperience(),root=document.documentElement;
    root.dataset.accPersonality=exp.personality;
    root.dataset.accAtmosphere=exp.atmosphere;
    root.style.setProperty("--atmosphere-opacity",String(Math.max(0,Math.min(100,Number(exp.atmosphereIntensity||35)))/100));
    root.style.setProperty("--wallpaper-opacity",String(Math.max(0,Math.min(100,Number(exp.wallpaperOpacity??18)))/100));
    root.style.setProperty("--wallpaper-blur",`${Math.max(0,Math.min(30,Number(exp.wallpaperBlur??3)))}px`);
    root.style.setProperty("--wallpaper-dim",String(Math.max(0,Math.min(90,Number(exp.wallpaperDim??45)))/100));
    if(exp.wallpaperData){root.style.setProperty("--acc-wallpaper",`url("${String(exp.wallpaperData).replaceAll('"','%22')}")`);root.dataset.accWallpaper="ON";}else{root.style.removeProperty("--acc-wallpaper");root.dataset.accWallpaper="OFF";}
  };

  const awardBadge=(badge)=>{
    const exp=ensureExperience();
    if(!exp.badges.includes(badge)){exp.badges.push(badge);save();notify("Badge Unlocked",badge.replaceAll("_"," "),"SUCCESS");}
  };


  const compressWallpaperFile=(file)=>new Promise((resolve,reject)=>{
    if(!file || !String(file.type||"").startsWith("image/")) return reject(new Error("Pilih file gambar."));
    const reader=new FileReader();reader.onerror=()=>reject(new Error("File tidak dapat dibaca."));reader.onload=()=>{
      const img=new Image();img.onerror=()=>reject(new Error("Gambar tidak valid."));img.onload=()=>{
        const maxW=1600,maxH=1600,scale=Math.min(1,maxW/img.width,maxH/img.height),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
        const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;canvas.getContext("2d").drawImage(img,0,0,w,h);resolve(canvas.toDataURL("image/jpeg",.78));};img.src=String(reader.result);};reader.readAsDataURL(file);
  });
  const setWallpaperFile=async(file)=>{try{const data=await compressWallpaperFile(file);if(data.length>2500000)return showToast("Wallpaper terlalu besar. Pilih gambar lain.");saveExperience({wallpaperData:data});awardBadge("WALLPAPER_CREATOR");showToast("Wallpaper ACC berhasil dipasang.");render();}catch(err){showToast(err.message||"Wallpaper gagal dipasang.");}};
  const clearWallpaper=()=>{saveExperience({wallpaperData:""});showToast("Wallpaper dikembalikan ke default.");render();};

  const personalityInstruction=()=>{
    const exp=ensureExperience(),p=EXPERIENCE_PERSONALITIES[exp.personality]||EXPERIENCE_PERSONALITIES.FOUNDER;
    return `ACC Personality: ${p.name}. Communication tone: ${p.tone}`;
  };


  const id = prefix => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const now = () => new Date().toISOString();
  const emptyWorkflow = () => ({
    status:"READY",stage:"READY",progress:0,startedAt:null,updatedAt:null,
    approvalNotes:"",revisionTarget:"SCRIPT",archived:false
  });
  const escapeHtml = value => String(value ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const formatTime = value => {
    if(!value) return "—";
    try {
      return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(value));
    } catch { return value; }
  };
  const byteSize = value => new Blob([value]).size;

  const defaultContexts = profile => {
    const profileType = profile.kind === "STUDIO_SERIES" ? "Studio Series" : "Channel";
    const passportVersion = profile.passportVersion || 3;
    return [
      {id:id("ctx"),type:"CHANNEL_PASSPORT",title:`Production Profile Passport v${passportVersion}.0`,version:passportVersion,active:true,
        content:`Profile Type: ${profileType}
Name: ${profile.name}
Code: ${profile.code}
Workspace: ${profile.workspaceName}
Department: ${profile.dept}
Category: ${profile.category}
Status: ${profile.status||"ACTIVE"}
Platform: ${profile.platform||"—"}
Cadence: ${profile.cadence||"—"}
Mission: ${profile.mission||"—"}`},
      {id:id("ctx"),type:"CURRENT_STATE",title:"Current State",version:passportVersion,active:true,
        content:`Operational profile initialized for ${profile.name}. Workflow state, queue, assets, archive, schedules and AI tasks remain isolated by production profile. Current workflow: READY.`},
      {id:id("ctx"),type:"WORKFLOW_RULES",title:"Workflow Rules v3.0",version:passportVersion,active:true,
        content:`Production workflow: ${profile.workflow||"READY → RESEARCH → SCRIPT → POSTER → CAPTION → QC → APPROVAL → COMPLETED"}.${profile.productionFormat?`\nProduction format: ${profile.productionFormat}`:""} ACC Core approval gate remains mandatory.`},
      {id:id("ctx"),type:"BRAND_CANON",title:"Brand & Canon Lock",version:passportVersion,active:true,
        content:`${profile.canon||`Preserve ${profile.name} identity, approved visual language, editorial rules and existing canon.`}${profile.communication?`\nCommunication: ${profile.communication}`:""} Never overwrite locked data without owner approval.`}
    ];
  };

  const baseState = () => ({
    schemaVersion:CURRENT_VERSION,
    appVersion:CURRENT_VERSION,
    activeWorkspaceId:"acc-enterprise",
    activeChannelId:"ch-techverse",
    activeRole:"OWNER",
    workflows:{},
    queue:[],
    assets:[],
    archives:[],
    activity:[],
    publishJobs:[],
    ai:{tasks:[],contexts:{},workerStats:{},providerMode:"LOCAL_SAFE_READY"},
    aiConsole:{histories:{},lastModel:null,lastConnectedAt:null,totalMessages:0},
    notifications:[],
    schedules:[],
    backups:[],
    experience:{...EXPERIENCE_DEFAULTS,plugins:{...EXPERIENCE_DEFAULTS.plugins}},
    settings:{
      updateChannel:"BETA",
      autoBackup:true,
      lastBackupAt:null,
      lastUpdateCheck:null,
      permanentPwaIdentity:true,
      themeId:"neon-x",
      customTheme:{...DEFAULT_CUSTOM_THEME}
    }
  });

  const mapChannelId = channelId => CHANNEL_ID_MIGRATION[channelId] || channelId;
  const refreshScopedRecord = record => {
    if(!record || typeof record !== "object") return record;
    const channelId=mapChannelId(record.channelId);
    const entity=entityMap[channelId];
    return {...record,channelId,channelName:entity?.name||record.channelName||channelId,workspaceId:entity?.workspaceId||record.workspaceId};
  };
  const migrateChannelScopedData = source => {
    const migrated={...source};
    migrated.activeChannelId=mapChannelId(source.activeChannelId||"ch-techverse");
    let activeMapped=channelMap[migrated.activeChannelId];
    if(!activeMapped){
      migrated.activeChannelId="ch-techverse";
      activeMapped=channelMap[migrated.activeChannelId];
    }
    migrated.activeWorkspaceId=activeMapped?.workspaceId || "acc-enterprise";
    migrated.workflows={};
    Object.entries(source.workflows||{}).forEach(([channelId,wf])=>{migrated.workflows[mapChannelId(channelId)]={...(migrated.workflows[mapChannelId(channelId)]||{}),...wf};});
    migrated.queue=(source.queue||[]).map(refreshScopedRecord);
    migrated.assets=(source.assets||[]).map(refreshScopedRecord);
    migrated.archives=(source.archives||[]).map(refreshScopedRecord);
    migrated.activity=(source.activity||[]).map(refreshScopedRecord);
    migrated.publishJobs=(source.publishJobs||[]).map(refreshScopedRecord);
    migrated.schedules=(source.schedules||[]).map(refreshScopedRecord);
    migrated.ai={...(source.ai||{}),tasks:(source.ai?.tasks||[]).map(refreshScopedRecord),contexts:{}};
    Object.entries(source.ai?.contexts||{}).forEach(([channelId,entries])=>{migrated.ai.contexts[mapChannelId(channelId)]=entries;});
    return migrated;
  };

  const normalizeState = input => {
    const fresh = baseState();
    const rawSource = input && typeof input === "object" ? input : {};
    const source = migrateChannelScopedData(rawSource);
    return {
      ...fresh,
      ...source,
      schemaVersion:CURRENT_VERSION,
      appVersion:CURRENT_VERSION,
      workflows:source.workflows || {},
      queue:Array.isArray(source.queue) ? source.queue : [],
      assets:Array.isArray(source.assets) ? source.assets : [],
      archives:Array.isArray(source.archives) ? source.archives : [],
      activity:Array.isArray(source.activity) ? source.activity : [],
      publishJobs:Array.isArray(source.publishJobs) ? source.publishJobs : [],
      ai:{
        ...fresh.ai,
        ...(source.ai || {}),
        providerMode:source.ai?.providerMode || "LOCAL_SAFE_READY",
        tasks:Array.isArray(source.ai?.tasks) ? source.ai.tasks : [],
        contexts:source.ai?.contexts || {},
        workerStats:source.ai?.workerStats || {}
      },
      aiConsole:{
        ...fresh.aiConsole,
        ...(source.aiConsole || {}),
        histories:source.aiConsole?.histories || {}
      },
      notifications:Array.isArray(source.notifications) ? source.notifications : [],
      schedules:Array.isArray(source.schedules) ? source.schedules : [],
      backups:Array.isArray(source.backups) ? source.backups.slice(0,5) : [],
      experience:{...EXPERIENCE_DEFAULTS,...(source.experience || {}),plugins:{...EXPERIENCE_DEFAULTS.plugins,...((source.experience || {}).plugins || {})}},
      settings:{...fresh.settings,...(source.settings || {})}
    };
  };

  const recoverCorruptState = (key, raw, error) => {
    try {
      localStorage.setItem(RECOVERY_KEY, JSON.stringify({key,raw,error:String(error),capturedAt:now()}));
    } catch {}
  };

  const loadState = () => {
    const currentRaw = localStorage.getItem(STORAGE_KEY);
    if(currentRaw){
      try { return normalizeState(JSON.parse(currentRaw)); }
      catch(error){ recoverCorruptState(STORAGE_KEY,currentRaw,error); }
    }

    for(const key of LEGACY_KEYS){
      const raw = localStorage.getItem(key);
      if(!raw) continue;
      try {
        const legacy = JSON.parse(raw);
        const migrated = normalizeState(legacy);
        migrated.notifications.unshift({
          id:id("notice"),type:"SUCCESS",title:"Data Migration Complete",
          message:`Data migrated from ${key} into Build 214 ACC AI Console Integration.`,read:false,createdAt:now()
        });
        return migrated;
      } catch(error){ recoverCorruptState(key,raw,error); }
    }
    return baseState();
  };

  let state = loadState();


  const hexColor = (value,fallback) => /^#[0-9a-f]{6}$/i.test(String(value||"")) ? String(value) : fallback;
  const customTheme = () => {
    const custom={...DEFAULT_CUSTOM_THEME,...(state.settings.customTheme||{})};
    const accent=hexColor(custom.accent,DEFAULT_CUSTOM_THEME.accent);
    const accent2=hexColor(custom.accent2,DEFAULT_CUSTOM_THEME.accent2);
    const bg=hexColor(custom.bg,DEFAULT_CUSTOM_THEME.bg);
    const panel=hexColor(custom.panel,DEFAULT_CUSTOM_THEME.panel);
    return {id:"custom",name:"CUSTOM MIX",tag:"FOUNDER MIX",vars:{
      bg,panel,panel2:panel,panel3:bg,line:"#40506a",line2:"#526078",text:"#f8fafc",muted:"#94a3b8",
      accent,accentStrong:accent,accentBright:accent,accentSoft:panel,accentSoft2:panel,accentHot:accent,accent2,accent2Bright:accent2
    }};
  };
  const currentTheme = () => state.settings.themeId === "custom"
    ? customTheme()
    : (THEME_PRESETS.find(theme=>theme.id===state.settings.themeId) || THEME_PRESETS[0]);
  const applyTheme = () => {
    const theme=currentTheme();
    const root=document.documentElement;
    root.dataset.accTheme=theme.id;
    Object.entries(theme.vars).forEach(([key,value])=>{
      const cssName=key.replace(/[A-Z]/g,letter=>`-${letter.toLowerCase()}`);
      root.style.setProperty(`--${cssName}`,value);
    });
    root.style.colorScheme="dark";
  };


  // Build 215 UI polish layer — visual only; production/publish logic untouched.
  const installBuild215Polish = () => {
    if(document.getElementById("acc-build215-polish")) return;
    const style=document.createElement("style");
    style.id="acc-build215-polish";
    style.textContent=`
      :root{--acc-radius:20px;--acc-radius-sm:14px;--acc-shadow:0 18px 55px rgba(0,0,0,.28)}
      body{background:
        radial-gradient(circle at 12% -10%,color-mix(in srgb,var(--accent) 20%,transparent),transparent 34%),
        radial-gradient(circle at 92% 8%,color-mix(in srgb,var(--accent2) 15%,transparent),transparent 30%),
        var(--bg)!important;background-attachment:fixed!important}
      .shell{min-height:100vh}
      .main{max-width:1440px!important;margin:0 auto!important;padding-bottom:110px!important}
      .header{position:relative;overflow:hidden;border:1px solid color-mix(in srgb,var(--line) 82%,transparent)!important;
        background:linear-gradient(135deg,color-mix(in srgb,var(--panel) 94%,transparent),color-mix(in srgb,var(--panel2) 84%,transparent))!important;
        box-shadow:var(--acc-shadow);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      .header:after{content:"";position:absolute;width:300px;height:300px;right:-130px;top:-180px;border-radius:50%;
        background:color-mix(in srgb,var(--accent) 16%,transparent);filter:blur(18px);pointer-events:none}
      .brand-title{letter-spacing:.08em!important;font-weight:900!important;text-shadow:0 0 24px color-mix(in srgb,var(--accent) 42%,transparent)}
      .logo-shield{filter:drop-shadow(0 0 18px color-mix(in srgb,var(--accent) 38%,transparent));animation:none!important;transform:none!important}
      .logo-shield *,.brand-logo-img{animation:none!important;transform:none!important}
      .theme-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;margin-top:16px!important}
      .theme-card{appearance:none!important;-webkit-appearance:none!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:7px!important;min-width:0!important;padding:13px!important;border:1px solid color-mix(in srgb,var(--line) 85%,transparent)!important;border-radius:16px!important;background:linear-gradient(145deg,color-mix(in srgb,var(--panel2) 96%,transparent),color-mix(in srgb,var(--panel3) 92%,transparent))!important;color:var(--text)!important;text-align:left!important;overflow:hidden!important;box-shadow:0 8px 20px rgba(0,0,0,.16)!important}
      .theme-card.active{border-color:var(--accent)!important;box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 55%,transparent),0 10px 28px color-mix(in srgb,var(--accent) 20%,transparent)!important}
      .theme-card strong{display:block!important;width:100%!important;font-size:.82rem!important;line-height:1.15!important;letter-spacing:.02em!important;white-space:normal!important;overflow-wrap:anywhere!important}
      .theme-card small{display:block!important;color:var(--muted)!important;font-size:.64rem!important;line-height:1.15!important;letter-spacing:.08em!important}
      .theme-swatches{display:grid!important;grid-template-columns:repeat(4,1fr)!important;width:100%!important;height:28px!important;border-radius:9px!important;overflow:hidden!important;border:1px solid color-mix(in srgb,var(--line2) 60%,transparent)!important}
      .theme-swatches span{display:block!important;min-width:0!important;height:100%!important}
      @media(max-width:430px){.theme-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}.theme-card{padding:10px!important}.theme-card strong{font-size:.74rem!important}.theme-card small{font-size:.58rem!important}}
      .tabs{position:sticky;top:8px;z-index:20;padding:7px!important;margin-top:10px!important;border:1px solid color-mix(in srgb,var(--line) 80%,transparent)!important;
        border-radius:18px!important;background:color-mix(in srgb,var(--bg) 74%,transparent)!important;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
        box-shadow:0 12px 35px rgba(0,0,0,.20)}
      .tab{border-radius:12px!important;transition:transform .18s ease,background .18s ease,box-shadow .18s ease!important}
      .tab:hover{transform:translateY(-1px)}
      .tab.active{background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 92%,#fff 8%),var(--accentStrong))!important;
        box-shadow:0 8px 24px color-mix(in srgb,var(--accent) 30%,transparent)!important}
      .card,.item{border-radius:var(--acc-radius)!important;border-color:color-mix(in srgb,var(--line) 78%,transparent)!important;
        background:linear-gradient(145deg,color-mix(in srgb,var(--panel) 96%,transparent),color-mix(in srgb,var(--panel2) 92%,transparent))!important;
        box-shadow:0 12px 32px rgba(0,0,0,.18);transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease}
      button.card:hover{transform:translateY(-3px);border-color:color-mix(in srgb,var(--accent) 55%,var(--line))!important;
        box-shadow:0 18px 42px rgba(0,0,0,.25),0 0 0 1px color-mix(in srgb,var(--accent) 10%,transparent)}
      .stats .card{position:relative;overflow:hidden;min-height:92px}
      .stats .card:after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:.55}
      .stat-value{font-size:clamp(1.45rem,3vw,2.15rem)!important;font-weight:900!important;letter-spacing:-.04em}
      .stat-label,.eyebrow{letter-spacing:.12em!important}
      .btn{border-radius:13px!important;min-height:42px;transition:transform .16s ease,filter .16s ease,box-shadow .16s ease!important}
      .btn:not(:disabled):hover{transform:translateY(-1px);filter:brightness(1.08)}
      .btn.primary,.btn.purple{box-shadow:0 8px 22px color-mix(in srgb,var(--accent) 22%,transparent)}
      select,.select,.textarea,input{border-radius:12px!important;background-color:color-mix(in srgb,var(--panel3) 88%,transparent)!important}
      .badge,.status,.priority{border-radius:999px!important}
      .progress-line{height:7px!important;border-radius:99px!important;overflow:hidden}
      .progress-fill{border-radius:99px;background:linear-gradient(90deg,var(--accentStrong),var(--accentBright))!important;box-shadow:0 0 14px color-mix(in srgb,var(--accent) 35%,transparent)}
      html,body,.shell{max-width:100%;overflow-x:hidden!important}
      .ai-fab{
        position:fixed!important;right:18px!important;bottom:18px!important;left:auto!important;top:auto!important;
        width:62px!important;height:62px!important;min-width:62px!important;min-height:62px!important;max-width:62px!important;max-height:62px!important;
        margin:0!important;padding:0!important;border-radius:999px!important;z-index:70!important;overflow:hidden!important;
        display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:1px!important;
        background:linear-gradient(145deg,var(--accentStrong),var(--accent))!important;color:#fff!important;
        box-shadow:0 14px 36px color-mix(in srgb,var(--accent) 34%,rgba(0,0,0,.35))!important;
        border:1px solid color-mix(in srgb,var(--accentBright) 55%,transparent)!important;
        font:inherit!important;line-height:1!important;transform:none!important;animation:none!important;
        -webkit-appearance:none!important;appearance:none!important;touch-action:manipulation!important
      }
      .ai-fab span{display:block!important;margin:0!important;padding:0!important;font-size:1.1rem!important;font-weight:900!important;line-height:1!important;color:#fff!important}
      .ai-fab small{display:none!important}.ai-fab>span{display:grid!important}.theme-card[role="button"]{cursor:pointer!important;user-select:none!important;-webkit-tap-highlight-color:transparent}.theme-card[role="button"]:active{transform:scale(.985)}
      .ai-fab:hover{filter:brightness(1.08)!important}
      .ai-fab:active{transform:scale(.96)!important}
      .footer-note{opacity:.58;letter-spacing:.12em!important;padding:18px 72px 6px 4px!important}
      .section{scroll-margin-top:82px}
      .card-title{line-height:1.15!important}
      .meta,.muted.small{line-height:1.5!important}
      .actions{gap:9px!important}
      @media(max-width:430px){
        .main{padding-left:10px!important;padding-right:10px!important}
        .header{padding-left:12px!important;padding-right:12px!important}
        .card{padding:14px!important}
        .item{padding:12px!important}
        .actions .btn{flex:1 1 145px!important}
        .theme-grid{gap:8px!important}
        .theme-card{min-height:92px!important;padding:9px!important}
        .theme-swatches{height:24px!important}
        .ai-fab{right:12px!important;bottom:calc(12px + env(safe-area-inset-bottom,0px))!important}
      }
      @media(max-width:720px){.main{padding-left:12px!important;padding-right:12px!important}.header{border-radius:0 0 22px 22px!important}.tabs{top:5px}.stats{gap:9px!important}.stats .card{min-height:78px}.brand-title{font-size:1.22rem!important}.select-grid{gap:8px!important}.ai-fab{right:14px!important;bottom:calc(14px + env(safe-area-inset-bottom,0px))!important;width:58px!important;height:58px!important;min-width:58px!important;min-height:58px!important;max-width:58px!important;max-height:58px!important}}
      /* FIX07 freeze-candidate: touch targets, visual hierarchy, safe mobile edges */
      .theme-card{position:relative!important;transition:border-color .16s ease,box-shadow .16s ease,transform .12s ease!important}
      .theme-card.active:after{content:"✓";position:absolute;right:9px;top:9px;width:21px;height:21px;display:grid;place-items:center;border-radius:999px;background:var(--accent);color:#fff;font-size:12px;font-weight:900;box-shadow:0 4px 12px rgba(0,0,0,.28)}
      .actions>.btn{min-height:42px}
      .footer-note{padding-right:72px!important;min-height:64px!important;display:flex;align-items:center}
      @media(max-width:390px){.theme-grid{grid-template-columns:1fr!important}.theme-card{min-height:82px!important}.theme-swatches{height:22px!important}.brand-title{letter-spacing:.045em!important}}
      @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}.theme-card,.ai-fab,.logo-shield,.brand-logo-img{transition:none!important;animation:none!important}}
    `;
    document.head.appendChild(style);
  };

  const setTheme = themeId => {
    const theme=THEME_PRESETS.find(item=>item.id===themeId);
    if(!theme)return;
    state.settings.themeId=theme.id;
    save();applyTheme();showToast(`Theme aktif: ${theme.name}`);
  };
  const setRandomTheme = () => {
    const choices=THEME_PRESETS.filter(item=>item.id!==state.settings.themeId);
    const theme=choices[Math.floor(Math.random()*choices.length)] || THEME_PRESETS[0];
    state.settings.themeId=theme.id;
    save();applyTheme();showToast(`Surprise theme: ${theme.name}`);
  };
  const setCustomTheme = () => {
    const existing={...DEFAULT_CUSTOM_THEME,...(state.settings.customTheme||{})};
    const read=(id,fallback)=>hexColor(document.getElementById(id)?.value,fallback);
    state.settings.customTheme={
      accent:read("theme-custom-accent",existing.accent),accent2:read("theme-custom-accent2",existing.accent2),
      bg:read("theme-custom-bg",existing.bg),panel:read("theme-custom-panel",existing.panel)
    };
    state.settings.themeId="custom";
    save();applyTheme();showToast("CUSTOM MIX diterapkan.");
  };

  const snapshotPayload = () => {
    const clone = JSON.parse(JSON.stringify(state));
    clone.backups = clone.backups.map(item => ({
      id:item.id,label:item.label,createdAt:item.createdAt,size:item.size,schemaVersion:item.schemaVersion
    }));
    return clone;
  };

  // R6.11H — Storage quota fix.
  // Heavy poster/image bytes stay available in live memory for the current
  // mission/publish request, but are never serialized into localStorage.
  // Persistent state keeps only metadata, text, IDs and URLs.
  const persistentStateJson = () => JSON.stringify(state,(key,value)=>{
    if(key==="mediaBase64") return undefined;
    return value;
  });

  const save = () => {
    state.schemaVersion = CURRENT_VERSION;
    state.appVersion = CURRENT_VERSION;
    try{
      localStorage.setItem(STORAGE_KEY,persistentStateJson());
    }catch(error){
      // Last-resort compaction for older accumulated state. Do not delete
      // the current in-memory poster required by the active mission.
      if(error?.name==="QuotaExceededError" || /quota/i.test(String(error?.message||""))){
        state.notifications=Array.isArray(state.notifications)?state.notifications.slice(0,40):[];
        state.activity=Array.isArray(state.activity)?state.activity.slice(0,120):[];
        state.publishJobs=Array.isArray(state.publishJobs)?state.publishJobs.slice(0,80):[];
        state.ai.tasks=Array.isArray(state.ai?.tasks)?state.ai.tasks.slice(0,80):[];
        state.assets=Array.isArray(state.assets)?state.assets.slice(0,120):[];
        localStorage.setItem(STORAGE_KEY,persistentStateJson());
        return;
      }
      throw error;
    }
  };

  const activeWorkspace = () => WORKSPACES.find(item => item.id === state.activeWorkspaceId) || WORKSPACES[0];
  const activeChannel = () => {
    const workspace = activeWorkspace();
    return workspace.channels.find(item => item.id === state.activeChannelId) || workspace.channels[0];
  };
  const workflowFor = channelId => state.workflows[channelId] || emptyWorkflow();
  const currentWorkflow = () => workflowFor(activeChannel().id);
  const setWorkflow = (channelId,next) => {
    state.workflows[channelId] = {...workflowFor(channelId),...next};
  };

  const notify = (title,message,type="INFO") => {
    state.notifications.unshift({id:id("notice"),title,message,type,read:false,createdAt:now()});
    state.notifications = state.notifications.slice(0,100);
  };

  const showToast = message => {
    ui.toast = message;
    render();
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { ui.toast=""; render(); },2600);
  };

  const ensureContexts = channelId => {
    const channel=channelMap[channelId];
    if(!channel) return [];
    if(!state.ai.contexts[channelId]) state.ai.contexts[channelId] = defaultContexts(channel);
    const entries=state.ai.contexts[channelId];
    const preserved=entries.filter(item=>item.type==="CUSTOM"||item.type==="AI_NOTE");
    const systemTypes=new Set(entries.filter(item=>item.type!=="CUSTOM"&&item.type!=="AI_NOTE").map(item=>item.type));
    defaultContexts(channel).forEach(entry=>{if(!systemTypes.has(entry.type))entries.push(entry);});
    const targetVersion=channel.passportVersion||3;
    if(!entries.some(item=>item.type==="CHANNEL_PASSPORT"&&item.version>=targetVersion)){
      state.ai.contexts[channelId]=[...defaultContexts(channel),...preserved];
    }
    return state.ai.contexts[channelId];
  };
  const ensureAllContexts = () => Object.keys(channelMap).forEach(channelId=>ensureContexts(channelId));
  const isolateAiNotes = () => {
    Object.values(state.ai.contexts||{}).forEach(entries=>{
      if(!Array.isArray(entries))return;
      entries.forEach(entry=>{
        if(entry?.type==="AI_NOTE" || /^ACC AI Note\s*[—-]/i.test(String(entry?.title||""))){
          entry.type="AI_NOTE";
          entry.active=false;
          entry.source=entry.source||"ACC_AI_CONSOLE";
        }
      });
    });
  };
  const injectableContexts = channelId => ensureContexts(channelId).filter(item=>item.active && item.type!=="AI_NOTE" && !/^ACC AI Note\s*[—-]/i.test(String(item.title||"")));

  const addActivity = (action,channelId=activeChannel().id,stage=null) => {
    const wf = workflowFor(channelId);
    state.activity.unshift({
      id:id("log"),time:now(),action,stage:stage || wf.stage,role:state.activeRole,
      channelId,channelCode:channelMap[channelId]?.code || channelId,
      channelName:channelMap[channelId]?.name || channelId
    });
    state.activity = state.activity.slice(0,120);
  };

  const addAsset = ({channelId,type,title,stage,taskId=null,output="",mediaBase64=null,mimeType=null,publicUrl=null}) => {
    state.assets.unshift({
      id:id("asset"),channelId,channelName:channelMap[channelId]?.name || channelId,
      workspaceId:channelMap[channelId]?.workspaceId || state.activeWorkspaceId,
      type,title,stage,taskId,output,mediaBase64,mimeType,publicUrl,version:1,createdAt:now()
    });
    state.assets = state.assets.slice(0,500);
  };

  const createBackup = (label="Manual Backup",silent=false) => {
    const payload = JSON.stringify(snapshotPayload());
    const entry = {
      id:id("backup"),label,createdAt:now(),schemaVersion:CURRENT_VERSION,
      size:byteSize(payload),payload
    };
    state.backups.unshift(entry);
    state.backups = state.backups.slice(0,5);
    state.settings.lastBackupAt = entry.createdAt;
    save();
    if(!silent){
      notify("Backup Created",`${label} berhasil dibuat.`,"SUCCESS");
      save();
      showToast("Backup lokal berhasil dibuat.");
    }
    return entry;
  };

  const gm5SetStage = stage => { ui.gm5Stage=stage; render(); };
  const gm5CompleteStage = stage => { if(!ui.gm5CompletedStages.includes(stage))ui.gm5CompletedStages.push(stage); render(); };
  const gm5Sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
  const gm5WaitForTask = async taskId => {
    const deadline=Date.now()+180000;
    while(Date.now()<deadline){
      const task=state.ai.tasks.find(item=>item.id===taskId);
      if(!task)throw new Error("TASK_NOT_FOUND");
      if(task.status==="SUCCESS")return task;
      if(task.status==="FAILED")throw new Error(task.error||`${task.stage}_FAILED`);
      await gm5Sleep(650);
    }
    throw new Error("TASK_TIMEOUT");
  };
  const gm5RunWorkerStage = async (displayStage,workerStage,channelId,extraGoal="") => {
    gm5SetStage(displayStage);
    const task=routeTask({
      stage:workerStage,
      goal:`GM5 one-button production for ${channelMap[channelId].name}. Execute ${displayStage} using locked profile context and latest upstream assets.${extraGoal?`\n\n${extraGoal}`:""}`,
      channelId,autoRun:true,autoApply:true,source:"GM5_ONE_BUTTON",keepPipeline:true
    });
    if(!task?.id)throw new Error(`${displayStage}_ROUTE_FAILED`);
    const done=await gm5WaitForTask(task.id);
    gm5CompleteStage(displayStage);
    return done;
  };

  const gm5GeneratePosterImage = async (channelId,posterTask) => {
    gm5SetStage("POSTER");
    const accessCode=getAiAccessCode();
    if(!accessCode)throw new Error("AI_ACCESS_MISSING");
    const prompt=[
      `Create the final social media poster for ${channelMap[channelId].name}.`,
      `Use this production direction:`,
      String(posterTask?.output||"").slice(0,1700),
      `Clean professional composition. No fake logos. No watermark. Avoid unreadable tiny text.`
    ].join("\n\n");
    const response=await fetch("/api/acc-image",{method:"POST",headers:{"Content-Type":"application/json","X-ACC-Access-Code":accessCode},body:JSON.stringify({prompt,channelId})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data.ok||!data.imageBase64)throw new Error(data?.error?.code||data?.error?.message||`IMAGE_HTTP_${response.status}`);
    addAsset({channelId,type:"IMAGE",title:`REAL AI POSTER — ${channelMap[channelId].name}`,stage:"POSTER",taskId:posterTask?.id||null,output:`Generated by ${data.model||"Cloudflare Workers AI"}`,mediaBase64:data.imageBase64,mimeType:data.mimeType||"image/jpeg"});
    addActivity(`Real AI poster generated → ${data.model||"Workers AI"}`,channelId,"POSTER");
    save();
    return data;
  };

  const gm5QcDecision = output => {
    const lines=String(output||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    for(const raw of lines.slice(0,8)){
      const line=raw.toUpperCase().replace(/^[-*#>\s]+/,"").trim();
      if(/^PASS\s+WITH\s+REVISION\b/.test(line))return "PASS_WITH_REVISION";
      if(/^PASS\b/.test(line))return "PASS";
      if(/^FAIL\b/.test(line))return "FAIL";
    }
    return "UNKNOWN";
  };
  const runGM5Mission = async () => {
    if(ui.gm5Running)return showToast("GM5 mission sedang berjalan.");
    const channel=activeChannel();
    if(!REAL_PUBLISH_TARGETS[channel.id])return showToast("GM5 real publish baru aktif untuk Golden Page.");
    if(!getAiAccessCode())return showToast("AI ACCESS belum terhubung.");
    if(!getPublishAccessCode())return showToast("Connector access belum terhubung.");

    ui.gm5Running=true;ui.gm5Stage="READY";ui.gm5Error="";ui.gm5CompletedStages=[];ui.gm5StartedAt=now();ui.gm5FinishedAt=null;
    ui.tab="production";ui.productionTab="pipeline";
    try{
      // Fresh production run. Previous completed run remains in assets/activity/publish history.
      state.workflows[channel.id]=emptyWorkflow();
      save();render();
      gm5CompleteStage("READY");
      startProduction(channel.id);
      await gm5RunWorkerStage("RESEARCH","RESEARCH",channel.id);
      await gm5RunWorkerStage("MATERIAL","SCRIPT",channel.id);
      const posterTask=await gm5RunWorkerStage("POSTER","POSTER",channel.id);
      await gm5GeneratePosterImage(channel.id,posterTask);
      await gm5RunWorkerStage("CAPTION","CAPTION",channel.id);
      let qcTask=await gm5RunWorkerStage("QC","QC",channel.id);
      let decision=gm5QcDecision(qcTask.output);

      // R6.11G QC CONTRACT FIX
      // PASS -> publish; PASS WITH REVISION -> publish with warning;
      // FAIL or malformed verdict -> halt.
      if(decision==="PASS_WITH_REVISION"){
        const qcNote=String(qcTask?.output||"").replace(/\s+/g," ").slice(0,300);
        addActivity(`GM5 QC PASS WITH REVISION → publish allowed | ${qcNote}`,channel.id,"QC");
      }else if(decision==="FAIL"){
        const qcNote=String(qcTask?.output||"").replace(/\s+/g," ").slice(0,300);
        addActivity(`GM5 QC FAIL → ${qcNote}`,channel.id,"QC");
        throw new Error("QC_FAILED");
      }else if(decision!=="PASS"){
        const qcNote=String(qcTask?.output||"").replace(/\s+/g," ").slice(0,300);
        addActivity(`GM5 QC CONTRACT UNKNOWN → ${qcNote}`,channel.id,"QC");
        throw new Error("QC_DECISION_UNKNOWN");
      }

      // Critical safety: never silently reuse Alpha-2 test media for a GM5 real-content run.
      if(!hasRealPosterMedia(channel.id))throw new Error("REAL_POSTER_MEDIA_REQUIRED");

      setWorkflow(channel.id,{status:"COMPLETED",stage:"COMPLETED",progress:100,updatedAt:now()});
      addActivity("GM5 QC PASS → automatic completion",channel.id,"COMPLETED");
      save();

      gm5SetStage("PUBLISH");
      await runServerPublishWorkflow(channel.id);
      const job=publishJobForWorkflow(channel.id);
      if(!job||job.status!=="PUBLISHED"||job.connector!=="META_FACEBOOK")throw new Error(job?.error||"REAL_META_PUBLISH_NOT_CONFIRMED");
      gm5CompleteStage("PUBLISH");

      gm5SetStage("VERIFY");
      if(!job.externalPostId)throw new Error("META_POST_ID_MISSING");
      gm5CompleteStage("VERIFY");

      gm5SetStage("DONE");gm5CompleteStage("DONE");ui.gm5FinishedAt=now();
      addActivity(`GM5 mission complete → ${job.externalPostId}`,channel.id,"COMPLETED");
      notify("GM5 ONE BUTTON PASS",`${channel.name} berhasil diproduksi, dipublish, dan diverifikasi.` ,"SUCCESS");
      save();playUiSound("success");showToast("GM5 DONE ✅ REAL FACEBOOK PUBLISHED");
    }catch(error){
      ui.gm5Error=String(error?.message||error);ui.gm5FinishedAt=now();
      addActivity(`GM5 stopped → ${ui.gm5Stage} → ${ui.gm5Error}`,channel.id,ui.gm5Stage);
      notify("GM5 Mission Stopped",`${ui.gm5Stage}: ${ui.gm5Error}`,"ERROR");
      save();showToast(`GM5 berhenti di ${ui.gm5Stage}`);
    }finally{ui.gm5Running=false;render();}
  };

  const startProduction = (channelId=activeChannel().id,queueId=null) => {
    const wf = workflowFor(channelId);
    if(wf.status !== "READY") return showToast("Workflow channel harus READY.");
    const timestamp = now();
    setWorkflow(channelId,{
      status:"RUNNING",stage:"RESEARCH",progress:PROGRESS.RESEARCH,
      startedAt:timestamp,updatedAt:timestamp,approvalNotes:"",revisionTarget:"SCRIPT",archived:false
    });
    if(queueId){
      state.queue = state.queue.map(item => item.id === queueId ? {...item,status:"RUNNING",startedAt:timestamp} : item);
    }
    state.activeWorkspaceId = channelMap[channelId].workspaceId;
    state.activeChannelId = channelId;
    addActivity("Production started",channelId,"RESEARCH");
    notify("Production Started",`${channelMap[channelId].name} masuk tahap RESEARCH.`,"INFO");
    save();
    ui.tab="production";ui.productionTab="pipeline";
    showToast("Production started — Research aktif.");
  };

  const manualNext = () => {
    const channel = activeChannel();
    const wf = currentWorkflow();
    if(wf.status !== "RUNNING") return showToast("Workflow belum RUNNING.");
    const next = STAGES[STAGES.indexOf(wf.stage)+1];
    if(!next || wf.stage === "APPROVAL") return showToast("Gunakan Approval Gate.");
    const status = next === "APPROVAL" ? "AWAITING_APPROVAL" : "RUNNING";
    setWorkflow(channel.id,{stage:next,progress:PROGRESS[next],status,updatedAt:now()});
    addActivity(`Manual advance to ${next}`,channel.id,next);
    if(next === "APPROVAL") notify("Approval Required",`${channel.name} menunggu keputusan Owner.`,"WARNING");
    save();
    showToast(next === "APPROVAL" ? "Approval Gate aktif." : `Stage ${next}`);
  };

  const pauseWorkflow = () => {
    if(currentWorkflow().status !== "RUNNING") return;
    setWorkflow(activeChannel().id,{status:"PAUSED",updatedAt:now()});
    addActivity("Workflow paused");save();showToast("Workflow paused.");
  };
  const resumeWorkflow = () => {
    if(currentWorkflow().status !== "PAUSED") return;
    setWorkflow(activeChannel().id,{status:"RUNNING",updatedAt:now()});
    addActivity("Workflow resumed");save();showToast("Workflow resumed.");
  };
  const resetWorkflow = () => {
    const channel = activeChannel();
    if(!confirm(`Reset workflow ${channel.name} ke READY?`)) return;
    state.workflows[channel.id] = emptyWorkflow();
    state.queue = state.queue.map(item => item.channelId === channel.id && item.status === "RUNNING"
      ? {...item,status:"WAITING",startedAt:null}:item);
    addActivity("Workflow reset",channel.id,"READY");save();showToast("Workflow reset.");
  };

  const approveMission = () => {
    const channel = activeChannel(), wf = currentWorkflow();
    if(wf.status !== "AWAITING_APPROVAL") return showToast("Approval Gate belum aktif.");
    const timestamp = now();
    setWorkflow(channel.id,{status:"COMPLETED",stage:"COMPLETED",progress:100,updatedAt:timestamp});
    state.queue = state.queue.map(item => item.channelId === channel.id && item.status === "RUNNING"
      ? {...item,status:"COMPLETED",completedAt:timestamp}:item);
    addAsset({channelId:channel.id,type:"PACKAGE",title:`Completed Production Package — ${channel.name}`,stage:"COMPLETED",
      output:"Human-approved final production package."});
    addActivity("Mission approved and completed",channel.id,"COMPLETED");
    awardBadge("BUILD_214_STABLE");
    notify("Mission Completed",`${channel.name} selesai 100% dan siap publish/arsip.`,"SUCCESS");
    save();
    if(AUTO_PUBLISH_REAL_TARGETS&&REAL_PUBLISH_TARGETS[channel.id]&&getPublishAccessCode()){
      showToast("Mission completed — auto publish dimulai…");
      setTimeout(()=>runServerPublishWorkflow(channel.id),80);
    }else{
      showToast(REAL_PUBLISH_TARGETS[channel.id]?"Mission completed — Publish Gate siap, QC tidak perlu diulang.":"Mission completed.");
    }
  };

  const requestRevision = () => {
    const channel = activeChannel(), wf = currentWorkflow();
    if(wf.status !== "AWAITING_APPROVAL") return showToast("Approval Gate belum aktif.");
    if(!wf.approvalNotes?.trim()) return showToast("Catatan revisi wajib diisi.");
    const target = wf.revisionTarget || "SCRIPT";
    setWorkflow(channel.id,{status:"RUNNING",stage:target,progress:PROGRESS[target],updatedAt:now()});
    addActivity(`Revision requested to ${target}`,channel.id,target);
    notify("Revision Requested",`${channel.name} dikembalikan ke ${target}.`,"WARNING");
    save();showToast(`Revision: ${target}`);
  };

  const rejectMission = () => {
    const channel=activeChannel(),wf=currentWorkflow();
    if(wf.status !== "AWAITING_APPROVAL") return showToast("Approval Gate belum aktif.");
    if(!wf.approvalNotes?.trim()) return showToast("Catatan penolakan wajib diisi.");
    setWorkflow(channel.id,{status:"REJECTED",updatedAt:now()});
    state.queue = state.queue.map(item => item.channelId === channel.id && item.status === "RUNNING"
      ? {...item,status:"REJECTED",completedAt:now()}:item);
    addActivity("Mission rejected",channel.id,"APPROVAL");
    notify("Mission Rejected",`${channel.name} ditolak oleh Owner.`,"ERROR");
    save();showToast("Mission rejected.");
  };

  const archiveMission = () => {
    const channel=activeChannel(),wf=currentWorkflow();
    if(!["COMPLETED","REJECTED"].includes(wf.status)) return showToast("Mission belum selesai.");
    if(wf.archived) return showToast("Mission sudah diarsip.");
    state.archives.unshift({
      id:id("archive"),channelId:channel.id,channelName:channel.name,workspaceId:state.activeWorkspaceId,
      status:wf.status,stage:wf.stage,progress:wf.progress,startedAt:wf.startedAt,completedAt:wf.updatedAt,
      approvalNotes:wf.approvalNotes,assetCount:state.assets.filter(item => item.channelId===channel.id).length,archivedAt:now()
    });
    setWorkflow(channel.id,{archived:true});
    addActivity("Mission archived",channel.id,wf.stage);
    if(state.settings.autoBackup) createBackup(`Auto Backup — ${channel.name}`,true);
    save();showToast("Mission masuk Archive Center.");
  };

  const addQueue = () => {
    const channel=activeChannel();
    if(!ui.queueTitle.trim()) return showToast("Judul mission wajib diisi.");
    if(state.queue.some(item => item.channelId===channel.id && ["WAITING","RUNNING"].includes(item.status)))
      return showToast("Channel sudah ada di queue aktif.");
    state.queue.unshift({
      id:id("queue"),channelId:channel.id,channelName:channel.name,workspaceId:state.activeWorkspaceId,
      title:ui.queueTitle.trim(),priority:ui.queuePriority,status:"WAITING",createdAt:now(),startedAt:null,completedAt:null
    });
    addActivity(`Added to queue: ${ui.queueTitle.trim()}`,channel.id);
    save();showToast("Mission masuk Queue.");
  };

  const moveQueue = (queueId,delta) => {
    const index=state.queue.findIndex(item=>item.id===queueId),target=index+delta;
    if(index<0||target<0||target>=state.queue.length) return;
    [state.queue[index],state.queue[target]]=[state.queue[target],state.queue[index]];
    save();render();
  };
  const removeQueue = queueId => {
    state.queue=state.queue.filter(item=>item.id!==queueId);save();showToast("Queue item dihapus.");
  };

  const routeTask = ({stage,goal,channelId=activeChannel().id,autoRun=false,autoApply=false,source="MANUAL_ROUTER",keepPipeline=false}) => {
    const route=ROUTES[stage];if(!route) return showToast("Stage tidak punya AI Worker.");
    const existing=state.ai.tasks.find(task=>task.channelId===channelId&&task.stage===stage&&!task.applied&&["READY","RUNNING"].includes(task.status));
    if(existing){
      existing.autoApply=Boolean(existing.autoApply||autoApply);
      existing.source=existing.source||source;
      if(!keepPipeline){ui.tab="production";ui.productionTab="ai";}save();
      showToast(existing.status==="RUNNING"?`${route.label} sedang RUNNING.`:`${route.label} task sudah READY.`);
      if(autoRun&&existing.status==="READY")setTimeout(()=>runTask(existing.id,false,{autoApply:existing.autoApply}),80);
      return existing;
    }
    const contexts=injectableContexts(channelId);
    const task={
      id:id("task"),channelId,channelName:channelMap[channelId].name,stage,workerType:route.worker,workerName:route.label,
      goal:goal?.trim()||`Generate ${stage} output`,status:"READY",attempts:0,retries:0,error:"",output:"",
      contextIds:contexts.map(entry=>entry.id),contextTitles:contexts.map(entry=>entry.title),
      routedAt:now(),startedAt:null,completedAt:null,applied:false,appliedAt:null,
      providerMode:state.ai.providerMode,provider:null,model:null,source,autoApply:Boolean(autoApply)
    };
    state.ai.tasks.unshift(task);state.ai.tasks=state.ai.tasks.slice(0,150);
    addActivity(`AI Router → ${route.label}`,channelId,stage);
    save();if(!keepPipeline){ui.tab="production";ui.productionTab="ai";}showToast(autoRun?`Routing + executing ${route.label}…`:`Routed to ${route.label}.`);
    if(autoRun)setTimeout(()=>runTask(task.id,false,{autoApply:task.autoApply}),80);
    return task;
  };

  const routeActiveStage = () => {
    const wf=currentWorkflow(),channel=activeChannel();
    if(!ROUTES[wf.stage]) return showToast("Stage aktif belum mendukung AI execution.");
    const completed=state.ai.tasks.find(task=>task.channelId===channel.id&&task.stage===wf.stage&&task.status==="SUCCESS"&&!task.applied);
    if(completed){
      applyTask(completed.id,{silent:true});
      ui.tab="production";ui.productionTab="pipeline";render();
      return showToast(`${completed.workerName} output diterapkan — pipeline lanjut.`);
    }
    routeTask({stage:wf.stage,goal:`Execute ${wf.stage} for ${channel.name} using locked channel context and upstream production assets.`,autoRun:true,autoApply:true,source:"PIPELINE_ACTIVE_STAGE"});
  };

  const generateOutput = task => {
    const channel=channelMap[task.channelId];
    const contextLine=(task.contextTitles.length?`Injected context: ${task.contextTitles.join(", ")}.`:"No active context injected.")+`\n${personalityInstruction()}`;
    const outputs={
      RESEARCH:`RESEARCH BRIEF — ${channel.name}

Objective:
${task.goal}

Recommended angles:
1. Primary audience problem and intent.
2. Verified facts or source requirements.
3. Strong opening hook and relevance.
4. Risk, sensitivity and brand-alignment checks.

Deliverable:
A grounded research brief ready for scripting.

${contextLine}`,
      SCRIPT:`SCRIPT DRAFT — ${channel.name}

HOOK:
A concise, high-impact opening aligned to the mission.

BODY:
1. Establish the main context.
2. Present the strongest insight.
3. Add supporting detail and narrative progression.
4. End with a clear takeaway or transition.

CTA:
Invite the audience to respond, continue or take the next action.

Mission:
${task.goal}

${contextLine}`,
      POSTER:`POSTER DIRECTION — ${channel.name}

Format:
Vertical mobile-first composition.

Hierarchy:
1. Main subject / visual focus.
2. Clear headline.
3. Supporting context.
4. Channel identity and production mark.

Quality controls:
- High readability
- Strong focal point
- Consistent branding
- No unnecessary visual clutter
- Safe margins for mobile UI

Mission:
${task.goal}

${contextLine}`,
      CAPTION:`CAPTION DRAFT — ${channel.name}

${task.goal}

Key message:
Deliver the value clearly, keep the tone aligned to the channel and close with a natural engagement prompt.

Suggested ending:
Bagaimana pendapatmu tentang ini?

#ACCOSX #${channel.name.replace(/[^a-zA-Z0-9]/g,"")}

${contextLine}`,
      QC:`QC REPORT — ${channel.name}

Result: PASS WITH HUMAN REVIEW

Checks:
✓ Channel context injected
✓ Workflow stage alignment
✓ Brand and canon preserved
✓ Output hierarchy readable
✓ Human approval still required
✓ No automatic publishing performed

Mission:
${task.goal}

${contextLine}`,
      PUBLISHING:`PUBLISHING CHECKLIST — ${channel.name}

✓ Final package approved
✓ Caption and visual paired
✓ Channel destination verified
✓ Schedule confirmed
✓ Audit log prepared

No publishing action executed. Human authorization remains mandatory.

${contextLine}`
    };
    return outputs[task.stage]||`AI output for ${task.stage}\n\n${task.goal}\n\n${contextLine}`;
  };

  const workerPrompt = task => {
    const stageRules={
      RESEARCH:"Create a grounded research brief with audience intent, content angles, factual/verification needs, risks, and a production recommendation. If current external facts are required, mark them VERIFICATION REQUIRED instead of inventing them.",
      SCRIPT:"Create a production-ready script using the locked profile format and the latest upstream research asset. Preserve exact series names, batch counts, canon, tone, and workflow rules.",
      POSTER:"Create poster direction and a production-ready image prompt only. Preserve the profile visual identity and exact batch/file rules. Do not claim an image file was generated.",
      CAPTION:"Create publish-ready caption copy using the locked profile language, platform, credits/tag rules, CTA style, and exact batch requirements.",
      QC:"Audit the upstream production package against locked profile context. A POSTER asset with hasMedia=true counts as a real generated poster. Return exactly one decision on the first line: PASS, PASS WITH REVISION, or FAIL. Then give concise reasons. Never request revision merely because binary image bytes are not embedded in the text output when hasMedia=true.",
      PUBLISHING:"Create a publishing checklist only. Never claim anything was posted or scheduled unless an executed ACC action proves it."
    };
    return `You are ${task.workerName}, specialized worker ${task.workerType} inside ACC OS X.

STAGE: ${task.stage}
MISSION: ${task.goal}

${stageRules[task.stage]||"Execute the requested production stage."}

Operational rules:
- Injected ACC profile context is the source of truth.
- Use upstreamAssets when present; do not restart the workflow from scratch.
- Do not invent canon, current state, source verification, approvals, publication, or generated files.
- Preserve exact locked names, counts, order, language, and format.
- Return only the useful stage deliverable, not a discussion of these instructions.`;
  };

  const updateWorkerStats = (workerType,result) => {
    const current=state.ai.workerStats[workerType]||{runs:0,success:0,failed:0};
    state.ai.workerStats[workerType]={
      runs:current.runs+1,success:current.success+(result==="SUCCESS"?1:0),failed:current.failed+(result==="FAILED"?1:0)
    };
  };

  const runTask = async (taskId,forceFailure=false,options={}) => {
    const task=state.ai.tasks.find(item=>item.id===taskId);
    if(!task||task.status==="RUNNING") return;
    task.autoApply=Boolean(options.autoApply??task.autoApply);
    task.status="RUNNING";task.attempts+=1;task.startedAt=now();task.error="";task.provider=null;task.model=null;
    save();render();

    if(forceFailure){
      await new Promise(resolve=>setTimeout(resolve,280));
      const current=state.ai.tasks.find(item=>item.id===taskId);if(!current)return;
      current.status="FAILED";current.error="Simulated worker timeout: context package acknowledged, output generation interrupted.";
      current.completedAt=now();updateWorkerStats(current.workerType,"FAILED");
      addActivity(`${current.workerName} failed`,current.channelId,current.stage);
      notify("AI Worker Failed",`${current.workerName} gagal. Retry tersedia.`,"ERROR");
      save();render();showToast("Worker failure captured. RETRY tersedia.");return;
    }

    const accessCode=getAiAccessCode();
    if(!accessCode){
      task.status="FAILED";task.error="SERVER AI access belum terhubung. Hubungkan AI ACCESS agar specialized worker bisa dieksekusi.";
      task.completedAt=now();task.provider="NO_SERVER_ACCESS";updateWorkerStats(task.workerType,"FAILED");
      addActivity(`${task.workerName} blocked — AI access missing`,task.channelId,task.stage);
      save();render();showToast("Worker belum bisa jalan — AI ACCESS belum terhubung.");return;
    }

    try{
      const response=await fetch("/api/acc-ai",{method:"POST",headers:{"Content-Type":"application/json","X-ACC-Access-Code":accessCode},body:JSON.stringify({messages:[{role:"user",content:workerPrompt(task)}],context:buildWorkerContext(task)})});
      if(!response.ok)throw new Error(await extractAiError(response));
      const data=await response.json();
      if(!data.reply)throw new Error("AI worker response kosong.");
      const current=state.ai.tasks.find(item=>item.id===taskId);if(!current)return;
      current.status="SUCCESS";current.output=data.reply;current.completedAt=now();
      current.provider=data.provider||"Cloudflare Workers AI";current.model=data.model||"server-ai";current.providerMode="SERVER_AI";
      state.ai.providerMode="SERVER_AI";updateWorkerStats(current.workerType,"SUCCESS");
      addActivity(`${current.workerName} completed via server AI`,current.channelId,current.stage);
      if(current.autoApply)applyTask(current.id,{silent:true});
      save();render();showToast(current.autoApply?"Worker SUCCESS — output applied, pipeline lanjut.":"Worker execution SUCCESS.");
    }catch(error){
      const current=state.ai.tasks.find(item=>item.id===taskId);if(!current)return;
      current.status="FAILED";current.error=String(error?.message||error);current.completedAt=now();current.provider="SERVER_AI_ERROR";
      updateWorkerStats(current.workerType,"FAILED");addActivity(`${current.workerName} failed`,current.channelId,current.stage);
      notify("AI Worker Failed",`${current.workerName} gagal. Retry tersedia.`,"ERROR");
      save();render();showToast("Worker gagal — cek task lalu RETRY.");
    }
  };

  const retryTask = taskId => {
    const task=state.ai.tasks.find(item=>item.id===taskId);
    if(!task||task.status!=="FAILED")return;
    task.retries+=1;task.status="READY";task.error="";save();runTask(taskId,false,{autoApply:task.autoApply});
  };

  const applyTask = (taskId,options={}) => {
    const task=state.ai.tasks.find(item=>item.id===taskId);
    if(!task||task.status!=="SUCCESS"){if(!options.silent)showToast("Output belum SUCCESS.");return false;}
    if(task.applied||state.assets.some(asset=>asset.taskId===taskId)){if(!options.silent)showToast("Output sudah diterapkan.");return false;}
    const channel=channelMap[task.channelId];
    addAsset({channelId:task.channelId,type:task.stage,title:`${task.stage} Output — ${channel.name}`,stage:task.stage,taskId:task.id,output:task.output});
    task.applied=true;task.appliedAt=now();
    const wf=workflowFor(task.channelId);
    if(wf.status==="RUNNING"&&wf.stage===task.stage){
      const next=STAGES[STAGES.indexOf(wf.stage)+1];
      if(next){
        setWorkflow(task.channelId,{stage:next,progress:PROGRESS[next],status:next==="APPROVAL"?"AWAITING_APPROVAL":"RUNNING",updatedAt:now()});
        addActivity(`AI output applied → ${next}`,task.channelId,next);
        if(next==="APPROVAL")notify("Approval Required",`${channel.name} menunggu keputusan Owner.`,"WARNING");
      }
    } else addActivity("AI output saved as asset",task.channelId,task.stage);
    save();if(!options.silent)showToast("Output diterapkan ke Asset Library dan pipeline.");return true;
  };

  // M001 Publish Core Foundation — R6.9
  // Internal proof-of-life only. No external social API call is made in this revision.
  const publishJobForTask = taskId => state.publishJobs.find(job=>job.sourceTaskId===taskId);

  const createPublishJobFromTask = taskId => {
    const task=state.ai.tasks.find(item=>item.id===taskId);
    if(!task||task.stage!=="PUBLISHING"||task.status!=="SUCCESS") return showToast("Publishing Worker harus SUCCESS dulu.");
    const existing=publishJobForTask(taskId);
    if(existing){showToast(`Publish Job sudah ada — ${existing.status}.`);return existing;}
    const channel=channelMap[task.channelId];
    const job={
      id:id("publish"),sourceTaskId:task.id,channelId:task.channelId,channelName:channel.name,
      workspaceId:channel.workspaceId||state.activeWorkspaceId,platform:String(channel.platform||"Facebook").toUpperCase(),
      status:"QUEUED",attempts:0,idempotencyKey:`${task.channelId}:${task.id}:${String(channel.platform||"facebook").toLowerCase()}`,
      externalPostId:null,publishedAt:null,error:null,createdAt:now(),updatedAt:now(),connector:"MOCK"
    };
    state.publishJobs.unshift(job);state.publishJobs=state.publishJobs.slice(0,250);
    addActivity("Publish Core → job queued",task.channelId,"PUBLISHING");
    save();render();showToast("Publish Job masuk M001 Queue.");return job;
  };

  const runMockPublish = async taskId => {
    let job=publishJobForTask(taskId)||createPublishJobFromTask(taskId);
    if(!job||job.status==="PUBLISHING")return;
    if(job.status==="PUBLISHED")return showToast(`Idempotency guard — sudah PUBLISHED (${job.externalPostId}).`);
    job.status="PUBLISHING";job.attempts+=1;job.error=null;job.updatedAt=now();
    addActivity("publish.started → MOCK",job.channelId,"PUBLISHING");save();render();
    await new Promise(resolve=>setTimeout(resolve,350));
    const current=state.publishJobs.find(item=>item.id===job.id);if(!current)return;
    current.status="PUBLISHED";current.externalPostId=`mock_${Date.now()}`;current.publishedAt=now();current.updatedAt=now();
    addActivity(`publish.succeeded → ${current.externalPostId}`,current.channelId,"PUBLISHING");
    notify("M001 Publish Core PASS",`${current.channelName} berhasil melewati Mock Connector. External Post ID tercatat.`,"SUCCESS");
    save();render();showToast("M001 INTERNAL PROOF-OF-LIFE: PUBLISHED ✅");
  };

  // R6.9.1 — Production UI trigger fix.
  // The production workflow ends at COMPLETED; PUBLISHING is a worker route, not a visible STAGES entry.
  // Therefore the internal Publish Core proof-of-life must be launchable directly from a completed workflow.
  const workflowRunKey = channelId => `${channelId}:${workflowFor(channelId).startedAt||"legacy"}`;
  const publishJobForWorkflow = channelId => {
    const key=workflowRunKey(channelId);
    return state.publishJobs.find(job=>job.sourceWorkflowRunKey===key) ||
      state.publishJobs.find(job=>job.sourceWorkflowId===channelId && !job.sourceWorkflowRunKey);
  };

  const createPublishJobFromWorkflow = channelId => {
    const channel=channelMap[channelId];
    const wf=workflowFor(channelId);
    if(!channel||wf.status!=="COMPLETED") return showToast("Workflow harus COMPLETED dulu.");
    const runKey=workflowRunKey(channelId);
    const existing=state.publishJobs.find(job=>job.sourceWorkflowRunKey===runKey);
    if(existing){showToast(`Publish Job sudah ada — ${existing.status}.`);return existing;}
    const latestAsset=state.assets.find(item=>item.channelId===channelId);
    const job={
      id:id("publish"),sourceWorkflowId:channelId,sourceWorkflowRunKey:runKey,sourceTaskId:null,channelId,channelName:channel.name,
      workspaceId:channel.workspaceId||state.activeWorkspaceId,platform:String(channel.platform||"Facebook").toUpperCase(),
      status:"QUEUED",attempts:0,idempotencyKey:`${runKey}:${String(channel.platform||"facebook").toLowerCase()}`,
      externalPostId:null,publishedAt:null,error:null,createdAt:now(),updatedAt:now(),connector:"MOCK",
      sourceAssetId:latestAsset?.id||null
    };
    state.publishJobs.unshift(job);state.publishJobs=state.publishJobs.slice(0,250);
    addActivity("Publish Core → completed workflow queued",channelId,"PUBLISHING");
    save();render();showToast("Publish Job masuk M001 Queue.");return job;
  };

  const runMockPublishWorkflow = async channelId => {
    let job=publishJobForWorkflow(channelId)||createPublishJobFromWorkflow(channelId);
    if(!job||job.status==="PUBLISHING")return;
    if(job.status==="PUBLISHED")return showToast(`Idempotency guard — sudah PUBLISHED (${job.externalPostId}).`);
    job.status="PUBLISHING";job.attempts+=1;job.error=null;job.updatedAt=now();
    addActivity("publish.started → MOCK",job.channelId,"PUBLISHING");save();render();
    await new Promise(resolve=>setTimeout(resolve,350));
    const current=state.publishJobs.find(item=>item.id===job.id);if(!current)return;
    current.status="PUBLISHED";current.externalPostId=`mock_${Date.now()}`;current.publishedAt=now();current.updatedAt=now();
    addActivity(`publish.succeeded → ${current.externalPostId}`,current.channelId,"PUBLISHING");
    notify("M001 Publish Core PASS",`${current.channelName} berhasil melewati Mock Connector. External Post ID tercatat.`,"SUCCESS");
    save();render();showToast("M001 INTERNAL PROOF-OF-LIFE: PUBLISHED ✅");
  };


  // R6.10A.1 — deployable standalone Connector API bridge. Credentials stay on the server.
  const DEFAULT_PUBLISH_ENDPOINT="https://acc-publish-connector.ardarawk.workers.dev/api/acc-publish";
  const getPublishEndpoint=()=>localStorage.getItem(PUBLISH_ENDPOINT_STORAGE_KEY)||DEFAULT_PUBLISH_ENDPOINT;
  const setPublishEndpoint=value=>{
    const endpoint=String(value||"").trim();
    if(endpoint)localStorage.setItem(PUBLISH_ENDPOINT_STORAGE_KEY,endpoint);else localStorage.removeItem(PUBLISH_ENDPOINT_STORAGE_KEY);
  };
  const getPublishAccessCode=()=>localStorage.getItem(PUBLISH_ACCESS_STORAGE_KEY)||getAiAccessCode()||"";
  const setPublishAccessCode=value=>{
    const code=String(value||"").trim();
    if(code)localStorage.setItem(PUBLISH_ACCESS_STORAGE_KEY,code);else localStorage.removeItem(PUBLISH_ACCESS_STORAGE_KEY);
  };
  const configurePublishAccess=()=>{
    const current=getPublishAccessCode();
    const next=prompt("ACC Publish Connector Access Code\nDisimpan hanya di perangkat ini.",current);
    if(next===null)return;
    setPublishAccessCode(next);
    render();showToast(next?"Publish access tersimpan di perangkat.":"Publish access dihapus.");
  };
  const configurePublishEndpoint=()=>{
    const current=getPublishEndpoint();
    const next=prompt("ACC Publish API URL\nContoh: https://acc-publish-api.<subdomain>.workers.dev",current);
    if(next===null)return;
    const value=String(next||"").trim();
    if(value && !/^https:\/\//i.test(value) && !value.startsWith("/"))return showToast("Gunakan HTTPS URL atau path /api/...");
    setPublishEndpoint(value||"/api/acc-publish");
    render();showToast("Publish API endpoint disimpan.");
  };
  const testPublishEndpointHealth=async()=>{
    const endpoint=getPublishEndpoint();
    try{
      const response=await fetch(endpoint,{method:"GET",headers:{"Accept":"application/json"}});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok)throw new Error(data?.error?.code||`HTTP ${response.status}`);
      showToast(`PUBLISH API ONLINE ✅ ${data.revision||""}`.trim());
    }catch(error){
      showToast(`PUBLISH API OFFLINE — ${String(error?.message||error)}`);
    }
  };
  const sanitizeSocialText = value => String(value||"")
    .replace(/\\*\\*(.*?)\\*\\*/g,"$1")
    .replace(/__(.*?)__/g,"$1")
    .replace(/^#{1,6}\\s+/gm,"")
    .trim();

  const alpha2TestMediaUrl = () => new URL("./alpha2-test-poster.png", window.location.href).href;

  const latestAssetByStage = (channelId,stage) => state.assets.find(item=>item.channelId===channelId&&item.stage===stage&&item.output);
  const directImageUrlFromAsset = asset => {
    if(!asset)return null;
    if(/^https:\/\/\S+\.(?:png|jpe?g|webp)(?:\?\S*)?$/i.test(String(asset.publicUrl||"")))return String(asset.publicUrl);
    const text=String(asset.output||"");
    const match=text.match(/https:\/\/[^\s<>"]+\.(?:png|jpe?g|webp)(?:\?[^\s<>"]*)?/i);
    return match?.[0]||null;
  };
  const hasRealPosterMedia = channelId => {
    const asset=latestAssetByStage(channelId,"POSTER");
    return Boolean(asset?.mediaBase64 || directImageUrlFromAsset(asset));
  };

  const buildPublishPayload = job => {
    const target=REAL_PUBLISH_TARGETS[job.channelId]||null;
    const captionAsset=latestAssetByStage(job.channelId,"CAPTION");
    const posterAsset=latestAssetByStage(job.channelId,"POSTER");
    const message=sanitizeSocialText(captionAsset?.output||`ACC OS X publish test — ${job.channelName}`);
    const assetMediaUrl=directImageUrlFromAsset(posterAsset);
    const imageBase64=posterAsset?.mediaBase64||null;
    const mimeType=posterAsset?.mimeType||"image/jpeg";
    const mediaUrl=imageBase64?null:(assetMediaUrl||alpha2TestMediaUrl());
    return {
      ...job,
      target,
      content:{message,mediaUrl,imageBase64,mimeType},
      clientRevision:PACKAGE_REVISION,
      mediaSource:imageBase64?"AI_IMAGE_BASE64":assetMediaUrl?"POSTER_ASSET":"ALPHA2_TEST_MEDIA"
    };
  };

  const isLegacyMockPublishJob = job => {
    if(!job)return false;
    const connector=String(job.connector||"").toUpperCase();
    const postId=String(job.externalPostId||"").toLowerCase();
    return connector==="MOCK" || connector==="SERVER_MOCK" || postId.startsWith("mock_") || postId.startsWith("server_mock_");
  };

  const runServerPublishWorkflow = async channelId => {
    let job=publishJobForWorkflow(channelId)||createPublishJobFromWorkflow(channelId);
    if(!job||job.status==="PUBLISHING")return;

    if(job.status==="PUBLISHED" && isLegacyMockPublishJob(job)){
      job={...job,id:id("publish"),status:"QUEUED",attempts:0,externalPostId:null,publishedAt:null,error:null,createdAt:now(),updatedAt:now(),connector:"META_FACEBOOK"};
      state.publishJobs.unshift(job);state.publishJobs=state.publishJobs.slice(0,250);
      addActivity("Legacy mock publish state migrated → REAL META job",channelId,"PUBLISHING");
      save();
    } else if(job.status==="PUBLISHED"){
      return showToast(`Idempotency guard — sudah PUBLISHED (${job.externalPostId}).`);
    }
    const target=REAL_PUBLISH_TARGETS[channelId]||null;
    job.status="PUBLISHING";job.attempts+=1;job.error=null;job.connector=target?.connector||"SERVER";job.updatedAt=now();
    addActivity(`publish.started → ${job.connector}`,job.channelId,"PUBLISHING");save();render();
    try{
      const accessCode=getPublishAccessCode();
      if(!accessCode)throw new Error("ACC_CONNECTOR_ACCESS_MISSING");
      const endpoint=getPublishEndpoint();
      const payload=buildPublishPayload(job);
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","X-ACC-Access-Code":accessCode},body:JSON.stringify(payload)});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.ok){
        const e=data?.error||{};
        const detail=[
          e.code||`HTTP_${response.status}`,
          e.metaCode!=null?`META_CODE_${e.metaCode}`:"",
          e.metaSubcode!=null?`SUBCODE_${e.metaSubcode}`:"",
          e.type?`TYPE_${e.type}`:"",
          e.message?String(e.message):"",
          e.fbtraceId?`TRACE_${e.fbtraceId}`:""
        ].filter(Boolean).join(" | ");
        throw new Error(detail||`HTTP ${response.status}`);
      }
      const current=state.publishJobs.find(item=>item.id===job.id);if(!current)return;
      current.status="PUBLISHED";current.connector=data.connector||job.connector||"SERVER";current.externalPostId=data.externalPostId;current.publishedAt=data.publishedAt||now();current.updatedAt=now();
      current.publishMode=data.publishMode||null;
      addActivity(`publish.succeeded → ${current.connector} → ${current.externalPostId}`,current.channelId,"PUBLISHING");
      notify(current.connector==="META_FACEBOOK"?"FACEBOOK PUBLISH SUCCESS":"Connector API PASS",`${current.channelName} → ${current.externalPostId}`,"SUCCESS");
      save();render();showToast(current.connector==="META_FACEBOOK"?"FACEBOOK PUBLISHED ✅":"SERVER PUBLISHED ✅");
    }catch(error){
      const current=state.publishJobs.find(item=>item.id===job.id);if(current){current.status="FAILED";current.error=String(error?.message||error);current.updatedAt=now();}
      addActivity(`publish.failed → ${String(error?.message||error)}`,job.channelId,"PUBLISHING");save();render();showToast(`Publish gagal — ${String(error?.message||error)}`);
    }
  };

  const addContext = () => {
    const channel=activeChannel();
    if(!ui.contextDraftTitle.trim()||!ui.contextDraftContent.trim())return showToast("Judul dan isi context wajib diisi.");
    ensureContexts(channel.id).unshift({
      id:id("ctx"),type:"CUSTOM",title:ui.contextDraftTitle.trim(),version:1,active:true,content:ui.contextDraftContent.trim()
    });
    ui.contextDraftTitle="";ui.contextDraftContent="";addActivity("Custom context added",channel.id);
    save();showToast("Context entry ditambahkan.");
  };
  const toggleContext = contextId => {
    const item=ensureContexts(activeChannel().id).find(entry=>entry.id===contextId);if(!item)return;
    item.active=!item.active;save();render();
  };
  const removeContext = contextId => {
    const channelId=activeChannel().id;
    state.ai.contexts[channelId]=ensureContexts(channelId).filter(entry=>entry.id!==contextId);
    save();showToast("Context entry dihapus.");
  };

  const addSchedule = () => {
    const channel=activeChannel();
    if(!ui.scheduleTitle.trim()||!ui.scheduleWhen) return showToast("Judul dan waktu schedule wajib diisi.");
    state.schedules.unshift({
      id:id("schedule"),title:ui.scheduleTitle.trim(),channelId:channel.id,channelName:channel.name,
      workspaceId:state.activeWorkspaceId,scheduledFor:new Date(ui.scheduleWhen).toISOString(),
      status:"SCHEDULED",createdAt:now(),dispatchedAt:null
    });
    notify("Mission Scheduled",`${channel.name} dijadwalkan pada ${formatTime(ui.scheduleWhen)}.`,"INFO");
    save();showToast("Schedule berhasil dibuat.");
  };

  const dispatchSchedule = scheduleId => {
    const schedule=state.schedules.find(item=>item.id===scheduleId);if(!schedule)return;
    if(schedule.status==="DONE")return showToast("Schedule sudah didispatch.");
    state.queue.unshift({
      id:id("queue"),channelId:schedule.channelId,channelName:schedule.channelName,workspaceId:schedule.workspaceId,
      title:schedule.title,priority:"NORMAL",status:"WAITING",createdAt:now(),startedAt:null,completedAt:null,sourceScheduleId:schedule.id
    });
    schedule.status="DONE";schedule.dispatchedAt=now();
    notify("Schedule Dispatched",`${schedule.title} masuk Production Queue.`,"SUCCESS");
    save();showToast("Schedule masuk Queue.");
  };
  const removeSchedule = scheduleId => {
    state.schedules=state.schedules.filter(item=>item.id!==scheduleId);save();showToast("Schedule dihapus.");
  };

  const validateBackupState = candidate => {
    if(!candidate || typeof candidate!=="object" || Array.isArray(candidate)) throw new Error("Format backup tidak valid");
    const knownWorkspaceIds=new Set(WORKSPACES.map(item=>item.id));
    if(candidate.activeWorkspaceId && !knownWorkspaceIds.has(candidate.activeWorkspaceId)) throw new Error("Workspace backup tidak dikenali");
    if(candidate.queue && !Array.isArray(candidate.queue)) throw new Error("Queue backup rusak");
    if(candidate.assets && !Array.isArray(candidate.assets)) throw new Error("Asset backup rusak");
    if(candidate.archives && !Array.isArray(candidate.archives)) throw new Error("Archive backup rusak");
    return candidate;
  };

  const unpackBackupFile = parsed => {
    if(parsed?.format===BACKUP_FORMAT && parsed?.state){
      return validateBackupState(parsed.state);
    }
    // Backward compatibility: Build 210–R6.3 exported the raw state object.
    return validateBackupState(parsed);
  };

  const exportData = async () => {
    const envelope={
      format:BACKUP_FORMAT,
      product:"ACC OS X",
      build:CURRENT_VERSION,
      revision:PACKAGE_REVISION,
      exportedAt:now(),
      state:snapshotPayload()
    };
    const payload=JSON.stringify(envelope,null,2);
    const date=new Date().toISOString().slice(0,10);
    const filename=`ACC_OS_X_Backup_Build${CURRENT_VERSION}_${PACKAGE_REVISION.replace(/\./g,"-")}_${date}.json`;
    const file=new File([payload],filename,{type:"application/json"});
    try{
      if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
        await navigator.share({title:"ACC OS X Backup",text:`Build ${CURRENT_VERSION} backup`,files:[file]});
      }else{
        const url=URL.createObjectURL(file);
        const anchor=document.createElement("a");
        anchor.href=url;anchor.download=filename;anchor.rel="noopener";
        document.body.appendChild(anchor);anchor.click();anchor.remove();
        setTimeout(()=>URL.revokeObjectURL(url),15000);
      }
      state.settings.lastBackupAt=now();
      notify("Backup Exported",`Build ${CURRENT_VERSION} ${PACKAGE_REVISION} JSON berhasil dibuat.`,"SUCCESS");save();showToast("Backup JSON siap disimpan / dibagikan.");
    }catch(error){
      if(String(error?.name||"")==="AbortError")return;
      notify("Backup Export Failed",String(error?.message||error),"ERROR");showToast("Export backup gagal — coba dari browser jika PWA membatasi file.");
    }
  };

  const importData = file => {
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const parsed=JSON.parse(String(reader.result));
        const importedState=unpackBackupFile(parsed);
        createBackup("Pre-Import Safety Backup",true);
        const preservedBackups=[...state.backups];
        state=normalizeState(importedState);
        state.backups=[...preservedBackups,...state.backups].slice(0,5);
        ensureAllContexts();
        isolateAiNotes();
        notify("Backup Imported",`Data dipulihkan dan dinormalisasi ke Build ${CURRENT_VERSION}.`,"SUCCESS");
        save();showToast("Import berhasil — safety backup tersimpan.");render();
      }catch(error){showToast(`Import gagal: ${error.message}`);}
    };
    reader.readAsText(file);
  };

  const restoreBackup = backupId => {
    const backup=state.backups.find(item=>item.id===backupId);
    if(!backup?.payload)return showToast("Payload backup tidak tersedia.");
    if(!confirm(`Restore ${backup.label}? Safety backup kondisi sekarang akan dibuat otomatis.`))return;
    try{
      createBackup("Pre-Restore Safety Backup",true);
      const retained=[...state.backups];
      const restoredState=validateBackupState(JSON.parse(backup.payload));
      state=normalizeState(restoredState);
      state.backups=retained;
      ensureAllContexts();
      isolateAiNotes();
      notify("Backup Restored",`${backup.label} berhasil dipulihkan. Rollback safety backup tersedia.`,"SUCCESS");
      save();showToast("Restore berhasil — rollback backup tersedia.");render();
    }catch(error){showToast(`Restore gagal: ${error.message}`);}
  };

  const removeBackup = backupId => {
    state.backups=state.backups.filter(item=>item.id!==backupId);save();showToast("Backup dihapus.");
  };

  const clearNotifications = () => {
    state.notifications=[];save();showToast("Notification Center dibersihkan.");
  };
  const markAllRead = () => {
    state.notifications=state.notifications.map(item=>({...item,read:true}));save();showToast("Semua notifikasi dibaca.");
  };

  const checkUpdates = async () => {
    state.settings.lastUpdateCheck=now();save();
    try{
      const response=await fetch(`./version.json?t=${Date.now()}`,{cache:"no-store"});
      if(!response.ok)throw new Error("Version endpoint unavailable");
      const info=await response.json();
      ui.updateVersion=info.version;
      ui.updateAvailable=Number(info.version)>CURRENT_VERSION||ui.swWaiting;
      if(ui.updateAvailable)notify("Update Available",`Build ${info.version} tersedia.`,"INFO");
      save();showToast(ui.updateAvailable?`Update Build ${info.version} tersedia.`:"ACC OS X sudah versi terbaru.");
    }catch(error){showToast("Pemeriksaan update gagal. Coba saat online.");}
  };

  const applyUpdate = async () => {
    const registration=await navigator.serviceWorker?.getRegistration();
    if(registration?.waiting){
      registration.waiting.postMessage({type:"SKIP_WAITING"});
      return;
    }
    await registration?.update();
    showToast("Update diperiksa. Reload bila banner muncul.");
  };

  const clearOldCaches = async () => {
    if(!("caches" in window))return showToast("Cache API tidak tersedia.");
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!=="acc-os-x-build-214").map(key=>caches.delete(key)));
    showToast("Cache versi lama dibersihkan.");
  };

  const sortedQueue = () => [...state.queue].sort((a,b)=>{
    const statusOrder={RUNNING:4,WAITING:3,REJECTED:2,COMPLETED:1};
    const statusDiff=(statusOrder[b.status]||0)-(statusOrder[a.status]||0);
    if(statusDiff)return statusDiff;
    const priorityDiff=(PRIORITY_WEIGHT[b.priority]||0)-(PRIORITY_WEIGHT[a.priority]||0);
    if(priorityDiff)return priorityDiff;
    return new Date(a.createdAt)-new Date(b.createdAt);
  });
  const workerStatus = workerType => {
    const running=state.ai.tasks.find(task=>task.workerType===workerType&&task.status==="RUNNING");
    if(running)return "RUNNING";
    const latest=state.ai.tasks.find(task=>task.workerType===workerType);
    if(!latest)return "IDLE";
    return latest.status==="FAILED"?"FAILED":latest.status==="SUCCESS"?"SUCCESS":latest.status==="READY"?"READY":"IDLE";
  };

  const metrics = () => {
    const workflows=Object.keys(channelMap).map(channelId=>workflowFor(channelId));
    const productionProfiles=Object.values(channelMap);
    return {
      profiles:productionProfiles.length,
      channels:productionProfiles.filter(item=>item.kind==="CHANNEL").length,
      series:productionProfiles.filter(item=>item.kind==="STUDIO_SERIES").length,
      planned:PLANNED_SERIES.length,
      corporate:CORPORATE_UNITS.length,
      creative:CREATIVE_PROJECTS.length,
      business:BUSINESS_PROJECTS.length,
      operations:BUSINESS_OPERATIONS.length,
      system:MODULES.length,
      active:workflows.filter(item=>["RUNNING","PAUSED"].includes(item.status)).length,
      approval:workflows.filter(item=>item.status==="AWAITING_APPROVAL").length,
      completed:workflows.filter(item=>item.status==="COMPLETED").length,
      queue:state.queue.filter(item=>item.status==="WAITING").length,
      assets:state.assets.length,
      aiTasks:state.ai.tasks.length,
      aiSuccess:state.ai.tasks.filter(item=>item.status==="SUCCESS").length,
      failures:state.ai.tasks.filter(item=>item.status==="FAILED").length,
      contexts:Object.values(state.ai.contexts).flat().filter(item=>item.active).length,
      schedules:state.schedules.filter(item=>item.status==="SCHEDULED").length,
      notifications:state.notifications.filter(item=>!item.read).length
    };
  };

  const statusClass=value=>`status ${String(value||"READY").toLowerCase()}`;
  const priorityClass=value=>`priority ${String(value||"NORMAL").toLowerCase()}`;

  const shieldSvg=()=>`<svg class="brand-logo-img" width="58" height="58" viewBox="0 0 58 58" role="img" aria-label="ACC OS X"><defs><linearGradient id="accg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs><path d="M29 3 51 11v16c0 14-9.4 23.2-22 28C16.4 50.2 7 41 7 27V11L29 3Z" fill="url(#accg)"/><path d="M18 37 25.5 19h7L40 37h-6l-1.5-4h-7L24 37h-6Zm9.2-9h3.6L29 23.3 27.2 28Z" fill="#fff"/><text x="29" y="47" text-anchor="middle" font-size="6" font-family="Arial,sans-serif" font-weight="700" fill="#fff">ACC</text></svg>`;

  const headerHtml=()=>{
    const workspace=activeWorkspace(),channel=activeChannel();
    return `
      ${navigator.onLine?"":`<div class="offline mono">OFFLINE — LOCAL ECOSYSTEM MODE</div>`}
      ${ui.updateAvailable||ui.swWaiting?`<div class="update-banner mono"><span>UPDATE ACC OS X TERSEDIA</span><button class="btn purple small-btn mono" data-action="apply-update">UPDATE</button></div>`:""}
      <header class="header mono">
        <div class="brand-row">
          <div class="logo-shield">${shieldSvg()}</div>
          <div class="brand-copy">
            <div class="brand-line"><div class="brand-title">ACC OS X</div><span class="badge">${matchMedia("(display-mode: standalone)").matches?"PWA INSTALLED":"BROWSER"}</span></div>
            <div class="build">Build ${CURRENT_VERSION} • ACC AI / Cloudflare Workers AI</div>
          </div>
        </div>
        <div class="select-grid">
          <div class="field"><label>WORKSPACE</label><select id="workspace-select" class="workspace-select mono">${WORKSPACES.map(item=>`<option value="${item.id}" ${item.id===workspace.id?"selected":""}>${escapeHtml(item.name)}</option>`).join("")}</select></div>
          <div class="field"><label>PROFILE</label><select id="channel-select" class="channel-select mono">${workspace.channels.map(item=>`<option value="${item.id}" ${item.id===channel.id?"selected":""}>${escapeHtml(item.name)}</option>`).join("")}</select></div>
          <div class="field role"><label>ROLE</label><select id="role-select" class="role-select mono">${["OWNER","EDITOR","REVIEWER"].map(role=>`<option value="${role}" ${role===state.activeRole?"selected":""}>${role}</option>`).join("")}</select></div>
        </div>
      </header>`;
  };

  const tabButton=(value,label)=>`<button class="tab ${ui.tab===value?"active":""}" data-action="tab" data-value="${value}">${label}</button>`;
  const navHtml=()=>`<div class="tabs mono">${tabButton("enterprise","⌁ HOME")}${tabButton("channel","▣ CHANNEL")}${tabButton("production","◉ PRODUCE")}${tabButton("system","⚙ SYSTEM")}</div>`;
  const subtabButton=(value,label)=>`<button class="subtab ${ui.productionTab===value?"active":""}" data-action="prod-tab" data-value="${value}">${label}</button>`;
  const productionNav=()=>ui.developerMode?`<div class="subtabs mono">${subtabButton("pipeline","PIPELINE")}${subtabButton("queue","QUEUE")}${subtabButton("ai","AI WORKERS")}${subtabButton("context","CONTEXT VAULT")}${subtabButton("assets","ASSETS")}${subtabButton("archive","ARCHIVE")}</div>`:"";
  const moduleTab=(value,label)=>`<button class="module-tab ${ui.ecosystemTab===value?"active":""}" data-action="module-tab" data-value="${value}">${label}</button>`;

  const statCard=(label,value,color="")=>`<div class="card compact"><div class="stat-label">${label}</div><div class="stat-value ${color}">${value}</div></div>`;

  const enterpriseHtml=()=>{
    const m=metrics(),workspace=activeWorkspace();
    const profileActive=workspace.channels.filter(profile=>profile.status!=="PROFILE_PENDING").length;
    return `<section class="section mono">
      <div class="grid stats">
        ${statCard("CHANNELS",m.channels)}${statCard("STUDIO SERIES",m.series,"blue")}${statCard("PLANNED",m.planned,"purple")}
        ${statCard("CREATIVE PROJECTS",m.creative,"cyan")}${statCard("BUSINESS PROJECTS",m.business,"amber")}${statCard("CORPORATE UNITS",m.corporate,"green")}
        ${statCard("RUNNING",m.active,"green")}${statCard("QUEUE",m.queue,"amber")}
      </div>
      <div style="margin-top:29px"><div class="row between wrap"><div><h2 class="card-title purple">${escapeHtml(workspace.name)}</h2><p class="muted small">${escapeHtml(workspace.description)}</p></div><span class="badge">${workspace.channels.length} ${escapeHtml(workspace.collectionLabel||"PROFILES")}</span></div>
        <div class="grid cards" style="margin-top:13px">${workspace.channels.map(profile=>channelCard(profile)).join("")}</div>
        <button class="btn purple mono" style="width:100%;margin-top:17px" data-action="module-tab-system" data-value="registry">OPEN REGISTRY CENTER</button>
      </div>
      <div class="card" style="margin-top:18px"><div class="eyebrow">CLASSIFICATION POLICY</div><h3 class="card-title">PERSONAL AREA EXCLUDED</h3><p class="muted small">Personal chats are one-time questions and random tasks. They are never counted as channels, projects, departments or permanent ACC entities unless the Owner explicitly promotes them.</p><div class="meta" style="margin-top:12px">Active in this workspace: ${profileActive}/${workspace.channels.length}</div></div>
    </section>`;
  };

  const channelCard=channel=>{
    const wf=workflowFor(channel.id),tasks=state.ai.tasks.filter(task=>task.channelId===channel.id).length;
    return `<button class="card compact mono" style="text-align:left;color:inherit" data-action="open-channel" data-channel="${channel.id}">
      <div class="row between"><div class="grow"><div class="eyebrow">${escapeHtml(channel.code)}</div><div class="item-title truncate">${escapeHtml(channel.name)}</div><div class="meta">${escapeHtml(channel.dept)} • ${escapeHtml(channel.status||"ACTIVE")} • ${tasks} AI tasks</div></div><span class="${statusClass(wf.status)}">${escapeHtml(wf.status)}</span></div>
      <div style="margin-top:15px"><div class="row between tiny"><span class="muted">${wf.stage}</span><span class="purple">${wf.progress}%</span></div><div class="progress-line" style="margin-top:7px"><div class="progress-fill" style="width:${wf.progress}%"></div></div></div>
    </button>`;
  };

  const channelHtml=()=>{
    const profile=activeChannel(),wf=currentWorkflow(),contexts=ensureContexts(profile.id);
    const typeLabel=profile.kind==="STUDIO_SERIES"?"STUDIO SERIES":"CHANNEL";
    return `<section class="section mono"><div class="card">
      <div class="row between wrap"><div class="grow"><div class="eyebrow">${profile.code} • ${typeLabel} • ${activeWorkspace().name}</div><h2 class="card-title truncate">${escapeHtml(profile.name)}</h2><div class="meta">${escapeHtml(profile.dept)} • ${escapeHtml(profile.category)}</div></div><span class="${statusClass(wf.status)}">${escapeHtml(wf.status)}</span></div>
      <div class="grid stats" style="margin-top:19px">${statCard("STAGE",wf.stage,"purple")}${statCard("PROGRESS",`${wf.progress}%`,"blue")}${statCard("PROFILE",profile.status||"ACTIVE","green")}${statCard("CONTEXT",contexts.filter(item=>item.active).length,"cyan")}</div>
      <div class="list" style="margin-top:17px"><div class="item"><div class="eyebrow">MISSION</div><div class="context-content">${escapeHtml(profile.mission||"—")}</div></div><div class="item"><div class="eyebrow">CADENCE • ${escapeHtml(profile.platform||"—")}</div><div class="context-content">${escapeHtml(profile.cadence||"—")}</div></div><div class="item"><div class="eyebrow">LOCKED WORKFLOW</div><div class="context-content">${escapeHtml(profile.workflow||"—")}</div></div></div>
      <div class="actions"><button class="btn primary mono" data-action="open-pipeline">START / OPEN PRODUCTION</button></div>
    </div></section>`;
  };

  const productionHtml=()=>`${productionNav()}${ui.productionTab==="pipeline"?pipelineHtml():""}${ui.productionTab==="queue"?queueHtml():""}${ui.productionTab==="ai"?aiHtml():""}${ui.productionTab==="context"?contextHtml():""}${ui.productionTab==="assets"?assetsHtml():""}${ui.productionTab==="archive"?archiveHtml():""}`;

  const publishCenterHtml=(channel,wf)=>{
    const target=REAL_PUBLISH_TARGETS[channel.id]||null;
    if(!target)return "";
    const job=publishJobForWorkflow(channel.id);
    const caption=latestAssetByStage(channel.id,"CAPTION");
    const poster=latestAssetByStage(channel.id,"POSTER");
    const assetMediaUrl=directImageUrlFromAsset(poster);
    const mediaUrl=assetMediaUrl||alpha2TestMediaUrl();
    const status=job?.status||"READY";
    const published=job?.status==="PUBLISHED"&&job?.connector==="META_FACEBOOK";
    const canPublish=wf.status==="COMPLETED"&&!published;
    return `<div class="card" style="margin-top:17px"><div class="row between wrap"><div class="row grow"><div class="publish-gate-logo" style="width:42px;height:42px;min-width:42px;margin-right:12px;display:grid;place-items:center;border-radius:12px;overflow:hidden">${shieldSvg()}</div><div class="grow"><div class="eyebrow">ACC X • REAL PUBLISH GATE • ALPHA-2 MEDIA</div><h3 class="card-title">${escapeHtml(target.pageName)} → Facebook</h3><div class="meta">QC yang sudah COMPLETED tidak perlu diulang. Publish melanjutkan paket yang sama.</div></div></div><span class="${statusClass(published?"COMPLETED":status)}">${escapeHtml(published?"PUBLISHED":status)}</span></div><div class="list" style="margin-top:15px"><div class="item"><div class="row between"><span class="muted tiny">CAPTION</span><strong class="${caption?"green":"amber"}">${caption?"READY":"MISSING"}</strong></div></div><div class="item"><div class="row between"><span class="muted tiny">POSTER MEDIA</span><strong class="green">${assetMediaUrl?"PUBLIC POSTER URL READY":"ALPHA-2 TEST MEDIA READY"}</strong></div><div class="meta" style="overflow-wrap:anywhere">${escapeHtml(mediaUrl)}</div></div><div class="item"><div class="row between"><span class="muted tiny">CONNECTOR</span><strong>${escapeHtml(target.connector)}</strong></div></div>${job?.externalPostId?`<div class="item"><div class="row between"><span class="muted tiny">POST ID</span><strong class="green">${escapeHtml(job.externalPostId)}</strong></div></div>`:""}${job?.error?`<div class="context-content red">${escapeHtml(job.error)}</div>`:""}</div><div class="actions"><button class="btn green mono" data-action="server-publish-workflow" data-id="${channel.id}" ${canPublish?"":"disabled"}>${published?"FACEBOOK PUBLISHED ✅":job?.status==="PUBLISHING"?"PUBLISHING…":"⚡ PUBLISH NOW"}</button><button class="btn dark mono" data-action="configure-publish-access">CONNECTOR ACCESS</button><button class="btn cyan mono" data-action="test-publish-endpoint">TEST CONNECTOR</button></div></div>`;
  };

  const gm5PipelinePanelHtml = channel => {
    const activeIndex=GM5_STAGES.indexOf(ui.gm5Stage);
    const stageHtml=GM5_STAGES.map((stage,index)=>{
      const done=ui.gm5CompletedStages.includes(stage),active=ui.gm5Stage===stage&&ui.gm5Running,failed=ui.gm5Error&&ui.gm5Stage===stage;
      const mark=failed?"✕":done?"✓":active?"●":"○";
      const cls=failed?"red":done?"green":active?"purple":"muted";
      return `<div class="item" style="padding:10px 12px"><div class="row between"><strong class="${cls}">${mark} ${stage}</strong><span class="muted tiny">${index+1}/${GM5_STAGES.length}</span></div></div>`;
    }).join("");
    return `<div class="card" style="margin-bottom:17px"><div class="row between wrap"><div><div class="eyebrow">GM5 • ONE BUTTON PIPELINE</div><h2 class="card-title">⚡ START MISSION</h2><p class="muted small">Satu tombol menjalankan worker berurutan. Tahap aktif menyala; error berhenti tepat di lantainya.</p></div><span class="${statusClass(ui.gm5Running?"RUNNING":ui.gm5Error?"FAILED":ui.gm5Stage==="DONE"?"COMPLETED":"READY")}">${escapeHtml(ui.gm5Running?"RUNNING":ui.gm5Error?"STOPPED":ui.gm5Stage==="DONE"?"DONE":"READY")}</span></div><div class="list" style="margin-top:14px">${stageHtml}</div>${ui.gm5Error?`<div class="context-content red" style="margin-top:12px">${escapeHtml(ui.gm5Error==="REAL_POSTER_MEDIA_REQUIRED"?"Poster AI belum menghasilkan media gambar nyata. GM5 berhenti sebelum publish.":ui.gm5Error)}</div>`:""}<div class="actions"><button class="btn green mono" data-action="gm5-start" ${ui.gm5Running?"disabled":""}>${ui.gm5Running?"MISSION RUNNING…":"⚡ START ONE-BUTTON MISSION"}</button></div></div>`;
  };

  const developerPipelineHtml=()=>{
    const channel=activeChannel(),wf=currentWorkflow();
    return `<section class="section mono">
      ${gm5PipelinePanelHtml(channel)}
      <div class="card"><div class="row between wrap"><div class="grow"><div class="eyebrow">${channel.code} • PRODUCTION ENGINE</div><h2 class="card-title truncate">${escapeHtml(channel.name)}</h2></div><span class="${statusClass(wf.status)}">${escapeHtml(wf.status)}</span></div>
      <div class="divider"></div><div class="row between small"><span class="muted">Workflow Progress</span><strong class="purple">${wf.progress}%</strong></div><div class="progress-line" style="margin-top:9px"><div class="progress-fill" style="width:${wf.progress}%"></div></div>
      <div class="stage-grid">${STAGES.map((stage,index)=>{const active=wf.stage===stage,done=wf.progress>=PROGRESS[stage]&&stage!=="READY";return `<div class="stage ${active?"active":done?"done":""}"><div><span class="stage-step">STEP ${index+1}</span><span class="stage-name">${stage}</span></div></div>`}).join("")}</div>
      <div class="actions"><button class="btn primary mono" data-action="start-production" ${wf.status!=="READY"?"disabled":""}>▷ START PRODUCTION</button><button class="btn purple mono" data-action="route-active-stage" ${!ROUTES[wf.stage]||wf.status!=="RUNNING"?"disabled":""}>✦ RUN ACTIVE STAGE WITH AI</button><button class="btn ghost mono" data-action="manual-next" ${wf.status!=="RUNNING"||wf.stage==="APPROVAL"?"disabled":""}>MANUAL NEXT</button>${wf.status==="RUNNING"?`<button class="btn amber mono" data-action="pause">Ⅱ PAUSE</button>`:""}${wf.status==="PAUSED"?`<button class="btn green mono" data-action="resume">▷ RESUME</button>`:""}<button class="btn dark mono" data-action="reset">× RESET WORKFLOW</button>${["COMPLETED","REJECTED"].includes(wf.status)?`<button class="btn cyan mono" data-action="archive" ${wf.archived?"disabled":""}>${wf.archived?"ARCHIVED":"ARCHIVE MISSION"}</button>`:""}</div></div>
      ${publishCenterHtml(channel,wf)}
      <div class="card" style="margin-top:17px"><h3 class="card-title">OWNER HUMAN APPROVAL GATE</h3><p class="muted small">Engineering controls preserved for diagnostics.</p>
        <div class="form-grid" style="margin-top:15px"><textarea id="approval-notes" class="textarea mono" placeholder="Approval notes / revision instructions...">${escapeHtml(wf.approvalNotes||"")}</textarea><select id="revision-target" class="select mono">${["SCRIPT","POSTER","CAPTION","QC"].map(stage=>`<option value="${stage}" ${wf.revisionTarget===stage?"selected":""}>${stage}</option>`).join("")}</select></div>
        <div class="actions"><button class="btn green mono" data-action="approve" ${wf.status!=="AWAITING_APPROVAL"?"disabled":""}>APPROVE & COMPLETE</button><button class="btn purple mono" data-action="revision" ${wf.status!=="AWAITING_APPROVAL"?"disabled":""}>REQUEST REVISION</button><button class="btn red mono" data-action="reject" ${wf.status!=="AWAITING_APPROVAL"?"disabled":""}>REJECT</button></div>
      </div>
    </section>`;
  };

  const missionLiveHtml=()=>{
    const channel=activeChannel();
    const currentIndex=Math.max(0,GM5_STAGES.indexOf(ui.gm5Stage));
    const completed=ui.gm5CompletedStages.length;
    const progress=Math.max(0,Math.min(100,Math.round((completed/GM5_STAGES.length)*100)));
    const activeRoute=ROUTES[ui.gm5Stage]||null;
    const workerName=ui.gm5Running?(activeRoute?.label||(ui.gm5Stage==="VERIFY"?"Publish Verifier":ui.gm5Stage==="DONE"?"Mission Controller":"ACC Core")):(ui.gm5Error?"MISSION HALTED":ui.gm5Stage==="DONE"?"MISSION COMPLETE":"ACC CORE STANDBY");
    const started=ui.gm5StartedAt?Date.parse(ui.gm5StartedAt):0;
    const logs=state.activity.filter(item=>item.channelId===channel.id&&(!started||Date.parse(item.time)>=started)).slice(0,18).reverse();
    const stageStrip=GM5_STAGES.map((stage,index)=>{
      const done=ui.gm5CompletedStages.includes(stage),active=ui.gm5Running&&ui.gm5Stage===stage,failed=Boolean(ui.gm5Error)&&ui.gm5Stage===stage;
      const mark=failed?"✕":done?"✓":active?"●":"○";
      const color=failed?"#ff5f6d":done?"#55e6a5":active?"#b789ff":"#6f7892";
      return `<div style="display:flex;align-items:center;gap:6px;min-width:88px;color:${color};font-size:11px;font-weight:800"><span>${mark}</span><span>${stage}</span></div>`;
    }).join("");
    const terminalLines=logs.length?logs.map(item=>`<div style="display:grid;grid-template-columns:64px 1fr;gap:9px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.035)"><span style="color:#66708a">${escapeHtml(new Date(item.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}))}</span><span style="color:${/failed|stopped|error/i.test(item.action)?'#ff6b78':/succeeded|complete|verified|generated/i.test(item.action)?'#69efb3':'#b9c4dc'}">&gt; ${escapeHtml(item.action)}</span></div>`).join(""):`<div style="color:#66708a;padding:10px 0">&gt; ACC CORE READY. Awaiting mission command...</div>`;
    const job=publishJobForWorkflow(channel.id);
    const resultLine=job?.externalPostId?`<div style="margin-top:10px;padding:10px 12px;border:1px solid rgba(85,230,165,.25);border-radius:10px;color:#69efb3;background:rgba(20,90,66,.12)">META POST ID // ${escapeHtml(job.externalPostId)}</div>`:"";
    const buttonText=ui.gm5Running?"MISSION RUNNING…":ui.gm5Error?"↻ RETRY MISSION":ui.gm5Stage==="DONE"?"⚡ START NEW MISSION":"⚡ START MISSION";
    return `<section class="section mono">
      <div class="card" style="padding:14px;background:linear-gradient(180deg,rgba(5,10,20,.98),rgba(8,13,27,.98));border:1px solid rgba(132,95,255,.32);box-shadow:0 0 32px rgba(77,35,170,.12)">
        <div class="row between wrap" style="gap:10px"><div><div class="eyebrow">ACC OS X // LIVE OPERATIONS</div><h2 class="card-title" style="margin:4px 0 0">${escapeHtml(channel.name)}</h2><div class="meta">${escapeHtml(channel.code)} • ${escapeHtml(channel.platform||"Production")}</div></div><span class="${statusClass(ui.gm5Running?"RUNNING":ui.gm5Error?"FAILED":ui.gm5Stage==="DONE"?"COMPLETED":"READY")}">${escapeHtml(ui.gm5Running?"LIVE":ui.gm5Error?"HALTED":ui.gm5Stage==="DONE"?"DONE":"STANDBY")}</span></div>
        <div style="margin-top:14px;display:grid;grid-template-columns:1fr 1fr;gap:9px"><div class="item" style="padding:10px"><div class="muted tiny">ACTIVE WORKER</div><strong style="display:block;margin-top:4px;color:#b789ff">${escapeHtml(workerName)}</strong></div><div class="item" style="padding:10px"><div class="muted tiny">MISSION PROGRESS</div><strong style="display:block;margin-top:4px;color:#69efb3">${progress}% • ${currentIndex+1}/${GM5_STAGES.length}</strong></div></div>
        <div style="margin-top:12px;overflow-x:auto;padding:10px 8px;border:1px solid rgba(255,255,255,.06);border-radius:12px;background:rgba(0,0,0,.22)"><div style="display:flex;gap:12px;min-width:860px">${stageStrip}</div></div>
        <div style="margin-top:12px"><div class="progress-line"><div class="progress-fill" style="width:${progress}%"></div></div></div>
        <div id="mission-terminal-log" style="margin-top:12px;height:46vh;min-height:330px;max-height:580px;overflow:auto;padding:14px;border-radius:14px;background:#030712;border:1px solid rgba(75,238,179,.13);font-size:11px;line-height:1.55;box-shadow:inset 0 0 35px rgba(0,0,0,.38)">
          <div style="color:#69efb3;margin-bottom:9px">ACC://MISSION_TERMINAL — REAL EVENT STREAM</div>${terminalLines}${resultLine}
          ${ui.gm5Error?`<div style="margin-top:12px;padding:12px;border-radius:10px;background:rgba(145,25,43,.16);border:1px solid rgba(255,95,109,.26);color:#ff7d89">ERROR // ${escapeHtml(ui.gm5Error)}</div>`:""}
        </div>
        <div style="margin-top:12px"><button class="btn green mono" style="width:100%;min-height:58px;font-size:14px;letter-spacing:.08em" data-action="gm5-start" ${ui.gm5Running?"disabled":""}>${buttonText}</button></div>
        <div class="meta" style="text-align:center;margin-top:8px">Real workflow events only • no fake terminal animation</div>
      </div>
    </section>`;
  };

  const pipelineHtml=()=>ui.developerMode?developerPipelineHtml():missionLiveHtml();

  const queueHtml=()=>{
    const list=sortedQueue();
    return `<section class="section mono"><div class="card"><h3 class="card-title">ADD PRODUCTION MISSION</h3><div class="form-grid" style="margin-top:15px"><input id="queue-title" class="input mono" value="${escapeHtml(ui.queueTitle)}"><select id="queue-priority" class="select mono">${["HIGH","NORMAL","LOW"].map(priority=>`<option value="${priority}" ${priority===ui.queuePriority?"selected":""}>${priority}</option>`).join("")}</select><button class="btn purple mono" data-action="add-queue">＋ ADD TO QUEUE</button></div></div>
      <div class="list" style="margin-top:17px">${list.map((item,index)=>`<div class="item"><div class="row between wrap"><div class="grow"><div class="eyebrow">${escapeHtml(channelMap[item.channelId]?.code||item.channelId)}</div><div class="item-title truncate">${escapeHtml(item.title)}</div><div class="meta">${escapeHtml(item.channelName)}</div></div><div class="row wrap"><span class="${priorityClass(item.priority)}">${escapeHtml(item.priority)}</span><span class="${statusClass(item.status)}">${escapeHtml(item.status)}</span></div></div><div class="task-actions">${item.status==="WAITING"?`<button class="btn green small-btn mono" data-action="start-queue" data-id="${item.id}">START</button>`:""}<button class="btn dark small-btn mono" data-action="move-queue" data-id="${item.id}" data-delta="-1" ${index===0?"disabled":""}>↑ MOVE UP</button><button class="btn dark small-btn mono" data-action="move-queue" data-id="${item.id}" data-delta="1" ${index===list.length-1?"disabled":""}>↓ MOVE DOWN</button><button class="btn red small-btn mono" data-action="remove-queue" data-id="${item.id}">DELETE</button></div></div>`).join("")||`<div class="empty">Production Queue masih kosong.</div>`}</div>
    </section>`;
  };

  const aiHtml=()=>{
    const channel=activeChannel(),contexts=ensureContexts(channel.id).filter(item=>item.active),tasks=state.ai.tasks.filter(task=>task.channelId===channel.id);
    return `<section class="section mono"><div class="router-box"><div class="row between wrap"><div><div class="eyebrow">ACC AI ROUTER</div><h2 class="card-title">Route Mission to Specialized Worker</h2></div><span class="badge">${contexts.length} CONTEXT ACTIVE</span></div><div class="form-grid two" style="margin-top:17px"><select id="route-stage" class="select mono">${Object.keys(ROUTES).map(stage=>`<option value="${stage}" ${stage===ui.routeStage?"selected":""}>${stage}</option>`).join("")}</select><input id="route-goal" class="input mono" value="${escapeHtml(ui.routeGoal)}"></div><div class="router-route"><div class="route-node">${escapeHtml(channel.name)}</div><div class="route-arrow">→</div><div class="route-node">${escapeHtml(ROUTES[ui.routeStage]?.label||"Worker")}</div></div><button class="btn primary mono" style="width:100%;margin-top:17px" data-action="route-task">ROUTE + RUN TASK</button></div>
      <div style="margin-top:23px"><div class="row between"><h3 class="card-title">EXECUTION TASKS</h3><span class="muted tiny">${tasks.length}/150</span></div><div class="list" style="margin-top:14px">${tasks.map(taskCard).join("")||`<div class="empty">Belum ada task. Gunakan AI Router.</div>`}</div></div>
      <div style="margin-top:27px"><div class="row between"><h3 class="card-title">AI WORKERS</h3><span class="muted tiny">${escapeHtml(state.ai.providerMode)}</span></div><div class="worker-grid" style="margin-top:14px">${WORKER_TYPES.map(worker=>workerCard(worker.worker,worker.label)).join("")}</div></div>
    </section>`;
  };

  const workerCard=(workerType,label)=>{
    const stats=state.ai.workerStats[workerType]||{runs:0,success:0,failed:0},status=workerStatus(workerType);
    return `<div class="worker-card"><div class="row between"><div><div class="eyebrow">${escapeHtml(workerType)}</div><div class="item-title">${escapeHtml(label)}</div></div><span class="worker-state ${status.toLowerCase()}">${status}</span></div><div class="worker-metrics"><div class="metric"><span class="muted tiny">RUNS</span><strong>${stats.runs}</strong></div><div class="metric"><span class="muted tiny">SUCCESS</span><strong class="green">${stats.success}</strong></div><div class="metric"><span class="muted tiny">FAILED</span><strong class="red">${stats.failed}</strong></div></div></div>`;
  };

  const taskCard=task=>`<div class="item task-card ${task.status.toLowerCase()}"><div class="row between wrap"><div class="grow"><div class="eyebrow">${escapeHtml(task.stage)} • ${escapeHtml(task.workerType)}</div><div class="item-title truncate">${escapeHtml(task.goal)}</div><div class="meta">${escapeHtml(task.workerName)} • Context ${task.contextIds.length} • Attempt ${task.attempts} • Retry ${task.retries}${task.autoApply?" • AUTO APPLY":""}</div>${task.provider||task.model?`<div class="meta">${escapeHtml(task.provider||"")}${task.model?` • ${escapeHtml(task.model)}`:""}</div>`:""}</div><span class="${statusClass(task.status)}">${escapeHtml(task.status)}</span></div>${task.error?`<div class="context-content red">${escapeHtml(task.error)}</div>`:""}${task.output?`<div class="output-preview">${escapeHtml(task.output.slice(0,260))}${task.output.length>260?"…":""}</div>`:""}<div class="task-actions">${task.status==="READY"?`<button class="btn green small-btn mono" data-action="run-task" data-id="${task.id}">RUN WORKER</button><button class="btn red small-btn mono" data-action="fail-task" data-id="${task.id}">TEST FAIL</button>`:""}${task.status==="RUNNING"?`<span class="badge">SERVER AI EXECUTING</span>`:""}${task.status==="FAILED"?`<button class="btn amber small-btn mono" data-action="retry-task" data-id="${task.id}">RETRY</button>`:""}${task.status==="SUCCESS"?`<button class="btn purple small-btn mono" data-action="inspect-task" data-id="${task.id}">INSPECT OUTPUT</button><button class="btn cyan small-btn mono" data-action="apply-task" data-id="${task.id}" ${task.applied?"disabled":""}>${task.applied?"APPLIED":"APPLY OUTPUT"}</button>${task.stage==="PUBLISHING"?`<button class="btn green small-btn mono" data-action="mock-publish" data-id="${task.id}">${publishJobForTask(task.id)?.status==="PUBLISHED"?"PUBLISHED ✅":"TEST PUBLISH CORE"}</button>`:""}`:""}</div></div>`;

  const contextHtml=()=>{
    const channel=activeChannel(),contexts=ensureContexts(channel.id),activeCount=injectableContexts(channel.id).length;
    return `<section class="section mono"><div class="card"><div class="row between wrap"><div><div class="eyebrow">${channel.code} • KNOWLEDGE VAULT</div><h2 class="card-title">CONTEXT PACKAGE</h2></div><span class="badge">${activeCount} INJECTED</span></div><p class="muted small">Only active production context is injected into AI tasks. ACC AI Notes are stored as history-only records and never reinjected automatically.</p><div class="divider"></div><div class="form-grid"><input id="context-title" class="input mono" placeholder="Custom context title" value="${escapeHtml(ui.contextDraftTitle)}"><textarea id="context-content" class="textarea mono" placeholder="Context instructions, canon, rules, current state...">${escapeHtml(ui.contextDraftContent)}</textarea><button class="btn purple mono" data-action="add-context">ADD CONTEXT ENTRY</button></div></div><div class="list" style="margin-top:17px">${contexts.map(entry=>`<div class="item"><div class="row between wrap"><div class="grow"><div class="eyebrow">${escapeHtml(entry.type)} • v${entry.version}</div><div class="item-title">${escapeHtml(entry.title)}</div></div>${entry.type==="AI_NOTE"?`<span class="status ready">HISTORY ONLY</span>`:`<button class="toggle ${entry.active?"on":""}" data-action="toggle-context" data-id="${entry.id}"></button>`}</div><div class="context-content">${escapeHtml(entry.content)}</div>${entry.type==="CUSTOM"||entry.type==="AI_NOTE"?`<button class="btn red small-btn mono" style="margin-top:11px" data-action="remove-context" data-id="${entry.id}">DELETE ${entry.type==="AI_NOTE"?"AI NOTE":"CUSTOM CONTEXT"}</button>`:""}</div>`).join("")}</div></section>`;
  };

  const assetsHtml=()=>{
    const query=ui.assetSearch.toLowerCase(),assets=state.assets.filter(item=>`${item.title} ${item.channelName} ${item.type}`.toLowerCase().includes(query));
    return `<section class="section mono"><input id="asset-search" class="input search mono" placeholder="Search assets..." value="${escapeHtml(ui.assetSearch)}"><div class="list">${assets.map(item=>`<div class="item"><div class="row between"><div class="grow"><div class="eyebrow">${escapeHtml(item.type)} • ${escapeHtml(item.stage)}</div><div class="item-title truncate">${escapeHtml(item.title)}</div><div class="meta">${escapeHtml(item.channelName)} • v${item.version} • ${formatTime(item.createdAt)}</div></div><span class="badge">v${item.version}</span></div>${item.output?`<div class="output-preview">${escapeHtml(item.output.slice(0,260))}${item.output.length>260?"…":""}</div>`:""}</div>`).join("")||`<div class="empty">Belum ada asset.</div>`}</div></section>`;
  };

  const archiveHtml=()=>{
    const query=ui.archiveSearch.toLowerCase(),archives=state.archives.filter(item=>`${item.channelName} ${item.status}`.toLowerCase().includes(query));
    return `<section class="section mono"><input id="archive-search" class="input search mono" placeholder="Search archive..." value="${escapeHtml(ui.archiveSearch)}"><div class="list">${archives.map(item=>`<div class="item"><div class="row between"><div class="grow"><div class="item-title">${escapeHtml(item.channelName)}</div><div class="meta">Archived ${formatTime(item.archivedAt)}</div></div><span class="${statusClass(item.status)}">${escapeHtml(item.status)}</span></div><div class="worker-metrics"><div class="metric"><span class="muted tiny">PROGRESS</span><strong>${item.progress}%</strong></div><div class="metric"><span class="muted tiny">ASSETS</span><strong>${item.assetCount}</strong></div><div class="metric"><span class="muted tiny">STAGE</span><strong style="font-size:10px">${escapeHtml(item.stage)}</strong></div></div></div>`).join("")||`<div class="empty">Archive Center masih kosong.</div>`}</div></section>`;
  };

  const ecosystemHtml=()=>`<div class="module-tabs mono">${moduleTab("launcher","MODULES")}${moduleTab("registry","REGISTRY")}${moduleTab("studio","STUDIO OS")}${moduleTab("gemini","AI CONSOLE")}${moduleTab("vault","KNOWLEDGE")}${moduleTab("graph","GRAPH")}${moduleTab("analytics","ANALYTICS")}${moduleTab("scheduler","SCHEDULER")}${moduleTab("notifications","NOTIFICATIONS")}${moduleTab("backup","BACKUP")}${moduleTab("updates","UPDATES")}${moduleTab("health","HEALTH")}${moduleTab("experience","EXPERIENCE")}</div>${ecosystemContent()}`;

  const ecosystemContent=()=>{
    switch(ui.ecosystemTab){
      case"registry":return registryHtml();
      case"studio":return studioHtml();
      case"gemini":return geminiHtml();
      case"vault":return vaultModuleHtml();
      case"graph":return graphHtml();
      case"analytics":return analyticsHtml();
      case"scheduler":return schedulerHtml();
      case"notifications":return notificationsHtml();
      case"backup":return backupHtml();
      case"updates":return updatesHtml();
      case"health":return healthHtml();
      case"experience":return experienceHtml();
      default:return launcherHtml();
    }
  };

  const registryHtml=()=>{
    const query=ui.registrySearch.trim().toLowerCase();
    const match=item=>JSON.stringify(item).toLowerCase().includes(query);
    const statusBadge=item=>`<span class="status ${String(item.status||"ACTIVE").toLowerCase()}">${escapeHtml(item.status||"ACTIVE")}</span>`;
    const staticCard=item=>`<div class="item"><div class="row between wrap"><div class="grow"><div class="eyebrow">${escapeHtml(item.code||"—")} • ${escapeHtml(item.type||item.category||"ENTITY")}</div><div class="item-title">${escapeHtml(item.name)}</div><div class="meta">${escapeHtml(item.description||item.trigger||item.parent||"—")}</div>${item.parent?`<div class="meta purple">Parent: ${escapeHtml(item.parent)}</div>`:""}${item.linked?.length?`<div class="context-content">Linked: ${item.linked.map(escapeHtml).join(" • ")}</div>`:""}${item.workstreams?.length?`<div class="context-content">Workstreams: ${item.workstreams.map(escapeHtml).join(" • ")}</div>`:""}</div>${statusBadge(item)}</div></div>`;
    const profileCard=profile=>`<button class="item mono" style="width:100%;text-align:left;color:inherit" data-action="open-channel" data-channel="${profile.id}"><div class="row between wrap"><div class="grow"><div class="eyebrow">${escapeHtml(profile.code)} • ${escapeHtml(profile.kind==="STUDIO_SERIES"?"STUDIO SERIES":"CHANNEL")}</div><div class="item-title">${escapeHtml(profile.name)}</div><div class="meta">${escapeHtml(profile.category)} • ${escapeHtml(profile.cadence||"—")}</div></div>${statusBadge(profile)}</div></button>`;
    const section=(title,items,renderer=staticCard,subtitle="")=>{
      const filtered=items.filter(match); if(!filtered.length)return "";
      return `<div style="margin-top:22px"><div class="row between wrap"><div><h3 class="card-title purple">${escapeHtml(title)}</h3>${subtitle?`<div class="meta">${escapeHtml(subtitle)}</div>`:""}</div><span class="badge">${filtered.length}</span></div><div class="list" style="margin-top:12px">${filtered.map(renderer).join("")}</div></div>`;
    };
    const channels=Object.values(channelMap).filter(item=>item.kind==="CHANNEL");
    const seriesProfiles=Object.values(channelMap).filter(item=>item.kind==="STUDIO_SERIES");
    const productionProfiles=[...channels,...seriesProfiles];
    const readyProfiles=productionProfiles.filter(item=>item.status!=="PROFILE_PENDING");
    const pendingProfiles=productionProfiles.filter(item=>item.status==="PROFILE_PENDING");
    const initializedProfiles=INITIALIZED_PROFILE_IDS.map(profileId=>channelMap[profileId]).filter(Boolean);
    const systemItems=[...SYSTEM_ENVIRONMENTS,...MODULES.map((module,index)=>({id:`module-${module.id}`,code:`MOD-${String(index+1).padStart(2,"0")}`,name:module.name,type:"System Module",status:"ACTIVE",description:module.desc}))];
    return `<section class="section mono"><div class="card"><div class="row between wrap"><div><div class="eyebrow">BUILD 213 • PROFILE INITIALIZATION LAYER</div><h2 class="card-title">REGISTRY CENTER</h2></div><span class="badge">${productionProfiles.length} PRODUCTION PROFILES</span></div><p class="muted small">Entities remain classified by function. Build 214 initializes every previously pending production profile without changing project, business, corporate or system registries.</p><div class="grid stats" style="margin-top:16px">${statCard("CHANNELS",channels.length)}${statCard("STUDIO SERIES",seriesProfiles.length,"blue")}${statCard("READY",readyProfiles.length,"green")}${statCard("PENDING",pendingProfiles.length,"amber")}${statCard("PLANNED",PLANNED_SERIES.length,"purple")}${statCard("CREATIVE",CREATIVE_PROJECTS.length,"cyan")}${statCard("BUSINESS",BUSINESS_PROJECTS.length,"amber")}${statCard("OPERATIONS",BUSINESS_OPERATIONS.length,"green")}</div><input id="registry-search" class="input search mono" style="margin-top:15px" placeholder="Search every registry..." value="${escapeHtml(ui.registrySearch)}"></div>
      <div class="card" style="margin-top:22px"><div class="row between wrap"><div><div class="eyebrow">BATCH PROFILE INITIALIZATION</div><h3 class="card-title">BUILD 213 REPORT</h3></div><span class="status completed">${initializedProfiles.length}/${INITIALIZED_PROFILE_IDS.length} READY</span></div><p class="muted small">ARDMRN Insight was also pending in Build 212, so the verified Build 213 batch contains seven profiles—not six.</p><div class="list" style="margin-top:13px">${initializedProfiles.map(profile=>`<div class="item row between"><div><strong>${escapeHtml(profile.name)}</strong><div class="meta">Passport v${profile.passportVersion||3}.0 • ${escapeHtml(profile.category)}</div></div><span class="status ready">READY</span></div>`).join("")}</div></div>
      ${section("REGISTRY CENTER",channels,profileCard,"Publishing brands and media channels only")}
      ${section("STUDIO SERIES REGISTRY",seriesProfiles,profileCard,"Original IP, comics and animation production series")}
      ${section("PLANNED LING TIAN SERIES",PLANNED_SERIES,staticCard,"Locked until each character or artifact debuts in the main canon")}
      ${section("CORPORATE REGISTRY",CORPORATE_UNITS,staticCard,"Departments and executive offices; continuation chats are linked, not double-counted")}
      ${section("CREATIVE PROJECT REGISTRY",CREATIVE_PROJECTS,staticCard,"Game, creative product and experimental projects")}
      ${section("BUSINESS PROJECT REGISTRY",BUSINESS_PROJECTS,staticCard,"Marketing, startup, F&B and income projects")}
      ${section("BUSINESS OPERATIONS REGISTRY",BUSINESS_OPERATIONS,staticCard,"Permanent operational business systems")}
      ${section("SYSTEM REGISTRY",systemItems,staticCard,"ACC Core modules and internal QA environments")}
      <div class="card" style="margin-top:22px"><div class="eyebrow">EXCLUSION RULE</div><h3 class="card-title">PERSONAL</h3><p class="muted small">Not indexed. One-time questions and random tasks remain outside ACC OS X unless the Owner explicitly promotes them into a permanent registry.</p></div>
    </section>`;
  };

  const launcherHtml=()=>`<section class="section mono"><div class="card"><div class="eyebrow">ACC ECOSYSTEM CORE</div><h2 class="card-title">MODULE LAUNCHER</h2><p class="muted small">ACC Enterprise and AM Studio share one ACC Core while keeping daily production simple.</p></div><div class="grid module-grid" style="margin-top:16px">${MODULES.map(module=>`<button class="module-card mono" data-action="module-tab" data-value="${module.id}"><div class="module-icon">${module.icon}</div><div class="module-name">${escapeHtml(module.name)}</div><div class="module-desc">${escapeHtml(module.desc)}</div></button>`).join("")}</div></section>`;

  const studioHtml=()=>{
    const m=metrics();
    return `<section class="section mono"><div class="card"><div class="eyebrow">PRODUCTION LAYER BACKEND</div><h2 class="card-title">STUDIO OS</h2><p class="muted small">Backend complexity stays inside Studio OS. Daily user flow remains NEXT → KONTEN → POSTER → CAPTION → NEXT.</p><div class="grid stats" style="margin-top:18px">${statCard("WORKSPACES",WORKSPACES.length,"purple")}${statCard("PROFILES",m.profiles,"blue")}${statCard("ACTIVE",m.active,"green")}${statCard("ASSETS",m.assets,"cyan")}</div><div class="actions"><button class="btn primary mono" data-action="open-pipeline">OPEN PRODUCTION ENGINE</button><button class="btn purple mono" data-action="open-queue">OPEN PRODUCTION QUEUE</button></div></div>
      <div class="card" style="margin-top:16px"><h3 class="card-title">FOUNDATION PRESERVED</h3><div class="list" style="margin-top:13px">${["Enterprise Dash","Channel Dash","Production Engine","AI Workers","Knowledge Vault","Graph Inspector","Analytics","Archive Center"].map(name=>`<div class="item row between"><strong>${name}</strong><span class="status completed">ACTIVE</span></div>`).join("")}</div></div>
    </section>`;
  };

  const geminiHtml=()=>`<section class="section mono"><div class="card"><div class="row between wrap"><div><div class="eyebrow">EMBEDDED INTELLIGENCE LAYER</div><h2 class="card-title">ACC AI CONSOLE</h2></div><span class="badge">${escapeHtml(ui.aiStatus)}</span></div><p class="muted small">Chat directly inside ACC OS X. Local Safe Mode works without an API. When /api/acc-ai is connected, the same active workspace, profile, workflow and Knowledge Vault context is sent to Cloudflare Workers AI through the server Worker.</p><div class="code-box">Floating AI Launcher → Active Profile Context → Local Safe Mode / Server AI → Owner Actions</div><div class="actions"><button class="btn primary mono" data-action="open-ai-console">OPEN ACC AI CHAT</button><button class="btn purple mono" data-action="open-ai">OPEN AI WORKERS</button><button class="btn dark mono" data-action="open-context">OPEN KNOWLEDGE VAULT</button></div></div></section>`;

  const vaultModuleHtml=()=>{
    const all=Object.values(state.ai.contexts).flat(),count=all.length,active=all.filter(item=>item.active&&item.type!=="AI_NOTE").length,notes=all.filter(item=>item.type==="AI_NOTE").length;
    return `<section class="section mono"><div class="grid stats">${statCard("TOTAL ENTRIES",count,"purple")}${statCard("INJECTED",active,"green")}${statCard("CHANNELS",Object.keys(state.ai.contexts).length,"blue")}${statCard("AI NOTES",notes,"cyan")}</div><div class="card" style="margin-top:16px"><h2 class="card-title">KNOWLEDGE VAULT</h2><p class="muted small">Passport, current state, workflow rules and canon stay separated by profile. AI Notes remain history-only unless manually converted into a Custom Context.</p><button class="btn purple mono" style="width:100%;margin-top:15px" data-action="open-context">OPEN ACTIVE CHANNEL CONTEXT</button></div></section>`;
  };

  const graphHtml=()=>`<section class="section mono"><div class="card"><div class="eyebrow">SYSTEM RELATIONSHIP MAP</div><h2 class="card-title">GRAPH INSPECTOR</h2><p class="muted small">Visual inspection of the ACC Core architecture and production data flow.</p></div><div class="graph-shell" style="margin-top:16px">
    <svg class="graph-lines" viewBox="0 0 1000 600" preserveAspectRatio="none"><g stroke="#7e22ce" stroke-width="2"><line x1="500" y1="90" x2="190" y2="260"/><line x1="500" y1="90" x2="500" y2="260"/><line x1="500" y1="90" x2="810" y2="260"/><line x1="190" y1="260" x2="190" y2="470"/><line x1="500" y1="260" x2="500" y2="470"/><line x1="810" y1="260" x2="810" y2="470"/></g></svg>
    <div class="graph-node" style="left:calc(50% - 58px);top:34px">ACC CORE</div>
    <div class="graph-node" style="left:8%;top:205px">ACC ENTERPRISE</div><div class="graph-node" style="left:calc(50% - 58px);top:205px">STUDIO OS</div><div class="graph-node" style="right:8%;top:205px">AI CORE</div>
    <div class="graph-node" style="left:8%;bottom:28px">CHANNELS</div><div class="graph-node" style="left:calc(50% - 58px);bottom:28px">ASSETS & ARCHIVE</div><div class="graph-node" style="right:8%;bottom:28px">WORKERS & CONTEXT</div>
  </div></section>`;

  const analyticsHtml=()=>{
    const m=metrics(),max=Math.max(1,...WORKSPACES.flatMap(workspace=>workspace.channels.map(channel=>state.assets.filter(item=>item.channelId===channel.id).length)));
    return `<section class="section mono"><div class="grid stats">${statCard("COMPLETED",m.completed,"green")}${statCard("AI SUCCESS",m.aiSuccess,"green")}${statCard("FAILURES",m.failures,"red")}${statCard("UNREAD",m.notifications,"purple")}</div><div class="card" style="margin-top:16px"><h2 class="card-title">ASSETS BY CHANNEL</h2>${WORKSPACES.flatMap(workspace=>workspace.channels).map(channel=>{const value=state.assets.filter(item=>item.channelId===channel.id).length;return `<div class="bar-row"><span class="truncate">${escapeHtml(channel.code)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(value/max*100)}%"></div></div><strong>${value}</strong></div>`}).join("")}</div><div class="card" style="margin-top:16px"><h2 class="card-title">WORKER PERFORMANCE</h2>${WORKER_TYPES.map(worker=>{const s=state.ai.workerStats[worker.worker]||{runs:0,success:0,failed:0};return `<div class="item" style="margin-top:11px"><div class="row between"><span>${escapeHtml(worker.label)}</span><span class="green">${s.success}/${s.runs}</span></div></div>`}).join("")}</div></section>`;
  };

  const schedulerHtml=()=>{
    const schedules=[...state.schedules].sort((a,b)=>new Date(a.scheduledFor)-new Date(b.scheduledFor));
    return `<section class="section mono"><div class="card"><h2 class="card-title">SCHEDULER</h2><div class="form-grid" style="margin-top:15px"><input id="schedule-title" class="input mono" value="${escapeHtml(ui.scheduleTitle)}"><input id="schedule-when" class="input mono" type="datetime-local" value="${escapeHtml(ui.scheduleWhen)}"><button class="btn purple mono" data-action="add-schedule">CREATE SCHEDULE</button></div></div><div class="list" style="margin-top:16px">${schedules.map(item=>`<div class="item"><div class="row between wrap"><div class="grow"><div class="eyebrow">${escapeHtml(channelMap[item.channelId]?.code||item.channelId)}</div><div class="item-title">${escapeHtml(item.title)}</div><div class="meta">${escapeHtml(item.channelName)} • ${formatTime(item.scheduledFor)}</div></div><span class="${statusClass(item.status)}">${item.status}</span></div><div class="task-actions">${item.status==="SCHEDULED"?`<button class="btn green small-btn mono" data-action="dispatch-schedule" data-id="${item.id}">DISPATCH TO QUEUE</button>`:""}<button class="btn red small-btn mono" data-action="remove-schedule" data-id="${item.id}">DELETE</button></div></div>`).join("")||`<div class="empty">Belum ada schedule.</div>`}</div></section>`;
  };

  const notificationsHtml=()=>`<section class="section mono"><div class="card"><div class="row between wrap"><div><div class="eyebrow">OPERATIONAL ALERTS</div><h2 class="card-title">NOTIFICATION CENTER</h2></div><span class="badge">${state.notifications.filter(item=>!item.read).length} UNREAD</span></div><div class="actions"><button class="btn purple mono" data-action="mark-read">MARK ALL READ</button><button class="btn dark mono" data-action="clear-notifications">CLEAR ALL</button></div></div><div class="list" style="margin-top:16px">${state.notifications.map(item=>`<div class="item notification ${item.read?"":"unread"}"><div class="row between"><div class="row grow"><span class="notification-dot"></span><div class="grow"><div class="item-title">${escapeHtml(item.title)}</div><div class="meta">${escapeHtml(item.message)}</div></div></div><span class="muted tiny">${formatTime(item.createdAt)}</span></div></div>`).join("")||`<div class="empty">Tidak ada notifikasi.</div>`}</div></section>`;

  const backupHtml=()=>`<section class="section mono"><div class="card"><div class="row between wrap"><div><div class="eyebrow">DATA CONTINUITY • ${PACKAGE_REVISION}</div><h2 class="card-title">BACKUP CENTER</h2></div><span class="badge">${state.backups.length}/5 LOCAL</span></div><p class="muted small">Local snapshots now create rollback protection before restore/import. Export JSON uses a versioned ACC OS X backup envelope while remaining compatible with older raw-state backups.</p><div class="actions"><button class="btn purple mono" data-action="create-backup">CREATE LOCAL BACKUP</button><button class="btn cyan mono" data-action="export-data">EXPORT JSON</button><button class="btn dark mono" data-action="trigger-import">IMPORT JSON</button></div><input id="backup-file" class="backup-file" type="file" accept="application/json"></div><div class="list" style="margin-top:16px">${state.backups.map(item=>`<div class="item"><div class="row between"><div class="grow"><div class="item-title">${escapeHtml(item.label)}</div><div class="meta">${formatTime(item.createdAt)} • ${(item.size/1024).toFixed(1)} KB • Schema ${item.schemaVersion}</div></div><span class="status completed">READY</span></div><div class="task-actions"><button class="btn green small-btn mono" data-action="restore-backup" data-id="${item.id}">RESTORE</button><button class="btn red small-btn mono" data-action="remove-backup" data-id="${item.id}">DELETE</button></div></div>`).join("")||`<div class="empty">Belum ada backup lokal.</div>`}</div></section>`;

  const updatesHtml=()=>`<section class="section mono"><div class="card"><div class="row between wrap"><div><div class="eyebrow">PERMANENT PWA IDENTITY</div><h2 class="card-title">UPDATE CENTER</h2></div><span class="badge">BUILD ${CURRENT_VERSION}</span></div><div class="list" style="margin-top:15px"><div class="item row between"><span>Manifest ID</span><strong>/</strong></div><div class="item row between"><span>Update Channel</span><strong>${escapeHtml(state.settings.updateChannel)}</strong></div><div class="item row between"><span>Last Check</span><strong>${formatTime(state.settings.lastUpdateCheck)}</strong></div><div class="item row between"><span>New Version</span><strong>${ui.updateVersion||"—"}</strong></div></div><div class="actions"><button class="btn purple mono" data-action="check-updates">CHECK UPDATE</button><button class="btn green mono" data-action="apply-update" ${!(ui.updateAvailable||ui.swWaiting)?"disabled":""}>UPDATE ACC OS X</button><button class="btn dark mono" data-action="clear-caches">CLEAR OLD CACHE</button></div></div><div class="card" style="margin-top:16px"><h3 class="card-title">UPDATE POLICY</h3><div class="code-box">One domain → one permanent PWA identity → future builds update inside the installed ACC OS X. No reinstall required.</div></div></section>`;

  const healthHtml=()=>{
    const recovery=localStorage.getItem(RECOVERY_KEY),storageSize=byteSize(localStorage.getItem(STORAGE_KEY)||"");
    const checks=[
      ["NETWORK",navigator.onLine?"ONLINE":"OFFLINE",navigator.onLine?"ok":"warn"],
      ["PWA",matchMedia("(display-mode: standalone)").matches?"INSTALLED":"BROWSER",matchMedia("(display-mode: standalone)").matches?"ok":"warn"],
      ["SERVICE WORKER","serviceWorker" in navigator?"SUPPORTED":"UNAVAILABLE","serviceWorker" in navigator?"ok":"bad"],
      ["DATA SCHEMA",state.schemaVersion===CURRENT_VERSION?"VALID":"MISMATCH",state.schemaVersion===CURRENT_VERSION?"ok":"bad"],
      ["RECOVERY",recovery?"PAYLOAD SAVED":"CLEAR",recovery?"warn":"ok"],
      ["LOCAL DATA",`${(storageSize/1024).toFixed(1)} KB`,"ok"],
      ["BACKUPS",String(state.backups.length),state.backups.length?"ok":"warn"],
      ["AUTO BACKUP",state.settings.autoBackup?"ACTIVE":"OFF",state.settings.autoBackup?"ok":"warn"]
    ];
    return `<section class="section mono"><div class="card"><div class="eyebrow">SYSTEM DIAGNOSTICS</div><h2 class="card-title">SYSTEM HEALTH</h2><div class="grid health-grid" style="margin-top:16px">${checks.map(([label,value,status])=>`<div class="health-card"><div class="row"><span class="health-dot ${status==="warn"?"warn":status==="bad"?"bad":""}"></span><span class="muted tiny">${label}</span></div><strong style="display:block;margin-top:9px">${escapeHtml(value)}</strong></div>`).join("")}</div><div class="actions"><button class="btn purple mono" data-action="create-backup">CREATE SAFETY BACKUP</button><button class="btn dark mono" data-action="clear-caches">CLEAR OLD CACHE</button></div></div></section>`;
  };


  const themeCenterHtml=()=>{
    const active=currentTheme();
    const custom={...DEFAULT_CUSTOM_THEME,...(state.settings.customTheme||{})};
    const themeCards=THEME_PRESETS.map(theme=>`<div role="button" tabindex="0" class="theme-card ${active.id===theme.id?"active":""}" data-action="set-theme" data-value="${theme.id}" style="appearance:none;-webkit-appearance:none;display:flex;flex-direction:column;align-items:flex-start;gap:7px;min-width:0;padding:12px;border:1px solid ${active.id===theme.id?theme.vars.accent:theme.vars.line};border-radius:16px;background:linear-gradient(145deg,${theme.vars.panel},${theme.vars.panel2});color:${theme.vars.text};text-align:left;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,.16);">
      <div class="theme-swatches" style="display:grid;grid-template-columns:repeat(4,1fr);width:100%;height:28px;border-radius:9px;overflow:hidden;border:1px solid ${theme.vars.line2};"><span style="display:block;background:${theme.vars.bg}"></span><span style="display:block;background:${theme.vars.panel}"></span><span style="display:block;background:${theme.vars.accent}"></span><span style="display:block;background:${theme.vars.accent2}"></span></div>
      <strong style="display:block;width:100%;font-size:.78rem;line-height:1.15;white-space:normal;overflow-wrap:anywhere;">${escapeHtml(theme.name)}</strong><small style="display:block;color:${theme.vars.muted};font-size:.60rem;line-height:1.15;letter-spacing:.08em;">${escapeHtml(theme.tag)}</small>
    </div>`).join("");
    return `<div class="card theme-center" style="margin-top:16px"><div class="row between wrap"><div><div class="eyebrow">FOUNDER PERSONALIZATION</div><h2 class="card-title">THEME DECK</h2></div><span class="badge">${escapeHtml(active.name)}</span></div>
      <p class="muted small">Ganti skin ACC OS X kapan saja tanpa edit GitHub/CSS. Data produksi, KAI, Queue dan Pipeline tidak berubah.</p>
      <div class="theme-grid" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px;">${themeCards}</div>
      <div class="divider"></div>
      <div class="row between wrap"><div><div class="eyebrow">CUSTOM MIX</div><strong class="small">Racik warna sendiri</strong></div><span class="status ready">LOCAL ONLY</span></div>
      <div class="theme-custom-grid">
        <label class="theme-color"><span>ACCENT</span><input id="theme-custom-accent" type="color" value="${escapeHtml(custom.accent)}"></label>
        <label class="theme-color"><span>SECONDARY</span><input id="theme-custom-accent2" type="color" value="${escapeHtml(custom.accent2)}"></label>
        <label class="theme-color"><span>BACKGROUND</span><input id="theme-custom-bg" type="color" value="${escapeHtml(custom.bg)}"></label>
        <label class="theme-color"><span>PANEL</span><input id="theme-custom-panel" type="color" value="${escapeHtml(custom.panel)}"></label>
      </div>
      <div class="actions theme-actions"><button class="btn primary mono" data-action="apply-custom-theme">APPLY CUSTOM</button><button class="btn dark mono" data-action="random-theme">SURPRISE ME</button></div>
    </div>`;
  };


  const experienceHtml=()=>{
    const exp=ensureExperience();
    const badgeNames={FOUNDER:"Founder",EARLY_ADOPTER:"Early Adopter",FIRST_PRODUCTION:"First Production",BUILD_214_STABLE:"Build 214 Stable",THEME_CREATOR:"Theme Creator",WALLPAPER_CREATOR:"Wallpaper Creator"};
    return `<section class="section mono">
      <div class="card experience-hero">
        <div class="row between wrap">
          <div><div class="eyebrow">ACC EXPERIENCE OS</div><h2 class="card-title">ACC DNA</h2><p class="muted small">Professional doesn't have to be boring.</p></div>
          <span class="badge">${escapeHtml(exp.dnaName)}</span>
        </div>
        <div class="grid stats" style="margin-top:18px">
          ${statCard("PERSONALITY",EXPERIENCE_PERSONALITIES[exp.personality]?.name||exp.personality,"purple")}
          ${statCard("SOUND",EXPERIENCE_SOUND_PACKS[exp.soundPack]?.name||exp.soundPack,"cyan")}
          ${statCard("ATMOSPHERE",EXPERIENCE_ATMOSPHERES[exp.atmosphere]?.name||exp.atmosphere,"green")}
          ${statCard("BADGES",exp.badges.length,"amber")}
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="eyebrow">AI PERSONALITY PACK</div><h3 class="card-title">KAI Personality</h3>
        <div class="grid module-grid" style="margin-top:14px">
          ${Object.entries(EXPERIENCE_PERSONALITIES).map(([key,item])=>`<button class="module-card mono ${exp.personality===key?"experience-selected":""}" data-action="experience-personality" data-value="${key}"><div class="module-icon">${item.icon}</div><div class="module-name">${item.name}</div><div class="module-desc">${item.tone}</div></button>`).join("")}
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="eyebrow">WORKSPACE ATMOSPHERE</div><h3 class="card-title">Ambient Layer</h3>
        <div class="grid module-grid" style="margin-top:14px">
          ${Object.entries(EXPERIENCE_ATMOSPHERES).map(([key,item])=>`<button class="module-card mono ${exp.atmosphere===key?"experience-selected":""}" data-action="experience-atmosphere" data-value="${key}"><div class="module-icon">${item.icon}</div><div class="module-name">${item.name}</div></button>`).join("")}
        </div>
        <div style="margin-top:15px"><div class="row between tiny"><span class="muted">ATMOSPHERE INTENSITY</span><strong>${Number(exp.atmosphereIntensity||35)}%</strong></div><input id="experience-intensity" class="experience-range" type="range" min="0" max="100" value="${Number(exp.atmosphereIntensity||35)}"></div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="eyebrow">SOUND PACK</div><h3 class="card-title">UI Feedback</h3>
        <div class="grid module-grid" style="margin-top:14px">
          ${Object.entries(EXPERIENCE_SOUND_PACKS).map(([key,item])=>`<button class="module-card mono ${exp.soundPack===key?"experience-selected":""}" data-action="experience-sound" data-value="${key}"><div class="module-icon">${item.icon}</div><div class="module-name">${item.name}</div></button>`).join("")}
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="row between wrap"><div><div class="eyebrow">WALLPAPER LAB</div><h3 class="card-title">Personal Background</h3><p class="muted small">Upload wallpaper sendiri. ACC otomatis mengompres agar tetap ringan.</p></div><span class="badge">${exp.wallpaperData?"CUSTOM ACTIVE":"DEFAULT"}</span></div>
        <div class="wallpaper-preview ${exp.wallpaperData?"has-wallpaper":""}" style="${exp.wallpaperData?`background-image:linear-gradient(rgba(2,6,23,.36),rgba(2,6,23,.36)),url('${exp.wallpaperData}')`:``}"><div class="wallpaper-preview-logo">${shieldSvg()}</div><strong>ACC OS X</strong></div>
        <div class="actions"><button class="btn purple mono" data-action="choose-wallpaper">UPLOAD WALLPAPER</button><button class="btn dark mono" data-action="clear-wallpaper" ${!exp.wallpaperData?"disabled":""}>REMOVE WALLPAPER</button></div>
        <input id="experience-wallpaper-file" type="file" accept="image/*" class="backup-file">
        <div class="experience-control-grid">
          <label class="experience-control"><span>Opacity <strong>${Number(exp.wallpaperOpacity??18)}%</strong></span><input id="wallpaper-opacity" type="range" min="0" max="70" value="${Number(exp.wallpaperOpacity??18)}"></label>
          <label class="experience-control"><span>Blur <strong>${Number(exp.wallpaperBlur??3)}px</strong></span><input id="wallpaper-blur" type="range" min="0" max="20" value="${Number(exp.wallpaperBlur??3)}"></label>
          <label class="experience-control"><span>Dim <strong>${Number(exp.wallpaperDim??45)}%</strong></span><input id="wallpaper-dim" type="range" min="0" max="80" value="${Number(exp.wallpaperDim??45)}"></label>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="eyebrow">ACHIEVEMENT SYSTEM</div><h3 class="card-title">Badges</h3>
        <div class="badge-grid" style="margin-top:14px">${exp.badges.map(b=>`<div class="achievement-badge"><span>🏆</span><strong>${escapeHtml(badgeNames[b]||b.replaceAll("_"," "))}</strong></div>`).join("")}</div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="eyebrow">PLUGIN FOUNDATION</div><h3 class="card-title">Installed Core Packs</h3>
        <div class="list" style="margin-top:14px">${Object.entries(exp.plugins).map(([key,on])=>`<div class="item row between"><div><strong>${escapeHtml(key.toUpperCase())}</strong><div class="meta">ACC core plugin slot</div></div><span class="${statusClass(on?"READY":"PAUSED")}">${on?"ACTIVE":"PAUSED"}</span></div>`).join("")}</div>
      </div>
    </section>`;
  };


  const systemHtml=()=>{
    const m=metrics();
    return `<section class="section mono"><div class="card"><h2 class="card-title">SYSTEM CONTROL</h2><div class="list" style="margin-top:15px">${[
      ["APPLICATION","ACC OS X"],["BUILD",`${CURRENT_VERSION} ${PACKAGE_REVISION}`],["PWA IDENTITY","PERMANENT"],["STORAGE","LOCAL PERSISTENCE"],
      ["AI MODE",state.ai.providerMode],["PUBLISH API",getPublishEndpoint()],["PROFILES",m.profiles],["STUDIO SERIES",m.series],["PLANNED SERIES",m.planned],["SYSTEM MODULES",m.system],["ASSETS",m.assets],["ARCHIVES",state.archives.length]
    ].map(([label,value])=>`<div class="item"><div class="row between"><span class="muted tiny">${label}</span><strong class="small" style="max-width:62%;overflow-wrap:anywhere;text-align:right">${escapeHtml(value)}</strong></div></div>`).join("")}</div><div class="actions"><button class="btn cyan mono" data-action="module-tab-system" data-value="backup">BACKUP CENTER</button><button class="btn green mono" data-action="module-tab-system" data-value="updates">UPDATE CENTER</button><button class="btn dark mono" data-action="toggle-developer">${ui.developerMode?"HIDE DEVELOPER MODE":"DEVELOPER / DIAGNOSTICS"}</button></div></div>${ui.developerMode?`<div class="card" style="margin-top:16px"><div class="eyebrow">BACKSTAGE ENGINE</div><h3 class="card-title">DEVELOPER MODE</h3><p class="muted small">Pipeline, Queue, AI Workers, Context Vault, Assets and Archive stay active behind Owner Mode. Open only for diagnostics.</p><div class="actions"><button class="btn dark mono" data-action="open-pipeline">PIPELINE</button><button class="btn dark mono" data-action="open-queue">QUEUE</button><button class="btn dark mono" data-action="open-ai">AI WORKERS</button><button class="btn dark mono" data-action="open-context">CONTEXT</button><button class="btn dark mono" data-action="dev-prod" data-value="assets">ASSETS</button><button class="btn dark mono" data-action="dev-prod" data-value="archive">ARCHIVE</button><button class="btn amber mono" data-action="configure-publish-endpoint">PUBLISH API URL</button><button class="btn green mono" data-action="test-publish-endpoint">PUBLISH HEALTH</button></div></div>`:""}</section>${themeCenterHtml()}`;
  };

  const getAiAccessCode=()=>localStorage.getItem(AI_ACCESS_STORAGE_KEY)||"";
  const setAiAccessCode=value=>{
    const code=String(value||"").trim();
    if(code)localStorage.setItem(AI_ACCESS_STORAGE_KEY,code);else localStorage.removeItem(AI_ACCESS_STORAGE_KEY);
    ui.aiAccessDraft="";
    ui.aiError="";
    ui.aiStatus=code?"ONLINE_READY":"LOCAL_SAFE";
  };
  const aiHistory=(channelId=activeChannel().id)=>{
    if(!state.aiConsole.histories[channelId])state.aiConsole.histories[channelId]=[];
    return state.aiConsole.histories[channelId];
  };
  const lastAssistantMessage=()=>[...aiHistory()].reverse().find(item=>item.role==="assistant");
  const buildAiContext=()=>{
    const profile=activeChannel(),workspace=activeWorkspace(),wf=currentWorkflow();
    const contexts=injectableContexts(profile.id).slice(0,8);
    return {
      owner:"Arda",
      workspace:{id:workspace.id,name:workspace.name},
      profile:{id:profile.id,code:profile.code,name:profile.name,kind:profile.kind,department:profile.dept,category:profile.category,status:profile.status,platform:profile.platform,cadence:profile.cadence,workflow:profile.workflow,mission:profile.mission,canon:profile.canon},
      role:state.activeRole,
      workflow:{status:wf.status,stage:wf.stage,progress:wf.progress,approvalNotes:wf.approvalNotes,revisionTarget:wf.revisionTarget},
      contexts:contexts.map(item=>({type:item.type,title:item.title,version:item.version,content:String(item.content||"").slice(0,1800)})),
      registry:{channels:metrics().channels,studioSeries:metrics().series,planned:metrics().planned,creativeProjects:metrics().creative,businessProjects:metrics().business,corporateUnits:metrics().corporate},
      client:{build:CURRENT_VERSION,language:"id-ID",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Makassar"}
    };
  };
  const buildWorkerContext=task=>{
    const profile=channelMap[task.channelId],workspace=WORKSPACES.find(item=>item.id===profile?.workspaceId)||WORKSPACES[0],wf=workflowFor(task.channelId);
    const contexts=injectableContexts(task.channelId).slice(0,8);
    const upstreamAssets=state.assets.filter(item=>item.channelId===task.channelId&&item.output).slice(0,5).map(item=>({type:item.type,stage:item.stage,title:item.title,createdAt:item.createdAt,hasMedia:Boolean(item.mediaBase64||item.publicUrl),mimeType:item.mimeType||null,output:String(item.output||"").slice(0,2200)}));
    const queueMission=state.queue.find(item=>item.channelId===task.channelId&&item.status==="RUNNING")||state.queue.find(item=>item.channelId===task.channelId&&item.status==="WAITING");
    return {
      owner:"Arda",
      workspace:{id:workspace.id,name:workspace.name},
      profile:{id:profile.id,code:profile.code,name:profile.name,kind:profile.kind,department:profile.dept,category:profile.category,status:profile.status,platform:profile.platform,cadence:profile.cadence,workflow:profile.workflow,productionFormat:profile.productionFormat,communication:profile.communication,mission:profile.mission,canon:profile.canon},
      role:state.activeRole,
      workflow:{status:wf.status,stage:wf.stage,progress:wf.progress,approvalNotes:wf.approvalNotes,revisionTarget:wf.revisionTarget},
      workerTask:{id:task.id,stage:task.stage,workerType:task.workerType,workerName:task.workerName,goal:task.goal,source:task.source||"AI_ROUTER",autoApply:Boolean(task.autoApply)},
      queueMission:queueMission?{title:queueMission.title,priority:queueMission.priority,status:queueMission.status,brief:String(queueMission.brief||"").slice(0,1600)}:null,
      upstreamAssets,
      contexts:contexts.map(item=>({type:item.type,title:item.title,version:item.version,content:String(item.content||"").slice(0,1800)})),
      registry:{channels:metrics().channels,studioSeries:metrics().series,planned:metrics().planned},
      client:{build:CURRENT_VERSION,revision:PACKAGE_REVISION,language:"id-ID",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Makassar"}
    };
  };

  const openAiConsole=()=>{
    ui.aiConsoleOpen=true;
    ui.aiError="";
    ui.aiActionFeedback="";
    ui.aiStatus=getAiAccessCode()?"ONLINE_READY":"LOCAL_SAFE";
    ui.aiAccessOpen=false;
    render();
  };
  const closeAiConsole=()=>{ui.aiConsoleOpen=false;ui.aiError="";ui.aiActionFeedback="";render();};
  const clearAiChat=()=>{
    if(!confirm(`Hapus riwayat ACC AI untuk ${activeChannel().name}?`))return;
    state.aiConsole.histories[activeChannel().id]=[];
    save();showToast("Riwayat ACC AI dibersihkan.");
  };
  const saveAiToVault=()=>{
    const message=lastAssistantMessage();
    if(!message)return showToast("Belum ada output AI untuk disimpan.");
    const list=ensureContexts(activeChannel().id);
    list.unshift({id:id("ctx"),type:"AI_NOTE",title:`ACC AI Note — ${new Date().toLocaleString("id-ID")}`,version:1,active:false,source:"ACC_AI_CONSOLE",content:message.content});
    save();ui.aiActionFeedback="✓ Tersimpan ke Knowledge Vault sebagai AI history note.";showToast("Output AI disimpan ke Vault.");
  };
  const sendAiToQueue=()=>{
    const message=lastAssistantMessage();
    if(!message)return showToast("Belum ada output AI untuk dikirim.");
    const channel=activeChannel();
    state.queue.push({id:id("queue"),title:`ACC AI Mission — ${message.content.slice(0,70)}`,priority:"NORMAL",status:"WAITING",createdAt:now(),updatedAt:now(),channelId:channel.id,channelName:channel.name,workspaceId:channel.workspaceId,source:"ACC_AI_CONSOLE",brief:message.content});
    addActivity("ACC AI output sent to Production Queue",channel.id,"READY");
    save();ui.aiActionFeedback="✓ Dikirim ke Production Queue untuk "+channel.name+".";showToast("Output AI dikirim ke Production Queue.");
  };
  const extractAiError=async response=>{
    try{const data=await response.json();return data.error||data.message||`HTTP ${response.status}`;}catch{return `HTTP ${response.status}`;}
  };
  const localSafeReply=(text)=>{
    const channel=activeChannel(),wf=currentWorkflow(),m=metrics();
    const q=String(text||"").toLowerCase();
    const base=`Mode LOCAL SAFE aktif untuk ${channel.name}. Saya bisa membaca konteks ACC yang tersimpan di PWA, membantu status/struktur, menyimpan catatan ke Vault, dan mengirim output ke Queue. Generasi AI bebas memerlukan endpoint /api/acc-ai.`;
    if(/status|progress|tahap|stage/.test(q))return `${channel.name}: stage ${wf.stage}, progress ${wf.progress}%, status ${wf.status}. Queue global ${m.queue}, assets ${m.assets}, approval ${m.approval}.`;
    if(/profile|profil|passport|konteks|context/.test(q)){const ctx=injectableContexts(channel.id),workspace=activeWorkspace();return `Profil aktif: ${channel.code} — ${channel.name}. Workspace ${workspace.name}. ${ctx.length} context aktif: ${ctx.map(x=>x.title).join(", ")}.`; }
    if(/workflow|alur|next|konten|poster|caption|qc/.test(q))return `Workflow terkunci ${channel.name}: ${channel.workflow||"READY → RESEARCH → SCRIPT → POSTER → CAPTION → QC → APPROVAL → COMPLETED"}. Tahap saat ini ${wf.stage}.`;
    if(/registry|channel|series|planned|corporate/.test(q))return `Registry ringkas: ${m.channels} channels, ${m.series} Studio Series, ${m.planned} planned series, ${m.creative} creative projects, ${m.business} business projects, ${m.corporate} corporate units.`;
    if(/help|bisa apa|fitur|menu/.test(q))return `${base} Coba: “status”, “profil aktif”, “workflow”, atau “registry”. Untuk output ini tersedia Save to Vault, Send to Queue, dan Apply to Pipeline.`;
    return base;
  };
  const applyAiToPipeline=()=>{
    const message=lastAssistantMessage();
    if(!message)return showToast("Belum ada output AI untuk diterapkan.");
    const channel=activeChannel(),wf=currentWorkflow();
    const stage=wf.stage==="READY"?"RESEARCH":wf.stage==="COMPLETED"?"RESEARCH":wf.stage;
    addAsset({channelId:channel.id,type:stage,title:`ACC AI ${stage} Draft — ${channel.name}`,stage,taskId:null,output:message.content,source:"ACC_AI_CONSOLE"});
    addActivity(`ACC AI draft applied to ${stage}`,channel.id,stage);
    save();ui.aiActionFeedback="✓ Diterapkan ke pipeline sebagai draft "+stage+" tanpa auto-advance.";showToast("Output AI diterapkan ke pipeline.");
  };
  const sendAiMessage=async()=>{
    const text=String(ui.aiInput||"").trim();
    if(!text||ui.aiLoading)return;
    const accessCode=getAiAccessCode();
    const history=aiHistory();
    history.push({id:id("chat"),role:"user",content:text,createdAt:now()});
    state.aiConsole.totalMessages=(state.aiConsole.totalMessages||0)+1;
    ui.aiInput="";ui.aiLoading=true;ui.aiError="";ui.aiStatus=accessCode?"CONNECTING":"LOCAL_SAFE";
    save();render();
    if(!accessCode){
      history.push({id:id("chat"),role:"assistant",content:localSafeReply(text),createdAt:now(),model:"ACC Local Safe"});
      state.aiConsole.totalMessages=(state.aiConsole.totalMessages||0)+1;
      state.ai.providerMode="LOCAL_SAFE";ui.aiLoading=false;ui.aiStatus="LOCAL_SAFE";save();render();return;
    }
    try{
      const response=await fetch("/api/acc-ai",{method:"POST",headers:{"Content-Type":"application/json","X-ACC-Access-Code":accessCode},body:JSON.stringify({messages:history.slice(-16).map(item=>({role:item.role,content:item.content})),context:buildAiContext()})});
      if(!response.ok)throw new Error(await extractAiError(response));
      const data=await response.json();
      if(!data.reply)throw new Error("AI response kosong.");
      history.push({id:id("chat"),role:"assistant",content:data.reply,createdAt:now(),model:data.model||"server-ai"});
      state.aiConsole.totalMessages=(state.aiConsole.totalMessages||0)+1;
      state.aiConsole.lastModel=data.model||null;state.aiConsole.lastConnectedAt=now();
      state.ai.providerMode="SERVER_AI";ui.aiStatus="CONNECTED";
      notify("ACC AI Response Ready",`Respons baru untuk ${activeChannel().name}.`,"SUCCESS");
    }catch(error){
      const reason=String(error.message||error);
      history.push({id:id("chat"),role:"assistant",content:`Server AI belum tersedia (${reason}).

${localSafeReply(text)}`,createdAt:now(),model:"ACC Local Fallback"});
      state.aiConsole.totalMessages=(state.aiConsole.totalMessages||0)+1;state.ai.providerMode="LOCAL_FALLBACK";
      ui.aiError="Server AI gagal; Local Safe Mode mengambil alih.";ui.aiStatus="LOCAL_FALLBACK";
    }finally{ui.aiLoading=false;save();render();}
  };
  const aiConsoleHtml=()=>{
    if(!ui.aiConsoleOpen)return"";
    const channel=activeChannel(),history=aiHistory(),hasAccess=Boolean(getAiAccessCode());
    return `<div class="ai-console-wrap"><section class="ai-console mono" role="dialog" aria-modal="true" aria-label="ACC AI Console"><header class="ai-console-header"><div class="grow"><div class="eyebrow">ACC CORE • EMBEDDED ASSISTANT</div><div class="ai-console-title">KAI — ACC AI</div><div class="meta truncate">${escapeHtml(channel.code)} • ${escapeHtml(channel.name)} • ${escapeHtml(ui.aiStatus)}</div></div><button class="ai-icon-btn" data-action="close-ai-console" aria-label="Tutup">×</button></header><div class="ai-toolbar"><span class="badge">${escapeHtml(hasAccess?"SERVER AI READY":"LOCAL SAFE")}</span><button class="btn dark small-btn mono" data-action="change-ai-access">${hasAccess?"AI ACCESS":"CONNECT AI"}</button><button class="btn dark small-btn mono" data-action="clear-ai-chat">CLEAR</button></div>${ui.aiAccessOpen?`<div class="ai-setup"><div class="item-title">OPTIONAL SERVER AI CONNECTION</div><p class="muted small">Local Safe Mode tidak butuh key. Untuk AI generatif, endpoint /api/acc-ai menggunakan Cloudflare Workers AI. Pasang ACC_AI_ACCESS_CODE sebagai Cloudflare secret; tidak perlu OpenAI API key. Kode akses owner disimpan lokal di perangkat ini dan tidak ditulis ke repository.</p><input id="ai-access-code" class="input mono" type="password" autocomplete="off" placeholder="ACC AI Access Code" value="${escapeHtml(ui.aiAccessDraft)}"><div class="ai-output-actions"><button class="btn purple small-btn mono" data-action="save-ai-access">SAVE ACCESS</button><button class="btn dark small-btn mono" data-action="close-ai-access">CANCEL</button></div></div>`:""}<div id="ai-message-list" class="ai-message-list">${history.length?history.map(item=>`<article class="ai-message ${item.role}"><div class="ai-message-role">${item.role==="assistant"?"KAI • ACC AI":"ARDA"}</div><div class="ai-message-content">${escapeHtml(item.content)}</div><div class="ai-message-time">${formatTime(item.createdAt)}${item.model?` • ${escapeHtml(item.model)}`:""}</div></article>`).join(""):`<div class="ai-empty"><div class="ai-orb">✦</div><strong>ACC AI siap.</strong><span>Local Safe Mode aktif. Hubungkan Cloudflare Workers AI kapan saja untuk percakapan generatif.</span></div>`}${ui.aiLoading?`<article class="ai-message assistant thinking"><div class="ai-message-role">KAI • ACC AI</div><div class="ai-message-content">Memproses konteks ${escapeHtml(channel.name)}…</div></article>`:""}</div>${ui.aiError?`<div class="ai-error">${escapeHtml(ui.aiError)}</div>`:""}<footer class="ai-composer"><textarea id="ai-console-input" class="textarea mono" rows="2" maxlength="5000" placeholder="Tulis pesan untuk KAI…">${escapeHtml(ui.aiInput)}</textarea><button class="btn primary mono" data-action="send-ai-message" ${ui.aiLoading?"disabled":""}>${ui.aiLoading?"THINKING…":"SEND"}</button><div class="ai-output-actions"><button type="button" class="btn dark small-btn mono" data-action="save-ai-vault" ${lastAssistantMessage()?"":"disabled"}>SAVE TO VAULT</button><button type="button" class="btn cyan small-btn mono" data-action="send-ai-queue" ${lastAssistantMessage()?"":"disabled"}>SEND TO QUEUE</button><button type="button" class="btn purple small-btn mono" data-action="apply-ai-pipeline" ${lastAssistantMessage()?"":"disabled"}>APPLY TO PIPELINE</button></div>${ui.aiActionFeedback?`<div class="ai-action-feedback">${escapeHtml(ui.aiActionFeedback)}</div>`:""}</footer><div class="ai-disclaimer">ACC AI uses active ACC context and local chat history. Private ChatGPT history is not imported automatically.</div></section></div>`;
  };

  const modalHtml=()=>{
    if(!ui.modalTaskId)return"";
    const task=state.ai.tasks.find(item=>item.id===ui.modalTaskId);if(!task)return"";
    return `<div class="modal-wrap"><div class="modal mono"><div class="row between"><div><div class="eyebrow">${escapeHtml(task.stage)} • ${escapeHtml(task.workerType)}</div><h2>${escapeHtml(task.workerName)}</h2></div><button class="btn dark small-btn mono" data-action="close-modal">CLOSE</button></div><div class="worker-metrics"><div class="metric"><span class="muted tiny">STATUS</span><strong class="green">${escapeHtml(task.status)}</strong></div><div class="metric"><span class="muted tiny">ATTEMPTS</span><strong>${task.attempts}</strong></div><div class="metric"><span class="muted tiny">CONTEXT</span><strong>${task.contextIds.length}</strong></div></div><div class="modal-output">${escapeHtml(task.output)}</div><div class="context-content">Context package: ${escapeHtml(task.contextTitles.join(", "))}</div><button class="btn cyan mono" style="width:100%;margin-top:15px" data-action="apply-task" data-id="${task.id}" ${task.applied?"disabled":""}>${task.applied?"OUTPUT APPLIED":"APPLY OUTPUT TO PIPELINE"}</button></div></div>`;
  };

  const render=()=>{
    applyTheme();
    const scroll=window.scrollY;
    ROOT.innerHTML=`<div class="shell">${headerHtml()}<main class="main">${navHtml()}${ui.tab==="enterprise"?enterpriseHtml():""}${ui.tab==="channel"?channelHtml():""}${ui.tab==="production"?productionHtml():""}${ui.tab==="ecosystem"?ecosystemHtml():""}${ui.tab==="system"?systemHtml():""}<div class="footer-note mono">ACC OS X • ACC CORE • BUILD ${CURRENT_VERSION} • UI FIX07 • FREEZE CANDIDATE</div></main><button class="ai-fab" data-action="open-ai-console" aria-label="Buka KAI" title="KAI" style="position:fixed!important;right:14px!important;bottom:calc(14px + env(safe-area-inset-bottom,0px))!important;left:auto!important;top:auto!important;width:56px!important;height:56px!important;min-width:56px!important;min-height:56px!important;max-width:56px!important;max-height:56px!important;margin:0!important;padding:0!important;border-radius:999px!important;z-index:9999!important;overflow:hidden!important;display:grid!important;place-items:center!important;background:linear-gradient(145deg,var(--accentStrong),var(--accent))!important;color:#fff!important;border:1px solid var(--accentBright)!important;box-shadow:0 14px 36px rgba(0,0,0,.38)!important;line-height:1!important;transform:none!important;animation:none!important;-webkit-appearance:none!important;appearance:none!important;font-size:0!important;text-indent:0!important;"><span aria-hidden="true" style="display:grid!important;place-items:center!important;width:34px!important;height:34px!important;margin:0!important;padding:0!important;border:1px solid rgba(255,255,255,.38)!important;border-radius:999px!important;font-size:1rem!important;font-weight:900!important;line-height:1!important;color:#fff!important;">K</span></button>${ui.toast?`<div class="toast mono">${escapeHtml(ui.toast)}</div>`:""}${modalHtml()}${aiConsoleHtml()}</div>`;
    bindEvents();
    requestAnimationFrame(()=>{scrollTo(0,scroll);const list=document.getElementById("ai-message-list");if(list)list.scrollTop=list.scrollHeight;});
  };

  const bindValue=(elementId,callback,eventName="input")=>{
    document.getElementById(elementId)?.addEventListener(eventName,event=>callback(event.target.value));
  };

  const bindEvents=()=>{
    document.getElementById("workspace-select")?.addEventListener("change",event=>{
      const workspace=WORKSPACES.find(item=>item.id===event.target.value);if(!workspace)return;
      state.activeWorkspaceId=workspace.id;state.activeChannelId=workspace.channels[0].id;ensureContexts(state.activeChannelId);save();render();
    });
    document.getElementById("channel-select")?.addEventListener("change",event=>{state.activeChannelId=event.target.value;ensureContexts(state.activeChannelId);save();render();});
    document.getElementById("role-select")?.addEventListener("change",event=>{state.activeRole=event.target.value;save();render();});
    ROOT.querySelectorAll("[data-action]").forEach(button=>button.addEventListener("click",()=>{playUiSound("tap");handleAction(button.dataset);}));

    bindValue("approval-notes",value=>{setWorkflow(activeChannel().id,{approvalNotes:value});save();});
    bindValue("revision-target",value=>{setWorkflow(activeChannel().id,{revisionTarget:value});save();},"change");
    bindValue("queue-title",value=>ui.queueTitle=value);
    bindValue("queue-priority",value=>ui.queuePriority=value,"change");
    bindValue("route-stage",value=>{ui.routeStage=value;render();},"change");
    bindValue("route-goal",value=>ui.routeGoal=value);
    bindValue("context-title",value=>ui.contextDraftTitle=value);
    bindValue("context-content",value=>ui.contextDraftContent=value);
    bindValue("asset-search",value=>{ui.assetSearch=value;render();});
    bindValue("archive-search",value=>{ui.archiveSearch=value;render();});
    bindValue("registry-search",value=>{ui.registrySearch=value;render();});
    bindValue("schedule-title",value=>ui.scheduleTitle=value);
    bindValue("schedule-when",value=>ui.scheduleWhen=value);
    bindValue("experience-intensity",value=>{state.experience={...ensureExperience(),atmosphereIntensity:Number(value)};save();applyExperience();},"input");
    bindValue("wallpaper-opacity",value=>{state.experience={...ensureExperience(),wallpaperOpacity:Number(value)};save();applyExperience();},"input");
    bindValue("wallpaper-blur",value=>{state.experience={...ensureExperience(),wallpaperBlur:Number(value)};save();applyExperience();},"input");
    bindValue("wallpaper-dim",value=>{state.experience={...ensureExperience(),wallpaperDim:Number(value)};save();applyExperience();},"input");
    document.getElementById("experience-wallpaper-file")?.addEventListener("change",event=>setWallpaperFile(event.target.files?.[0]));
    bindValue("ai-console-input",value=>ui.aiInput=value);
    bindValue("ai-access-code",value=>ui.aiAccessDraft=value);

    document.getElementById("backup-file")?.addEventListener("change",event=>importData(event.target.files?.[0]));
  };

  const handleAction=data=>{
    switch(data.action){
      case"tab":ui.tab=data.value;render();break;
      case"prod-tab":ui.productionTab=data.value;render();break;
      case"module-tab":ui.ecosystemTab=data.value;render();break;
      case"module-tab-system":ui.tab="ecosystem";ui.ecosystemTab=data.value;render();break;
      case"open-channel":
        state.activeWorkspaceId=channelMap[data.channel].workspaceId;state.activeChannelId=data.channel;ensureContexts(data.channel);save();ui.tab="channel";render();break;
      case"open-pipeline":ui.tab="production";ui.productionTab="pipeline";render();break;
      case"open-queue":ui.tab="production";ui.productionTab="queue";render();break;
      case"open-ai":ui.tab="production";ui.productionTab="ai";render();break;
      case"open-context":ui.tab="production";ui.productionTab="context";render();break;
      case"dev-prod":ui.tab="production";ui.productionTab=data.value;render();break;
      case"toggle-developer":ui.developerMode=!ui.developerMode;if(!ui.developerMode&&ui.tab==="production"&&ui.productionTab!=="pipeline")ui.productionTab="pipeline";render();break;
      case"open-ai-console":openAiConsole();break;
      case"close-ai-console":closeAiConsole();break;
      case"save-ai-access":setAiAccessCode(ui.aiAccessDraft);ui.aiAccessOpen=false;ui.aiStatus=getAiAccessCode()?"ONLINE_READY":"LOCAL_SAFE";render();break;
      case"change-ai-access":ui.aiAccessOpen=true;ui.aiAccessDraft=getAiAccessCode();render();break;
      case"close-ai-access":ui.aiAccessOpen=false;render();break;
      case"send-ai-message":sendAiMessage();break;
      case"clear-ai-chat":clearAiChat();break;
      case"save-ai-vault":saveAiToVault();break;
      case"send-ai-queue":sendAiToQueue();break;
      case"apply-ai-pipeline":applyAiToPipeline();break;
      case"gm5-start":runGM5Mission();break;
      case"start-production":startProduction();break;
      case"manual-next":manualNext();break;
      case"route-active-stage":routeActiveStage();break;
      case"pause":pauseWorkflow();break;
      case"resume":resumeWorkflow();break;
      case"reset":resetWorkflow();break;
      case"approve":approveMission();break;
      case"revision":requestRevision();break;
      case"reject":rejectMission();break;
      case"archive":archiveMission();break;
      case"add-queue":addQueue();break;
      case"start-queue":{const item=state.queue.find(queue=>queue.id===data.id);if(item)startProduction(item.channelId,item.id);break;}
      case"move-queue":moveQueue(data.id,Number(data.delta));break;
      case"remove-queue":removeQueue(data.id);break;
      case"route-task":routeTask({stage:ui.routeStage,goal:ui.routeGoal,autoRun:true,autoApply:false,source:"MANUAL_ROUTER"});break;
      case"run-task":runTask(data.id,false);break;
      case"fail-task":runTask(data.id,true);break;
      case"retry-task":retryTask(data.id);break;
      case"inspect-task":ui.modalTaskId=data.id;render();break;
      case"close-modal":ui.modalTaskId=null;render();break;
      case"apply-task":applyTask(data.id);ui.modalTaskId=null;render();break;
      case"mock-publish":runMockPublish(data.id);break;
      case"mock-publish-workflow":runMockPublishWorkflow(data.id);break;
      case"server-publish-workflow":runServerPublishWorkflow(data.id);break;
      case"configure-publish-endpoint":configurePublishEndpoint();break;
      case"configure-publish-access":configurePublishAccess();break;
      case"test-publish-endpoint":testPublishEndpointHealth();break;
      case"add-context":addContext();break;
      case"toggle-context":toggleContext(data.id);break;
      case"remove-context":removeContext(data.id);break;
      case"add-schedule":addSchedule();break;
      case"dispatch-schedule":dispatchSchedule(data.id);break;
      case"remove-schedule":removeSchedule(data.id);break;
      case"mark-read":markAllRead();break;
      case"clear-notifications":clearNotifications();break;
      case"create-backup":createBackup();break;
      case"export-data":exportData();break;
      case"trigger-import":document.getElementById("backup-file")?.click();break;
      case"restore-backup":restoreBackup(data.id);break;
      case"remove-backup":removeBackup(data.id);break;
      case"check-updates":checkUpdates();break;
      case"apply-update":applyUpdate();break;
      case"set-theme":setTheme(data.value);break;
      case"random-theme":setRandomTheme();break;
      case"apply-custom-theme":setCustomTheme();break;
      case"clear-caches":clearOldCaches();break;
      case"experience-personality":saveExperience({personality:data.value});playUiSound("success");showToast(`Personality: ${EXPERIENCE_PERSONALITIES[data.value]?.name||data.value}`);render();break;
      case"experience-atmosphere":saveExperience({atmosphere:data.value});playUiSound("tap");showToast(`Atmosphere: ${EXPERIENCE_ATMOSPHERES[data.value]?.name||data.value}`);render();break;
      case"experience-sound":saveExperience({soundPack:data.value});playUiSound("success");showToast(`Sound Pack: ${EXPERIENCE_SOUND_PACKS[data.value]?.name||data.value}`);render();break;
      case"choose-wallpaper":document.getElementById("experience-wallpaper-file")?.click();break;
      case"clear-wallpaper":clearWallpaper();break;
    }
  };

  const registerPwa=async()=>{
    if(!("serviceWorker" in navigator))return;
    try{
      const registration=await navigator.serviceWorker.register("./service-worker.js");
      const inspect=()=>{
        if(registration.waiting){ui.swWaiting=true;ui.updateAvailable=true;render();}
      };
      inspect();
      registration.addEventListener("updatefound",()=>{
        const worker=registration.installing;if(!worker)return;
        worker.addEventListener("statechange",()=>{if(worker.state==="installed"&&navigator.serviceWorker.controller){ui.swWaiting=true;ui.updateAvailable=true;notify("Update Ready","Versi baru siap diterapkan.","INFO");save();render();}});
      });
      navigator.serviceWorker.addEventListener("controllerchange",()=>location.reload());
      registration.update();
    }catch(error){console.warn("[PWA]",error);}
  };

  window.addEventListener("online",render);
  window.addEventListener("offline",render);

  if(!channelMap[state.activeChannelId]){state.activeWorkspaceId="acc-enterprise";state.activeChannelId="ch-techverse";}
  isolateAiNotes();
  ensureAllContexts();
  ensureContexts(state.activeChannelId);
  if(!state.settings.aiContextIsolationR3){
    state.settings.aiContextIsolationR3=true;
    notify("ACC AI Context Fix Applied","Build 214 R3 memperbaiki Workspace context dan memisahkan ACC AI Notes dari context injection otomatis.","SUCCESS");
  }
  save();
  applyExperience();
  installBuild215Polish();
  render();
  registerPwa();
})();
