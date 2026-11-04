/* NADMO LIVE v436: Favicon cards. Preserve existing links. */
(()=>{
const domains=['instagram.com','facebook.com','tiktok.com','youtube.com','wa.me','whatsapp.com','x.com','sociabuzz.com'];
const cache=new Map();
function candidates(url){
 const host=url.hostname.toLowerCase(),origin=url.origin;
 const google='https://www.google.com/s2/favicons?domain='+encodeURIComponent(host)+'&sz=64';
 if(domains.some(d=>host===d||host.endsWith('.'+d)))return [google,origin+'/favicon.ico'];
 if(host==='nadmo.id'||host.endsWith('.nadmo.id'))return [origin+'/logo.svg',origin+'/favicon.svg',origin+'/favicon.ico',google];
 return [origin+'/favicon.ico',origin+'/favicon.svg',google];
}
function decorate(a){
 const badge=a.querySelector('.cp-link-icon');if(!badge)return;
 const href=a.href;if(a.dataset.icon436===href)return;a.dataset.icon436=href;
 let u;try{u=new URL(href)}catch{return}
 if(!['https:','http:'].includes(u.protocol))return;
 const host=u.hostname,options=candidates(u);
 const chosen=cache.get(host);
 const sources=chosen?[chosen]:options;
 let i=0;
 function load(){
  if(i>=sources.length)return;
  const src=sources[i++],img=document.createElement('img');
  img.alt='';img.className='cp-site-favicon';img.decoding='async';img.loading='lazy';
  img.onload=()=>{if(a.href!==href)return;cache.set(host,src);badge.classList.add('cp-has-site-icon')};
  img.onerror=()=>{img.remove();load()};
  badge.querySelectorAll('img.cp-site-favicon').forEach(n=>n.remove());
  badge.append(img);img.src=src;
 }
 load();
}
function init(){
 for(const id of ['profileBusinessLinks','publicCreatorLinks']){
  const list=document.getElementById(id);if(!list||list.dataset.iconWatch436)return;
  list.dataset.iconWatch436='1';
  const scan=()=>list.querySelectorAll(':scope > a.profile-business-link').forEach(decorate);
  new MutationObserver(scan).observe(list,{childList:true,subtree:true});scan();
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();