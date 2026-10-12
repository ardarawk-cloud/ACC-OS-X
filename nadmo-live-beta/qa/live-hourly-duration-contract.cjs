'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(base,'public/app/index.html'),'utf8');
const worker=fs.readFileSync(path.join(base,'worker.mjs'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(x=>x[1]).filter(Boolean);
assert(scripts.length,'LIVE document must include JS');
for(const js of scripts)new vm.Script(js,{filename:'nadmo-live-public.js'});
for(const id of ['liveElapsed','gameLiveElapsed','liveRestReminder','liveRestHour','liveRestDismiss'])
 assert(html.includes('id="'+id+'"'),'Missing '+id);
assert(worker.includes('stageLayout:[],createdAt:n'),'room must store its original start');
for(const type of ['created','resumed','joined']){
 const response=worker.split("type:'"+type+"'")[1]?.split('});')[0]||'';
 assert(response.includes('createdAt:room.createdAt'),type+' must provide original timestamp');
}
assert(html.includes('activateLiveClock(m.id,m.createdAt)'),'socket events use Worker room time');
assert(html.includes('lastReminderHour=hour'),'a reminder fires only once per hour');
assert(html.includes("sessionStorage.setItem('nadmo.live.rest.'"),'avoid reminder replay on reload');
assert(html.includes('hour=Math.floor(elapsed/3600000)'),'exact full-hour milestones');
assert(html.includes('if(host&&hour>=1&&hour>lastReminderHour)'),'viewer never gets host reminder');
assert(html.includes("document.visibilityState==='visible'"),'do not show hidden overlays');
assert(html.includes('renderLiveClock,1000'),'elapsed clock increments each second');
assert(/function leave\(\)\{\s*clearLiveClock\(\)/.test(html),'leave clears timer');
assert(html.includes('updateNativeGameClock(nativeGameState,d.startedAt)'),'native GAME exposes clock');
const from=html.indexOf(' const formatLiveElapsed=ms=>');
const to=html.indexOf(' function dismissRestReminder()',from);
assert(from>=0&&to>from,'formatter is present');
assert.equal(vm.runInNewContext(html.slice(from,to)+'\nformatLiveElapsed(3723000)',{}),'01:02:03');
console.log('PASS LIVE duration & breaks: JS syntax, server create/join/resume time, hourly host reminder, native GAME');
