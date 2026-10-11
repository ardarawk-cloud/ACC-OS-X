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
  assert.deepEqual(outcome.portrait,{classSet:false,aspect:'720:1280',fit:'cover'},
    'true PORTRAIT capture must fill the screen');
  console.log('MOBILE_CAMERA_ASPECT_AND_HOST_THEME_PASS '+JSON.stringify(outcome));
 }finally{await browser.close()}
})().catch(e=>{console.error('MOBILE_CAMERA_ASPECT_AND_HOST_THEME_FAIL',e.stack||e);process.exitCode=1});
