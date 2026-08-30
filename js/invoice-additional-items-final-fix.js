/* Final Invoice Additional Item Fix
 * Runs after invoice.js and invoice-additional-items-fix.js.
 * Additional items are stored only in localStorage and are never written to quotation tables.
 */
(function(){
  'use strict';
  const KEY='PM_INVOICE_EXTRA_ITEMS';
  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const toast=t=>typeof window.msg==='function'?window.msg(t):alert(t);
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_){return {};}};
  const write=x=>localStorage.setItem(KEY,JSON.stringify(x));
  const get=id=>read()[String(id)]||[];
  const sum=id=>get(id).reduce((a,x)=>a+N(x.subtotal),0);
  let state=null;

  function syncEditor(){
    if(!state?.id)return;
    const box=document.getElementById('invoiceItems');
    const table=box?.querySelector('table');
    const tbody=table?.querySelector('tbody');
    if(!tbody)return setTimeout(syncEditor,100);
    const totalRow=Array.from(tbody.querySelectorAll('tr')).find(tr=>/GRAND TOTAL/i.test(tr.textContent||''));
    const currentExtra=tbody.querySelectorAll('tr[data-pm-final-extra]'); currentExtra.forEach(x=>x.remove());
    const add=get(state.id);
    let base=state.baseTotal;
    if(!base){
      const cell=totalRow?.querySelectorAll('td'); base=N(cell?.[cell.length-1]?.textContent); state.baseTotal=base;
    }
    const total=base+add.reduce((a,x)=>a+N(x.subtotal),0);
    add.forEach(x=>{
      const tr=document.createElement('tr');tr.dataset.pmFinalExtra='1';
      tr.innerHTML=`<td>+</td><td><strong>${E(x.item)}</strong><div style="color:var(--muted);font-size:12px">${E(x.kode)} • Invoice only</div></td><td>${N(x.qty)} ${E(x.satuan||'unit')}</td><td>${M(x.harga)}</td><td><strong>${M(x.subtotal)}</strong></td><td><button class="btn sm secondary" type="button" onclick="invoiceRemoveItem('${E(x.id)}')">Hapus</button></td>`;
      if(totalRow)tbody.insertBefore(tr,totalRow);else tbody.appendChild(tr);
    });
    if(totalRow){const c=totalRow.querySelectorAll('td');if(c.length)c[c.length-1].textContent=M(total);}
    const te=document.getElementById('invTotal');if(te)te.textContent=M(total);
    const paid=N(document.getElementById('invPaid')?.textContent);const be=document.getElementById('invBalance');if(be)be.textContent=M(Math.max(0,total-paid));
    if(!document.getElementById('pmFinalAddBtn')){
      const h=document.createElement('div');h.id='pmFinalAddHead';h.style.cssText='display:flex;justify-content:flex-end;margin-bottom:12px';h.innerHTML='<button id="pmFinalAddBtn" class="btn sm" type="button" onclick="invoiceAddItem()">+ Tambah Item</button>';box.insertBefore(h,box.firstChild);
    }
  }

  function installEdit(){
    if(window.__PM_FINAL_EDIT)return;
    if(typeof window.invoiceEdit!=='function')return setTimeout(installEdit,200);
    const prev=window.invoiceEdit;
    window.invoiceEdit=function(id){
      prev(id);
      state={id:Number(id),baseTotal:0};
      let n=0;const wait=()=>{const box=document.getElementById('invoiceItems');if(box){state.baseTotal=N(document.getElementById('invTotal')?.textContent);syncEditor();}else if(n++<50)setTimeout(wait,80);};wait();
    };
    window.__PM_FINAL_EDIT=true;
  }

  function patchPreview(){
    if(window.__PM_FINAL_PREVIEW)return;
    if(typeof window.previewInvoice!=='function')return setTimeout(patchPreview,200);
    const prev=window.previewInvoice;
    window.previewInvoice=async function(){
      await prev();
      const id=state?.id;if(!id)return;
      const add=get(id);if(!add.length)return;
      const ov=document.getElementById('pmInvoicePreview');const tbody=ov?.querySelector('.pm-inv-table tbody');if(!tbody)return;
      const totalRow=Array.from(tbody.querySelectorAll('tr')).find(tr=>/TOTAL INVOICE/i.test(tr.textContent||''));
      let base=N(totalRow?.querySelectorAll('td')?.[totalRow.querySelectorAll('td').length-1]?.textContent);
      const extra=add.reduce((a,x)=>a+N(x.subtotal),0), total=base+extra;
      tbody.querySelectorAll('tr[data-pm-final-preview]').forEach(x=>x.remove());
      add.forEach(x=>{const tr=document.createElement('tr');tr.dataset.pmFinalPreview='1';tr.innerHTML=`<td class="center">+</td><td><strong>${E(x.item)}</strong><div class="code">${E(x.kode)} • Invoice only</div></td><td class="center">${N(x.qty)} ${E(x.satuan||'unit')}</td><td class="right">${M(x.harga)}</td><td class="right"><strong>${M(x.subtotal)}</strong></td>`;if(totalRow)tbody.insertBefore(tr,totalRow);else tbody.appendChild(tr);});
      if(totalRow){const c=totalRow.querySelectorAll('td');if(c.length)c[c.length-1].textContent=M(total);}
      const pay=ov.querySelector('.pm-inv-pay');
      if(pay){const rows=pay.querySelectorAll('.pm-inv-payrow');if(rows[0])rows[0].querySelector('strong').textContent=M(total);const paid=N(rows[1]?.querySelector('strong')?.textContent);if(rows[2])rows[2].querySelector('strong').textContent=M(Math.max(0,total-paid));}
    };
    window.__PM_FINAL_PREVIEW=true;
  }

  // Make the dialog reliable even if the earlier fix is not active yet.
  window.invoiceAddItem=window.invoiceAddItem||function(){toast('Invoice belum siap.');};
  window.invoiceSaveAddItem=window.invoiceSaveAddItem||function(){toast('Invoice belum siap.');};
  window.invoiceRemoveItem=window.invoiceRemoveItem||function(id){if(!state?.id)return;const d=read(),k=String(state.id);d[k]=(d[k]||[]).filter(x=>String(x.id)!==String(id));write(d);syncEditor();};

  installEdit();patchPreview();
  setTimeout(installEdit,300);setTimeout(patchPreview,300);setTimeout(installEdit,1200);setTimeout(patchPreview,1200);
})();