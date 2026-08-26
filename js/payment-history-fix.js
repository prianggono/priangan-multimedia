/* Add separate DP and Pelunasan buttons to each quotation in history. */
(function(){
  'use strict';
  function addButtons(){
    if(!/Riwayat Penawaran/i.test(document.querySelector('#title')?.textContent||''))return;
    document.querySelectorAll('.pmHistActions').forEach(box=>{
      if(box.querySelector('.pm-payment-buttons'))return;
      const edit=box.querySelector('[onclick*="editQuotation"]');
      const m=String(edit?.getAttribute('onclick')||'').match(/\((\d+)\)/);if(!m)return;
      const id=Number(m[1]);
      const wrap=document.createElement('span');wrap.className='pm-payment-buttons';wrap.style.cssText='display:inline-flex;gap:6px;align-items:center';
      wrap.innerHTML=`<button type="button" class="btn secondary sm" title="Catat uang muka / DP" onclick="inputDP(${id})">DP</button><button type="button" class="btn green sm" title="Catat pembayaran pelunasan" onclick="inputPelunasan(${id})">Bayar</button>`;
      box.insertBefore(wrap,box.lastElementChild);
    });
  }
  const style=document.createElement('style');style.textContent='.pm-payment-buttons{display:inline-flex!important;gap:6px!important;margin-right:4px}.pm-payment-buttons .btn{white-space:nowrap}';document.head.appendChild(style);
  const observer=new MutationObserver(addButtons);observer.observe(document.body,{childList:true,subtree:true});addButtons();
})();
