// Owner-supplied poster + caption. Original image bytes go through the existing publisher.
(() => {
  "use strict";
  if(window.ACCContentUpload)return;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function open({channelId,file}={}){
    if(document.getElementById("acc-content-upload-dialog"))return;
    const channels=[...document.querySelectorAll("#channel-select option")].filter(x=>x.value);
    if(!channels.length)return;
    const dialog=document.createElement("dialog");dialog.id="acc-content-upload-dialog";
    dialog.style.cssText="color:#f8fafc;background:#071023;border:1px solid #40506a;border-radius:18px;padding:20px;width:min(94vw,540px);max-height:90dvh;overflow:auto";
    dialog.innerHTML=`<form id="acc-upload-form"><h2 style="margin-top:0">Upload konten</h2>
      <label>Channel tujuan<select name="channel">${channels.map(x=>`<option value="${esc(x.value)}">${esc(x.textContent)}</option>`).join("")}</select></label>
      <p data-target style="font-size:12px;overflow-wrap:anywhere"></p>
      <label data-item-label>Item batch<select name="item"></select></label>
      <label>Poster JPG / PNG / WebP · maks. 8 MB<input name="poster" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"></label>
      <img data-preview alt="Preview poster" hidden style="display:none;max-height:260px;max-width:100%;object-fit:contain;margin:12px auto">
      <label>Caption<textarea name="caption" required maxlength="60000" placeholder="Tempel caption konten di sini"></textarea></label>
      <label data-sources-label>Sumber rujukan<textarea name="sources" placeholder="Satu URL sumber per baris"></textarea></label>
      <label style="display:flex;gap:8px;margin:12px 0"><input name="reviewed" type="checkbox" required style="width:20px;min-height:20px">Saya sudah memeriksa poster, caption, dan sumbernya.</label>
      <label style="display:flex;gap:8px;margin:12px 0"><input name="newPackage" type="checkbox" style="width:20px;min-height:20px">Mulai paket baru untuk channel ini</label>
      <label style="display:flex;gap:8px;margin:12px 0"><input name="replace" type="checkbox" style="width:20px;min-height:20px">Ganti item aktif bila sudah ada</label>
      <p data-upload-status role="status" style="font-size:12px;white-space:pre-wrap"></p>
      <div style="display:flex;gap:10px"><button type="submit" class="btn">SIMPAN KONTEN</button><button type="button" data-close class="btn">TUTUP</button></div>
      <p style="font-size:12px;color:#94a3b8">Setelah disimpan, buka channel tujuan lalu tekan Publish. Upload ini tidak memposting otomatis.</p></form>`;
    document.body.appendChild(dialog);
    const form=dialog.querySelector("form"),field=name=>form.elements.namedItem(name),status=dialog.querySelector("[data-upload-status]");
    field("channel").value=channels.some(x=>x.value===channelId)?channelId:document.getElementById("channel-select").value;
    let selectedFile=file||null,previewUrl="",busy=false;
    const preview=()=>{
      if(previewUrl)URL.revokeObjectURL(previewUrl);
      const img=dialog.querySelector("[data-preview]");
      if(selectedFile){previewUrl=URL.createObjectURL(selectedFile);img.src=previewUrl;img.hidden=false;img.style.display="block";}else{img.hidden=true;img.style.display="none";}
    };
    const update=()=>{
      const id=field("channel").value,contract=window.ACCProductionContracts?.get?.(id),count=Math.max(1,contract?.batch?.count||1);
      field("item").innerHTML=Array.from({length:count},(_,i)=>`<option value="${i}">${i+1}. ${esc(contract?.batch?.series?.[i]||"Konten")}</option>`).join("");
      dialog.querySelector("[data-item-label]").hidden=count===1;
      const target=window.ACCProduceCopilot?.target?.(id);
      dialog.querySelector("[data-target]").textContent=target?`Tujuan publish: ${target.pageName||target.instagramAccountId||target.pageId} (${target.connector||"Facebook"})` : "Tujuan publish belum dipilih. Hubungkan halaman channel di Publishing Hub.";
      const min=contract?.publish?.requireVerifiedEvidence?contract.research.publishMinSources:0;
      field("sources").placeholder=min?`Wajib ${min} URL sumber yang sudah diperiksa, satu per baris` : "Opsional: satu URL sumber per baris";
    };
    field("channel").addEventListener("change",update);
    field("poster").addEventListener("change",()=>{selectedFile=field("poster").files?.[0]||null;preview();});
    form.addEventListener("submit",async event=>{
      event.preventDefault();if(busy)return;busy=true;
      const submit=form.querySelector('[type="submit"]');submit.disabled=true;status.textContent="Menyimpan…";
      try{
        await window.ACCProduceCopilot.importOwnerPackage({channelId:field("channel").value,file:selectedFile,caption:field("caption").value,sources:field("sources").value.split(/\n/).map(x=>x.trim()).filter(Boolean),reviewed:field("reviewed").checked,index:Number(field("item").value),newPackage:field("newPackage").checked,replace:field("replace").checked});
        status.style.color="#69efb3";status.textContent="Tersimpan. Poster asli dan caption siap di channel tujuan.";
        selectedFile=null;field("poster").value="";preview();field("newPackage").checked=false;field("replace").checked=false;
      }catch(error){status.style.color="#ff8095";status.textContent=String(error?.message||error);}
      finally{busy=false;submit.disabled=false;}
    });
    dialog.querySelector("[data-close]").addEventListener("click",()=>{if(!busy)dialog.close();});
    dialog.addEventListener("cancel",event=>{if(busy)event.preventDefault();});
    dialog.addEventListener("close",()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);dialog.remove();});
    update();preview();dialog.showModal();
  }
  function mount(){
    const panel=document.getElementById("acc-produce-copilot-panel"),tools=panel?.querySelector(".acc-copilot-tools");
    if(!tools||tools.querySelector("[data-owner-upload]"))return;
    const button=document.createElement("button");button.type="button";button.className="acc-copilot-quick";button.dataset.ownerUpload="1";button.textContent="UPLOAD KONTEN";
    button.addEventListener("click",()=>open({channelId:panel.dataset.channelId}));tools.appendChild(button);
  }
  window.ACCContentUpload=Object.freeze({revision:"OWNER_CONTENT_UPLOAD_V1",open});
  ["acc-core-rendered","acc-produce-ready","acc-produce-panel-ready","acc-production-contract-updated"].forEach(name=>window.addEventListener(name,()=>requestAnimationFrame(mount)));
  mount();
})();
