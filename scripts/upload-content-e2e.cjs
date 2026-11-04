// Isolated browser regression tests. Every external request is intercepted; no real post is created.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
const mainKey='acc_os_x_ecosystem_v214',storeKey='acc_os_x_produce_copilot_v1';
const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#020617;color:white;margin:12px}label{display:block}input,textarea,select{box-sizing:border-box;max-width:100%;width:100%;min-height:40px}button{min-height:40px}textarea{height:90px}</style>
<select id="channel-select"><option value="ch-titik-tanya">Titik Tanya</option><option value="ch-putri-ayah">Putri Ayah</option><option value="ch-techverse">TechVerse</option></select>
<main><section class="section"><div class="mission-live-card"><div class="card-title">Titik Tanya</div><div class="meta">TT • Facebook</div></div></section></main>
<script>const key='${mainKey}';if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({activeChannelId:'ch-titik-tanya',activeWorkspaceId:'acc-enterprise',settings:{publishMappings:{'ch-titik-tanya':{pageId:'123',pageName:'Test Only',connector:'META_FACEBOOK'}}}}));localStorage.setItem('acc_os_x_publish_access_v1','test-only');const select=document.getElementById('channel-select');select.value=JSON.parse(localStorage.getItem(key)).activeChannelId;select.onchange=()=>{const s=JSON.parse(localStorage.getItem(key));s.activeChannelId=select.value;localStorage.setItem(key,JSON.stringify(s));window.dispatchEvent(new CustomEvent('acc-core-rendered',{detail:{tab:'production'}}));};</script>
<script type="module">import '/produce-copilot-contract-guard-v259.js';import '/produce-copilot-v2578.js';import '/content-upload-v1.js';import '/kai-autopilot-media-drop-v1.js';import '/app-destinations-v1.js';</script>`;
const server=http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}
  if(req.url==='/api/produce-health'){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({ok:true,aiBinding:true,accessSecretConfigured:true}));}
  const file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.statusCode=404;return res.end();}
  res.setHeader('Content-Type','text/javascript');res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 ACCOSXNative/2.1 ACCOSXAndroid/1.2.5 Build14'});
  const posts=[],errors=[];let mode='mock';
  await context.route('**/*',async route=>{
    if(route.request().url().startsWith(origin))return route.continue();
    if(route.request().url().includes('acc-publish-connectorv2.')&&route.request().method()==='POST'){
      posts.push(route.request().postDataJSON());
      await page.evaluate(()=>ACCProduceCopilot.refresh()); // A UI refresh must not detach the pending receipt.
      await new Promise(r=>setTimeout(r,120));
      return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,externalPostId:mode==='mock'?'server_mock_123':'123_456'})});
    }
    return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(origin);await page.waitForFunction(()=>window.ACCProduceCopilot&&window.ACCContentUpload&&window.ACCProductionContracts&&document.querySelector('[data-owner-upload]'));
    await page.getByRole('button',{name:'UPLOAD KONTEN',exact:true}).click();
    await page.locator('input[name=poster]').setInputFiles({name:'poster.png',mimeType:'image/png',buffer:png});
    await page.locator('textarea[name=caption]').fill('Caption uji lokal — tidak diposting.');
    await page.locator('input[name=reviewed]').check();
    await page.getByRole('button',{name:'SIMPAN KONTEN',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-upload-status]')?.textContent.startsWith('Tersimpan.'));
    assert.equal(posts.length,0,'import must not publish');
    await page.getByRole('button',{name:'TUTUP',exact:true}).click();
    const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storeKey);
    const single=stored.channels['ch-titik-tanya'].package;
    assert(single.posterMediaKey);assert(!JSON.stringify(stored).includes(png.toString('base64')),'media bytes must not enter localStorage');
    await page.reload();await page.waitForFunction(()=>window.ACCProduceCopilot&&document.getElementById('acc-copilot-publish')?.disabled===false);
    assert(await page.locator('[data-media-key]').first().isVisible(),'poster must survive reload');
    await page.evaluate(()=>{const b=document.getElementById('acc-copilot-publish');b.dispatchEvent(new MouseEvent('click',{bubbles:true}));b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
    await page.waitForFunction(()=>document.getElementById('acc-copilot-status')?.textContent.includes('PUBLISH_RESPONSE_MISSING_POST_ID'));
    assert.equal(posts.length,1,'double click must issue one request');
    mode='real-format';await page.locator('#acc-copilot-publish').click();
    await page.waitForFunction(()=>document.getElementById('acc-copilot-publish')?.textContent.includes('123_456'));
    assert.equal(posts.length,2);assert.equal(posts[0].idempotencyKey,posts[1].idempotencyKey,'retry identity must remain stable');
    assert.equal(posts[1].content.imageBase64,png.toString('base64'),'publish must use original image bytes');
    const importImage=async options=>page.evaluate(async({base64,options})=>{
      const bytes=Uint8Array.from(atob(base64),x=>x.charCodeAt(0));
      try{return await ACCProduceCopilot.importOwnerPackage({file:new File([bytes],'new.png',{type:'image/png'}),caption:'Caption baru',reviewed:true,...options});}catch(error){return {error:error.message};}
    },{base64:png.toString('base64'),options});
    assert((await importImage({channelId:'ch-titik-tanya'})).error.includes('sudah terbit'));
    assert((await importImage({channelId:'ch-techverse'})).error.includes('2 URL sumber'));
    assert((await importImage({channelId:'ch-techverse',sources:['https://example.com/a','https://example.com/a#same']})).error.includes('2 URL sumber'));
    const batch=await importImage({channelId:'ch-putri-ayah',index:2});assert.equal(batch.index,2);
    await page.selectOption('#channel-select','ch-putri-ayah');
    await page.waitForFunction(()=>document.getElementById('acc-produce-copilot-panel')?.dataset.channelId==='ch-putri-ayah');
    assert.equal(await page.locator('[data-publish-item="2"]').isEnabled(),true);
    assert.equal(await page.locator('[data-publish-item="0"]').isEnabled(),false);
    // Simulate unavailable durable storage; an in-memory fallback must not masquerade as saved.
    await page.evaluate(()=>{window.originalDbOpen=indexedDB.open.bind(indexedDB);indexedDB.open=()=>{throw new Error('DISK_FULL_TEST');};});
    const failed=await importImage({channelId:'ch-putri-ayah',index:1});assert.match(failed.error,/DISK_FULL_TEST/);
    const current=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).channels['ch-putri-ayah'].package,storeKey);
    assert(!current.batchPosters[1]?.mediaKey);assert.equal(current.batchPosters[2].mediaKey,batch.mediaKey);
    const inboxFailure=await page.evaluate(async b64=>ACCKaiAutopilot.ingest([new File([Uint8Array.from(atob(b64),x=>x.charCodeAt(0))],'inbox.png',{type:'image/png',lastModified:1})]),png.toString('base64'));
    assert.equal(inboxFailure.failed,1);assert.equal(await page.evaluate(()=>ACCKaiAutopilot.getJobs().length),0);
    await page.evaluate(()=>{indexedDB.open=window.originalDbOpen;});
    const inbox=await page.evaluate(async b64=>{
      const file=new File([Uint8Array.from(atob(b64),x=>x.charCodeAt(0))],'inbox.png',{type:'application/octet-stream',lastModified:1});
      return [await ACCKaiAutopilot.ingest([file]),await ACCKaiAutopilot.ingest([file])];
    },png.toString('base64'));
    assert.equal(inbox[0].added,1);assert.equal(inbox[1].duplicates,1);
    await page.reload();await page.waitForFunction(()=>window.ACCKaiAutopilot);
    assert.equal(await page.evaluate(()=>ACCKaiAutopilot.getJobs().length),1);
    await page.locator('[data-auto-channel]').selectOption('ch-titik-tanya');await page.locator('[data-auto-assign]').click();
    await page.waitForFunction(()=>ACCKaiAutopilot.getJobs()[0].status==='HANDOFF');
    await page.locator('[data-auto-preview]').click();await page.locator('dialog img').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('dialog img')?.naturalWidth>0);await page.getByRole('button',{name:'TUTUP',exact:true}).click();
    await page.locator('[data-auto-use]').click();await page.locator('select[name=channel]').waitFor({state:'visible'});assert.equal(await page.locator('select[name=channel]').inputValue(),'ch-titik-tanya');
    const links=await page.evaluate(()=>({studio:ACCDestinations.division('studio','https://old.invalid/'),trade:ACCDestinations.resolve('https://kai-trad-pwa.ardarawk.workers.dev/test?q=1#open'),bad:ACCDestinations.resolve('javascript:alert(1)')}));
    assert.equal(links.studio,'https://comics.nadmo.id/');assert.equal(links.trade,'https://kai-sanban.nadmo.id/test?q=1#open');assert.equal(links.bad,'');
    assert.deepEqual(errors,[],'uncaught browser errors');
    console.log(JSON.stringify({pass:true,tests:['original bytes','no autopublish','reload persistence','double tap','reject mock ID','stable retry','published protection','news source gate','batch isolation','storage failure rollback','Android MIME','duplicate import','inbox preview and handoff','stale domain migration'],realPostsCreated:0}));
  }catch(error){console.error('Browser diagnostics',JSON.stringify({errors,state:await page.evaluate(()=>({produce:!!window.ACCProduceCopilot,upload:!!window.ACCContentUpload,guard:!!window.ACCProductionContracts,panel:!!document.getElementById('acc-produce-copilot-panel'),uploadButton:!!document.querySelector('[data-owner-upload]'),status:document.querySelector('[data-upload-status]')?.textContent}))}));throw error;}finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
