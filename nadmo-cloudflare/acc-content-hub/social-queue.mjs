import {accessOwnerVerified} from './access-auth.mjs';
// NADMO Social owner-operated TikTok shared queue; no direct posting API.
export const TIKTOK_ACCOUNT = 'TIKTOK_SHARED_01';
export const SLOTS_WITA = ['08:00','09:30','11:00','12:30','14:00','15:30','17:00','18:30','20:00','21:30'];
export const CHANNELS = [
  ['aku-cinta-malam','Aku Cinta Malam','nightlife'],
  ['arda-gaming-hok','ARDA GAMING HOK','gaming'],
  ['ardmrn-cinematix','ARDMRN Cinematix','entertainment'],
  ['ardmrn-gaming','ARDMRN Gaming','gaming'],
  ['ardmrn-insight','ARDMRN Insight','editorial'],
  ['ark-garage','ARK Garage','lifestyle'],
  ['bali-wedding-dj','Bali Wedding DJ','business'],
  ['balinightlife','BALINIGHTLIFE','nightlife'],
  ['berita-terkini','Berita Terkini','editorial'],
  ['distorsi-sejarah-punk','Distorsi Sejarah Punk','history'],
  ['dunia-bintang','Dunia Bintang','gaming'],
  ['hikayat-pohon-ganja','Hikayat Pohon Ganja','editorial'],
  ['jejak-nusantara','Jejak Nusantara','history'],
  ['konten-islami','Konten Islami','culture'],
  ['lentera-weton','Lentera Weton','culture'],
  ['motocamp-id','Motocamp ID','lifestyle'],
  ['mr-laziz','Mr Laziz','business'],
  ['nadya-gaming','Nadya Gaming','gaming'],
  ['planet-fauna','Planet Fauna','education'],
  ['putri-ayah','Putri Ayah','family'],
  ['ruang-dj','Ruang DJ','entertainment'],
  ['semesta-berbisik','Semesta Berbisik','lifestyle'],
  ['serigala-senja','Serigala Senja','entertainment'],
  ['techverse','TechVerse','technology'],
  ['titik-tanya','Titik Tanya','editorial'],
  ['tukang-tambang','Tukang Tambang','technology'],
  ['warisan-bali','Warisan Bali','culture'],
  ['yolo','YOLO','lifestyle'],
  ['arda-comics','Arda Comics / AM STUDIO','entertainment'],
  ['nadmo-studio','NADMO Studio','business'],
  ['distorsi-rakyat','DISTORSI RAKYAT','editorial']
].map(([key,name,category]) => ({key,name,category,target:TIKTOK_ACCOUNT}));

const channelMap = new Map(CHANNELS.map(c=>[c.key,c]));
const transitions = {
  qc_pass: {from:['QC_PENDING','QC_BLOCKED'],to:'READY'},
  qc_block: {from:['QC_PENDING','READY','SCHEDULED','PAUSED'],to:'QC_BLOCKED'},
  pause: {from:['READY','SCHEDULED'],to:'PAUSED'},
  resume: {from:['PAUSED'],to:'READY'},
  cancel: {from:['UNASSIGNED','QC_PENDING','QC_BLOCKED','READY','SCHEDULED','PAUSED','SHARE_OPENED'],to:'CANCELLED'},
  share_opened: {from:['SCHEDULED'],to:'SHARE_OPENED'},
  self_report: {from:['SHARE_OPENED'],to:'SELF_REPORTED'},
  verify: {from:['SELF_REPORTED'],to:'PUBLISHED_VERIFIED'},
  not_posted: {from:['SHARE_OPENED','SELF_REPORTED'],to:'READY'},
  resolve_channel: {from:['UNASSIGNED'],to:'QC_PENDING'}
};

export function dateWita(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return {date:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute};
}

