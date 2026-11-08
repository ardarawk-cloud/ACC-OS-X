import assert from 'node:assert/strict';
import handler,{simulate,guard,scaling} from '../worker.mjs';
import {emitRoomTelemetry} from '../../../nadmo-live-beta/cost-telemetry-adapter.mjs';
const hosts=[50,100,500,1000,5000,10000];
for(const count of hosts){
 const out=simulate(count,2,2,1000,16000,0);
 assert.equal(out.hosts,count);
 assert.equal(out.pro+out.plus,count);
 assert.equal(out.nominalMRRIdr,count*59900);
 assert.equal(out.budgetIllustrativeIdr,out.nominalMRRIdr*.2);
 assert.equal(out.receiptsConfirmedIdr,null);
 for(const n of [1,2,4])assert.ok(simulate(count,n).relayGb>=0);
}
assert.equal(simulate(50,4).relayGb,5400);
assert.equal(simulate(1000,4).relayGb,108000);
const money=100000;
for(const [fraction,want] of [[.59,'NORMAL'],[.6,'WARNING'],[.79,'WARNING'],[.8,'CRITICAL'],[.99,'CRITICAL'],[1,'EMERGENCY']]){
 const d=guard({collectedIdr:money,actualCostIdr:money*.2*fraction,billingComplete:true,stale:false});
 assert.equal(d.level,want,JSON.stringify(d));
}
assert.equal(guard({collectedIdr:money,actualCostIdr:null,billingComplete:true}).level,'UNKNOWN');
assert.equal(guard({collectedIdr:money,actualCostIdr:100,billingComplete:false}).level,'UNKNOWN');
assert.equal(guard({collectedIdr:money,actualCostIdr:100,billingComplete:true,stale:true}).level,'UNKNOWN');
assert.equal(scaling({budgetLevel:'EMERGENCY',dataFresh:true,relayNeeded:true,ownerApproved:false}).decision,'HOLD_PAID_SCALE');
assert.equal(scaling({budgetLevel:'UNKNOWN',dataFresh:false,relayNeeded:true,ownerApproved:true}).decision,'HOLD_PAID_SCALE');
assert.equal(scaling({budgetLevel:'NORMAL',dataFresh:true,relayNeeded:false,activeRooms:20}).decision,'CAPACITY_REVIEW');
assert.equal(scaling({budgetLevel:'NORMAL',dataFresh:true,relayNeeded:false,activeRooms:1}).noForcedDisconnect,true);
for(const h of [50,100,1000]){
 const r=simulate(h,4);
 assert.ok(r.hostUploadMbps>=4);
 assert.equal(r.monthlyViewerMinutes,h*4*2*60*30);
}
console.log('PASS: 50/100/500/1000/5000/10000 host scenarios, 1/2/4 viewers, six budget levels, stale billing, paid relay holds, capacity, no forced LIVE disconnect');
const throttle=simulate(50,4,2,500),normalRate=simulate(50,4,2,1000),videoSpike=simulate(50,4,2,2000);
assert.ok(throttle.relayGb<normalRate.relayGb && videoSpike.relayGb>normalRate.relayGb,'quality profile should change bandwidth projection');
const spike=simulate(1000,4);
assert.equal(spike.monthlyViewerMinutes,simulate(1000,2).monthlyViewerMinutes*2,'audience spike should double viewer-minutes');
const health=await handler.fetch(new Request('https://example.test/health'),{},null);
assert.equal(health.status,200);
assert.equal((await health.json()).liveProductionTouched,false);
const privateData=await handler.fetch(new Request('https://example.test/api/dashboard'),{},null);
assert.equal(privateData.status,503,'missing admin binding fails closed');
const faultEnv={ADMIN_TOKEN:'test-admin',INGEST_TOKEN:'test-ingest',COST_LEDGER:{
 idFromName:()=> 'stage-test',
 get:()=>({fetch:async()=>{throw new Error('database-unavailable')}})
}};
const failed=await handler.fetch(new Request('https://example.test/api/dashboard',{headers:{Authorization:'Bearer test-admin'}}),faultEnv,null);
assert.equal(failed.status,503);
assert.equal((await failed.json()).code,'COST_STORE_UNAVAILABLE');
const inactive=await emitRoomTelemetry({}, {},new Map(),[],()=>0,Date.now());
assert.equal(inactive.status,'disabled');
const store={get:async()=>0,put:async()=>{}};
const networkFault=await emitRoomTelemetry(store,{
 COST_MONITOR_INGEST_TOKEN:'staging-only',COST_MONITOR:{fetch:async()=>{throw new Error('network-failure')}}
},new Map([['room:abc',{id:'abc',hostOfflineAt:null}]]),[],()=>4,Date.now());
assert.equal(networkFault.status,'unavailable','network failure should not interrupt host LIVE');
console.log('PASS: video quality adjustments, audience spikes, missing admin secret, database outage, network failure and no forced LIVE disruption');
