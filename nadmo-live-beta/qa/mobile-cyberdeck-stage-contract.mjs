import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../public/app/index.html',import.meta.url),'utf8');
const worker=await readFile(new URL('../worker.mjs',import.meta.url),'utf8');
const range=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i,'missing anchors '+a);return html.slice(i,j)};
const fun=range('function mobileStageRect(index,total){','function syncMobileStage(){').trim();
const calc=vm.runInNewContext('('+fun+')');
for(let count=1;count<=10;count++){
 const cells=[];
 for(let idx=0;idx<count;idx++){
  const r=calc(idx,count);
  assert.ok(r.x>=0&&r.y>=0&&r.w>=18&&r.h>=15&&r.x+r.w<=100.01&&r.y+r.h<=100.01,'bad slot '+idx+'/'+count);
  for(const other of cells){
   const overlapX=Math.min(r.x+r.w,other.x+other.w)-Math.max(r.x,other.x);
   const overlapY=Math.min(r.y+r.h,other.y+other.h)-Math.max(r.y,other.y);
   assert.ok(overlapX<=0.02||overlapY<=0.02,'overlapping slots '+idx+'/'+count);
  }
  cells.push(r);
 }
}
assert.ok(calc(0,2).x<calc(1,2).x,'host left guest right for 2');
assert.match(html,/mobileStageRect\(index\+1,stageGuestsList.length\+1\)/,'guests placed after host');
assert.match(html,/renderStageGuests\(\)\{[\s\S]*?syncMobileStage\(\)/,'layout always synced');
assert.match(html,/mobile-stage-split \.live-stage\{/,'host occupies its own slot');
assert.match(html,/mobile-stage-split #guestStageGrid\{/,'guest grid uses full mobile surface');
assert.match(html,/window\.innerWidth<800\)return;[\s\S]*?event\.preventDefault/,'disable drag collision on mobile');
assert.match(html,/liveSwipeStart/, 'swipe recognizer');
assert.match(html,/classList\.toggle\('watch-clean',dx>0\)/,'right clean left restore');
assert.match(html,/watch-clean #watch \.live-stage::after/,'clean hides host label');
for(const theme of ['electric','noir','retro','cyberbw','nadmo']){
 assert.ok(html.includes('#watch[data-host-theme="'+theme+'"]'),'streamer HUD missing theme '+theme);
}
assert.match(html,/setWatchTheme\(room\.hostThemeId/,'live host theme used');
assert.match(worker,/hostThemeId:\['nadmo','cyberbw','noir','retro','electric'\]/,'server sanitizes theme');
assert.ok((worker.match(/hostThemeId:room\.hostThemeId\|\|'nadmo'/g)||[]).length>=3,'theme missing create/join/resume');
assert.match(worker,/headers\.set\('Cache-Control','no-store, max-age=0'\)/,'WebView HTML must refresh');
assert.ok(html.includes('/* LIVE PC is a landscape cyberdeck'),'desktop layout remains');
assert.ok(html.includes('body.live-immersive.watch-viewer.watch-game'),'game UI remains separate');
console.log('MOBILE STAGE 1-10, SWIPE CLEAN, HOST THEMES, PC LOCK, CACHE CONTRACT PASS');
