/* Priangan Multimedia — Customer Document Canonical
 * One customer-facing formatter for quotation A4 and invoice preview/print.
 * Uses saved quotation item values. Master data is only used for package contents.
 * LED = width x height x negotiated price x set x days.
 * Level = LED width x saved Level price x set. No Level day multiplier.
 */
(function(){
  'use strict';
  if(window.__PM_CUSTOMER_DOCUMENT_CANONICAL__)return;
  window.__PM_CUSTOMER_DOCUMENT_CANONICAL__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0;};
  const M=v=>typeof window.money==='function'?window.money(v):new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const findMaster=code=>masters().find(m=>S(m.kode)===S(code))||null;
  const isLED=item=>{const m=findMaster(item?.kode),t=`${S(item?.item)} ${S(item?.kode)} ${S(m?.item)} ${S(m?.kategori)}`.toLowerCase();if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(t))return false;return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(t);};
  const levelMasterName=item=>{const lm=findMaster(item?.level_master_harga_id);return S(lm?.item);};
  const nameFor=item=>{const base=S(item?.item||item?.nama_item||'-');if(!item?.level_enabled)return base;const h=N(item?.level_tinggi);return h>0?`${base} + Level ${h.toLocaleString('id-ID',{maximumFractionDigits:2})} m`:`${base} + Level`;};
  const days=(a,b)=>{if(!a||!b)return 1;const x=new Date(S(a).slice(0,10)+'T00:00:00'),y=new Date(S(b).slice(0,10)+'T00:00:00'),d=Math.round((y-x)/86400000);return d>=0?d+1:1;};
  const itemBase=item=>{
    if(isLED(item)){
      const led=N(item.lebar)*N(item.tinggi)*N(item.harga_jual??item.harga)*Math.max(1,N(item.qty)||1)*days(item.tanggal_mulai,item.tanggal_selesai);
      const level=item.level_enabled?N(item.lebar)*N(item.level_harga)*Math.max(1,N(item.qty)||1):0;
      return Math.max(0,led+level);
    }
    return Math.max(0,N(item.subtotal));
  };
  const itemNet=item=>{const base=itemBase(item),pct=Math.max(0,Math.min(100,N(item.diskon_persen))),rp=pct>0?Math.min(base,Math.round(base*pct/100)):Math.min(base,Math.max(0,N(item.diskon_nominal)));return Math.max(0,base-rp);};
  const priceHtml=item=>{const price=M(item.harga_jual??item.harga);if(!isLED(item)||!item.level_enabled||N(item.level_harga)<=0)return E(price);return `${E(price)}<div class="pm-cust-level-price">Level: ${E(M(item.level_harga))}/m</div>`;};
  const qtyText=item=>{const t=S(item.tipe_perhitungan||item.tipe).toLowerCase();if(isLED(item))return `${N(item.lebar)} × ${N(item.tinggi)} m² • ${Math.max(1,N(item.qty)||1)} set`;if(t==='rigging')return `${N(item.panjang)} × ${N(item.tinggi)} m`;if(t==='level')return `${N(item.lebar)} m`;if(t==='overtime')return `${N(item.qty)} jam`;return `${Math.max(1,N(item.qty)||1)} ${S(item.satuan||'unit')}`;};
  const period=(a,b)=>{const aa=S(a).slice(0,10),bb=S(b||a).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(aa))return S(a)||'-';const [ay,am,ad]=aa.split('-').map(Number),[by,bm,bd]=bb.split('-').map(Number),mn=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];if(ay===by&&am===bm&&ad===bd)return `${ad} ${mn[am-1]} ${ay}`;if(ay===by&&am===bm)return `${ad}-${bd} ${mn[am-1]} ${ay}`;if(ay===by)return `${ad} ${mn[am-1]}-${bd} ${mn[bm-1]} ${ay}`;return `${ad} ${mn[am-1]} ${ay}-${bd} ${mn[bm-1]} ${by}`;};
  const packageRows=raw=>S(raw).replace(/\\n/g,'\n').split(/\r?\n/).map(S).filter(Boolean).map(line=>{let m=line.match(/^(.+?)\s*[—–]\s*(.*?)\s*$/);if(!m)m=line.match(/^(.+?)\s+-\s*(.*?)\s*$/);return m?{name:S(m[1]),qty:S(m[2])||'-'}:{name:line,qty:'-'};});
  const packageHtml=item=>{const m=findMaster(item?.kode);const rows=packageRows(m?.isi_paket);if(!rows.length)return '';return `<div class="pm-cust-package"><div class="pm-cust-package-title">ISI PAKET</div><table><thead><tr><th>Komponen</th><th>Qty</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${E(r.name)}</td><td>${E(r.qty)}</td></tr>`).join('')}</tbody></table></div>`;};

  function style(){if(document.getElementById('pmCustomerDocumentCanonicalStyles'))return;const st=document.createElement('style');st.id='pmCustomerDocumentCanonicalStyles';st.textContent=`.pm-cust-level-price{font-size:6.5pt!important;color:#475569!important;margin-top:2px!important}.pm-cust-package{margin-top:5px;padding:5px 8px 2px 12px;border-left:3px solid #7ea1ff;color:#334155}.pm-cust-package-title{font-size:7px;font-weight:800;letter-spacing:.08em;color:#64748b;margin-bottom:2px}.pm-cust-package table{width:100%;border-collapse:collapse;font-size:7px}.pm-cust-package th,.pm-cust-package td{padding:1.5px 4px;border:0;text-align:left;vertical-align:top}.pm-cust-package th{font-size:6.4px;color:#64748b;text-transform:uppercase}.pm-cust-package th:last-child,.pm-cust-package td:last-child{width:48px;text-align:right;font-weight:600}`;document.head.appendChild(st);}

  function patchQuotation(area,list){if(!area||!list?.length)return;const rows=[...area.querySelectorAll('.pm-items tbody tr')].filter(r=>!r.classList.contains('pm-inv-sync-total'));list.forEach((item,i)=>{const row=rows[i];if(!row)return;const strong=row.querySelector('td:nth-child(2) strong');if(strong)strong.textContent=nameFor(item);const q=row.querySelector('td:nth-child(3)');if(q)q.textContent=qtyText(item);const p=row.querySelector('td:nth-child(5)');if(p)p.innerHTML=priceHtml(item);const sub=row.querySelector('td:nth-child(6)');if(sub)sub.textContent=M(itemNet(item));});const global=N(window.__pmDiscountValue),total=Math.max(0,list.reduce((s,x)=>s+itemNet(x),0)-global);area.querySelectorAll('tbody tr:last-child td:last-child').forEach(el=>el.textContent=M(total));}

  function invoiceTable(items,extras){const rows=items.map((item,i)=>`<tr class="pm-cust-item"><td class="center">${i+1}</td><td><strong>${E(nameFor(item))}</strong><div class="pm-cust-code">${E(item.kode)}</div>${packageHtml(item)}</td><td class="center">${E(qtyText(item))}</td><td class="center">${E(period(item.tanggal_mulai,item.tanggal_selesai))}</td><td class="right pm-cust-price">${priceHtml(item)}</td><td class="right">${M(itemNet(item))}</td></tr>`).join('');const extraHtml=(extras||[]).map(x=>`<tr class="pm-cust-item pm-cust-extra"><td class="center">+</td><td><strong>${E(x.nama_item||x.item||'Item Tambahan')}</strong><div class="pm-cust-code">${E(x.kode||'ADD-INV')}</div></td><td class="center">${E(x.tipe_perhitungan==='overtime'?`${N(x.qty)} jam`:`${Math.max(1,N(x.qty)||1)} ${S(x.satuan||'unit')}`)}</td><td class="center">${E(period(x.tanggal_mulai,x.tanggal_selesai))}</td><td class="right">${M(x.harga)}</td><td class="right">${M(x.subtotal)}</td></tr>`).join('');return `<table class="pm-cust-invoice-table"><thead><tr><th>No.</th><th>Produk / Jasa</th><th>Qty / Dimensi</th><th>Jadwal</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>${rows}${extraHtml}</tbody></table>`;}

  function patchInvoiceArea(area,data){if(!area||!data)return;const old=area.querySelector('.pm-inv-table');if(old){const q=data.quote||{},global=N(q.diskon_nominal??q.diskon),total=Math.max(0,data.items.reduce((s,x)=>s+itemNet(x),0)-global+(data.extras||[]).reduce((s,x)=>s+N(x.subtotal),0));const box=document.createElement('div');box.innerHTML=invoiceTable(data.items,data.extras);const table=box.firstElementChild;table.querySelector('thead')?.insertAdjacentHTML('afterend','');old.replaceWith(table);const tr=document.createElement('tr');tr.className='pm-cust-total';tr.innerHTML=`<td colspan="5" style="text-align:right;font-weight:800">GRAND TOTAL</td><td style="text-align:right;font-weight:800">${M(total)}</td>`;table.tBodies[0].appendChild(tr);area.dataset.pmCustomerDoc='1';}}
  async function loadInvoiceData(area){const d=window.__PM_STABLE_DB||window.db;if(!d||!area)return null;const ref=[...area.querySelectorAll('.pm-inv-box')].find(b=>/REFERENSI PENAWARAN/i.test(S(b.textContent)));const no=(S(ref?.textContent).match(/PM-[^\s•]+/i)||[])[0]||'';if(!no)return null;try{const qr=await d.from('penawaran').select('*').eq('nomor_penawaran',no).maybeSingle();if(qr.error||!qr.data)return null;const ir=await d.from('penawaran_items').select('*').eq('penawaran_id',qr.data.id).order('id',{ascending:true});if(ir.error)return null;let extras=[];try{const er=await d.from('penawaran_invoice_items').select('*').eq('penawaran_id',qr.data.id).order('id',{ascending:true});if(!er.error)extras=er.data||[]}catch(_){}return{quote:qr.data,items:ir.data||[],extras};}catch(_){return null;}}
  async function refreshInvoice(area){if(!area||area.dataset.pmCustomerDoc==='1')return;style();const data=await loadInvoiceData(area);if(data)patchInvoiceArea(area,data);}
  function refreshQuotation(){style();const list=Array.isArray(window.items)?window.items:[];if(list.length)patchQuotation(document.querySelector('#pmPrintArea'),list);}
  async function refresh(){refreshQuotation();const areas=[document.querySelector('#pmInvoiceArea'),document.querySelector('#pmInvoicePreview')];await Promise.all(areas.map(refreshInvoice));}
  function scheduleInvoiceRefresh(){setTimeout(()=>refreshInvoice(document.querySelector('#pmInvoiceArea')),0);setTimeout(()=>refreshInvoice(document.querySelector('#pmInvoicePreview')),0);setTimeout(()=>refreshInvoice(document.querySelector('#pmInvoicePreview')),250);}
  document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b)return;const text=S(b.textContent);if(/Preview|Cetak|Invoice/i.test(text))scheduleInvoiceRefresh();},true);
  window.addEventListener('beforeprint',()=>{refreshQuotation();const a=document.querySelector('#pmInvoiceArea');if(a&&!a.dataset.pmCustomerDoc)refreshInvoice(a);const p=document.querySelector('#pmInvoicePreview');if(p&&!p.dataset.pmCustomerDoc)refreshInvoice(p);},true);
  const c=document.querySelector('#content');if(c){const ob=new MutationObserver(()=>{const q=document.querySelector('#pmPrintArea');if(q)refreshQuotation();const ia=document.querySelector('#pmInvoiceArea');if(ia&&!ia.dataset.pmCustomerDoc)refreshInvoice(ia);});ob.observe(c,{childList:true,subtree:true});}
  style();refresh();
  window.__PM_CUSTOMER_DOCUMENT_API={refresh,nameFor,itemBase,itemNet,priceHtml};
})();