import assert from 'node:assert/strict';
import worker,{validateSources,choice,update,snapshot,BroadcastHub} from '../worker.mjs';
const t=Date.now(),hosts=['primary.example.com','backup.example.com'];
const sources=[{role:'primary',url:'https://primary.example.com/live/test.m3u8'},{role:'backup',url:'https://backup.example.com/live/test.m3u8'}];
assert.equal(validateSources(sources,hosts)?.length,2);
for(const malformed of ['http://primary.example.com/live/test.m3u8','https://127.0.0.1/test.m3u8','https://primary.example.com/live/test.m3u8?token=secret','https://localhost/test.m3u8']){
 assert.equal(validateSources([{role:'primary',url:malformed},sources[1]],hosts),null);
}
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
r=await worker.fetch(new Request('https://local.test/api/route/demo'),{});assert.equal(r.status,503);
r=await worker.fetch(new Request('https://local.test/api/route/demo'),{BROADCAST_HUB:{idFromName:()=>1,get:()=>({fetch:async()=>{throw Error('storage down')}})}});assert.equal(r.status,503);
r=await call('/api/route/demo',{method:'POST'});assert.equal(r.status,405);
console.log('PASS: URL allowlist, admin/probe isolation, primary+backup, stale data, hysteresis, recovered origin, storage outage and zero media proxy');