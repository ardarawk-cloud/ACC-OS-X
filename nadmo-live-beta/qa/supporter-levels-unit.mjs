import assert from 'node:assert/strict';
import {SUPPORTER_THRESHOLDS,SUPPORTER_TIERS,supporterLevel,supporterBadge,supporterProgress,getSupporterProfile,getPublicSupporterBadge} from '../supporter-levels.mjs';
assert.equal(SUPPORTER_THRESHOLDS.length,50);
assert.equal(SUPPORTER_TIERS.length,10);
assert.equal(new Set(SUPPORTER_TIERS.map(x=>x.id)).size,10);
for(let i=0;i<50;i++){
 assert.ok(Number.isSafeInteger(SUPPORTER_THRESHOLDS[i])&&SUPPORTER_THRESHOLDS[i]>0);
 if(i)assert.ok(SUPPORTER_THRESHOLDS[i]>SUPPORTER_THRESHOLDS[i-1]);
 assert.equal(supporterLevel(SUPPORTER_THRESHOLDS[i]),i+1,'boundary level '+(i+1));
 assert.equal(supporterLevel(SUPPORTER_THRESHOLDS[i]-1),i,'below boundary level '+(i+1));
}
for(const invalid of [NaN,Infinity,-1,'99999999',{},undefined,null])assert.equal(supporterLevel(invalid),0);
assert.equal(supporterBadge(0),null);
assert.equal(supporterBadge(5000).level,1);
assert.equal(supporterBadge(25000000).tier,'royal');
assert.equal(supporterBadge(2000000000).level,50);
assert.equal(supporterLevel(Number.MAX_SAFE_INTEGER),50);
assert.equal(supporterProgress(5000).remainingIDR,5000);
assert.equal(supporterProgress(2000000000).nextThresholdIDR,null);
const storage={async get(key){return key==='supporter-verified-total:qa-id'?25000000:undefined}};
const visible={disabled:false,supporterBadgeVisible:true};
const hidden={disabled:false,supporterBadgeVisible:false};
assert.equal((await getSupporterProfile(storage,'qa-id',visible)).level,31);
assert.equal((await getPublicSupporterBadge(storage,'qa-id',visible)).tier,'royal');
assert.equal(await getPublicSupporterBadge(storage,'qa-id',hidden),null);
assert.equal(await getPublicSupporterBadge(storage,'qa-id',{disabled:true}),null);
assert.equal((await getSupporterProfile(storage,'new-id',visible)).level,0);
assert.equal((await getSupporterProfile(storage,'new-id',visible)).totalVerifiedIDR,0);
console.log('PASS NADMO SUPPORTER 50 deterministic boundaries, 10 tier colors, zero default, earned-only visibility and privacy');
