import React, { useMemo, useState } from 'react';
import { Home, Layers3, Sparkles, CalendarDays, Users, Settings, Plus, Check, Clock3, Send, Trash2 } from 'lucide-react';

const seedChannels = [
  { id: 'tukang-tambang', name: 'Tukang Tambang', niche: 'Crypto & trading', language: 'Bahasa Indonesia', tone: 'Modern, hangat, informatif' },
  { id: 'ardmrn-gaming', name: 'Ardmrn Gaming', niche: 'Game', language: 'Bahasa Indonesia', tone: 'Modern, hangat, informatif' }
];

const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};

export default function App() {
  const [tab, setTab] = useState('home');
  const [channels, setChannels] = useState(() => load('acc_channels', seedChannels));
  const [activeId, setActiveId] = useState(() => load('acc_active_channel', seedChannels[0].id));
  const [contents, setContents] = useState(() => load('acc_contents', []));
  const [brief, setBrief] = useState('');
  const [settings, setSettings] = useState(() => load('acc_settings', { aiProvider: 'OpenAI-compatible', model: 'free-model', baseUrl: '', apiKey: '', metaReady: false }));
  const active = channels.find(c => c.id === activeId) || channels[0];

  const persist = (key, value, setter) => { setter(value); localStorage.setItem(key, JSON.stringify(value)); };
  const stats = useMemo(() => ({
    generated: contents.length,
    ready: contents.filter(x => x.status === 'ready').length,
    scheduled: contents.filter(x => x.status === 'scheduled').length,
    published: contents.filter(x => x.status === 'published').length
  }), [contents]);

  function addChannel() {
    const n = prompt('Nama channel?'); if (!n) return;
    const niche = prompt('Niche channel?', 'General content') || 'General content';
    const next = [...channels, { id: crypto.randomUUID(), name: n, niche, language: 'Bahasa Indonesia', tone: 'Modern, informatif' }];
    persist('acc_channels', next, setChannels);
  }

  function generate() {
    if (!brief.trim()) return;
    const item = {
      id: crypto.randomUUID(), channelId: active.id, channel: active.name, brief: brief.trim(),
      title: brief.trim().slice(0, 70),
      caption: `Draft untuk ${active.name}: ${brief.trim()}\n\nTone: ${active.tone}.`,
      status: 'ready', createdAt: new Date().toISOString(), scheduledAt: null
    };
    const next = [item, ...contents]; persist('acc_contents', next, setContents); setBrief(''); setTab('content');
  }

  function updateStatus(id, status) {
    const next = contents.map(x => x.id === id ? { ...x, status, scheduledAt: status === 'scheduled' ? new Date(Date.now()+3600000).toISOString() : x.scheduledAt } : x);
    persist('acc_contents', next, setContents);
  }

  function removeContent(id) { persist('acc_contents', contents.filter(x => x.id !== id), setContents); }

  const nav = [
    ['home', Home, 'Home'], ['content', Layers3, 'Content'], ['create', Sparkles, 'Create'],
    ['calendar', CalendarDays, 'Calendar'], ['channels', Users, 'Channels'], ['settings', Settings, 'Settings']
  ];

  return <div className="app">
    <main>
      {tab === 'home' && <section>
        <p className="eyebrow">ACC OS X · CONTENT OPERATIONS</p>
        <h1>Make something matter.</h1>
        <div className="hero-card">
          <span>ACTIVE CHANNEL</span><h2>{active?.name || 'Create your first channel'}</h2>
          <p>{active ? `${active.niche} · Passport active` : 'Your brand identity starts here'}</p>
        </div>
        <button className="primary" onClick={() => setTab('create')}><Plus size={20}/> Create content</button>
        <h3>Today at a glance</h3>
        <div className="stats">{Object.entries(stats).map(([k,v]) => <div className="stat" key={k}><b>{v}</b><span>{k}</span></div>)}</div>
        <div className="section-title"><h3>Recent work</h3><button onClick={() => setTab('content')}>See all</button></div>
        {contents.slice(0,3).map(x => <ContentCard key={x.id} item={x} onStatus={updateStatus} onDelete={removeContent}/>) }
      </section>}

      {tab === 'channels' && <section>
        <div className="section-title"><div><p className="eyebrow">YOUR BRANDS</p><h1>Channel manager</h1></div><button className="icon-btn" onClick={addChannel}><Plus/></button></div>
        {channels.map(c => <button key={c.id} className={`channel-card ${c.id===activeId?'active':''}`} onClick={() => {persist('acc_active_channel', c.id, setActiveId)}}>
          <div><h2>{c.name}</h2><p>{c.niche} · {c.language}</p><small>Passport active · {c.tone}</small></div>{c.id===activeId && <Check/>}
        </button>)}
        <button className="primary" onClick={addChannel}><Plus size={20}/> New channel</button>
      </section>}

      {tab === 'create' && <section>
        <p className="eyebrow">AI CONTENT BRAIN</p><h1>Turn a thought into a story.</h1><p className="muted">Output follows the active Channel Passport.</p>
        <h4>ACTIVE CHANNEL</h4><div className="chips">{channels.map(c => <button className={c.id===activeId?'chip active':'chip'} key={c.id} onClick={()=>persist('acc_active_channel', c.id, setActiveId)}>{c.name}</button>)}</div>
        <h4>YOUR BRIEF</h4><textarea value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Buat satu konten tentang tren..."/>
        <button className="primary" onClick={generate}><Sparkles size={20}/> Generate content package</button>
        <p className="hint">MVP saat ini membuat draft lokal. Endpoint AI nyata dipasang pada tahap backend berikutnya.</p>
      </section>}

      {tab === 'content' && <section>
        <p className="eyebrow">CONTENT LIBRARY</p><h1>Ready for your review.</h1>
        {contents.length === 0 ? <Empty text="Konten Anda akan muncul di sini."/> : contents.map(x => <ContentCard key={x.id} item={x} onStatus={updateStatus} onDelete={removeContent}/>)}
      </section>}

      {tab === 'calendar' && <section>
        <p className="eyebrow">PUBLISHING QUEUE</p><h1>Plan your presence.</h1><p className="muted">Approved content can be scheduled here. Meta publishing remains credential-gated.</p>
        {contents.filter(x=>x.status==='scheduled').length===0 ? <Empty text="Queue kosong. Schedule konten dari Content Library."/> : contents.filter(x=>x.status==='scheduled').map(x => <ContentCard key={x.id} item={x} onStatus={updateStatus} onDelete={removeContent}/>)}
      </section>}

      {tab === 'settings' && <section>
        <p className="eyebrow">SYSTEM SETTINGS</p><h1>Connections</h1>
        <div className="settings-card"><h3>AI provider</h3><label>Base URL<input value={settings.baseUrl} onChange={e=>setSettings({...settings,baseUrl:e.target.value})} placeholder="https://..."/></label><label>Model<input value={settings.model} onChange={e=>setSettings({...settings,model:e.target.value})}/></label><label>API key<input type="password" value={settings.apiKey} onChange={e=>setSettings({...settings,apiKey:e.target.value})}/></label><button className="secondary" onClick={()=>persist('acc_settings',settings,setSettings)}>Save AI settings</button></div>
        <div className="settings-card"><h3>Facebook Multi-Page Manager</h3><p>Official Meta Graph API · Needs credentials</p><small>OAuth, Page discovery, token management, publishing, retry worker, and App Review are intentionally not faked in this MVP.</small></div>
      </section>}
    </main>
    <nav>{nav.map(([id,Icon,label]) => <button key={id} onClick={()=>setTab(id)} className={tab===id?'active':''}><Icon size={24}/><span>{label}</span></button>)}</nav>
  </div>
}

function Empty({text}) { return <div className="empty"><Layers3 size={44}/><h3>Belum ada data</h3><p>{text}</p></div> }

function ContentCard({item,onStatus,onDelete}) {
  return <article className="content-card"><div className="badge">{item.channel}</div><h3>{item.title}</h3><p>{item.caption}</p><small>{new Date(item.createdAt).toLocaleString()}</small><div className="actions">
    {item.status==='ready' && <button onClick={()=>onStatus(item.id,'scheduled')}><Clock3 size={16}/> Schedule</button>}
    {item.status==='scheduled' && <button onClick={()=>onStatus(item.id,'published')}><Send size={16}/> Mark published</button>}
    {item.status==='published' && <span className="done"><Check size={16}/> Published</span>}
    <button className="danger" onClick={()=>onDelete(item.id)}><Trash2 size={16}/></button>
  </div></article>
}
