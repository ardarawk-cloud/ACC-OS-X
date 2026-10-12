// Deterministic in-memory Cloudflare DO protocol regression; never touches production.
import assert from 'node:assert/strict';
import {RoomHub} from '../worker.mjs';
class MemoryStorage {
 constructor(){this.data=new Map();this.alarmAt=null}
 async list({prefix}={}){return new Map([...this.data].filter(([key])=>!prefix||key.startsWith(prefix)))}
 async get(key){return this.data.get(key)}
 async put(key,value){this.data.set(key,value)}
 async delete(key){this.data.delete(key)}
 async getAlarm(){return this.alarmAt}
 async setAlarm(at){this.alarmAt=at}
}
class FakeSocket{
 constructor(id){this.outbox=[];this.attachment={id,roomId:null,role:null,lastWindow:0,events:0,lastChat:0,accountId:null,sessionFingerprint:null};this.closed=false}
 send(raw){this.outbox.push(JSON.parse(raw))}
 serializeAttachment(s){this.attachment=s}
 deserializeAttachment(){return this.attachment}
 close(){this.closed=true}
 pop(type){return [...this.outbox].reverse().find(x=>x.type===type)}
}
const storage=new MemoryStorage(),all=[];
const ctx={storage,getWebSockets:()=>all,acceptWebSocket:s=>all.push(s)};
const hub=new RoomHub(ctx,{BETA_TEST_HOSTS_ENABLED:'true'});
const client=id=>{const s=new FakeSocket(id);all.push(s);return s};
const command=(socket,data)=>hub.webSocketMessage(socket,JSON.stringify(data));
const host=client('host123456');
await command(host,{type:'create',title:'PK Integration QA',category:'Social',mode:'public'});
const created=host.pop('created');
assert.ok(created?.id);
const roomId=created.id;
const guests=['guest123456','guest234567','guest345678'].map(client);
for(const guest of guests){
 await command(guest,{type:'join',id:roomId});
 assert.equal(guest.pop('joined')?.id,roomId);
 await command(guest,{type:'guest-request',mode:'voice'});
 await command(host,{type:'guest-answer',id:guest.attachment.id,accept:true});
 assert.equal(guest.pop('guest-approved')?.mode,'voice');
 await command(guest,{type:'guest-ready',mic:true,camera:false,streamId:'stream'+guest.attachment.id});
}
assert.equal(guests.every(x=>x.attachment.role==='guest'),true);
await command(guests[0],{type:'pk-start',mode:'1v1',minutes:3,participants:['guest123456']});
assert.match(guests[0].pop('error')?.message||'',/Hanya host/);
await command(host,{type:'pk-start',mode:'1v1',minutes:3,participants:['guest123456']});
assert.equal(host.pop('pk-state')?.pk?.status,'pending');
await command(guests[0],{type:'pk-consent',accept:true});
assert.equal(host.pop('pk-state')?.pk?.status,'active');
await command(guests[0],{type:'pk-support',side:'A'});
assert.match(guests[0].pop('error')?.message||'',/Masuk akun/);
await command(host,{type:'stage-preset',preset:'focus'});
assert.equal(guests[1].pop('stage-preset-updated')?.preset,'focus');
await command(guests[2],{type:'stage-preset',preset:'random'});
assert.match(guests[2].pop('error')?.message||'',/Hanya host/);
await command(host,{type:'pk-end'});
assert.equal(host.pop('pk-state')?.pk?.status,'finished');
assert.equal((await storage.get('room:'+roomId)).pk.reason,'host-ended');
// Start new friendly challenge without ending original room.
await command(host,{type:'pk-start',mode:'2v2',minutes:5,participants:guests.map(x=>x.attachment.id)});
assert.equal(host.pop('pk-state')?.pk?.mode,'2v2');
for(const guest of guests)await command(guest,{type:'pk-consent',accept:true});
assert.equal(host.pop('pk-state')?.pk?.status,'active');
// Dropping a guest must stop PK without stopping LIVE.
await command(guests[0],{type:'guest-exit'});
assert.equal(host.pop('pk-state')?.pk?.reason,'participant-left');
assert.ok(await storage.get('room:'+roomId));
// A late joiner sees the preset and the finished scoreboard.
const newcomer=client('viewer11111');
await command(newcomer,{type:'join',id:roomId});
assert.equal(newcomer.pop('joined')?.stagePreset,'focus');
assert.equal(newcomer.pop('joined')?.pk?.status,'finished');
await command(host,{type:'leave'});
assert.equal((await storage.get('room:'+roomId)),undefined);
console.log('NADMO PK / Multi-Guest in-memory WebSocket E2E PASS');
