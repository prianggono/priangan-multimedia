/* Priangan Multimedia — FINAL quotation preview/PDF sync v2
 * The nominal discount entered by the user is authoritative when both
 * discount fields disagree. Percentage is derived from subtotal, so the
 * document can never show 5.48% with Rp860.000 when subtotal is Rp17.200.000.
 * Also forces the complete letterhead to remain printable.
 */
(function(){
'use strict';
if(window.__PM_QUOTATION_PRINT_FINAL_V2)return;
window.__PM_QUOTATION_PRINT_FINAL_V2=true;

const S=v=>String(v??'').trim();
const N=v=>{
 if(typeof v==='number')return Number.isFinite(v)?v:0;
 let s=S(v).replace(/[^0-9,.-]/g,'');
 if(!s)return 0;
 s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
 const n=Number(s);return Number.isFinite(n)?n:0;
};
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,N(v)));
function days(a,b){if(!a||!b)return 1;const x=new Date(S(a)+'T00:00:00'),y=new Date(S(b)+'T00:00:00');const d=Math.round((y-x)/86400000);return d>=0?d+1:1}
function arr(){try{return Array.isArray(window.items)?window.items:[]}catch(_){return[]}}
function sub(i){const p=N(i?.harga),d=days(i?.mulai,i?.selesai),t=S(i?.tipe).toLowerCase();if(t==='luas')return N(i?.lebar)*N(i?.tinggi)*p*d;if(t==='rigging')return((N(i?.panjang)*2)+(N(i?.tinggi)*2))*p*d;if(t==='level'){const led=arr().find(x=>x!==i&&/led|videotron/i.test(S(x?.item)));return(led?N(led.lebar):N(i?.lebar))*p*d}return(N(i?.qty)||1)*p*d}
function subtotal(){const a=arr().filter(x=>x&&x.kode&&x.item);return Math.round(a.reduce((s,i)=>s+sub(i),0))}
function getState(){
 const base=subtotal();
 const rpEl=document.querySelector('#pmDisc'),pctEl=document.querySelector('#pmDiscPct');
 const rp=N(rpEl?.value),pct=N(pctEl?.value);
 // If a nominal discount exists, it is the authoritative value. This avoids
 // stale/derived percentage values producing a different grand total.
 let discount=rp>0?Math.min(base,Math.round(rp)):Math.min(base,Math.round(base*Math.max(0,Math.min(100,pct))/100));
 let percent=base?discount/base*100:0;
 return {base,discount,percent,total:Math.max(0,base-discount)};
}
function syncForm(s){
 const p=document.querySelector('#pmDiscPct'),r=document.querySelector('#pmDisc');
 if(p&&document.activeElement!==p)p.value=s.discount?String(Number(s.percent.toFixed(2))):'0';
 if(r&&document.activeElement!==r)r.value=M(s.discount);
 window.__pmDiscountBase=s.base;window.__pmDiscountValue=s.discount;window.__pmDiscountPct=s.percent;window.__pmNetTotal=s.total;
 const g=document.querySelector('#pmGrand'),t=document.querySelector('#total');
 if(g)g.textContent=M(s.total);if(t)t.textContent=M(s.total);
}
function syncPreview(){
 const area=document.querySelector('#pmPrintArea');if(!area)return;
 const s=getState();syncForm(s);
 const tbody=area.querySelector('.pm-items tbody');if(!tbody)return;
 let grand=tbody.querySelector('.pm-total');if(!grand)return;
 tbody.querySelector('.pm-discount-row')?.remove();
 const tr=document.createElement('tr');tr.className='pm-discount-row';
 tr.innerHTML=`<td colspan="5" class="right">DISKON${s.discount?` (${s.percent.toFixed(2)}%)`:''}</td><td class="right">- ${M(s.discount)}</td>`;
 tbody.insertBefore(tr,grand);
 const cells=grand.querySelectorAll('td');if(cells.length)cells[cells.length-1].textContent=M(s.total);
 const label=grand.querySelector('td');if(label)label.textContent='GRAND TOTAL';
}
function forcePrintCss(){
 const id='pmFinalPrintCssV2';if(document.getElementById(id))return;
 const st=document.createElement('style');st.id=id;st.textContent=`
@media print{
 html,body{margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
 #pmPrintPreview{display:block!important;position:absolute!important;inset:0!important;width:100%!important;height:auto!important;background:#fff!important;overflow:visible!important}
 #pmPrintPreview .pm-print-toolbar{display:none!important}
 #pmPrintPreview .pm-print-scroll{display:block!important;overflow:visible!important;padding:0!important}
 #pmPrintPreview .pm-a4{display:block!important;visibility:visible!important;width:210mm!important;min-height:297mm!important;margin:0!important;padding:13mm 14mm 11mm!important;box-shadow:none!important;overflow:visible!important}
 #pmPrintPreview .pm-a4>*{visibility:visible!important}
 #pmPrintPreview .pm-letterhead{display:flex!important;visibility:visible!important;min-height:118px!important;height:auto!important;opacity:1!important;position:relative!important}
 #pmPrintPreview .pm-letterhead>*{visibility:visible!important;opacity:1!important}
 #pmPrintPreview .pm-logo-wrap{display:flex!important;visibility:visible!important;background:transparent!important;border:0!important}
 #pmPrintPreview .pm-letterhead .logo{display:block!important;visibility:visible!important;opacity:1!important}
 #pmPrintPreview .pm-brand,#pmPrintPreview .pm-brand-name,#pmPrintPreview .pm-brand-sub,#pmPrintPreview .pm-brand p,#pmPrintPreview .pm-doc-tag,#pmPrintPreview .pm-doc-tag span,#pmPrintPreview .pm-doc-tag strong{visibility:visible!important;opacity:1!important}
 #pmPrintPreview .pm-items .pm-discount-row{display:table-row!important;visibility:visible!important}
}
`;
 document.head.appendChild(st);
}
function boot(){forcePrintCss();syncPreview()}
window.pmFinalSyncQuotation=syncPreview;
window.addEventListener('beforeprint',()=>{forcePrintCss();syncPreview()},true);
document.addEventListener('input',e=>{if(e.target?.id==='pmDisc'||e.target?.id==='pmDiscPct')setTimeout(syncPreview,0)},true);
const mo=new MutationObserver(()=>{if(document.getElementById('pmPrintPreview')){forcePrintCss();syncPreview()}});
mo.observe(document.documentElement,{childList:true,subtree:true});
[0,100,300,700,1200,2000].forEach(ms=>setTimeout(boot,ms));
})();
