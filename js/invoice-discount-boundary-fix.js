/* Priangan Multimedia — Invoice discount boundary fix
 * Quotation discount belongs ONLY to the quotation.
 * Invoice starts from the already-discounted quotation total.
 * Invoice-only additions and overtime are added at full price and never
 * receive the quotation discount again.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_DISCOUNT_BOUNDARY_V1)return;
  window.__PM_INVOICE_DISCOUNT_BOUNDARY_V1=true;
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'');if(!s)return 0;const n=Number(s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  function extras(id){try{const all=JSON.parse(localStorage.getItem('PM_INVOICE_EXTRA_ITEMS')||'{}')||{};return Array.isArray(all[String(id)])?all[String(id)]:[];}catch(_){return[];}}
  function base(row){return N(row?.grand_total ?? row?.total);}
  function invoiceTotal(){const s=window.__PM_INVOICE_ADD_STATE,row=s?.row;if(!row)return 0;return base(row)+extras(row.id).reduce((sum,x)=>sum+N(x.subtotal),0);}
  let syncQueued=false;
  function syncTotals(){
    if(syncQueued)return;
    syncQueued=true;
    setTimeout(()=>{
      syncQueued=false;
      const s=window.__PM_INVOICE_ADD_STATE,row=s?.row;if(!row)return;
      const total=invoiceTotal();
      const paid=N(document.getElementById('invPaid')?.textContent);
      const totalEl=document.getElementById('invTotal'),balEl=document.getElementById('invBalance');
      const totalText=M(total),balanceText=M(Math.max(0,total-paid));
      if(totalEl&&totalEl.textContent!==totalText)totalEl.textContent=totalText;
      if(balEl&&balEl.textContent!==balanceText)balEl.textContent=balanceText;
    },0);
  }
  function patchPreview(){
    const fn=window.previewInvoice;if(typeof fn!=='function'||fn.__pmDiscountBoundaryPatched)return;
    const wrapped=async function(){
      const s=window.__PM_INVOICE_ADD_STATE,row=s?.row;if(!row)return fn.apply(this,arguments);
      const original=s.row,snapshot={...original},discountedQuote=base(original);
      snapshot.subtotal=discountedQuote;snapshot.total=discountedQuote;snapshot.grand_total=discountedQuote;
      snapshot.diskon=0;snapshot.discount=0;snapshot.diskon_persen=0;snapshot.discount_percent=0;snapshot.diskon_percent=0;
      s.row=snapshot;
      try{return await fn.apply(this,arguments);}finally{s.row=original;}
    };
    wrapped.__pmDiscountBoundaryPatched=true;window.previewInvoice=wrapped;
  }
  function boot(){patchPreview();syncTotals();}
  const mo=new MutationObserver(()=>{patchPreview();syncTotals();});
  mo.observe(document.body,{childList:true,subtree:true});
  [100,300,700,1200,2000].forEach(ms=>setTimeout(boot,ms));
})();
