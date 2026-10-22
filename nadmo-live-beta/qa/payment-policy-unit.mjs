import assert from 'node:assert/strict';
import {PAYMENT_POLICY,feePreview,paymentPolicyEndpoint} from '../payment-policy.mjs';
import worker from '../worker.mjs';
import {deriveWallet} from '../wallet.mjs';

const gift=feePreview('gift',100000),ticket=feePreview('ticket',100000),topup=feePreview('topup',100000);
assert.equal(gift.platformFeeIDR,7000);
assert.equal(gift.amountAfterPlatformIDR,93000);
assert.equal(ticket.platformFeeIDR,10000);
assert.equal(ticket.amountAfterPlatformIDR,90000);
assert.equal(topup.platformFeeIDR,0);
assert.equal(topup.gatewayFeeIDR,2650);
assert.equal(topup.gatewayVatIDR,292,'VAT is on provider fee, never 11% of the whole top-up');
assert.equal(topup.providerSettlementEstimateIDR,97058);
assert.equal(feePreview('topup',1000).gatewayFeeIDR,27,'Half-rupiah rounds up');
assert.equal(feePreview('topup',1000).gatewayVatIDR,3);
assert.equal(gift.platformVatIDR,null,'Unverified PKP status must not become zero tax');
assert.equal(gift.hostWithholdingIDR,null,'Do not invent a universal host withholding rate');
assert.equal(PAYMENT_POLICY.gateway.chargeStage,'TOPUP_ONLY');
assert.equal(PAYMENT_POLICY.withdrawal.providerFeeIDR,null);
assert.equal(Object.isFrozen(PAYMENT_POLICY.platform),true);
for(const kind of ['gift','ticket','topup']){
 for(const amount of [1000,1001,1010,1500,99999,100000,10000000]){
  const q=feePreview(kind,amount);
  assert.equal(q.previewOnly,true);assert.equal(q.canTransact,false);
  assert.equal(q.finalPayableIDR,null);assert.equal(q.hostNetIDR,null);
  if(kind==='topup')assert.equal(q.providerSettlementEstimateIDR+q.gatewayFeeIDR+q.gatewayVatIDR,amount);
  else assert.equal(q.amountAfterPlatformIDR+q.platformFeeIDR,amount);
 }
 for(const amount of [NaN,Infinity,0,-1,999,1000.1,10000001,'100000',null])assert.throws(()=>feePreview(kind,amount));
}
assert.throws(()=>feePreview('game',100000),'Gameplay never creates host income');
const req=(path,method='GET')=>new Request('https://live.nadmo.id'+path,{method});
const blockedStorage=new Proxy({},{get(){throw Error('Fee quotes must never access wallet storage')}});
const good=await worker.fetch(req('/api/payments/quote?kind=gift&amountIDR=100000'),blockedStorage,{});
assert.equal(good.status,200);assert.equal((await good.json()).quote.platformFeeIDR,7000);
assert.equal(good.headers.get('cache-control'),'no-store');
for(const suffix of [
 'kind=gift&amountIDR=100000&rateBps=0','kind=gift&kind=ticket&amountIDR=100000',
 'kind=gift&amountIDR=100000&amountIDR=1000','kind=gift&amountIDR=1e5',
 'kind=gift&amountIDR=1000.5','kind=game&amountIDR=100000','kind=gift',
 'kind=gift&amountIDR=10000000&tax=0','kind=gift&amountIDR=999999999999999999'
])assert.equal((await worker.fetch(req('/api/payments/quote?'+suffix),blockedStorage,{})).status,400,suffix);
for(const method of ['POST','PUT','DELETE']){
 for(const route of ['/api/payments/policy','/api/payments/quote'])
  assert.equal((await worker.fetch(req(route,method),blockedStorage,{})).status,405);
}
assert.equal(paymentPolicyEndpoint(req('/api/wallet/credit')),null);
assert.equal(deriveWallet([gift,topup,ticket]).availableIDR,0,'A quote can never count as a settled ledger entry');
console.log('PASS fee policy: exact IDR rounding, separate tax bases, no duplicate gateway fee, unresolved taxes, strict public read-only routing, zero wallet mutation');
