/* Priangan Multimedia — Invoice ↔ Quotation presentation sync
 * Keeps Invoice business logic intact while presenting customer-facing item
 * details in the same structure as the quotation.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_QUOTATION_FORMAT_SYNC__)return;
  window.__PM_INVOICE_QUOTATION_FORMAT_SYNC__=true;

  const S=v=>String(v??'').trim();
  const E=v=>S(v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const n=Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  };
  const M=v=>typeof window.money==='function'?window.money(v):new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const DB=()=>window.__PM_STABLE_DB||window.db||null;
  const months=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const monthsShort=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  function dateParts(v){
    const s=S(v).slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
    const [y,m,d]=s.split('-').map(Number);
    const dt=new Date(y,m-1,d);
    return Number.isNaN(dt.getTime())?null:{y,m,d};
  }
  function period(start,end,short){
    const a=dateParts(start),b=dateParts(end)||a;
    if(!a)return S(start)||'-';
    const mon=short?monthsShort:months;
    if(!b)return `${a.d} ${mon[a.m-1]} ${a.y}`;
    if(a.y===b.y&&a.m===b.m&&a.d===b.d)return `${a.d} ${mon[a.m-1]} ${a.y}`;
    if(a.y===b.y&&a.m===b.m)return `${a.d}-${b.d} ${mon[a.m-1]} ${a.y}`;
    if(a.y===b.y)return `${a.d} ${mon[a.m-1]}-${b.d} ${mon[b.m-1]} ${a.y}`;
    return `${a.d} ${mon[a.m-1]} ${a.y}-${b.d} ${mon[b.m-1]} ${b.y}`;
  }
  function itemQty(item){
    const t=S(item?.tipe_perhitungan||item?.tipe).toLowerCase();
    if(t==='luas')return `${N(item.lebar)} × ${N(item.tinggi)} m²`;
    if(t==='rigging')return `${N(item.panjang)} × ${N(item.tinggi)} m`;
    if(t==='level')return `${N(item.lebar)} m`;
    if(t==='overtime')return `${N(item.qty)} jam`;
    return `${N(item.qty)||1} ${S(item.satuan||'unit')}`;
  }
  function parsePackage(raw){
    return S(raw).replace(/\\n/g,'\n').split(/\r?\n/).map(S).filter(Boolean).map(line=>{
      let m=line.match(/^(.+?)\s*[—–]\s*(.*?)\s*$/);
      if(!m)m=line.match(/^(.+?)\s+-\s*(.*?)\s*$/);
      return m?{name:S(m[1]),qty:S(m[2])||'-'}:{name:line,qty:'-'};
    });
  }
  function findMaster(code){return (window.masters||[]).find(m=>S(m.kode)===S(code))||null;}
  function packageHtml(master){
    const rows=parsePackage(master?.isi_paket);
    if(!rows.length)return '';
    return `<div class="pm-invoice-package"><div class="pm-invoice-package-title">ISI PAKET</div><table><thead><tr><th>Komponen</th><th>Qty</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${E(r.name)}</td><td>${E(r.qty)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function installStyles(){
    if(document.getElementById('pmInvoiceQuoteSyncStyles'))return;
    const st=document.createElement('style');st.id='pmInvoiceQuoteSyncStyles';st.textContent=`
      #pmInvoicePreview .pm-inv-sync-table{width:100%!important;border-collapse:separate!important;border-spacing:0!important;border:1px solid #cbd5e1!important;border-radius:7px!important;overflow:hidden!important}
      #pmInvoicePreview .pm-inv-sync-table th,#pmInvoicePreview .pm-inv-sync-table td{border-right:1px solid #d7dee9!important;border-bottom:1px solid #d7dee9!important;padding:6px 5px!important;vertical-align:middle!important}
      #pmInvoicePreview .pm-inv-sync-table th:last-child,#pmInvoicePreview .pm-inv-sync-table td:last-child{border-right:0!important}
      #pmInvoicePreview .pm-inv-sync-table tbody tr:last-child td{border-bottom:0!important}
      #pmInvoicePreview .pm-inv-sync-table th{background:#172554!important;color:#fff!important;text-align:center!important;font-size:7.2pt!important;font-weight:800!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      #pmInvoicePreview .pm-inv-sync-table td{font-size:7.8pt!important;color:#172033!important}
      #pmInvoicePreview .pm-inv-sync-table tbody tr:nth-child(even):not(.pm-inv-sync-total):not(.pm-inv-sync-package) td{background:#f8fafc!important}
      #pmInvoicePreview .pm-inv-sync-code{color:#64748b!important;font-size:6.7pt!important;margin-top:2px!important}
      #pmInvoicePreview .pm-inv-sync-schedule{font-size:7pt!important;color:#475569!important}
      #pmInvoicePreview .pm-inv-sync-nowrap{white-space:nowrap!important}
      #pmInvoicePreview .pm-inv-sync-total td{background:#eff6ff!important;color:#172554!important;font-weight:800!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
      #pmInvoicePreview .pm-inv-sync-package td{padding:0!important;background:#f7f9fc!important}
      #pmInvoicePreview .pm-invoice-package{padding:6px 10px 8px 48px!important;color:#27334a!important}
      #pmInvoicePreview .pm-invoice-package-title{font-size:8px!important;font-weight:800!important;letter-spacing:.08em!important;margin-bottom:4px!important;color:#54627c!important}
      #pmInvoicePreview .pm-invoice-package table{width:100%!important;border-collapse:collapse!important;font-size:8px!important}
      #pmInvoicePreview .pm-invoice-package th,#pmInvoicePreview .pm-invoice-package td{padding:2px 5px!important;border:0!important;border-top:1px solid #e2e7ef!important;text-align:left!important;vertical-align:top!important}
      #pmInvoicePreview .pm-invoice-package th:last-child,#pmInvoicePreview .pm-invoice-package td:last-child{width:55px!important;text-align:center!important}
      #pmInvoicePreview .pm-invoice-package th{font-size:7px!important;text-transform:uppercase!important;color:#66748e!important;font-weight:800!important}
      #pmInvoicePreview .pm-invoice-sync-period{margin-top:7px!important;color:#64748b!important;font-size:6.3pt!important;font-weight:800!important;letter-spacing:.8px!important}
      #pmInvoicePreview .pm-invoice-sync-period-value{font-size:7.8pt!important;color:#475569!important}
    `;document.head.appendChild(st);
  }

  async function transform(){
    const area=document.querySelector('#pmInvoiceArea');
    if(!area||area.dataset.pmQuoteSync==='loading'||area.dataset.pmQuoteSync==='done')return;
    area.dataset.pmQuoteSync='loading';installStyles();
    try{
      const boxes=[...area.querySelectorAll('.pm-inv-box')];
      const refBox=boxes.find(b=>/REFERENSI PENAWARAN/i.test(S(b.textContent)));
      const refLines=refBox?[...refBox.children].map(x=>S(x.textContent)).filter(Boolean):[];
      const quoteNumber=refLines.find(x=>/^PM-\d{4}-/i.test(x))||'';
      const d=DB();
      if(!d||!quoteNumber){area.dataset.pmQuoteSync='done';return;}
      const quote=await d.from('penawaran').select('id,nama_client,perusahaan,telepon_wa,whatsapp,email,nama_event,event_name,tanggal_mulai,tanggal_selesai,total,grand_total').eq('nomor_penawaran',quoteNumber).maybeSingle();
      if(quote.error||!quote.data){area.dataset.pmQuoteSync='done';return;}
      const q=quote.data;
      const ir=await d.from('penawaran_items').select('*').eq('penawaran_id',q.id).order('id',{ascending:true});
      if(ir.error){area.dataset.pmQuoteSync='done';return;}
      const items=ir.data||[];
      let extras=[];
      try{const er=await d.from('penawaran_invoice_items').select('*').eq('penawaran_id',q.id).order('id',{ascending:true});if(!er.error)extras=er.data||[];}catch(_){ }
      if(boxes[0]){const label=boxes[0].querySelector('.pm-inv-label');if(label)label.textContent='DITUJUKAN KEPADA';}
      if(refBox){
        const label=refBox.querySelector('.pm-inv-label');if(label)label.textContent='EVENT / PROJECT';
        const children=[...refBox.children].filter(x=>!x.classList.contains('pm-inv-label'));
        if(children[0])children[0].textContent=S(q.event_name||q.nama_event||'-');
        if(children[1]){children[1].textContent='PERIODE';children[1].className='pm-invoice-sync-period';}
        if(children[2]){children[2].textContent=period(q.tanggal_mulai,q.tanggal_selesai,false);children[2].className='pm-invoice-sync-period-value';}
      }
      const oldTable=area.querySelector('.pm-inv-table');
      if(!oldTable){area.dataset.pmQuoteSync='done';return;}
      const rowHtml=items.map((item,i)=>{
        const code=S(item.kode),master=findMaster(code),sched=period(item.tanggal_mulai,item.tanggal_selesai,true);
        return `<tr class="pm-inv-sync-item"><td class="center">${i+1}</td><td><strong>${E(item.item||item.nama_item||'-')}</strong><div class="pm-inv-sync-code">${E(code)}</div></td><td class="center">${E(itemQty(item))}</td><td class="center pm-inv-sync-schedule">${E(sched)}</td><td class="right pm-inv-sync-nowrap">${M(item.harga_jual??item.harga)}</td><td class="right pm-inv-sync-nowrap">${M(item.subtotal)}</td></tr>${master&&S(master.isi_paket)?`<tr class="pm-inv-sync-package"><td colspan="6">${packageHtml(master)}</td></tr>`:''}`;
      }).join('');
      const extraHtml=extras.map((item,i)=>`<tr class="pm-inv-sync-extra"><td class="center">+</td><td><strong>${E(item.nama_item||item.item||'Item Tambahan')}</strong><div class="pm-inv-sync-code">${E(item.kode||'ADD-INV')}</div></td><td class="center">${E(item.tipe_perhitungan==='overtime'?`${N(item.qty)} jam`:`${N(item.qty)||1} ${S(item.satuan||'unit')}`)}</td><td class="center pm-inv-sync-schedule">${E(period(item.tanggal_mulai,item.tanggal_selesai,true))}</td><td class="right pm-inv-sync-nowrap">${M(item.harga)}</td><td class="right pm-inv-sync-nowrap">${M(item.subtotal)}</td></tr>`).join('');
      const quoteTotal=N(q.grand_total??q.total),extraTotal=extras.reduce((s,x)=>s+N(x.subtotal),0),total=quoteTotal+extraTotal;
      const table=document.createElement('table');table.className='pm-inv-sync-table';
      table.innerHTML=`<thead><tr><th>No.</th><th>Produk / Jasa</th><th>Qty / Dimensi</th><th>Jadwal</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>${rowHtml}${extraHtml}<tr class="pm-inv-sync-total"><td colspan="5" class="right">GRAND TOTAL</td><td class="right">${M(total)}</td></tr></tbody>`;
      oldTable.replaceWith(table);area.dataset.pmQuoteSync='done';
    }catch(e){console.error('[PM] invoice quotation sync',e);area.dataset.pmQuoteSync='done';}
  }

  const observer=new MutationObserver(()=>{if(document.getElementById('pmInvoiceArea'))requestAnimationFrame(transform);});
  observer.observe(document.body,{childList:true,subtree:true});
  [0,250,700,1500,2500].forEach(ms=>setTimeout(()=>{if(document.getElementById('pmInvoiceArea'))transform();},ms));
})();
