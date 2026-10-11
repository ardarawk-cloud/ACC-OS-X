'use strict';
// Same host, all viewer skins: computed LIVE colors must stay identical.
// These are browser checks, not physical Android/WebView QC.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const puppeteer=require('puppeteer-core');
const themes=['nadmo','electric','noir','cyberbw','retro'];
const accents={nadmo:'rgb(215, 255, 54)',electric:'rgb(109, 244, 255)',
 noir:'rgb(234, 208, 185)',cyberbw:'rgb(244, 244, 244)',retro:'rgb(255, 180, 219)'};
const selectors=['#watch','#watchTitle','#watchRoomSubtitle','#hostProfileCard','.onair-label',
 '#mobileLiveHud','#message','#send','#tipQuick','#giftQuick','#moreQuick',
 '#joinGuestVoice','#joinGuestCamera','#hostMicToggle','#chat','#chat div','#chat b',
 '#hostAccessPanel','#privatePrice','#privateCode','#viewerTipPanel','#tipPresets button',
 '#liveSettingsPanel','#settingsCamera','#settingsRecover','#hostProfilePanel',
 '#hostProfilePanel .profile-business-link','#hostProfilePanel .sheet-close',
 '.stage-guest-tile','.stage-tag','.stage-guest-tip','.stage-slot-number'];
(async()=>{
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/usr/bin/google-chrome',
  headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();
  const html=fs.readFileSync(path.resolve(__dirname,'../public/app/index.html'),'utf8');
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  // Give the app a storage-capable HTTP origin; keep this test offline and
  // prevent fixture actions from touching any accounts or live rooms.
  await page.setRequestInterception(true);
  page.on('request',req=>req.respond(req.isNavigationRequest()?
   {status:200,contentType:'text/html',body:html}:
   {status:404,contentType:'application/json',body:'{}'}));
  await page.goto('http://nadmo-live-qc.test/app/',{waitUntil:'domcontentloaded'});
  let combinations=0;
  for(const scenario of [{name:'phone-camera',width:390,height:844,game:false},
   {name:'PC-camera',width:1280,height:800,game:false},
   {name:'phone-GAME',width:390,height:844,game:true},
   {name:'PC-GAME',width:1280,height:800,game:true}]){
   await page.setViewport({width:scenario.width,height:scenario.height,isMobile:scenario.width<800,hasTouch:scenario.width<800});
   for(const hostTheme of themes){
    let expected;
    for(const viewerTheme of themes){
     const result=await page.evaluate(({scenario,hostTheme,viewerTheme,selectors})=>{
      const watch=document.querySelector('#watch');
      watch.classList.remove('hide');
      document.documentElement.dataset.nadmoUiTheme=viewerTheme;
      watch.dataset.hostTheme=hostTheme;
      document.body.classList.remove('watch-clean','watch-host');
      document.body.classList.add('live-immersive','watch-viewer');
      document.body.classList.toggle('watch-game',scenario.game);
      const remote=document.querySelector('#remote');
      Object.defineProperty(remote,'videoWidth',{configurable:true,get:()=>1280});
      Object.defineProperty(remote,'videoHeight',{configurable:true,get:()=>720});
      remote.dispatchEvent(new Event('loadedmetadata'));
      document.querySelector('#hostProfilePanel .host-public-links').innerHTML='<a class="profile-business-link" href="#">Host link</a>';
      document.querySelector('#chat').innerHTML='<div><b>Viewer</b>: Live message</div>';
      document.querySelector('#guestStageGrid').innerHTML='<div class="stage-guest-tile"><small class="stage-tag">Guest · MIC ON</small><button class="stage-guest-tip">Rp</button><span class="stage-slot-number">01</span></div>';
      const colors={};
      for(const selector of selectors){
       const el=watch.querySelector(selector)||document.querySelector(selector);
       if(!el)throw new Error('Missing fixture selector '+selector);
       const css=getComputedStyle(el);
       colors[selector]={color:css.color,background:css.backgroundColor,
        border:css.borderTopColor,backgroundImage:css.backgroundImage,shadow:css.boxShadow};
      }
      const media=[remote,document.querySelector('#gameRemoteFace')].map(el=>{
       const filters=[];for(let node=el;node;node=node.parentElement)filters.push(getComputedStyle(node).filter);
       const css=getComputedStyle(el),rect=el.getBoundingClientRect();
       return {filters,fit:css.objectFit,width:rect.width,height:rect.height};
      });
      return {colors,media,hudColor:getComputedStyle(document.querySelector('#mobileLiveHud')).color,
       hudDisplay:getComputedStyle(document.querySelector('#mobileLiveHud')).display,
       deckStroke:getComputedStyle(document.querySelector('.deck-shell-svg [stroke]')).stroke,
       neon:getComputedStyle(watch).getPropertyValue('--neon').trim()};
     },{scenario,hostTheme,viewerTheme,selectors});
     const label=scenario.name+' host='+hostTheme+' viewer='+viewerTheme;
     if(expected)assert.deepEqual(result,expected,'viewer skin changed LIVE appearance: '+label);
     else expected=result;
     if(!scenario.game&&scenario.width<800)assert.equal(result.hudColor,accents[hostTheme],label+' HUD accent');
     assert.equal(result.hudDisplay,!scenario.game&&scenario.width<800?'block':'none',label+' phone HUD visibility');
     assert.equal(result.deckStroke,accents[hostTheme],label+' PC deck accent');
     for(const media of result.media)assert.ok(media.filters.every(v=>v==='none'),label+' must not filter video pixels');
     assert.equal(result.media[0].fit,'contain',label+' landscape frame must be preserved');
     combinations++;
    }
   }
  }
  assert.deepEqual(errors,[],'app script must execute at the fixture origin');
  console.log('HOST_THEME_VIEWER_ISOLATION_PASS '+JSON.stringify({combinations,scenarios:4,hostThemes:5,viewerThemes:5,
   colors:'text/panels/fields/buttons/chat/guest tiles',video:'no filters; landscape contain; stable geometry',physicalAndroid:'not tested'}));
 }finally{await browser.close()}
})().catch(e=>{console.error('HOST_THEME_VIEWER_ISOLATION_FAIL',e.stack||e);process.exitCode=1});
