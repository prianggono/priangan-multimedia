/* Add DP / payment button to each quotation in history. */
(function(){
  'use strict';
  function addButtons(){
    if(!/Riwayat Penawaran/i.test(document.querySelector('#title')?.textContent||''))return;
    document.querySelectorAll('.pmHistActions').forEach(box=>{
      if(box.querySelector('.pm-payment-btn'))return;
      const edit=box.querySelector('[onclick*="editQuotation"]');
      const m=String(edit?.getAttribute('onclick')||'').match(/\((\d+)\)/);if(!m)return;
      const b=document.createElement('button');b.type='button';b.className='btn secondary sm pm-payment-btn';b.textContent='DP / Bayar';b.onclick=()=>window.addPayment(Number(m[1]));box.insertBefore(b,box.lastElementChild);
    });
  }
  const observer=new MutationObserver(addButtons);observer.observe(document.body,{childList:true,subtree:true});addButtons();
})();
