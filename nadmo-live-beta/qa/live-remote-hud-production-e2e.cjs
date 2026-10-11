'use strict';
// Live-domain verification, not a file:// mock. Catches stale Worker bundles
// and the owner-observed missing HUD in the actual public app.
const puppeteer=require('puppeteer-core');
const assert=require('node:assert/strict');
const REV='20261012-mobile-first-v3';
(async()=>{
 const browser=await puppeteer.launch({
  executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  headless:true,args:['--no-sandbox','--disable-dev-shm-usage']
 });
 try{
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await page.setCacheEnabled(false);
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const response=await page.goto('https://live.nadmo.id/app/?overlay-qc='+REV,{
   waitUntil:'domcontentloaded',timeout:40000
  });
  assert.equal(response.status(),200,'official page must be live, not an offline fallback');
  await page.waitForSelector('#mobileLiveHud',{timeout:18000});
  await page.evaluate(()=>{
   const watch=document.querySelector('#watch');
   watch.classList.remove('hide');
   watch.dataset.hostTheme='electric';
   document.body.classList.remove('watch-game','watch-clean','watch-landscape','watch-host');
   document.body.classList.add('live-immersive','watch-viewer');
  });
  const shown=await page.evaluate(()=>{
   const watch=document.querySelector('#watch'),hud=document.querySelector('#mobileLiveHud');
   const video=document.querySelector('#remote').getBoundingClientRect();
   const rect=hud.getBoundingClientRect(),css=getComputedStyle(hud),frame=getComputedStyle(watch,'::before');
   const subt=document.querySelector('#watchRoomSubtitle');
   return {rev:document.querySelector('meta[name=nadmo-ui-revision]')?.content,
    hudRev:hud.dataset.uiRevision,viewport:{width:innerWidth,height:innerHeight},
    hud:{display:css.display,opacity:css.opacity,pointer:css.pointerEvents,rectW:rect.width,rectH:rect.height,
      color:css.color,text:hud.textContent},
    frame:{display:frame.display,borderWidth:frame.borderTopWidth,borderColor:frame.borderTopColor},
    video:{width:video.width,height:video.height},subtitle:subt?.textContent
   };
  });
  assert.equal(shown.rev,REV,'Live Worker served old HTML despite successful local QC');
  assert.equal(shown.hudRev,REV,'Live Worker served old HUD markup');
  assert.ok(shown.viewport.width<=430,'mobile viewport semantics changed');
  assert.equal(shown.hud.display,'block','mobile overlay not visible in production');
  assert.equal(shown.hud.pointer,'none','HUD must not block touch');
  assert.ok(shown.hud.rectW>=385&&shown.hud.rectH>=790,'HUD must fill portrait phone');
  assert.match(shown.hud.color,/109, 244, 255/,'Electric HUD theme lost');
  assert.equal(shown.frame.display,'none','do not draw a neon border around the entire phone');
  assert.equal(shown.frame.borderWidth,'0px','camera layout must not be a cyberdeck rectangle');
  assert.ok(shown.hud.text.includes('SIGNAL')&& !shown.hud.text.includes('NADMO LIVE'),'duplicate brand in HUD');
  await page.evaluate(()=>{
   const el=document.querySelector('#remote');
   el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:19,clientX:35,clientY:470}));
   el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:19,clientX:250,clientY:470}));
  });
  const clean=await page.evaluate(()=>({
   clean:document.body.classList.contains('watch-clean'),
   display:getComputedStyle(document.querySelector('#mobileLiveHud')).display,
   frame:getComputedStyle(document.querySelector('#watch'),'::before').display
  }));
  assert.deepEqual(clean,{clean:true,display:'none',frame:'none'},'right swipe must hide ALL overlay');
  await page.evaluate(()=>{
   const el=document.querySelector('#remote');
   el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',pointerId:20,clientX:275,clientY:470}));
   el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:20,clientX:60,clientY:470}));
  });
  const restored=await page.evaluate(()=>({
   clean:document.body.classList.contains('watch-clean'),
   display:getComputedStyle(document.querySelector('#mobileLiveHud')).display,
   frame:getComputedStyle(document.querySelector('#watch'),'::before').display
  }));
  assert.deepEqual(restored,{clean:false,display:'block',frame:'none'},'left swipe restores subtle corner HUD, never a full rectangle');
  assert.ok(!errors.some(x=>/SyntaxError|ReferenceError/.test(x)),'production app scripts failed: '+errors.join('; '));
  console.log('OFFICIAL_REMOTE_MOBILE_HUD_PASS '+JSON.stringify({
   revision:shown.rev,viewport:shown.viewport,HUD:'visible electric cyan',
   fallbackFrame:'disabled for natural camera',swipe:'right clean / left restore'}));
 }finally{await browser.close()}
})().catch(e=>{console.error('OFFICIAL_REMOTE_MOBILE_HUD_FAIL',e.stack||e);process.exitCode=1});
