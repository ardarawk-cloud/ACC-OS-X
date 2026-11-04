// NADMO LIVE / MOSHI messaging controls v2.
// Pure policy; account auth, persistence and rate limits live in account.mjs.
// Existing dm-thread records remain backward compatible.
export const DM_EDIT_WINDOW_MS=15*60*1000;
export const DM_MAX_MESSAGES=100;
export const defaultDmView=()=>({clearedAt:0,hiddenIds:[],starredIds:[],pinned:false,muted:false,archived:false,markedUnread:false});
export function normaliseDmView(raw){
 const o=raw&&typeof raw==='object'?raw:{};
 const ids=value=>Array.isArray(value)?[...new Set(value.filter(v=>typeof v==='string'&&/^[0-9a-f-]{36}$/i.test(v)))].slice(-200):[];
 return {clearedAt:Number.isSafeInteger(o.clearedAt)&&o.clearedAt>0?o.clearedAt:0,
  hiddenIds:ids(o.hiddenIds),starredIds:ids(o.starredIds),
  pinned:o.pinned===true,muted:o.muted===true,archived:o.archived===true,markedUnread:o.markedUnread===true};
}
export function visibleDmMessages(messages,view){
 const v=normaliseDmView(view),hidden=new Set(v.hiddenIds);
 return (Array.isArray(messages)?messages:[]).filter(m=>m&&typeof m.id==='string'&&m.createdAt>v.clearedAt&&!hidden.has(m.id)).map(m=>{
  const result={id:m.id,fromHandle:m.fromHandle||'',text:m.deletedForAll?'':String(m.text||''),
   createdAt:m.createdAt,editedAt:m.deletedForAll?null:(m.editedAt||null),
   deletedForAll:m.deletedForAll===true,deletedAt:m.deletedAt||null,replyToId:m.replyToId||null,
   starred:v.starredIds.includes(m.id)};
  if(result.replyToId){
   const parent=messages.find(x=>x?.id===result.replyToId);
   if(parent&&!hidden.has(parent.id)&&parent.createdAt>v.clearedAt&&!parent.deletedForAll){
    result.replyPreview=String(parent.text||'').slice(0,100);
    result.replyFromHandle=parent.fromHandle||'';
   }else result.replyPreview='Pesan tidak tersedia';
  }
  return result;
 });
}
export function summariseDm(messages,view,viewerHandle,readAt=0){
 const list=visibleDmMessages(messages,view),v=normaliseDmView(view);
 const last=list.at(-1);
 const unread=list.filter(m=>!m.deletedForAll&&m.fromHandle!==viewerHandle&&m.createdAt>readAt).length;
 return {visible:list,unread:Math.max(unread,v.markedUnread?1:0),lastText:last?(last.deletedForAll?'Pesan dihapus':last.text.slice(0,100)):'',
  lastFromMe:last?.fromHandle===viewerHandle,updatedAt:last?.createdAt||0,
  pinned:v.pinned,muted:v.muted,archived:v.archived,markedUnread:v.markedUnread};
}
export function updateDmText(messages,options){
 const {actorHandle,id,action,now=Date.now(),text}=options;
 if(!Array.isArray(messages)||!messages.length||typeof id!=='string')return {error:'MESSAGE_NOT_FOUND'};
 const at=messages.findIndex(m=>m?.id===id);if(at<0)return {error:'MESSAGE_NOT_FOUND'};
 const original=messages[at];
 if(original.fromHandle!==actorHandle)return {error:'NOT_AUTHOR'};
 if(original.deletedForAll===true)return {error:'ALREADY_DELETED'};
 if(action==='edit'){
  if(!Number.isFinite(original.createdAt)||now-original.createdAt>DM_EDIT_WINDOW_MS||now<original.createdAt)return {error:'EDIT_WINDOW_EXPIRED'};
  if(typeof text!=='string'||!text.trim()||text.length>2000)return {error:'BAD_TEXT'};
  const safeText=text.trim();
  if(safeText===original.text)return {messages,unchanged:true,message:original};
  const message={...original,text:safeText,editedAt:now};
  return {messages:messages.map((m,i)=>i===at?message:m),message};
 }
 if(action==='delete-for-all'){
  const message={...original,text:'',deletedForAll:true,deletedAt:now,editedAt:null};
  return {messages:messages.map((m,i)=>i===at?message:m),message};
 }
 return {error:'BAD_ACTION'};
}
export function validateDmReply(messages,replyToId,view){
 if(replyToId==null||replyToId==='')return {replyToId:null};
 if(typeof replyToId!=='string'||!/^[0-9a-f-]{36}$/i.test(replyToId))return {error:'BAD_REPLY'};
 const source=visibleDmMessages(messages,view).find(m=>m.id===replyToId);
 if(!source||source.deletedForAll)return {error:'REPLY_NOT_FOUND'};
 return {replyToId};
}
