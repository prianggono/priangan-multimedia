/* Priangan Multimedia — Customer Document Canonical
 * Single authority for customer-facing quotation A4 and invoice preview.
 * Saved quotation documents prefer persisted penawaran_items from Supabase.
 * Draft quotation documents use the live window.items state.
 */
(function(){
  'use strict';
  if(window.__PM_CUSTOMER_DOCUMENT_CANONICAL__)return;
  window.__PM_CUSTOMER_DOCUMENT_CANONICAL__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    let s=S(v).replace(/[^0-9,.-]/g,'');
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);return Number.isFinite(n)?n:0;
  };
  const M=v=>typeof window.money==='function'?window.money(v):new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const E=v=>S(v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const items=()=>Array.isArray(window.items)?window.items:[];
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const db=()=>window.__PM_STABLE_DB||window.db||null;

  const isLED=item=>{
    const t=`${S(item?.item)} ${S(item?.kode)} ${S(item?.kategori)}`.toLowerCase();
    if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(t))return false;
    return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(t);
  };
  const days=(a,b)=>{if(!a||!b)return 1;const x=new Date(S(a).slice(0,10)+'T00:00:00'),y=new Date(S(b).slice(0,10)+'T00:00:00');const d=Math.round((y-x)/86400000);return d>=0?d+1:1;};
  const cm=v=>{const n=N(v);if(n<=0)return 0;return Math.round(n<10?n*100:n);};
  const levelSubtotal=item=>item?.level_enabled?N(item.lebar)*N(item.level_harga)*Math.max(1,N(item.qty)||1):0;
  const itemTotal=item=>{
    const price=N(item?.harga_jual??item?.harga),qty=Math.max(1,N(item?.qty)||1);
    let base;
    if(isLED(item))base=N(item.lebar)*N(item.tinggi)*price*qty*days(item.mulai??item.tanggal_mulai,item.selesai??item.tanggal_selesai)+levelSubtotal(item);
    else base=Math.max(0,N(item.subtotal));
    const pct=Math.max(0,Math.min(100,N(item.diskon_persen)));
    const rp=pct>0?Math.min(base,Math.round(base*pct/100)):Math.min(base,Math.max(0,N(item.diskon_nominal)));
    return Math.max(0,base-rp);
  };
  const levelSuffix=item=>item?.level_enabled&&cm(item.level_tinggi)>0?` + Level ${cm(item.level_tinggi)} cm`:'';
  const displayName=item=>`${S(item?.item||item?.nama_item||'-').replace(/\s*\+\s*Level.*$/i,'')}${levelSuffix(item)}`;
  /* Level belongs in the product label/price note, NOT in Qty/Dimensi. */
  const qtyText=item=>{
    const t=S(item?.tipe_perhitungan||item?.tipe).toLowerCase();
    if(isLED(item))return `${N(item.lebar)} × ${N(item.tinggi)} m²`;
    if(t==='rigging')return `${N(item.panjang)} × ${N(item.tinggi)} m`;
    if(t==='level')return `${N(item.lebar)} m`;
    if(t==='overtime')return `${N(item.qty)} jam`;
    return `${Math.max(1,N(item.qty)||1)} ${S(item.satuan||'unit')}`;
  };
  const period=(a,b)=>{
    const aa=S(a).slice(0,10),bb=S(b||a).slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(aa))return S(a)||'-';
    const [ay,am,ad]=aa.split('-').map(Number),[by,bm,bd]=bb.split('-').map(Number),mn=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    if(ay===by&&am===bm&&ad===bd)return `${ad} ${mn[am-1]} ${ay}`;
    if(ay===by&&am===bm)return `${ad}-${bd} ${mn[am-1]} ${ay}`;
    if(ay===by)return `${ad} ${mn[am-1]}-${bd} ${mn[bm-1]} ${ay}`;
    return `${ad} ${mn[am-1]} ${ay}-${bd} ${mn[bm-1]} ${by}`;
  };
  const packageRows=raw=>S(raw).replace(/\\n/g,'\n').split(/\r?\n/).map(S).filter(Boolean).map(line=>{let m=line.match(/^(.+?)\s*[—–]\s*(.*?)\s*$/);if(!m)m=line.match(/^(.+?)\s+-\s*(.*?)\s*$/);return m?{name:S(m[1]),qty:S(m[2])||'-'}:{name:line,qty:'-'};});
  const packageHtml=item=>{const m=masters().find(x=>S(x.kode)===S(item?.kode)),rows=packageRows(m?.isi_paket);if(!rows.length)return '';return `<div class="pm-cust-package"><div class="pm-cust-package-title">ISI PAKET</div><table><thead><tr><th>Komponen</th><th>Qty</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${E(r.name)}</td><td>${E(r.qty)}</td></tr>`).join('')}</tbody></table></div>`;};
  const priceHtml=item=>{const p=M(item?.harga_jual??item?.harga);return item?.level_enabled&&N(item.level_harga)>0?`${E(p)}<div class="pm-cust-level-price">Level: ${E(M(item.level_harga))}/m</div>`:E(p);};
  function style(){if(document.getElementById('pmCustomerDocumentStyles'))return;const st=document.createElement('style');st.id='pmCustomerDocumentStyles';st.textContent='.pm-cust-level-price{font-size:6.5pt!important;color:#475569!important;margin-top:2px!important;line-height:1.1!important}.pm-cust-package{margin-top:5px;padding:5px 8px 2px 12px;border-left:3px solid #7ea1ff;color:#334155}.pm-cust-package-title{font-size:7px;font-weight:800;letter-spacing:.08em;color:#64748b;margin-bottom:2px}.pm-cust-package table{width:100%;border-collapse:collapse;font-size:7px}.pm-cust-package th,.pm-cust-package td{padding:1.5px 4px;border:0;text-align:left;vertical-align:top}.pm-cust-package th{font-size:6.4px;color:#64748b;text-transform:uppercase}.pm-cust-package th:last-child,.pm-cust-package td:last-child{width:48px;text-align:right;font-weight:600}.pm-cust-total td{background:#edf4ff!important;font-weight:800!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}';document.head.appendChild(st);}
  function normalizeSavedItem(r){return {...r,harga:N(r.harga??r.harga_jual),harga_jual:N(r.harga_jual??r.harga),qty:Math.max(1,N(r.qty??r.jumlah)||1),jumlah:Math.max(1,N(r.jumlah??r.qty)||1),lebar:N(r.lebar),tinggi:N(r.tinggi),panjang:N(r.panjang),mulai:S(r.tanggal_mulai||''),selesai:S(r.tanggal_selesai||''),tipe:S(r.tipe_perhitungan||r.tipe||''),tipe_perhitungan:S(r.tipe_perhitungan||r.tipe||''),level_enabled:!!r.level_enabled,level_master_harga_id:r.level_master_harga_id??null,level_tinggi:N(r.level_tinggi),level_harga:N(r.level_harga),level_subtotal:N(r.level_subtotal)};}
  async function savedQuotationItems(root){const d=db();if(!d)return null;let qid=Number(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID||0);try{if(!qid){const txt=S(root?.textContent),match=txt.match(/PM-\d{4}-\d+/i),no=match?.[0];if(no){const qr=await d.from('penawaran').select('id').eq('nomor_penawaran',no).maybeSingle();if(!qr.error&&qr.data)qid=Number(qr.data.id);}}if(!qid)return null;const ir=await d.from('penawaran_items').select('*').eq('penawaran_id',qid).order('id',{ascending:true});if(ir.error||!Array.isArray(ir.data)||!ir.data.length)return null;return ir.data.map(normalizeSavedItem);}catch(e){console.warn('[PM] saved quotation document load',e);return null;}}
  function quotationRoot(){return document.querySelector('#pmPrintArea')||document.querySelector('#pmPrintPreview .pm-a4');}
  function quotationTable(root){return root?.querySelector('table.pm-items')||document.querySelector('#pmPrintPreview table.pm-items');}
  function patchQuotationRows(root,list){const table=quotationTable(root);if(!table)return false;const rows=[...table.querySelectorAll('tbody tr')].filter(r=>!r.classList.contains('pm-total')&&!r.classList.contains('pm-discount-row'));list.forEach((item,i)=>{const row=rows[i];if(!row)return;const cells=row.cells;if(cells.length<6)return;const name=cells[1].querySelector('strong');if(name)name.textContent=displayName(item);cells[2].textContent=qtyText(item);cells[3].textContent=period(item.mulai??item.tanggal_mulai,item.selesai??item.tanggal_selesai);cells[4].innerHTML=priceHtml(item);cells[5].textContent=M(itemTotal(item));if(packageHtml(item)&&!cells[1].querySelector('.pm-cust-package'))cells[1].insertAdjacentHTML('beforeend',packageHtml(item));});const global=Math.max(0,N(window.__pmDiscountValue));const totalValue=Math.max(0,list.reduce((s,x)=>s+itemTotal(x),0)-global);const total=table.querySelector('.pm-total td:last-child');if(total)total.textContent=M(totalValue);return true;}
  async function quotationPatch(){const root=quotationRoot();if(!root)return false;const saved=await savedQuotationItems(root);const list=(saved&&saved.length?saved:items().filter(x=>x&&S(x.kode)&&S(x.item)));if(!list.length)return false;return patchQuotationRows(root,list);}
  async function invoiceRowsFromDb(area){const d=db();if(!d||!area)return null;const txt=S(area.textContent),no=(txt.match(/PM-\d{4}-\d+/i)||[])[0];if(!no)return null;try{const qr=await d.from('penawaran').select('*').eq('nomor_penawaran',no).maybeSingle();if(qr.error||!qr.data)return null;const ir=await d.from('penawaran_items').select('*').eq('penawaran_id',qr.data.id).order('id',{ascending:true});if(ir.error)return null;let extras=[];try{const er=await d.from('penawaran_invoice_items').select('*').eq('penawaran_id',qr.data.id).order('id',{ascending:true});if(!er.error)extras=er.data||[]}catch(_){}return{quote:qr.data,items:(ir.data||[]).map(normalizeSavedItem),extras};}catch(_){return null;}}
  async function invoicePatch(){const area=document.querySelector('#pmInvoicePreview');if(!area)return;const data=await invoiceRowsFromDb(area);if(!data)return;const table=area.querySelector('.pm-inv-table');if(!table||!table.tBodies[0])return;const body=table.tBodies[0];const rows=[...body.querySelectorAll('tr')].filter(r=>!r.classList.contains('pm-inv-total')&&!r.classList.contains('pm-inv-extra-total')&&!r.classList.contains('pm-cust-extra'));data.items.forEach((item,i)=>{const row=rows[i];if(!row)return;const cells=row.cells;if(cells.length<5)return;const name=cells[1].querySelector('strong');if(name)name.textContent=displayName(item);const code=cells[1].querySelector('.code');if(code)code.textContent=S(item.kode);if(packageHtml(item)&&!cells[1].querySelector('.pm-cust-package'))cells[1].insertAdjacentHTML('beforeend',packageHtml(item));cells[2].textContent=qtyText(item);cells[3].innerHTML=priceHtml(item);cells[4].textContent=M(itemTotal(item));});const extras=(data.extras||[]).reduce((s,x)=>s+N(x.subtotal),0),total=data.items.reduce((s,x)=>s+itemTotal(x),0)+extras;const totalRow=body.querySelector('.pm-inv-total');if(totalRow?.cells?.length)totalRow.cells[totalRow.cells.length-1].textContent=M(total);}
  function scheduleQuotation(){[0,40,100,220,450].forEach(ms=>setTimeout(()=>quotationPatch(),ms));}
  function scheduleInvoice(){[40,140,300].forEach(ms=>setTimeout(()=>invoicePatch(),ms));}
  document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b)return;const t=S(b.textContent);if(/Preview Surat|Surat Penawaran|Cetak.*PDF|Preview \/ Cetak A4/i.test(t))scheduleQuotation();if(/Preview Invoice|Cetak.*Invoice/i.test(t))scheduleInvoice();},true);
  window.addEventListener('beforeprint',()=>{quotationPatch();invoicePatch();},true);
  style();
})();