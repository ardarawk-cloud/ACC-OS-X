(() => {
  'use strict';
  // No client secret persistence; the owner key is held in this tab's JS memory only.
  let ownerKey='',meta=null,jobs=[],pendingKey=null;
  const $=id=>document.getElementById(id);
  const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!=null)node.textContent=String(text);return node;};
  function notice(message,error=false){const n=$('notice');n.textContent=message;n.className='show'+(error?' error':'');}
  async function api(path,method='GET',data) {
    const response=await fetch('/api/social'+path,{
      method,credentials:'same-origin',headers:{'X-NADMO-OWNER-KEY':ownerKey,...(data?{'Content-Type':'application/json'}:{})},
      body:data?JSON.stringify(data):undefined,cache:'no-store'
    });
    const result=await response.json().catch(()=>({error:{message:'Malformed API response'}}));
    if(!response.ok)throw new Error((result.error?.message||response.statusText)+' (HTTP '+response.status+')');
    return result;
  }
  const WITA=()=>{
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
    return [p.year,p.month,p.day].join('-');
  };
  async function refresh() {
    const [a,b]=await Promise.all([api('/meta'),api('/jobs')]);
    meta=a;jobs=b.jobs||[];
    $('accountInfo').textContent=meta.account+' · '+(meta.handle||'username belum ditetapkan')+' · '+(meta.paused?'PAUSED':'queue aktif');
    $('pauseBtn').textContent=meta.paused?'RESUME ALL':'PAUSE ALL';
    const selected=$('channel').value;
    $('channel').replaceChildren(el('option',null,'UNASSIGNED — perlu identifikasi'));
    $('channel').firstChild.value='';
    for(const c of meta.channels) {
      const option=el('option',null,c.name);option.value=c.key;$('channel').append(option);
    }
    $('channel').value=selected;
    render();
  }
  function button(text,fn,cls='secondary') {
    const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;
  }
  async function mutate(id,action,extras={}) {
    const job=jobs.find(j=>j.id===id);if(!job)return;
    try{
      const result=await api('/jobs/'+encodeURIComponent(id)+'/action','POST',{action,expected_version:job.version,...extras});
      notice('Status diperbarui: '+result.job.status);
      await refresh();
    }catch(e){notice(e.message,true);}
  }
  function render(){
    const date=$('dateSelect').value||WITA();
    const forDay=jobs.filter(j=>j.scheduled_date===date);
    $('readyCount').textContent=jobs.filter(j=>j.status==='READY').length;
    $('scheduleCount').textContent=jobs.filter(j=>j.status==='SCHEDULED').length;
    $('todayCount').textContent=forDay.length+'/10';
    $('statusCount').textContent=jobs.filter(j=>j.status==='PUBLISHED_VERIFIED').length;
    const slots=$('slots');slots.replaceChildren();
    const currentDate=WITA();
    for(const slot of meta.slots) {
      const j=forDay.find(x=>x.scheduled_time===slot);
      const cell=el('div','slot'+(j?' filled':'')+(date<currentDate?' past':''),slot+(j?' ✓':''));cell.title=j?j.channel_name:'slot tersedia';slots.append(cell);
    }
    const list=$('jobList');list.replaceChildren();
    const show=jobs.filter(j=>!j.scheduled_date||j.scheduled_date===date);
    if(!show.length)list.append(el('p','subtle','Belum ada konten dalam antrean untuk tanggal ini.'));
    for(const j of show){
      const card=el('article','job');
      const head=el('div','jobhead'),info=el('div'),status=el('span','status',j.status);
      info.append(el('h3',null,j.title),el('div','meta',j.channel_name+' · '+j.category+' · '+j.priority+' · '+(j.scheduled_date?j.scheduled_date+' '+j.scheduled_time+' WITA':'belum dijadwalkan')));
      head.append(info,status);card.append(head);
      card.append(el('p','caption',j.caption));
      const foot=el('div','jobfoot'),actions=el('div','actions');
      const link=el('a',null,'Lihat media ↗');link.href=j.media_url;link.target='_blank';link.rel='noopener noreferrer';foot.append(link);
      actions.append(button('Salin caption',async()=>{try{await navigator.clipboard.writeText(j.caption);notice('Caption disalin')}catch{notice('Clipboard gagal; salin manual dari caption',true)}}));
      if(j.status==='UNASSIGNED'){
        const sel=el('select');sel.style.maxWidth='220px';
        for(const c of meta.channels){const o=el('option',null,c.name);o.value=c.key;sel.append(o);}
        actions.append(sel,button('Tentukan channel',()=>mutate(j.id,'resolve_channel',{channel_key:sel.value})));
      }
      if(j.status==='QC_PENDING'||j.status==='QC_BLOCKED'){
        actions.append(button('QC lulus',()=>{if(confirm('Sudah periksa fakta, izin pakai media, privasi, dan hak cipta?'))mutate(j.id,'qc_pass',{rights_confirmed:true});}));
      }
      if(['QC_PENDING','READY','SCHEDULED','PAUSED'].includes(j.status)){
        actions.append(button('Blok QC',()=>mutate(j.id,'qc_block'), 'danger'));
      }
      if(['READY','SCHEDULED'].includes(j.status))actions.append(button('Pause job',()=>mutate(j.id,'pause')));
      if(j.status==='PAUSED')actions.append(button('Kembali READY',()=>mutate(j.id,'resume')));
      if(j.status==='SCHEDULED'){
        actions.append(button('Bagi ke TikTok',()=>share(j)));
        actions.append(button('Tandai Share Dibuka',()=>{if(confirm('Pastikan kamu SUDAH membuka alur berbagi di TikTok. Ini BUKAN bukti posting.'))mutate(j.id,'share_opened');}));
      }
      if(j.status==='SHARE_OPENED'){
        actions.append(button('Masukkan URL posting',()=>report(j)));
        actions.append(button('Belum jadi posting',()=>mutate(j.id,'not_posted'),'danger'));
      }
      if(j.status==='SELF_REPORTED'){
        actions.append(button('Verifikasi posting',()=>{if(confirm('Sudah buka URL, cocokkan akun TikTok, konten dan waktu posting?'))mutate(j.id,'verify',{owner_verified:true})}));
        actions.append(button('Kembalikan READY',()=>mutate(j.id,'not_posted'),'danger'));
      }
      if(!['CANCELLED','PUBLISHED_VERIFIED'].includes(j.status))actions.append(button('Batalkan',()=>{if(confirm('Batalkan konten ini?'))mutate(j.id,'cancel')},'danger'));
      if(j.published_url){const proof=el('a',null,'Bukti TikTok ↗');proof.href=j.published_url;proof.rel='noopener noreferrer';proof.target='_blank';foot.append(proof);}
      foot.append(actions);card.append(foot);list.append(card);
    }
  }
  async function share(job){
    // The browser share sheet may show TikTok. Share handoff alone NEVER means public post.
    const url=job.media_url;
    try{
      if(navigator.share){
        const resp=await fetch(url,{mode:'cors'});
        if(!resp.ok)throw new Error('Media HTTP '+resp.status);
        const blob=await resp.blob();
        const ext=job.media_type==='video'?'.mp4':'.jpg';
        const file=new File([blob],job.channel_key+'-'+job.id.slice(0,8)+ext,{type:blob.type||(job.media_type==='video'?'video/mp4':'image/jpeg')});
        if(navigator.canShare?.({files:[file]})){
          await navigator.share({files:[file],title:job.title,text:job.caption});
          notice('Share sheet selesai. Pastikan memilih TikTok, lalu gunakan "Tandai Share Dibuka". Bukan bukti publish.');
          return;
        }
      }
      window.open(url,'_blank','noopener,noreferrer');
      notice('Media dibuka. Simpan/bagikan ke TikTok secara manual; jangan tandai terbit sebelum verifikasi.');
    }catch(e){notice('Berbagi media belum berhasil: '+e.message+'. Unduh lewat tautan Lihat media.',true);}
  }
  function report(j){
    const url=prompt('Tempel URL posting TikTok (akun yang benar):','https://www.tiktok.com/@');
    if(!url)return;
    mutate(j.id,'self_report',{published_url:url.trim()});
  }
  $('loginForm').addEventListener('submit',async e=>{
    e.preventDefault();ownerKey=$('ownerKey').value;$('ownerKey').value='';
    try{await refresh();$('loginPanel').hidden=true;$('appPanel').hidden=false;$('logout').hidden=false;notice('Dashboard terbuka. Tidak ada posting otomatis.')}
    catch(err){ownerKey='';notice(err.message,true);}
  });
  $('logout').addEventListener('click',()=>{ownerKey='';meta=null;jobs=[];$('appPanel').hidden=true;$('loginPanel').hidden=false;$('logout').hidden=true;notice('Dashboard terkunci.')});
  $('createForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const data={source:'owner_dashboard',platform:'tiktok',channel_key:$('channel').value,client_submission_key:pendingKey||(pendingKey=crypto.randomUUID()),title:$('title').value,caption:$('caption').value,media_url:$('mediaUrl').value,media_type:$('mediaType').value,priority:$('priority').value};
    try{
      const response=await api('/jobs','POST',data);
      notice(response.duplicate?'Konten sudah ada; tidak dibuat ulang.':'Konten masuk antrean.');
      pendingKey=null;$('createForm').reset();await refresh();
    }catch(err){notice(err.message,true);}
  });
  $('scheduleBtn').addEventListener('click',async()=>{
    try{
      const date=$('dateSelect').value||WITA();
      const r=await api('/schedule','POST',{date});
      notice('Dijadwalkan '+r.scheduled.length+' konten, bentrok '+r.conflicts.length+'; target maksimum 10 slot.');await refresh();
    }catch(e){notice(e.message,true);}
  });
  $('pauseBtn').addEventListener('click',async()=>{
    try{
      const paused=!meta.paused;
      if(!confirm(paused?'Hentikan penjadwalan semua konten?':'Aktifkan kembali antrean?'))return;
      await api('/settings','POST',{paused});await refresh();notice(paused?'Semua penjadwalan PAUSED':'Penjadwalan diaktifkan');
    }catch(e){notice(e.message,true);}
  });
  $('refreshBtn').addEventListener('click',()=>refresh().catch(e=>notice(e.message,true)));
  $('dateSelect').value=WITA();$('dateSelect').addEventListener('change',()=>{if(meta)render()});
})();