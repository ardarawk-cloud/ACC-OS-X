import assert from 'node:assert/strict';
import {simulate,guard,scaling} from '../worker.mjs';
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