/* Invoice: pelunasan is handled from the Invoice page, not Riwayat Penawaran.
 * Schema-safe: only request columns that exist in the current quotation model.
 */
(function(){
'use strict';
function S(v){return String(v??'').trim()}
function DB(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.__PRIANGAN_QUOTE_DB||null}
const original=window.invoicePage;
if(typeof original!=='function'||window.__PM_INVOICE_PAYMENT_FIX)return;
window.__PM_INVOICE_PAYMENT_FIX=true;
window.invoicePage=async function(){
  const result=await original.apply(this,arguments);
  try{
    const d=DB();if(!d)return result;
    const r=await d.from('penawaran').select('id,nomor_invoice,nomor_penawaran').order('id',{ascending:false});
    if(r.error){console.warn('[PM] invoice payment query:',r.error);return result;}
    const rows=[...document.querySelectorAll('.table tbody tr')];
    const data=(r.data||[]).filter(x=>S(x.nomor_invoice));
    let di=0;
    rows.forEach(tr=>{
      const cells=tr.querySelectorAll('td');
      if(cells.length<8)return;
      const q=data[di++];if(!q)return;
      const action=cells[cells.length-1];
      if(action.querySelector('.pm-invoice-settle'))return;
      const b=document.createElement('button');
      b.type='button';b.className='btn sm green pm-invoice-settle';b.textContent='Pelunasan';
      b.style.marginLeft='6px';
      b.onclick=()=>window.inputPelunasan(Number(q.id));
      action.appendChild(b);
    });
  }catch(e){console.warn('[PM] invoice payment button:',e)}
  return result;
};
})();
