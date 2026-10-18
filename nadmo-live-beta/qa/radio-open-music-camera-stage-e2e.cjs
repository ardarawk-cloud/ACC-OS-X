'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const puppeteer=require('puppeteer-core');
(async()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/app/index.html'),'utf8');
 const worker=fs.readFileSync(path.join(__dirname,'../worker.mjs'),'utf8');
 assert(html.includes('data-live-mode="radio"'),'RADIO must be a separate creator mode');
 assert(html.includes('id="radioOpenMusic"'),'OPEN MUSIC control missing');
 assert(html.includes("gameCommand('launch-music')"),'Android launch bridge missing');
 assert(html.includes('nativeRadioSupported'),'Old Android APK must be feature-gated');
 assert(html.includes("nativeRadioSupported=d.radioMusicSupported===true"),'Missing explicit capability handshake');
 assert(worker.includes("broadcastKind:['radio','gaming','talk']"),'Worker must preserve RADIO and TALK mode independently');
 assert(worker.includes("broadcastKind:room.broadcastKind||'camera'"),'Viewer must see trusted radio kind');
 assert(html.includes('body.live-immersive.watch-radio #watch .live-stage'),'Radio viewport must use camera stage');
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  for(const size of [{width:320,height:720},{width:390,height:844},{width:430,height:932}]){
   const page=await browser.newPage();
   await page.setViewport({...size,deviceScaleFactor:1,isMobile:true,hasTouch:true});
   await page.goto('file://'+path.resolve(__dirname,'../public/app/index.html'),{waitUntil:'domcontentloaded'});
   const geometry=await page.evaluate(()=>{
    document.body.classList.add('live-immersive','watch-viewer','watch-radio');
    const watch=document.getElementById('watch');
    watch.classList.remove('hide');
    document.getElementById('studio').classList.remove('hide'); // measurable grid, not display:none
    document.getElementById('radioLiveCanvas').removeAttribute('hidden');
    const stage=document.querySelector('#watch .live-stage').getBoundingClientRect();
    const poster=document.querySelector('#radioLiveCanvas').getBoundingClientRect();
    const radioStyle=getComputedStyle(document.getElementById('radioLiveCanvas'));
    const modes=[...document.querySelectorAll('#liveModeGrid button')].map(x=>x.dataset.liveMode);
    const group=document.querySelector('#liveModeGrid').getBoundingClientRect();
    return {stage:{width:stage.width,height:stage.height},poster:{width:poster.width,height:poster.height},
      display:radioStyle.display,modes,modeColumns:getComputedStyle(document.querySelector('#liveModeGrid')).gridTemplateColumns,
      viewport:{width:innerWidth,height:innerHeight},modeWidth:group.width};
   });
   assert.match(html,/\.profile-hero>div:nth-of-type\(2\)/,'Profile metadata must NOT flex/stretch the avatar');
   assert.doesNotMatch(html,/\.profile-hero>div:nth-child\(2\)\{display:flex/,'Mis-targeted metadata selector stretches public avatars');
   assert.match(html,/\$\('localCameraSetup'\)\.classList\.toggle\('hide',!\['camera','talk'\]\.includes\(mode\)\)/,
     'RADIO/GAME cannot show local CAMERA preview and controls');
   const profile=await page.evaluate(()=>{
     const publicPage=document.getElementById('publicProfilePage');
     publicPage.classList.remove('hide');
     const avatar=publicPage.querySelector('.profile-hero>.profile-avatar');
     const hero=publicPage.querySelector('.profile-hero');
     hero.style.width='100%';
     const rect=avatar.getBoundingClientRect(),style=getComputedStyle(avatar);
     publicPage.classList.add('hide');
     return {width:rect.width,height:rect.height,flex:style.flex,ratio:rect.width/Math.max(1,rect.height)};
   });
   assert(Math.abs(profile.ratio-1)<.02,'Creator avatar must be circular, not elongated: '+JSON.stringify(profile));
   assert(geometry.modes.includes('radio'));
   assert.equal(geometry.display,'flex','Radio artwork must be visible');
   assert(geometry.stage.width>=size.width*.88,'Radio width must be camera-sized: '+JSON.stringify(geometry));
   assert(geometry.stage.height>=size.height*.60,'Radio height must never be short GAME stage: '+JSON.stringify(geometry));
   assert(geometry.poster.width>=geometry.stage.width*.9,'Radio poster must fill camera stage');
   assert(geometry.poster.height>=geometry.stage.height*.9,'Radio poster must fill camera stage');
   assert.equal(geometry.modeColumns.trim().split(/\s+/).length,5,'Creator modes should fit a single five-column row');
   const voice=await page.evaluate(()=>{
     document.body.classList.remove('watch-radio');
     const watch=document.getElementById('watch');
     watch.classList.add('mobile-stage-voice');
     watch.classList.remove('mobile-stage-split');
     const main=watch.querySelector('.live-stage').getBoundingClientRect();
     const guest=document.createElement('div');guest.className='stage-guest-tile';
     guest.style.left='67%';guest.style.top='14%';guest.style.width='29%';guest.style.height='18%';
     document.getElementById('guestStageGrid').append(guest);
     const tile=guest.getBoundingClientRect();
     return {main:{width:main.width,height:main.height},tile:{width:tile.width,height:tile.height}};
   });
   assert(voice.main.width>=size.width*.9,'VOICE stage not full camera width '+JSON.stringify(voice));
   assert(voice.main.height>=size.height*.60,'VOICE stage wrongly split '+JSON.stringify(voice));
   assert(voice.tile.width<=voice.main.width*.43,'VOICE guest must be a compact overlay '+JSON.stringify(voice));
   assert.match(html,/voiceOnly=roomBroadcastKind==='talk'\|\|/,'TALK must always use full CAMERA-sized stage');
   assert.match(worker,/category:room\.category/,'Worker must publish persisted category');
   console.log('PASS VOICE camera-sized stage and compact guest '+size.width+'px');
   console.log('PASS RADIO portrait '+size.width+'x'+size.height+': '+Math.round(geometry.stage.width)+'x'+Math.round(geometry.stage.height));
   await page.close();
  }
  // Owner QC: LIVE PC must preserve full CYBERDECK framing and inherit HOST theme.
  assert(html.includes('CYBERDECK REFERENCE-MATCH v5'));
  assert(worker.includes('CODAPAY_PAYMENT_GATE_DISABLED'),'Live UI deployment must preserve Coda fail-closed callbacks');
  for(const width of [900,1366]){
   const page=await browser.newPage();
   await page.setViewport({width,height:768,deviceScaleFactor:1});
   await page.goto('file://'+path.resolve(__dirname,'../public/app/index.html'),{waitUntil:'domcontentloaded'});
   const state=await page.evaluate(()=>{
    document.body.classList.add('live-immersive','watch-viewer');
    const watch=document.getElementById('watch');
    watch.classList.remove('hide');
    watch.dataset.hostTheme='cyberbw';
    const stage=watch.querySelector('.live-stage');
    const chat=watch.querySelector('.live-chat');
    const video=document.getElementById('remote');
    const rect=stage.getBoundingClientRect();
    return {theme:watch.dataset.hostTheme,accent:getComputedStyle(watch).getPropertyValue('--neon').trim(),
     stageBorder:getComputedStyle(stage).borderTopColor,chatBorder:getComputedStyle(chat).borderTopColor,
     width:rect.width,videoFilter:getComputedStyle(video).filter,watchFilter:getComputedStyle(watch).filter};
   });
   assert.equal(state.theme,'cyberbw');
   assert.match(state.accent,/#f4f4f4/i,'Host BW accent must apply to the viewer room');
   assert.match(state.stageBorder,/rgb\(24[0-9], 24[0-9], 24[0-9]\)/,'BW frame must be vivid white not muted green: '+JSON.stringify(state));
   assert.match(state.chatBorder,/rgb\(24[0-9], 24[0-9], 24[0-9]\)/,'BW chat frame must follow host: '+JSON.stringify(state));
   assert(state.width>220,'Full CYBERDECK desktop stage must be visible '+JSON.stringify(state));
   assert.equal(state.videoFilter,'none','Live video must NOT be desaturated by BW UI theme');
   assert.equal(state.watchFilter,'none','UI theme must not recolor nested video');
   console.log('PASS viewer CYBERDECK follows host BLACK/WHITE at '+width+'px');
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
