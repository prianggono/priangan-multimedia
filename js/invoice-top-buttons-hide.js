/* Priangan Multimedia — keep Invoice action buttons only at the bottom.
 * Removes the duplicate + Tambah Item / + Overtime controls rendered inside
 * the invoice item card. The bottom action bar remains untouched.
 */
(function(){
  'use strict';
  function clean(){
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
  new MutationObserver(clean).observe(document.body,{childList:true,subtree:true});
  setTimeout(clean,100);
  setTimeout(clean,500);
  setTimeout(clean,1200);
})();