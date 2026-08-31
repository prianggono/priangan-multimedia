/* Priangan Multimedia — Invoice top action cleanup.
 * Keep ONLY the bottom + TAMBAH ITEM / + OVERTIME buttons.
 * Never remove or alter invoice item rows or calculations.
 */
(function(){
  'use strict';

  function clean(){
    // Remove the known duplicate toolbar created by invoice-ui-final.js.
    const duplicate=document.getElementById('pmInvoiceActions');
    if(duplicate) duplicate.remove();

    // Some older invoice scripts render their own action buttons inside the
    // invoice card. Remove ONLY Add Item / Overtime buttons that are ABOVE
    // the invoice table. The bottom controls must stay untouched.
    const target=document.getElementById('invoiceItems');
    if(!target) return;
    const table=target.querySelector('table');
    if(!table) return;
    const tableTop=table.getBoundingClientRect().top;

    document.querySelectorAll('button').forEach(btn=>{
      if(!btn.isConnected) return;
      const text=(btn.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      if(!text.includes('tambah item') && !text.includes('overtime')) return;

      // Do not touch the real bottom action bar.
      const rect=btn.getBoundingClientRect();
      if(rect.top >= tableTop) return;

      // Only hide a button that belongs to the invoice area/card.
      const insideInvoice=btn.closest('#invoiceItems, .card');
      if(!insideInvoice) return;

      btn.style.setProperty('display','none','important');
      const parent=btn.parentElement;
      if(parent && parent.children.length <= 3){
        const remaining=[...parent.children].filter(x=>x!==btn && getComputedStyle(x).display!=='none');
        if(remaining.length===0) parent.style.setProperty('display','none','important');
      }
    });
  }

  let scheduled=false;
  function run(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;clean();});
  }

  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',run);
  [50,200,500,1200,2500].forEach(ms=>setTimeout(run,ms));
  run();
})();