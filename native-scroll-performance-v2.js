// ACC OS X — NATIVE ANDROID SCROLL PERFORMANCE V3
// One scroll authority on mobile/native: the document viewport.
// Produce chat must not become a competing nested scroll container.
(() => {
  "use strict";
  if (window.__ACC_NATIVE_SCROLL_PERF_V3__) return;

  const ua = String(navigator.userAgent || "");
  let nativeAndroid = /ACCOSXAndroid\//i.test(ua) || /ACCOSXNative\//i.test(ua);
  try {
    nativeAndroid = nativeAndroid || new URLSearchParams(location.search).get("native") === "android";
  } catch {}
  if (!nativeAndroid) return;

  window.__ACC_NATIVE_SCROLL_PERF_V3__ = true;
  const REVISION = "NATIVE_ANDROID_SCROLL_PERF_V3_SINGLE_PAGE_FLOW";
  const root = document.documentElement;
  root.dataset.accNativeAndroidPerf = "3";

  document.getElementById("acc-native-android-scroll-perf-v2")?.remove();
  const style = document.createElement("style");
  style.id = "acc-native-android-scroll-perf-v3";
  style.textContent = `
    html[data-acc-native-android-perf="3"]{scroll-behavior:auto!important;overscroll-behavior-y:auto!important}
    html[data-acc-native-android-perf="3"] body{background-attachment:scroll!important;overscroll-behavior-y:auto!important;touch-action:pan-y}

    html[data-acc-native-android-perf="3"] .section:not(#acc-produce-copilot-panel){content-visibility:auto;contain-intrinsic-size:1px 760px}
    html[data-acc-native-android-perf="3"] #acc-produce-copilot-panel{
      content-visibility:visible!important;
      contain:none!important;
      overflow:visible!important;
      touch-action:pan-y!important;
    }
    html[data-acc-native-android-perf="3"] #acc-produce-copilot-panel .acc-copilot-card{
      overflow:visible!important;
      contain:none!important;
    }
    html[data-acc-native-android-perf="3"] #acc-produce-copilot-panel .acc-copilot-chat{
      max-height:none!important;
      height:auto!important;
      overflow:visible!important;
      overscroll-behavior:auto!important;
      scroll-behavior:auto!important;
      touch-action:pan-y!important;
    }

    html[data-acc-native-android-perf="3"] .header,
    html[data-acc-native-android-perf="3"] .tabs,
    html[data-acc-native-android-perf="3"] .card,
    html[data-acc-native-android-perf="3"] .item,
    html[data-acc-native-android-perf="3"] .worker-card,
    html[data-acc-native-android-perf="3"] .module-card,
    html[data-acc-native-android-perf="3"] .health-card,
    html[data-acc-native-android-perf="3"] .acc-copilot-card,
    html[data-acc-native-android-perf="3"] .acc-launch-card,
    html[data-acc-native-android-perf="3"] .acc-batch-runtime{
      -webkit-backdrop-filter:none!important;
      backdrop-filter:none!important;
      filter:none!important;
    }

    html[data-acc-native-android-perf="3"] .card,
    html[data-acc-native-android-perf="3"] .item,
    html[data-acc-native-android-perf="3"] button,
    html[data-acc-native-android-perf="3"] input,
    html[data-acc-native-android-perf="3"] .tab,
    html[data-acc-native-android-perf="3"] .btn,
    html[data-acc-native-android-perf="3"] .theme-card,
    html[data-acc-native-android-perf="3"] .acc-launch-card{
      transition:none!important;
      animation:none!important;
    }
    html[data-acc-native-android-perf="3"] .acc-launch-card:before{filter:none!important}

    html[data-acc-native-android-perf="3"].acc-native-scrolling .header,
    html[data-acc-native-android-perf="3"].acc-native-scrolling .tabs,
    html[data-acc-native-android-perf="3"].acc-native-scrolling .card,
    html[data-acc-native-android-perf="3"].acc-native-scrolling .item,
    html[data-acc-native-android-perf="3"].acc-native-scrolling .worker-card,
    html[data-acc-native-android-perf="3"].acc-native-scrolling .module-card,
    html[data-acc-native-android-perf="3"].acc-native-scrolling .health-card,
    html[data-acc-native-android-perf="3"].acc-native-scrolling .acc-copilot-card,
    html[data-acc-native-android-perf="3"].acc-native-scrolling .acc-launch-card,
    html[data-acc-native-android-perf="3"].acc-native-scrolling .acc-batch-item{box-shadow:none!important}
  `;
  document.head.appendChild(style);

  let scrolling = false;
  let timer = 0;
  const mark = () => {
    if (!scrolling) {
      scrolling = true;
      root.classList.add("acc-native-scrolling");
      window.dispatchEvent(new CustomEvent("acc-native-scroll-state", {detail:{scrolling:true}}));
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      scrolling = false;
      root.classList.remove("acc-native-scrolling");
      window.dispatchEvent(new CustomEvent("acc-native-scroll-state", {detail:{scrolling:false}}));
    }, 180);
  };

  window.addEventListener("scroll", mark, {passive:true});
  window.addEventListener("touchmove", mark, {passive:true});
  window.addEventListener("touchstart", mark, {passive:true});

  window.ACCNativeScrollPerformance = Object.freeze({
    revision: REVISION,
    active: true,
    authority: "DOCUMENT_VIEWPORT",
    isScrolling: () => scrolling
  });
})();
