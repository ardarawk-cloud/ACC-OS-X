(function () {
  var css =
    '\
html,body{width:100%;max-width:100%;overflow-x:hidden;}\
body{min-height:100vh;min-height:100dvh;}\
#app{width:100%;min-height:100vh;min-height:100dvh;}\
.shell{width:100%;max-width:760px;min-height:100vh;min-height:100dvh;padding-top:max(18px,env(safe-area-inset-top));padding-left:max(14px,env(safe-area-inset-left));padding-right:max(14px,env(safe-area-inset-right));padding-bottom:calc(126px + env(safe-area-inset-bottom))!important;}\
.tabs{position:fixed!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;z-index:9999!important;pointer-events:auto!important;padding-left:env(safe-area-inset-left)!important;padding-right:env(safe-area-inset-right)!important;padding-bottom:max(6px,env(safe-area-inset-bottom))!important;}\
.tabs>div{width:100%!important;max-width:760px!important;margin:0 auto!important;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-auto-rows:minmax(48px,auto)!important;}\
.tabs button,button,.btn,.linkbtn,.iconbtn,.closebtn,input,textarea,select{pointer-events:auto!important;touch-action:manipulation!important;-webkit-tap-highlight-color:rgba(0,0,0,0);}\
.tabs button{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;min-width:0!important;min-height:48px!important;padding:8px 4px!important;position:relative!important;z-index:10000!important;white-space:nowrap!important;overflow:visible!important;font-size:10.5px!important;}\
@media(min-width:761px){.shell{padding-bottom:calc(78px + env(safe-area-inset-bottom))!important}.tabs>div{grid-template-columns:repeat(6,minmax(0,1fr))!important;grid-auto-rows:minmax(54px,auto)!important}.tabs button{min-height:54px!important;font-size:11px!important}}\
';
  function addStyle() {
    if (document.getElementById('acc-mobile-frame-fix')) return;
    var s = document.createElement('style');
    s.id = 'acc-mobile-frame-fix';
    s.textContent = css;
    document.head.appendChild(s);
  }
  document.addEventListener('DOMContentLoaded', addStyle, { once: true });
  if (document.readyState !== 'loading') addStyle();
})();
