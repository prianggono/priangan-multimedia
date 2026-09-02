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
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    const n=Number(s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));

  function extras(id){
    try{
      const all=JSON.parse(localStorage.getItem('PM_INVOICE_EXTRA_ITEMS')||'{}')||{};
      return Array.isArray(all[String(id)])?all[String(id)]:[];
    }catch(_){return[];}
  }

  function base(row){
    /* grand_total/total is the canonical quotation amount after discount. */
    return N(row?.grand_total ?? row?.total);
  }

  function invoiceTotal(){
    const s=window.__PM_INVOICE_ADD_STATE;
    const row=s?.row;
    if(!row)return 0;
    return base(row)+extras(row.id).reduce((sum,x)=>sum+N(x.subtotal),0);
  }

  function syncTotals(){
    const s=window.__PM_INVOICE_ADD_STATE;
    const row=s?.row;
    if(!row)return;
    const total=invoiceTotal();
    const paid=N(document.getElementById('invPaid')?.textContent);
    const totalEl=document.getElementById('invTotal');
    const balEl=document.getElementById('invBalance');
    if(totalEl)totalEl.textContent=M(total);
    if(balEl)balEl.textContent=M(Math.max(0,total-paid));

    /* Make the invoice UI explicitly discount-free. */
    document.querySelectorAll('#content .pm-invoice-discount, #content [data-pm-invoice-discount]').forEach(x=>x.remove());
  }

  function patchPreview(){
    const fn=window.previewInvoice;
    if(typeof fn!=='function' || fn.__pmDiscountBoundaryPatched)return;
    const wrapped=async function(){
      const s=window.__PM_INVOICE_ADD_STATE;
      const row=s?.row;
      if(!row)return fn.apply(this,arguments);

      /* Existing preview can read quotation discount fields. Temporarily give
         it a discount-free snapshot whose total is the already-discounted
         quotation amount. Invoice additions are handled by the invoice extra
         item layer, so they are not discounted here. */
      const original=s.row;
      const snapshot={...original};
      const discountedQuote=base(original);
      snapshot.subtotal=discountedQuote;
      snapshot.total=discountedQuote;
      snapshot.grand_total=discountedQuote;
      snapshot.diskon=0;
      snapshot.discount=0;
      snapshot.diskon_persen=0;
      snapshot.discount_percent=0;
      snapshot.diskon_percent=0;
      s.row=snapshot;
      try{return await fn.apply(this,arguments);}
      finally{s.row=original;}
    };
    wrapped.__pmDiscountBoundaryPatched=true;
    window.previewInvoice=wrapped;
  }

  function boot(){
    patchPreview();
    syncTotals();
  }

  /* invoice.js creates the form asynchronously; additional-item rendering
     also changes the total later. Keep this lightweight observer scoped to
     the invoice content and do not touch quotation calculation. */
  const mo=new MutationObserver(()=>{patchPreview();syncTotals();});
  mo.observe(document.body,{childList:true,subtree:true});
  [100,300,700,1200,2000].forEach(ms=>setTimeout(boot,ms));
})();
