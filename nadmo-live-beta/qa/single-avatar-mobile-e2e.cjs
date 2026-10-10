'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const photo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLhJwAAAABJRU5ErkJggg==';
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/app/',{waitUntil:'domcontentloaded'});
  const data=await page.evaluate(async photo=>{
   const stage=document.createElement('div');
   stage.style.cssText='position:fixed;top:50px;left:8px;width:360px;z-index:999;background:#080c08;padding:8px;display:flex;flex-direction:column;gap:8px';
   document.body.append(stage);
   const social=makePublicPost({id:'test-social-avatar',handle:'avatartest',name:'Avatar Test',
    avatarVersion:1,text:'Avatar layout test',status:'published',createdAt:Date.now()});
   stage.append(social);
   const socialButton=social.querySelector('.social-avatar-open');
   const socialImage=socialButton.querySelector('img');
   const socialFallback=socialButton.querySelector('.social-avatar-fallback');
   const chat=avatarNode('avatartest','Avatar Test',1);
   stage.append(chat);
   const chatImage=chat.querySelector('img');
   const chatFallback=chat.querySelector('.message-avatar-fallback');
   socialImage.src=photo;chatImage.src=photo;
   await Promise.all([socialImage.decode(),chatImage.decode()]);
   // Wait a frame for the browser to recalculate the visible state after load.
   await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
   const dimensions=el=>{const r=el.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)}};
   const socialState={
    parent:dimensions(socialButton),photo:dimensions(socialImage),fallbackHidden:socialFallback.hidden,
    fallbackDisplay:getComputedStyle(socialFallback).display,photoHidden:socialImage.hidden,
    photoDisplay:getComputedStyle(socialImage).display};
   const chatState={
    parent:dimensions(chat),photo:dimensions(chatImage),fallbackHidden:chatFallback.hidden,
    fallbackDisplay:getComputedStyle(chatFallback).display,photoHidden:chatImage.hidden};
   const withoutImage=avatarNode('avatartest','Avatar Test',0);stage.append(withoutImage);
   const initial={imageCount:withoutImage.querySelectorAll('img').length,
    fallback:withoutImage.querySelector('.message-avatar-fallback').textContent,
    fallbackHidden:withoutImage.querySelector('.message-avatar-fallback').hidden};
   // Missing photo must return to a visible letter rather than two stacked avatars.
   const broken=avatarNode('avatartest','Avatar Test',1);stage.append(broken);
   broken.querySelector('img').dispatchEvent(new Event('error'));
   const missing={imageCount:broken.querySelectorAll('img').length,
    fallbackHidden:broken.querySelector('.message-avatar-fallback').hidden};
   return {socialState,chatState,initial,missing,
    horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth+2};
  },photo);
  assert.deepEqual(data.socialState.parent,{w:40,h:40});
  assert.deepEqual(data.socialState.photo,{w:29,h:29});
  assert.equal(data.socialState.fallbackHidden,true);
  assert.equal(data.socialState.fallbackDisplay,'none');
  assert.equal(data.socialState.photoHidden,false);
  assert.notEqual(data.socialState.photoDisplay,'none');
  assert.deepEqual(data.chatState.parent,{w:48,h:48});
  assert.deepEqual(data.chatState.photo,{w:48,h:48});
  assert.equal(data.chatState.fallbackHidden,true);
  assert.equal(data.chatState.fallbackDisplay,'none');
  assert.equal(data.chatState.photoHidden,false);
  assert.deepEqual(data.initial,{imageCount:0,fallback:'A',fallbackHidden:false});
  assert.deepEqual(data.missing,{imageCount:0,fallbackHidden:false});
  assert.equal(data.horizontalOverflow,false);
  assert.deepEqual(errors,[]);
  console.log('PASS one avatar only: SOSIAL 29px in 40px target, PESAN 48px, and missing-photo fallback');
 }finally{await browser.close()}
})().catch(e=>{console.error('SINGLE_AVATAR_MOBILE_QA_FAIL',e.stack||e);process.exitCode=1});
