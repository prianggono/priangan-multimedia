/* Priangan Multimedia — discount input format v5
 * Final guard for quotation discount fields.
 * Prevents the quotation core from rewriting the percent field while typing.
 */
(function(){
  'use strict';
  if(window.__PM_DISCOUNT_INPUT_V5)return;
  window.__PM_DISCOUNT_INPUT_V5=true;

  const cleanNumber=v=>{
    let s=String(v??'').trim().replace(/[^0-9,.-]/g,'');
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  };
  const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(cleanNumber(v));
  const pctText=v=>{
    const n=Math.max(0,Math.min(100,cleanNumber(v)));
    return Number.isInteger(n)?String(n):String(Number(n.toFixed(2)));
  };

  function fields(){
    return {p:document.querySelector('#pmDiscPct'),r:document.querySelector('#pmDisc')};
  }

  function calculatePct(){
    const {p,r}=fields();
    if(!p||!r)return;
    const base=Math.max(0,cleanNumber(window.__pmDiscountBase));
    const pct=Math.max(0,Math.min(100,cleanNumber(p.value)));
    const rp=Math.round(base*pct/100);
    r.value=money(rp);
    const net=Math.max(0,base-rp);
    const grand=document.querySelector('#pmGrand');
    const total=document.querySelector('#total');
    if(grand)grand.textContent=money(net);
    if(total)total.textContent=money(net);
    window.__pmDiscountBase=base;
    window.__pmDiscountPct=pct;
    window.__pmDiscountValue=rp;
    window.__pmNetTotal=net;
  }

  function calculateRp(){
    const {p,r}=fields();
    if(!p||!r)return;
    const base=Math.max(0,cleanNumber(window.__pmDiscountBase));
    const rp=Math.max(0,Math.min(base,cleanNumber(r.value)));
    const pct=base?rp/base*100:0;
    p.value=Number.isInteger(pct)?String(pct):String(Number(pct.toFixed(2)));
    r.value=money(rp);
    const net=Math.max(0,base-rp);
    const grand=document.querySelector('#pmGrand');
    const total=document.querySelector('#total');
    if(grand)grand.textContent=money(net);
    if(total)total.textContent=money(net);
    window.__pmDiscountBase=base;
    window.__pmDiscountPct=pct;
    window.__pmDiscountValue=rp;
    window.__pmNetTotal=net;
  }

  function patch(){
    const {p,r}=fields();
    if(p){
      p.type='text';
      p.inputMode='decimal';
      p.autocomplete='off';
      p.placeholder='0';
      p.removeAttribute('min');
      p.removeAttribute('max');
      p.removeAttribute('step');
      if(p.dataset.pmPctV5!=='1'){
        p.dataset.pmPctV5='1';
        p.addEventListener('focus',()=>{
          p.value=pctText(p.value);
          requestAnimationFrame(()=>{try{p.select()}catch(_){} });
        });
        p.addEventListener('blur',()=>{
          p.value=pctText(p.value);
          calculatePct();
        });
        p.addEventListener('keydown',e=>{if(e.key==='%')e.preventDefault()});
      }
    }
    if(r){
      r.type='text';
      r.inputMode='numeric';
      r.autocomplete='off';
      r.placeholder='Rp0';
      if(r.dataset.pmRpV5!=='1'){
        r.dataset.pmRpV5='1';
        r.addEventListener('focus',()=>{const n=cleanNumber(r.value);r.value=n?String(n):''});
        r.addEventListener('blur',()=>{r.value=money(r.value);calculateRp()});
      }
    }
  }

  // Capture before the quotation-core input listeners. The browser has already
  // placed the typed character in the field, so we can keep that value and stop
  // the old core handler from formatting/replacing it.
  document.addEventListener('input',e=>{
    const t=e.target;
    if(!t)return;
    if(t.id==='pmDiscPct'){
      patch();
      const old=t.value;
      const clean=old.replace(/[^0-9.,]/g,'').replace(/,/g,'.');
      if(clean!==old)t.value=clean;
      if(cleanNumber(t.value)>100)t.value='100';
      e.stopImmediatePropagation();
      calculatePct();
    }else if(t.id==='pmDisc'){
      patch();
      e.stopImmediatePropagation();
      calculateRp();
    }
  },true);

  document.addEventListener('focusin',e=>{if(e.target?.id==='pmDiscPct'||e.target?.id==='pmDisc')patch()},true);
  const mo=new MutationObserver(()=>requestAnimationFrame(patch));
  mo.observe(document.body,{childList:true,subtree:true});
  [0,100,300,700,1500,3000].forEach(ms=>setTimeout(patch,ms));
})();
