// NADMO LIVE creator wallet (IDR) — foundation, not a payment processor.
// Only settlement/adjustment records written by a FUTURE authenticated provider
// reconciliation path may appear under wallet-ledger:<accountId>:<eventId>.
// This module deliberately exposes NO client balance mutation or bank payout action.
const MAX_ENTRIES=1000;
const valid=(n)=>Number.isSafeInteger(n)&&n>=0&&n<=10_000_000_000;
const txid=(s)=>typeof s==='string'&&/^[a-zA-Z0-9_-]{8,128}$/.test(s);
const idr=(n)=>Math.max(0,Math.round(n));
const safeAdd=(a,b)=>{const t=a+b;if(!Number.isSafeInteger(t))throw Error('Wallet arithmetic overflow');return t};

export function deriveWallet(entries=[],withdrawals=[]){
 let settled=0,refunded=0,paidOut=0,reserved=0;
 const seen=new Set();
 const history=[];
 for(const e of entries.slice(0,MAX_ENTRIES)){
  if(!e||!txid(e.id)||seen.has(e.id)||!valid(e.amountIDR))continue;
  if(!['tip-settled','tip-refunded','payout-settled'].includes(e.type))continue;
  // Settlement entries must be provider-signed and reconciled before ingestion.
  if(e.providerVerified!==true||e.currency!=='IDR')continue;
  seen.add(e.id);
  if(e.type==='tip-settled')settled=safeAdd(settled,e.amountIDR);
  if(e.type==='tip-refunded')refunded=safeAdd(refunded,e.amountIDR);
  if(e.type==='payout-settled')paidOut=safeAdd(paidOut,e.amountIDR);
  history.push({id:e.id,type:e.type,amountIDR:e.amountIDR,createdAt:e.createdAt||null});
 }
 const pending=[];
 for(const w of withdrawals.slice(0,MAX_ENTRIES)){
  if(!w||!txid(w.id)||!valid(w.amountIDR))continue;
  if(w.status==='requested'||w.status==='processing'){
   reserved=safeAdd(reserved,w.amountIDR);
   pending.push({id:w.id,amountIDR:w.amountIDR,status:w.status,createdAt:w.createdAt||null});
  }else if(w.status==='paid'||w.status==='rejected'){
   pending.push({id:w.id,amountIDR:w.amountIDR,status:w.status,createdAt:w.createdAt||null});
  }
 }
 return {
  currency:'IDR',settledIDR:settled,refundedIDR:refunded,
  paidOutIDR:paidOut,pendingWithdrawalsIDR:reserved,
  availableIDR:idr(settled-refunded-paidOut-reserved),
  totalEarningsIDR:idr(settled-refunded),
  // Never present these as real funds until provider settlement is enabled.
  transactions:history.slice(-30).reverse(),withdrawals:pending.slice(-30).reverse()
 };
}

export async function walletSnapshot(storage,accountId){
 if(typeof accountId!=='string'||!accountId)return deriveWallet();
 const ledger=await storage.list({prefix:'wallet-ledger:'+accountId+':',limit:MAX_ENTRIES});
 const payouts=await storage.list({prefix:'wallet-withdrawal:'+accountId+':',limit:MAX_ENTRIES});
 return deriveWallet([...ledger.values()],[...payouts.values()]);
}

export function payoutCapability(){
 return {tipsEnabled:false,withdrawalsEnabled:false,providerConfigured:false,
  bankDestinationEnabled:false,kycRequired:true,reason:'PAYMENT_GATEWAY_NOT_ACTIVE'};
}
