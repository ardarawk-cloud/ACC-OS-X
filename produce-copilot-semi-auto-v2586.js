// ACC OS X — BUILD 258.6 SEMI-AUTO NATIVE SHARE
// Android APK uses the native ACCAndroid bridge for poster + caption sharing.
// Browser/PWA keeps Web Share and download/copy fallbacks.
(() => {
  "use strict";
  if(window.__ACC_SEMI_AUTO_PUBLISH_V2586__)return;
  window.__ACC_SEMI_AUTO_PUBLISH_V2586__=true;

  const REVISION="BUILD258_6_SEMI_AUTO_NATIVE_SHARE";
  const MAIN_KEY="acc_os_x_ecosystem_v214";
  const COPILOT_KEY="acc_os_x_produce_copilot_v1";
  const PANEL_ID="acc-produce-copilot-panel";
  const FALLBACK_MAPPED=new Set(["ch-tukang-tambang"]);
  const text=v=>typeof v==="string"?v.trim():"";

  function read(key){try{return JSON.parse(localStorage.getItem(key)||"{}");}catch{return{};}}
  function activeId(){return text(document.getElementById(PANEL_ID)?.dataset?.channelId);}
  function packageFor(id){return read(COPILOT_KEY)?.channels?.[id]?.package||{};}
  function packageReady(id){
    const pkg=packageFor(id);
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
  function nativeShareAvailable(){
    try{return Boolean(window.ACCAndroid&&typeof window.ACCAndroid.sharePackage==="function"&&window.ACCAndroid.isNativeShareAvailable());}
    catch{return false;}
  }
  function cleanName(id){return `ACC-OS-X-${String(id||"poster").replace(/[^a-z0-9_-]+/gi,"-")}-${Date.now()}.jpg`;}
  function decodeBase64(base64){
    const raw=atob(text(base64));const bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    return bytes;
  }
  async function browserShareOrFallback(id){
    const pkg=packageFor(id),caption=text(pkg.caption),base64=text(pkg.posterBase64),filename=cleanName(id);
    try{
      const file=new File([decodeBase64(base64)],filename,{type:"image/jpeg"});
      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({title:"ACC OS X",text:caption,files:[file]});
        setStatus("SHARE SHEET DIBUKA // Pilih aplikasi tujuan.");
        return;
      }
    }catch(error){if(String(error?.name||"")==="AbortError")return;}

    let copied=false;
    try{await navigator.clipboard.writeText(caption);copied=true;}catch{}
    try{
      const a=document.createElement("a");a.href=`data:image/jpeg;base64,${base64}`;a.download=filename;a.rel="noopener";document.body.appendChild(a);a.click();a.remove();
    }catch{}
    setStatus(copied?"MANUAL READY // Caption disalin + poster diunduh. Buka Facebook lalu paste caption.":"MANUAL READY // Poster diunduh. Salin caption dari panel lalu posting manual.");
  }
  async function manualShare(id){
    const pkg=packageFor(id),base64=text(pkg.posterBase64),caption=text(pkg.caption);
    if(!base64||!caption)return setStatus("Poster + caption harus siap dulu.",true);

    if(nativeShareAvailable()){
      setStatus("ANDROID SHARE // Menyiapkan poster + caption…");
      try{
        const accepted=window.ACCAndroid.sharePackage(base64,caption,cleanName(id));
        if(accepted!==false){
          setStatus("ANDROID SHARE // Pilih Facebook, Instagram, atau aplikasi tujuan.");
          return;
        }
      }catch{}
      setStatus("ANDROID SHARE gagal. Menjalankan fallback…",true);
    }
    await browserShareOrFallback(id);
  }
  function paint(){
    ensureStyle();
    const id=activeId(),panel=document.getElementById(PANEL_ID),btn=document.getElementById("acc-copilot-publish");if(!id||!panel||!btn)return;
    const ready=packageReady(id),hasMap=mapped(id);
    let note=panel.querySelector("[data-manual-ready-note]");
    if(ready&&!hasMap){
      btn.disabled=false;btn.classList.add("manual-ready");btn.dataset.publishMode="MANUAL_OWNER";btn.textContent="↗ SHARE / POST MANUAL";btn.title="Bagikan poster + caption melalui Android atau share sheet perangkat.";
      if(!note){note=document.createElement("div");note.className="acc-manual-ready-note";note.dataset.manualReadyNote="1";btn.insertAdjacentElement("afterend",note);}
      note.textContent=nativeShareAvailable()?"SEMI AUTO • Native Android share aktif. Tap tombol lalu pilih Facebook/Instagram.":"SEMI AUTO • Tap tombol untuk share poster + caption. Browser/PWA memakai Web Share atau fallback download/copy.";
      const status=document.getElementById("acc-copilot-status");if(status&&/Meta Page channel ini belum di-map/i.test(text(status.textContent)))setStatus("MANUAL PUBLISH READY // Meta mapping tidak diperlukan pada mode semi-auto.");
    }else{
      btn.classList.remove("manual-ready");delete btn.dataset.publishMode;if(note)note.remove();
    }
  }
  document.addEventListener("click",event=>{
    const btn=event.target?.closest?.("#acc-copilot-publish");if(!btn)return;
    const id=activeId();if(!id||!packageReady(id)||mapped(id))return;
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
    manualShare(id);paint();
  },true);
  let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;paint();});}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener("storage",schedule);setInterval(schedule,1000);schedule();
  window.ACCSemiAutoPublish=Object.freeze({revision:REVISION,mode:"MANUAL_OWNER",nativeShare:nativeShareAvailable,refresh:paint});
})();
