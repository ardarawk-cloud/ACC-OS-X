// ACC OS X — NATIVE ANDROID SCROLL PERFORMANCE V2
// Stronger presentation-only WebView optimization. No workflow, brain, AI, storage or publishing behavior is changed.
(() => {
  "use strict";
  if (window.__ACC_NATIVE_SCROLL_PERF_V2__) return;
  const ua=String(navigator.userAgent||"");let nativeAndroid=/ACCOSXAndroid\//i.test(ua);try{nativeAndroid=nativeAndroid||new URLSearchParams(location.search).get("native")==="android"}catch{}
  if(!nativeAndroid)return;
  window.__ACC_NATIVE_SCROLL_PERF_V2__=true;
  const REVISION="NATIVE_ANDROID_SCROLL_PERF_V2_R1",root=document.documentElement;
  root.dataset.accNativeAndroidPerf="2";
  const style=document.createElement("style");style.id="acc-native-android-scroll-perf-v2";style.textContent=`
    html[data-acc-native-android-perf="2"]{scroll-behavior:auto!important}
    html[data-acc-native-android-perf="2"] body{background-attachment:scroll!important;overscroll-behavior-y:contain}
    html[data-acc-native-android-perf="2"] .section{content-visibility:auto;contain-intrinsic-size:1px 760px}
    html[data-acc-native-android-perf="2"] .acc-copilot-chat{scroll-behavior:auto!important;overscroll-behavior:contain}
    html[data-acc-native-android-perf="2"] .header,
    html[data-acc-native-android-perf="2"] .tabs,
    html[data-acc-native-android-perf="2"] .card,
    html[data-acc-native-android-perf="2"] .item,
    html[data-acc-native-android-perf="2"] .worker-card,
    html[data-acc-native-android-perf="2"] .module-card,
    html[data-acc-native-android-perf="2"] .health-card,
    html[data-acc-native-android-perf="2"] .acc-copilot-card,
    html[data-acc-native-android-perf="2"] .acc-launch-card,
    html[data-acc-native-android-perf="2"] .acc-batch-runtime{
      -webkit-backdrop-filter:none!important;backdrop-filter:none!important;filter:none!important
    }
    html[data-acc-native-android-perf="2"] .card,
    html[data-acc-native-android-perf="2"] .item,
    html[data-acc-native-android-perf="2"] button,
    html[data-acc-native-android-perf="2"] input,
    html[data-acc-native-android-perf="2"] .tab,
    html[data-acc-native-android-perf="2"] .btn,
    html[data-acc-native-android-perf="2"] .theme-card,
    html[data-acc-native-android-perf="2"] .acc-launch-card{transition:none!important;animation:none!important}
    html[data-acc-native-android-perf="2"] .acc-launch-card:before{filter:none!important}
    html[data-acc-native-android-perf="2"].acc-native-scrolling .header,
    html[data-acc-native-android-perf="2"].acc-native-scrolling .tabs,
    html[data-acc-native-android-perf="2"].acc-native-scrolling .card,
    html[data-acc-native-android-perf="2"].acc-native-scrolling .item,
    html[data-acc-native-android-perf="2"].acc-native-scrolling .worker-card,
    html[data-acc-native-android-perf="2"].acc-native-scrolling .module-card,
    html[data-acc-native-android-perf="2"].acc-native-scrolling .health-card,
    html[data-acc-native-android-perf="2"].acc-native-scrolling .acc-copilot-card,
    html[data-acc-native-android-perf="2"].acc-native-scrolling .acc-launch-card,
    html[data-acc-native-android-perf="2"].acc-native-scrolling .acc-batch-item{box-shadow:none!important}
  `;document.head.appendChild(style);
  let scrolling=false,timer=0;const mark=()=>{if(!scrolling){scrolling=true;root.classList.add("acc-native-scrolling");window.dispatchEvent(new CustomEvent("acc-native-scroll-state",{detail:{scrolling:true}}))}clearTimeout(timer);timer=setTimeout(()=>{scrolling=false;root.classList.remove("acc-native-scrolling");window.dispatchEvent(new CustomEvent("acc-native-scroll-state",{detail:{scrolling:false}}))},180)};
  window.addEventListener("scroll",mark,{passive:true});window.addEventListener("touchmove",mark,{passive:true});window.addEventListener("touchstart",mark,{passive:true});
  window.ACCNativeScrollPerformance=Object.freeze({revision:REVISION,active:true,isScrolling:()=>scrolling});
})();
