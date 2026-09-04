/* Priangan Multimedia — Invoice preview total synchronization FINAL
 * The invoice editor can contain additional invoice-only items (e.g. Overtime).
 * The preview must use the CURRENT invoice total, not the original quotation total.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_PREVIEW_TOTAL_SYNC_FINAL)return;
  window.__PM_INVOICE_PREVIEW_TOTAL_SYNC_FINAL=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));

  function formValue(id){
    const el=document.getElementById(id);
    return el?N(el.value):0;
  }

  function currentTotals(){
    const total=formValue('invTotal');
    const paid=formValue('invPaid');
    if(total>0) return {total,paid,balance:Math.max(0,total-paid)};
    const row=window.__PM_INVOICE_ADD_STATE?.row;
    const fallback=N(row?.grand_total??row?.total);
    return {total:fallback,paid:formValue('invPaid'),balance:Math.max(0,fallback-formValue('invPaid'))};
  }

  function setCellText(el,value){
    if(!el)return;
    el.textContent=M(value);
  }

  function patchPreview(){
    const {total,paid,balance}=currentTotals();
    if(total<=0)return false;

    // 1. Invoice item table: find the row whose label is TOTAL INVOICE.
    const all=[...document.querySelectorAll('tr')];
    let changed=false;
    all.forEach(tr=>{
      const text=S(tr.textContent).replace(/\s+/g,' ').toUpperCase();
      if(text==='TOTAL INVOICE' || text.startsWith('TOTAL INVOICE ')){
        const cells=tr.querySelectorAll('td,th');
        if(cells.length) setCellText(cells[cells.length-1],total);
        changed=true;
      }
    });

    // 2. Payment summary: locate the STATUS PEMBAYARAN heading and only patch
    // rows inside its nearest visual container. This avoids touching the main table.
    const headings=[...document.querySelectorAll('*')].filter(el=>S(el.textContent).toUpperCase()==='STATUS PEMBAYARAN');
    headings.forEach(h=>{
      let box=h.parentElement;
      for(let i=0;i<5 && box;i++,box=box.parentElement){
        const rows=[...box.querySelectorAll('tr')];
        if(rows.length){
          rows.forEach(tr=>{
            const cells=tr.querySelectorAll('td,th');
            if(cells.length<2)return;
            const label=S(cells[0].textContent).toLowerCase();
            if(label==='total') setCellText(cells[cells.length-1],total);
            else if(label==='downpayment' || label==='sudah dibayar') setCellText(cells[cells.length-1],paid);
            else if(label==='sisa tagihan') setCellText(cells[cells.length-1],balance);
          });
          changed=true;
          break;
        }
      }
    });

    // 3. Generic fallback for DIV-based payment summary.
    const statusNodes=[...document.querySelectorAll('*')].filter(el=>S(el.textContent).toUpperCase()==='STATUS PEMBAYARAN');
    statusNodes.forEach(h=>{
      const box=h.parentElement?.parentElement || h.parentElement;
      if(!box)return;
      [...box.querySelectorAll('*')].forEach(labelEl=>{
        const label=S(labelEl.textContent).toLowerCase();
        if(!['total','downpayment','sudah dibayar','sisa tagihan'].includes(label))return;
        const parent=labelEl.parentElement;
        if(!parent)return;
        const candidates=[...parent.children].filter(x=>x!==labelEl);
        if(!candidates.length)return;
        const value=label==='total'?total:(label==='downpayment'||label==='sudah dibayar'?paid:balance);
        candidates[candidates.length-1].textContent=M(value);
        changed=true;
      });
    });

    return changed;
  }

  function install(){
    if(typeof window.previewInvoice!=='function' || window.previewInvoice.__pmTotalSyncWrapped)return;
    const original=window.previewInvoice;
    const wrapped=async function(){
      const result=await original.apply(this,arguments);
      [0,50,150,400,900].forEach(ms=>setTimeout(patchPreview,ms));
      return result;
    };
    wrapped.__pmTotalSyncWrapped=true;
    window.previewInvoice=wrapped;
  }

  install();
  [100,500,1200,2500].forEach(ms=>setTimeout(install,ms));
  new MutationObserver(install).observe(document.body,{childList:true,subtree:true});
  window.__pmPatchInvoicePreviewTotal=patchPreview;
})();
