/* Priangan Multimedia — FINAL live invoice preview totals v3
 * The invoice preview can contain invoice-only rows (e.g. Overtime).
 * Its displayed line-item subtotals are the safest source of truth for the
 * preview total, because the quotation total may be stale.
 */
(function(){
  'use strict';
  if(window.__PM_LIVE_INVOICE_TOTAL_FINAL_V3)return;
  window.__PM_LIVE_INVOICE_TOTAL_FINAL_V3=true;

  const N=v=>{
    let s=String(v??'').replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));

  function editorPaid(){
    return N(document.getElementById('invPaid')?.textContent||document.getElementById('invPaid')?.value);
  }

  function previewLineTotal(o){
    let sum=0;
    [...o.querySelectorAll('tr')].forEach(tr=>{
      const cells=[...tr.querySelectorAll('td,th')];
      if(cells.length<5)return;
      const text=String(tr.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if(/total invoice|grand total|subtotal|downpayment|down payment|sisa tagihan/.test(text))return;
      const first=String(cells[0].textContent||'').trim();
      // Only real product/service rows: numbered rows or the '+' invoice-only row.
      if(!/^(\d+|\+)$/.test(first))return;
      const value=N(cells[cells.length-1].textContent);
      if(value>0)sum+=value;
    });
    return sum;
  }

  function patchPreview(){
    const o=document.getElementById('pmInvoicePreview');
    if(!o)return false;

    // Calculate from the actual displayed invoice line items. This includes
    // Overtime/additional invoice rows and avoids a stale quotation total.
    const total=previewLineTotal(o);
    if(!total)return false;
    const paid=editorPaid();
    const balance=Math.max(0,total-paid);

    [...o.querySelectorAll('tr')].forEach(tr=>{
      const text=String(tr.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      const cells=tr.querySelectorAll('td,th');
      if(!cells.length)continue;
      if(text.startsWith('total invoice')||text.startsWith('grand total'))cells[cells.length-1].textContent=M(total);
      if(text.startsWith('downpayment')||text.startsWith('down payment'))cells[cells.length-1].textContent=M(paid);
      if(text.startsWith('sisa tagihan'))cells[cells.length-1].textContent=M(balance);
    });

    const leaves=[...o.querySelectorAll('*')].filter(el=>el.children.length===0);
    for(const el of leaves){
      const label=String(el.textContent||'').trim().toLowerCase();
      if(!['total invoice','grand total','downpayment','down payment','sisa tagihan'].includes(label))continue;
      const p=el.parentElement;if(!p)continue;
      const value=(label==='total invoice'||label==='grand total')?total:(label==='downpayment'||label==='down payment'?paid:balance);
      const candidates=[...p.querySelectorAll('*')].filter(x=>x!==el&&x.children.length===0);
      if(candidates.length)candidates[candidates.length-1].textContent=M(value);
    }

    o.dataset.pmLiveTotal=String(total);
    o.dataset.pmLivePaid=String(paid);
    o.dataset.pmLiveBalance=String(balance);
    return true;
  }

  function watch(){
    let last=null;
    const run=()=>{
      const o=document.getElementById('pmInvoicePreview');
      if(o!==last){last=o; if(o)patchPreview();}
      else if(o)patchPreview();
    };
    const mo=new MutationObserver(run);
    mo.observe(document.body,{childList:true,subtree:true});
    [50,150,300,600,1000,2000,3500].forEach(ms=>setTimeout(patchPreview,ms));
    run();
  }
  watch();
})();
