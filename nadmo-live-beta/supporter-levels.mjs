// NADMO LIVE supporter recognition, v0.9 beta.
// Original art and thresholds; not derived from TikTok levels or coin pricing.
// Only SETTLED, gateway-verified rupiah tips can increase the verified lifetime total.
// Do not accept amounts or level overrides from any browser, client or websocket.
export const SUPPORTER_THRESHOLDS=Object.freeze([
 5000,10000,20000,30000,50000,75000,100000,150000,200000,300000,
 400000,500000,650000,800000,1000000,1250000,1500000,2000000,2500000,3000000,
 3500000,4000000,5000000,6000000,7500000,9000000,11000000,13000000,16000000,20000000,
 25000000,30000000,40000000,50000000,65000000,80000000,100000000,125000000,160000000,200000000,
 250000000,300000000,400000000,500000000,650000000,800000000,1000000000,1250000000,1600000000,2000000000
]);
export const SUPPORTER_TIERS=Object.freeze([
 Object.freeze({minimumLevel:1,maxLevel:5,id:'spark',label:'SPARK',mark:'✦'}),
 Object.freeze({minimumLevel:6,maxLevel:10,id:'mint',label:'MINT',mark:'◆'}),
 Object.freeze({minimumLevel:11,maxLevel:15,id:'azure',label:'AZURE',mark:'◆'}),
 Object.freeze({minimumLevel:16,maxLevel:20,id:'violet',label:'VIOLET',mark:'✧'}),
 Object.freeze({minimumLevel:21,maxLevel:25,id:'rose',label:'ROSE',mark:'✦'}),
 Object.freeze({minimumLevel:26,maxLevel:30,id:'gold',label:'GOLD',mark:'♛'}),
 Object.freeze({minimumLevel:31,maxLevel:35,id:'royal',label:'ROYAL',mark:'♛'}),
 Object.freeze({minimumLevel:36,maxLevel:40,id:'platinum',label:'PLATINUM',mark:'♕'}),
 Object.freeze({minimumLevel:41,maxLevel:45,id:'diamond',label:'DIAMOND',mark:'♛'}),
 Object.freeze({minimumLevel:46,maxLevel:50,id:'legend',label:'LEGEND',mark:'♛'})
]);
export function supporterLevel(total){
 if(!Number.isSafeInteger(total)||total<0)return 0;
 let lo=0,hi=SUPPORTER_THRESHOLDS.length;
 while(lo<hi){const mid=(lo+hi)>>1;if(total>=SUPPORTER_THRESHOLDS[mid])lo=mid+1;else hi=mid}
 return lo;
}
export function supporterBadge(total){
 const level=supporterLevel(total);
 if(level===0)return null;
 const tier=SUPPORTER_TIERS.find(x=>level>=x.minimumLevel&&level<=x.maxLevel);
 return {level,tier:tier.id,label:tier.label,mark:tier.mark};
}
export function supporterProgress(total){
 const safe=Number.isSafeInteger(total)&&total>=0?total:0;
 const level=supporterLevel(safe);
 const next=level<50?SUPPORTER_THRESHOLDS[level]:null;
 return {totalVerifiedIDR:safe,level,badge:supporterBadge(safe),nextLevel:next===null?null:level+1,nextThresholdIDR:next,
  remainingIDR:next===null?0:Math.max(0,next-safe)};
}
// Reads only server-side totals created by an authorized future payment-gateway integrator.
// No ingestion endpoint exists in this beta: wallet and payments remain OFF.
export async function getSupporterProfile(storage,accountId,record){
 if(typeof accountId!=='string'||!accountId)return {visible:false,level:0,badge:null};
 const raw=await storage.get('supporter-verified-total:'+accountId);
 const progress=supporterProgress(raw);
 return {...progress,visible:record?.supporterBadgeVisible!==false,paymentsEnabled:false};
}
export async function getPublicSupporterBadge(storage,accountId,record){
 if(!record||record.disabled||record.supporterBadgeVisible===false)return null;
 const profile=await getSupporterProfile(storage,accountId,record);
 return profile.badge;
}
