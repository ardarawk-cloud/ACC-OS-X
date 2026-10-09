'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev/app/';
const handle='cropqa'+crypto.randomUUID().replaceAll('-','').slice(0,12);
const password='NadmoCropQA!'+crypto.randomUUID();
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 let page,created=false;
 try{
  page=await browser.newPage();
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.click('nav [data-tab="settings"]');
  await page.$eval('#accountHandle',(el,v)=>el.value=v,handle);
  await page.$eval('#accountName',el=>el.value='NADMO Crop QC');
  await page.$eval('#accountPass',(el,v)=>el.value=v,password);
  await page.click('#accountRegister');
  await page.waitForFunction(()=>!document.querySelector('#settings').classList.contains('hide'),{timeout:20000});
  created=true;

  const selectPhoto=()=>page.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=820;canvas.height=500;
   const context=canvas.getContext('2d');context.fillStyle='#a94444';context.fillRect(0,0,410,500);
   context.fillStyle='#4497cc';context.fillRect(410,0,410,500);
   context.fillStyle='#ffffff';context.fillRect(250,120,320,300);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.9));
   const input=document.getElementById('avatarFile'),dt=new DataTransfer();
   dt.items.add(new File([blob],'avatar-photo.jpg',{type:'image/jpeg'}));
   input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await selectPhoto();
  await page.waitForFunction(()=>!document.querySelector('#avatarCropModal').classList.contains('hide'),{timeout:10000});
  assert.equal(await page.$eval('#avatarCropSave',e=>e.textContent.trim()),'SIMPAN FOTO');
  assert.equal(await page.$eval('#avatarCropZoom',e=>e.value),'1');
  let pixels=await page.$eval('#avatarCropCanvas',e=>e.toDataURL());
  await page.$eval('#avatarCropZoom',el=>{el.value='1.5';el.dispatchEvent(new Event('input',{bubbles:true}))});
  assert.equal(await page.$eval('#avatarCropZoomText',e=>e.textContent),'150%');
  assert.notEqual(await page.$eval('#avatarCropCanvas',e=>e.toDataURL()),pixels,'Zoom changes crop preview');
  pixels=await page.$eval('#avatarCropCanvas',e=>e.toDataURL());
  await page.$eval('#avatarCropCanvas',canvas=>{
   const rect=canvas.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
   const event=(type,xpos,ypos)=>new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:51,pointerType:'touch',isPrimary:true,clientX:xpos,clientY:ypos,button:0});
   canvas.dispatchEvent(event('pointerdown',x,y));
   canvas.dispatchEvent(event('pointermove',x+60,y+35));
   canvas.dispatchEvent(event('pointerup',x+60,y+35));
  });
  assert.notEqual(await page.$eval('#avatarCropCanvas',e=>e.toDataURL()),pixels,'Drag changes crop position');
  await page.click('#avatarCropCancel');
  assert.equal(await page.$eval('#avatarCropModal',e=>e.classList.contains('hide')),true,'Cancel closes without uploading');
  const before=await page.evaluate(async()=> (await(await fetch('/api/account/me')).json()).account.avatarVersion||0);
  assert.equal(before,0,'Cancel does not persist avatar');
  await selectPhoto();
  await page.waitForFunction(()=>!document.querySelector('#avatarCropModal').classList.contains('hide'),{timeout:10000});
  await page.click('#avatarCropSave');
  await page.waitForFunction(()=>document.querySelector('#avatarCropModal').classList.contains('hide')&&document.querySelector('#avatarUploadStatus').textContent.includes('berhasil'),{timeout:30000});
  const version=await page.evaluate(async()=>{
   const me=await(await fetch('/api/account/me')).json();
   const profile=await(await fetch('/api/profile/'+me.account.handle)).json();
   return profile.profile.avatarVersion;
  });
  assert.ok(version>0,'Server returned avatar version');
  const image=await page.evaluate(async h=>{
   const r=await fetch('/api/profile/'+h+'/avatar');
   return {status:r.status,contentType:r.headers.get('content-type'),bytes:(await r.arrayBuffer()).byteLength};
  },handle);
  assert.equal(image.status,200);assert.ok(image.contentType.includes('image/jpeg'));assert.ok(image.bytes>100);
  assert.deepEqual(errors,[],'No uncaught JavaScript errors');
  console.log('PASS mobile crop modal, zoom, drag, cancel, image upload and server persistence');
 }finally{
  if(created&&page)await page.evaluate(pw=>fetch('/api/account/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})}),password).catch(()=>{});
  await browser.close();
 }
})().catch(err=>{console.error('MOBILE_CROP_QA_FAIL',err.stack||err);process.exitCode=1});
