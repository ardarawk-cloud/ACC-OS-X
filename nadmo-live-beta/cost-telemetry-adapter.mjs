// Optional, non-blocking signalling telemetry adapter for a future reviewed release.
// No payment claims, no webcam stream transfer, no TURN/SFU provisioning.
export async function emitRoomTelemetry(storage,env,rooms,sockets,countRoomViewers,now=Date.now()){
 if(!env?.COST_MONITOR||!env?.COST_MONITOR_INGEST_TOKEN)return {status:'disabled'};
 const prev=Number(await storage.get('nadmo-cost:last-sample-at'))||0;
 if(prev&&now-prev<55000)return {status:'throttled'};
 await storage.put('nadmo-cost:last-sample-at',now);
 // First observed window has unknown duration; never fabricate viewer-minutes.
 const elapsed=prev?Math.min(60,Math.max(0,Math.floor((now-prev)/1000))):0;
 const items=[];
 for(const [,room] of rooms){
  if(room.hostOfflineAt)continue;
  const id='rtc-'+room.id+'-'+Math.floor(now/60000);
  items.push({id,ts:now,kind:'room_sample',roomId:room.id,
   viewerCount:countRoomViewers(sockets,room.id),seconds:elapsed,
   bitrateKbps:0,relayBytes:0,source:'roomhub_signaling_unmeasured_media'});
 }
 if(!items.length)return {status:'no-rooms'};
 try{
  const result=await env.COST_MONITOR.fetch('https://internal/api/ingest',{method:'POST',
   headers:{'content-type':'application/json',Authorization:'Bearer '+env.COST_MONITOR_INGEST_TOKEN},
   body:JSON.stringify({items})});
  return {status:result.ok?'ok':'rejected',httpStatus:result.status,items:items.length};
 }catch{return {status:'unavailable'}}
}
