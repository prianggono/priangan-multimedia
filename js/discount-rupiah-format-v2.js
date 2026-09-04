/* Priangan Multimedia — discount input format v4
 * Percent input is intentionally NOT reformatted while typing.
 * This prevents 10 from becoming 100 and makes replacement/editing reliable.
 */
(function(){
  'use strict';
  if(window.__PM_DISCOUNT_INPUT_V4)return;
  window.__PM_DISCOUNT_INPUT_V4=true;

  const parsePct=v=>{
    let s=String(v??'').trim().replace(/%/g,'').replace(/\s/g,'').replace(',','.');
    if(!s)return 0;
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  };

  const normalizePct=v=>{
    const n=Math.max(0,Math.min(100,parsePct(v)));
    return Number.isInteger(n)?String(n):String(Number(n.toFixed(2)));
  };

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

    if(p.dataset.pmPctV4!=='1'){
      p.dataset.pmPctV4='1';

      // Saat mulai mengedit, hilangkan format lama lalu pilih seluruh angka.
      p.addEventListener('focus',()=>{
        const clean=normalizePct(p.value);
        p.value=clean;
        requestAnimationFrame(()=>{
          try{p.setSelectionRange(0,p.value.length)}catch(_){}
        });
      });

      // Jangan menghitung/clamp saat setiap karakter masuk.
      // Biarkan user mengetik "10" secara normal.
      p.addEventListener('input',()=>{
        const old=p.value;
        const pos=p.selectionStart;
        const clean=old.replace(/[^0-9.,]/g,'').replace(/,/g,'.');
        if(clean!==old){
          p.value=clean;
          try{p.setSelectionRange(Math.max(0,(pos||0)-(old.length-clean.length)),Math.max(0,(pos||0)-(old.length-clean.length)))}catch(_){}
        }
        // Hanya batas keras jika memang sudah >100; tidak mengubah 10 menjadi 100.
        const n=parsePct(p.value);
        if(n>100){
          p.value='100';
          try{p.setSelectionRange(3,3)}catch(_){}
        }
      },true);

      // Rapikan hanya setelah selesai mengetik.
      p.addEventListener('blur',()=>{
        p.value=normalizePct(p.value);
        p.dispatchEvent(new Event('change',{bubbles:true}));
      },true);

      p.addEventListener('keydown',e=>{
        if(e.key==='%')e.preventDefault();
      });
    }

    if(document.activeElement!==p){
      const n=normalizePct(p.value);
      if(p.value!==n)p.value=n;
    }
    return true;
  }

  function patchRupiah(){
    const r=document.querySelector('#pmDisc');
    if(!r)return false;
    r.type='text';
    r.inputMode='numeric';
    r.autocomplete='off';
    r.placeholder='Rp0';
    if(r.dataset.pmRpV4==='1')return true;
    r.dataset.pmRpV4='1';

    const number=v=>{
      let s=String(v??'').replace(/[^0-9,.-]/g,'');
      s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
      const n=Number(s);return Number.isFinite(n)?n:0;
    };
    const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(number(v));

    r.addEventListener('focus',()=>{r.value=number(r.value)?String(number(r.value)):''});
    r.addEventListener('input',()=>{r.value=number(r.value)?String(number(r.value)):''});
    r.addEventListener('blur',()=>{r.value=money(r.value)});
    return true;
  }

  function sync(){patchPercent();patchRupiah()}
  const mo=new MutationObserver(()=>requestAnimationFrame(sync));
  mo.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('focusin',e=>{if(e.target?.id==='pmDiscPct')patchPercent()},true);
  document.addEventListener('input',e=>{if(e.target?.id==='pmDiscPct')patchPercent();if(e.target?.id==='pmDisc')patchRupiah()},true);
  [0,100,300,700,1500,3000].forEach(ms=>setTimeout(sync,ms));
})();
