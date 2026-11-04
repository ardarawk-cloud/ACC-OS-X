/* NADMO LIVE v432 — Cyber profile link cards. No invented URLs or profile values. */
(()=>{
 'use strict';
 const specs=[
  {id:'youtube',domains:['youtube.com','youtu.be'],labels:/\byoutube\b|\byoutu\b/i,title:'YOUTUBE',symbol:'▶'},
  {id:'instagram',domains:['instagram.com'],labels:/instagram|\binsta\b/i,title:'INSTAGRAM',symbol:'◎'},
  {id:'tiktok',domains:['tiktok.com'],labels:/tiktok/i,title:'TIKTOK',symbol:'♪'},
  {id:'facebook',domains:['facebook.com','fb.com','fb.me'],labels:/facebook|\bfb\b/i,title:'FACEBOOK',symbol:'f'},
  {id:'whatsapp',domains:['wa.me','whatsapp.com'],labels:/whatsapp|\bwa\b/i,title:'WHATSAPP',symbol:'✆'},
  {id:'x',domains:['x.com','twitter.com'],labels:/(^|\W)(twitter|x\.com)(\W|$)/i,title:'X',symbol:'𝕏'},
  {id:'twitch',domains:['twitch.tv'],labels:/twitch/i,title:'TWITCH',symbol:'▣'},
  {id:'discord',domains:['discord.com','discord.gg'],labels:/discord/i,title:'DISCORD',symbol:'◈'},
  {id:'saweria',domains:['saweria.co'],labels:/saweria/i,title:'SAWERIA',symbol:'♥'},
  {id:'sociabuzz',domains:['sociabuzz.com'],labels:/sociabuzz/i,title:'SOCIABUZZ',symbol:'✦'}
 ];
 function hostIs(host,domain){return host===domain||host.endsWith('.'+domain)}
 function analyze(link,label){
  let parsed;try{parsed=new URL(link.href)}catch{return null}
  if(!['http:','https:'].includes(parsed.protocol))return null;
  const host=parsed.hostname.toLowerCase();
  const provider=specs.find(s=>s.domains.some(d=>hostIs(host,d))||s.labels.test(label))||null;
  let firstSegment=parsed.pathname.split('/').filter(Boolean).at(0)||'';
  try{firstSegment=decodeURIComponent(firstSegment)}catch{/* Keep URL path without decoding */}
  firstSegment=firstSegment.replace(/^@/,'').slice(0,48);
  const subtitle=provider&&firstSegment&&provider.id!=='whatsapp'?'@'+firstSegment:
   (host.replace(/^www\./,'')+(parsed.pathname==='/'?'':parsed.pathname.replace(/\/$/,'').slice(0,33)));
  return {provider,subtitle};
 }
 function renderLinks(list,isPublic){
  if(!list)return;
  let total=0,socials=0;
  for(const a of list.querySelectorAll(':scope > a.profile-business-link')){
   total++;
   if(a.dataset.cpDecorated==='432'){
    if(a.dataset.cpProvider!=='website')socials++;
    continue;
   }
   const label=a.textContent.replace(/\s*↗\s*$/,'').trim();
   const meta=analyze(a,label);if(!meta)continue;
   if(meta.provider)socials++;
   const original=label||meta.provider?.title||meta.subtitle;
   const type=meta.provider?.id||'website';
   a.dataset.cpProvider=type;a.dataset.cpDecorated='432';
   a.setAttribute('aria-label','Buka '+original+' (tautan luar)');
   const badge=document.createElement('span');badge.className='cp-link-icon';
   badge.setAttribute('aria-hidden','true');badge.textContent=meta.provider?.symbol||'↗';
   const main=document.createElement('span');main.className='cp-link-main';
   const heading=document.createElement('span');heading.className='cp-link-name';
   heading.textContent=original;
   const target=document.createElement('span');target.className='cp-link-target';
   target.textContent=meta.subtitle;target.title=a.href;
   main.append(heading,target);a.replaceChildren(badge,main);
  }
  if(isPublic){
   let heading=document.querySelector('#publicProfilePage .cp-public-links-header');
   if(total>0&&!heading){
    heading=document.createElement('h3');heading.className='cp-public-links-header';
    list.parentNode.insertBefore(heading,list);
   }
   if(heading){heading.hidden=total===0;heading.textContent=socials>0?'SOSIAL MEDIA & LINK':'TERHUBUNG KE'}
  }else{
   const heading=document.querySelector('#settings .me-public-share .me-repost-header');
   if(heading)heading.textContent=socials>0?'SOSIAL MEDIA & LINK':'TERHUBUNG KE';
  }
 }
 function setup(){
  for(const [id,pub] of [['profileBusinessLinks',false],['publicCreatorLinks',true]]){
   const el=document.getElementById(id);if(!el||el.dataset.cpWatch==='432')continue;
   el.dataset.cpWatch='432';
   const update=()=>renderLinks(el,pub);
   const observer=new MutationObserver(update);
   observer.observe(el,{childList:true});
   update();
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
 else setup();
})();