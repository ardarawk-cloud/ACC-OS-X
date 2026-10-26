// NADMO LIVE PK challenge state machine. No payment, no virtual currency.
export const PK_MINUTES=Object.freeze([3,5,10]);
const score=()=>({A:0,B:0});
const isValidId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{8,48}$/.test(id);
export function publicPK(pk){
 if(!pk)return null;
 const {id,status,mode,minutes,teams,invited,accepted,requestedAt,startedAt,endsAt,pendingUntil,scores,reason,winner}=pk;
 return {id,status,mode,minutes,teams,invited,accepted,requestedAt,startedAt,endsAt,pendingUntil,scores,reason,winner,scoreType:'FREE_SUPPORT_ONLY'};
}
export function proposePK({id,hostId,guests,mode,minutes,random=false,now=Date.now()}){
 if(!isValidId(id)||!isValidId(hostId)||!['1v1','2v2'].includes(mode)||!PK_MINUTES.includes(minutes))throw Error('Mode atau durasi PK tidak valid.');
 const required=mode==='1v1'?1:3;
 if(!Array.isArray(guests)||guests.length<required)throw Error('Perlu '+required+' tamu aktif untuk PK '+mode+'.');
 const unique=new Map();
 for(const guest of guests){
  if(guest&&isValidId(guest.id)&&guest.id!==hostId&&guest.ready===true&&!unique.has(guest.id))unique.set(guest.id,guest.id);
 }
 let pool=[...unique.values()];
 if(pool.length<required)throw Error('Jumlah tamu yang mengaktifkan panggung belum cukup.');
 if(random){for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]]}}
 const selected=pool.slice(0,required);
 const teams=mode==='1v1'?{A:[hostId],B:[selected[0]]}:{A:[hostId,selected[0]],B:[selected[1],selected[2]]};
 return {id,status:'pending',mode,minutes,teams,invited:selected,accepted:[],requestedAt:now,pendingUntil:now+45000,startedAt:null,endsAt:null,scores:score(),votes:{},reason:null,winner:null};
}
export function finishPK(pk,reason='completed',now=Date.now()){
 if(!pk||pk.status==='finished')return pk;
 const scores=pk.scores||score();
 return {...pk,status:'finished',endsAt:pk.endsAt||now,finishedAt:now,reason,winner:scores.A===scores.B?'draw':scores.A>scores.B?'A':'B',votes:{}};
}
export function consentPK(pk,guestId,accept,now=Date.now()){
 if(!pk||pk.status!=='pending'||now>=pk.pendingUntil)throw Error('Undangan PK telah berakhir.');
 if(!pk.invited.includes(guestId))throw Error('Anda bukan peserta PK yang diundang.');
 if(pk.accepted.includes(guestId))throw Error('Undangan sudah dijawab.');
 if(accept!==true)return finishPK(pk,'invitation-declined',now);
 const accepted=pk.accepted.concat(guestId);
 if(accepted.length!==pk.invited.length)return {...pk,accepted};
 return {...pk,accepted,status:'active',startedAt:now,endsAt:now+pk.minutes*60000};
}
export function supportPK(pk,accountId,side,now=Date.now()){
 if(!pk||pk.status!=='active'||now>=pk.endsAt)throw Error('PK tidak aktif.');
 if(!isValidId(accountId)||!['A','B'].includes(side))throw Error('Dukungan PK tidak valid.');
 const key=accountId;
 if(pk.votes?.[key]&&now-pk.votes[key]<15000)throw Error('Dukungan gratis maksimal sekali setiap 15 detik.');
 // These are free cheer points, NOT paid tips. No real-money balances are affected.
 return {...pk,votes:{...pk.votes,[key]:now},scores:{...pk.scores,[side]:pk.scores[side]+1}};
}
export function checkPKDeadline(pk,now=Date.now()){
 if(!pk||pk.status==='finished')return pk;
 if(pk.status==='pending'&&now>=pk.pendingUntil)return finishPK(pk,'invitation-timeout',now);
 if(pk.status==='active'&&now>=pk.endsAt)return finishPK(pk,'completed',now);
 return pk;
}
