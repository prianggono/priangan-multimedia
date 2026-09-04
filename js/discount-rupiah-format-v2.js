/* Priangan Multimedia — discount input format v6
 * Final percent-field fix.
 * Never force trailing .00 into the Diskon (%) field.
 */
(function(){
  'use strict';
  if(window.__PM_DISCOUNT_INPUT_V6)return;
  window.__PM_DISCOUNT_INPUT_V6=true;

  const clean=v=>String(v??'').replace(/[^0-9.,-]/g,'').replace(/,/g,'.');
  const number=v=>{const n=Number(clean(v));return Number.isFinite(n)?n:0};
  const pct=v=>{const n=Math.max(0,Math.min(100,number(v)));return Number.isInteger(n)?String(n):String(Number(n.toFixed(2)))};
  const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(number(v));

  // Protect the field at the actual value-property level. This catches older
  // quotation handlers that still execute after input events and assign 1.00.
  const proto=HTMLInputElement.prototype;
  const desc=Object.getOwnPropertyDescriptor(proto,'value');
  if(desc&&desc.get&&desc.set&&!proto.__pmPctValueV6){
    const originalSet=desc.set;
    Object.defineProperty(proto,'value',{
      configurable:desc.configurable,
      enumerable:desc.enumerable,
      get:desc.get,
      set:function(v){
        if(this&&this.id==='pmDiscPct'&&document.activeElement===this){
          let s=String(v??'');
          s=s.replace(/([.,])00$/,'');
          originalSet.call(this,s);
          return;
        }
        originalSet.call(this,v);
      }
    });
    Object.defineProperty(proto,'__pmPctValueV6',{value:true,configurable:false});
  }

  function fields(){return{p:document.querySelector('#pmDiscPct'),r:document.querySelector('#pmDisc')}}
  function calculatePct(){
    const {p,r}=fields();if(!p||!r)return;
    const base=Math.max(0,number(window.__pmDiscountBase));
    const value=p.value;
    const val=Math.max(0,Math.min(100,number(value)));
    const rp=Math.round(base*val/100),net=Math.max(0,base-rp);
    r.value=money(rp);
    const g=document.querySelector('#pmGrand'),t=document.querySelector('#total');
    if(g)g.textContent=money(net);if(t)t.textContent=money(net);
    window.__pmDiscountBase=base;window.__pmDiscountPct=val;window.__pmDiscountValue=rp;window.__pmNetTotal=net;
  }
  function calculateRp(){
    const {p,r}=fields();if(!p||!r)return;
    const base=Math.max(0,number(window.__pmDiscountBase));
    const rp=Math.max(0,Math.min(base,number(r.value))),val=base?rp/base*100:0,net=Math.max(0,base-rp);
    p.value=Number.isInteger(val)?String(val):String(Number(val.toFixed(2)));
    r.value=money(rp);
    const g=document.querySelector('#pmGrand'),t=document.querySelector('#total');
    if(g)g.textContent=money(net);if(t)t.textContent=money(net);
    window.__pmDiscountBase=base;window.__pmDiscountPct=val;window.__pmDiscountValue=rp;window.__pmNetTotal=net;
  }
  function patch(){
    const {p,r}=fields();
    if(p){
      p.type='text';p.inputMode='decimal';p.autocomplete='off';p.placeholder='0';
      p.removeAttribute('min');p.removeAttribute('max');p.removeAttribute('step');
      if(p.dataset.pmPctV6!=='1'){
        p.dataset.pmPctV6='1';
        p.addEventListener('focus',()=>{p.value=pct(p.value);requestAnimationFrame(()=>{try{p.select()}catch(_){}})},true);
        p.addEventListener('blur',()=>{p.value=pct(p.value);calculatePct()},true);
        p.addEventListener('keydown',e=>{if(e.key==='%')e.preventDefault()},true);
      }
    }
    if(r){
      r.type='text';r.inputMode='numeric';r.autocomplete='off';r.placeholder='Rp0';
      if(r.dataset.pmRpV6!=='1'){
        r.dataset.pmRpV6='1';
        r.addEventListener('focus',()=>{const n=number(r.value);r.value=n?String(n):''},true);
        r.addEventListener('blur',()=>{r.value=money(r.value);calculateRp()},true);
      }
    }
  }

  // Capture at window, before document/target listeners from older scripts.
  window.addEventListener('input',e=>{
    const t=e.target;if(!t)return;
    if(t.id==='pmDiscPct'){
      patch();
      const s=clean(t.value);
      if(s!==t.value)t.value=s;
      if(number(t.value)>100)t.value='100';
      calculatePct();
      e.stopImmediatePropagation();
    }else if(t.id==='pmDisc'){
      patch();calculateRp();e.stopImmediatePropagation();
    }
  },true);

  window.addEventListener('focusin',e=>{if(e.target?.id==='pmDiscPct'||e.target?.id==='pmDisc')patch()},true);
  const mo=new MutationObserver(()=>requestAnimationFrame(patch));
  mo.observe(document.documentElement,{childList:true,subtree:true});
  [0,100,300,700,1500,3000].forEach(ms=>setTimeout(patch,ms));
})();
