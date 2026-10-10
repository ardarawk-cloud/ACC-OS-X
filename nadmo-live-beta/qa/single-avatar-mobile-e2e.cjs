'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const A='avatarone'+crypto.randomUUID().replaceAll('-','').slice(0,8);
const B='avatartwo'+crypto.randomUUID().replaceAll('-','').slice(0,8);
const password='AvatarSingleQA!'+crypto.randomUUID();
const cookieJar=[];
const reg=async(handle,name)=>{
 const response=await fetch(base+'/api/account/register',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},
  body:JSON.stringify({handle,name,password})});
 assert.equal(response.status,201,'registration '+handle);
 const cookie=response.headers.get('set-cookie').split(';')[0];
 cookieJar.push(cookie);return cookie;
};
const post=(path,cookie,body)=>fetch(base+path,{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
const openSession=async(browser,cookie)=>{
 const page=await browser.newPage();
 await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 const [name,value]=cookie.split('=');
 await page.setCookie({url:base,name,value,httpOnly:true});
 await page.goto(base+'/app/',{waitUntil:'domcontentloaded'});
 return page;
};
(async()=>{
 let browser,authorPage,viewerPage;
 try{
  const author=await reg(A,'Creator Photo QA'),viewer=await reg(B,'Viewer No Photo QA');
  browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
   headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  authorPage=await openSession(browser,author);
  const uploaded=await authorPage.evaluate(async()=>{
   const canvas=document.createElement('canvas');canvas.width=120;canvas.height=120;
   const c=canvas.getContext('2d');c.fillStyle='#d56f28';c.fillRect(0,0,120,120);
   c.fillStyle='#254a81';c.fillRect(20,20,80,80);
   const jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.85));
   const r=await fetch('/api/account/avatar',{method:'PUT',headers:{'Content-Type':'image/jpeg'},body:jpeg});
   return {status:r.status,data:await r.json()};
  });
  assert.equal(uploaded.status,200,'real photo uploaded');
  assert.ok(uploaded.data.avatarVersion>0,'avatar version set');
  const story='Avatar photo-only post '+A;
  const photoPost=await post('/api/account/posts/publish',author,{text:story});
  assert.equal(photoPost.status,201);
  const photoPostId=(await photoPost.json()).post.id;
  const letterPost=await post('/api/account/posts/publish',viewer,{text:'Fallback-only post '+B});
  assert.equal(letterPost.status,201);
  const letterPostId=(await letterPost.json()).post.id;
  assert.equal((await post('/api/messages/send',author,{handle:B,text:'Halo, cek foto profil PESAN!'})).status,201);
  viewerPage=await openSession(browser,viewer);
  const errors=[];viewerPage.on('pageerror',e=>errors.push(e.message));
  await viewerPage.waitForFunction(()=>!document.querySelector('#messagesSigned')?.classList.contains('hide'),{timeout:20000});
  await viewerPage.$eval('nav [data-tab="socialPage"]',e=>e.click());
  const socialSelector='#socialPublicFeed [data-post-id="'+photoPostId+'"] .social-avatar-open';
  const letterSelector='#socialPublicFeed [data-post-id="'+letterPostId+'"] .social-avatar-open';
  await viewerPage.waitForFunction(sel=>{
   const el=document.querySelector(sel),img=el?.querySelector('img');
   return !!img&&img.complete&&img.naturalWidth>0&&!img.hidden;
  },{timeout:17000},socialSelector);
  const visual=await viewerPage.evaluate(({socialSelector,letterSelector})=>{
   const check=selector=>{
    const node=document.querySelector(selector);
    if(!node)return null;
    const img=node.querySelector('img'),fallback=node.querySelector('.social-avatar-fallback');
    const bounds=el=>{const r=el.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)}};
    return {tap:bounds(node),image:img?bounds(img):null,imageCount:node.querySelectorAll('img').length,
     imageLoaded:!!img&&img.complete&&img.naturalWidth>0&&!img.hidden,
     fallbackHidden:!!fallback?.hidden,fallbackDisplay:fallback?getComputedStyle(fallback).display:null,
     fallbackText:fallback?.textContent};
   };
   return {photo:check(socialSelector),letter:check(letterSelector),
    overflow:document.documentElement.scrollWidth>window.innerWidth+2};
  },{socialSelector,letterSelector});
  assert.deepEqual(visual.photo.tap,{w:40,h:40});
  assert.deepEqual(visual.photo.image,{w:29,h:29});
  assert.equal(visual.photo.imageCount,1);
  assert.equal(visual.photo.imageLoaded,true);
  assert.equal(visual.photo.fallbackHidden,true);
  assert.equal(visual.photo.fallbackDisplay,'none','initial must disappear when photo is loaded');
  assert.equal(visual.letter.imageCount,0);
  assert.equal(visual.letter.fallbackText,'V');
  assert.equal(visual.letter.fallbackHidden,false);
  assert.notEqual(visual.letter.fallbackDisplay,'none');
  assert.equal(visual.overflow,false);
  await viewerPage.$eval('nav [data-tab="messagesPage"]',e=>e.click());
  await viewerPage.waitForFunction(()=>!!document.querySelector('.message-chat-row'),{timeout:14000});
  await viewerPage.waitForFunction(()=>{
   const img=document.querySelector('.message-chat-row .message-chat-avatar img');
   return !!img&&img.complete&&img.naturalWidth>0&&!img.hidden;
  },{timeout:17000});
  const messenger=await viewerPage.$eval('.message-chat-row .message-chat-avatar',el=>{
   const img=el.querySelector('img'),fallback=el.querySelector('.message-avatar-fallback');
   const bounds=node=>{const r=node.getBoundingClientRect();return {w:Math.round(r.width),h:Math.round(r.height)}};
   return {parent:bounds(el),photo:bounds(img),photoCount:el.querySelectorAll('img').length,
    fallbackHidden:fallback.hidden,fallbackDisplay:getComputedStyle(fallback).display};
  });
  assert.deepEqual(messenger.parent,{w:48,h:48});
  assert.deepEqual(messenger.photo,{w:48,h:48});
  assert.equal(messenger.photoCount,1);
  assert.equal(messenger.fallbackHidden,true);
  assert.equal(messenger.fallbackDisplay,'none','MOSHI initial must not stack above uploaded photo');
  await viewerPage.$eval('.message-chat-row',el=>el.click());
  await viewerPage.waitForFunction(()=>!document.querySelector('#messageConversation').classList.contains('hide'),{timeout:10000});
  await viewerPage.waitForFunction(()=>{
   const img=document.querySelector('#messagePeerAvatar img');return !!img&&img.complete&&img.naturalWidth>0&&!img.hidden;
  },{timeout:14000});
  assert.equal(await viewerPage.$eval('#messagePeerAvatar .message-avatar-fallback',el=>getComputedStyle(el).display),'none');
  assert.deepEqual(errors,[]);
  console.log('PASS single photo vs fallback: real accounts and avatar upload in SOSIAL, PESAN inbox and chat header');
 }finally{
  if(browser)await browser.close();
  for(const cookie of cookieJar){
   const r=await post('/api/account/delete',cookie,{password});
   assert.equal(r.status,200,'remove QA account');
  }
 }
})().catch(e=>{console.error('SINGLE_AVATAR_MOBILE_QA_FAIL',e.stack||e);process.exitCode=1});
