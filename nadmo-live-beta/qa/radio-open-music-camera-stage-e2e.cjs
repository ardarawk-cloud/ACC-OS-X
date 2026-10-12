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
 assert(worker.includes("broadcastKind:['radio','gaming']"),'Worker must store host radio kind');
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
   assert(geometry.modes.includes('radio'));
   assert.equal(geometry.display,'flex','Radio artwork must be visible');
   assert(geometry.stage.width>=size.width*.88,'Radio width must be camera-sized: '+JSON.stringify(geometry));
   assert(geometry.stage.height>=size.height*.60,'Radio height must never be short GAME stage: '+JSON.stringify(geometry));
   assert(geometry.poster.width>=geometry.stage.width*.9,'Radio poster must fill camera stage');
   assert(geometry.poster.height>=geometry.stage.height*.9,'Radio poster must fill camera stage');
   assert.equal(geometry.modeColumns.trim().split(/\s+/).length,5,'Creator modes should fit a single five-column row');
   console.log('PASS RADIO portrait '+size.width+'x'+size.height+': '+Math.round(geometry.stage.width)+'x'+Math.round(geometry.stage.height));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
