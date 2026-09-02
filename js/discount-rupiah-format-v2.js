/* Priangan Multimedia — Discount Rupiah display v2 */
(function(){
  'use strict';
  if(window.__PM_DISCOUNT_RUPIAH_V2)return;
  window.__PM_DISCOUNT_RUPIAH_V2=true;
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=String(v??'').replace(/[^0-9,.-]/g,'');if(!s)return 0;const n=Number(s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  function sync(){
    const r=document.querySelector('#pmDisc');
    if(!r)return;
    r.type='text';r.inputMode='numeric';r.autocomplete='off';r.placeholder='Rp0';
    if(document.activeElement!==r){const n=N(r.value);const f=M(n);if(r.value!==f)r.value=f;}
    if(r.dataset.pmV2==='1')return;
    r.dataset.pmV2='1';
    r.addEventListener('focus',()=>{const n=N(r.value);r.value=n?String(n):'';});
    r.addEventListener('blur',()=>{r.value=M(N(r.value));});
    r.addEventListener('input',()=>{const n=N(r.value);r.value=n?String(n):'';});
  }
  const mo=new MutationObserver(()=>setTimeout(sync,0));
  mo.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('input',e=>{if(e.target?.id==='pmDiscPct'||e.target?.id==='pmDisc')setTimeout(sync,0);},true);
  document.addEventListener('change',e=>{if(e.target?.id==='pmDiscPct'||e.target?.id==='pmDisc')setTimeout(sync,0);},true);
  [0,100,300,700,1500,3000].forEach(ms=>setTimeout(sync,ms));
})();
