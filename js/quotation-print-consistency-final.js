/* Priangan Multimedia — quotation preview / PDF consistency FINAL
 * One calculation for preview and print output.
 * Discount is normalized from the active quotation state and always rendered
 * as: subtotal - discount = grand total. No database writes.
 */
(function(){
'use strict';
if(window.__PM_QUOTATION_PRINT_CONSISTENCY_FINAL)return;
window.__PM_QUOTATION_PRINT_CONSISTENCY_FINAL=true;

const S=v=>String(v??'').trim();
const N=v=>{
  if(typeof v==='number') return Number.isFinite(v)?v:0;
  let s=S(v).replace(/[^0-9,.-]/g,'');
  if(!s)return 0;
  s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
  const n=Number(s); return Number.isFinite(n)?n:0;
};
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));

function items(){
  try{return Array.isArray(window.items)?window.items:[];}catch(_){return[]}
}
function days(a,b){
  if(!a||!b)return 1;
  const x=new Date(S(a)+'T00:00:00'),y=new Date(S(b)+'T00:00:00');
  const d=Math.round((y-x)/86400000);return d>=0?d+1:1;
}
function subtotal(i){
  const p=N(i?.harga),d=days(i?.mulai,i?.selesai),t=S(i?.tipe).toLowerCase();
  if(t==='luas')return N(i?.lebar)*N(i?.tinggi)*p*d;
  if(t==='rigging')return ((N(i?.panjang)*2)+(N(i?.tinggi)*2))*p*d;
  if(t==='level'){
    const led=items().find(x=>x!==i&&/led|videotron/i.test(S(x?.item)));
    return (led?N(led.lebar):N(i?.lebar))*p*d;
  }
  return (N(i?.qty)||1)*p*d;
}
function baseTotal(){
  const arr=items().filter(x=>x&&x.kode&&x.item);
  const sum=arr.reduce((s,i)=>s+subtotal(i),0);
  if(sum>0)return Math.round(sum);
  return Math.max(0,Math.round(N(window.__pmDiscountBase)));
}
function discountState(base){
  const pctEl=document.querySelector('#pmDiscPct'),rpEl=document.querySelector('#pmDisc');
  let pct=N(window.__pmDiscountPct),rp=N(window.__pmDiscountValue);
  const fieldPct=pctEl?N(pctEl.value):0;
  const fieldRp=rpEl?N(rpEl.value):0;
  if(fieldPct>0&&fieldPct<=100) pct=fieldPct;
  if(fieldRp>0) rp=fieldRp;
  if(!Number.isFinite(pct)||pct<0)pct=0;
  if(!Number.isFinite(rp)||rp<0)rp=0;
  if(pct>0){rp=Math.round(base*pct/100);}
  else if(rp>0){pct=base?rp/base*100:0;}
  rp=Math.max(0,Math.min(base,Math.round(rp)));
  pct=base?rp/base*100:0;
  return {base,rp,pct,total:Math.max(0,base-rp)};
}
function render(){
  const area=document.querySelector('#pmPrintArea');if(!area)return;
  const base=baseTotal(),d=discountState(base);
  const table=area.querySelector('.pm-items');if(!table)return;
  const tbody=table.querySelector('tbody');if(!tbody)return;
  tbody.querySelector('.pm-discount-row')?.remove();
  const grand=tbody.querySelector('.pm-total');if(!grand)return;
  const tr=document.createElement('tr');tr.className='pm-discount-row';
  const pctText=d.rp>0?` (${d.pct.toFixed(2)}%)`:'';
  tr.innerHTML=`<td colspan="5" class="right">DISKON${pctText}</td><td class="right">- ${M(d.rp)}</td>`;
  tbody.insertBefore(tr,grand);
  const cells=grand.querySelectorAll('td');
  if(cells.length)cells[cells.length-1].textContent=M(d.total);
  const label=grand.querySelector('td');if(label)label.textContent='GRAND TOTAL';
  window.__pmDiscountBase=d.base;window.__pmDiscountValue=d.rp;window.__pmDiscountPct=d.pct;window.__pmNetTotal=d.total;
  const p=document.querySelector('#pmDiscPct'),r=document.querySelector('#pmDisc');
  if(p&&document.activeElement!==p)p.value=d.rp?String(Number(d.pct.toFixed(2))):'0';
  if(r&&document.activeElement!==r)r.value=M(d.rp);
}

const oldPrint=window.printQuote;
if(typeof oldPrint==='function'&&!oldPrint.__pmConsistencyWrapped){
  const wrapped=async function(){
    const result=await oldPrint.apply(this,arguments);
    render();
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    render();
    return result;
  };
  wrapped.__pmConsistencyWrapped=true;
  window.printQuote=wrapped;
}
const oldExecute=window.executePrintPreview;
if(typeof oldExecute==='function'&&!oldExecute.__pmConsistencyWrapped){
  const wrappedExecute=async function(){
    render();
    await new Promise(r=>requestAnimationFrame(r));
    return oldExecute.apply(this,arguments);
  };
  wrappedExecute.__pmConsistencyWrapped=true;
  window.executePrintPreview=wrappedExecute;
}
window.pmRenderQuotationConsistency=render;
})();
