// NADMO LIVE Cost Protection v1.0 | STAGING ONLY | never controls live rooms
const PRICE = Object.freeze({free:0, pro:19900, plus:99900});
const LIMIT = Object.freeze({rooms:20, viewersPerRoom:4, guestSeats:9});
const GB_BYTES = 1000000000;
const originHeaders = {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex, nofollow'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:originHeaders})}
function err(status,code,message){return json({ok:false,code,message},status)}
function finite(value,min=0,max=1e12){const n=Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:null}
function compare(a,b){if(typeof a!=='string'||typeof b!=='string'||!b||a.length!==b.length)return false;let v=0;for(let i=0;i<a.length;i++)v|=a.charCodeAt(i)^b.charCodeAt(i);return v===0}
function auth(req,key){const h=req.headers.get('Authorization')||'';return !!key&&compare(h,'Bearer '+key)}
export function simulate(hosts,viewersPerHost=2,hoursPerDay=2,bitrateKbps=1000,usdIdr=16000,freeGb=0){
 const h=finite(hosts,1,100000),v=finite(viewersPerHost,0,1000),hrs=finite(hoursPerDay,0,24),rate=finite(bitrateKbps,64,12000);
 if(h===null||v===null||hrs===null||rate===null)return null;
 const plus=Math.floor(h/2),pro=h-plus,nominalMRR=pro*PRICE.pro+plus*PRICE.plus;
 const viewerMinutes=h*v*hrs*60*30;
 const egressGb=viewerMinutes*60*rate*1000/8/GB_BYTES;
 const relayUsd=Math.max(0,egressGb-Math.max(0,freeGb))*.05;
 const relayIdr=relayUsd*usdIdr;
 return {hosts:h,pro,plus,viewersPerHost:v,monthlyViewerMinutes:viewerMinutes,hostUploadMbps:Math.round(v*rate/1000*100)/100,nominalMRRIdr:nominalMRR,receiptsConfirmedIdr:null,budgetIllustrativeIdr:nominalMRR*.2,p2pVideoCloudEgressEstimateIdr:0,relayGb:Math.round(egressGb),relayScenarioIdr:Math.round(relayIdr),relayExceedsNominalBudget:relayIdr>nominalMRR*.2,assumptions:{days:30,hoursPerDay:hrs,videoKbps:rate,usdIdr,freeGb,relayPriceUsdPerGb:.05},warning:'All values hypothetical; Cloudflare baseline, signaling, FX, gateway, taxes and other costs excluded. 20% operational budget must use collected receipts, not nominal MRR.'};
}
export function guard({collectedIdr,actualCostIdr,estimateExtraIdr=0,billingComplete=false,stale=false}){
 if(!billingComplete||stale||collectedIdr===null||actualCostIdr===null||estimateExtraIdr===null)
  return {level:'UNKNOWN',ratio:null,budgetIdr:collectedIdr===null?null:collectedIdr*.2,advice:['Hold new paid relay capacity','Obtain current provider bill and payment settlement','Never end existing LIVE']};
 const budget=collectedIdr*.2,expense=actualCostIdr+estimateExtraIdr,ratio=budget===0?(expense>0?Infinity:0):expense/budget;
 const level=ratio>=1?'EMERGENCY':ratio>=.8?'CRITICAL':ratio>=.6?'WARNING':'NORMAL';
 return {level,ratio:Number.isFinite(ratio)?ratio:null,budgetIdr:budget,spentIdr:expense,advice:level==='NORMAL'?['Keep P2P and monitor']:level==='WARNING'?['Notify admin','Inspect high-bandwidth rooms','Suggest video optimization']:level==='CRITICAL'?['High-priority admin alert','Apply only pre-approved quality presets','Hold unneeded paid expansion']:['Reject automatic paid capacity expansion','Require owner approval','Preserve active LIVE','Publish reason and forecast']};
}
export function scaling({budgetLevel='UNKNOWN',dataFresh=false,relayNeeded=false,ownerApproved=false,activeRooms=0}){
 if(relayNeeded&&(!dataFresh||['UNKNOWN','CRITICAL','EMERGENCY'].includes(budgetLevel)||!ownerApproved))return {decision:'HOLD_PAID_SCALE',noForcedDisconnect:true,reason:'Owner consent and current cost evidence required'};
 if(activeRooms>=LIMIT.rooms)return {decision:'CAPACITY_REVIEW',noForcedDisconnect:true,reason:'Beta has fixed 20 room limit; no automatic increase'};
 return {decision:relayNeeded?'APPROVED_RECOMMENDATION_ONLY':'P2P_KEEP',noForcedDisconnect:true,reason:'Advisory only. No automatic provisioning or live-room intervention.'};
}
function normalize(x){
 if(!x||typeof x!=='object'||Array.isArray(x))return null;
 const kind=String(x.kind||'');
 if(!['room_sample','subscription_snapshot','settlement','provider_cost','network_fault'].includes(kind))return null;
 const id=String(x.id||'');
 if(!/^[a-zA-Z0-9_-]{8,90}$/.test(id))return null;
 const ts=finite(x.ts,1,4e12);
 if(ts===null||ts>Date.now()+300000||ts<Date.now()-40*86400000)return null;
 const count=(v,max)=>finite(v,0,max);
 const pro=count(x.proCount||0,100000),plus=count(x.plusCount||0,100000),viewer=count(x.viewerCount||0,500000);
 const seconds=count(x.seconds||0,60),kbps=count(x.bitrateKbps||0,12000),relay=count(x.relayBytes||0,1000000000000);
 const amount=count(x.amountIdr||0,100000000000);
 if([pro,plus,viewer,seconds,kbps,relay,amount].some(v=>v===null))return null;
 if(kind==='settlement'&&x.source!=='verified_settlement')return null;
 if(kind==='provider_cost'&&x.source!=='provider_invoice')return null;
 const room=String(x.roomId||'');
 if(kind==='room_sample'&&!/^[a-zA-Z0-9_-]{1,64}$/.test(room))return null;
 return {id,ts,kind,room,viewer,seconds,kbps,relay,amount,pro,plus,source:String(x.source||'synthetic').slice(0,40)};
}
function startOf(now,period){
 const t=new Date(now);
 if(period==='day')return Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),t.getUTCDate());
 if(period==='week')return now-7*86400000;
 return Date.UTC(t.getUTCFullYear(),t.getUTCMonth(),1);
}
export class CostLedger {
 constructor(ctx,env){
  this.ctx=ctx;this.env=env;
  const q=ctx.storage.sql;
  q.exec('CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, ts INTEGER NOT NULL, kind TEXT NOT NULL, room TEXT, viewer INTEGER, seconds REAL, kbps REAL, relay INTEGER, amount INTEGER, pro INTEGER, plus INTEGER, source TEXT)');
  q.exec('CREATE INDEX IF NOT EXISTS idx_cost_ts ON events(ts,kind)');
  q.exec('CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, level TEXT NOT NULL, message TEXT NOT NULL)');
  q.exec('CREATE TABLE IF NOT EXISTS room_state (room TEXT PRIMARY KEY, ts INTEGER NOT NULL, viewer INTEGER NOT NULL, kbps INTEGER NOT NULL)');
 }
 async fetch(req){
  const p=new URL(req.url).pathname;
  if(p==='/internal/ingest'&&req.method==='POST'){
   let data;try{const raw=await req.text();if(raw.length>60000)return err(413,'LIMIT','Batch is too large');data=JSON.parse(raw)}catch{return err(400,'BAD_JSON','Invalid JSON')}
   if(!Array.isArray(data?.items)||data.items.length<1||data.items.length>50)return err(400,'BATCH','Send 1–50 records');
   const items=data.items.map(normalize);
   if(items.some(i=>!i))return err(400,'INVALID_RECORD','Invalid or unverified record');
   const q=this.ctx.storage.sql;let added=0;
   for(const x of items){
    q.exec('INSERT OR IGNORE INTO events (id,ts,kind,room,viewer,seconds,kbps,relay,amount,pro,plus,source) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',x.id,x.ts,x.kind,x.room,x.viewer,x.seconds,x.kbps,x.relay,x.amount,x.pro,x.plus,x.source);
    const changed=q.exec('SELECT changes() AS n').one().n;
    if(changed){added++;
     if(x.kind==='room_sample')q.exec('INSERT INTO room_state (room,ts,viewer,kbps) VALUES (?,?,?,?) ON CONFLICT(room) DO UPDATE SET ts=excluded.ts,viewer=excluded.viewer,kbps=excluded.kbps WHERE excluded.ts>=room_state.ts',x.room,x.ts,x.viewer,x.kbps);
    }
   }
   for(const x of items){
    if(x.kind==='network_fault'||x.kind==='room_sample'&&x.viewer>=4&&x.kbps>=1500){
     const level='WARNING',message=x.kind==='network_fault'?'Network disruption observed (simulation)':('High room media pressure: '+x.room+' · '+x.viewer+' viewers · '+x.kbps+' kbps');
     const last=q.exec('SELECT ts,message FROM alerts ORDER BY id DESC LIMIT 1').toArray()[0];
     if(!last||last.message!==message||Date.now()-last.ts>3600000)q.exec('INSERT INTO alerts(ts,level,message) VALUES(?,?,?)',Date.now(),level,message);
    }
   }
   return json({ok:true,staging:true,accepted:added,duplicates:items.length-added,productionMutations:0});
  }
  if(p==='/internal/dashboard'&&req.method==='GET'){
   const period=['day','week','month'].includes(new URL(req.url).searchParams.get('period'))?new URL(req.url).searchParams.get('period'):'month';
   const now=Date.now(),begin=startOf(now,period),mBegin=startOf(now,'month'),q=this.ctx.storage.sql;
   const metrics=q.exec("SELECT COALESCE(SUM(CASE WHEN kind='room_sample' THEN viewer*seconds/60.0 ELSE 0 END),0) AS viewer_minutes, COALESCE(SUM(CASE WHEN kind='room_sample' THEN seconds/60.0 ELSE 0 END),0) AS live_minutes, COALESCE(SUM(CASE WHEN kind='room_sample' THEN viewer*seconds*kbps*1000.0/8000000000.0 ELSE 0 END),0) AS estimated_gb, COALESCE(SUM(CASE WHEN kind='room_sample' THEN relay ELSE 0 END),0) AS relay_bytes, COUNT(CASE WHEN kind='room_sample' THEN 1 END) AS samples FROM events WHERE ts>=?",begin).one();
   const live=q.exec('SELECT COUNT(*) AS rooms,COALESCE(SUM(viewer),0) AS viewers FROM room_state WHERE ts>? AND viewer>=0',now-90000).one();
   const sub=q.exec("SELECT pro,plus,ts FROM events WHERE kind='subscription_snapshot' ORDER BY ts DESC LIMIT 1").toArray()[0]||null;
   const receipts=q.exec("SELECT SUM(amount) AS amount,COUNT(*) AS count FROM events WHERE kind='settlement' AND ts>=?",mBegin).one();
   const costs=q.exec("SELECT SUM(amount) AS amount,MAX(ts) AS last_ts,COUNT(*) AS count FROM events WHERE kind='provider_cost' AND ts>=?",mBegin).one();
   const relayMonth=q.exec("SELECT COALESCE(SUM(relay),0) AS bytes FROM events WHERE kind='room_sample' AND ts>=?",mBegin).one();
   const validSub=!!sub&&now-sub.ts<36*3600000;
   const paidHosts=validSub?Number(sub.pro)+Number(sub.plus):null;
   const mrr=validSub?Number(sub.pro)*PRICE.pro+Number(sub.plus)*PRICE.plus:null;
   const providerCost=costs.count>0?Number(costs.amount):null;
   const relayGb=Number(relayMonth.bytes)/GB_BYTES;
   const relayEstimate=Math.round(relayGb*.05*16000); // conservative no free-tier assumption; not authoritative
   const complete=false; // billing connector not available; never claim completeness
   const decision=guard({collectedIdr:receipts.count>0?Number(receipts.amount):null,actualCostIdr:providerCost,estimateExtraIdr:relayEstimate,billingComplete:complete,stale:!costs.last_ts||now-costs.last_ts>36*3600000});
   const alert=q.exec('SELECT ts,level,message FROM alerts ORDER BY id DESC LIMIT 25').toArray();
   const highRooms=q.exec('SELECT room,viewer,kbps FROM room_state WHERE ts>? ORDER BY viewer*kbps DESC LIMIT 5',now-90000).toArray();
   const periodDays=period==='day'?1:period==='week'?7:30;
   const sampleCount=Number(metrics.samples);
   const out={ok:true,staging:true,mode:'SIMULATED_DATA_ONLY',period,generatedAt:now,limits:LIMIT,metricSource:'synthetic_staging',
    paidHosts,hostSnapshotAt:sub?.ts||null,mrrNominalIdr:mrr,subscriptionReceiptsIdr:receipts.count?Number(receipts.amount):null,
    receiptsVerifiedInProduction:false,activeRooms:Number(live.rooms),concurrentViewers:Number(live.viewers),viewerMinutes:Math.round(Number(metrics.viewer_minutes)),hostLiveMinutes:Math.round(Number(metrics.live_minutes)),
    estimatedP2pVideoGb:Number(metrics.estimated_gb.toFixed(3)),relayReportedGb:Number((Number(metrics.relay_bytes)/GB_BYTES).toFixed(3)),
    estimatedRelayCostIdr:relayEstimate,providerBilledCostIdr:providerCost,providerBillingCurrent:false,
    totalInfrastructureCostIdr:null,estimatedCostPerHostIdr:null,estimatedCostPerThousandViewerMinutesIdr:null,
    budget:decision,forecastEndOfMonthIdr:null,marginBeforeOtherCostsIdr:null,
    dataQuality:{billing:'MISSING_OR_INCOMPLETE',subscriptions:validSub?'SYNTHETIC':'STALE_OR_MISSING',video:'ESTIMATED_NOT_BILLED',relay:'CLIENT_REPORTED_NOT_PROVIDER_BILLED',receipts:'SYNTHETIC_NOT_PRODUCTION',readiness:'DO_NOT_SCALE_PAID_RELAY'},
    durationPeriodDays:periodDays,topRooms:highRooms,warning:'No provider billing integration; costs are not official bills. No live production telemetry imported.',alerts:alert};
   return json(out);
  }
  if(p==='/internal/alert'&&req.method==='POST'){
   let data;try{data=await req.json()}catch{return err(400,'INVALID','Invalid JSON')}
   if(!['NORMAL','WARNING','CRITICAL','EMERGENCY','UNKNOWN'].includes(data?.level))return err(400,'LEVEL','Bad level');
   const message=String(data.message||'').slice(0,250);
   this.ctx.storage.sql.exec('INSERT INTO alerts(ts,level,message) VALUES(?,?,?)',Date.now(),data.level,message);
   return json({ok:true});
  }
  return err(404,'NOT_FOUND','Route not found');
 }
}
const PAGE='<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NADMO LIVE · Infrastructure Finance STAGING</title><style>:root{color-scheme:dark}body{font:14px system-ui;background:#0d1510;color:#eee;margin:0;padding:22px}main{max-width:1080px;margin:auto}.heading{color:#e3fd72}section,.tile{background:#18221b;border:1px solid #304436;border-radius:10px;padding:16px;margin:12px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:10px}.tile{margin:0}.k{font-size:12px;color:#acbfae}.v{font-size:23px;font-weight:750;margin-top:8px;word-break:break-word}input,select,button{padding:11px;background:#0d1510;border:1px solid #405446;color:white;border-radius:7px}button{background:#e3fd72;color:#0d1510;font-weight:bold}p,li{line-height:1.5}.alert{border-left:4px solid #e3fd72;padding-left:12px}.warning{color:#ffe49a}.big{font-size:18px}.muted{color:#afc2b2}</style></head><body><main><div class="heading"><h1>NADMO LIVE — Infrastructure Finance</h1><strong>STAGING / SIMULATION · BUKAN DATA PRODUKSI</strong></div><section><label>Admin stage token <input id="token" type="password" autocomplete="off" placeholder="Bearer token dari admin"></label> <select id="period"><option value="day">Harian</option><option value="week">Mingguan</option><option value="month" selected>Bulanan</option></select> <button id="go">Muat dashboard</button><p id="status" class="muted">Akses data hanya untuk pemegang token admin staging.</p></section><div id="panel" hidden><section><div class="grid" id="metrics"></div></section><section><h3>Budget Guard & Keamanan</h3><p id="guard" class="big"></p><p class="warning">Tidak mengubah kualitas video, menambah layanan berbayar, atau memutus LIVE otomatis. Data billing lengkap belum tersedia.</p></section><section><h3>Riwayat peringatan</h3><div id="alerts"></div></section></div></main><script>const $=id=>document.getElementById(id);let token="";const money=n=>n===null||n===undefined?"Belum ada data":"Rp"+Math.round(n).toLocaleString("id-ID");const num=n=>n===null||n===undefined?"Belum ada data":Number(n).toLocaleString("id-ID");$("go").onclick=async()=>{token=$("token").value.trim();$("status").textContent="Memuat...";try{let r=await fetch("/api/dashboard?period="+$("period").value,{headers:{Authorization:"Bearer "+token},cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status+" — akses ditolak atau staging tidak tersedia");let d=await r.json();const m=[["MRR nominal (simulasi)",money(d.mrrNominalIdr)],["Pendapatan diterima (produksi)",money(null)],["Host berbayar simulasi",num(d.paidHosts)],["LIVE sekarang",num(d.activeRooms)],["Penonton bersamaan",num(d.concurrentViewers)],["Viewer-minutes",num(d.viewerMinutes)],["Estimasi video P2P",num(d.estimatedP2pVideoGb)+" GB"],["Relay dilaporkan",num(d.relayReportedGb)+" GB"],["Biaya provider aktual",money(d.totalInfrastructureCostIdr)],["Estimasi relay (parsial)",money(d.estimatedRelayCostIdr)],["Biaya per host",money(d.estimatedCostPerHostIdr)],["Biaya per 1.000 viewer-minutes",money(d.estimatedCostPerThousandViewerMinutesIdr)],["Pemakaian budget 20%",d.budget.ratio===null?"Belum dapat dihitung":(d.budget.ratio*100).toFixed(1)+"%"],["Proyeksi akhir bulan",money(d.forecastEndOfMonthIdr)],["Sisa margin",money(d.marginBeforeOtherCostsIdr)]];$("metrics").replaceChildren();for(let [k,v] of m){let item=document.createElement("div");item.className="tile";let a=document.createElement("div");a.className="k";a.textContent=k;let b=document.createElement("div");b.className="v";b.textContent=v;item.append(a,b);$("metrics").append(item)}$("guard").textContent=d.budget.level+" — "+d.budget.advice.join(" · ");$("alerts").replaceChildren();for(let a of d.alerts){let e=document.createElement("p");e.className="alert";e.textContent=new Date(a.ts).toLocaleString("id-ID")+" · "+a.level+" · "+a.message;$("alerts").append(e)}$("panel").hidden=false;$("status").textContent="Data berhasil dimuat · SIMULASI STAGING";}catch(e){$("status").textContent=e.message;$("panel").hidden=true}};</script></body></html>';
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url),p=url.pathname;
  if(p==='/health')return json({ok:true,service:'nadmo-live-cost-stage',version:'1.0.0',mode:'isolated',liveProductionTouched:false,paymentProcessed:false,scalingEnabled:false});
  if(p==='/'&&request.method==='GET')return new Response(PAGE,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-frame-options':'DENY','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'",'x-robots-tag':'noindex,nofollow'}});
  const ingest=p==='/api/ingest',dashboard=p==='/api/dashboard',alert=p==='/api/alert';
  if(!ingest&&!dashboard&&!alert)return err(404,'NOT_FOUND','Unknown route');
  if(!env.ADMIN_TOKEN||!env.INGEST_TOKEN)return err(503,'UNCONFIGURED','Stage secrets are not configured');
  if(!auth(request,ingest?env.INGEST_TOKEN:env.ADMIN_TOKEN))return err(401,'ADMIN_ONLY','Authentication required');
  if(ingest&&request.method!=='POST'||alert&&request.method!=='POST'||dashboard&&request.method!=='GET')return err(405,'METHOD','Not allowed');
  const stub=env.COST_LEDGER.get(env.COST_LEDGER.idFromName('nadmo-live-cost-stage-v1'));
  const path=ingest?'/internal/ingest':dashboard?'/internal/dashboard'+url.search:'/internal/alert';
  try{return await stub.fetch(new Request(new URL(path,url.origin),request))}
  catch{return err(503,'COST_STORE_UNAVAILABLE','Staging database or signaling unavailable; all live sessions remain unaffected')}
 }
};