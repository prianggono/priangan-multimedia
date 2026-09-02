/* Invoice payment UI — schema safe.
 * Uses the quotation id already rendered by invoice.js; it never queries
 * invoice-specific columns from penawaran.
 */
(function(){
'use strict';
if(window.__PM_INVOICE_PAYMENT_FIX_V2)return;
window.__PM_INVOICE_PAYMENT_FIX_V2=true;
function addSettlementButtons(){
  try{
    document.querySelectorAll('.table tbody tr').forEach(tr=>{
      const cells=tr.querySelectorAll('td');
      if(cells.length<8)return;
      const action=cells[cells.length-1];
      if(action.querySelector('.pm-invoice-settle'))return;
      const edit=action.querySelector('button[onclick*="invoiceEdit("]');
      if(!edit)return;
      const m=String(edit.getAttribute('onclick')||'').match(/invoiceEdit\((\d+)\)/);
      if(!m)return;
      const id=Number(m[1]);
      if(!Number.isFinite(id))return;
      const b=document.createElement('button');
      b.type='button';b.className='btn sm green pm-invoice-settle';
      b.textContent='Pelunasan';b.style.marginLeft='6px';
      b.onclick=()=>window.inputPelunasan?.(id);
      action.appendChild(b);
    });
  }catch(e){console.warn('[PM] invoice payment button:',e)}
}
new MutationObserver(addSettlementButtons).observe(document.body,{childList:true,subtree:true});
setTimeout(addSettlementButtons,300);
setTimeout(addSettlementButtons,1000);
})();
