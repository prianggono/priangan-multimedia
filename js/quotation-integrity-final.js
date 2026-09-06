/* Priangan Multimedia — quotation integrity FINAL.
 * This is a read/repair layer only. It does not replace the quotation renderer,
 * save engine, price editor, history, invoice or finance modules.
 * Responsibilities: keep saved discount coherent on Edit and keep the internal
 * margin indicator visible/accurate after quotation DOM rerenders.
 */
(function(){
'use strict';
if(window.__PM_QUOTATION_INTEGRITY_FINAL)return;
window.__PM_QUOTATION_INTEGRITY_FINAL=true;
const S=v=>String(v??'').trim();
const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0};
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
const list=name=>{try{const w=window[name];if(Array.isArray(w))return w;const v=eval(name);return Array.isArray(v)?v:[]}catch(_){return[]}};
const items=()=>list('items');
const masters=()=>list('masters');
const days=(a,b)=>{if(!a||!b)return 1;const d=Math.round((new Date(S(b)+'T00:00:00')-new Date(S(a)+'T00:00:00'))/86400000);return d>=0?d+1:1};
function masterFor(i){const ms=masters(),id=i?.master_id??i?.masterId??i?.id_master??i?.master_harga_id;if(id!=null){const x=ms.find(m=>String(m.id)===String(id));if(x)return x}return ms.find(m=>S(m.kode)===S(i?.kode))||ms.find(m=>S(m.item).toLowerCase()===S(i?.item).toLowerCase())||null}
function typeOf(i){const m=masterFor(i),sat=S(m?.satuan).toLowerCase().replace(/\s+/g,'');if(['unit','units','pcs','pc','buah','set'].includes(sat))return'qty';if(['m2','m²','meter2','meterpersegi','luas'].includes(sat))return'luas';const t=(S(i?.item)+' '+S(m?.kategori)+' '+S(i?.kode)).toLowerCase();if(/rigging|rig/.test(t))return'rigging';if(/level/.test(t))return'level';if(/led|videotron/.test(t))return'luas';return S(i?.tipe||i?.tipe_perhitungan)||'qty'}
function subtotal(i){const p=N(i?.harga??i?.harga_jual),d=days(i?.mulai??i?.tanggal_mulai,i?.selesai??i?.tanggal_selesai),t=typeOf(i),q=Math.max(1,N(i?.qty??i?.jumlah)||1),w=N(i?.lebar),h=N(i?.tinggi),l=N(i?.panjang);if(t==='luas')return w*h*p*d;if(t==='rigging')return((l*2)+(h*2))*p*d;if(t==='level'){const led=items().find(x=>x!==i&&/led|videotron/i.test(S(x.item)+' '+S(x.kode)));return(led?N(led.lebar):w)*p*d}return q*p*d}
function base(){return items().filter(i=>i&&S(i.kode)&&S(i.item)).reduce((s,i)=>s+subtotal(i),0)}
function repairDiscount(){
 const p=document.querySelector('#pmDiscPct'),r=document.querySelector('#pmDisc'),g=document.querySelector('#pmGrand'),t=document.querySelector('#total');
 if(!p||!r||document.activeElement===p)return;
 const b=base();if(!b)return;
 const rp=Math.max(0,Math.min(b,N(r.value)));
 if(rp<=0)return;
 const raw=S(p.value);if(/^\d{1,3}$/.test(raw)&&Number(raw)>0)return;
 const pct=Math.max(0,Math.min(100,Math.round(rp/b*100))),d=Math.round(b*pct/100),net=Math.max(0,b-d);
 p.value=String(pct);r.value=M(d);if(g)g.textContent=M(net);if(t)t.textContent=M(net);
 window.__PM_DISC_MODE='pct';window.__pmDiscountBase=b;window.__pmDiscountValue=d;window.__pmDiscountPct=pct;window.__pmNetTotal=net;
}
function margin(){
 const total=document.querySelector('#total');if(!total)return;
 const host=total.closest('.card');if(!host)return;
 let box=document.querySelector('#pmInternalMargin');
 if(!box){box=document.createElement('section');box.id='pmInternalMargin';box.className='no-print pm-internal-margin';host.insertAdjacentElement('afterend',box)}
 const rows=items().filter(i=>i&&S(i.kode)&&S(i.item));
 if(!rows.length){box.innerHTML='<div class="pm-margin-head"><div><strong>INDIKATOR MARGIN INTERNAL</strong><small>Hanya untuk internal • tidak masuk surat / PDF customer</small></div><span class="pm-margin-badge warn">DATA BELUM ADA</span></div><div class="pm-margin-state warn">Tambahkan item untuk menghitung margin.</div>';return}
 const mapped=rows.map(i=>({i,m:masterFor(i)}));
 mapped.forEach(x=>{if(x.m&&N(x.i.harga_modal)<=0)x.i.harga_modal=N(x.m.harga_modal);if(x.m?.id!=null&&!x.i.master_id)x.i.master_id=x.m.id});
 const missing=mapped.filter(x=>N(x.i.harga_modal)<=0&&N(x.m?.harga_modal)<=0);
 const cost=mapped.reduce((sum,x)=>{const u=N(x.i.harga_modal??x.m?.harga_modal),d=days(x.i.mulai??x.i.tanggal_mulai,x.i.selesai??x.i.tanggal_selesai),q=Math.max(1,N(x.i.qty??x.i.jumlah)||1),w=N(x.i.lebar),h=N(x.i.tinggi),l=N(x.i.panjang),t=typeOf(x.i);if(t==='luas')return sum+w*h*u*d;if(t==='rigging')return sum+((l*2)+(h*2))*u*d;if(t==='level'){const led=rows.find(y=>y!==x.i&&/led|videotron/i.test(S(y.item)+' '+S(y.kode)));return sum+(led?N(led.lebar):w)*u*d}return sum+q*u*d},0);
 const b=base(),rp=Math.max(0,Math.min(b,N(document.querySelector('#pmDisc')?.value))),revenue=Math.max(0,b-rp),profit=revenue-cost,mp=revenue?profit/revenue*100:0,ready=!missing.length,pass=ready&&mp>=20,tone=!ready?'warn':pass?'good':'bad';
 box.innerHTML='<div class="pm-margin-head"><div><strong>INDIKATOR MARGIN INTERNAL</strong><small>Hanya untuk internal • tidak masuk surat / PDF customer</small></div><span class="pm-margin-badge '+tone+'">'+(ready?mp.toFixed(2)+'%':'DATA MODAL BELUM LENGKAP')+'</span></div><div class="pm-margin-grid"><div><span>Total Modal</span><b>'+M(cost)+'</b></div><div><span>Laba Kotor</span><b>'+M(profit)+'</b></div><div><span>Margin</span><b class="'+tone+'">'+(ready?mp.toFixed(2)+'%':'—')+'</b></div><div><span>Batas Internal</span><b>≥ 20%</b></div></div><div class="pm-margin-state '+tone+'">'+(!ready?missing.map(x=>S(x.i.item||x.i.kode)).join(', ')+' belum memiliki harga modal di Master Harga.':pass?'✓ Margin memenuhi batas internal minimum 20%.':'⚠ Margin di bawah batas internal minimum 20%.')+'</div>';
}
let timer=0;function refresh(){clearTimeout(timer);timer=setTimeout(()=>{if(document.querySelector('#items')){repairDiscount();margin()}},80)}
document.addEventListener('input',e=>{if(e.target?.id==='pmDiscPct'||e.target?.id==='pmDisc'||e.target?.closest?.('#items'))refresh()},true);
document.addEventListener('change',e=>{if(e.target?.closest?.('#items'))refresh()},true);
document.addEventListener('click',e=>{if(e.target?.closest?.('#items')||e.target?.closest?.('[data-p="quotation"]'))refresh()},true);
const observer=new MutationObserver(()=>refresh());observer.observe(document.body,{childList:true,subtree:true});
[0,150,400,800,1500,2500].forEach(ms=>setTimeout(refresh,ms));
})();
