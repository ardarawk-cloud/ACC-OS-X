import './styles.css';
import { api } from './api';
import { createWebSocketUrl, SchemaVersion } from '@eulerstream/euler-websocket-sdk';

const BALI_TZ = 'Asia/Makassar';
const TIKTOK_USERNAME = 'ardamoron';
const BUILD_ID = 'radio-v2-20260923a';

const titleEl = document.getElementById('daypartTitle') as HTMLElement;
const clockEl = document.getElementById('clock') as HTMLElement;
const dateEl = document.getElementById('date') as HTMLElement;
const promptEl = document.getElementById('prompt') as HTMLElement;
const modeLabelEl = document.getElementById('modeLabel') as HTMLElement;
const statusEl = document.getElementById('cloudStatus') as HTMLElement;
const aiCard = document.getElementById('aiLiveCard') as HTMLElement;
const aiCommand = document.getElementById('aiLiveCommand') as HTMLElement;
const aiViewer = document.getElementById('aiLiveViewer') as HTMLElement;
const aiQuestion = document.getElementById('aiLiveQuestion') as HTMLElement;
const aiThinking = document.getElementById('aiLiveThinking') as HTMLElement;
const aiAnswer = document.getElementById('aiLiveAnswer') as HTMLElement;

const periods = [
  {
    start: 0,
    end: 299,
    cls: 'theme-midnight',
    title: 'BALI MIDNIGHT',
    mode: 'CHILL • MUSIC • MIDNIGHT',
  },
  {
    start: 300,
    end: 659,
    cls: 'theme-morning',
    title: 'BALI MORNING',
    mode: 'MORNING • MUSIC • BALI',
  },
  {
    start: 660,
    end: 959,
    cls: 'theme-day',
    title: 'BALI DAY VIBES',
    mode: 'DAY • MUSIC • TROPICAL',
  },
  {
    start: 960,
    end: 1109,
    cls: 'theme-golden',
    title: 'BALI GOLDEN HOUR',
    mode: 'SUNSET • MUSIC • BALI',
  },
  {
    start: 1110,
    end: 1439,
    cls: 'theme-night',
    title: 'BALI AFTER DARK',
    mode: 'CHILL • MUSIC • NIGHT',
  },
];

const prompts = [
  'DROP YOUR CITY IN CHAT',
  'REQUEST SONG: !play SONG - ARTIST',
  'CURHAT KE AI: !curhat PESANMU',
  'ASK BALI AI: !tanya PERTANYAANMU',
  'FUN MODE: !roast • !quote • !jodoh',
  'BALI TIME — WHO IS STILL AWAKE?',
];
let promptIndex = 0;
let ws: WebSocket | null = null;
let wsConnectTimer = 0;
let lastAutoReplyAt = 0;
const AUTO_REPLY_COOLDOWN_MS = 12000;
const cooldown = new Map<string, number>();
const spokenChat = new Map<string, number>();
let preferredVoice: SpeechSynthesisVoice | null = null;
let ttsSpeaking = false;
let ttsTimer = 0;
let announcedReady = false;
const ttsQueue: Array<{ text: string; rate: number }> = [];

function voiceState() {
  return 'speechSynthesis' in window ? 'VOICE YES' : 'VOICE NO';
}

function refreshVoice() {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices();
  preferredVoice =
    voices.find(v => /^id-ID$/i.test(v.lang)) ||
    voices.find(v => /^id/i.test(v.lang)) ||
    voices.find(v => /^en/i.test(v.lang)) ||
    voices[0] ||
    null;
}

