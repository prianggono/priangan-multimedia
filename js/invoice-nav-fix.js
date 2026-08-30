/* Invoice navigation fix — attach handler when the Invoice nav already exists in index.html. */
(function(){
  'use strict';
  function bind(){
    const b=document.querySelector('.nav[data-p="invoice"]');
    if(!b || b.dataset.pmInvoiceBound==='1') return;
    b.dataset.pmInvoiceBound='1';
    b.addEventListener('click', function(){
      document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===b));
      if(typeof window.invoicePage==='function') window.invoicePage();
      document.querySelector('.sidebar')?.classList.remove('open');
    });
  }
  bind();
  new MutationObserver(bind).observe(document.body,{childList:true,subtree:true});
})();
