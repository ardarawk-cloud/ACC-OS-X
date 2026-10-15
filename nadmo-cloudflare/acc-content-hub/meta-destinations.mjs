// Owner-only destination account discovery and per-channel selection.
// Meta tokens stay inside the existing ACC-PUBLISH-CONNECTOR Worker.
// No account is selected from content brand names or implicit global defaults.
const send=(obj,status=200)=>Response.json(obj,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const norm=(s,n=100)=>typeof s==='string'?s.trim().slice(0,n):'';
async function lookup(fetcher,path) {
  if(!fetcher)return {ok:false,accounts:[],error:'Meta connector binding unavailable'};
  try {
    const r=await fetcher.fetch(new Request('https://acc-publish-connectorv2.internal'+path,{method:'GET'}));
    const data=await r.json();
    return {ok:r.ok && data.ok===true,data,status:r.status,error:data.error?.message||null};
  }catch(e){return {ok:false,accounts:[],error:'Meta account discovery is unavailable'}}
}
export async function discoverMeta(env){
  const [pages,ig]=await Promise.all([
    lookup(env.META_CONNECTOR,'/api/acc-publish/pages'),
    lookup(env.META_CONNECTOR,'/api/acc-publish/instagram-accounts')
  ]);
  const results=[];
  if(pages.ok){
    for(const row of pages.data.pages||[]){
      if(!/^\d+$/.test(String(row.id))||!row.name)continue;
      results.push({platform:'facebook_page',id:String(row.id),label:norm(row.name),connected:true});
    }
  }
  if(ig.ok){
    for(const row of ig.data.accounts||[]){
      if(!/^\d+$/.test(String(row.id)))continue;
      results.push({platform:'instagram',id:String(row.id),label:norm(row.username||row.name||row.id),connected:true,page_id:String(row.pageId||'')});
    }
  }
  const dedup=[...new Map(results.map(x=>[x.platform+':'+x.id,x])).values()];
  return {accounts:dedup,facebook_ok:pages.ok,instagram_ok:ig.ok,errors:[!pages.ok?pages.error:'',!ig.ok?ig.error:''].filter(Boolean)};
}
const available=(x,acc)=>acc.some(a=>a.platform===x.platform && a.id===x.id);
async function getSelections(db,channel){
  const r=await db.prepare('SELECT platform,target_id,label,updated_at FROM social_channel_destinations WHERE channel_key=? ORDER BY platform,label')
    .bind(channel).all();
  return r.results||[];
}
async function channelExists(db,key){
  return !!await db.prepare('SELECT channel_key FROM social_channels WHERE channel_key=? AND active=1').bind(key).first();
}
export async function handleMetaDestinations(request,env,url){
  if(!env.SOCIAL_DB)return send({ok:false,error:{code:'DB_UNAVAILABLE'}},503);
  const db=env.SOCIAL_DB,route=url.pathname;
  if(route==='/api/social/accounts/meta' && request.method==='GET'){
    const found=await discoverMeta(env);
    return send({ok:true,...found,interactive_oauth_configured:false});
  }
  if(route==='/api/social/channel-destinations' && request.method==='GET'){
    const key=norm(url.searchParams.get('channel_key'),90);
    if(!await channelExists(db,key))return send({ok:false,error:{code:'CHANNEL_UNKNOWN'}},404);
    return send({ok:true,channel_key:key,selected:await getSelections(db,key)});
  }
  if(route==='/api/social/channel-destinations' && request.method==='POST'){
    const body=await request.json().catch(()=>null);
    const key=norm(body?.channel_key,90),targets=body?.targets;
    if(!await channelExists(db,key))return send({ok:false,error:{code:'CHANNEL_UNKNOWN'}},404);
    if(!Array.isArray(targets)||targets.length>100)return send({ok:false,error:{code:'INVALID_DESTINATIONS'}},400);
    if(targets.some(t=>!t||!['facebook_page','instagram'].includes(t.platform)||!/^\d+$/.test(String(t.id||''))))return send({ok:false,error:{code:'INVALID_DESTINATIONS'}},400);
    const ids=[...new Map(targets.map(t=>[t.platform+':'+t.id,{platform:t.platform,id:String(t.id)}])).values()];
    // Fail closed if existing Meta credentials cannot verify the selected target.
    const found=await discoverMeta(env);
    if(ids.some(t=>!available(t,found.accounts)))return send({ok:false,error:{code:'ACCOUNT_NOT_CONNECTED',message:'Refresh connected Meta account list before selecting'}},409);
    const now=new Date().toISOString();
    const stmts=[db.prepare('DELETE FROM social_channel_destinations WHERE channel_key=?').bind(key)];
    for(const t of ids){
      const record=found.accounts.find(a=>a.platform===t.platform&&a.id===t.id);
      stmts.push(db.prepare('INSERT INTO social_channel_destinations(channel_key,platform,target_id,label,updated_at) VALUES(?,?,?,?,?)')
        .bind(key,t.platform,t.id,record.label,now));
    }
    await db.batch(stmts);
    return send({ok:true,channel_key:key,selected:await getSelections(db,key)});
  }
  return send({ok:false,error:{code:'NOT_FOUND'}},404);
}