function cleanForSpeech(text: string) {
  return String(text)
    .replace(/https?:\/\/\S+/gi, 'link')
    .replace(/[_*#~`<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150);
}

function pumpVoice() {
  if (!('speechSynthesis' in window) || ttsSpeaking || !ttsQueue.length) return;
  refreshVoice();
  const next = ttsQueue.shift();
  if (!next) return;
  const utterance = new SpeechSynthesisUtterance(next.text);
  utterance.lang = preferredVoice?.lang || 'id-ID';
  if (preferredVoice) utterance.voice = preferredVoice;
  utterance.rate = next.rate;
  utterance.pitch = 1;
  utterance.volume = 1;
  ttsSpeaking = true;
  window.speechSynthesis.resume();
  const finish = () => {
    window.clearTimeout(ttsTimer);
    ttsSpeaking = false;
    setTimeout(pumpVoice, 120);
  };
  utterance.onend = finish;
  utterance.onerror = finish;
  ttsTimer = window.setTimeout(() => {
    window.speechSynthesis.cancel();
    finish();
  }, 12000);
  window.speechSynthesis.speak(utterance);
}

function speakText(text: string, rate = 1.16) {
  if (!('speechSynthesis' in window)) return;
  const clean = cleanForSpeech(text);
  if (!clean) return;
  if (ttsQueue.length >= 8) ttsQueue.shift();
  ttsQueue.push({ text: clean, rate });
  pumpVoice();
}

function speakChat(username: string, comment: string, data: any) {
  const clean = cleanForSpeech(comment);
  if (!clean) return;
  const messageId = String(
    data?.msgId || data?.messageId || data?.id || data?.common?.msgId || ''
  );
  const key = messageId || `${username}|${clean}|${Math.floor(Date.now() / 3000)}`;
  if (spokenChat.has(key)) return;
  spokenChat.set(key, Date.now());
  const cutoff = Date.now() - 120000;
  for (const [id, ts] of spokenChat) if (ts < cutoff) spokenChat.delete(id);
  const spokenName = username && username !== 'viewer' ? username : 'viewer';
  speakText(`${spokenName} bilang, ${clean}`, 1.18);
}

refreshVoice();
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = refreshVoice;
  window.setInterval(() => {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  }, 2500);
}

function baliParts() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BALI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map(p => [p.type, p.value]));
}

