// End-to-end staging integration: actual MediaMTX HLS manifests + real controller state.
// CI runs this against two Docker media origins publishing synthetic test audio/video.
// The URL mapper is ONLY for localhost CI; production code still requires HTTPS and allowlisted hosts.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import worker,{BroadcastHub} from '../worker.mjs';

const originMap=new Map([
 ['primary.example.com','http://127.0.0.1:18888/live/index.m3u8'],
 ['backup.example.com','http://127.0.0.1:28888/live/index.m3u8'],
]);
const sources=[
 {role:'primary',url:'https://primary.example.com/live/index.m3u8'},
 {role:'backup',url:'https://backup.example.com/live/index.m3u8'},
];
let persisted;
const alarms=[];
const storage={
 get:async key=>key==='state'?persisted:undefined,
 put:async(key,value)=>{assert.equal(key,'state');persisted=structuredClone(value)},
 setAlarm:async when=>alarms.push(when),
};
const env={
 ALLOWED_ORIGIN_HOSTS:'primary.example.com,backup.example.com',
 ADMIN_TOKEN:'ci-admin-token',
 PROBE_TOKEN:'ci-probe-token',
};
const room=new BroadcastHub({storage},env);
env.BROADCAST_HUB={idFromName:()=> 'test',get:()=>room};
const request=async(path,init={})=>worker.fetch(new Request('https://stage.example.test'+path,init),env);
const readRoute=async()=>{const res=await request('/api/route/demo');assert.equal(res.status,200);return res.json()};
const realFetch=globalThis.fetch;
let manifestFetches=0;
globalThis.fetch=(source,opts={})=>{
 const url=new URL(source);
 const mapped=originMap.get(url.hostname);
 assert.ok(mapped,'controller must only probe allowlisted virtual origins');
 assert.equal(opts.method,'GET','HLS readiness requires inspecting a real manifest');
 assert.equal(opts.redirect,'manual','redirects should not be followed');
 manifestFetches++;
 return realFetch(mapped,opts);
};
try {
 const configure=await request('/admin/configure/demo',{method:'POST',headers:{
   authorization:'Bearer ci-admin-token','content-type':'application/json'
 },body:JSON.stringify({sources})});
 assert.equal(configure.status,200);
 assert.equal((await readRoute()).mode,'WAITING');
 await room.alarm();
 assert.equal((await readRoute()).mode,'WAITING','one successful sample must not qualify');
 await room.alarm();
 const before=await readRoute();
 assert.equal(before.mode,'PRIMARY','real HLS on primary must be preferred');
 assert.equal(before.url,sources[0].url);
 assert.equal(before.sources.every(x=>x.healthy),true,'both real origins should initially be ready');

 // The publisher remains alive and feeds backup even when the primary container dies.
 execFileSync('docker',['stop','nadmo-media-test-a'],{stdio:'ignore',timeout:30000});
 await room.alarm();
 const after=await readRoute();
 assert.equal(after.mode,'BACKUP','failed real primary must trigger backup');
 assert.equal(after.url,sources[1].url);
 assert.equal(after.sources.find(x=>x.role==='primary').healthy,false);
 assert.equal(after.sources.find(x=>x.role==='backup').healthy,true);
 const backupResponse=await realFetch(originMap.get('backup.example.com'),{redirect:'manual'});
 assert.equal(backupResponse.status,200);
 assert.match(await backupResponse.text(),/#EXTM3U/);
 assert.ok(manifestFetches>=6,'controller must have probed both real origins');
 assert.ok(alarms.length>=4,'configuration and alarms must schedule follow-up health checks');
 console.log('PASS: real MediaMTX manifests -> controller PRIMARY -> primary Docker failure -> BACKUP, HLS still playable, no production source');
} finally {
 globalThis.fetch=realFetch;
}
