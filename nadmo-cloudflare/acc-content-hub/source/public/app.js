(function () {
  function qs(s) {
    return document.querySelector(s);
  }
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function uid() {
    return Date.now() + Math.floor(Math.random() * 10000);
  }
  var C = [
    [
      'Aku Cinta Malam',
      'ACM',
      'Nightlife Indonesia',
      'Bahasa Indonesia',
      '3 Reels/day',
      'National monitoring → verify → News/Event/Lifestyle/Community',
      'Nightlife media nasional; credits venue/talent dijaga.',
    ],
    [
      'ARDA GAMING HOK',
      'AG',
      'Honor of Kings Gaming',
      'Bahasa Indonesia',
      '1/day',
      '4 theme choices → owner selection → package',
      'Sebelum produksi tampilkan 4 pilihan: Gameplay Match; News/Updates; Hero Education; Interactive/Community.',
    ],
    [
      'ARDMRN Cinematix',
      'ACX',
      'Film News',
      'Bahasa Indonesia',
      '3/day',
      'Research → Breaking/Fakta/Update → visual → caption',
      'Original visuals; no copyrighted poster reuse; current film info; no repeat.',
    ],
    [
      'ARDMRN Gaming',
      'ARG',
      'Gaming Media',
      'Bahasa Indonesia',
      '1/day',
      'Research latest gaming news → analyze → poster → caption',
      'Current credible sources; analytical gamer-journalist voice; no repeated stories.',
    ],
    [
      'ARDMRN Insight',
      'AI',
      'Knowledge Media',
      'Bahasa Indonesia',
      'Owner-scheduled',
      'Research → insight → original poster → caption → QC',
      'Research first; distinguish fact from interpretation; unsupported claims prohibited.',
    ],
    [
      'ARK Garage',
      'ARK',
      'Automotive / Garage Media',
      'Bahasa Indonesia',
      'Owner-scheduled',
      'Topic → specs/safety check → garage script → poster → caption',
      'Verify specifications and safety; distinguish factory data, opinion and modifications.',
    ],
    [
      'Bali Wedding DJ',
      'BWD',
      'Premium Wedding Entertainment',
      'English',
      'Campaign-based',
      'Lead insight → trust content → inquiry → booking follow-up',
      'Professional elegant English; trust, package value and booking conversion.',
    ],
    [
      'BALINIGHTLIFE',
      'BN',
      'Bali Nightlife Media',
      'English',
      '3 posts/session',
      'Research H+1–H+7 → verify → 3 Reels → caption/credits',
      'English-first; diverse Bali areas and underground scene; Savaya proactive coverage paused.',
    ],
    [
      'Berita Terkini',
      'BT',
      'General News',
      'Bahasa Indonesia',
      'Freshness-driven',
      'Search date → verify → fresh non-repeat → poster → caption',
      'Neutral factual news; freshness and no-repeat mandatory.',
    ],
    [
      'Distorsi Sejarah Punk',
      'DSP',
      'Alternative History',
      'Bahasa Indonesia',
      'Owner-scheduled',
      'Historical baseline → divergence → speculative scenario → punk visual',
      'Clearly label speculation; never present fictional divergence as established history.',
    ],
    [
      'Dunia Bintang',
      'DB',
      'Roblox Kids',
      'Bahasa Indonesia',
      '1/day',
      'Kid-friendly rotation → episode → poster → caption',
      'Safe varied Roblox; sequential episode numbering; avoid repetition.',
    ],
    [
      'Hikayat Pohon Ganja',
      'HPG',
      'Culture & History Editorial',
      'Bahasa Indonesia',
      'Owner-scheduled',
      'Research dossier → verify → educational narrative → visual → caption',
      'Educational historical framing; separate evidence from interpretation; no unsafe/illegal promotion.',
    ],
    [
      'Jejak Nusantara',
      'JN',
      'Nusantara History',
      'Bahasa Indonesia',
      'Chronological roadmap',
      'Research-first → verify → documentary poster → caption',
      'Chronological history; gold-brown parchment; distinguish evidence, interpretation, uncertainty.',
    ],
    [
      'Konten Islami',
      'KI',
      'Islamic Education',
      'Bahasa Indonesia',
      '5 series/day',
      'Prayer → Reflection → Learning → Stories → Dua/Dzikir',
      'Full five-series batch; respectful, educational, non-sensational.',
    ],
    [
      'Lentera Weton',
      'LW',
      'Primbon Jawa',
      'Bahasa Indonesia',
      '2/day',
      'Weton Hari Ini → Primbon/Tips → poster → caption',
      'Respectful Javanese cultural framing; rotate templates; avoid absolute claims.',
    ],
    [
      'Motocamp ID',
      'MI',
      'Motorcycle Camping',
      'Bahasa Indonesia',
      'Up to 5/day',
      'Tips / Spot & Rute / Gear / Story / News → poster → caption',
      'Five core series; practical safety and route context.',
    ],
    [
      'Mr Laziz',
      'ML',
      'Food & Lifestyle Brand',
      'Bahasa Indonesia',
      'Owner-scheduled',
      'Approved topic/product → facts → visual → caption → QC',
      'Only owner-approved products, prices, offers and claims; never invent commercial details.',
    ],
    [
      'Nadya Gaming',
      'NG',
      'Roblox Lifestyle',
      'Bahasa Indonesia',
      '1/day',
      'Club Roblox/Gunung → lifestyle story → poster → caption',
      'Only Club Roblox and Gunung until revised.',
    ],
    [
      'Planet Fauna',
      'PF',
      'Animal Media',
      'Bahasa Indonesia',
      'Owner-scheduled',
      'Species/topic → credible fact check → educational story → poster',
      'No fabricated animal facts, taxonomy, behavior or conservation status.',
    ],
    [
      'Putri Ayah',
      'PA',
      'Father–Daughter Family',
      'Bahasa Indonesia',
      '5-series batch',
      'Ayah→Putri → Putri→Ayah → Momen → Pelajaran → Quotes',
      'Five-series structure locked; character consistency mandatory; restart only when activated.',
    ],
    [
      'Ruang DJ',
      'RDJ',
      'DJ Media',
      'Bahasa Indonesia',
      'Owner-scheduled',
      'DJ topic → verify gear/music → script → poster → caption/credits',
      'Respect music rights and credits; verify equipment, events and artist info.',
    ],
    [
      'Semesta Berbisik',
      'SB',
      'Tarot / Astrology / Reflection',
      'Bahasa Indonesia',
      '1 per production cycle',
      'Theme → reflective copy → visual → QC → publish',
      'One content per production cycle unless explicitly expanded.',
    ],
    [
      'Serigala Senja',
      'SS',
      'Story / Wolf Lore',
      'Bahasa Indonesia',
      '5-series batch',
      'Night series batch → independent posters → captions',
      'Five-series batch; fixed episode/lore continuity; atmospheric twilight identity.',
    ],
    [
      'TechVerse',
      'TV',
      'Technology Media',
      'Bahasa Indonesia',
      'Editorial',
      'Latest-first research → content → poster → long caption',
      'Latest First; Fact Before Speed; Explain significance; clean futuristic identity.',
    ],
    [
      'Titik Tanya',
      'TT',
      'Perspective / Thought',
      'Bahasa Indonesia',
      'Sequential',
      'One question → many perspectives → episode → caption',
      '12-part structure; reflective; continue sequential canon.',
    ],
    [
      'Tukang Tambang',
      'TTB',
      'Web3 Bootcamp',
      'Bahasa Indonesia',
      'Daily learning',
      'News/learning/review/security → scoring → poster → caption',
      'Security-first; prioritize free Android opportunities; explicit risk context.',
    ],
    [
      'Warisan Bali',
      'WB',
      'Hindu Bali Heritage',
      'Bahasa Indonesia',
      '5-series/session',
      'Research → cultural verification → 5 materials/posters/captions',
      'Respectful cultural voice; captions begin Om Swastiastu; five-series batch locked.',
    ],
    [
      'YOLO',
      'YO',
      'Two-Sided Lifestyle Discussion',
      'Bahasa Indonesia',
      '5-series/day',
      '5 topics → positive vs negative perspective → posters → discussion captions',
      'Balanced discussion; premium black-gold identity; benefits and risks both shown.',
    ],
  ]
    .map(function (x) {
      return {
        name: x[0],
        logo: x[1],
        niche: x[2],
        lang: x[3],
        cadence: x[4],
        workflow: x[5],
        rules: x[6],
      };
    })
    .sort(function (a, b) {
      return a.name.localeCompare(b.name, 'id', { sensitivity: 'base' });
    });
  var defaults = {
    version: 6,
    active: C[0].name,
    contents: [],
    settings: {
      apiBase: 'https://api.openai.com/v1',
      apiKey: '',
      textModel: 'gpt-5-mini',
      imageModel: 'gpt-image-1',
      imageQuality: 'low',
    },
  };
  var state = defaults;
  try {
    var p = JSON.parse(localStorage.getItem('accHub') || 'null');
    if (p) {
      state = {
        version: 6,
        active: C.some(function (c) {
          return c.name === p.active;
        })
          ? p.active
          : C[0].name,
        contents: Array.isArray(p.contents)
          ? p.contents.map(function (x) {
              if (x.status === 'Generated') x.status = 'Draft';
              if (x.status === 'Ready') x.status = 'Review';
              return x;
            })
          : [],
        settings: Object.assign({}, defaults.settings, p.settings || {}),
      };
    }
  } catch (e) {}
  var page = 'home',
    modal = null,
    busy = '';
  function save() {
    try {
      localStorage.setItem('accHub', JSON.stringify(state));
    } catch (e) {}
  }
  function ch(n) {
    return (
      C.find(function (x) {
        return x.name === n;
      }) || C[0]
    );
  }
  function requiresResearch(c) {
    return /research|verify|latest|current|news|fakta|sejarah|history|credible|specification|safety/i.test(
      c.workflow + ' ' + c.rules
    );
  }
  function logo(c, z) {
    return (
      '<div class="brandmark ' +
      (z || '') +
      '"><span>' +
      esc(c.logo) +
      '</span></div>'
    );
  }
  function getTextResponse(j) {
    if (j.output_text) return j.output_text;
    var out = '';
    (j.output || []).forEach(function (o) {
      (o.content || []).forEach(function (c) {
        if (c.type === 'output_text' && c.text) out += c.text;
      });
    });
    return out;
  }
  function cleanJSON(t) {
    t = String(t || '')
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim();
    var a = t.indexOf('{'),
      b = t.lastIndexOf('}');
    if (a >= 0 && b > a) t = t.slice(a, b + 1);
    return JSON.parse(t);
  }
  function api(path, body) {
    var base = (state.settings.apiBase || 'https://api.openai.com/v1').replace(
      /\/$/,
      ''
    );
    return fetch(base + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + state.settings.apiKey,
      },
      body: JSON.stringify(body),
    }).then(async function (r) {
      var j = await r.json().catch(function () {
        return {};
      });
      if (!r.ok)
        throw new Error((j.error && j.error.message) || 'HTTP ' + r.status);
      return j;
    });
  }
  function idb() {
    return new Promise(function (resolve, reject) {
      var q = indexedDB.open('acc-content-hub', 1);
      q.onupgradeneeded = function () {
        if (!q.result.objectStoreNames.contains('images'))
          q.result.createObjectStore('images');
      };
      q.onsuccess = function () {
        resolve(q.result);
      };
      q.onerror = function () {
        reject(q.error);
      };
    });
  }
  async function putImage(id, data) {
    var db = await idb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction('images', 'readwrite');
      tx.objectStore('images').put(data, String(id));
      tx.oncomplete = resolve;
      tx.onerror = function () {
        reject(tx.error);
      };
    });
  }
  async function getImage(id) {
    try {
      var db = await idb();
      return await new Promise(function (resolve) {
        var q = db
          .transaction('images', 'readonly')
          .objectStore('images')
          .get(String(id));
        q.onsuccess = function () {
          resolve(q.result || '');
        };
        q.onerror = function () {
          resolve('');
        };
      });
    } catch (e) {
      return '';
    }
  }
  async function delImage(id) {
    try {
      var db = await idb();
      db.transaction('images', 'readwrite')
        .objectStore('images')
        .delete(String(id));
    } catch (e) {}
  }
  async function hydrateImages() {
    var els = document.querySelectorAll('[data-poster-id]');
    for (var i = 0; i < els.length; i++) {
      var img = await getImage(els[i].getAttribute('data-poster-id'));
      if (img) {
        els[i].src = img;
        els[i].classList.remove('hidden');
      }
    }
  }
  window.nav = function (p) {
    page = p;
    modal = null;
    render();
  };
  window.activate = function (n) {
    state.active = n;
    save();
    render();
  };
  window.closeModal = function () {
    modal = null;
    render();
  };
  window.openPassport = function (n) {
    modal = { type: 'passport', name: n };
    render();
  };
  window.openPackage = function (id) {
    modal = { type: 'package', id: id };
    render();
  };
  window.saveSettings = function () {
    state.settings.apiBase = qs('#apiBase').value.trim();
    state.settings.apiKey = qs('#apiKey').value.trim();
    state.settings.textModel = qs('#textModel').value.trim();
    state.settings.imageModel = qs('#imageModel').value.trim();
    state.settings.imageQuality = qs('#imageQuality').value;
    save();
    alert('Settings tersimpan.');
    render();
  };
  window.testAI = async function () {
    if (!state.settings.apiKey) return alert('Masukkan API key dulu.');
    busy = 'Testing AI...';
    render();
    try {
      await api('/responses', {
        model: state.settings.textModel,
        input: 'Reply with exactly: OK',
      });
      alert('AI connected.');
    } catch (e) {
      alert('AI error: ' + e.message);
    } finally {
      busy = '';
      render();
    }
  };
  window.generate = async function () {
    var brief = qs('#brief'),
      format = qs('#format');
    if (!brief || !brief.value.trim()) return alert('Isi brief/topik dulu.');
    if (!state.settings.apiKey) {
      page = 'settings';
      render();
      return alert('Sambungkan AI Provider di Settings dulu.');
    }
    var c = ch(state.active),
      topic = brief.value.trim(),
      id = uid();
    busy = 'Membuat konten + caption...';
    render();
    try {
      var prompt =
        'You are the production engine for ACC Content Hub. Produce a publication-ready social media package. CHANNEL: ' +
        c.name +
        '\nNICHE: ' +
        c.niche +
        '\nLANGUAGE: ' +
        c.lang +
        '\nCADENCE: ' +
        c.cadence +
        '\nWORKFLOW: ' +
        c.workflow +
        '\nHARD RULES: ' +
        c.rules +
        '\nUSER BRIEF: ' +
        topic +
        '\nOUTPUT FORMAT: ' +
        (format ? format.value : 'Poster + Caption') +
        '\nReturn ONLY valid JSON with keys: title, content, caption, poster_prompt, hashtags, fact_note. content must be actual finished content, not instructions or placeholders. caption must be ready to post with CTA and relevant hashtags. poster_prompt must describe a polished vertical 9:16 social poster, including exact on-image headline text and visual composition. Do not claim facts you cannot support. If web research is available, use it for current/factual channels.';
      var req = { model: state.settings.textModel, input: prompt };
      if (requiresResearch(c)) req.tools = [{ type: 'web_search' }];
      var r;
      try {
        r = await api('/responses', req);
      } catch (e) {
        if (req.tools) {
          delete req.tools;
          r = await api('/responses', req);
        } else throw e;
      }
      var pkg = cleanJSON(getTextResponse(r));
      var item = {
        id: id,
        channel: c.name,
        title: pkg.title || topic,
        brief: topic,
        format: format ? format.value : 'Poster + Caption',
        status: 'Draft',
        content: pkg.content || '',
        caption: pkg.caption || '',
        posterPrompt: pkg.poster_prompt || '',
        hashtags: pkg.hashtags || '',
        factNote: pkg.fact_note || '',
        createdAt: new Date().toISOString(),
        hasPoster: false,
      };
      state.contents.push(item);
      save();
      busy = 'Membuat poster AI...';
      render();
      try {
        var ir = await api('/images/generations', {
          model: state.settings.imageModel,
          prompt:
            (pkg.poster_prompt ||
              'Create a premium vertical poster for ' +
                c.name +
                ' about ' +
                topic) +
            '. No logos except generic branding. High readability, polished social-media design.',
          size: '1024x1536',
          quality: state.settings.imageQuality || 'low',
          output_format: 'jpeg',
          output_compression: 75,
        });
        var b64 = ir.data && ir.data[0] && ir.data[0].b64_json;
        if (b64) {
          await putImage(id, 'data:image/jpeg;base64,' + b64);
          item.hasPoster = true;
          save();
        }
      } catch (imgErr) {
        item.posterError = imgErr.message;
        save();
      }
      page = 'content';
      modal = { type: 'package', id: id };
    } catch (e) {
      alert('Production gagal: ' + e.message);
    } finally {
      busy = '';
      render();
    }
  };
  window.regenPoster = async function (id) {
    var item = state.contents.find(function (x) {
      return x.id === id;
    });
    if (!item) return;
    if (!state.settings.apiKey) return alert('AI Provider belum tersambung.');
    busy = 'Regenerate poster...';
    render();
    try {
      var c = ch(item.channel),
        ir = await api('/images/generations', {
          model: state.settings.imageModel,
          prompt:
            item.posterPrompt ||
            'Premium vertical social poster for ' +
              c.name +
              ' about ' +
              item.title,
          size: '1024x1536',
          quality: state.settings.imageQuality || 'low',
          output_format: 'jpeg',
          output_compression: 75,
        });
      var b64 = ir.data && ir.data[0] && ir.data[0].b64_json;
      if (!b64) throw new Error('Image API tidak mengembalikan gambar');
      await putImage(id, 'data:image/jpeg;base64,' + b64);
      item.hasPoster = true;
      delete item.posterError;
      save();
    } catch (e) {
      alert('Poster gagal: ' + e.message);
    } finally {
      busy = '';
      render();
    }
  };
  window.savePackage = function (id) {
    var x = state.contents.find(function (a) {
      return a.id === id;
    });
    if (!x) return;
    x.title = qs('#editTitle').value.trim();
    x.content = qs('#editContent').value.trim();
    x.caption = qs('#editCaption').value.trim();
    x.posterPrompt = qs('#editPoster').value.trim();
    save();
    alert('Perubahan tersimpan.');
    render();
  };
  window.setStatus = function (id, s) {
    var x = state.contents.find(function (a) {
      return a.id === id;
    });
    if (!x) return;
    x.status = s;
    if (s === 'Scheduled') {
      var t = prompt(
        'Jadwal publish (contoh 2026-08-18 19:00):',
        x.schedule || ''
      );
      if (!t) return;
      x.schedule = t;
    }
    if (
      s === 'Published' &&
      !confirm(
        'Tandai sebagai Published? Gunakan ini hanya setelah benar-benar diposting.'
      )
    )
      return;
    save();
    render();
  };
  window.removeContent = async function (id) {
    if (!confirm('Hapus paket konten ini?')) return;
    state.contents = state.contents.filter(function (x) {
      return x.id !== id;
    });
    await delImage(id);
    save();
    modal = null;
    render();
  };
  window.downloadPoster = async function (id) {
    var data = await getImage(id);
    if (!data) return alert('Poster belum tersedia.');
    var a = document.createElement('a');
    a.href = data;
    a.download = 'ACC-' + id + '.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  function count(s) {
    return state.contents.filter(function (x) {
      return x.status === s;
    }).length;
  }
  function itemCard(x) {
    return (
      '<div class="card content-card"><div class="row"><div class="grow"><div class="content-title">' +
      esc(x.title) +
      '</div><div class="muted">' +
      esc(x.channel) +
      ' · ' +
      esc(x.format) +
      '</div></div><span class="pill">' +
      esc(x.status) +
      '</span></div><button class="btn full" onclick="openPackage(' +
      x.id +
      ')">Open package</button></div>'
    );
  }
  function home() {
    var c = ch(state.active);
    return (
      '<div class="hero"><div class="hero-head">' +
      logo(c, 'hero-logo') +
      '<div><div class="eyebrow">ACTIVE CHANNEL</div><h1>' +
      esc(c.name) +
      '</h1><div class="muted-light">' +
      esc(c.niche) +
      ' · PASSPORT LOCKED</div></div></div><div class="hero-actions"><button class="btn" onclick="nav(\'create\')">Produce content</button><button class="btn glass" onclick="openPassport(\'' +
      esc(c.name).replace(/'/g, "\\'") +
      '\')">Passport</button></div></div><div class="stats">' +
      ['Draft', 'Review', 'Approved', 'Scheduled']
        .map(function (s) {
          return (
            '<div class="card stat"><span class="muted">' +
            s +
            '</span><strong>' +
            count(s) +
            '</strong></div>'
          );
        })
        .join('') +
      '</div><div class="card"><div class="section-head"><h2>Production engine</h2><span class="pill ' +
      (state.settings.apiKey ? 'ok' : '') +
      '">' +
      (state.settings.apiKey ? 'AI CONNECTED' : 'SETUP REQUIRED') +
      '</span></div><div class="muted">28 channels · A–Z · passport-aware content, caption and AI poster production.</div></div><h2>Recent work</h2>' +
      (state.contents.length
        ? state.contents.slice(-4).reverse().map(itemCard).join('')
        : '<div class="card empty">Belum ada produksi.</div>')
    );
  }
  function createP() {
    var c = ch(state.active);
    return (
      '<div class="eyebrow">REAL PRODUCTION</div><h1>Create package</h1><div class="card passport-mini"><div class="row left">' +
      logo(c, 'small') +
      '<div><h2>' +
      esc(c.name) +
      '</h2><div class="muted">' +
      esc(c.niche) +
      ' · ' +
      esc(c.cadence) +
      '</div></div></div><button class="linkbtn" onclick="openPassport(\'' +
      esc(c.name).replace(/'/g, "\\'") +
      '\')">View passport</button></div><div class="card"><label>Topik / brief</label><textarea id="brief" placeholder="Contoh: event nightlife Indonesia minggu ini, berita terbaru game, sejarah kerajaan berikutnya..."></textarea><label>Output</label><select id="format"><option>Poster + Caption</option><option>Research + Poster + Caption</option><option>Caption + Editorial</option></select><div class="ai-note">' +
      (requiresResearch(c)
        ? 'Passport channel ini meminta riset/verifikasi sebelum produksi.'
        : 'Produksi mengikuti passport aktif.') +
      '</div><button class="btn full" onclick="generate()">Generate real package</button></div>'
    );
  }
  function content() {
    return (
      '<div class="row"><div><div class="eyebrow">PRODUCTION LIBRARY</div><h1>Content</h1></div><button class="btn compact" onclick="nav(\'create\')">+ Create</button></div>' +
      (state.contents.length
        ? state.contents.slice().reverse().map(itemCard).join('')
        : '<div class="card empty">Belum ada paket konten.</div>')
    );
  }
  function calendar() {
    var q = state.contents.filter(function (x) {
      return x.status === 'Scheduled';
    });
    return (
      '<div class="eyebrow">PUBLISHING QUEUE</div><h1>Calendar</h1>' +
      (q.length
        ? q
            .map(function (x) {
              return (
                itemCard(x) +
                '<div class="muted schedule-line">' +
                esc(x.schedule || 'Jadwal belum diisi') +
                '</div>'
              );
            })
            .join('')
        : '<div class="card empty">Queue kosong.</div>')
    );
  }
  function cards(list) {
    return list
      .map(function (c) {
        var s = esc(c.name).replace(/'/g, "\\'");
        return (
          '<div class="card channel-card"><div class="row"><div class="row left grow">' +
          logo(c, 'channel-logo') +
          '<div class="grow"><div class="channel">' +
          esc(c.name) +
          '</div><div class="muted">' +
          esc(c.niche) +
          ' · ' +
          esc(c.cadence) +
          '</div><div class="passport-state">Passport LOCKED</div></div></div><div class="channel-buttons"><button class="iconbtn" onclick="openPassport(\'' +
          s +
          '\')">Passport</button><button class="btn compact ' +
          (state.active === c.name ? 'secondary' : '') +
          '" onclick="activate(\'' +
          s +
          '\')">' +
          (state.active === c.name ? 'Active' : 'Activate') +
          '</button></div></div></div>'
        );
      })
      .join('');
  }
  function channels() {
    return (
      '<div class="eyebrow">OFFICIAL ACC REGISTRY</div><div class="row"><h1>28 Channels</h1><span class="pill">A–Z</span></div><input class="input" placeholder="Cari channel..." oninput="filterChannels(this.value)"><div id="channelList">' +
      cards(C) +
      '</div>'
    );
  }
  window.filterChannels = function (v) {
    var q = String(v || '').toLowerCase(),
      e = qs('#channelList');
    if (e)
      e.innerHTML = cards(
        C.filter(function (c) {
          return (c.name + ' ' + c.niche).toLowerCase().includes(q);
        })
      );
  };
  function settings() {
    return (
      '<div class="eyebrow">PRODUCTION CONNECTION</div><h1>Settings</h1><div class="card"><label>API Base URL</label><input id="apiBase" class="input" value="' +
      esc(state.settings.apiBase) +
      '"><label>OpenAI API key</label><input id="apiKey" class="input" type="password" value="' +
      esc(state.settings.apiKey) +
      '" placeholder="sk-..."><label>Text model</label><input id="textModel" class="input" value="' +
      esc(state.settings.textModel) +
      '"><label>Image model</label><input id="imageModel" class="input" value="' +
      esc(state.settings.imageModel) +
      '"><label>Image quality</label><select id="imageQuality"><option value="low" ' +
      (state.settings.imageQuality === 'low' ? 'selected' : '') +
      '>Low / economical</option><option value="medium" ' +
      (state.settings.imageQuality === 'medium' ? 'selected' : '') +
      '>Medium</option><option value="high" ' +
      (state.settings.imageQuality === 'high' ? 'selected' : '') +
      '>High</option></select><div class="ai-note">Private-device mode. API key disimpan lokal di perangkat dan tidak ditanam di source APK.</div><button class="btn full" onclick="saveSettings()">Save settings</button><button class="btn secondary full" onclick="testAI()">Test AI connection</button></div>'
    );
  }
  function passportModal(c) {
    return (
      '<div class="overlay" onclick="closeModal()"><div class="passport-sheet" onclick="event.stopPropagation()"><div class="sheet-handle"></div><div class="row left">' +
      logo(c, 'passport-logo') +
      '<div class="grow"><div class="eyebrow">CHANNEL PASSPORT</div><h1>' +
      esc(c.name) +
      '</h1><div class="passport-state">LOCKED</div></div><button class="closebtn" onclick="closeModal()">×</button></div><div class="passport-grid"><div><span>Niche</span><b>' +
      esc(c.niche) +
      '</b></div><div><span>Language</span><b>' +
      esc(c.lang) +
      '</b></div><div><span>Cadence</span><b>' +
      esc(c.cadence) +
      '</b></div><div><span>Research</span><b>' +
      (requiresResearch(c) ? 'Required / when relevant' : 'Passport based') +
      '</b></div></div><div class="passport-block"><span>WORKFLOW</span><p>' +
      esc(c.workflow) +
      '</p></div><div class="passport-block"><span>HARD RULES</span><p>' +
      esc(c.rules) +
      '</p></div><button class="btn full" onclick="activate(\'' +
      esc(c.name).replace(/'/g, "\\'") +
      '\');closeModal()">Activate channel</button></div></div>'
    );
  }
  function packageModal(x) {
    return (
      '<div class="overlay"><div class="passport-sheet package-sheet"><div class="sheet-handle"></div><div class="row"><div><div class="eyebrow">CONTENT PACKAGE</div><h1>' +
      esc(x.title) +
      '</h1><div class="muted">' +
      esc(x.channel) +
      ' · ' +
      esc(x.status) +
      '</div></div><button class="closebtn" onclick="closeModal()">×</button></div><div class="poster-wrap">' +
      (x.hasPoster
        ? '<img class="poster-preview hidden" data-poster-id="' +
          x.id +
          '" alt="AI Poster">'
        : '<div class="poster-empty">' +
          (x.posterError
            ? 'Poster generation failed. Tap Regenerate.'
            : 'Poster belum tersedia.') +
          '</div>') +
      '</div><div class="row package-actions"><button class="btn secondary" onclick="regenPoster(' +
      x.id +
      ')">Regenerate poster</button>' +
      (x.hasPoster
        ? '<button class="btn secondary" onclick="downloadPoster(' +
          x.id +
          ')">Save poster</button>'
        : '') +
      '</div><label>Title</label><input id="editTitle" class="input" value="' +
      esc(x.title) +
      '"><label>CONTENT</label><textarea id="editContent" class="bigtext">' +
      esc(x.content) +
      '</textarea><label>CAPTION</label><textarea id="editCaption" class="bigtext">' +
      esc(x.caption) +
      '</textarea><label>POSTER PROMPT</label><textarea id="editPoster">' +
      esc(x.posterPrompt) +
      '</textarea>' +
      (x.factNote
        ? '<div class="ai-note"><b>Fact note:</b> ' + esc(x.factNote) + '</div>'
        : '') +
      '<button class="btn full" onclick="savePackage(' +
      x.id +
      ')">Save edits</button><div class="status-actions">' +
      statusButtons(x) +
      '</div><button class="btn secondary danger full" onclick="removeContent(' +
      x.id +
      ')">Delete package</button></div></div>'
    );
  }
  function statusButtons(x) {
    var a = [];
    if (x.status === 'Draft')
      a.push(
        '<button class="btn full" onclick="setStatus(' +
          x.id +
          ",'Review')\">Send to Review</button>"
      );
    if (x.status === 'Review')
      a.push(
        '<button class="btn full" onclick="setStatus(' +
          x.id +
          ",'Approved')\">Approve</button>"
      );
    if (x.status === 'Approved')
      a.push(
        '<button class="btn full" onclick="setStatus(' +
          x.id +
          ",'Scheduled')\">Schedule</button>",
        '<button class="btn secondary full" onclick="setStatus(' +
          x.id +
          ",'Published')\">Mark Published</button>"
      );
    if (x.status === 'Scheduled')
      a.push(
        '<button class="btn full" onclick="setStatus(' +
          x.id +
          ",'Published')\">Mark Published</button>"
      );
    return a.join('');
  }
  function modalHTML() {
    if (!modal) return '';
    if (modal.type === 'passport') return passportModal(ch(modal.name));
    if (modal.type === 'package') {
      var x = state.contents.find(function (a) {
        return a.id === modal.id;
      });
      return x ? packageModal(x) : '';
    }
    return '';
  }
  function render() {
    var app = qs('#app');
    if (!app) return;
    var body =
      page === 'home'
        ? home()
        : page === 'content'
          ? content()
          : page === 'create'
            ? createP()
            : page === 'calendar'
              ? calendar()
              : page === 'channels'
                ? channels()
                : settings();
    app.innerHTML =
      '<main class="shell"><div class="top"><div><div class="brand">ACC CONTENT HUB</div><div class="muted">Independent comparison build · 28-channel engine</div></div><span class="pill">v0.6</span></div>' +
      body +
      '</main><nav class="tabs"><div>' +
      [
        ['home', 'Home'],
        ['content', 'Content'],
        ['create', 'Create'],
        ['calendar', 'Calendar'],
        ['channels', 'Channels'],
        ['settings', 'Settings'],
      ]
        .map(function (n) {
          return (
            '<button class="' +
            (page === n[0] ? 'active' : '') +
            '" onclick="nav(\'' +
            n[0] +
            '\')">' +
            n[1] +
            '</button>'
          );
        })
        .join('') +
      '</div></nav>' +
      modalHTML() +
      (busy
        ? '<div class="busy"><div class="spinner"></div><b>' +
          esc(busy) +
          '</b><span>Jangan tutup aplikasi.</span></div>'
        : '');
    hydrateImages();
  }
  save();
  document.addEventListener('DOMContentLoaded', render);
  if (document.readyState !== 'loading') render();
})();
