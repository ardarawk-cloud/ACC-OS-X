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
   const stage=watch.querySelector('.live-stage>.viewfinder').getBoundingClientRect();
   const chat=watch.querySelector('.live-chat').getBoundingClientRect();
   const landscape={classSet:watch.classList.contains('camera-source-landscape'),
    stageMode:watch.classList.contains('camera-frame-letterbox'),
    stageTop:stage.top,stageBottom:stage.bottom,chatTop:chat.top,
    hud:getComputedStyle(document.querySelector('#mobileLiveHud')).display,
    hudHeight:document.querySelector('#mobileLiveHud').getBoundingClientRect().height,
    hudOutline:getComputedStyle(document.querySelector('.mobile-live-hud-outline')).display,
    hudFooter:getComputedStyle(document.querySelector('.mobile-live-hud-footer')).display,
    footerBottom:document.querySelector('.mobile-live-hud-footer').getBoundingClientRect().bottom,
    aspect:watch.dataset.cameraSourceAspect,fit:getComputedStyle(v).objectFit};
   Object.defineProperty(v,'videoWidth',{configurable:true,get:()=>720});
   Object.defineProperty(v,'videoHeight',{configurable:true,get:()=>1280});
   v.dispatchEvent(new Event('resize'));
   const portrait={classSet:watch.classList.contains('camera-source-landscape'),
    stageMode:watch.classList.contains('camera-frame-letterbox'),
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
  assert.equal(outcome.landscape.classSet,true);
  assert.equal(outcome.landscape.aspect,'1280:720');
  assert.equal(outcome.landscape.fit,'contain','wide landscape sensor must remain uncropped');
  assert.equal(outcome.landscape.stageMode,true,'wide camera needs own stage, not a fullscreen black band');
  assert.ok(outcome.landscape.stageTop>=0&&outcome.landscape.stageTop<=3,
    'mobile source must start at the top with no wasted camera header');
  assert.ok(outcome.landscape.chatTop>=outcome.landscape.stageBottom+8,
    'chat must begin BELOW uncropped camera frame, never over a footer line');
  assert.equal(outcome.landscape.hud,'block','wide camera viewer MUST retain visible themed HUD');
  assert.equal(outcome.landscape.hudOutline,'block','draw ornament ONLY around captured video');
  assert.equal(outcome.landscape.hudFooter,'flex','ON AIR label must remain inside video');
  assert.ok(Math.abs(outcome.landscape.hudHeight-outcome.landscape.stageBottom)<=3,
    'themed frame must stop at lower video edge, not wrap empty chat');
  assert.ok(outcome.landscape.footerBottom<=outcome.landscape.stageBottom+1,
    'ON AIR badge must stay ABOVE chat');
  assert.deepEqual(outcome.portrait,{classSet:false,stageMode:false,aspect:'720:1280',fit:'contain'},
    'true portrait camera must keep natural immersive layout');
  const softFill=await page.evaluate(()=>{
   const w=document.querySelector('#watch'),v=document.querySelector('#remote');
   Object.defineProperty(v,'videoWidth',{configurable:true,get:()=>360});
   Object.defineProperty(v,'videoHeight',{configurable:true,get:()=>480});
   v.dispatchEvent(new Event('resize'));
   const stage=w.querySelector('.live-stage>.viewfinder').getBoundingClientRect();
   const chat=w.querySelector('.live-chat').getBoundingClientRect();
   const hud=document.querySelector('#mobileLiveHud').getBoundingClientRect();
   return {enabled:w.classList.contains('camera-stage-softfill'),nativeHeight:innerWidth*480/360,
    stageHeight:stage.height,chatTop:chat.top,hudBottom:hud.bottom,stageBottom:stage.bottom,
    fit:getComputedStyle(v).objectFit};
  });
  assert.equal(softFill.enabled,true,'3:4 phone sensor must extend into unused black space');
  assert.ok(softFill.stageHeight>softFill.nativeHeight*1.25&&softFill.stageHeight<=softFill.nativeHeight*1.29,
    'limit camera growth to 28% while leaving the chat and SEND usable: '+JSON.stringify(softFill));
  assert.ok(softFill.chatTop>=softFill.stageBottom+8&&Math.abs(softFill.hudBottom-softFill.stageBottom)<3,
    'chat remains BELOW extended video, themed frame follows video only');
  assert.equal(softFill.fit,'cover','soft fill should crop only side edges, not distort image');

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
  assert.equal(viewerUi.frame,'none','viewer camera must not be enclosed in a neon rectangle');
  assert.equal(viewerUi.giftOutside,true,'Rp sawer must stay outside settings');
  assert.equal(viewerUi.composerParent,'row','viewer chat input must remain on video');
  assert.equal(viewerUi.sendParent,'row','viewer SEND must remain on video');
  assert.notEqual(viewerUi.viewerLeave,'none','viewer exit must remain reachable');
  // Mobile-first: PC spectator follows decoded phone portrait orientation.
  // Camera on PC host and true GAME streams remain their own landscape mode.
  await page.setViewport({width:1280,height:800,isMobile:false,hasTouch:false,deviceScaleFactor:1});
  const desktopCamera=await page.evaluate(()=>{
   const watch=document.querySelector('#watch'),v=document.querySelector('#remote');
   watch.classList.remove('hide');document.body.classList.add('live-immersive','watch-viewer');
   document.body.classList.remove('watch-host','watch-game');
   Object.defineProperty(v,'videoWidth',{configurable:true,get:()=>720});
   Object.defineProperty(v,'videoHeight',{configurable:true,get:()=>1280});
   v.dispatchEvent(new Event('loadedmetadata'));
   const screen=watch.querySelector('.live-stage>.viewfinder').getBoundingClientRect();
   const chat=watch.querySelector('.live-chat').getBoundingClientRect();
   return {portrait:watch.classList.contains('camera-source-portrait'),
    frame:{w:screen.width,h:screen.height},chat:{x:chat.x,w:chat.width},fit:getComputedStyle(v).objectFit,
    build:document.getElementById('mobileUiBuild')?.textContent};
  });
  assert.equal(desktopCamera.portrait,true,'desktop detects actual portrait PHONE source');
  assert.ok(desktopCamera.frame.h>desktopCamera.frame.w*1.15,
    'PC viewer must show PORTRAIT stage, not force 16:9 theater: '+JSON.stringify(desktopCamera));
  assert.ok(desktopCamera.chat.w>=290,'PC chat remains a separate side panel');
  assert.equal(desktopCamera.fit,'contain','PC portrait video remains uncropped');
  assert.match(desktopCamera.build,/VIDEO-FILL-V6/,'viewer and host can verify identical UI build in settings');
  console.log('DESKTOP_FOLLOWS_PHONE_PORTRAIT_QC_PASS '+JSON.stringify(desktopCamera));
  console.log('MOBILE_HOST_SETTINGS_AND_VIEWER_HUD_PASS '+JSON.stringify({hostUi,viewerUi}));
  console.log('MOBILE_CAMERA_ASPECT_AND_HOST_THEME_PASS '+JSON.stringify(outcome));
 }finally{await browser.close()}
})().catch(e=>{console.error('MOBILE_CAMERA_ASPECT_AND_HOST_THEME_FAIL',e.stack||e);process.exitCode=1});
