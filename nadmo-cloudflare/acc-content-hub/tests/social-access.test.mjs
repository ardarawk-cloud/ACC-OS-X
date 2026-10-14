import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accessOwnerVerified,ACCESS_AUD,ACCESS_ISS} from '../access-auth.mjs';

test('signed owner Access token is required: email, issuer, audience, expiry and signature',async()=>{
 const keypair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',keypair.publicKey);
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({keys:[{...jwk,kid:'kid1'}]}),{status:200,headers:{'Content-Type':'application/json'}});
 const b64=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const signed=async(data)=>{
  const input=b64({alg:'RS256',kid:'kid1'})+'.'+b64(data);
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keypair.privateKey,new TextEncoder().encode(input));
  return input+'.'+Buffer.from(sig).toString('base64url');
 };
 const now=Math.floor(Date.now()/1000);
 const claim={iss:ACCESS_ISS,aud:ACCESS_AUD,email:'owner@example.test',exp:now+300,iat:now-10};
 const check=async(token,env={NADMO_SOCIAL_OWNER_EMAIL:'owner@example.test'})=>accessOwnerVerified(new Request('https://contenthub.nadmo.id/api/social/meta',{headers:{'Cf-Access-Jwt-Assertion':token}}),env);
 try {
  const good=await signed(claim);
  assert.equal(await check(good),true);
  assert.equal(await check(good,{NADMO_SOCIAL_OWNER_EMAIL:'stranger@example.test'}),false);
  assert.equal(await check(await signed({...claim,aud:'wrong'})),false);
  assert.equal(await check(await signed({...claim,iss:'https://bad.example'})),false);
  assert.equal(await check(await signed({...claim,exp:now-1})),false);
  assert.equal(await check(await signed({...claim,email:'other@example.test'})),false);
  assert.equal(await check(good.slice(0,-6)+'AAAAAA'),false);
  assert.equal(await check(good,{NADMO_SOCIAL_OWNER_EMAIL:''}),false);
 } finally {globalThis.fetch=originalFetch}
});