export function selectSchedule(jobs, slots=SLOTS_WITA, existing=[], maxDaily=10) {
  const used=new Set(existing.map(j=>j.scheduled_time));
  const counts=new Map(), categories=new Map();
  let last=existing.filter(j=>j.scheduled_time).sort((a,b)=>a.scheduled_time.localeCompare(b.scheduled_time)).at(-1)?.channel_key||null;
  for (const j of existing) {
    counts.set(j.channel_key,(counts.get(j.channel_key)||0)+1);
    categories.set(j.category,(categories.get(j.category)||0)+1);
  }
  const weight={OWNER_PINNED:3,URGENT:2,NORMAL:1};
  const pool=jobs.filter(j=>j.status==='READY').slice();
  const assigned=[];
  for(const time of slots) {
    if(used.has(time) || existing.length+assigned.length>=maxDaily)continue;
    const allowed=pool.filter(j=>(counts.get(j.channel_key)||0)<2);
    if(!allowed.length)break;
    allowed.sort((a,b)=>
      (weight[b.priority]||0)-(weight[a.priority]||0)
      || Number(a.channel_key===last)-Number(b.channel_key===last)
      || (categories.get(a.category)||0)-(categories.get(b.category)||0)
      || a.created_at.localeCompare(b.created_at)
    );
    const job=allowed[0];
    assigned.push({id:job.id,time,channel_key:job.channel_key});
    pool.splice(pool.indexOf(job),1);
    counts.set(job.channel_key,(counts.get(job.channel_key)||0)+1);
    categories.set(job.category,(categories.get(job.category)||0)+1);
    last=job.channel_key;
  }
  return assigned;
}

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const err=(code,message,status=400)=>json({ok:false,error:{code,message}},status);
const clean=(x,max)=>typeof x==='string'?x.trim().slice(0,max):'';
const validDate=x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x+'T00:00:00Z'))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const dateAfterDays=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const validMediaUrl = media => {
  try {
    const u = new URL(media);
    return u.protocol === 'https:' && !u.username && !u.password &&
      u.hostname !== 'localhost' && !u.hostname.endsWith('.local') &&
      !/^(127|10|192\.168)\./.test(u.hostname);
  } catch { return false; }
};

const isTikTokLink=value=>{
  try{const u=new URL(value);return u.protocol==='https:'&&
    ['tiktok.com','www.tiktok.com','m.tiktok.com','vm.tiktok.com','vt.tiktok.com'].includes(u.hostname)&&
    (u.pathname.startsWith('/@')||['vm.tiktok.com','vt.tiktok.com'].includes(u.hostname));}catch{return false;}
};
async function payloadHash(s) {
  const bytes=new TextEncoder().encode(JSON.stringify(s));
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}
async function event(db,jobId,type,oldStatus,newStatus,details={}) {
  await db.prepare('INSERT INTO social_events(event_id,job_id,event_type,actor,from_status,to_status,details,created_at) VALUES(?,?,?,?,?,?,?,?)')
  .bind(crypto.randomUUID(),jobId,type,'OWNER',oldStatus,newStatus,JSON.stringify(details),new Date().toISOString()).run();
}
const setting=async(db,key)=>await db.prepare('SELECT value FROM social_settings WHERE key=?').bind(key).first('value');

