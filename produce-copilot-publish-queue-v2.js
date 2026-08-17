// ACC OS X — PRODUCE COPILOT ITEM QUEUE V2
// Batch production preview is rendered from stored batchPoster/batchCaption data.
// Bulk publish is impossible. Per-item publish is intentionally HOLD until connector/API repair.
(() => {
  "use strict";
  if (window.__ACC_COPILOT_ITEM_QUEUE_V2__) return;
  window.__ACC_COPILOT_ITEM_QUEUE_V2__ = true;

  const REVISION="ITEM_QUEUE_V2_PREVIEW_RECOVERY_API_HOLD";
  const MAIN_KEY="acc_os_x_ecosystem_v214";
  const STORE_KEY="acc_os_x_produce_copilot_v1";
  const PANEL_ID="acc-produce-copilot-panel";
  const BULK_ID="acc-copilot-publish-bulk-disabled-v2";
  const API_HOLD=true;
  const txt=v=>typeof v==="string"?v.trim():"";
  const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  function read(k,f={}){try{return JSON.parse(localStorage.getItem(k)||"")||f}catch{return f}}
  function main(){return read(MAIN_KEY,{})}
  function store(){const s=read(STORE_KEY,{channels:{}});if(!s.channels)s.channels={};return s}
  function channelId(){return txt(document.getElementById(PANEL_ID)?.dataset?.channelId)||txt(main().activeChannelId)}
  function row(id){const s=store();return s.channels?.[id]||{package:{}}}
  function spec(id,r){
    const p=r?.package||{},pn=Array.isArray(p.batchPosters)?p.batchPosters.length:0,cn=Array.isArray(p.batchCaptions)?p.batchCaptions.length:0;
    let count=Math.max(pn,cn,Number(p.batchCount)||0);
    let labels=[];
    try{const x=window.ACCCopilotBatchRuntime?.batchSpec?.(id);if(Number(x?.count)>count)count=Number(x.count);if(Array.isArray(x?.labels))labels=x.labels.map(txt)}catch{}
    try{const c=window.ACCProductionContracts?.get?.(id);if(Number(c?.batch?.count)>count)count=Number(c.batch.count);if(!labels.length&&Array.isArray(c?.batch?.series))labels=c.batch.series.map(txt)}catch{}
    if(!(count>1))return{count:1,labels:[]};
    return{count,labels:Array.from({length:count},(_,i)=>txt(p.batchPosters?.[i]?.label)||txt(p.batchCaptions?.[i]?.label)||labels[i]||`Item ${i+1}`)};
  }
  function status(v,error=false){const el=document.getElementById("acc-copilot-status");if(el){el.textContent=v||"";el.style.color=error?"#ff8095":"#8b9bb4"}}
  function ensureStyle(){if(document.getElementById("acc-item-queue-v2-style"))return;const s=document.createElement("style");s.id="acc-item-queue-v2-style";s.textContent=`
    .acc-batch-runtime.acc-v2-owned{margin:10px 0;padding:10px;border:1px solid rgba(105,239,179,.22);border-radius:13px;background:rgba(4,9,19,.88)}
    .acc-v2-title{font:900 10px/1.2 system-ui;letter-spacing:.1em;color:#69efb3;margin-bottom:9px}.acc-v2-grid{display:grid;grid-template-columns:1fr;gap:11px}
    .acc-v2-item{border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:9px;background:rgba(255,255,255,.025)}.acc-v2-item strong{font:900 11px/1.35 system-ui;color:#f4f7fb}
    .acc-v2-item img{display:block;width:100%;max-width:360px;border-radius:10px;margin-top:8px;border:1px solid rgba(255,255,255,.08);background:#050914}.acc-v2-missing{font:700 10px/1.4 system-ui;color:#ffb36b;margin-top:8px}
    .acc-v2-caption{font:500 10px/1.45 system-ui;color:#b9c5d5;margin-top:8px;white-space:pre-wrap;max-height:145px;overflow:auto}.acc-v2-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:9px}
    .acc-v2-publish{border:1px solid rgba(105,239,179,.30);background:rgba(105,239,179,.08);color:#69efb3;border-radius:9px;padding:9px 12px;font:900 10px/1 system-ui;letter-spacing:.04em}.acc-v2-publish:disabled{opacity:.48}.acc-v2-state{font:800 9px/1.25 system-ui;color:#91a3bb}.acc-v2-hold{color:#ffb36b}
    #${BULK_ID}{opacity:.6!important;cursor:not-allowed!important}
  `;document.head.appendChild(s)}
  function lockBulk(count){let b=document.getElementById("acc-copilot-publish")||document.getElementById(BULK_ID);if(!b)return;if(b.id!==BULK_ID){b.dataset.originalText=txt(b.textContent);b.id=BULK_ID}b.disabled=true;b.textContent=`BATCH READY • ${count} ITEM • PUBLISH API HOLD`;b.title="Batch hanya untuk produksi. Publish API/connector masih HOLD."}
  function render(){
    ensureStyle();const id=channelId();if(!id)return;const r=row(id),sp=spec(id,r);if(sp.count<=1)return;
    lockBulk(sp.count);
    const chat=document.getElementById("acc-copilot-chat");if(!chat)return;
    let box=document.getElementById("acc-copilot-batch-runtime");if(!box){box=document.createElement("div");box.id="acc-copilot-batch-runtime";chat.insertAdjacentElement("afterend",box)}
    box.className="acc-batch-runtime acc-v2-owned";
    const posters=Array.isArray(r.package?.batchPosters)?r.package.batchPosters:[],caps=Array.isArray(r.package?.batchCaptions)?r.package.batchCaptions:[],published=Array.isArray(r.package?.batchPublished)?r.package.batchPublished:[];
    box.innerHTML=`<div class="acc-v2-title">PRODUCTION BATCH • ${sp.count} ITEM • PREVIEW</div><div class="acc-v2-grid">${sp.labels.map((label,i)=>{const p=posters[i],c=caps[i],done=published[i],hasPoster=Boolean(txt(p?.base64)),hasCaption=Boolean(txt(c?.caption));return `<div class="acc-v2-item"><strong>${i+1}. ${esc(label)}</strong>${hasPoster?`<img src="data:image/jpeg;base64,${p.base64}" alt="${esc(label)}">`:`<div class="acc-v2-missing">POSTER PREVIEW BELUM TERSEDIA</div>`}${hasCaption?`<div class="acc-v2-caption">${esc(c.caption)}</div>`:`<div class="acc-v2-missing">CAPTION BELUM TERSEDIA</div>`}<div class="acc-v2-actions"><button type="button" class="acc-v2-publish" data-acc-v2-item="${i}" disabled>${done?"PUBLISHED":`PUBLISH ITEM ${i+1}`}</button><span class="acc-v2-state ${API_HOLD&&!done?"acc-v2-hold":""}">${done?`PUBLISHED • ${esc(done)}`:API_HOLD?"API HOLD":hasPoster&&hasCaption?"READY":"PACKAGE BELUM LENGKAP"}</span></div></div>`}).join("")}</div>`;
  }
  // Capture BEFORE legacy handlers. A batch can never fall through to old single-package publishApproved().
  document.addEventListener("click",e=>{
    const id=channelId(),r=id?row(id):null,sp=id?spec(id,r):{count:1};if(sp.count<=1)return;
    const bulk=e.target?.closest?.(`#acc-copilot-publish,#${BULK_ID}`);if(bulk){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();status("PUBLISH API HOLD // Batch hanya produksi. Tidak ada publish massal.",false);setTimeout(render,30);return}
    const item=e.target?.closest?.("[data-acc-v2-item]");if(item){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();status("PUBLISH API HOLD // Poster + caption tersimpan. Connector belum diperbaiki.",false);setTimeout(render,30)}
  },true);
  let timer=0;function schedule(){clearTimeout(timer);timer=setTimeout(render,60)}
  const obs=new MutationObserver(schedule);obs.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("storage",e=>{if(e.key===STORE_KEY||e.key===MAIN_KEY)schedule()});
  setInterval(schedule,900);schedule();
  window.ACCItemPublishQueue=Object.freeze({revision:REVISION,apiHold:API_HOLD,refresh:render});
})();
