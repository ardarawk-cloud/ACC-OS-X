import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../source/public/social.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../source/public/social.js',import.meta.url),'utf8');
test('no manual creation/upload form in NADMO Social',()=>{
 assert.doesNotMatch(html,/id="createForm"/);
 assert.doesNotMatch(html,/Masukkan konten|HTTPS media URL|Tambah ke antrean \(bukan publish\)/);
 assert.doesNotMatch(js,/createForm|pendingKey|\$\('channel'\)/);
});
test('dashboard explains truthful chat connector status without claiming publish',()=>{
 assert.match(html,/CHAT-FIRST/);
 assert.match(html,/BELUM TERSAMBUNG/);
 assert.match(html,/Antrean pusat/);
 assert.match(html,/Tidak memakai TikTok Direct Post API/);
});
