// KAI ONE — ACC OS X MY PROJECTS launcher v1
// Direct launcher for owner ChatGPT Projects. No project content is copied into ACC OS X.
(() => {
  "use strict";

  const REVISION = "KAI_ONE_MY_PROJECTS_V1";
  const ROOT_ID = "acc-my-projects";
  const STYLE_ID = "acc-my-projects-v1-style";

  const PROJECTS = [
    {
      key:"arda-core-corporation",
      title:"Arda Core Corporation",
      short:"ACC",
      accent:"#d4af37",
      url:"https://chatgpt.com/g/g-p-6a6a04f609388191b86dc08d22436683-arda-core-corporation/project"
    },
    {
      key:"personal",
      title:"PERSONAL",
      short:"P",
      accent:"#60a5fa",
      url:"https://chatgpt.com/g/g-p-6a677e80c6448191bd234bc1329a47d6-personal/project"
    },
    {
      key:"creative-lab",
      title:"CREATIVE LAB",
      short:"CL",
      accent:"#a78bfa",
      url:"https://chatgpt.com/g/g-p-6a677ef9af008191a6f6f7eeb100cf95-creative-lab/project"
    },
    {
      key:"am-studio",
      title:"AM STUDIO",
      short:"AM",
      accent:"#f97316",
      url:"https://chatgpt.com/g/g-p-6a67814fa060819195148be158f327b2-am-studio/project"
    },
    {
      key:"business-lab",
      title:"BUSINESS LAB",
      short:"BL",
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
      #${ROOT_ID} .acc-project-icon{width:min(16.5vw,68px)!important;height:min(16.5vw,68px)!important;min-width:55px!important;min-height:55px!important;margin:0 auto!important;display:grid!important;place-items:center!important;overflow:hidden!important;border-radius:20px!important;border:1px solid color-mix(in srgb,var(--project-accent) 42%,#25324a)!important;background:linear-gradient(145deg,color-mix(in srgb,var(--project-accent) 23%,#071023),#050b16)!important;box-shadow:0 9px 22px rgba(0,0,0,.28)!important;position:relative!important}
      #${ROOT_ID} .acc-project-icon::before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 30% 20%,color-mix(in srgb,var(--project-accent) 27%,transparent),transparent 56%)}
      #${ROOT_ID} .acc-project-short{position:relative;z-index:1;color:var(--project-accent);font-size:.88rem;font-weight:950;letter-spacing:-.04em}
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
      <div class="acc-project-icon"><span class="acc-project-short">${project.short}</span></div>
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
