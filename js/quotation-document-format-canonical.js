/* Priangan Multimedia — Customer document format canonical
 * Single presentation authority for quotation/invoice customer-facing names.
 * Uses user-entered LED Level height; does not change pricing or saved data.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_DOCUMENT_FORMAT_CANONICAL__)return;
  window.__PM_QUOTATION_DOCUMENT_FORMAT_CANONICAL__=true;
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0;};
  const M=v=>typeof window.money==='function'?window.money(v):new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const items=()=>Array.isArray(window.items)?window.items:[];
  const levelMaster=item=>{const id=item?.level_master_harga_id;if(id==null)return null;return masters().find(m=>String(m.id)===String(id))||null;};
  function heightText(v){const n=N(v);return n>0?`${n.toLocaleString('id-ID',{maximumFractionDigits:2})} m`:'';}
  function nameFor(item){const base=S(item?.item||item?.nama_item||'-');if(!item?.level_enabled)return base;const h=heightText(item.level_tinggi);return h?`${base} + Level ${h}`:`${base} + Level`;}
  function period(start,end,short){
    const a=S(start).slice(0,10),b=S(end||start).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(a))return S(start)||'-';
    const [ay,am,ad]=a.split('-').map(Number),[by,bm,bd]=b.split('-').map(Number);const mons=short?['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']:['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    if(ay===by&&am===bm&&ad===bd)return `${ad} ${mons[am-1]} ${ay}`;
    if(ay===by&&am===bm)return `${ad}-${bd} ${mons[am-1]} ${ay}`;
    if(ay===by)return `${ad} ${mons[am-1]}-${bd} ${mons[bm-1]} ${ay}`;
    return `${ad} ${mons[am-1]} ${ay}-${bd} ${mons[bm-1]} ${by}`;
  }
  function patchCards(){document.querySelectorAll('#items > .item').forEach(card=>{const item=items().find(x=>String(x.id)===String(card.dataset.itemId));if(!item)return;const n=nameFor(item);const a=card.querySelector('.pm-item-display-name');const b=card.querySelector('.pm-item-summary strong');if(a)a.textContent=n;if(b)b.textContent=n;});}
  function patchPrint(area){if(!area)return;const rows=[...area.querySelectorAll('.pm-items tbody tr')].filter(r=>!r.classList.contains('pm-inv-sync-total'));const list=items().filter(x=>S(x.kode)&&S(x.item));rows.forEach((row,i)=>{const item=list[i];if(!item)return;const n=nameFor(item),strong=row.querySelector('td:nth-child(2) strong');if(strong)strong.textContent=n;const q=row.querySelector('td:nth-child(3)');if(q&&isLED(item))q.textContent=`${N(item.lebar)} × ${N(item.tinggi)} m² • ${Math.max(1,N(item.qty)||1)} set`;const sub=row.querySelector('td:nth-child(6)');if(sub&&typeof window.__PM_QUOTATION_UI_API?.discount==='function')sub.textContent=M(window.__PM_QUOTATION_UI_API.discount(item).net);});}
  function patchInvoice(area){if(!area)return;const rows=[...area.querySelectorAll('table.pm-inv-sync-table tbody tr.pm-inv-sync-item')];if(!rows.length)return;let ref=rows;const list=[];const quoteNumber=(S([...area.querySelectorAll('.pm-inv-box')].find(x=>/REFERENSI PENAWARAN/i.test(S(x.textContent)))?.textContent).match(/PM-\d{4}-\d+/i)||[])[0]||'';const d=window.__PM_STABLE_DB||window.db;if(!d||!quoteNumber)return;Promise.resolve(d.from('penawaran').select('id').eq('nomor_penawaran',quoteNumber).maybeSingle()).then(r=>r.error||!r.data?null:d.from('penawaran_items').select('*').eq('penawaran_id',r.data.id).order('id')).then(r=>{if(!r||r.error)return;(r.data||[]).forEach(x=>list.push(x));rows.forEach((row,i)=>{const item=list[i];if(!item)return;const n=nameFor(item),strong=row.querySelector('td:nth-child(2) strong');if(strong)strong.textContent=n;});}).catch(()=>{});}
  function refresh(){patchCards();patchPrint(document.querySelector('#pmPrintArea'));patchInvoice(document.querySelector('#pmInvoiceArea'));patchInvoice(document.querySelector('#pmInvoicePreview'));}
  document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b)return;if(/Preview\s*\/\s*Cetak A4/i.test(S(b.textContent))){refresh();setTimeout(refresh,0);}},true);
  document.addEventListener('change',e=>{if(e.target?.closest?.('#items'))requestAnimationFrame(refresh);},true);
  document.addEventListener('input',e=>{if(e.target?.closest?.('#items'))requestAnimationFrame(refresh);},true);
  const content=document.querySelector('#content');if(content){const ob=new MutationObserver(()=>{if(document.querySelector('#pmPrintArea')||document.querySelector('#pmInvoiceArea')||document.querySelector('#pmInvoicePreview'))requestAnimationFrame(refresh);});ob.observe(content,{childList:true,subtree:true});}
  window.__PM_DOCUMENT_FORMAT_API={nameFor,heightText,period,refresh};
  refresh();
})();
