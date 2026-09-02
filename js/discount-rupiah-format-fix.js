/* Priangan Multimedia — discount Rupiah display fix
 * Shows Discount (Rp) as Indonesian Rupiah while keeping the stored value numeric.
 */
(function(){
  'use strict';
  if(window.__PM_DISCOUNT_RUPIAH_FORMAT_V1)return;
  window.__PM_DISCOUNT_RUPIAH_FORMAT_V1=true;

  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const s=String(v??'').trim().replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    const n=Number(s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));

  function patch(){
    const r=document.querySelector('#pmDisc');
    const p=document.querySelector('#pmDiscPct');
    if(!r || r.dataset.pmRupiahFormat==='1'){
      if(r && p && p.dataset.pmRupiahSync!=='1'){
        p.dataset.pmRupiahSync='1';
        p.addEventListener('input',()=>setTimeout(()=>{r.value=M(window.__pmDiscountValue||N(r.value));},0));
      }
      return !!r;
    }

    r.type='text';
    r.inputMode='numeric';
    r.autocomplete='off';
    r.placeholder='Rp0';
    r.dataset.pmRupiahFormat='1';

    const format=()=>{
      const n=N(r.value);
      r.value=M(n);
      try{r.setSelectionRange(r.value.length,r.value.length)}catch(_){}
    };

    r.value=M(window.__pmDiscountValue||N(r.value));

    r.addEventListener('focus',()=>{
      const n=N(r.value);
      r.value=n?String(n):'';
      try{r.setSelectionRange(r.value.length,r.value.length)}catch(_){}
    });

    r.addEventListener('input',()=>{
      const n=N(r.value);
      r.value=n?String(n):'';
      try{r.setSelectionRange(r.value.length,r.value.length)}catch(_){}
      setTimeout(format,0);
    });

    r.addEventListener('blur',format);

    if(p && p.dataset.pmRupiahSync!=='1'){
      p.dataset.pmRupiahSync='1';
      p.addEventListener('input',()=>setTimeout(()=>{r.value=M(window.__pmDiscountValue||N(r.value));},0));
    }
    return true;
  }

  function boot(){
    if(!patch())setTimeout(boot,150);
  }
  boot();
})();
