'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev';
const author='sociala'+crypto.randomUUID().replaceAll('-','').slice(0,10);
const viewer='socialb'+crypto.randomUUID().replaceAll('-','').slice(0,10);
const pw='NadmoSocialShareQA!'+crypto.randomUUID();
const story='NADMO creator-first photo and video showcase '+crypto.randomUUID()+' - '+'Creator content should have room to breathe. '.repeat(8)+'THE FINAL SOCIAL CAPTION.';
const caption='Bagus untuk komunitas kreator.';
const reg=async handle=>{
 const r=await fetch(base+'/api/account/register',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},
 body:JSON.stringify({handle,name:'Creator '+handle,password:pw})});
 assert.equal(r.status,201,'registration '+handle);
 return r.headers.get('set-cookie').split(';')[0];
};
const req=(path,cookie,data)=>fetch(base+path,{method:'POST',headers:{Origin:base,Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(data)});
(async()=>{
 let authorCookie='',viewerCreated=false,postId='',page,browser;
 try{
  authorCookie=await reg(author);
  const r=await req('/api/account/posts/publish',authorCookie,{text:story});
  assert.equal(r.status,201,'creator post publication');
  postId=(await r.json()).post.id;
  browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  page=await browser.newPage();
  await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  page.on('dialog',dialog=>dialog.accept());
  const errors=[];page.on('pageerror',error=>errors.push(String(error)));
  await page.goto(base+'/app/',{waitUntil:'domcontentloaded'});
  await page.$eval('nav [data-tab="settings"]',e=>e.click());
  await page.$eval('#accountHandle',(e,value)=>e.value=value,viewer);
  await page.$eval('#accountName',e=>e.value='Viewer NADMO');
  await page.$eval('#accountPass',(e,value)=>e.value=value,pw);
  await page.$eval('#accountRegister',e=>e.click());
  await page.waitForFunction(()=>!document.querySelector('#settings').classList.contains('hide'),{timeout:20000});
  viewerCreated=true;
  await page.$eval('nav [data-tab="socialPage"]',e=>e.click());
  await page.waitForFunction(id=>!!document.querySelector('#socialPublicFeed [data-post-id="'+id+'"]'),{timeout:15000},postId);
  const selector='#socialPublicFeed [data-post-id="'+postId+'"]';
  const layout=await page.$eval(selector,card=>{
   const meta=card.querySelector('.social-stats'),avatar=card.querySelector('.social-avatar-open'),
    name=card.querySelector('.social-display-name'),actions=card.querySelector('.social-action-row'),
    caption=card.querySelector('.social-caption-more'),date=card.querySelector('.social-post-time');
   return {avatar:!!avatar,nameIsText:name?.tagName==='SPAN',date:!!date,stats:!!meta,
    actions:actions?.querySelectorAll('button').length,
    actionsWidth:Math.round(actions?.getBoundingClientRect().width||0),
    overflow:card.scrollWidth>card.clientWidth+1,expand:!!caption};
  });
  assert.equal(layout.avatar,true);assert.equal(layout.nameIsText,true);
  assert.equal(layout.date,true);assert.equal(layout.stats,true);
  assert.equal(layout.actions,3);assert.ok(layout.actionsWidth>100);
  assert.equal(layout.overflow,false);assert.equal(layout.expand,true);
  await page.$eval(selector+' .social-caption-more',e=>e.click());
  assert.equal(await page.$eval(selector,e=>e.textContent.includes('THE FINAL SOCIAL CAPTION.')),true,'see-more expands full caption');
  await page.$eval(selector+' .social-action-row button[aria-label="Bagikan postingan"]',e=>e.click());
  assert.equal(await page.$eval('#socialShareSheet',e=>!e.classList.contains('hide')),true,'bottom share sheet');
  assert.equal(await page.$eval('#socialShareCaption',e=>e.maxLength),500);
  for(const id of ['socialShareToFeed','socialShareToFriend','socialShareExternal','socialShareCopy']){
   assert.equal(await page.$eval('#'+id,e=>e.getBoundingClientRect().height>=40),true,id);
  }
  await page.$eval('#socialShareCaption',(e,value)=>e.value=value,caption);
  await page.$eval('#socialShareToFeed',e=>e.click());
  await page.waitForFunction(()=>document.querySelector('#socialShareSheet').classList.contains('hide'),{timeout:18000});
  await page.$eval('nav [data-tab="settings"]',e=>e.click());
  await page.waitForFunction(note=>document.querySelector('#meRepostedFeed')?.textContent.includes(note),{timeout:12000},caption);
  const saved=await page.evaluate(async()=>await(await fetch('/api/social/reposts/me')).json());
  assert.equal(saved.reposts[0].caption,caption);
  assert.equal(saved.reposts[0].original.id,postId);
  assert.equal(await page.$eval('#meRepostedFeed .social-repost-note',e=>e.textContent),caption);
  await page.$eval('#meRepostedFeed .social-remove-repost',e=>e.click());
  await page.waitForFunction(()=>document.querySelector('#meRepostArea').classList.contains('hide'),{timeout:12000});
  const removed=await page.evaluate(async()=>await(await fetch('/api/social/reposts/me')).json());
  assert.equal(removed.reposts.length,0);
  await page.$eval('nav [data-tab="socialPage"]',e=>e.click());
  await page.waitForFunction(id=>!!document.querySelector('#socialPublicFeed [data-post-id="'+id+'"]'),{timeout:15000},postId);
  await page.$eval(selector+' .social-action-row button[aria-label="Bagikan postingan"]',e=>e.click());
  await page.$eval('#socialShareClose',e=>e.click());
  assert.equal(await page.$eval('#socialShareSheet',e=>e.classList.contains('hide')),true);
  assert.deepEqual(errors,[],'No browser errors');
  console.log('PASS mobile content-first feed, expanded caption, share sheet, repost caption, ME and removal');
 }finally{
  if(viewerCreated&&page)await page.evaluate(password=>fetch('/api/account/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})}),pw).catch(()=>{});
  if(authorCookie)await req('/api/account/delete',authorCookie,{password:pw}).catch(()=>{});
  if(browser)await browser.close();
 }
})().catch(e=>{console.error('SOCIAL_SHARE_MOBILE_QA_FAIL',e.stack||e);process.exitCode=1});
