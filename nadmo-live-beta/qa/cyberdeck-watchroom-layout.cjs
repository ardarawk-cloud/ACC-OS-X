'use strict';
// Measures actual rendered geometry and functional controls using Chromium.
// Video pixels in this isolated QC are blank: it tests layout, not game capture.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const puppeteer=require('puppeteer-core');
(async()=>{
 const dir=path.resolve(__dirname,'screenshots');fs.mkdirSync(dir,{recursive:true});
 const browser=await puppeteer.launch({
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  const source='file://'+path.resolve(__dirname,'../public/app/index.html');
  await page.setViewport({width:1014,height:612,deviceScaleFactor:1});
  await page.goto(source,{waitUntil:'domcontentloaded',timeout:30000});
  await page.evaluate(()=>{
   document.querySelector('#watch').classList.remove('hide');
   document.body.classList.add('live-immersive','watch-viewer','watch-game','watch-landscape');
   document.body.style.setProperty('--deck-video-aspect','1920 / 864');
  });
  const compact=await page.evaluate(()=>{
   const box=id=>{const b=document.querySelector(id).getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom}};
   return {stage:box('#watch .live-stage'),player:box('#watch .live-stage>.viewfinder'),
    hud:box('.deck-live-telemetry'),chat:box('#watch .live-chat'),
    controls:box('.deck-player-controls'),gift:box('#desktopSawerBar'),
    shell:box('.deck-shell-art'),metricCount:document.querySelectorAll('.deck-live-metric').length,
    shellVisible:getComputedStyle(document.querySelector('.deck-shell-art')).display,
    chatTitle:document.querySelector('#watch .live-chat .show-label b').textContent,
    background:getComputedStyle(document.querySelector('.deck-live-metric')).backgroundImage};
  });
  assert.ok(compact.stage.w>560,'PC stage too narrow '+JSON.stringify(compact));
  assert.ok(compact.player.w>compact.stage.w*.88,'Gameplay should occupy stage width '+JSON.stringify(compact));
  assert.ok(Math.abs(compact.player.w/compact.player.h-1920/864)<.08,
   'Gameplay must preserve real Android game aspect '+JSON.stringify(compact));
  assert.ok(compact.hud.x>compact.stage.x&&compact.hud.right<compact.chat.x,
   'Functional media HUD must not overlap live chat');
  assert.ok(compact.player.bottom<compact.controls.y+8,'Controls should follow gameplay');
  assert.ok(compact.chat.x>compact.stage.right,'Chat cannot overlap video');
  assert.equal(compact.metricCount,4,'Real video/audio/network/chat HUD must remain functional');
  assert.equal(compact.shellVisible,'block','Reference-matched vector border must render on PC');
  assert.equal(compact.chatTitle,'LIVE CHAT');
  assert.ok(compact.gift.y>compact.controls.bottom-2&&compact.gift.bottom<compact.stage.bottom+3,
   'Sawer row must remain inside the deck frame and below player controls: '+JSON.stringify(compact));
  assert.ok(compact.background.includes('gradient'),'Cyberdeck HUD visual styling missing');
  await page.click('#deckMute');
  assert.match(await page.$eval('#deckMute',x=>x.textContent),/SUARA OFF/);
  await page.click('#deckMute');
  assert.match(await page.$eval('#deckMute',x=>x.textContent),/SUARA ON/);
  await page.screenshot({path:path.join(dir,'cyberdeck-desktop-1014x612.png')});
  await page.setViewport({width:1672,height:941,deviceScaleFactor:1});
  const wide=await page.evaluate(()=>{
   const player=document.querySelector('#watch .live-stage>.viewfinder').getBoundingClientRect();
   const chat=document.querySelector('#watch .live-chat').getBoundingClientRect();
   return {playerWidth:player.width,playerHeight:player.height,chatWidth:chat.width};
  });
  assert.ok(wide.playerWidth>900&&wide.chatWidth>300,'Wide screen should feel like control deck '+JSON.stringify(wide));
  await page.screenshot({path:path.join(dir,'cyberdeck-desktop-1672x941.png')});
  await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  // Switching desktop Chromium to mobile emulation can reload the page.
  // Re-enter the GAME room fixture after the viewport switch.
  await page.evaluate(()=>{
   document.querySelector('#watch').classList.remove('hide');
   document.body.classList.add('live-immersive','watch-viewer','watch-game','watch-landscape');
   document.querySelector('#remote').muted=true;
   // Show the controls a real joined viewer receives, without joining a room.
   for(const id of ['reportLive','joinGuestVoice','joinGuestCamera','giftQuick'])
    document.getElementById(id).hidden=false;
  });
  // The previous mobile screenshot only captured Studio. Also render the exact
  // viewer GAME layout from a full-height landscape stream on a portrait phone.
  const inspectGame=async()=>{
   return page.evaluate(()=>{
    const rect=selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect();
     return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom,right:r.right}};
    return {screen:{w:innerWidth,h:innerHeight},
     stage:rect('#watch .live-stage'),video:rect('#watch #remote'),
     header:rect('#watch #hostProfileCard'),close:rect('#watch #leave'),
     feed:rect('#watch .mobile-game-feedline'),chat:rect('#watch .live-chat'),
     chatHeading:rect('#watch .live-chat .show-label'),chatMessages:rect('#watch #chat'),
     composer:rect('#watch .live-chat .row'),safety:rect('#watch .room-safety'),
     brandVisible:getComputedStyle(document.querySelector('.mobile-game-brand')).display!=='none',
     chatHeadingVisible:getComputedStyle(document.querySelector('#watch .live-chat .show-label')).display!=='none',
     overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
  };
  const checkGame=layout=>{
   assert.ok(layout.brandVisible&&layout.chatHeadingVisible,'Mobile GAMECAST must show useful compact HUD');
   assert.ok(layout.stage.y>layout.header.bottom+16&&layout.stage.y<230,'Game must follow host immediately: '+JSON.stringify(layout));
   assert.ok(Math.abs(layout.video.w/layout.video.h-16/9)<.06,'Landscape game frame aspect was cropped or stretched: '+JSON.stringify(layout));
   assert.ok(layout.chat.y>=layout.stage.bottom+8&&layout.chat.y<layout.screen.h*.67,'Chat must begin immediately after gameplay: '+JSON.stringify(layout));
   assert.ok(layout.chatMessages.h>=30&&layout.composer.h>=38,'Chat and input must remain usable: '+JSON.stringify(layout));
   assert.ok(layout.composer.bottom<=layout.safety.y+8,'Actions must stay below input: '+JSON.stringify(layout));
   assert.ok(layout.safety.bottom<=layout.screen.h+1&&!layout.overflow,'No clipped controls / horizontal overflow: '+JSON.stringify(layout));
   assert.ok(layout.close.x>layout.header.right-14,'Close control must remain reachable');
  };
  const gameMobile=await inspectGame();
  console.log('MOBILE_GAMECAST_GEOMETRY '+JSON.stringify(gameMobile));
  checkGame(gameMobile);
  // Two harmless local fixture messages test readability; no room is opened.
  await page.evaluate(()=>{
   const chat=document.querySelector('#chat');chat.replaceChildren();
   for(const [name,msg] of [['Viewer QA','Tes pesan masuk'],['Penonton QA','Chat tampil saat game landscape']]){
    const line=document.createElement('div'),strong=document.createElement('b');
    strong.textContent=name+': ';line.append(strong,document.createTextNode(msg));chat.append(line);
   }
  });
  await page.screenshot({path:path.join(dir,'cyberdeck-game-viewer-mobile-390x844.png')});
  await page.click('#moreQuick');
  assert.equal(await page.$eval('#liveSettingsPanel',el=>el.classList.contains('sheet-open')),true,
   'Game viewer settings must remain functional after UI refinement');
  await page.click('#closeSettingsSheet');
  for(const size of [{width:360,height:720},{width:320,height:568}]){
   await page.setViewport({...size,deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const small=await inspectGame();checkGame(small);
   await page.screenshot({path:path.join(dir,'cyberdeck-game-viewer-mobile-'+size.width+'x'+size.height+'.png')});
  }
  await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true});
  const mobile=await page.evaluate(()=>{
   document.body.classList.remove('live-immersive','watch-viewer','watch-game','watch-landscape');
   document.querySelector('#watch').classList.add('hide');
   document.querySelector('#studio').classList.remove('hide');
   document.querySelector('#gameSetup').classList.remove('hide');
   const input=document.querySelector('#createRoom').getBoundingClientRect();
   const app=document.querySelector('.app').getBoundingClientRect();
   return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    goLiveHeight:input.height,appWidth:app.width,brand:!!document.querySelector('.deck-system-bar'),
    audio:document.querySelector('#gameDeckAudio').textContent};
  });
  assert.ok(mobile.scrollWidth<=mobile.width+1,'Mobile horizontal overflow '+JSON.stringify(mobile));
  assert.ok(mobile.goLiveHeight>=50,'Creator GO LIVE tap target too small');
  assert.ok(mobile.brand&&/BELUM TERSEDIA/.test(mobile.audio));
  await page.screenshot({path:path.join(dir,'cyberdeck-mobile-390x844.png')});
  console.log('PASS actual cyberdeck desktop + mobile layout '+JSON.stringify({compact,wide,mobile}));
 }finally{await browser.close()}
})().catch(e=>{console.error('CYBERDECK_QC_FAIL',e);process.exit(1)});
