/* Priangan Multimedia — discount input format v3 */
(function(){
  'use strict';
  if(window.__PM_DISCOUNT_INPUT_V3)return;
  window.__PM_DISCOUNT_INPUT_V3=true;

  const num=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    let s=String(v??'').trim().replace(/%/g,'').replace(/\s/g,'');
    if(!s)return 0;
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  };
  const cleanPct=v=>{
    const n=num(v);
    if(!Number.isFinite(n))return '';
    const clamped=Math.max(0,Math.min(100,n));
    return Number.isInteger(clamped)?String(clamped):String(Number(clamped.toFixed(2)));
  };
  const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(num(v));

  function patchPercent(){
    const p=document.querySelector('#pmDiscPct');
    if(!p)return false;

    p.type='text';
    p.inputMode='decimal';
    p.autocomplete='off';
    p.placeholder='0';
    p.removeAttribute('step');
    p.removeAttribute('min');
    p.removeAttribute('max');

    if(p.dataset.pmPctV3!=='1'){
      p.dataset.pmPctV3='1';
      p.addEventListener('focus',()=>{
        p.value=cleanPct(p.value);
        try{p.select()}catch(_){}
      });
      p.addEventListener('input',()=>{
        const raw=p.value;
        const cleaned=raw.replace(/[^0-9,.-]/g,'').replace(/,/g,'.');
        const n=num(cleaned);
        p.value=n>100?'100':(cleaned==='.'?'0':cleaned);
      },true);
      p.addEventListener('blur',()=>{p.value=cleanPct(p.value)},true);
      p.addEventListener('keydown',e=>{
        if(e.key==='%')e.preventDefault();
      });
    }

    const normalized=cleanPct(p.value);
    if(document.activeElement!==p && p.value!==normalized)p.value=normalized;
    return true;
  }

  function patchRupiah(){
    const r=document.querySelector('#pmDisc');
    if(!r)return false;
    r.type='text';
    r.inputMode='numeric';
    r.autocomplete='off';
    r.placeholder='Rp0';
    if(r.dataset.pmRpV3==='1')return true;
    r.dataset.pmRpV3='1';
    const format=()=>{r.value=money(r.value)};
    r.addEventListener('focus',()=>{const n=num(r.value);r.value=n?String(n):''});
    r.addEventListener('input',()=>{const n=num(r.value);r.value=n?String(n):''});
    r.addEventListener('blur',format);
    return true;
  }

  function sync(){patchPercent();patchRupiah()}
  const mo=new MutationObserver(()=>requestAnimationFrame(sync));
  mo.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('focusin',e=>{if(e.target?.id==='pmDiscPct')patchPercent()},true);
  document.addEventListener('input',e=>{
    if(e.target?.id==='pmDiscPct'){
      const p=e.target;
      setTimeout(()=>{
        if(document.activeElement===p){
          const n=num(p.value);
          if(n>100)p.value='100';
        }
      },0);
    }
    if(e.target?.id==='pmDisc')patchRupiah();
  },true);
  [0,100,300,700,1500,3000].forEach(ms=>setTimeout(sync,ms));
})();
