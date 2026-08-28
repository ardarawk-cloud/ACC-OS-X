// KAI ONE — ACC OS X Build 8 UI stabilization v1
(() => {
  "use strict";
  if (window.__ACC_BUILD8_UI_STABILIZATION_V1__) return;
  window.__ACC_BUILD8_UI_STABILIZATION_V1__ = true;

  const STYLE_ID = "acc-build8-ui-stabilization-v1";

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #acc-produce-copilot-panel .acc-copilot-publish{
        max-width:100%!important;
        white-space:normal!important;
        overflow-wrap:anywhere!important;
        word-break:break-word!important;
        padding:10px 12px!important;
      }
      #acc-produce-copilot-panel .acc-copilot-published-id{
        margin:7px 2px 0;
        padding:8px 10px;
        border:1px solid rgba(105,239,179,.20);
        border-radius:10px;
        background:rgba(105,239,179,.06);
        color:#8b9bb4;
        font-size:10px;
        line-height:1.45;
        overflow-wrap:anywhere;
        word-break:break-all;
      }
      #acc-produce-copilot-panel .acc-copilot-published-id b{
        display:block;
        color:#69efb3;
        font-size:9px;
        letter-spacing:.08em;
        margin-bottom:3px;
      }
      #acc-produce-copilot-panel .acc-item-publish-state{
        min-width:0;
        max-width:100%;
        overflow-wrap:anywhere;
        word-break:break-all;
      }
      @media(max-width:430px){
        #acc-produce-copilot-panel .acc-copilot-publish{font-size:.78rem!important;letter-spacing:.05em!important}
      }
    `;
    document.head.appendChild(style);
  }

  function patchPublishedResult() {
    ensureStyle();
    const button = document.getElementById("acc-copilot-publish");
    if (!button) return;

    const raw = String(button.textContent || "").trim();
    const match = raw.match(/^PUBLISHED\s*✅\s+(.+)$/i);
    if (!match) return;

    const postId = match[1].trim();
    if (!postId) return;

    button.textContent = "PUBLISHED ✅";
    button.dataset.accBuild8Compact = "1";

    let detail = button.parentElement?.querySelector(".acc-copilot-published-id");
    if (!detail) {
      detail = document.createElement("div");
      detail.className = "acc-copilot-published-id mono";
      button.insertAdjacentElement("afterend", detail);
    }
    detail.textContent = "";
    const label = document.createElement("b");
    label.textContent = "POST ID";
    detail.append(label, document.createTextNode(postId));
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      patchPublishedResult();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList:true,
    subtree:true,
    characterData:true
  });
  window.addEventListener("pageshow", schedule);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) schedule(); });
  schedule();
})();
