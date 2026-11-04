/* NADMO LIVE v436 — Real site logos on ME/public creator link cards.
 * Reads only the domain from an existing saved link. No links are changed,
 * no profile data is sent to the logo service, and no site is treated as verified.
 */
(()=>{
 'use strict';
 const version='436';
 const socialProviders=new Set(['facebook','instagram','tiktok','youtube','whatsapp','x','twitch','discord','saweria','sociabuzz']);
 const approvedHosts=host=>typeof host==='string'&&host.includes('.')&&
   /^[a-z0-9.-]{4,253}$/i.test(host)&&!host.endsWith('.local')&&!/^[0-9.]+$/.test(host);
 const domainHost=host=>host==='nadmo.id'||host.endsWith('.nadmo.id');
 function candidates(host,provider){
  const direct='https://'+host;
  const google='https://www.google.com/s2/favicons?domain='+encodeURIComponent(host)+'&sz=64';
  if(socialProviders.has(provider))return [google,direct+'/favicon.ico',direct+'/favicon.svg'];
  if(domainHost(host))return [direct+'/logo.svg',direct+'/favicon.svg',direct+'/favicon.ico',google];
  return [direct+'/favicon.ico',direct+'/favicon.svg',direct+'/apple-touch-icon.png',google];
 }
 function mono(host){
  const part=(host.endsWith('.nadmo.id')?host.slice(0,-'.nadmo.id'.length):host.split('.')[0])
   .replace(/[^a-z0-9]/gi,'').toUpperCase();
  return (part.slice(0,2)||'WEB');
 }
 function decorate(anchor){
  if(!anchor?.matches?.('a.profile-business-link'))return;
  const badge=anchor.querySelector('.cp-link-icon');
  if(!badge||badge.dataset.cpLogoVersion===version)return;
  let url;try{url=new URL(anchor.href)}catch{return}
  if(!['http:','https:'].includes(url.protocol)||!approvedHosts(url.hostname))return;
  const host=url.hostname.toLowerCase();
  const provider=anchor.dataset.cpProvider||'website';
  badge.dataset.cpLogoVersion=version;
  badge.dataset.cpLogoHost=host;
  const fallback=document.createElement('span');
  fallback.className='cp-logo-fallback';
  fallback.setAttribute('aria-hidden','true');
  fallback.textContent=provider==='website'?mono(host):badge.textContent.trim()||mono(host);
  const img=document.createElement('img');
  img.className='cp-link-favicon';
  img.alt='';img.setAttribute('aria-hidden','true');
  img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
  img.hidden=true;
  const sources=candidates(host,provider);
  let idx=0,finished=false;
  function next(){
   if(finished||!badge.isConnected)return;
   if(idx>=sources.length){
    finished=true;img.hidden=true;fallback.hidden=false;
    badge.dataset.cpLogoStatus='fallback';return;
   }
   img.src=sources[idx++];
  }
  img.onload=()=>{
   // Google's 16px default globe for an unknown NADMO site is not a real logo.
   if(domainHost(host)&&img.src.includes('/s2/favicons')&&img.naturalWidth<=16){next();return}
   if(img.naturalWidth<8||img.naturalHeight<8){next();return}
   finished=true;img.hidden=false;fallback.hidden=true;
   badge.dataset.cpLogoStatus='loaded';
  };
  img.onerror=next;
  badge.replaceChildren(fallback,img);
  next();
 }
 function scan(list){
  if(!list?.isConnected)return;
  for(const a of list.querySelectorAll('a.profile-business-link'))decorate(a);
 }
 function init(){
  for(const id of ['profileBusinessLinks','publicCreatorLinks']){
   const list=document.getElementById(id);
   if(!list||list.dataset.cpFaviconWatch===version)continue;
   list.dataset.cpFaviconWatch=version;
   const observer=new MutationObserver(()=>scan(list));
   // The original profile renderer may replace both links and their inner nodes.
   observer.observe(list,{childList:true,subtree:true});
   scan(list);
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();