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
  // Camera input may be portrait, but the PC player layout stays landscape.
  // Contain ensures a 9:16 source is not cropped inside its wide theater.
  const cameraWide=await page.evaluate(()=>{
   document.body.classList.remove('watch-game','watch-landscape');
   document.body.style.setProperty('--deck-video-aspect','9 / 16');
   const stage=document.querySelector('#watch .live-stage').getBoundingClientRect();
   const view=document.querySelector('#watch .live-stage>.viewfinder').getBoundingClientRect();
   return {stageW:stage.width,viewW:view.width,viewH:view.height,fit:getComputedStyle(document.querySelector('#remote')).objectFit};
  });
  assert.ok(cameraWide.viewW>0&&cameraWide.viewH>0&&
   Math.abs(cameraWide.viewW/cameraWide.viewH-16/9)<.05&&
   cameraWide.viewW>cameraWide.stageW*.85&&cameraWide.fit==='contain',
   'PC LIVE must remain wide landscape while displaying portrait camera intact: '+JSON.stringify(cameraWide));
  await page.screenshot({path:path.join(dir,'cyberdeck-camera-landscape-PC-1672x941.png')});
  // SOCIAL: a photo is square in the feed but its original is separately linked.
  const socialPhoto=await page.evaluate(()=>{
   document.body.classList.remove('live-immersive','watch-viewer');
   document.querySelector('#watch').classList.add('hide');
   document.querySelector('#socialPage').classList.remove('hide');
   const frame=document.createElement('a');frame.className='social-photo-frame';
   frame.href='https://example.com/photo-original.jpg';
   const img=document.createElement('img');img.className='social-post-photo';
   img.alt='Square media fixture';
   img.src='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600"%3E%3Crect width="100%25" height="100%25" fill="%230e271a"/%3E%3Ccircle cx="400" cy="300" r="180" fill="%2389b34f"/%3E%3C/svg%3E';
   frame.append(img);document.querySelector('#socialPublicFeed').prepend(frame);
   const rect=frame.getBoundingClientRect();
   return {width:rect.width,height:rect.height,fit:getComputedStyle(img).objectFit,href:frame.href};
  });
  assert.ok(socialPhoto.width>120&&Math.abs(socialPhoto.width-socialPhoto.height)<2&&
   socialPhoto.fit==='cover'&&/photo-original.jpg/.test(socialPhoto.href),
   'SOCIAL photo tile must display 1:1, full image still linked: '+JSON.stringify(socialPhoto));
  await page.screenshot({path:path.join(dir,'cyberdeck-social-square-photo-desktop.png')});
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
  // Regression: editor cover and ME/public profile must show the identical
  // 16:9 image, never a zoomed 1200px CSS background on a 390px phone.
  const cover=await page.evaluate(async()=>{
   document.querySelector('#studio').classList.add('hide');
   document.querySelector('#settings').classList.remove('hide');
   const me=document.querySelector('#betaSocialProfile');
   me.dataset.coverPhoto='true';me.dataset.theme='cyberbw';
   const hero=me.querySelector('.profile-hero'),img=hero.querySelector('img.profile-cover-photo');
   const preview=document.querySelector('#coverPreviewImg');
   const url='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675"><rect width="1200" height="675" fill="#202030"/><rect x="0" width="250" height="675" fill="#ff2bb9"/><circle cx="700" cy="350" r="135" fill="#8affdc"/></svg>');
   img.hidden=false;img.src=url;preview.hidden=false;preview.src=url;
   await Promise.all([img.decode(),preview.decode()]);
   const bounds=hero.getBoundingClientRect(),photo=img.getBoundingClientRect();
   return {heroWidth:bounds.width,heroHeight:bounds.height,imgWidth:photo.width,imgHeight:photo.height,
    aspect:bounds.width/bounds.height,objectFit:getComputedStyle(img).objectFit,
    position:getComputedStyle(img).position,filter:getComputedStyle(hero).filter,
    bg:getComputedStyle(hero).backgroundImage,imgSourceEqualsPreview:img.src===preview.src};
  });
  assert.ok(cover.heroWidth>300&&cover.heroWidth<450&&Math.abs(cover.aspect-16/9)<.12,
    'Cover must have original 16:9 proportions: '+JSON.stringify(cover));
  assert.ok(Math.abs(cover.imgWidth-cover.heroWidth)<3&&Math.abs(cover.imgHeight-cover.heroHeight)<3,
    'Cover photo must fill actual banner frame, not intrinsic image dimensions: '+JSON.stringify(cover));
  assert.equal(cover.objectFit,'contain','Never crop the uploaded cover on ME');
  assert.equal(cover.position,'absolute','Banner image cannot change content layout');
  assert.equal(cover.filter,'none','BW accents must not desaturate uploaded photos');
  assert.equal(cover.bg,'none','Do not render a second zoomed CSS background');
  assert.ok(cover.imgSourceEqualsPreview,'Preview and ME must use the exact same image');
  await page.screenshot({path:path.join(dir,'cyberdeck-me-cover-uncropped-mobile-390x844.png')});
  console.log('ME_COVER_VISUAL_QC_PASS '+JSON.stringify(cover));

  // Camera-specific regression: Android wide sensor must not become a giant
  // blank black portrait page. Portrait source must be full bleed. The game
  // landscape visual contract is intentionally unchanged.
  const testCameraLayout=async(kind)=>{
   return page.evaluate((kind)=>{
    const body=document.body,watch=document.querySelector('#watch'),video=document.querySelector('#remote');
    watch.classList.remove('hide');
    body.classList.add('live-immersive');
    body.classList.toggle('watch-host',kind.includes('host'));
    body.classList.toggle('watch-viewer',kind.includes('viewer')||kind.includes('game'));
    body.classList.toggle('watch-game',kind.includes('game'));
    body.classList.toggle('watch-camera-wide',kind.includes('wide'));
    body.classList.toggle('watch-landscape',kind.includes('wide')||kind.includes('game'));
    const bg=document.querySelector('#cameraBackdrop'),stage=document.querySelector('#watch .live-stage');
    const r=video.getBoundingClientRect(),rs=stage.getBoundingClientRect();
    return {kind,fit:getComputedStyle(video).objectFit,bgDisplay:getComputedStyle(bg).display,
      top:r.top,width:r.width,height:r.height,stageWidth:rs.width,stageHeight:rs.height,
      screenWidth:innerWidth,screenHeight:innerHeight};
   },kind);
  };
  for(const mode of ['host-portrait','viewer-portrait']){
   const layout=await testCameraLayout(mode);
   assert.equal(layout.fit,'cover','Portrait LIVE camera must cover the phone: '+JSON.stringify(layout));
   assert.equal(layout.bgDisplay,'none','A portrait camera should not incur duplicate video rendering');
   assert.ok(layout.height>=layout.screenHeight*.90,'Portrait video must fill screen height: '+JSON.stringify(layout));
  }
  for(const mode of ['host-wide','viewer-wide']){
   const layout=await testCameraLayout(mode);
   assert.equal(layout.fit,'contain','Wide camera must keep the face uncropped: '+JSON.stringify(layout));
   assert.notEqual(layout.bgDisplay,'none','Wide camera must not sit in a blank black phone screen');
   assert.ok(layout.top>100&&layout.top<250&&layout.height<layout.screenHeight*.55,
    'Wide camera frame should sit beneath the LIVE header, with chat below: '+JSON.stringify(layout));
  }
  const stillGame=await testCameraLayout('viewer-game-wide');
  assert.equal(stillGame.fit,'contain','Game must remain wide and uncropped');
  assert.equal(stillGame.bgDisplay,'none','Game must not receive the camera backdrop');
  await page.evaluate(()=>{document.body.classList.remove('live-immersive','watch-host','watch-viewer','watch-game','watch-camera-wide','watch-landscape');document.querySelector('#watch').classList.add('hide');});
  console.log('CAMERA_MOBILE_PORTRAIT_AND_WIDE_QC_PASS');
  console.log('PASS actual cyberdeck desktop + mobile layout '+JSON.stringify({compact,wide,mobile}));
 }finally{await browser.close()}
})().catch(e=>{console.error('CYBERDECK_QC_FAIL',e);process.exit(1)});
