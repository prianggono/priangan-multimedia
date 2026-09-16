/* Priangan Multimedia — Customer Document Canonical
 * Single authority for customer-facing quotation A4 and invoice preview.
 * Reads the saved/live quotation item values; does not change Supabase data.
 * LED = width x height x negotiated price x set x days.
 * Optional Level = LED width x Level price x set. No Level day multiplier.
 * Level height is displayed in centimeters.
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
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const items=()=>Array.isArray(window.items)?window.items:[];
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const db=()=>window.__PM_STABLE_DB||window.db||null;
  const isLED=item=>{const t=`${S(item?.item)} ${S(item?.kode)} ${S(item?.kategori)}`.toLowerCase();if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(t))return false;return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(t);};
  const days=(a,b)=>{if(!a||!b)return 1;const x=new Date(S(a).slice(0,10)+'T00:00:00'),y=new Date(S(b).slice(0,10)+'T00:00:00'),d=Math.round((y-x)/86400000);return d>=0?d+1:1;};
  const cm=v=>{const n=N(v);if(n<=0)return 0;return Math.round(n<10?n*100:n);};
  const itemDiscount=item=>{const led=isLED(item);let base;if(led){const price=N(item.harga_jual??item.harga),qty=Math.max(1,N(item.qty)||1);base=N(item.lebar)*N(item.tinggi)*price*qty*days(item.mulai??item.tanggal_mulai,item.selesai??item.tanggal_selesai)+(item.level_enabled?N(item.lebar)*N(item.level_harga)*qty:0);}else base=Math.max(0,N(item.subtotal));const pct=Math.max(0,Math.min(100,N(item.diskon_persen))),rp=pct>0?Math.min(base,Math.round(base*pct/100)):Math.min(base,Math.max(0,N(item.diskon_nominal)));return Math.max(0,base-rp);};
  const levelSuffix=item=>item?.level_enabled&&cm(item.level_tinggi)>0?` + Level ${cm(item.level_tinggi)} cm`:'';
  const displayName=item=>`${S(item?.item||item?.nama_item||'-').replace(/\s*\+\s*Level.*$/i,'')}${levelSuffix(item)}`;
  const qtyText=item=>{const t=S(item?.tipe_perhitungan||item?.tipe).toLowerCase();if(isLED(item))return `${N(item.lebar)} × ${N(item.tinggi)} m²${Math.max(1,N(item.qty)||1)>1?` • ${Math.max(1,N(item.qty)||1)} set`:''}`;if(t==='rigging')return `${N(item.panjang)} × ${N(item.tinggi)} m`;if(t==='level')return `${N(item.lebar)} m`;if(t==='overtime')return `${N(item.qty)} jam`;return `${Math.max(1,N(item.qty)||1)} ${S(item.satuan||'unit')}`;};
  const period=(a,b)=>{const aa=S(a).slice(0,10),bb=S(b||a).slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(aa))return S(a)||'-';const [ay,am,ad]=aa.split('-').map(Number),[by,bm,bd]=bb.split('-').map(Number),mn=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];if(ay===by&&am===bm&&ad===bd)return `${ad} ${mn[am-1]} ${ay}`;if(ay===by&&am===bm)return `${ad}-${bd} ${mn[am-1]} ${ay}`;if(ay===by)return `${ad} ${mn[am-1]}-${bd} ${mn[bm-1]} ${ay}`;return `${ad} ${mn[am-1]} ${ay}-${bd} ${mn[bm-1]} ${by}`;};
  const packageRows=raw=>S(raw).replace(/\\n/g,'\n').split(/\r?\n/).map(S).filter(Boolean).map(line=>{let m=line.match(/^(.+?)\s*[—–]\s*(.*?)\s*$/);if(!m)m=line.match(/^(.+?)\s+-\s*(.*?)\s*$/);return m?{name:S(m[1]),qty:S(m[2])||'-'}:{name:line,qty:'-'};});
  const packageHtml=item=>{const m=masters().find(x=>S(x.kode)===S(item?.kode)),rows=packageRows(m?.isi_paket);if(!rows.length)return '';return `<div class="pm-cust-package"><div class="pm-cust-package-title">ISI PAKET</div><table><thead><tr><th>Komponen</th><th>Qty</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${E(r.name)}</td><td>${E(r.qty)}</td></tr>`).join('')}</tbody></table></div>`;};
  const priceHtml=item=>{const p=M(item?.harga_jual??item?.harga);return item?.level_enabled&&N(item.level_harga)>0?`${E(p)}<div class="pm-cust-level-price">Level: ${E(M(item.level_harga))}/m</div>`:E(p);};

  function style(){if(document.getElementById('pmCustomerDocumentStyles'))return;const st=document.createElement('style');st.id='pmCustomerDocumentStyles';st.textContent='.pm-cust-level-price{font-size:6.5pt!important;color:#475569!important;margin-top:2px!important;line-height:1.1!important}.pm-cust-package{margin-top:5px;padding:5px 8px 2px 12px;border-left:3px solid #7ea1ff;color:#334155}.pm-cust-package-title{font-size:7px;font-weight:800;letter-spacing:.08em;color:#64748b;margin-bottom:2px}.pm-cust-package table{width:100%;border-collapse:collapse;font-size:7px}.pm-cust-package th,.pm-cust-package td{padding:1.5px 4px;border:0;text-align:left;vertical-align:top}.pm-cust-package th{font-size:6.4px;color:#64748b;text-transform:uppercase}.pm-cust-package th:last-child,.pm-cust-package td:last-child{width:48px;text-align:right;font-weight:600}.pm-cust-total td{background:#edf4ff!important;font-weight:800!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}';document.head.appendChild(st);}

  async function quotationRowsFromDb(root){
    const d=db();if(!d||!root)return null;
    const txt=S(root.textContent),no=(txt.match(/PM-\d{4}-\d+/i)||[])[0];
    if(!no)return null;
    try{
      const qr=await d.from('penawaran').select('id,nomor_penawaran,diskon,diskon_nominal').eq('nomor_penawaran',no).maybeSingle();
      if(qr.error||!qr.data)return null;
      const ir=await d.from('penawaran_items').select('*').eq('penawaran_id',qr.data.id).order('id',{ascending:true});
      if(ir.error||!Array.isArray(ir.data)||!ir.data.length)return null;
      return{quote:qr.data,items:ir.data};
    }catch(_){return null;}
  }

  async function quotationPatch(){
    const root=document.querySelector('#pmPrintArea');if(!root)return;
    let list=items().filter(x=>x&&S(x.kode)&&S(x.item));
    let saved=null;
    try{saved=await quotationRowsFromDb(root);}catch(_){saved=null;}
    if(saved?.items?.length)list=saved.items;
    if(!list.length)return;
    const rows=[...root.querySelectorAll('.pm-items tbody tr')].filter(r=>!r.classList.contains('pm-total')&&!r.classList.contains('pm-discount-row'));
    list.forEach((item,i)=>{const row=rows[i];if(!row)return;const name=row.querySelector('td:nth-child(2) strong');if(name)name.textContent=displayName(item);const q=row.querySelector('td:nth-child(3)');if(q)q.textContent=qtyText(item);const p=row.querySelector('td:nth-child(5)');if(p)p.innerHTML=priceHtml(item);const sub=row.querySelector('td:nth-child(6)');if(sub)sub.textContent=M(itemDiscount(item));if(packageHtml(item)){const host=row.querySelector('td:nth-child(2)');if(host&&!host.querySelector('.pm-cust-package'))host.insertAdjacentHTML('beforeend',packageHtml(item));}});
    const total=root.querySelector('.pm-total td:last-child');
    if(total){const discountBase=saved?N(saved.quote.diskon??saved.quote.diskon_nominal):N(window.__pmDiscountValue);const value=list.reduce((s,x)=>s+itemDiscount(x),0)-Math.max(0,discountBase);total.textContent=M(Math.max(0,value));}
  }

  async function invoiceRowsFromDb(area){const d=db();if(!d||!area)return null;const txt=S(area.textContent),no=(txt.match(/PM-\d{4}-\d+/i)||[])[0];if(!no)return null;try{const qr=await d.from('penawaran').select('*').eq('nomor_penawaran',no).maybeSingle();if(qr.error||!qr.data)return null;const ir=await d.from('penawaran_items').select('*').eq('penawaran_id',qr.data.id).order('id',{ascending:true});if(ir.error)return null;let extras=[];try{const er=await d.from('penawaran_invoice_items').select('*').eq('penawaran_id',qr.data.id).order('id',{ascending:true});if(!er.error)extras=er.data||[]}catch(_){}return{quote:qr.data,items:ir.data||[],extras};}catch(_){return null;}}

  async function invoicePatch(){const area=document.querySelector('#pmInvoicePreview');if(!area)return;const data=await invoiceRowsFromDb(area);if(!data)return;const table=area.querySelector('.pm-inv-table');if(!table)return;const body=table.tBodies[0];if(!body)return;const baseRows=[...body.querySelectorAll('tr')].filter(r=>!r.classList.contains('pm-inv-total')&&!r.classList.contains('pm-inv-extra-total')&&!r.classList.contains('pm-cust-extra'));data.items.forEach((item,i)=>{const row=baseRows[i];if(!row)return;const cells=row.cells;if(cells.length<5)return;const name=cells[1].querySelector('strong');if(name)name.textContent=displayName(item);const code=cells[1].querySelector('.code');if(code)code.textContent=S(item.kode);if(packageHtml(item)&&!cells[1].querySelector('.pm-cust-package'))cells[1].insertAdjacentHTML('beforeend',packageHtml(item));cells[2].textContent=qtyText(item);cells[3].innerHTML=priceHtml(item);cells[4].textContent=M(itemDiscount(item));});const extras=(data.extras||[]).reduce((s,x)=>s+N(x.subtotal),0);const total=data.items.reduce((s,x)=>s+itemDiscount(x),0)+extras;const totalRow=body.querySelector('.pm-inv-total');if(totalRow?.cells?.length)totalRow.cells[totalRow.cells.length-1].textContent=M(total);const extraRow=body.querySelector('.pm-inv-extra-total');if(extraRow&&extras===0)extraRow.remove();}

  function runQuotation(){if(document.querySelector('#pmPrintArea'))quotationPatch();}
  function runInvoice(){invoicePatch();}
  function scheduleDocs(){setTimeout(runQuotation,0);setTimeout(runQuotation,80);setTimeout(runQuotation,180);setTimeout(runInvoice,30);setTimeout(runInvoice,120);setTimeout(runInvoice,240);}

  document.addEventListener('click',e=>{const b=e.target.closest?.('button');if(!b)return;const t=S(b.textContent);if(/Preview Surat|Surat Penawaran|Cetak.*PDF|Preview \/ Cetak A4/i.test(t))scheduleDocs();if(/Preview Invoice|Cetak.*Invoice/i.test(t))scheduleDocs();},true);
  window.addEventListener('beforeprint',()=>{runQuotation();runInvoice();},true);
  style();
})();