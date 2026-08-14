// ACC OS X — BUILD 258.6 SEMI-AUTO MANUAL SHARE
// In semi-automatic production, an unmapped Meta page is not an error.
// Complete K/P/C packages can be shared from Android; direct Meta publishing remains available when mapped.
(() => {
  "use strict";
  if(window.__ACC_SEMI_AUTO_PUBLISH_V2586__)return;
  window.__ACC_SEMI_AUTO_PUBLISH_V2586__=true;

  const REVISION="BUILD258_6_SEMI_AUTO_MANUAL_SHARE";
  const MAIN_KEY="acc_os_x_ecosystem_v214";
  const COPILOT_KEY="acc_os_x_produce_copilot_v1";
  const PANEL_ID="acc-produce-copilot-panel";
  const FALLBACK_MAPPED=new Set(["ch-tukang-tambang"]);
  const text=v=>typeof v==="string"?v.trim():"";

  function read(key){try{return JSON.parse(localStorage.getItem(key)||"{}");}catch{return{};}}
  function activeId(){return text(document.getElementById(PANEL_ID)?.dataset?.channelId);}
  function rowOf(id){return read(COPILOT_KEY)?.channels?.[id]||null;}
  function packageReady(id){
    const pkg=rowOf(id)?.package||{};
    if(!text(pkg.posterBase64)||!text(pkg.caption)||text(pkg.publishedPostId))return false;
    const gate=document.querySelector("#acc-produce-copilot-panel [data-contract-gate]");
    return !gate||/PUBLISH READY/i.test(text(gate.textContent));
  }
  function mapped(id){
    if(FALLBACK_MAPPED.has(id))return true;
    return Boolean(read(MAIN_KEY)?.settings?.publishMappings?.[id]);
  }
  function ensureStyle(){
    if(document.getElementById("acc-semi-auto-v2586-style"))return;
    const s=document.createElement("style");s.id="acc-semi-auto-v2586-style";
    s.textContent=`.acc-copilot-publish.manual-ready{background:#0daa7b!important;border-color:rgba(105,239,179,.55)!important;opacity:1!important;filter:none!important}.acc-manual-ready-note{margin-top:8px;font-size:10px;line-height:1.45;color:#69efb3;font-weight:800}`;
    document.head.appendChild(s);
  }
  function setStatus(message,error=false){const el=document.getElementById("acc-copilot-status");if(!el)return;el.textContent=message;el.style.color=error?"#ff8095":"#69efb3";}
  function channelName(id){
    const option=[...document.querySelectorAll("select option")].find(x=>String(x.value||"")===id);
    return text(option?.textContent)||id;
  }
  function safeName(value){return String(value||"ACC").replace(/[^a-z0-9._-]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,60)||"ACC";}
  function base64File(base64,name){
    const clean=String(base64||"").replace(/^data:image\/[a-z0-9.+-]+;base64,/i,"");
    const raw=atob(clean),parts=[];const step=32768;
    for(let offset=0;offset<raw.length;offset+=step){
      const chunk=raw.slice(offset,offset+step),bytes=new Uint8Array(chunk.length);
      for(let i=0;i<chunk.length;i++)bytes[i]=chunk.charCodeAt(i);
      parts.push(bytes);
    }
    return new File(parts,name,{type:"image/jpeg",lastModified:Date.now()});
  }
  async function copyText(value){
    const v=String(value||"");
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(v);return true;}
    const ta=document.createElement("textarea");ta.value=v;ta.setAttribute("readonly","");ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();const ok=document.execCommand?.("copy");ta.remove();return Boolean(ok);
  }
  function downloadFile(file){
    const url=URL.createObjectURL(file),a=document.createElement("a");a.href=url;a.download=file.name;a.rel="noopener";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
  }
  async function manualShare(id){
    const row=rowOf(id),pkg=row?.package||{};
    if(!packageReady(id))return setStatus("Poster + caption belum lengkap.",true);
    const name=channelName(id),filename=`${safeName(name)}-${new Date().toISOString().slice(0,10)}.jpg`;
    let file;
    try{file=base64File(pkg.posterBase64,filename);}catch{return setStatus("Poster tidak bisa disiapkan untuk share.",true);}

    const shareData={title:`${name} — ACC OS X`,text:String(pkg.caption||""),files:[file]};
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
      setStatus("Membuka share Android…");
      try{
        await navigator.share(shareData);
        setStatus("MANUAL SHARE READY // Pilih Facebook/Instagram atau aplikasi tujuan dari Android.");
        return;
      }catch(error){
        if(String(error?.name||"")==="AbortError"){setStatus("Share dibatalkan. Paket tetap siap.");return;}
      }
    }

    let copied=false,downloaded=false;
    try{copied=await copyText(pkg.caption);}catch{}
    try{downloadFile(file);downloaded=true;}catch{}
    if(copied&&downloaded)setStatus("MANUAL READY // Caption disalin + poster diunduh. Buka Facebook lalu paste caption.");
    else if(downloaded)setStatus("MANUAL READY // Poster diunduh. Salin caption dari panel lalu posting.");
    else if(copied)setStatus("MANUAL READY // Caption disalin. Simpan poster dari preview lalu posting.");
    else setStatus("Manual share tidak didukung WebView ini. Simpan poster dari preview dan salin caption.",true);
  }
  function paint(){
    ensureStyle();
    const id=activeId(),panel=document.getElementById(PANEL_ID),btn=document.getElementById("acc-copilot-publish");if(!id||!panel||!btn)return;
    const ready=packageReady(id),hasMap=mapped(id);
    let note=panel.querySelector("[data-manual-ready-note]");
    if(ready&&!hasMap){
      btn.disabled=false;btn.classList.add("manual-ready");btn.dataset.publishMode="MANUAL_OWNER";btn.textContent="↗ SHARE / POST MANUAL";btn.title="Bagikan poster + caption lewat Android. Meta mapping belum diperlukan.";
      if(!note){note=document.createElement("div");note.className="acc-manual-ready-note";note.dataset.manualReadyNote="1";btn.insertAdjacentElement("afterend",note);}note.textContent="SEMI AUTO • Tap tombol untuk share poster + caption. Pilih Facebook/Instagram dari share sheet Android.";
      const status=document.getElementById("acc-copilot-status");if(status&&(/Meta Page channel ini belum di-map/i.test(text(status.textContent))||/MANUAL PUBLISH READY/i.test(text(status.textContent))))setStatus("MANUAL SHARE READY // Poster + caption lengkap.");
    }else{
      btn.classList.remove("manual-ready");delete btn.dataset.publishMode;if(note)note.remove();
    }
  }
  document.addEventListener("click",event=>{
    const btn=event.target?.closest?.("#acc-copilot-publish");if(!btn)return;
    const id=activeId();if(!id||!packageReady(id)||mapped(id))return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    manualShare(id).finally(paint);
  },true);
  let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paint();});}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener("storage",schedule);setInterval(schedule,1000);schedule();
  window.ACCSemiAutoPublish=Object.freeze({revision:REVISION,mode:"MANUAL_OWNER_SHARE",refresh:paint,share:manualShare});
})();
