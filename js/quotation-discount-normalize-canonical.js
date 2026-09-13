/* Priangan Multimedia — quotation discount canonical lock v9.
 * FINAL RULE: discount percentage is an integer 0–100.
 * Prevents legacy/runtime formatters from restoring decimal display such as 1.00.
 */
(function(){
'use strict';
if(window.__PM_QUOTATION_DISCOUNT_NORMALIZE_CANONICAL_V9)return;
window.__PM_QUOTATION_DISCOUNT_NORMALIZE_CANONICAL_V9=true;

const S=v=>String(v??'').trim();
const N=v=>{
  if(typeof v==='number')return Number.isFinite(v)?v:0;
  const s=S(v).replace(/[^0-9,.-]/g,'');
  if(!s)return 0;
  const normalized=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
  const n=Number(normalized);
  return Number.isFinite(n)?n:0;
};
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v)||0)));

function integerPct(value){
  const s=S(value);
  if(!s)return 0;
  const match=s.replace(/,/g,'.').match(/^\d+(?:\.\d+)?/);
  const n=match?Number(match[0]):N(s);
  return Math.max(0,Math.min(100,Math.trunc(Number.isFinite(n)?n:0)));
}

function normalizeInput(p,keepEmpty=false){
  if(!p)return 0;
  p.type='text';
  p.inputMode='numeric';
  p.autocomplete='off';
  p.removeAttribute('step');
  p.removeAttribute('min');
  p.removeAttribute('max');
  p.maxLength=3;
  p.setAttribute('pattern','[0-9]{0,3}');
  const raw=S(p.value);
  if(raw===''&&keepEmpty)return 0;
  const pct=integerPct(raw);
  const next=String(pct);
  if(p.value!==next)p.value=next;
  return pct;
}

function normalizeLabels(){
  document.querySelectorAll('.pm-discount-row td,.pm-discount-label').forEach(el=>{
    const m=S(el.textContent).match(/^(DISKON\s*\()\s*(\d+(?:[.,]\d+)?)\s*(%\))$/i);
    if(!m)return;
    const pct=integerPct(m[2]);
    const next=m[1]+pct+m[3];
    if(el.textContent!==next)el.textContent=next;
  });
}

function baseValue(){
  return Math.max(0,N(window.__pmDiscountBase)||0);
}

function apply(p){
  const base=baseValue();
  const pct=normalizeInput(p,true);
  const discount=Math.round(base*pct/100);
  const net=Math.max(0,base-discount);
  window.__PM_DISC_MODE='pct';
  window.__pmDiscountPct=pct;
  window.__pmDiscountValue=discount;
  window.__pmNetTotal=net;
  const r=document.querySelector('#pmDisc');
  const t=document.querySelector('#total');
  const g=document.querySelector('#pmGrand');
  if(r)r.value=M(discount);
  if(t)t.textContent=M(net);
  if(g)g.textContent=M(net);
  normalizeLabels();
}

function setup(p){
  if(!p)return;
  normalizeInput(p,true);
  if(p.dataset.pmIntegerDiscountV9==='1')return;
  p.dataset.pmIntegerDiscountV9='1';
}

function run(){
  const p=document.querySelector('#pmDiscPct');
  if(p)setup(p);
  normalizeLabels();
}

run();
[50,150,300,600,1200,2000,3500].forEach(ms=>setTimeout(run,ms));

document.addEventListener('keydown',e=>{
  const p=e.target?.id==='pmDiscPct'?e.target:null;
  if(!p)return;
  const allowed=['Backspace','Delete','ArrowLeft','ArrowRight','Home','End','Tab'];
  if(allowed.includes(e.key)||e.ctrlKey||e.metaKey)return;
  if(!/^[0-9]$/.test(e.key)){
    e.preventDefault();
    e.stopImmediatePropagation();
  }
},true);

document.addEventListener('input',e=>{
  const p=e.target?.id==='pmDiscPct'?e.target:null;
  if(!p)return;
  e.stopImmediatePropagation();
  normalizeInput(p,true);
  apply(p);
},true);

document.addEventListener('change',e=>{
  const p=e.target?.id==='pmDiscPct'?e.target:null;
  if(!p)return;
  e.stopImmediatePropagation();
  apply(p);
},true);

document.addEventListener('blur',e=>{
  const p=e.target?.id==='pmDiscPct'?e.target:null;
  if(!p)return;
  e.stopImmediatePropagation();
  apply(p);
},true);

document.addEventListener('click',e=>{
  const nav=e.target.closest?.('[data-p="quotation"]');
  const preview=e.target.closest?.('button');
  if(nav || (preview&&/Preview\s*\/\s*Cetak A4/i.test(S(preview.textContent)))){
    setTimeout(run,60);
  }
},true);

const mo=new MutationObserver(()=>run());
if(document.body)mo.observe(document.body,{childList:true,subtree:true});

/* Last-resort protection against legacy code assigning "1.00" directly. */
setInterval(()=>{
  const p=document.querySelector('#pmDiscPct');
  if(!p)return;
  const before=S(p.value);
  const pct=integerPct(before);
  const next=String(pct);
  if(before!==next){
    const active=document.activeElement===p;
    if(!active){
      p.value=next;
      apply(p);
    }
  }
  normalizeLabels();
},200);

})();
