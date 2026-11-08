import {PLAYER_HTML} from './player.mjs';
// NADMO LIVE Broadcast Route Guard v0.1 — staging only.
// Never proxy media bytes or provision paid providers. Public routes expose only approved HLS URLs.
const H={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-robots-tag':'noindex,nofollow'};
const J=(x,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
const ERR=(s,x)=>J({ok:false,error:x,staging:true},s);
function tokenEqual(a,b){if(!b||!a||a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0}
const authorized=(req,key)=>!!key&&tokenEqual(req.headers.get('authorization')||'','Bearer '+key);
const ALLOW=env=>String(env.ALLOWED_ORIGIN_HOSTS||'').toLowerCase().split(',').map(x=>x.trim()).filter(Boolean);
export function validateSources(sources,hosts){
 if(!Array.isArray(sources)||sources.length!==2||!hosts?.length)return null;
 const out=[],roles=new Set();
 for(const s of sources){
  if(!s||!['primary','backup'].includes(s.role)||roles.has(s.role)||typeof s.url!=='string'||s.url.length>500)return null;
  let url;try{url=new URL(s.url)}catch{return null}
  if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||!url.pathname.endsWith('.m3u8'))return null;
  if(!hosts.includes(url.hostname.toLowerCase())||url.hostname==='localhost'||url.hostname.endsWith('.local'))return null;
  roles.add(s.role);out.push({role:s.role,url:url.href,health:'unknown',success:0,failure:0,checked:0});
 }
 return out.sort((a,b)=>a.role==='primary'?-1:1);
}
export const healthy=(s,t)=>!!s&&s.health==='up'&&s.success>=2&&t-s.checked<45000;
export function choice(s,t){
 const a=s.sources?.find(x=>x.role==='primary'),b=s.sources?.find(x=>x.role==='backup'),p=healthy(a,t),q=healthy(b,t),prior=s.selected||null;
 if(!p&&!q)return {selected:prior,mode:prior?'DEGRADED_HOLD':'WAITING',ready:false,changed:false};
 if(prior==='primary'&&p)return {selected:prior,mode:'PRIMARY',ready:true,changed:false};
 if(prior==='backup'&&q&&(!p||t-(s.changedAt||0)<60000))return {selected:prior,mode:'BACKUP',ready:true,changed:false};
 const selected=p?'primary':'backup';return {selected,mode:selected.toUpperCase(),ready:true,changed:selected!==prior};
}
export function update(s,role,ok,t){
 const entry=s.sources.find(x=>x.role===role);if(!entry)return false;
 entry.health=ok?'up':'down';entry.checked=t;entry.success=ok?Math.min(3,entry.success+1):0;entry.failure=ok?0:Math.min(3,entry.failure+1);
 const pick=choice(s,t);if(pick.changed){s.selected=pick.selected;s.changedAt=t;s.audit=[...(s.audit||[]),{at:t,to:pick.selected,event:'failover'}].slice(-60)}
 return true;
}
const EMPTY=()=>({sources:[],selected:null,changedAt:0,audit:[]});
export function snapshot(s,t){
 const d=choice(s,t),sources=s.sources.map(x=>({role:x.role,url:x.url,healthy:healthy(x,t),status:t-x.checked>=45000?'stale':x.health}));
 return {ok:true,staging:true,mode:d.mode,roomReady:d.ready,selected:d.selected,url:d.ready?sources.find(x=>x.role===d.selected&&x.healthy)?.url||null:null,sources,videoDeliveredByWorker:false,paidScaling:false};
}
export class BroadcastHub{
 constructor(ctx,env){this.ctx=ctx;this.env=env}
 async state(){return (await this.ctx.storage.get('state'))||EMPTY()}
 async fetch(req){
  const path=new URL(req.url).pathname,now=Date.now(),s=await this.state();
  if(path==='/state')return J(snapshot(s,now));
  if(path==='/audit')return J({ok:true,events:s.audit||[]});
  if(path==='/configure'&&req.method==='POST'){
   let body;try{let raw=await req.text();if(raw.length>2500)return ERR(413,'OVERSIZE');body=JSON.parse(raw)}catch{return ERR(400,'BAD_JSON')}
   const newSources=validateSources(body?.sources,ALLOW(this.env));if(!newSources)return ERR(400,'INVALID_SOURCE_OR_ALLOWLIST');
   s.sources=newSources;s.selected=null;s.changedAt=0;s.audit=[...(s.audit||[]),{at:now,event:'configured'}].slice(-60);
   await this.ctx.storage.put('state',s);await this.ctx.storage.setAlarm(now+2000);
   return J({ok:true,staging:true,sourceCount:2,autoHealthProbe:true,productionWrites:0});
  }
  if(path==='/probe'&&req.method==='POST'){
   let body;try{body=await req.json()}catch{return ERR(400,'BAD_JSON')}
   if(!['primary','backup'].includes(body?.role)||typeof body.healthy!=='boolean')return ERR(400,'INVALID_PROBE');
   if(!update(s,body.role,body.healthy,now))return ERR(404,'ORIGIN_MISSING');
   await this.ctx.storage.put('state',s);return J(snapshot(s,now));
  }
  return ERR(404,'NOT_FOUND');
 }
 async alarm(){
  const s=await this.state();if(!s.sources.length)return;
  for(const origin of s.sources){
   let ok=false;
   try{const r=await fetch(origin.url,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(4500),headers:{'cache-control':'no-cache'}});ok=r.status===200||r.status===206}catch{}
   update(s,origin.role,ok,Date.now());
  }
  await this.ctx.storage.put('state',s);await this.ctx.storage.setAlarm(Date.now()+20000);
 }
}
export default {
 async fetch(req,env){
  if(/^\/watch\/[a-z0-9_-]{3,48}$/.test(new URL(req.url).pathname)&&req.method==='GET')return new Response(PLAYER_HTML,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex,nofollow','x-frame-options':'DENY','content-security-policy':"default-src 'none';script-src 'unsafe-inline' https://cdn.jsdelivr.net;style-src 'unsafe-inline';connect-src 'self' https:;media-src https: blob:;base-uri 'none';form-action 'none'"}});
  const u=new URL(req.url),p=u.pathname;
  if(p==='/health')return J({ok:true,service:'nadmo-live-broadcast-stage',stage:true,controllerReady:true,streamConfigured:!!env.ALLOWED_ORIGIN_HOSTS,mediaStreamingActive:false,productionTouched:false});
  if(p==='/')return J({service:'NADMO LIVE Broadcast',stage:true,notice:'Control plane ready. No configured video sources. GET /api/route/demo for current state.'});
  const variants=[['/api/route/','/state','GET',null],['/admin/configure/','/configure','POST','ADMIN_TOKEN'],['/admin/audit/','/audit','GET','ADMIN_TOKEN'],['/probe/','/probe','POST','PROBE_TOKEN']];
  let route=null;for(const [prefix,target,method,secret] of variants)if(p.startsWith(prefix)&&/^[a-z0-9_-]{3,48}$/.test(p.slice(prefix.length))){route={room:p.slice(prefix.length),target,method,secret};break}
  if(!route)return ERR(404,'NOT_FOUND');
  if(req.method!==route.method)return ERR(405,'METHOD');
  if(route.secret&&!authorized(req,env[route.secret]))return ERR(401,'ADMIN_ONLY');
  if(!env.BROADCAST_HUB)return ERR(503,'STORAGE_UNAVAILABLE');
  const hub=env.BROADCAST_HUB.get(env.BROADCAST_HUB.idFromName('broadcast-stage-'+route.room));
  const init={method:req.method,headers:req.headers};
  if(req.method==='POST'){init.body=req.body;init.duplex='half'}
  try{return await hub.fetch(new Request(u.origin+route.target,init))}catch{return ERR(503,'CONTROL_UNAVAILABLE')}
 }
};