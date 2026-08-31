/* Priangan Multimedia — Invoice top action cleanup.
 * Keep ONLY the existing bottom + TAMBAH ITEM / + OVERTIME buttons.
 * Do not touch invoice data, item calculations, or the bottom action bar.
 */
(function(){
  'use strict';
  function clean(){
    // invoice-ui-final.js creates this toolbar directly after #invoiceItems.
    // It is the duplicate TOP toolbar; the existing bottom toolbar must remain.
    document.getElementById('pmInvoiceActions')?.remove();

    // Safety fallback for any duplicate controls rendered inside invoiceItems.
    const target=document.getElementById('invoiceItems');
    if(!target)return;
    target.querySelectorAll('button').forEach(btn=>{
      const text=(btn.textContent||'').trim().toLowerCase();
      const action=(btn.getAttribute('onclick')||'').toLowerCase();
      if(action.includes('invoiceadditem') || text.includes('tambah item') || text.includes('overtime')){
        const wrap=btn.closest('div');
        if(wrap && wrap!==target && wrap.querySelectorAll('button').length===1) wrap.remove();
      }
    });
  }
  const run=()=>clean();
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  setTimeout(run,50);
  setTimeout(run,200);
  setTimeout(run,500);
  setTimeout(run,1200);
})();