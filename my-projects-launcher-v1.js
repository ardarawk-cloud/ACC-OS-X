// KAI ONE — ACC OS X MY PROJECTS launcher v2
// Direct launcher for owner ChatGPT Projects. No project content is copied into ACC OS X.
(() => {
  "use strict";

  const REVISION = "KAI_ONE_MY_PROJECTS_V2_VECTOR_ICONS";
  const ROOT_ID = "acc-my-projects";
  const STYLE_ID = "acc-my-projects-v2-style";

  const ICONS = {
    core:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="13"/><path d="M32 7v8M32 49v8M7 32h8M49 32h8M14.3 14.3l5.7 5.7M44 44l5.7 5.7M49.7 14.3L44 20M20 44l-5.7 5.7"/><path class="fill" d="M32 23l8 4.6v8.8L32 41l-8-4.6v-8.8z"/></svg>`,
    personal:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="23" r="10"/><path d="M15 52c2.3-10.4 8.1-15.6 17-15.6S46.7 41.6 49 52"/><path d="M11 11h10M43 11h10M11 53h10M43 53h10"/></svg>`,
    creative:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="5" class="fill"/><ellipse cx="32" cy="32" rx="24" ry="10"/><ellipse cx="32" cy="32" rx="24" ry="10" transform="rotate(60 32 32)"/><ellipse cx="32" cy="32" rx="24" ry="10" transform="rotate(120 32 32)"/><path d="M48 8l1.8 5.2L55 15l-5.2 1.8L48 22l-1.8-5.2L41 15l5.2-1.8z" class="fill"/></svg>`,
    studio:`<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 25h40v27H12z"/><path d="M12 25l4-13h40l-4 13z"/><path d="M19 12l7 13M33 12l7 13M47 12l7 13"/><path d="M27 34l13 7-13 7z" class="fill"/></svg>`,
    business:`<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="20" width="44" height="32" rx="5"/><path d="M24 20v-6h16v6M10 32h44M27 32v6h10v-6"/><path d="M18 46l8-7 7 5 12-11"/><path d="M40 33h5v5"/></svg>`
  };

  const PROJECTS = [
    {
      key:"arda-core-corporation",
      title:"Arda Core Corporation",
      icon:ICONS.core,
      accent:"#d4af37",
      url:"https://chatgpt.com/g/g-p-6a6a04f609388191b86dc08d22436683-arda-core-corporation/project"
    },
    {
      key:"personal",
      title:"PERSONAL",
      icon:ICONS.personal,
      accent:"#60a5fa",
      url:"https://chatgpt.com/g/g-p-6a677e80c6448191bd234bc1329a47d6-personal/project"
    },
    {
      key:"creative-lab",
      title:"CREATIVE LAB",
      icon:ICONS.creative,
      accent:"#a78bfa",
      url:"https://chatgpt.com/g/g-p-6a677ef9af008191a6f6f7eeb100cf95-creative-lab/project"
    },
    {
      key:"am-studio",
      title:"AM STUDIO",
      icon:ICONS.studio,
      accent:"#f97316",
      url:"https://chatgpt.com/g/g-p-6a67814fa060819195148be158f327b2-am-studio/project"
    },
    {
      key:"business-lab",
      title:"BUSINESS LAB",
      icon:ICONS.business,
      accent:"#22c55e",
      url:"https://chatgpt.com/g/g-p-6a67811d0c248191a1f4856cd76bc7a5-business-lab/project"
    }
  ];

  function ensureStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const style=document.createElement("style");
    style.id=STYLE_ID;
    style.textContent=`
      #${ROOT_ID}{margin:18px 0 8px;padding:12px 4px 10px;border:0;background:transparent;box-shadow:none}
      #${ROOT_ID} .acc-project-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:0 4px 13px}
      #${ROOT_ID} .acc-project-head .card-title{font-size:1rem;letter-spacing:.05em}
      #${ROOT_ID} .acc-project-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:16px 7px!important;align-items:start}
      #${ROOT_ID} .acc-project-card{appearance:none!important;border:0!important;background:transparent!important;color:var(--text,#f8fafc)!important;padding:3px 1px 6px!important;min-width:0!important;text-align:center!important;border-radius:16px!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important}
      #${ROOT_ID} .acc-project-card:active{transform:scale(.94);background:color-mix(in srgb,var(--project-accent) 7%,transparent)!important}
      #${ROOT_ID} .acc-project-icon{width:min(16.5vw,68px)!important;height:min(16.5vw,68px)!important;min-width:55px!important;min-height:55px!important;margin:0 auto!important;display:grid!important;place-items:center!important;overflow:hidden!important;border-radius:20px!important;border:1px solid color-mix(in srgb,var(--project-accent) 48%,#25324a)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--project-accent) 24%,#071023),#050b16 72%)!important;box-shadow:0 9px 22px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.08)!important;position:relative!important}
      #${ROOT_ID} .acc-project-icon::before{content:"";position:absolute;inset:-24%;background:radial-gradient(circle at 32% 22%,color-mix(in srgb,var(--project-accent) 32%,transparent),transparent 50%);transform:rotate(-18deg)}
      #${ROOT_ID} .acc-project-glyph{width:62%;height:62%;position:relative;z-index:1;color:var(--project-accent);filter:drop-shadow(0 0 7px color-mix(in srgb,var(--project-accent) 42%,transparent))}
      #${ROOT_ID} .acc-project-glyph svg{width:100%;height:100%;display:block;fill:none;stroke:currentColor;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
      #${ROOT_ID} .acc-project-glyph svg .fill{fill:currentColor;stroke:none}
      #${ROOT_ID} .acc-project-title{margin-top:8px!important;font-size:.67rem!important;font-weight:900!important;line-height:1.15!important;min-height:1.6em!important;overflow:hidden!important;text-overflow:ellipsis!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important}
      #${ROOT_ID} .acc-project-status{margin-top:4px!important;color:var(--muted,#8390aa)!important;font-size:.5rem!important;font-weight:800!important;letter-spacing:.07em!important}
      @media(max-width:345px){#${ROOT_ID} .acc-project-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
      @media(min-width:700px){#${ROOT_ID} .acc-project-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:18px 12px!important}#${ROOT_ID} .acc-project-icon{width:74px!important;height:74px!important}#${ROOT_ID} .acc-project-title{font-size:.75rem!important}}
    `;
    document.head.appendChild(style);
  }

  function tile(project){
    const button=document.createElement("button");
    button.type="button";
    button.className="acc-project-card mono";
    button.dataset.ownerProject=project.key;
    button.style.setProperty("--project-accent",project.accent);
    button.setAttribute("aria-label",`Open ${project.title} in ChatGPT`);
    button.innerHTML=`
      <div class="acc-project-icon"><span class="acc-project-glyph">${project.icon}</span></div>
      <div class="acc-project-title">${project.title}</div>
      <div class="acc-project-status">CHATGPT</div>
    `;
    button.addEventListener("click",event=>{
      event.preventDefault();
      location.href=project.url;
    });
    return button;
  }

  function render(){
    ensureStyle();
    const maps=document.getElementById("acc-my-maps");
    const apps=document.getElementById("acc-home-launchpad");
    const anchor=maps || apps;
    if(!anchor) return false;

    let root=document.getElementById(ROOT_ID);
    if(!root){
      root=document.createElement("section");
      root.id=ROOT_ID;
      root.className="card";
      anchor.insertAdjacentElement("afterend",root);
    }
    if(root.dataset.projectsRevision===REVISION) return true;
    root.dataset.projectsRevision=REVISION;
    root.innerHTML=`
      <div class="acc-project-head">
        <div><div class="eyebrow">ACC CHATGPT COMMAND</div><h2 class="card-title" style="margin:3px 0 0">MY PROJECTS</h2></div>
        <span class="badge">${PROJECTS.length} PROJECTS</span>
      </div>
      <div class="acc-project-grid"></div>
    `;
    const grid=root.querySelector(".acc-project-grid");
    PROJECTS.forEach(project=>grid.appendChild(tile(project)));
    return true;
  }

  let queued=false;
  function schedule(){
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{queued=false;render();});
    setTimeout(render,120);
    setTimeout(render,520);
  }

  new MutationObserver(()=>{
    const root=document.getElementById(ROOT_ID);
    if(!root||root.dataset.projectsRevision!==REVISION) schedule();
  }).observe(document.documentElement,{childList:true,subtree:true});

  window.addEventListener("pageshow",schedule);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.ACCMyProjects={revision:REVISION,projects:PROJECTS.map(({key,title,url})=>({key,title,url})),render:schedule};
  schedule();
})();
