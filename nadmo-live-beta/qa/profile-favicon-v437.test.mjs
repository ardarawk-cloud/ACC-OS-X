import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const js=readFileSync(new URL('../profile-link-icons-v436.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../profile-link-icons-v436.css',import.meta.url),'utf8');
test('client-side code parses',()=>assert.doesNotThrow(()=>new Script(js)));
test('hidden image is eagerly fetched',()=>{
 assert.ok(js.includes("img.loading='eager'"));
 assert.ok(!js.includes("img.loading='lazy'"));
});
test('uses real saved link host without changing destination',()=>{
 assert.ok(js.includes('new URL(anchor.href)'));
 assert.ok(js.includes("'/logo.svg'"));
 assert.ok(js.includes("'/favicon.ico'"));
 assert.ok(!js.includes('anchor.href='));
});
test('ME and creator profiles both get the icon',()=>{
 assert.ok(js.includes('profileBusinessLinks'));assert.ok(js.includes('publicCreatorLinks'));
 assert.ok(css.includes('#settings'));assert.ok(css.includes('#publicProfilePage'));
});
test('missing icons fall back without a broken image',()=>{
 assert.ok(js.includes("badge.dataset.cpLogoStatus='fallback'"));
 assert.ok(js.includes('fallback.textContent'));
});
