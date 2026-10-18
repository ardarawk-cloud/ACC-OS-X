// Instagram API with Instagram Login (Business/Creator), owner-only.
// All credentials stay on the Worker; tokens are encrypted with AES-GCM in private D1.
const CALLBACK='/api/social/instagram/callback';
const SCOPES='instagram_business_basic,instagram_business_content_publish';
const HEAD={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const fail=(code,status=400)=>Response.json({ok:false,error:{code}},{status,headers:HEAD});
export const instagramConfigured=env=>Boolean(env.SOCIAL_IG_APP_ID&&env.SOCIAL_IG_APP_SECRET&&env.SOCIAL_IG_TOKEN_KEY&&env.SOCIAL_DB);
function base64(bytes){let str='';for(const x of bytes)str+=String.fromCharCode(x);return btoa(str).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'')}
function decode(s){if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('Invalid key');return Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(s.length/4)*4,'=')),ch=>ch.charCodeAt(0))}
async function encryptToken(value,secret){
 const bits=decode(secret);if(bits.length!==32)throw Error('Invalid token key');
 const key=await crypto.subtle.importKey('raw',bits,{name:'AES-GCM'},false,['encrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const result=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(value));
 return {cipher:base64(new Uint8Array(result)),iv:base64(iv)};
}
const callback=url=>url.origin+CALLBACK;
const returning=(url,channel,result)=>new URL('/social-connect.html?channel='+encodeURIComponent(channel)+'&instagram_result='+encodeURIComponent(result),url.origin).toString();
async function getJson(resource,init){const r=await fetch(resource,init);const o=await r.json().catch(()=>({}));if(!r.ok||o.error)throw Error('Meta error '+r.status);return o}
export async function handleInstagramOAuth(request,env,url){
 if(!env.SOCIAL_DB)return fail('DB_NOT_CONFIGURED',503);
 if(url.pathname==='/api/social/instagram/status'&&request.method==='GET')
  return Response.json({ok:true,configured:instagramConfigured(env),redirect_uri:callback(url)},{headers:HEAD});
 if(!instagramConfigured(env))return fail('IG_OAUTH_NOT_CONFIGURED',503);
 if(url.pathname==='/api/social/instagram/start'&&request.method==='GET'){
  const channel=url.searchParams.get('channel_key')||'';
  if(!/^[a-z0-9-]{3,90}$/.test(channel))return fail('INVALID_CHANNEL');
  if(!await env.SOCIAL_DB.prepare('SELECT channel_key FROM social_channels WHERE channel_key=? AND active=1').bind(channel).first())return fail('CHANNEL_UNKNOWN',404);
  const state=base64(crypto.getRandomValues(new Uint8Array(32)));
  await env.SOCIAL_DB.prepare('INSERT INTO social_instagram_oauth_states(state,channel_key,expires_at) VALUES(?,?,?)')
   .bind(state,channel,Math.floor(Date.now()/1000)+600).run();
  const auth=new URL('https://www.instagram.com/oauth/authorize');
  for(const [k,v] of Object.entries({client_id:String(env.SOCIAL_IG_APP_ID),redirect_uri:callback(url),scope:SCOPES,response_type:'code',enable_fb_login:'0',state}))auth.searchParams.set(k,v);
  return Response.redirect(auth.toString(),302);
 }
 if(url.pathname===CALLBACK&&request.method==='GET'){
  const state=url.searchParams.get('state')||'';
  if(!/^[A-Za-z0-9_-]{43}$/.test(state))return fail('INVALID_STATE',400);
  const consumed=await env.SOCIAL_DB.prepare('DELETE FROM social_instagram_oauth_states WHERE state=? AND expires_at>? RETURNING channel_key')
   .bind(state,Math.floor(Date.now()/1000)).first();
  if(!consumed)return fail('STATE_USED_OR_EXPIRED',403);
  const channel=consumed.channel_key;
  if(url.searchParams.get('error'))return Response.redirect(returning(url,channel,'cancelled'),302);
  const code=url.searchParams.get('code')||'';
  if(!code||code.length>2500)return fail('MISSING_CODE',400);
  try{
   const form=new URLSearchParams({client_id:String(env.SOCIAL_IG_APP_ID),client_secret:String(env.SOCIAL_IG_APP_SECRET),grant_type:'authorization_code',redirect_uri:callback(url),code:code.replace(/#_$/,'')});
   const exchange=await getJson('https://api.instagram.com/oauth/access_token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});
   const short=exchange.access_token?exchange:Array.isArray(exchange.data)&&exchange.data.length===1?exchange.data[0]:null;
   if(typeof short?.access_token!=='string')throw Error('Invalid short token');
   const long=new URL('https://graph.instagram.com/access_token');
   for(const [k,v] of Object.entries({grant_type:'ig_exchange_token',client_secret:String(env.SOCIAL_IG_APP_SECRET),access_token:short.access_token}))long.searchParams.set(k,v);
   const extended=await getJson(long.toString());
   if(typeof extended.access_token!=='string'||extended.access_token.length<30||!Number.isFinite(extended.expires_in)||extended.expires_in<86400)throw Error('Invalid long token');
   const profile=await getJson('https://graph.instagram.com/me?fields=id,user_id,username,account_type',{headers:{Authorization:'Bearer '+extended.access_token,Accept:'application/json'}});
   const id=String(profile.user_id||profile.id||''),username=String(profile.username||'').trim();
   if(!/^\d{1,32}$/.test(id)||!/^[A-Za-z0-9._]{1,60}$/.test(username)||profile.account_type==='PERSONAL')throw Error('Invalid professional profile');
   const encrypted=await encryptToken(extended.access_token,env.SOCIAL_IG_TOKEN_KEY);
   const now=new Date().toISOString(),expiry=Math.floor(Date.now()/1000)+Math.floor(extended.expires_in)-3600;
   const sql='INSERT INTO social_instagram_accounts(account_id,username,account_type,token_cipher,token_iv,token_expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET username=excluded.username,account_type=excluded.account_type,token_cipher=excluded.token_cipher,token_iv=excluded.token_iv,token_expires_at=excluded.token_expires_at,updated_at=excluded.updated_at';
   await env.SOCIAL_DB.prepare(sql).bind(id,username,String(profile.account_type||'PROFESSIONAL'),encrypted.cipher,encrypted.iv,expiry,now,now).run();
   return Response.redirect(returning(url,channel,'connected'),302);
  }catch{
   return Response.redirect(returning(url,channel,'failed'),302);
  }
 }
 return fail('NOT_FOUND',404);
}
