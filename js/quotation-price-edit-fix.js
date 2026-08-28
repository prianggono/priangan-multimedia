/* Per-quotation price editor. Changes only the current quotation item price in the form; master price is never updated. */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);
  function field(card){
    for(const f of card.querySelectorAll('.field')){
      const label=S(f.querySelector('label')?.textContent).toLowerCase();
      if(label.includes('harga jual')) return f.querySelector('input');
    }
    return null;
  }
  function enhance(){
    document.querySelectorAll('#items > .item').forEach(card=>{
      const input=field(card); if(!input || input.dataset.pmPriceEditor==='1') return;
      input.dataset.pmPriceEditor='1';
      input.dataset.masterPrice=input.value||'';
      input.readOnly=true;
      input.classList.add('pm-quote-price-readonly');
      const wrap=input.parentElement;
      if(wrap){
        wrap.style.position='relative';
        const b=document.createElement('button');
        b.type='button'; b.className='btn secondary pm-edit-price'; b.textContent='Edit';
        b.style.marginTop='6px'; b.style.fontSize='12px'; b.style.padding='5px 10px';
        b.addEventListener('click',e=>{
          e.preventDefault(); e.stopPropagation();
          const editing=input.readOnly;
          input.readOnly=!editing;
          b.textContent=input.readOnly?'Edit':'Simpan';
          b.classList.toggle('pm-price-editing',!input.readOnly);
          if(!input.readOnly){ input.focus(); input.select(); }
          else {
            const ev=new Event('input',{bubbles:true}); input.dispatchEvent(ev);
            const ch=new Event('change',{bubbles:true}); input.dispatchEvent(ch);
          }
        });
        wrap.appendChild(b);
      }
      input.addEventListener('input',()=>{
        input.dataset.quotePrice=input.value;
      });
    });
  }
  const style=document.createElement('style');
  style.textContent=`
    .pm-quote-price-readonly{background:rgba(255,255,255,.035)!important;cursor:default}
    .pm-edit-price{display:inline-flex!important;align-items:center;gap:5px}
    .pm-edit-price.pm-price-editing{border-color:rgba(77,141,255,.65)!important}
  `;
  document.head.appendChild(style);
  new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});
  requestAnimationFrame(enhance);
})();
