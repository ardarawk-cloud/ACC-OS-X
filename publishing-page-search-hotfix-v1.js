// KAI ONE — Publishing Page Search / Quick Find hotfix v1
// Android WebView-safe focus + one-tap channel-name filtering for the remaining Facebook Page mappings.
(() => {
  "use strict";

  const REVISION = "KAI_ONE_PAGE_SEARCH_TOUCH_V1";
  const PICKER_ID = "acc-mobile-page-picker-v1";
  const SAFE_CARD_ID = "acc-safe-publish-admin";
  const STYLE_ID = "acc-page-search-touch-hotfix-style-v1";
  const STATUS_ID = "acc-page-search-touch-status-v1";

  const normalize = value => String(value || "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      #${PICKER_ID}{isolation:isolate!important}
      #${PICKER_ID} .acc-page-search{
        position:relative!important;z-index:80!important;pointer-events:auto!important;
        touch-action:manipulation!important;-webkit-user-select:text!important;user-select:text!important;
        opacity:1!important;cursor:text!important
      }
      #${PICKER_ID} .acc-page-quick-find{
        display:block!important;width:100%!important;min-height:48px!important;margin:0 0 9px!important;
        padding:10px 12px!important;border:1px solid #55e6a5!important;border-radius:12px!important;
        background:rgba(10,161,116,.14)!important;color:#dfffee!important;font-weight:900!important;
        letter-spacing:.03em!important;pointer-events:auto!important;touch-action:manipulation!important;
        position:relative!important;z-index:81!important;-webkit-tap-highlight-color:transparent!important
      }
      #${PICKER_ID} .acc-page-quick-find:active{transform:scale(.985)!important}
      #${PICKER_ID} .acc-page-search-touch-status{margin:2px 0 9px;color:#8390aa;font-size:.66rem;line-height:1.45}
      #${PICKER_ID} .acc-page-search-touch-status.miss{color:#f6b85f}
      #${PICKER_ID} .acc-page-search-touch-status.hit{color:#55e6a5}
    `;
    document.head.appendChild(style);
  }

  function channelName(){
    const card=document.getElementById(SAFE_CARD_ID);
    return String(card?.querySelector("h3.card-title")?.textContent || "").trim();
  }

  function pageButtons(picker){
    return Array.from(picker.querySelectorAll(".acc-mobile-page-list .acc-mobile-page-btn"));
  }

  function applyFilter(picker, rawQuery){
    const q=normalize(rawQuery);
    let visible=0;
    pageButtons(picker).forEach(button=>{
      const hay=normalize(`${button.textContent || ""} ${button.dataset.pageName || ""} ${button.dataset.pageId || ""}`);
      const show=!q || hay.includes(q);
      button.hidden=!show;
      if(show) visible+=1;
    });
    return visible;
  }

  function setStatus(picker, message, kind=""){
    let status=picker.querySelector(`#${STATUS_ID}`);
    if(!status){
      status=document.createElement("div");
      status.id=STATUS_ID;
      status.className="acc-page-search-touch-status mono";
      const search=picker.querySelector(".acc-page-search");
      search?.insertAdjacentElement("afterend",status);
    }
    status.className=`acc-page-search-touch-status mono ${kind}`.trim();
    status.textContent=message;
  }

  function focusSearch(search){
    try{
      search.removeAttribute("readonly");
      search.disabled=false;
      search.style.pointerEvents="auto";
      search.focus({preventScroll:true});
      const len=search.value.length;
      search.setSelectionRange?.(len,len);
    }catch{}
  }

  function patch(){
    ensureStyle();
    const picker=document.getElementById(PICKER_ID);
    if(!picker) return false;
    if(picker.dataset.searchTouchRevision===REVISION) return true;

    const search=picker.querySelector(".acc-page-search");
    if(!search) return false;
    picker.dataset.searchTouchRevision=REVISION;

    search.setAttribute("inputmode","search");
    search.setAttribute("enterkeyhint","search");
    search.style.pointerEvents="auto";

    ["pointerdown","touchstart","mousedown","click"].forEach(type=>{
      search.addEventListener(type,event=>{
        event.stopPropagation();
        focusSearch(search);
      },{capture:true,passive:type==="touchstart"});
    });

    search.addEventListener("input",()=>{
      const count=applyFilter(picker,search.value);
      if(search.value.trim()) setStatus(picker,`${count} Page cocok dengan pencarian.`,count?"hit":"miss");
      else setStatus(picker,"Ketik nama Page, atau gunakan tombol cari cepat di bawah.");
    });

    const name=channelName();
    if(name){
      const quick=document.createElement("button");
      quick.type="button";
      quick.className="acc-page-quick-find mono";
      quick.textContent=`CARI PAGE → ${name}`;
      let lastRun=0;
      const run=event=>{
        event.preventDefault();
        event.stopPropagation();
        const now=Date.now();
        if(now-lastRun<250) return;
        lastRun=now;
        const count=applyFilter(picker,name);
        search.value=name;
        if(count){
          setStatus(picker,`${count} kandidat ditemukan untuk ${name}. Tap Page yang benar di bawah.`,"hit");
        }else{
          setStatus(picker,`${name} TIDAK ADA di 22 Page hasil Meta sync saat ini. Berarti Page belum diberikan oleh akun/token Facebook yang sedang terhubung.`,"miss");
        }
      };
      quick.addEventListener("pointerup",run,{passive:false});
      quick.addEventListener("click",run,{passive:false});
      search.insertAdjacentElement("afterend",quick);
    }

    setStatus(picker,"Ketik nama Page, atau gunakan tombol cari cepat di bawah.");
    return true;
  }

  let queued=false;
  function schedule(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;patch();});
    setTimeout(patch,140);
    setTimeout(patch,600);
  }

  new MutationObserver(()=>schedule()).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("pageshow",schedule);
  window.addEventListener("focus",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.ACCPageSearchTouchHotfix={revision:REVISION,render:schedule};
  schedule();
})();
