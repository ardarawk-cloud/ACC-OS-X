/* NADMO LIVE v438 — legible cyber profile cards and authentic logos.
 * Runs after the established v437 favicon handler. It NEVER changes href,
 * account data, third-party payment links, or copies an unrelated site logo.
 */
(()=>{
  'use strict';
  const version='438';
  const lists=['profileBusinessLinks','publicCreatorLinks'];
  const monograms={
    'ardamoron.nadmo.id':'AR',
    'amsound.nadmo.id':'AM',
    'kerthawisesa.nadmo.id':'KW',
    'originalbali.nadmo.id':'OB',
    'roamink.nadmo.id':'RM'
  };
  const logoCandidates=new Map();
  function isNadmoSite(host){return host==='nadmo.id'||host.endsWith('.nadmo.id')}
  function safeHost(h){return /^[a-z0-9][a-z0-9.-]{2,251}[a-z0-9]$/i.test(h)}
  function names(container){
    for(const card of container.querySelectorAll(':scope > a.profile-business-link')){
      const name=card.querySelector('.cp-link-name');
      if(name&&!name.title)name.title=name.textContent.trim();
      const subtitle=card.querySelector('.cp-link-target');
      if(subtitle&&!subtitle.title)subtitle.title=subtitle.textContent.trim();
    }
  }
  function discover(host,done){
    if(logoCandidates.has(host)){done(logoCandidates.get(host));return}
    // Only probe same-brand NADMO sites: avoid leaking visits to arbitrary sites.
    if(!isNadmoSite(host)||!safeHost(host)){done('');return}
    // Only a few common official icon paths; never use unrelated stock images.
    const base='https://'+host;
    const paths=['/logo.png','/icon.svg','/images/logo.png','/favicon.png','/apple-touch-icon.png'];
    let cursor=0;
    function next(){
      if(cursor>=paths.length){logoCandidates.set(host,'');done('');return}
      const src=base+paths[cursor++],test=new Image();
      test.onload=()=>{
        if(test.naturalWidth<16||test.naturalHeight<16){next();return}
        logoCandidates.set(host,src);done(src);
      };
      test.onerror=next;
      test.decoding='async';test.src=src;
    }
    next();
  }
  function badge(card){
    if(!card?.matches?.('a.profile-business-link'))return;
    const icon=card.querySelector('.cp-link-icon');
    if(!icon)return;
    let url;try{url=new URL(card.href)}catch{return}
    if(!['https:','http:'].includes(url.protocol))return;
    const host=url.hostname.toLowerCase();
    if(icon.dataset.cpLogoRefine===version)return;
    icon.dataset.cpLogoRefine=version;
    const fallback=icon.querySelector('.cp-logo-fallback');
    if(fallback&&monograms[host]){
      fallback.textContent=monograms[host]; // Explicitly a fallback monogram, not an official logo.
    }
    if(icon.dataset.cpLogoStatus==='loaded'){
      return; // Preserve a valid, verified site icon, including Roamink's icon.
    }
    const original=card.href;
    discover(host,src=>{
      if(!src||!card.isConnected||card.href!==original)return;
      const target=card.querySelector('.cp-link-icon');
      if(!target||target.dataset.cpLogoStatus==='loaded')return;
      const img=target.querySelector('img.cp-link-favicon')||document.createElement('img');
      img.className='cp-link-favicon';
      img.alt='';img.setAttribute('aria-hidden','true');
      img.loading='eager';img.decoding='async';
      img.onload=()=>{
        if(card.href!==original||img.naturalWidth<16||img.naturalHeight<16)return;
        img.hidden=false;
        const label=target.querySelector('.cp-logo-fallback');
        if(label)label.hidden=true;
        target.dataset.cpLogoStatus='loaded';
        target.dataset.cpLogoSource='verified-direct';
      };
      img.onerror=()=>{
        img.hidden=true;
        const label=target.querySelector('.cp-logo-fallback');
        if(label)label.hidden=false;
        target.dataset.cpLogoStatus='fallback';
      };
      if(!img.isConnected)target.append(img);
      img.src=src;
    });
  }
  function scan(node){
    if(!node?.isConnected)return;
    names(node);
    for(const card of node.querySelectorAll(':scope > a.profile-business-link')){
      badge(card);
    }
  }
  function start(){
    for(const id of lists){
      const container=document.getElementById(id);
      if(!container||container.dataset.cpRefineWatch438)continue;
      container.dataset.cpRefineWatch438='1';
      const run=()=>scan(container);
      const observer=new MutationObserver(run);
      observer.observe(container,{childList:true,subtree:true});
      scan(container);
    }
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else start();
})();