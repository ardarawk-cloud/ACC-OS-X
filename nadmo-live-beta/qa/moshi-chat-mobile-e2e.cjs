'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const a='moshia'+crypto.randomUUID().replaceAll('-','').slice(0,10);
const b='moshib'+crypto.randomUUID().replaceAll('-','').slice(0,10);
const password='NadmoMoshiUI!'+crypto.randomUUID();
const cookies=[];
async function reg(handle){
 const r=await fetch(base+'/api/account/register',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},
 body:JSON.stringify({handle,name:'MOSHI '+handle,password})});
 assert.equal(r.status,201);
 const cookie=r.headers.get('set-cookie').split(';')[0];cookies.push(cookie);return cookie;
}
async function action(path,cookie,body){return fetch(base+path,{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(body)})}
(async()=>{
 let browser,page;
 try{
  const sender=await reg(a),recipient=await reg(b);
  assert.equal((await action('/api/messages/send',sender,{handle:b,text:'Halo dari teman NADMO!'})).status,201);
  browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,
   args:['--no-sandbox','--disable-dev-shm-usage']});
  page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const [name,value]=recipient.split('=');await page.setCookie({name,value,url:base,httpOnly:true});
  await page.goto(base+'/app/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#messagesSigned')&&!document.querySelector('#messagesSigned').classList.contains('hide'),{timeout:17000});
  await page.$eval('nav [data-tab="messagesPage"]',e=>e.click());
  await page.waitForFunction(()=>!!document.querySelector('.message-chat-row'),{timeout:14000});
  const ui=await page.evaluate(()=>{
   const row=document.querySelector('.message-chat-row'),name=row.querySelector('.message-chat-name');
   return {label:name?.textContent,hasAvatar:!!row.querySelector('.message-chat-avatar'),
    hasLast:!!row.querySelector('.message-chat-last'),hasTime:!!row.querySelector('.message-chat-time'),
    hasUnread:!!row.querySelector('.message-unread-pill'),
    badge:document.querySelector('#messageUnreadBadge')?.textContent,
    newPanelHidden:document.querySelector('#messageNewPanel').classList.contains('hide'),
    oldRequestButton:!!document.querySelector('button#messageRequest')?.textContent.includes('MINTA'),
    horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth+2};
  });
  assert.equal(ui.label,'MOSHI '+a);
  assert.equal(ui.hasAvatar,true);assert.equal(ui.hasLast,true);assert.equal(ui.hasTime,true);
  assert.equal(ui.hasUnread,true);assert.equal(ui.badge,'1');
  assert.equal(ui.newPanelHidden,true);assert.equal(ui.oldRequestButton,false);assert.equal(ui.horizontalOverflow,false);
  await page.$eval('.message-chat-row',el=>el.click());
  await page.waitForFunction(()=>!document.querySelector('#messageConversation').classList.contains('hide'),{timeout:15000});
  assert.equal(await page.$eval('#messageThreadTitle',el=>el.textContent),'MOSHI '+a);
  assert.equal(await page.$eval('#messageBubbles .message-bubble',el=>el.textContent.includes('Halo dari teman')),true);
  assert.equal(await page.$eval('#messageBubbles .message-bubble .message-bubble-time',el=>el.textContent.length>0),true);
  // Opening a thread triggers a server-side read event. Wait for fresh unread count,
  // rather than checking the badge before the asynchronous server round trip finishes.
  await page.waitForFunction(()=>document.querySelector('#messageUnreadBadge').hidden,{timeout:12000});
  assert.equal(await page.$eval('#messageUnreadBadge',el=>el.hidden),true,'opening clears badge after server read');
  await page.$eval('#messageBody',el=>el.value='Balasan cepat dari PESAN');
  await page.$eval('#messageSend',el=>el.click());
  await page.waitForFunction(()=>document.querySelector('#messageBubbles').textContent.includes('Balasan cepat dari PESAN'),{timeout:14000});
  await page.$eval('#messageBack',el=>el.click());
  await page.$eval('#messageNewToggle',el=>el.click());
  assert.equal(await page.$eval('#messageNewPanel',el=>!el.classList.contains('hide')),true,'+ opens compact contact search');
  await page.$eval('#messagePrivacyMode',el=>{el.value='requests';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.waitForFunction(()=>document.querySelector('#messageInboxStatus').textContent.includes('Persetujuan dahulu'),{timeout:14000});
  const preference=await page.evaluate(async()=> (await(await fetch('/api/messages/settings')).json()).privacy);
  assert.equal(preference,'requests');
  assert.deepEqual(errors,[]);
  console.log('PASS compact inbox, avatars, preview, unread badge, read, chat composer, + search, user privacy');
 }finally{
  if(browser)await browser.close();
  for(const cookie of cookies){const r=await action('/api/account/delete',cookie,{password});assert.equal(r.status,200,'QA account cleanup')}
 }
})().catch(e=>{console.error('MOSHI_MOBILE_QA_FAIL',e.stack||e);process.exitCode=1});
