import assert from 'node:assert/strict';
import {deriveWallet,walletSnapshot,payoutCapability} from '../wallet.mjs';

const empty=deriveWallet();
assert.equal(empty.availableIDR,0);
assert.equal(empty.totalEarningsIDR,0);
assert.deepEqual(empty.transactions,[]);
assert.equal(payoutCapability().withdrawalsEnabled,false);
assert.equal(payoutCapability().bankDestinationEnabled,false);
const e=(id,type,amountIDR,verified=true)=>({id,type,amountIDR,currency:'IDR',providerVerified:verified,createdAt:123});
const ledger=[
 e('ref-tip-1001','tip-settled',100000),
 e('ref-tip-1001','tip-settled',100000), // never double-count a provider reference
 e('ref-tip-1002','tip-settled',60000),
 e('ref-tip-1003','tip-settled',500000,false), // unverified must never count
 e('ref-back-0001','tip-refunded',20000),
 e('ref-paid-0001','payout-settled',30000),
 e('ref-ghost-111','credit',1000000000)
];
const requests=[
 {id:'payout-00001',amountIDR:40000,status:'requested',createdAt:1700},
 {id:'payout-00002',amountIDR:5000,status:'rejected',createdAt:1701}
];
const summary=deriveWallet(ledger,requests);
assert.equal(summary.settledIDR,160000);
assert.equal(summary.refundedIDR,20000);
assert.equal(summary.paidOutIDR,30000);
assert.equal(summary.pendingWithdrawalsIDR,40000);
assert.equal(summary.availableIDR,70000);
assert.equal(summary.totalEarningsIDR,140000);
assert.equal(summary.transactions.length,4);
const storage={
 async list({prefix}){
  const table=prefix.startsWith('wallet-ledger:')
   ?new Map(ledger.map((v,i)=>[prefix+i,v]))
   :new Map(requests.map((v,i)=>[prefix+i,v]));
  return table;
 }
};
const snapshot=await walletSnapshot(storage,'account-01');
assert.equal(snapshot.availableIDR,70000);
assert.equal((await walletSnapshot(storage,null)).availableIDR,0);
assert.equal(deriveWallet([{id:'id-too-short',type:'tip-settled',amountIDR:1,currency:'IDR',providerVerified:true}]).availableIDR,0);
console.log('NADMO wallet zero balance, provider verification, dedupe, refund, reserve and payout calculations: PASS');
