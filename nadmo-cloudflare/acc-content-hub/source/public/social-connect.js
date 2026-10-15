(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const channel=new URL(location.href).searchParams.get('channel')||'';
 let accounts=[], selected=[],saving=false;
 const accountId=a=>a.platform+':'+a.id;
 const status=s=>{$('state').textContent=s};
 const api=async(path,body)=>{
   const r=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
   const data=await r.json().catch(()=>({}));
   if(!r.ok||data.ok!==true)throw new Error(data?.error?.message||data?.error?.code||'Gagal memuat akun ('+r.status+')');
   return data;
 };
 function renderPlatform(name,id){
   const list=accounts.filter(a=>a.platform===name),node=$(id);
   node.replaceChildren();
   if(!list.length){
     const d=document.createElement('div');d.className='empty';
     d.textContent=name==='facebook_page'?'Belum ada Facebook Page yang diizinkan konektor.':'Belum ada akun Instagram profesional yang diizinkan konektor.';
     node.append(d);return;
   }
   for(const a of list){
     const button=document.createElement('button');button.type='button';button.className='account';
     const chosen=selected.some(s=>accountId(s)===accountId(a));
     button.setAttribute('aria-pressed',String(chosen));button.disabled=saving;
     const mark=document.createElement('span');mark.className='check';mark.textContent=chosen?'✓':'';
     const details=document.createElement('span');details.className='details';
     const title=document.createElement('strong');title.textContent=a.label;
     const subtitle=document.createElement('small');subtitle.textContent=(a.platform==='facebook_page'?'Facebook Page':'Instagram profesional')+' · '+a.id;
     details.append(title,subtitle);button.append(mark,details);
     button.addEventListener('click',async()=>{
       if(saving)return;
       const previous=selected.slice(),exists=previous.some(s=>accountId(s)===accountId(a));
       const next=exists?previous.filter(s=>accountId(s)!==accountId(a)):[...previous,{platform:a.platform,id:a.id}];
       selected=next;saving=true;render();
       try{
         const saved=await api('/api/social/channel-destinations',{channel_key:channel,targets:next});
         selected=saved.selected.map(s=>({platform:s.platform,id:s.target_id}));
         status('Tersimpan otomatis · '+selected.length+' akun dipilih untuk channel ini.');
       }catch(e){selected=previous;status('Gagal menyimpan: '+e.message)}
       finally{saving=false;render()}
     });
     node.append(button);
   }
 }
 function refreshReturnLink(){
   const targets=selected.map(t=>{
     const a=accounts.find(x=>x.platform===t.platform&&x.id===t.id);
     return a?{platform:a.platform,id:a.id,label:a.label}:null;
   }).filter(Boolean);
   $('backApp').href='acccontenthub://post?channel='+encodeURIComponent(channel)+'&targets='+encodeURIComponent(JSON.stringify(targets));
 }
 const render=()=>{renderPlatform('facebook_page','facebook');renderPlatform('instagram','instagram');refreshReturnLink()};
 async function refresh(){
   if(!/^[a-z0-9-]{3,90}$/.test(channel)){status('Channel dari percakapan tidak dikenali. Buka melalui tautan channel yang tepat.');return}
   try{
     const [list,current]=await Promise.all([
       api('/api/social/accounts/meta'),
       api('/api/social/channel-destinations?channel_key='+encodeURIComponent(channel))
     ]);
     accounts=list.accounts||[];
     selected=(current.selected||[]).map(s=>({platform:s.platform,id:s.target_id}));
     status(accounts.length?'Pilih akun. Perubahan langsung tersimpan ('+selected.length+' terpilih).':'Belum ada akun Meta yang dapat ditemukan dari konektor.');
     render();
   }catch(e){status('Koneksi Meta belum siap: '+e.message)}
 }
 $('channel').replaceChildren(new Option(channel||'Tidak diketahui',channel));
 refreshReturnLink();
 $('refreshFb').onclick=refresh;
 $('refreshIg').onclick=refresh;
 refresh();
})();