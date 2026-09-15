/* Customer document Level display fix.
 * Uses live quotation item state when available, so the first Preview/Cetak
 * already shows Level name, Level price and Level-inclusive subtotal.
 * Customer-facing Level height is displayed in cm.
 */
(function(){
  'use strict';
  if(window.__PM_DOCUMENT_LEVEL_CM_V2__) return;
  window.__PM_DOCUMENT_LEVEL_CM_V2__ = true;

  const S = v => String(v ?? '').trim();
  const N = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const money = v => typeof window.money === 'function'
    ? window.money(v)
    : new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));

  function cmValue(v){
    const n=N(v);
    if(n<=0) return 0;
    /* Stored canonical unit is meter. Protect old buggy records that may have cm. */
    return Math.round((n>10 ? n : n*100));
  }

  function items(){ return Array.isArray(window.items) ? window.items : []; }
  function isLED(item){
    const t=`${S(item?.item)} ${S(item?.kode)} ${S(item?.kategori)}`.toLowerCase();
    if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(t)) return false;
    return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(t);
  }
  function days(a,b){
    if(!a||!b) return 1;
    const x=new Date(S(a).slice(0,10)+'T00:00:00');
    const y=new Date(S(b).slice(0,10)+'T00:00:00');
    const d=Math.round((y-x)/86400000);
    return d>=0?d+1:1;
  }
  function itemNet(item){
    const price=Math.max(0,N(item?.harga_jual??item?.harga));
    const qty=Math.max(1,N(item?.qty)||1);
    const d=days(item?.tanggal_mulai??item?.mulai,item?.tanggal_selesai??item?.selesai);
    let base;
    if(isLED(item)){
      base=N(item.lebar)*N(item.tinggi)*price*qty*d;
      if(item.level_enabled) base+=N(item.lebar)*N(item.level_harga)*qty;
    }else{
      const type=S(item?.tipe_perhitungan??item?.tipe).toLowerCase();
      if(type==='rigging') base=((N(item.panjang)*2)+(N(item.tinggi)*2))*price*d;
      else if(type==='overtime') base=N(item.qty)*price;
      else if(type==='level') base=N(item.lebar)*price;
      else base=qty*price*d;
    }
    const pct=Math.max(0,Math.min(100,N(item?.diskon_persen)));
    const disc=pct>0?Math.min(base,Math.round(base*pct/100)):Math.min(base,Math.max(0,N(item?.diskon_nominal)));
    return Math.max(0,base-disc);
  }

  function patchRows(root,list){
    if(!root || !list.length) return;
    const rows=[...root.querySelectorAll('.pm-items tbody tr')].filter(r=>!r.classList.contains('pm-inv-sync-total'));
    list.forEach((item,i)=>{
      const row=rows[i];
      if(!row) return;
      const name=row.querySelector('td:nth-child(2) strong');
      if(name){
        const base=S(item?.item||item?.nama_item||'-');
        name.textContent=item?.level_enabled&&N(item.level_tinggi)>0
          ? `${base} + Level ${cmValue(item.level_tinggi)} cm`
          : base;
      }
      const q=row.querySelector('td:nth-child(3)');
      if(q){
        q.textContent=isLED(item)
          ? `${N(item.lebar)} × ${N(item.tinggi)} m² • ${Math.max(1,N(item.qty)||1)} set`
          : q.textContent;
      }
      const price=row.querySelector('td:nth-child(5)');
      if(price && isLED(item) && item.level_enabled && N(item.level_harga)>0){
        price.innerHTML=`${money(item.harga_jual??item.harga)}<div class="pm-cust-level-price">Level: ${money(item.level_harga)}/m</div>`;
      }
      const sub=row.querySelector('td:nth-child(6)');
      if(sub) sub.textContent=money(itemNet(item));
    });
    const total=list.reduce((s,x)=>s+itemNet(x),0)-Math.max(0,N(window.__pmDiscountValue));
    const totalCell=root.querySelector('tbody tr:last-child td:last-child');
    if(totalCell) totalCell.textContent=money(Math.max(0,total));
  }

  function run(){
    const list=items();
    if(!list.length) return;
    patchRows(document.querySelector('#pmPrintArea'),list);
    patchRows(document.querySelector('#pmInvoiceArea'),list);
    patchRows(document.querySelector('#pmInvoicePreview'),list);
  }

  /* Capture before the quotation's own click handler so the existing table is
   * corrected synchronously before window.print/native preview can run. */
  document.addEventListener('click',e=>{
    const b=e.target.closest?.('button');
    if(!b) return;
    if(/Preview|Cetak|Invoice/i.test(S(b.textContent))) run();
  },true);
  window.addEventListener('beforeprint',run,true);
  window.addEventListener('load',run);
  run();
})();
