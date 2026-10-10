'use strict';
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const base='https://nadmo-live-beta-20261009.ardarawk.workers.dev/app/';
const name='meone'+crypto.randomUUID().replaceAll('-','').slice(0,12);
const password='NadmoMeQA!'+crypto.randomUUID();
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 let page,created=false;
 try{
  page=await browser.newPage();await page.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.$eval('nav [data-tab="settings"]',el=>el.click());
  assert.equal(await page.$eval('#authPage',el=>!el.classList.contains('hide')),true,'Login must live outside ME');
  assert.equal(await page.$eval('#settings',el=>el.classList.contains('hide')),true,'ME cannot expose a login form');
  await page.$eval('#accountHandle',(el,v)=>el.value=v,name);
  await page.$eval('#accountName',el=>el.value='NADMO ME QA');
  await page.$eval('#accountPass',(el,v)=>el.value=v,password);
  await page.$eval('#accountRegister',el=>el.click());
  await page.waitForFunction(()=>!document.querySelector('#settings').classList.contains('hide'),{timeout:20000});
  created=true;
  const state=await page.evaluate(()=>{
   const me=document.querySelector('#settings'),wallet=me.querySelector('#meWalletOpen');
   return {walletNotOnMe:!wallet,postsNotOnMe:!me.querySelector('#profilePublishedPosts'),hasProfileLinks:!!me.querySelector('#profileBusinessLinks'),
    loginInside:!!me.querySelector('#accountLoginCard'),
    technicalSettings:!!me.querySelector('#developerOnlySettings'),
    supporterInside:!!me.querySelector('#supporterPanel'),
    composerInside:!!me.querySelector('#profilePostText'),
    horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2};
  });
  assert.deepEqual(state,{walletNotOnMe:true,postsNotOnMe:true,hasProfileLinks:true,loginInside:false,technicalSettings:false,supporterInside:false,composerInside:false,horizontalOverflow:false});
  await page.$eval('#meMore',el=>el.click());
  await page.$eval('#preferencesPage [data-open-page="walletPage"]',el=>el.click());
  assert.equal(await page.$eval('#walletPage',el=>!el.classList.contains('hide')),true);
  assert.equal(await page.$eval('#walletWithdraw',el=>el.disabled),true,'Withdraw remains disabled');
  await page.$eval('#walletPage .subBack',el=>el.click());
  assert.equal(await page.$eval('#settings',el=>!el.classList.contains('hide')),true,'Wallet back returns to ME');
  await page.$eval('#meMore',el=>el.click());
  await page.$eval('#preferencesPage [data-open-page="supporterPage"]',el=>el.click());
  await page.waitForFunction(()=>document.querySelectorAll('#supporterLevels .supporter-row').length===10,{timeout:12000});
  const badges=await page.evaluate(()=>{
   const rows=[...document.querySelectorAll('#supporterLevels .supporter-row')];
   return {count:rows.length,overflow:rows.some(r=>r.scrollWidth>r.clientWidth+1),
    width:document.documentElement.scrollWidth-innerWidth};
  });
  assert.equal(badges.count,10);assert.equal(badges.overflow,false);assert.ok(badges.width<=2);
  await page.$eval('#supporterPage .subBack',el=>el.click());
  await page.$eval('nav [data-tab="settings"]',el=>el.click());
  await page.$eval('#editProfileBtn',el=>el.click());
  assert.equal(await page.$eval('#accountPage',el=>el.textContent.includes('KELOLA POSTINGAN')),false,'Post management must not live inside EDIT PROFIL');
  assert.equal(await page.$eval('#accountPage',el=>!!el.querySelector('#profilePublishedPosts, #meNewPost')),false,'Legacy ME post controls removed');
  const themeEditor=await page.evaluate(()=>['profileTheme','profileFont','profileCover','profileLinkLabel','profileLinkUrl','profileAddLink'].every(id=>!!document.getElementById(id)&&document.getElementById(id).getBoundingClientRect().width>0));
  assert.equal(themeEditor,true,'Creator theme/font and external link editor must be visible');
  await page.$eval('#profileTheme',el=>{el.value='electric';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.$eval('#profileFont',el=>{el.value='mono';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.$eval('#profileCover',el=>{el.value='dots';el.dispatchEvent(new Event('change',{bubbles:true}))});
  await page.$eval('#profileLinkLabel',el=>el.value='My YouTube');
  await page.$eval('#profileLinkUrl',el=>el.value='https://youtube.com/@nadmolive');
  await page.$eval('#profileAddLink',el=>el.click());
  await page.$eval('#profileSave',el=>el.click());
  await page.waitForFunction(()=>document.querySelector('#profileEditStatus')?.textContent.includes('tersimpan'),{timeout:10000});
  await page.$eval('nav [data-tab="settings"]',el=>el.click());
  assert.equal(await page.$eval('#betaSocialProfile',el=>el.dataset.theme),'electric');
  assert.equal(await page.$eval('#betaSocialProfile',el=>el.dataset.font),'mono');
  assert.equal(await page.$eval('#betaSocialProfile',el=>el.dataset.cover),'dots');
  assert.equal(await page.$eval('#profileBusinessLinks',el=>el.querySelectorAll('a').length),1);
  await page.$eval('nav [data-tab="socialPage"]',el=>el.click());
  await page.$eval('#socialCompose',el=>el.click());
  const body='NADMO ONE public mobile profile smoke '+name;
  await page.$eval('#socialPostText',(el,v)=>el.value=v,body);
  await page.$eval('#socialPublish',el=>el.click());
  await page.waitForFunction(text=>document.querySelector('#socialPublicFeed').textContent.includes(text),{timeout:12000},body);
  // In both posts and reposts, the creator name is plain text and ONLY avatar opens ME.
  const cardIdentity=await page.evaluate(text=>{
   const cards=[...document.querySelectorAll('#socialPublicFeed .profile-post-card')];
   const card=cards.find(el=>el.textContent.includes(text));
   if(!card)return {exists:false};
   const imageButton=card.querySelector('.post-top button.social-avatar-open');
   const name=card.querySelector('.post-top span.social-display-name');
   const box=imageButton?.getBoundingClientRect();
   return {exists:true,avatarButton:!!imageButton,plainName:!!name,
    nameIsNotButton:name?.tagName==='SPAN',
    avatarWidth:Math.round(box?.width||0),avatarHeight:Math.round(box?.height||0),
    noGiantName:!card.querySelector('.post-top button.profile-open'),
    widthOverflow:card.scrollWidth>card.clientWidth+1};
  },body);
  assert.deepEqual(cardIdentity,{exists:true,avatarButton:true,plainName:true,nameIsNotButton:true,
   avatarWidth:40,avatarHeight:40,noGiantName:true,widthOverflow:false});
  await page.$eval('#socialPublicFeed .profile-post-card .post-top button.social-avatar-open',el=>el.click());
  assert.equal(await page.$eval('#settings',el=>!el.classList.contains('hide')),true,'Avatar opens own ME');
  await page.$eval('nav [data-tab="settings"]',el=>el.click());
  assert.equal(await page.$eval('#settings',el=>!!el.querySelector('#profilePublishedPosts')),false,'Published posts stay in SOSIAL, not ME');
  await page.$eval('nav [data-tab="socialPage"]',el=>el.click());
  await page.waitForFunction(text=>document.querySelector('#socialPublicFeed').textContent.includes(text),{timeout:12000},body);
  assert.equal(await page.$eval('#socialPublicFeed',el=>!!el.querySelector('button.btn.ghost')),true,'Owner can manage published post in SOSIAL');
  await page.$eval('#socialManageDrafts',el=>el.click());
  assert.equal(await page.$eval('#draftsPage',el=>!el.classList.contains('hide')),true,'Drafts open from SOSIAL');
  assert.equal(await page.$eval('nav [data-tab="socialPage"]',el=>el.classList.contains('active')),true,'SOSIAL remains active during drafts');
  await page.$eval('#draftsPage .subBack',el=>el.click());
  assert.equal(await page.$eval('#socialPage',el=>!el.classList.contains('hide')),true,'Back returns to SOSIAL, not ME');
  assert.deepEqual(errors,[],'No browser JavaScript crashes');
  console.log('PASS mobile ME profile, login separation, direct wallet, supporter layout, live public posts');
 }finally{
  if(created&&page)await page.evaluate(pw=>fetch('/api/account/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})}),password).catch(()=>{});
  await browser.close();
 }
})().catch(err=>{console.error('ME_ONE_QA_FAIL',err.stack||err);process.exitCode=1});
