'use strict';
// NADMO LIVE countdown contract. No browser automation clock spoofing or prod mutation.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const base=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(base,'public/app/index.html'),'utf8');
const worker=fs.readFileSync(path.join(base,'worker.mjs'),'utf8');
const scripts=[...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g)]
  .map(x=>x[1]).filter(Boolean);
assert(scripts.length,'LIVE document must include JS');
for(const js of scripts)new vm.Script(js,{filename:'nadmo-live-public.js'});
for(const id of ['liveElapsed','gameLiveElapsed','liveRestReminder','liveRestHour','liveRestDismiss'])
 assert(html.includes('id="'+id+'"'),'Missing '+id);
assert.match(worker,/stageLayout:\[\],createdAt:n/,'room must store creation time');
assert.match(worker,/type:'created'[^\n]*createdAt:room\.createdAt/,'host start is authoritative');
assert.match(worker,/type:'resumed'[^\n]*createdAt:room\.createdAt/,'reconnect may NOT reset the clock');
assert.match(worker,/type:'joined'[^\n]*createdAt:room\.createdAt/,'viewers show same duration');
assert.match(html,/activateLiveClock\(m\.id,m\.createdAt\)/,'socket events must apply Worker time');
assert.match(html,/lastReminderHour=hour/,'reminder fires once per hour');
assert.match(html,/sessionStorage\.setItem\('nadmo\.live\.rest\.'/,'do not replay dismissed reminders after reload');
assert.match(html,/hour=Math\.floor\(elapsed\/3600000\)/,'every full hour');
assert.match(html,/if\(host&&hour>=1&&hour>lastReminderHour\)/,'viewer MUST NOT receive rest prompts');
assert.match(html,/document\.visibilityState==='visible'/,'hidden browser must not show a stale overlay');
assert.match(html,/renderLiveClock,1000/,'duration refresh cadence');
assert.match(html,/clearLiveClock\(\);[\s\S]{0,80}\$\('watch'\)\.classList/,'leaving room stops the timer');
assert.match(html,/updateNativeGameClock\(nativeGameState,d\.startedAt\)/,'native GAME timestamp shown');
assert.match(html,/NADMO LIVE|NADMO/);
const from=html.indexOf(' const formatLiveElapsed=ms=>');
const to=html.indexOf(' function dismissRestReminder()',from);
assert(from>=0&&to>from,'clock formatter must be present');
const source=html.slice(from,to)+'\nformatLiveElapsed(3723000)';
assert.equal(vm.runInNewContext(source,{}),'01:02:03','elapsed displays HH:MM:SS');
console.log('PASS LIVE hourly duration: web JS parses, Worker create/join/resume stamp, per-hour host rest, viewer clock and native GAME duration');