function updateTimeAndTheme() {
  const p = baliParts();
  const mins = Number(p.hour) * 60 + Number(p.minute);
  const period =
    periods.find(x => mins >= x.start && mins <= x.end) || periods[4];
  document.body.classList.remove(
    'theme-morning',
    'theme-day',
    'theme-golden',
    'theme-night',
    'theme-midnight'
  );
  document.body.classList.add(period.cls);
  titleEl.textContent = period.title;
  modeLabelEl.textContent = period.mode;
  clockEl.textContent = p.hour + ':' + p.minute + ':' + p.second;
  dateEl.textContent = new Intl.DateTimeFormat('en-GB', {
    timeZone: BALI_TZ,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
    .format(new Date())
    .toUpperCase();
}

function buildEqualizer() {
  const eq = document.getElementById('equalizer') as HTMLElement;
  const bars: HTMLElement[] = [];
  for (let i = 0; i < 24; i++) {
    const bar = document.createElement('span');
    bar.className = 'bar';
    bar.style.height = 24 + Math.random() * 58 + 'px';
    bar.style.animationDuration = 0.35 + Math.random() * 0.8 + 's';
    bar.style.animationDelay = -Math.random() + 's';
    eq.appendChild(bar);
    bars.push(bar);
  }
  setInterval(
    () =>
      bars.forEach((bar, i) => {
        const wave = Math.sin(Date.now() / 220 + i * 0.68);
        bar.style.height = 18 + (wave + 1) * 17 + Math.random() * 28 + 'px';
      }),
    260
  );
}

function buildRain() {
  const rain = document.getElementById('rain') as HTMLElement;
  for (let i = 0; i < 52; i++) {
    const drop = document.createElement('span');
    drop.className = 'drop';
    drop.style.left = Math.random() * 100 + '%';
    drop.style.animationDuration = 1.05 + Math.random() * 1.9 + 's';
    drop.style.animationDelay = -Math.random() * 3 + 's';
    drop.style.opacity = String(0.1 + Math.random() * 0.45);
    rain.appendChild(drop);
  }
}

let aiHideTimer = 0;
function renderAI(
  command: string,
  username: string,
  question: string,
  answer?: string
) {
  window.clearTimeout(aiHideTimer);
  aiCommand.textContent = '!' + command;
  aiViewer.textContent = '@' + username;
  aiQuestion.textContent = question;
  const thinking = !answer;
  aiThinking.style.display = thinking ? 'block' : 'none';
  aiAnswer.style.display = thinking ? 'none' : 'block';
  aiAnswer.textContent = answer || '';
  aiCard.classList.remove('hidden');
  if (answer) {
    aiHideTimer = window.setTimeout(() => aiCard.classList.add('hidden'), 10000);
  }
}

function parseCommand(comment: string) {
  const clean = comment.trim();
  if (!clean) return null;

  const m = clean.match(/^!(curhat|tanya|roast|quote|quotes|jodoh|ai)(?:\s+(.+))?$/i);
  if (m) {
    const rawCommand = m[1].toLowerCase();
    const command = rawCommand === 'quotes' ? 'quote' : rawCommand;
    const defaults: Record<string, string> = {
      jodoh: 'Cocokkan jodohku secara fun',
      quote: 'Kasih aku quote singkat',
      roast: 'Roast aku ringan aja',
      ai: 'Sapa aku singkat',
      tanya: 'Sapa aku singkat',
      curhat: 'Temani aku sebentar',
    };
    return {
      command,
      text: String(m[2] || defaults[command]).trim().slice(0, 500),
      automatic: false,
    };
  }

  if (clean.startsWith('!')) return null;
  if (clean.length < 2) return null;

  return {
    command: 'ai',
    text: clean.slice(0, 500),
    automatic: true,
  };
}

async function handleChat(eventData: any) {
  const data = eventData?.data?.data || eventData?.data || eventData?.payload || eventData || {};
  const comment = String(
    data.comment ??
      data.commentText ??
      data.content ??
      data.text ??
      data.message ??
      ''
  );
  const user = data.user || {};
  const username = String(
    user.uniqueId ||
      user.unique_id ||
      user.displayId ||
      user.display_id ||
      user.nickname ||
      data.uniqueId ||
      data.unique_id ||
      data.displayId ||
      data.display_id ||
      data.nickname ||
      'viewer'
  );

  statusEl.textContent = 'CHAT RX • ' + voiceState();
  speakChat(username, comment, data);

  const parsed = parseCommand(comment);
  if (!parsed) return;
  const now = Date.now();
  if (now - (cooldown.get(username) || 0) < 8000) return;
  if (parsed.automatic && now - lastAutoReplyAt < AUTO_REPLY_COOLDOWN_MS) return;

  cooldown.set(username, now);
  if (parsed.automatic) lastAutoReplyAt = now;

  statusEl.textContent = 'CLOUD AI • CHAT RECEIVED';
  renderAI(parsed.command, username, parsed.text);

  try {
    const result = await api.post('/api/ai', {
      command: parsed.command,
      text: parsed.text,
      username,
    });
    const answer = String(
      result.data?.answer || 'Aku belum punya jawaban yang pas buat itu.'
    );
    renderAI(parsed.command, username, parsed.text, answer);
    statusEl.textContent = 'AI OK • ' + voiceState();
    speakText(`Bali AI menjawab, ${answer}`, 1.12);
  } catch {
    statusEl.textContent = 'AI ERROR • ' + voiceState();
    renderAI(
      parsed.command,
      username,
      parsed.text,
      'AI lagi gagal jawab. Coba lagi sebentar.'
    );
  }
}

function dispatchWs(payload: any) {
  const visited = new Set<any>();

  const walk = (value: any, depth = 0) => {
    if (value == null || depth > 7) return;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (
        trimmed.length < 200000 &&
        (trimmed.startsWith('{') || trimmed.startsWith('['))
      ) {
        try {
          walk(JSON.parse(trimmed), depth + 1);
        } catch {}
      }
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(item => walk(item, depth + 1));
      return;
    }

    if (typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);

    const evt = String(
      value.event || value.type || value.eventName || value.method || ''
    ).toLowerCase();
    const data = value?.data?.data || value?.data || value?.payload || value;
    const hasChatText =
      typeof data?.comment === 'string' ||
      typeof data?.commentText === 'string' ||
      typeof data?.content === 'string' ||
      typeof data?.text === 'string' ||
      typeof data?.message === 'string';

    if (evt.includes('chat') || evt.includes('comment') || hasChatText) {
      handleChat(data);
    }

    Object.entries(value).forEach(([key, child]) => {
      if (key === 'user' || key === 'author' || key === 'sender') return;
      walk(child, depth + 1);
    });
  };

  walk(payload);
}

async function connectTikTok() {
  try {
    statusEl.textContent = 'WS CONNECTING • ' + voiceState();
    const response = await api.get('/api/euler-jwt');
    if (!response.data?.configured) {
      statusEl.textContent = 'CLOUD AI • SETUP';
      setTimeout(connectTikTok, 30000);
      return;
    }

    const url = createWebSocketUrl({
      uniqueId: '@' + TIKTOK_USERNAME,
      jwtKey: String(response.data.token),
      features: {
        schemaVersion: SchemaVersion.v3,
        bundleEvents: false,
        normalizeUniqueId: true,
      },
    });
    ws?.close();
    ws = new WebSocket(url);
    window.clearTimeout(wsConnectTimer);
    wsConnectTimer = window.setTimeout(() => {
      if (ws && ws.readyState !== WebSocket.OPEN) {
        statusEl.textContent = 'CLOUD AI • RETRYING';
        try { ws.close(); } catch {}
      }
    }, 9000);

    ws.onopen = () => {
      window.clearTimeout(wsConnectTimer);
      refreshVoice();
      statusEl.textContent = 'WS OPEN • ' + voiceState();
      if ('speechSynthesis' in window) window.speechSynthesis.resume();
      if (!announcedReady) {
        announcedReady = true;
        speakText('Bali AI online', 1.15);
      }
    };
    ws.onmessage = ev => {
      statusEl.textContent = 'EVENT RX • ' + voiceState();
      try {
        if (typeof ev.data === 'string') {
          dispatchWs(JSON.parse(ev.data));
          return;
        }

        if (ev.data instanceof Blob) {
          ev.data.text().then(text => {
            try {
              dispatchWs(JSON.parse(text));
            } catch {}
          });
          return;
        }

        if (ev.data instanceof ArrayBuffer) {
          try {
            dispatchWs(JSON.parse(new TextDecoder().decode(ev.data)));
          } catch {}
        }
      } catch {}
    };
    ws.onclose = ev => {
      window.clearTimeout(wsConnectTimer);
      statusEl.textContent =
        ev.code === 4404
          ? 'WS 4404 • NOT LIVE'
          : 'WS CLOSED ' + ev.code + (ev.reason ? ' • ' + ev.reason : '');
      setTimeout(connectTikTok, ev.code === 4404 ? 30000 : 5000);
    };
    ws.onerror = () => {
      statusEl.textContent = 'CLOUD AI • CONNECTION ERROR';
      try { ws?.close(); } catch {}
    };
  } catch {
    statusEl.textContent = 'CLOUD AI • RETRYING';
    setTimeout(connectTikTok, 15000);
  }
}

buildEqualizer();
buildRain();
updateTimeAndTheme();
connectTikTok();
setInterval(updateTimeAndTheme, 1000);
setInterval(() => {
  promptIndex = (promptIndex + 1) % prompts.length;
  promptEl.textContent = prompts[promptIndex];
}, 10000);

setInterval(async () => {
  try {
    const health = await api.get('/api/_healthcheck');
    if (health.data?.buildId && health.data.buildId !== BUILD_ID) {
      window.location.reload();
    }
  } catch {}
}, 45000);
