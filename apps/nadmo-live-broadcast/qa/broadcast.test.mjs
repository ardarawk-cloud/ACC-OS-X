import assert from 'node:assert/strict';
import worker,{validateSources,choice,update,snapshot,BroadcastHub,probeManifest} from '../worker.mjs';
import {PLAYER_HTML} from '../player.mjs';
const t=Date.now(),hosts=['primary.example.com','backup.example.com'];
const sources=[{role:'primary',url:'https://primary.example.com/live/test.m3u8'},{role:'backup',url:'https://backup.example.com/live/test.m3u8'}];
assert.equal(validateSources(sources,hosts)?.length,2);
for(const malformed of ['http://primary.example.com/live/test.m3u8','https://127.0.0.1/test.m3u8','https://primary.example.com/live/test.m3u8?token=secret','https://localhost/test.m3u8']){
 assert.equal(validateSources([{role:'primary',url:malformed},sources[1]],hosts),null);
}
const media='#EXTM3U\n#EXT-X-TARGETDURATION:4\n#EXT-X-MEDIA-SEQUENCE:3\n#EXTINF:4.0,\nsegment.ts\n';
const master='#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=300000\nlow/index.m3u8\n';
const testManifest=(body,status=200)=>probeManifest(sources[0].url,async(_url,opts)=>{
 assert.equal(opts.method,'GET');assert.equal(opts.redirect,'manual');
 return new Response(body,{status});
});
assert.equal(validateSources([{role:'primary',url:'https://127.0.0.1/live/test.m3u8'},sources[1]],['127.0.0.1',hosts[1]]),null,'even explicitly allowlisted IPv4 literals are unsafe');
assert.equal(validateSources([{role:'primary',url:'https://[::1]/live/test.m3u8'},sources[1]],['[::1]',hosts[1]]),null,'even explicitly allowlisted IPv6 literals are unsafe');
assert.equal(await testManifest('#EXTM3U\n#EXTINF:4.0,\n'),false,'media tag without a segment is not live');
assert.equal(await testManifest('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=300000\n'),false,'variant tag without a URI is not live');
assert.equal(await testManifest('#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n'),false,'initialization map is not playable media');
assert.equal(await testManifest(media),true);
assert.equal(await testManifest(master),true);
assert.equal(await testManifest('<html><body>OK</body></html>'),false,'HTTP 200 does not mean video exists');
assert.equal(await testManifest('#EXTM3U\n#EXT-X-TARGETDURATION:4\n'),false,'empty playlist is not LIVE');
assert.equal(await testManifest(media+'#EXT-X-ENDLIST\n'),false,'ended stream must not look healthy');
assert.equal(await testManifest(media,302),false,'do not follow origin redirects');
assert.equal(await testManifest('x'.repeat(40000)),false,'bound untrusted origin response');
// Browser route update must not wait for readyState to drop when old HLS buffers remain.
const inlineScript=PLAYER_HTML.split('<script>')[1]?.split('</script>')[0];
assert.ok(inlineScript);assert.doesNotThrow(()=>new Function(inlineScript));
const switchLine=inlineScript.split('\n').find(x=>x.startsWith('function shouldSwitchRoute('));
assert.ok(switchLine,'viewer must contain a route-health switch guard');
const shouldSwitchRoute=new Function(switchLine+'\nreturn shouldSwitchRoute;')();
const routeExample={roomReady:true,url:sources[1].url,sources:[{url:sources[0].url,healthy:false},{url:sources[1].url,healthy:true}]};
assert.equal(shouldSwitchRoute(routeExample,sources[0].url,4,4000),true,'switch even if old video is buffered');
assert.equal(shouldSwitchRoute(routeExample,sources[0].url,4,1000),false,'avoid instant flapping');
routeExample.sources[0].healthy=true;
assert.equal(shouldSwitchRoute(routeExample,sources[0].url,4,15000),false,'do not interrupt playable origin');
assert.equal(shouldSwitchRoute(routeExample,sources[0].url,1,15000),true,'recover buffering route');
assert.equal(shouldSwitchRoute({...routeExample,roomReady:false},sources[0].url,1,15000),false,'never switch to unready source');
const s={sources:validateSources(sources,hosts),selected:null,audit:[]};
assert.equal(choice(s,t).mode,'WAITING');
update(s,'primary',true,t);assert.equal(choice(s,t).ready,false);
update(s,'primary',true,t+1000);assert.equal(choice(s,t+1000).mode,'PRIMARY');
update(s,'backup',true,t+1100);update(s,'backup',true,t+2100);
update(s,'primary',false,t+2200);assert.equal(choice(s,t+2200).mode,'BACKUP');
update(s,'primary',true,t+2300);update(s,'primary',true,t+3300);
assert.equal(choice(s,t+3300).mode,'BACKUP','no route flapping');
assert.equal(choice(s,t+65000).mode,'DEGRADED_HOLD','missing telemetry does not pretend healthy');
const recovering={...s,changedAt:t+2200,sources:s.sources.map(x=>({...x,health:'up',success:2,checked:t+66000}))};
assert.equal(choice(recovering,t+66500).mode,'PRIMARY');
const data=new Map(),storage={get:async key=>data.get(key),put:async(key,value)=>data.set(key,value),setAlarm:async()=>{}};
const room=new BroadcastHub({storage},{ALLOWED_ORIGIN_HOSTS:hosts.join(',')});
const env={ADMIN_TOKEN:'secret-admin',PROBE_TOKEN:'secret-probe',ALLOWED_ORIGIN_HOSTS:hosts.join(','),BROADCAST_HUB:{idFromName:()=> 'test',get:()=>room}};
async function call(path,options={}){return worker.fetch(new Request('https://local.test'+path,options),env)}
let r=await call('/health');assert.equal(r.status,200);assert.equal((await r.json()).productionTouched,false);
r=await call('/api/route/demo');assert.equal((await r.json()).mode,'WAITING');
r=await call('/admin/configure/demo',{method:'POST',body:JSON.stringify({sources})});assert.equal(r.status,401);
r=await call('/admin/configure/demo',{method:'POST',headers:{authorization:'Bearer secret-admin'},body:JSON.stringify({sources})});assert.equal(r.status,200);
for(let i=0;i<2;i++)await call('/probe/demo',{method:'POST',headers:{authorization:'Bearer secret-probe','content-type':'application/json'},body:JSON.stringify({role:'primary',healthy:true})});
r=await call('/api/route/demo');assert.equal((await r.json()).mode,'PRIMARY');
for(let i=0;i<2;i++)await call('/probe/demo',{method:'POST',headers:{authorization:'Bearer secret-probe'},body:JSON.stringify({role:'backup',healthy:true})});
await call('/probe/demo',{method:'POST',headers:{authorization:'Bearer secret-probe'},body:JSON.stringify({role:'primary',healthy:false})});
r=await call('/api/route/demo');const result=await r.json();assert.equal(result.mode,'BACKUP');assert.equal(result.videoDeliveredByWorker,false);
r=await call('/admin/audit/demo');assert.equal(r.status,401);
r=await call('/admin/audit/demo',{headers:{authorization:'Bearer secret-admin'}});assert.equal(r.status,200);
assert.ok((await r.json()).events.length>0);
// Exercise the actual periodic alarm path: invalid 200 primary, valid backup.
r=await call('/admin/configure/demo',{method:'POST',headers:{authorization:'Bearer secret-admin'},body:JSON.stringify({sources})});
assert.equal(r.status,200);
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>new Response(String(url).includes('primary.example.com')?'<html>not HLS</html>':media,{status:200});
try{await room.alarm();await room.alarm()}finally{globalThis.fetch=originalFetch}
r=await call('/api/route/demo');assert.equal((await r.json()).mode,'BACKUP','do not route to fake-healthy primary');
r=await worker.fetch(new Request('https://local.test/api/route/demo'),{});assert.equal(r.status,503);
r=await worker.fetch(new Request('https://local.test/api/route/demo'),{BROADCAST_HUB:{idFromName:()=>1,get:()=>({fetch:async()=>{throw Error('storage down')}})}});assert.equal(r.status,503);
r=await call('/api/route/demo',{method:'POST'});assert.equal(r.status,405);
console.log('PASS: strict HLS manifest checks, browser buffer-resistant failover, actual alarm fallback, URL allowlist, admin/probe isolation, primary+backup, stale data, hysteresis, recovered origin, storage outage and zero media proxy');