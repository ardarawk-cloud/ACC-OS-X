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
  assert.ok(compact.controls.x>=compact.chat.x&&compact.controls.right<=compact.chat.right+1,
   'Functional PLAYBACK controls must be INSIDE chat sidebar, not obstruct video: '+JSON.stringify(compact));
  assert.ok(compact.controls.y>=compact.chat.y&&compact.controls.bottom<compact.chat.bottom-45,
   'Mute/refresh/fullscreen controls must remain above chat input');
  assert.ok(compact.chat.x>compact.stage.right,'Chat cannot overlap video');
  assert.equal(compact.metricCount,4,'Real video/audio/network/chat HUD must remain functional');
  assert.equal(compact.shellVisible,'block','Reference-matched vector border must render on PC');
  assert.equal(compact.chatTitle,'LIVE CHAT');
  assert.ok(compact.gift.y>compact.stage.y&&compact.gift.bottom<compact.stage.bottom+3,
   'Sawer controls stay under the camera deck without moving to chat: '+JSON.stringify(compact));
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
     safetyInsideSettings:document.querySelector('#watch .room-safety').parentElement.id==='liveSettingsPanel',
     safetyHidden:document.querySelector('#watch .room-safety').getClientRects().length===0,
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
   assert.ok(layout.safetyInsideSettings&&layout.safetyHidden,'Audience moderation/guest actions must be inside closed settings, not over the video: '+JSON.stringify(layout));
   assert.ok(layout.composer.bottom<=layout.screen.h+1&&!layout.overflow,'No clipped composer or horizontal overflow: '+JSON.stringify(layout));
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
  assert.equal(await page.$eval('#liveSettingsPanel .room-safety',el=>el.getClientRects().length>0),true,
   'Viewer safety/guest actions must become visible inside ⚙ settings');
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

  // Mobile camera HUD: only subdued viewer corner accents, never a frame or
  // divider across the person's image/chat. Swipe still hides/restores accents.
  await page.evaluate(()=>{
   document.querySelector('#settings').classList.add('hide');
   document.querySelector('#watch').classList.remove('hide');
   document.body.classList.remove('watch-game','watch-clean','watch-host','watch-landscape');
   document.body.classList.add('live-immersive','watch-viewer');
   document.querySelector('#watch').dataset.hostTheme='electric';
  });
  const mobileHud=await page.evaluate(()=>{
   const hud=document.querySelector('#mobileLiveHud'),player=document.querySelector('#remote');
   const rect=hud.getBoundingClientRect(),video=player.getBoundingClientRect();
   return {display:getComputedStyle(hud).display,pointer:getComputedStyle(hud).pointerEvents,
    text:hud.textContent,rect:{w:rect.width,h:rect.height},
    video:{w:video.width,h:video.height},color:getComputedStyle(hud).color,
    border:getComputedStyle(document.querySelector('#watch'),'::before').display,
    footer:getComputedStyle(hud.querySelector('.mobile-live-hud-footer')).display,
    corner:getComputedStyle(hud.querySelector('.hud-tl')).borderTopWidth,
    theme:document.querySelector('#watch').dataset.hostTheme};
  });
  assert.equal(mobileHud.display,'block','Viewer color accents must remain present');
  assert.equal(mobileHud.border,'none','Do not enclose camera+chat in a neon full-screen border');
  assert.equal(mobileHud.footer,'none','Decorative VIDEO FEED line must never cross image or chat');
  assert.equal(mobileHud.corner,'2px','Keep small theme-colored corners instead');
  assert.equal(mobileHud.pointer,'none','Cyberdeck cannot block touch controls or swipe');
  assert.ok(mobileHud.rect.w>=380&&mobileHud.rect.h>=700,'HUD must occupy portrait screen');
  assert.ok(mobileHud.video.h>mobileHud.rect.h*.8,'HUD must sit OVER video, not constrain video');
  assert.match(mobileHud.text,/SIGNAL/,'mobile HUD must identify stream state');
  assert.doesNotMatch(mobileHud.text,/NADMO LIVE/,'app brand must not repeat in mobile watch HUD');
  assert.match(mobileHud.color,/109, 244, 255/,'Electric HUD must inherit host cyan');
  await page.screenshot({path:path.join(dir,'cyberdeck-live-camera-mobile-normal-390x844.png')});
  const cleanState=await page.evaluate(()=>{
   const player=document.querySelector('#remote'),before=player.getBoundingClientRect();
   player.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:2,clientX:48,clientY:460}));
   player.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:2,clientX:220,clientY:466}));
   const hud=document.querySelector('#mobileLiveHud');
   const clean={body:document.body.classList.contains('watch-clean'),display:getComputedStyle(hud).display,
    video:player.getBoundingClientRect()};
   player.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:3,clientX:290,clientY:460}));
   player.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:3,clientX:70,clientY:465}));
   const restored={body:document.body.classList.contains('watch-clean'),display:getComputedStyle(hud).display,
    video:player.getBoundingClientRect()};
   return {before:{w:before.width,h:before.height},clean:{body:clean.body,display:clean.display,video:{w:clean.video.width,h:clean.video.height}},
     restored:{body:restored.body,display:restored.display,video:{w:restored.video.width,h:restored.video.height}}};
  });
  assert.equal(cleanState.clean.body,true,'Swipe right must enter clean mode');
  assert.equal(cleanState.clean.display,'none','Cyberdeck must vanish on clean mode');
  assert.equal(cleanState.restored.body,false,'Swipe left must restore normal mode');
  assert.equal(cleanState.restored.display,'block','Cyberdeck must return on swipe left');
  assert.equal(cleanState.before.w,cleanState.clean.video.w);
  assert.equal(cleanState.before.h,cleanState.clean.video.h);
  assert.equal(cleanState.before.w,cleanState.restored.video.w);
  assert.equal(cleanState.before.h,cleanState.restored.video.h);
  await page.screenshot({path:path.join(dir,'cyberdeck-live-camera-mobile-restored-390x844.png')});
  // Theme selection does not change the stream.
  const noirHud=await page.evaluate(()=>{
   document.querySelector('#watch').dataset.hostTheme='noir';
   return getComputedStyle(document.querySelector('#mobileLiveHud')).color;
  });
  assert.match(noirHud,/234, 208, 185/,'Noir must use warm monochrome, not default green');
  console.log('MOBILE_CAMERA_CYBERDECK_OVERLAY_CLEAN_QC_PASS '+JSON.stringify({mobileHud,cleanState,noirHud}));
  await page.evaluate(()=>{document.body.classList.remove('live-immersive','watch-viewer');document.querySelector('#watch').classList.add('hide')});

  // Camera regression: preserve the entire decoded image, not a face-only
  // center crop. Letterbox space is safer than cutting off the subject.
  // GAME retains its independent landscape geometry.
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
    return {kind,fit:getComputedStyle(video).objectFit,bgDisplay:bg?getComputedStyle(bg).display:'none',
      top:r.top,width:r.width,height:r.height,stageWidth:rs.width,stageHeight:rs.height,
      screenWidth:innerWidth,screenHeight:innerHeight};
   },kind);
  };
  for(const mode of ['host-portrait','viewer-portrait']){
   const layout=await testCameraLayout(mode);
   assert.equal(layout.fit,'contain','Portrait camera must not enlarge/crop the subject: '+JSON.stringify(layout));
   assert.equal(layout.bgDisplay,'none','A portrait camera should not incur duplicate video rendering');
   assert.ok(layout.height>=layout.screenHeight*.90,'Portrait video must fill screen height: '+JSON.stringify(layout));
  }
  // Android devices that return horizontal camera frames must remain visible
  // in full instead of stretching the face across a portrait phone.
  for(const mode of ['host-wide','viewer-wide']){
   const layout=await testCameraLayout(mode);
   assert.equal(layout.fit,'contain','Landscape capture must fit without camera crop: '+JSON.stringify(layout));
   assert.equal(layout.bgDisplay,'none','No blurred backdrop or horizontal camera strip');
   assert.ok(layout.height>=layout.screenHeight*.90,'Wide source cannot shrink the LIVE viewport: '+JSON.stringify(layout));
  }
  const stillGame=await testCameraLayout('viewer-game-wide');
  assert.equal(stillGame.fit,'contain','Game must remain wide and uncropped');
  assert.equal(stillGame.bgDisplay,'none','Game must not receive a camera backdrop');
  await page.evaluate(()=>{document.body.classList.remove('live-immersive','watch-host','watch-viewer','watch-game','watch-camera-wide','watch-landscape');document.querySelector('#watch').classList.add('hide');});
  console.log('CAMERA_MOBILE_FULL_PORTRAIT_QC_PASS');
  // Native-track anti-zoom: never recompose 640x360 sensor frames into 360x640.
  const antiZoom=await page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;
   const c=canvas.getContext('2d');
   c.fillStyle='#191919';c.fillRect(0,0,640,360);
   c.fillStyle='#ff1900';c.fillRect(100,0,26,360);
   c.fillStyle='#00eaff';c.fillRect(514,0,26,360);
   const fake=canvas.captureStream(20),md=navigator.mediaDevices;
   if(!md?.getUserMedia)throw new Error('MediaDevices unavailable');
   const real=md.getUserMedia.bind(md);
   Object.defineProperty(md,'getUserMedia',{configurable:true,value:async()=>fake});
   let result;
   try{
    result=await window.__nadmoCameraQATest.openLiveCamera(false);
    return {native:result?.stream?.getVideoTracks()[0]===fake.getVideoTracks()[0],
     compositor:result?.controller??null,sourceWidth:canvas.width,sourceHeight:canvas.height,
     left:Array.from(c.getImageData(110,180,1,1).data),
     right:Array.from(c.getImageData(525,180,1,1).data)};
   }finally{
    Object.defineProperty(md,'getUserMedia',{configurable:true,value:real});
    result?.stream?.getTracks().forEach(t=>t.stop());
    fake.getTracks().forEach(t=>t.stop());
   }
  });
  assert.equal(antiZoom.native,true,'Raw camera sensor track must survive');
  assert.equal(antiZoom.compositor,null,'Do not create low-res portrait compositor');
  assert.equal(antiZoom.sourceWidth,640);
  assert.equal(antiZoom.sourceHeight,360);
  assert.ok(antiZoom.left[0]>150&&antiZoom.left[1]<110,'Original left camera marker lost');
  assert.ok(antiZoom.right[2]>120&&antiZoom.right[0]<110,'Original right camera marker lost');
  console.log('CAMERA_NATIVE_ANTIZOOM_QC_PASS '+JSON.stringify(antiZoom));
  console.log('PASS actual cyberdeck desktop + mobile layout '+JSON.stringify({compact,wide,mobile}));
 }finally{await browser.close()}
})().catch(e=>{console.error('CYBERDECK_QC_FAIL',e);process.exit(1)});
