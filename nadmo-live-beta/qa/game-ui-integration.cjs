'use strict';
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const puppeteer=require('puppeteer-core');
const appFile=path.resolve(__dirname,'../public/app/index.html');
const html=fs.readFileSync(appFile,'utf8');
const inline=(html.match(/<script>([\s\S]*?)<\/script>/)||[])[1];
assert.ok(inline,'NADMO main script required');
new Function(inline);
const worker=fs.readFileSync(path.resolve(__dirname,'../worker.mjs'),'utf8');
assert.ok(worker.includes('facecam:room.facecam||null'),'Facecam settings must reach viewers');
for(const id of ['gameLaunchGame','gameShareRoom','gameStopLive','gameRemoteFace','offgridEntry'])
  assert.ok(html.includes('id="'+id+'"'),'Missing '+id);
assert.ok(html.includes('data-live-mode="gaming"'),'GAME tile missing');
assert.ok(html.includes('nav button.broadcast i'),'Original skewed GO LIVE identity missing');
const chrome=process.env.CHROME_BIN||'/usr/bin/google-chrome';
(async()=>{
 const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-fake-ui-for-media-stream']});
 try{
  const page=await browser.newPage();
  const calls=[];
  await page.evaluateOnNewDocument(()=>{
   window.__nativeCalls=[];
   window.NadmoGame={postMessage:str=>window.__nativeCalls.push(JSON.parse(str))};
  });
  for(const w of [320,390,430]){
   await page.setViewport({width:w,height:850,deviceScaleFactor:1,isMobile:true,hasTouch:true});
   await page.goto('file://'+appFile,{waitUntil:'domcontentloaded'});
   await page.$eval('#adult',el=>{if(!el.checked)el.click()});
   await page.locator('nav button[data-tab="studio"]').click();
   await page.locator('#liveModeGrid [data-live-mode="gaming"]').click();
   assert.equal(await page.$eval('#createRoom',el=>el.disabled),false,'Android GAME mode should enable native CTA');
   assert.equal(await page.$eval('#studio .viewfinder',el=>getComputedStyle(el).display),'none','Game setup must not show duplicate camera');
   await page.$eval('#title',el=>{el.value='NADMO Game QA';el.dispatchEvent(new Event('input',{bubbles:true}))});
   await page.locator('#createRoom').click();
   const sent=await page.evaluate(()=>window.__nativeCalls.find(x=>x.type==='start'));
   assert.ok(sent&&sent.game==='Mobile Legends'&&sent.title==='NADMO Game QA','Native start payload');
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('nadmo-game-status',{detail:{state:'live',message:'LIVE',room:'abc123'}})));
   assert.equal(await page.$eval('#gameLaunchGame',el=>el.hidden),false);
   assert.equal(await page.$eval('#gameShareRoom',el=>el.hidden),false);
   assert.equal(await page.$eval('#gameStopLive',el=>el.hidden),false);
   assert.equal(await page.$eval('#createRoom',el=>el.disabled),true);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),'Horizontal overflow at width '+w);
   if(w===390)await page.screenshot({path:path.resolve(__dirname,'nadmo-game-mobile-qc.png'),fullPage:true});
   console.log('PASS GAME UI '+w+'px');
  }
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('nadmo-game-status',{detail:{state:'stopped',message:'Selesai',room:''}})));
  assert.equal(await page.$eval('#gameLaunchGame',el=>el.hidden),true);
  console.log('PASS real bridge payload, game state, compact layout and legacy navigation');
 }finally{await browser.close()}
})().catch(e=>{console.error('GAME_UI_FAIL',e);process.exitCode=1});
