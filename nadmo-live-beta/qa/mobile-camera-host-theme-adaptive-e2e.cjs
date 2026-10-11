'use strict';
// Verifies the two source aspect ratios seen on Android and host theme isolation.
const assert=require('node:assert/strict');
const path=require('node:path');
const puppeteer=require('puppeteer-core');
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await page.goto('file://'+path.resolve(__dirname,'../public/app/index.html'),{waitUntil:'domcontentloaded'});
  const outcome=await page.evaluate(()=>{
   const watch=document.querySelector('#watch'),v=document.querySelector('#remote');
   watch.classList.remove('hide');document.body.classList.add('live-immersive','watch-viewer');
   document.body.classList.remove('watch-game','watch-clean');
   watch.dataset.hostTheme='electric';
   const electric=getComputedStyle(watch).getPropertyValue('--neon').trim();
   const hudElectric=getComputedStyle(document.querySelector('#mobileLiveHud')).color;
   Object.defineProperty(v,'videoWidth',{configurable:true,get:()=>1280});
   Object.defineProperty(v,'videoHeight',{configurable:true,get:()=>720});
   v.dispatchEvent(new Event('loadedmetadata'));
   const landscape={classSet:watch.classList.contains('camera-source-landscape'),
    aspect:watch.dataset.cameraSourceAspect,fit:getComputedStyle(v).objectFit};
   Object.defineProperty(v,'videoWidth',{configurable:true,get:()=>720});
   Object.defineProperty(v,'videoHeight',{configurable:true,get:()=>1280});
   v.dispatchEvent(new Event('resize'));
   const portrait={classSet:watch.classList.contains('camera-source-landscape'),
    aspect:watch.dataset.cameraSourceAspect,fit:getComputedStyle(v).objectFit};
   watch.dataset.hostTheme='noir';
   const noir=getComputedStyle(watch).getPropertyValue('--neon').trim();
   const hudNoir=getComputedStyle(document.querySelector('#mobileLiveHud')).color;
   return {electric,hudElectric,noir,hudNoir,landscape,portrait};
  });
  assert.equal(outcome.electric,'#6df4ff','viewer must inherit host Electric, not default green');
  assert.equal(outcome.noir,'#ead0b9','viewer must inherit host Noir, not viewer skin');
  assert.equal(outcome.hudElectric,'rgb(109, 244, 255)');
  assert.equal(outcome.hudNoir,'rgb(234, 208, 185)');
  assert.deepEqual(outcome.landscape,{classSet:true,aspect:'1280:720',fit:'contain'},
    'LANDSCAPE capture on portrait phone must not crop faces');
  assert.deepEqual(outcome.portrait,{classSet:false,aspect:'720:1280',fit:'contain'},
    'portrait frame must not lose the face or shoulders to a cover crop');

  // Owner vs viewer on the same 390px phone: only audience gets cyberdeck.
  // All safety/guest/mic buttons must be inside the settings sheet, not
  // floating on top of the broadcaster's camera or join notifications.
  const hostUi=await page.evaluate(()=>{
   const watch=document.querySelector('#watch'),safety=watch.querySelector('.room-safety');
   const getRect=id=>{const r=document.getElementById(id).getBoundingClientRect();
    return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};
   document.body.classList.remove('watch-viewer','watch-game','watch-clean');
   document.body.classList.add('watch-host');
   for(const id of ['hostModeration','hostGuestRequests','hostMicToggle'])
    document.getElementById(id).hidden=false;
   const before={hud:getComputedStyle(document.getElementById('mobileLiveHud')).display,
    frame:getComputedStyle(watch,'::before').display,
    leave:getComputedStyle(document.getElementById('leave')).display,
    leaveRect:getRect('leave'),
    leaveHit:(()=>{const r=document.getElementById('leave').getBoundingClientRect();
     return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.id})(),
    floatingSafety:safety.parentElement.classList.contains('live-chat'),
    safetyParent:safety.parentElement.id,
    sheetHidden:getComputedStyle(document.getElementById('liveSettingsPanel')).display==='none'};
   document.getElementById('moreQuick').click();
   const panel=getRect('liveSettingsPanel');
   const controls=['hostModeration','hostGuestRequests','hostMicToggle'].map(id=>{
    const el=document.getElementById(id);
    el.scrollIntoView({block:'nearest'}); // controls may live below the fold inside the scrollable sheet
    const rect=getRect(id);return {id,...rect,visible:getComputedStyle(el).display!=='none'};
   });
   return {before,panel,controls,opened:document.getElementById('liveSettingsPanel').classList.contains('sheet-open'),
    composerParent:document.getElementById('message').parentElement.id,
    sendParent:document.getElementById('send').parentElement.id};
  });
  assert.equal(hostUi.before.hud,'none','broadcaster must not see viewer cyberdeck HUD');
  assert.equal(hostUi.before.frame,'none','broadcaster preview must not have viewer neon frame');
  assert.notEqual(hostUi.before.leave,'none','host must keep a visible X to end LIVE');
  assert.ok(hostUi.before.leaveRect.w>=44&&hostUi.before.leaveRect.h>=44,
    'X must have a mobile-size touch target');
  assert.equal(hostUi.before.leaveHit,'leave','nothing may cover the broadcaster close button');
  assert.equal(hostUi.before.floatingSafety,false,'room tools must not overlap camera');
  assert.equal(hostUi.before.safetyParent,'liveSettingsPanel','room tools belong in settings');
  assert.equal(hostUi.before.sheetHidden,true,'room actions must stay hidden until ⚙ opens');
  assert.equal(hostUi.opened,true,'broadcaster gear must open settings');
  assert.equal(hostUi.composerParent,'','host chat input should use original visible composer row');
  assert.equal(hostUi.sendParent,'','host SEND should be beside its input, not in settings');
  assert.equal(await page.$eval('#message',el=>el.closest('.live-chat .row')!==null),true,
    'host chat must remain visible on camera screen while settings exists');
  for(const c of hostUi.controls){
   assert.equal(c.visible,true,c.id+' must remain actionable inside settings');
   assert.ok(c.w>30&&c.h>=38&&c.x>=hostUi.panel.x&&c.right<=hostUi.panel.right+1
    &&c.y>=hostUi.panel.y&&c.bottom<=hostUi.panel.bottom+1,
    c.id+' must not overflow the settings sheet');
  }
  const viewerUi=await page.evaluate(()=>{
   document.getElementById('closeSettingsSheet').click();
   document.body.classList.remove('watch-host');
   document.body.classList.add('watch-viewer');
   document.getElementById('moreQuick').click();
   document.getElementById('closeSettingsSheet').click();
   return {composerParent:document.getElementById('message').parentElement.className,
    sendParent:document.getElementById('send').parentElement.className,
    hud:getComputedStyle(document.getElementById('mobileLiveHud')).display,
    frame:getComputedStyle(document.getElementById('watch'),'::before').display,
    giftOutside:!document.getElementById('giftQuick').closest('#liveSettingsPanel'),
    viewerLeave:getComputedStyle(document.getElementById('leave')).display};
  });
  assert.equal(viewerUi.hud,'block','viewer must keep original cyberdeck');
  assert.equal(viewerUi.frame,'block','viewer must keep neon frame');
  assert.equal(viewerUi.giftOutside,true,'Rp sawer must stay outside settings');
  assert.equal(viewerUi.composerParent,'row','viewer chat input must remain on video');
  assert.equal(viewerUi.sendParent,'row','viewer SEND must remain on video');
  assert.notEqual(viewerUi.viewerLeave,'none','viewer exit must remain reachable');
  console.log('MOBILE_HOST_SETTINGS_AND_VIEWER_HUD_PASS '+JSON.stringify({hostUi,viewerUi}));
  console.log('MOBILE_CAMERA_ASPECT_AND_HOST_THEME_PASS '+JSON.stringify(outcome));
 }finally{await browser.close()}
})().catch(e=>{console.error('MOBILE_CAMERA_ASPECT_AND_HOST_THEME_FAIL',e.stack||e);process.exitCode=1});
