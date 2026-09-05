/* Priangan Multimedia — AUTHORITATIVE invoice preview totals + extra rows FINAL v2
 * The Invoice Editor is the source of truth for invoice total and payments.
 * Invoice-only additions are rendered in the preview as well as the editor.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_AUTHORITATIVE_FINAL_V2)return;
  window.__PM_INVOICE_AUTHORITATIVE_FINAL_V2=true;

  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    let s=String(v??'').replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);return Number.isFinite(n)?n:0;
  };
  const S=v=>String(v??'').trim();
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const extras=id=>{try{return JSON.parse(localStorage.getItem('PM_INVOICE_EXTRA_ITEMS')||'{}')[String(id)]||[]}catch(_){return[]}};

  function editor(){
    const total=N(document.getElementById('invTotal')?.textContent||document.getElementById('invTotal')?.value);
    const paid=N(document.getElementById('invPaid')?.textContent||document.getElementById('invPaid')?.value);
    return {total,paid,balance:Math.max(0,total-paid)};
  }

  function qtyText(i){
    const t=S(i.tipe||i.tipe_perhitungan).toLowerCase();
    if(t==='luas')return `${N(i.lebar)} × ${N(i.tinggi)} m²`;
    if(t==='level')return `${N(i.lebar)} m`;
    if(t==='rigging')return `${N(i.panjang)} × ${N(i.tinggi)} m`;
    if(t==='overtime')return `${N(i.qty)} jam`;
    return `${N(i.qty)||1} ${E(i.satuan||'unit')}`;
  }

  function patchRows(root){
    const id=Number(window.__PM_INVOICE_ADD_STATE?.id||window.__PM_INVOICE_ADD_ID||window.__PM_CURRENT_INVOICE_ID||0);
    if(!id)return;
    const table=root.querySelector('.pm-inv-table');
    const tbody=table?.querySelector('tbody');
    if(!tbody)return;
    tbody.querySelectorAll('tr[data-pm-invoice-preview-extra]').forEach(x=>x.remove());
    const totalRow=tbody.querySelector('.pm-inv-total');
    if(!totalRow)return;
    const list=extras(id);
    list.forEach((i,index)=>{
      const tr=document.createElement('tr');
      tr.dataset.pmInvoicePreviewExtra='1';
      tr.innerHTML=`<td class="center">+</td><td><strong>${E(i.item||i.nama_item||'Item Tambahan')}</strong><div class="code">${E(i.kode||'ADD-INV')} • Invoice only</div></td><td class="center">${qtyText(i)}</td><td class="right">${M(i.harga_jual??i.harga)}</td><td class="right"><strong>${M(i.subtotal)}</strong></td>`;
      tbody.insertBefore(tr,totalRow);
    });
  }

  function patch(root){
    if(!root)return;
    patchRows(root);
    const {total,paid,balance}=editor();
    if(!total)return;

    const totalCell=root.querySelector('.pm-inv-total td:last-child');
    if(totalCell)totalCell.textContent=M(total);

    const boxes=[...root.querySelectorAll('.pm-inv-paybox')];
    if(boxes[0]){
      const rows=[...boxes[0].querySelectorAll('.pm-inv-payrow')];
      for(const r of rows){
        const label=S(r.firstElementChild?.textContent).toLowerCase();
        const value=r.lastElementChild;
        if(!value)continue;
        if(label==='total')value.textContent=M(total);
        else if(label==='sudah dibayar'||label==='downpayment'||label==='down payment')value.textContent=M(paid);
        else if(label==='sisa tagihan')value.textContent=M(balance);
      }
    }

    [...root.querySelectorAll('*')].forEach(el=>{
      if(el.children.length)return;
      const label=S(el.textContent).toLowerCase();
      let value=null;
      if(label==='total invoice'||label==='grand total')value=total;
      else if(label==='downpayment'||label==='down payment'||label==='sudah dibayar')value=paid;
      else if(label==='sisa tagihan')value=balance;
      if(value===null)return;
      const p=el.parentElement;if(!p)return;
      const leaves=[...p.children].filter(x=>x!==el&&x.children.length===0);
      if(leaves.length)leaves[leaves.length-1].textContent=M(value);
    });
  }

  function installAppendHook(){
    const body=document.body;
    if(!body||body.__pmInvoiceAppendHookV2)return;
    body.__pmInvoiceAppendHookV2=true;
    const native=body.appendChild.bind(body);
    body.appendChild=function(node){
      const out=native(node);
      if(node&&node.id==='pmInvoicePreview'){
        [0,25,100,300,800].forEach(ms=>setTimeout(()=>patch(node),ms));
      }
      return out;
    };
  }

  function installPreviewWrapper(){
    if(typeof window.previewInvoice!=='function')return false;
    if(window.previewInvoice.__pmAuthoritativeV2)return true;
    const original=window.previewInvoice;
    const wrapped=async function(){
      const result=await original.apply(this,arguments);
      const root=document.getElementById('pmInvoicePreview');
      [0,25,100,300,800,1500,2500].forEach(ms=>setTimeout(()=>patch(root),ms));
      return result;
    };
    wrapped.__pmAuthoritativeV2=true;
    window.previewInvoice=wrapped;
    return true;
  }

  installAppendHook();
  if(!installPreviewWrapper()){
    const mo=new MutationObserver(()=>{
      installAppendHook();
      if(installPreviewWrapper())mo.disconnect();
    });
    mo.observe(document.documentElement,{childList:true,subtree:true});
    [50,150,300,600,1000,2000].forEach(ms=>setTimeout(installPreviewWrapper,ms));
    setTimeout(()=>mo.disconnect(),5000);
  }
})();
