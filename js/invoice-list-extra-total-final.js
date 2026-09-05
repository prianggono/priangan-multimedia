/* Priangan Multimedia — Invoice list total sync FINAL
 * Adds persisted invoice-only items to the Invoice list total and balance.
 * Quotation totals remain unchanged.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_LIST_EXTRA_TOTAL_FINAL)return;
  window.__PM_INVOICE_LIST_EXTRA_TOTAL_FINAL=true;

  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    let s=String(v??'').replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const DB=()=>window.db||window.__PM_STABLE_DB||window.__PRIANGAN_QUOTE_DB||null;

  async function sync(){
    const title=String(document.querySelector('#title')?.textContent||'').trim();
    if(!/^Invoice$/i.test(title))return;
    const table=document.querySelector('#content table');
    if(!table)return;
    const d=DB();if(!d)return;
    const r=await d.from('penawaran_invoice_items').select('id,penawaran_id,subtotal').order('id');
    if(r.error)return;
    const sums={};
    (r.data||[]).forEach(x=>{const id=String(x.penawaran_id);sums[id]=(sums[id]||0)+N(x.subtotal)});
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const btn=tr.querySelector('button[onclick*="invoiceEdit("]');
      if(!btn)return;
      const m=(btn.getAttribute('onclick')||'').match(/invoiceEdit\((\d+)\)/);if(!m)return;
      const id=m[1],extra=sums[id]||0;if(!extra)return;
      const cells=tr.children;if(cells.length<8)return;
      const totalCell=cells[4],paidCell=cells[5];
      const baseText=totalCell.dataset.pmBaseTotal||totalCell.textContent;
      const base=N(baseText);totalCell.dataset.pmBaseTotal=String(base);
      const total=base+extra;totalCell.textContent=M(total);
      const paid= N(paidCell.dataset.pmBasePaid||String(paidCell.textContent).split('Sisa')[0]);
      paidCell.dataset.pmBasePaid=String(paid);
      const amount=paidCell.querySelector('div');
      if(amount)amount.textContent='Sisa '+M(Math.max(0,total-paid));
    });
  }

  function patch(){
    if(typeof window.invoicePage!=='function'||window.invoicePage.__pmListExtra)return false;
    const old=window.invoicePage;
    const wrapped=async function(){const r=await old.apply(this,arguments);setTimeout(()=>sync().catch(()=>{}),50);setTimeout(()=>sync().catch(()=>{}),400);return r;};
    wrapped.__pmListExtra=true;window.invoicePage=wrapped;return true;
  }
  const mo=new MutationObserver(()=>patch());
  mo.observe(document.documentElement,{childList:true,subtree:true});
  [0,100,300,700,1500,3000].forEach(ms=>setTimeout(patch,ms));
})();
