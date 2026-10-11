'use strict';
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {runInNewContext}=require('node:vm');
const assert=require('node:assert/strict');
const html=readFileSync(resolve(__dirname,'../public/app/index.html'),'utf8');
const worker=readFileSync(resolve(__dirname,'../worker.mjs'),'utf8');
function expect(cond,msg){assert.ok(cond,msg)}
expect(html.includes('class="logo-name">NADMO <em>LIVE</em>'),'retain primary app brand in header');
expect(!html.includes('<span class="eyebrow">NADMO / LIVE</span>'),'explore LIVE SEKARANG needs no second brand');
expect(!html.includes('NADMO / CYBERDECK'),'cyberdeck menu must be functional label');
expect(!html.includes('class="mobile-live-hud-brand">NADMO LIVE'),'mobile watch should have a signal indicator, not another product header');
expect(!html.includes('class="mobile-game-brand" aria-hidden="true"><b>N/</b><span>GAMECAST <i> / </i> NADMO LIVE'),'GAME overlay should not repeat brand');
expect(!html.includes('class="deck-shell-bottom"><b>NADMO LIVE'),'PC cyberdeck should keep its layout without repeating brand');
expect(!html.includes('<small>NADMO / BACKCHANNEL</small>'),'LIVE chat needs functional label');
expect(html.includes("const title=$('title').value.trim()||'Siaran langsung'"),'new room must not be titled app name');
const start=html.indexOf('function setRoomSubtitle(value){');
const end=html.indexOf('function updateHostCard(room){',start);
expect(start>=0&&end>start,'room subtitle function exists');
const node={textContent:'should clear',hidden:false};
const fn=runInNewContext('(()=>{const $=()=>node;'+html.slice(start,end)+'return setRoomSubtitle})()', {node});
for(const label of ['NADMO LIVE','nadmo/live','Nadmo-Live','Siaran langsung','']){
 fn(label);assert.equal(node.textContent,'','generic '+JSON.stringify(label)+' not displayed');
 assert.equal(node.hidden,true,'generic subtitle must take zero space');
}
fn('Gaming bersama teman');assert.equal(node.textContent,'Gaming bersama teman');
assert.equal(node.hidden,false);
expect(worker.includes("name:joinedName,\n     text:'sudah bergabung'"),'viewer joining should be sender, not NADMO LIVE');
console.log('LIVE_BRANDING_CLARITY_PASS primary logo retained, explore/watch/game/PC cleaned, custom title preserved, join sender is viewer');