async function submit(db,data){
  if(!data || typeof data!=='object' || Array.isArray(data))return err('INVALID_BODY','Object required');
  const key=clean(data.client_submission_key,128);
  if(!/^[A-Za-z0-9:_-]{10,128}$/.test(key))return err('INVALID_IDEMPOTENCY_KEY','Provide stable unique client_submission_key');
  if(data.platform!=='tiktok')return err('INVALID_PLATFORM','TikTok only for shared queue');
  const channelKey=clean(data.channel_key,100);
  const c=channelMap.get(channelKey);
  const title=clean(data.title,160),caption=clean(data.caption,2200),media=clean(data.media_url,2000);
  if(!title||!caption)return err('INVALID_CONTENT','Title and caption required');
  if(media && !validMediaUrl(media))return err('INVALID_MEDIA','Valid HTTPS media URL required');
  const mediaType=data.media_type;
  if(!['image','video'].includes(mediaType))return err('INVALID_MEDIA_TYPE','Use image or video');
  const awaitingMedia = !media;
  const priority=['OWNER_PINNED','URGENT'].includes(data.priority)?data.priority:'NORMAL';
  const snapshot={channel_key:channelKey,title,caption,media,mediaType,priority};
  const hash=await payloadHash(snapshot);
  const old=await db.prepare('SELECT * FROM social_jobs WHERE submission_key=?').bind(key).first();
  if(old)return old.payload_hash===hash?json({ok:true,duplicate:true,job:old},200):err('IDEMPOTENCY_CONFLICT','Submission key belongs to another content revision',409);
  const id=crypto.randomUUID(),now=new Date().toISOString(),status=c?(awaitingMedia?'QC_BLOCKED':'QC_PENDING'):'UNASSIGNED';
  const notes=awaitingMedia?'WAITING_MEDIA_FROM_CHAT':'';
  try{
    await db.prepare('INSERT INTO social_jobs(id,submission_key,payload_hash,channel_key,channel_name,category,target_account,title,caption,media_url,media_type,priority,status,notes,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(id,key,hash,channelKey||'unassigned',c?.name||'UNASSIGNED',c?.category||'other',TIKTOK_ACCOUNT,title,caption,media,mediaType,priority,status,notes,now,now).run();
  }catch(e){
    const existing=await db.prepare('SELECT * FROM social_jobs WHERE submission_key=?').bind(key).first();
    if(existing)return existing.payload_hash===hash?json({ok:true,duplicate:true,job:existing}):err('IDEMPOTENCY_CONFLICT','Collision',409);
    throw e;
  }
  await event(db,id,'SUBMITTED',null,status,{source:clean(data.source,80)||'OWNER'});
  const job=await db.prepare('SELECT * FROM social_jobs WHERE id=?').bind(id).first();
  return json({ok:true,job},201);
}

async function action(db,id,data){
  const current=await db.prepare('SELECT * FROM social_jobs WHERE id=?').bind(id).first();
  if(!current)return err('NOT_FOUND','Job not found',404);
  if(!data||!Number.isInteger(data.expected_version)||data.expected_version!==current.version)
    return err('VERSION_CONFLICT','Refresh and retry; job has changed',409);
  const name=clean(data.action,50),tx=transitions[name];
  if((!tx || !tx.from.includes(current.status)) && !(name==='attach_media' && current.status==='QC_BLOCKED'))return err('INVALID_TRANSITION','Action not permitted in current status',409);
  let channel=current.channel_key,channelName=current.channel_name,category=current.category;
  let url=current.published_url,scheduledDate=current.scheduled_date,scheduledTime=current.scheduled_time,notes=current.notes,verifiedAt=current.verified_at;
  if(name==='resolve_channel'){
    const c=channelMap.get(clean(data.channel_key,100));
    if(!c)return err('UNKNOWN_CHANNEL','Register a known channel first');
    channel=c.key;channelName=c.name;category=c.category;
  }
  // Media arrives from the producing conversation; not an owner re-entry form.
  // The attachment always returns to QC, never directly to READY or SCHEDULED.
  if(name==='attach_media') {
    const candidate=clean(data.media_url,2000);
    if(!validMediaUrl(candidate))return err('INVALID_MEDIA','Valid HTTPS media URL required');
    const now=new Date().toISOString();
    const r=await db.prepare("UPDATE social_jobs SET media_url=?,status='QC_PENDING',notes='',version=version+1,updated_at=? WHERE id=? AND version=? AND status='QC_BLOCKED'")
      .bind(candidate,now,id,current.version).run();
    if(r.meta?.changes!==1)return err('VERSION_CONFLICT','Concurrent update detected',409);
    await event(db,id,'MEDIA_ATTACHED','QC_BLOCKED','QC_PENDING',{source:clean(data.source,80)||'chatgpt_channel'});
    return json({ok:true,job:await db.prepare('SELECT * FROM social_jobs WHERE id=?').bind(id).first()});
  }
  if(name==='self_report') {
    const proposed=clean(data.published_url,2000);
    if(!isTikTokLink(proposed))return err('INVALID_POST_URL','Use a public TikTok post URL');
    url=proposed;
  }
  if(name==='verify') {
    if(!isTikTokLink(url))return err('MISSING_PROOF','TikTok URL required');
    if(data.owner_verified!==true)return err('OWNER_VERIFICATION_REQUIRED','Manual verification of the TikTok post required');
    verifiedAt=new Date().toISOString();
  }
  if(name==='qc_pass') {
    if(!validMediaUrl(current.media_url))return err('MEDIA_REQUIRED','Attach a valid media file before QC approval');
    if(data.rights_confirmed!==true)return err('QC_REQUIRED','Confirm media rights and fact-check before approval');
  }
  if(['qc_block','pause','not_posted','cancel','resume'].includes(name)){scheduledDate=null;scheduledTime=null;}
  if(name==='not_posted'){url=null;verifiedAt=null;}
  if(typeof data.notes==='string')notes=clean(data.notes,600);
  const now=new Date().toISOString();
  const nextStatus=name==='resolve_channel'&&!validMediaUrl(current.media_url)?'QC_BLOCKED':tx.to;
  if(name==='resolve_channel'&&nextStatus==='QC_BLOCKED')notes='WAITING_MEDIA_FROM_CHAT';
  const changed=await db.prepare('UPDATE social_jobs SET status=?,channel_key=?,channel_name=?,category=?,published_url=?,scheduled_date=?,scheduled_time=?,notes=?,verified_at=?,version=version+1,updated_at=? WHERE id=? AND version=? AND status=?')
   .bind(nextStatus,channel,channelName,category,url,scheduledDate,scheduledTime,notes,verifiedAt,now,id,current.version,current.status).run();
  if(changed.meta?.changes!==1)return err('VERSION_CONFLICT','Concurrent update detected',409);
  await event(db,id,name,current.status,nextStatus,{notes,verification:name==='verify'});
  return json({ok:true,job:await db.prepare('SELECT * FROM social_jobs WHERE id=?').bind(id).first()});
}

async function schedule(db,requested){
  if(await setting(db,'paused')==='true')return err('PAUSED','All scheduling is paused',409);
  const today=dateWita(),date=requested||today.date;
  if(!validDate(date)||date<today.date||date>dateAfterDays(today.date,90))return err('INVALID_DATE','Choose today through 90 days ahead');
  const reserved=(await db.prepare("SELECT * FROM social_jobs WHERE scheduled_date=? AND status IN ('SCHEDULED','SHARE_OPENED','SELF_REPORTED','PUBLISHED_VERIFIED') ORDER BY scheduled_time").bind(date).all()).results;
  const allReady=(await db.prepare("SELECT id,channel_key,category,priority,created_at,status FROM social_jobs WHERE status='READY' ORDER BY created_at ASC LIMIT 500").bind().all()).results;
  const slots=date===today.date?SLOTS_WITA.filter(s=>s>today.time):SLOTS_WITA;
  const picks=selectSchedule(allReady,slots,reserved,10),accepted=[],failed=[];
  for (const p of picks) {
    try {
      const now=new Date().toISOString();
      const changed=await db.prepare("UPDATE social_jobs SET status='SCHEDULED',scheduled_date=?,scheduled_time=?,version=version+1,updated_at=? WHERE id=? AND status='READY' AND NOT EXISTS (SELECT 1 FROM social_jobs j WHERE j.target_account=? AND j.scheduled_date=? AND j.scheduled_time=? AND j.status NOT IN ('CANCELLED','QC_BLOCKED','MISSED'))")
       .bind(date,p.time,now,p.id,TIKTOK_ACCOUNT,date,p.time).run();
      if(changed.meta?.changes===1){accepted.push(p);await event(db,p.id,'SCHEDULED','READY','SCHEDULED',{date,time:p.time});}
      else failed.push(p.id);
    }catch{failed.push(p.id)}
  }
  return json({ok:true,date,scheduled:accepted,conflicts:failed,remainingReady:allReady.length-accepted.length});
}

export async function handleSocial(request,env,url,identityVerifier=accessOwnerVerified) {
  if(!env.NADMO_SOCIAL_OWNER_EMAIL)return err('NOT_CONFIGURED','Owner identity is not configured',503);
  if(!await identityVerifier(request,env))return err('UNAUTHORIZED','Valid Cloudflare Access owner login required',401);
  const db=env.SOCIAL_DB;
  if(!db)return err('DB_NOT_CONFIGURED','SOCIAL_DB binding is missing',503);
  const path=url.pathname,method=request.method;
  try {
    if(method==='GET'&&path==='/api/social/meta') {
      const paused=await setting(db,'paused'),handle=await setting(db,'tiktok_handle');
      return json({ok:true,account:TIKTOK_ACCOUNT,handle:handle||null,channelCount:CHANNELS.length,channels:CHANNELS,slots:SLOTS_WITA,timezone:'Asia/Makassar',targetDaily:10,paused:paused==='true',publishMode:'OWNER_ANDROID_SHARE',directApiEnabled:false});
    }
    if(method==='GET'&&path==='/api/social/jobs') {
      const date=url.searchParams.get('date');
      if(date && !validDate(date))return err('INVALID_DATE','Expected YYYY-MM-DD');
      const status=url.searchParams.get('status'),args=[],where=[];
      if(date){where.push('scheduled_date=?');args.push(date)}
      if(status){where.push('status=?');args.push(status)}
      const sql='SELECT * FROM social_jobs'+(where.length?' WHERE '+where.join(' AND '):'')+' ORDER BY CASE WHEN scheduled_date IS NULL THEN 1 ELSE 0 END, scheduled_date DESC, scheduled_time, created_at DESC LIMIT 500';
      const rows=(await db.prepare(sql).bind(...args).all()).results;
      return json({ok:true,jobs:rows,clock:dateWita()});
    }
    if(method==='POST'&&path==='/api/social/jobs')return submit(db,await request.json());
    if(method==='POST'&&path==='/api/social/schedule') {
      const body=await request.json();
      return schedule(db,clean(body.date,10)||null);
    }
    if(method==='POST'&&path==='/api/social/settings') {
      const body=await request.json();
      if(typeof body.paused!=='boolean')return err('INVALID_SETTINGS','Boolean paused required');
      await db.prepare("UPDATE social_settings SET value=? WHERE key='paused'").bind(String(body.paused)).run();
      return json({ok:true,paused:body.paused});
    }
    const m=path.match(/^\/api\/social\/jobs\/([0-9a-f-]{36})\/action$/);
    if(method==='POST'&&m)return action(db,m[1],await request.json());
    return err('NOT_FOUND','Unknown Social API route',404);
  }catch(e){
    if(e instanceof SyntaxError)return err('INVALID_JSON','Malformed request body');
    // Never leak database records or secrets in error response.
    return err('SERVER_ERROR','Publisher service error; inspect Worker logs',500);
  }
}
