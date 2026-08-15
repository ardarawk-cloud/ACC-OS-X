// ACC OS X — NATIVE ANDROID SCROLL PERFORMANCE V1
// Presentation-only optimization for the ACC OS X Android WebView.
// No production workflow, channel brain, AI, publishing, storage, or routing behavior is changed.
(() => {
  "use strict";
  if (window.__ACC_NATIVE_SCROLL_PERF_V1__) return;

  const ua = String(navigator.userAgent || "");
  let nativeAndroid = /ACCOSXAndroid\//i.test(ua);
  try {
    nativeAndroid = nativeAndroid || new URLSearchParams(location.search).get("native") === "android";
  } catch {}
  if (!nativeAndroid) return;

  window.__ACC_NATIVE_SCROLL_PERF_V1__ = true;
  const REVISION = "NATIVE_ANDROID_SCROLL_PERF_V1_R1";
  const root = document.documentElement;
  root.dataset.accNativeAndroidPerf = "1";

  const style = document.createElement("style");
  style.id = "acc-native-android-scroll-perf-v1";
  style.textContent = `
    html[data-acc-native-android-perf="1"] body{
      background-attachment:scroll!important;
    }
    html[data-acc-native-android-perf="1"] .header,
    html[data-acc-native-android-perf="1"] .tabs,
    html[data-acc-native-android-perf="1"] .card,
    html[data-acc-native-android-perf="1"] .item,
    html[data-acc-native-android-perf="1"] .worker-card,
    html[data-acc-native-android-perf="1"] .module-card,
    html[data-acc-native-android-perf="1"] .health-card,
    html[data-acc-native-android-perf="1"] .acc-copilot-card,
    html[data-acc-native-android-perf="1"] .acc-launch-card{
      -webkit-backdrop-filter:none!important;
      backdrop-filter:none!important;
    }
    html[data-acc-native-android-perf="1"] .header,
    html[data-acc-native-android-perf="1"] .tabs,
    html[data-acc-native-android-perf="1"] .card,
    html[data-acc-native-android-perf="1"] .item,
    html[data-acc-native-android-perf="1"] .worker-card,
    html[data-acc-native-android-perf="1"] .module-card,
    html[data-acc-native-android-perf="1"] .health-card,
    html[data-acc-native-android-perf="1"] .acc-copilot-card,
    html[data-acc-native-android-perf="1"] .acc-launch-card{
      box-shadow:0 5px 16px rgba(0,0,0,.16)!important;
    }
    html[data-acc-native-android-perf="1"] .card,
    html[data-acc-native-android-perf="1"] .item,
    html[data-acc-native-android-perf="1"] button.card,
    html[data-acc-native-android-perf="1"] .tab,
    html[data-acc-native-android-perf="1"] .btn,
    html[data-acc-native-android-perf="1"] .theme-card,
    html[data-acc-native-android-perf="1"] .acc-launch-card{
      transition:none!important;
    }
    html[data-acc-native-android-perf="1"] .acc-launch-card:before{
      filter:none!important;
    }
    html[data-acc-native-android-perf="1"].acc-native-scrolling .header,
    html[data-acc-native-android-perf="1"].acc-native-scrolling .tabs,
    html[data-acc-native-android-perf="1"].acc-native-scrolling .card,
    html[data-acc-native-android-perf="1"].acc-native-scrolling .item,
    html[data-acc-native-android-perf="1"].acc-native-scrolling .worker-card,
    html[data-acc-native-android-perf="1"].acc-native-scrolling .module-card,
    html[data-acc-native-android-perf="1"].acc-native-scrolling .health-card,
    html[data-acc-native-android-perf="1"].acc-native-scrolling .acc-copilot-card,
    html[data-acc-native-android-perf="1"].acc-native-scrolling .acc-launch-card{
      box-shadow:none!important;
    }
  `;
  document.head.appendChild(style);

  let scrolling = false;
  let settleTimer = 0;
  const markScrolling = () => {
    if (!scrolling) {
      scrolling = true;
      root.classList.add("acc-native-scrolling");
    }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      scrolling = false;
      root.classList.remove("acc-native-scrolling");
    }, 120);
  };

  window.addEventListener("scroll", markScrolling, {passive:true});
  window.addEventListener("touchmove", markScrolling, {passive:true});

  window.ACCNativeScrollPerformance = Object.freeze({
    revision: REVISION,
    active: true,
    isScrolling: () => scrolling
  });
})();
