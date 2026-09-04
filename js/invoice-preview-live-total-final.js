/* Priangan Multimedia — FINAL live invoice preview totals
 * The preview is rendered in #pmInvoicePreview in the same document.
 * Use the live Invoice Editor totals so invoice-only items (Overtime, etc.)
 * and existing payments are represented correctly.
 */
(function(){
  'use strict';
  if(window.__PM_LIVE_INVOICE_TOTAL_FINAL)return;
  window.__PM_LIVE_INVOICE_TOTAL_FINAL=true;

  const N=v=>{
    let s=String(v??'').replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));

  function totals(){
    const total=N(document.getElementById('invTotal')?.textContent||document.getElementById('invTotal')?.value);
    const paid=N(document.getElementById('invPaid')?.textContent||document.getElementById('invPaid')?.value);
    return {total,paid,balance:Math.max(0,total-paid)};
  }

  function patchPreview(){
    const o=document.getElementById('pmInvoicePreview');
    if(!o)return false;
    const {total,paid,balance}=totals();
    if(!total)return false;

    // The existing preview renderer inserts invoice-only rows correctly but
    // leaves the quotation's original total. Replace only the summary values.
    const rows=[...o.querySelectorAll('tr')];
    for(const tr of rows){
      const text=String(tr.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      const cells=tr.querySelectorAll('td,th');
      if(!cells.length)continue;
      if(text.startsWith('total invoice')||text.startsWith('grand total'))cells[cells.length-1].textContent=M(total);
      if(text.startsWith('downpayment')||text.startsWith('down payment'))cells[cells.length-1].textContent=M(paid);
      if(text.startsWith('sisa tagihan'))cells[cells.length-1].textContent=M(balance);
    }

    // Handle the invoice summary if it is built with divs instead of table rows.
    const leaves=[...o.querySelectorAll('*')].filter(el=>el.children.length===0);
    for(const el of leaves){
      const label=String(el.textContent||'').trim().toLowerCase();
      if(!['total invoice','grand total','downpayment','down payment','sisa tagihan'].includes(label))continue;
      const p=el.parentElement;if(!p)continue;
      const value=(label==='total invoice'||label==='grand total')?total:(label==='downpayment'||label==='down payment'?paid:balance);
      const candidates=[...p.querySelectorAll('*')].filter(x=>x!==el&&x.children.length===0);
      if(candidates.length)candidates[candidates.length-1].textContent=M(value);
    }

    // Store the live values for other preview/print fixes without modifying Supabase.
    o.dataset.pmLiveTotal=String(total);
    o.dataset.pmLivePaid=String(paid);
    o.dataset.pmLiveBalance=String(balance);
    return true;
  }

  function watch(){
    let last=null;
    const run=()=>{
      const o=document.getElementById('pmInvoicePreview');
      if(o!==last){last=o;if(o)patchPreview();}
    };
    const mo=new MutationObserver(run);
    mo.observe(document.body,{childList:true,subtree:true});
    [50,150,300,600,1000,2000].forEach(ms=>setTimeout(patchPreview,ms));
    run();
  }
  watch();
})();
