/* NADMO LIVE v434 SociaBuzz support field — source-of-truth patch logic.
 * Inserted into live Worker as a guarded, targeted HTML transformation.
 * No changes to Saweria signature verification or QRIS storage.
 */
function nadmoSociaBuzzHtmlText434(html){
  const patches=[
    ['<label>QRIS HOST (OPSIONAL)</label>',
     '<label for="profileSocialBuzzUrl">LINK SOCIABUZZ TRIBE (OPSIONAL)</label><input class="field" id="profileSocialBuzzUrl" type="url" inputmode="url" maxlength="500" autocomplete="url" placeholder="https://sociabuzz.com/username/tribe"><p class="profile-note" style="font-size:11px;margin:4px 0 12px">Simpan halaman TRIBE milikmu. Tidak mengurangi kuota 12 link profil.</p><label>QRIS HOST (OPSIONAL)</label>'],
    ["if($('profileSupportUrl')&&document.activeElement!==$('profileSupportUrl'))$('profileSupportUrl').value=info.link||'';",
     "if($('profileSupportUrl')&&document.activeElement!==$('profileSupportUrl'))$('profileSupportUrl').value=info.link||'';\n   if($('profileSocialBuzzUrl')&&document.activeElement!==$('profileSocialBuzzUrl'))$('profileSocialBuzzUrl').value=info.sociabuzz||'';"],
    ["   // Support URL is stored in the dedicated subscription backend, not mixed into public profile links.",
     "   const socialRaw=$('profileSocialBuzzUrl').value.trim();let sociabuzzUrl='';\n   if(socialRaw){\n    let candidate=socialRaw;if(!/^https?:\\/\\//i.test(candidate))candidate='https://'+candidate.replace(/^\\/\\//,'');\n    try{const u=new URL(candidate);if(u.protocol!=='https:'||!['sociabuzz.com','www.sociabuzz.com'].includes(u.hostname.toLowerCase())||u.username||u.password||u.pathname.split('/').filter(Boolean).length===0)throw Error('BAD_SOCIALBUZZ');sociabuzzUrl=u.href}\n    catch{$('profileEditStatus').textContent='Link SociaBuzz harus berupa URL halaman TRIBE milik host (https://sociabuzz.com/username/tribe).';return}\n   }\n   // Support URL is stored in the dedicated subscription backend, not mixed into public profile links."],
    ["const supportSaved=await accountRequest('/api/subscription/support-methods','POST',{supportUrl,qrisUrl:hostSupportDraft.qris||''});",
     "const supportSaved=await accountRequest('/api/subscription/support-methods','POST',{supportUrl,qrisUrl:hostSupportDraft.qris||'',sociabuzzUrl});"],
    ["const support=info||{link:'',qris:''},link=$('tipSupportLink'),box=$('tipQrisBox'),image=$('tipQrisImage'),open=$('tipQrisOpen'),empty=$('tipSupportEmpty');",
     "const support=info||{link:'',qris:'',sociabuzz:''},link=$('tipSupportLink'),social=$('tipSociaBuzzLink'),box=$('tipQrisBox'),image=$('tipQrisImage'),open=$('tipQrisOpen'),empty=$('tipSupportEmpty');"],
    ["link.hidden=!support.link;if(support.link)link.href=support.link;else link.removeAttribute('href');",
     "link.hidden=!support.link;if(support.link)link.href=support.link;else link.removeAttribute('href');\n   social.hidden=!support.sociabuzz;if(support.sociabuzz)social.href=support.sociabuzz;else social.removeAttribute('href');"],
    ["empty.hidden=!!(support.link||support.qris);if(!empty.hidden)empty.textContent='Kreator ini belum memasang Saweria atau QRIS.';",
     "empty.hidden=!!(support.link||support.sociabuzz||support.qris);if(!empty.hidden)empty.textContent='Kreator ini belum memasang Saweria, SociaBuzz atau QRIS.';"],
    ['<div id="tipQrisBox" hidden="">',
     '<a id="tipSociaBuzzLink" class="btn support-open" rel="noopener noreferrer nofollow ugc" target="_blank" hidden="">BUKA SOCIABUZZ TRIBE ↗</a><div id="tipQrisBox" hidden="">']
  ];
  for(const [from,to] of patches){
    const i=html.indexOf(from);
    if(i<0||html.indexOf(from,i+from.length)>=0)throw Error('SOCIALBUZZ_HTML_ANCHOR_MISMATCH '+from.slice(0,65));
    html=html.slice(0,i)+to+html.slice(i+from.length);
  }
  html=html.replaceAll('Dukungan melalui Saweria atau QRIS dikirim langsung ke metode pembayaran milik kreator.',
    'Dukungan melalui Saweria, SociaBuzz atau QRIS dikirim langsung kepada kreator.');
  html=html.replaceAll('Saweria dan QRIS dibayar langsung ke host. NADMO LIVE tidak menahan saldo dukungan.',
    'Saweria, SociaBuzz dan QRIS dibayar langsung ke host. NADMO LIVE tidak menahan saldo dukungan.');
  const style=String.raw`<style id="nadmo-sociabuzz-v434-css">
#profileSocialBuzzUrl{width:100%;min-height:50px;margin:7px 0 4px;border:1px solid #8b65a8!important;box-shadow:inset 0 0 0 1px #53e9ff14;background:#090d17!important;color:#f4f7ff!important}
#viewerTipPanel #tipSociaBuzzLink[hidden]{display:none!important}
#viewerTipPanel.nadmo-support-portal422.sheet-open{grid-template-areas:"heading qr" "recipients qr" "description qr" "link qr" "copy qr" "socialbuzz qr" "message qr" "disclaimer qr"!important}
#viewerTipPanel.nadmo-support-portal422 #tipSociaBuzzLink{grid-area:socialbuzz!important;display:flex!important;align-items:center!important;justify-content:center!important;max-width:100%!important;min-height:46px!important;padding:11px 12px!important;margin:3px 0!important;border-radius:9px!important;border:1px solid #e952c1!important;background:linear-gradient(110deg,#ee45b7,#b137c2)!important;color:#fff!important;text-decoration:none!important;font:800 12px Arial,sans-serif!important;pointer-events:auto!important;touch-action:manipulation!important;position:relative!important;z-index:5!important}
#viewerTipPanel.nadmo-support-portal422 #tipSociaBuzzLink:focus-visible{outline:3px solid #43efff!important;outline-offset:2px!important}
@media(max-width:700px){body #viewerTipPanel.nadmo-support-portal422.sheet-open{display:flex!important;flex-direction:column!important}#viewerTipPanel.nadmo-support-portal422 #tipSociaBuzzLink{width:100%!important;flex:none!important}}
</style>`;
  const clientScript=String.raw`<script id="nadmo-sociabuzz-v434-js">(()=>{function bind(){const link=document.getElementById('tipSociaBuzzLink');if(!link||link.dataset.sociaBound434)return;link.dataset.sociaBound434='1';const androidWebview=/\bwv\b|; wv\)/i.test(navigator.userAgent);link.target=androidWebview?'_self':'_blank';link.rel='noopener noreferrer nofollow ugc';link.addEventListener('click',e=>e.stopPropagation(),true)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind()})();</script>`;
  if(!html.includes('</head>')||!html.includes('</body>'))throw Error('BAD_HTML_DOCUMENT');
  return html.replace('</head>',style+'</head>').replace('</body>',clientScript+'</body>');
}
async function nadmoSociaBuzzResponse434(response){
 if(!response.ok||!response.body)return response;
 const headers=new Headers(response.headers);headers.delete('content-length');
 const html=await response.text();
 try{
  const updated=nadmoSociaBuzzHtmlText434(html);
  return new Response(updated,{status:response.status,headers});
 }catch(e){
  console.warn('NADMO SociaBuzz form patch skipped',e?.message);
  return new Response(html,{status:response.status,headers});
 }
}
