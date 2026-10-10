'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const base='https://live.nadmo.id';
const a='navprofilea'+crypto.randomUUID().replaceAll('-','').slice(0,9);
const b='navprofileb'+crypto.randomUUID().replaceAll('-','').slice(0,9);
const password='NadmoNavQA!'+crypto.randomUUID();
const cookies=[];
const action=(route,cookie,body)=>fetch(base+route,{
 method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},
 body:JSON.stringify(body)
});
async function register(handle,name){
 const r=await action('/api/account/register','',{handle,name,password});
 assert.equal(r.status,201,'register QA account '+handle);
 const cookie=r.headers.get('set-cookie').split(';')[0];cookies.push(cookie);
 return cookie;
}
(async()=>{
 let browser;
 try{
  const [cookieA,cookieB]=await Promise.all([register(a,'Navigator A'),register(b,'Navigator B')]);
  assert.equal((await action('/api/account/follow',cookieA,{handle:b})).status,200,'A follows B');
  assert.equal((await action('/api/account/follow',cookieB,{handle:a})).status,200,'B follows A');
  assert.equal((await action('/api/messages/send',cookieB,{handle:a,text:'Halo dari B. Cek profil di PESAN.'})).status,201,'B messages A');
  browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
    args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  const [name,value]=cookieA.split('=');await page.setCookie({name,value,url:base,httpOnly:true});
  await page.goto(base+'/app/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.querySelector('#meSigned').classList.contains('hide'),{timeout:16000});
  await page.$eval('nav [data-tab="settings"]',e=>e.click());
  await page.$eval('#meFollowers',e=>e.click());
  await page.waitForFunction(()=>document.querySelectorAll('#socialConnectionsList .me-connection-person').length===1,{timeout:14000});
  assert.equal(await page.$eval('#socialConnectionsTitle',e=>e.textContent),'FOLLOWERS');
  const separateFollow=await page.$eval('.me-connection-row',e=>({
    identity:e.querySelectorAll('button.me-connection-person').length,
    follow:e.querySelectorAll('button.social-follow-btn').length,
    label:e.querySelector('.me-connection-name strong')?.textContent
  }));
  assert.deepEqual(separateFollow,{identity:1,follow:1,label:'Navigator B'});
  await page.$eval('.me-connection-person .me-connection-avatar',e=>e.click());
  await page.waitForFunction(()=>!document.querySelector('#publicProfilePage').classList.contains('hide'),{timeout:12000});
  await page.waitForFunction(()=>document.querySelector('#publicCreatorName').textContent==='Navigator B',{timeout:14000});
  await page.$eval('#publicProfileBack',e=>e.click());
  assert.equal(await page.$eval('#socialConnectionsPage',e=>!e.classList.contains('hide')),true,'Back returns to follower list');
  await page.$eval('#socialConnectionsPage .subBack',e=>e.click());
  await page.$eval('#meFollowing',e=>e.click());
  await page.waitForFunction(()=>document.querySelectorAll('#socialConnectionsList .me-connection-person').length===1,{timeout:12000});
  assert.equal(await page.$eval('#socialConnectionsTitle',e=>e.textContent),'FOLLOWING');
  await page.$eval('.me-connection-name strong',e=>e.click());
  await page.waitForFunction(()=>!document.querySelector('#publicProfilePage').classList.contains('hide'),{timeout:12000});
  assert.equal(await page.$eval('#publicCreatorHandle',e=>e.textContent),'@'+b);
  await page.$eval('#publicProfileBack',e=>e.click());
  assert.equal(await page.$eval('#socialConnectionsPage',e=>!e.classList.contains('hide')),true,'Following returns to list');
  await page.$eval('nav [data-tab="messagesPage"]',e=>e.click());
  await page.waitForFunction(()=>!!document.querySelector('.message-chat-row .message-profile-tap'),{timeout:14000});
  await page.$eval('.message-chat-row .message-profile-tap',e=>e.click());
  await page.waitForFunction(()=>!document.querySelector('#publicProfilePage').classList.contains('hide'),{timeout:12000});
  assert.equal(await page.$eval('#publicCreatorName',e=>e.textContent),'Navigator B');
  await page.$eval('#publicProfileBack',e=>e.click());
  assert.equal(await page.$eval('#messagesPage',e=>!e.classList.contains('hide')),true,'Profile back returns to inbox');
  await page.waitForFunction(()=>!!document.querySelector('.message-chat-name'),{timeout:14000});
  await page.$eval('.message-chat-name',e=>e.click());
  await page.waitForFunction(()=>!document.querySelector('#publicProfilePage').classList.contains('hide'),{timeout:12000});
  await page.$eval('#publicProfileBack',e=>e.click());
  await page.waitForFunction(()=>!!document.querySelector('.message-chat-row'),{timeout:14000});
  await page.$eval('.message-chat-row',e=>e.click());
  await page.waitForFunction(()=>!document.querySelector('#messageConversation').classList.contains('hide'),{timeout:14000});
  await page.$eval('#messageOpenCreator',e=>e.click());
  await page.waitForFunction(()=>!document.querySelector('#publicProfilePage').classList.contains('hide'),{timeout:14000});
  await page.$eval('#publicProfileBack',e=>e.click());
  await page.waitForFunction(()=>!document.querySelector('#messageConversation').classList.contains('hide'),{timeout:14000});
  assert.equal(await page.$eval('#messageThreadTitle',e=>e.textContent),'Navigator B');
  const compact=await page.evaluate(()=>({
    noAccessBanner:!document.querySelector('#studio')?.textContent.includes('AKSES AWAL'),
    noPublicGratis:!document.querySelector('#studio')?.textContent.includes('PUBLIC / GRATIS'),
    goLivePreserved:!!document.querySelector('nav button.broadcast'),
    widthOk:document.documentElement.scrollWidth<=innerWidth+2
  }));
  assert.deepEqual(compact,{noAccessBanner:true,noPublicGratis:true,goLivePreserved:true,widthOk:true});
  assert.deepEqual(errors,[],'no browser errors');
  console.log('PASS followers/following photo+name -> ME; inbox photo/name -> ME; header -> ME -> chat; no studio tutorials on mobile');
 }finally{
  if(browser)await browser.close();
  for(const cookie of cookies){
   const res=await action('/api/account/delete',cookie,{password});
   assert.equal(res.status,200,'remove QA account');
  }
 }
})().catch(e=>{console.error('PROFILE_NAV_MOBILE_QA_FAIL',e.stack||e);process.exitCode=1});
