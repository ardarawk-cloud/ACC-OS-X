// ACC OS X — KAI AUTOPILOT ANDROID FOLDER FALLBACK v1
// Runtime evidence: Android WebView can open the normal multi-file picker but does not expose a usable directory picker.
// This adapter keeps the standalone Autopilot panel usable by routing the folder action into the proven multi-file picker.
(() => {
  "use strict";
  if (window.__ACC_KAI_AUTOPILOT_FOLDER_FALLBACK_V1__) return;
  window.__ACC_KAI_AUTOPILOT_FOLDER_FALLBACK_V1__ = true;

  const REVISION = "KAI_AUTOPILOT_FOLDER_FALLBACK_V1_ANDROID";
  const BUTTON_LABEL = "PICK FOLDER MEDIA";

  function patchButton(){
    const button=document.getElementById("acc-autopilot-folder");
    if(!button)return;
    if(String(button.textContent||"").trim()!==BUTTON_LABEL) button.textContent=BUTTON_LABEL;
    if(button.dataset.accFolderFallback!==REVISION) button.dataset.accFolderFallback=REVISION;
  }

  function setStatus(message){
    const node=document.getElementById("acc-autopilot-status");
    if(node){
      if(node.textContent!==message) node.textContent=message;
      node.style.color="#8796ad";
    }
  }

  document.addEventListener("click",event=>{
    const button=event.target?.closest?.("#acc-autopilot-folder");
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const normalInput=document.getElementById("acc-autopilot-file-input");
    if(!normalInput){
      setStatus("Media picker belum tersedia. Reopen PRODUCE lalu coba lagi.");
      return;
    }

    setStatus("Android mode: pilih foto/video dari folder. Bisa pilih beberapa file sekaligus.");
    normalInput.click();
  },true);

  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;patchButton();});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  patchButton();
})();
