import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html=await readFile(new URL('../public/app/index.html',import.meta.url),'utf8');
const between=(a,b)=>{
 const start=html.indexOf(a),end=html.indexOf(b,start);
 assert.ok(start>=0&&end>start,'missing camera function markers');
 return html.slice(start,end);
};
const camera=between('async function openLiveCamera(audio=true){','function useLiveCamera(result){');
assert.match(camera,/getUserMedia\(/,'camera uses native media device');
assert.match(camera,/return \{stream:raw,controller:null\}/,'return unprocessed camera track');
assert.doesNotMatch(camera,/canvas|captureStream|drawImage|setInterval/,'never rasterize camera to low-resolution portrait');
const constraints=between('function liveCameraConstraints(){','async function preview(){');
assert.match(constraints,/aspectRatio:\{ideal:3\/4\}/,'mobile requests a wider native portrait sensor instead of tight 9:16 crop');
assert.match(constraints,/resizeMode:\{ideal:'none'\}/,'prevent browser crop-and-scale preference');
assert.match(constraints,/16\/9/,'PC landscape remains supported');
const hud=between('/* MOBILE CAMERA: original immersive TikTok-like composition.','/* LIVE CAMERA — prioritize a native portrait sensor');
assert.match(hud,/@media\(max-width:799px\)/,'mobile-only portrait HUD');
assert.match(hud,/object-fit:cover!important/,'legacy mobile rule remains available');
assert.match(html,/body\.live-immersive:not\(\.watch-game\) #watch #remote\{\s*object-fit:contain!important/,'owner no-crop override must win for mobile cameras');
for(const id of ['#hostControls','#viewerTools','#giftQuick','#moreQuick','.room-safety','#chat']){
 assert.ok(hud.includes(id),'mobile camera HUD missing '+id);
}
assert.ok(html.includes('body.live-immersive.watch-viewer.watch-game'),'game surface remains');
assert.ok(html.includes('/* LIVE PC is a landscape cyberdeck'),'PC landscape contract remains');
console.log('NADMO LIVE NATIVE CAMERA + MOBILE RIGHT RAIL CONTRACT PASS');
