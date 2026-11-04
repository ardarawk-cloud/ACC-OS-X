// Verified domain migrations. Preserve deep links, queries, and fragments.
(() => {
  "use strict";
  const aliases=Object.freeze({
    "am-studio-pwa.ardarawk.workers.dev":"comics.nadmo.id",
    "kai-trad-pwa.ardarawk.workers.dev":"kai-sanban.nadmo.id",
    "am-studio-music-distribution.ardarawk.workers.dev":"musicdistribution.nadmo.id",
    "nadmo-oracly.ardarawk.workers.dev":"oracly.nadmo.id"
  });
  const divisions=Object.freeze({studio:"https://comics.nadmo.id/",trading:"https://kai-sanban.nadmo.id/"});
  function resolve(value,fallback=""){
    try{const u=new URL(value);if(u.protocol!=="https:"||u.username||u.password)return fallback;if(aliases[u.hostname])u.hostname=aliases[u.hostname];return u.href;}catch{return fallback;}
  }
  window.ACCDestinations=Object.freeze({revision:"VERIFIED_DESTINATIONS_20261104",resolve,division:(key,value)=>divisions[key]||resolve(value),aliases});
})();
