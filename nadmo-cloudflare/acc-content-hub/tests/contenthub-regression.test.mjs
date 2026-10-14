import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

const legacy = {ASSETS:{fetch:async request=>new Response('ORIGINAL_ASSET:'+new URL(request.url).pathname,{status:200})}};
test('original Content Hub health response remains unchanged',async()=>{
 const r=await worker.fetch(new Request('https://contenthub.nadmo.id/api/_healthcheck'),legacy);
 assert.equal(r.status,200);
 assert.deepEqual(await r.json(),{ok:true,service:'nadmo-cloudflare'});
});
test('legacy Content Hub routes are passed through untouched',async()=>{
 for(const path of ['/','/index.html','/app.js','/api/realtime/test']){
  const r=await worker.fetch(new Request('https://contenthub.nadmo.id'+path),legacy);
  assert.equal(await r.text(),'ORIGINAL_ASSET:'+path);
 }
});
test('social API fails closed rather than returning static HTML without auth',async()=>{
 const r=await worker.fetch(new Request('https://contenthub.nadmo.id/api/social/jobs'),legacy);
 assert.equal(r.status,503);
 assert.equal((await r.json()).error.code,'NOT_CONFIGURED');
});
