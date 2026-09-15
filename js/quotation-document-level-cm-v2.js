/* Customer document Level display fix.
 * Uses live quotation item state when available, so the first Preview/Cetak
 * already shows Level name, Level price and Level-inclusive subtotal.
 * Customer-facing Level height is displayed in cm.
 * No observers and no DOM loops.
 */
(function(){
  'use strict';
  if(window.__PM_DOCUMENT_LEVEL_CM_V2__) return;
  window.__PM_DOCUMENT_LEVEL_CM_V2__ = true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const money=v=>typeof window.money==='function'?window.money(v):new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const cmValue=v=>{const n=N(v);if(n<=0)return 0;return Math.round(n>10?n:n*100);};
  const items=()=>Array.isArray(window.items)?window.items:[];
  const isLED=item=>{const t=`${S(item?.item)} ${S(item?.kode)} ${S(item?.kategori)}`.toLowerCase();if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(t))return false;return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(t);};
  const days=(a,b)=>{if(!a||!b)return 1;const x=new Date(S(a).slice(0,10)+'T00:00:00'),y=new Date(S(b).slice(0,10)+'T00:00:00'),d=Math.round((y-x)/86400000);return d>=0?d+1:1;};
  const base=item=>isLED(item)?N(item.lebar)*N(item.tinggi)*N(item.harga_jual??item.harga)*Math.max(1,N(item.qty)||1)*days(item.mulai??item.tanggal_mulai,item.selesai??item.tanggal_selesai)+((item.level_enabled)?N(item.lebar)*N(item.level_harga)*Math.max(1,N(item.qty)||1):0):N(item.subtotal);
  const net=item=>{const b=Math.max(0,base(item)),pct=Math.max(0,Math.min(100,N(item.diskon_persen))),disc=pct>0?Math.min(b,Math.round(b*pct/100)):Math.min(b,Math.max(0,N(item.diskon_nominal)));return Math.max(0,b-disc);};

  function patchRows(root,list){
    if(!root||!list.length)return;
    const rows=[...root.querySelectorAll('.pm-items tbody tr')].filter(r=>!r.classList.contains('pm-total')&&!r.classList.contains('pm-discount-row'));
    list.forEach((item,i)=>{
      const row=rows[i];if(!row||!isLED(item))return;
      const name=row.querySelector('td:nth-child(2) strong');
      if(name){const baseName=S(item.item||item.nama_item||name.textContent).replace(/\s*\+\s*Level.*$/i,'');name.textContent=item.level_enabled&&N(item.level_tinggi)>0?`${baseName} + Level ${cmValue(item.level_tinggi)} cm`:baseName;}
      const price=row.querySelector('td:nth-child(5)');
      if(price&&item.level_enabled&&N(item.level_harga)>0)price.innerHTML=`${money(item.harga_jual??item.harga)}<div class="pm-cust-level-price">Level: ${money(item.level_harga)}/m</div>`;
      const sub=row.querySelector('td:nth-child(6)');
      if(sub)sub.textContent=money(net(item));
    });
    const totalCell=root.querySelector('.pm-total td:last-child');
    if(totalCell)totalCell.textContent=money(Math.max(0,list.reduce((s,x)=>s+net(x),0)-Math.max(0,N(window.__pmDiscountValue))));
  }

  function patchInvoice(root){
    if(!root)return;
    const list=items();
    if(!list.length)return;
    const rows=[...root.querySelectorAll('.pm-cust-invoice-table tbody tr.pm-cust-item')];
    list.forEach((item,i)=>{
      const row=rows[i];if(!row||!isLED(item)||!item.level_enabled)return;
      const name=row.querySelector('td:nth-child(2) strong');
      if(name){const baseName=S(item.item||item.nama_item||name.textContent).replace(/\s*\+\s*Level.*$/i,'');name.textContent=`${baseName} + Level ${cmValue(item.level_tinggi)} cm`;}
      const price=row.querySelector('td:nth-child(5)');
      if(price&&N(item.level_harga)>0)price.innerHTML=`${money(item.harga_jual??item.harga)}<div class="pm-cust-level-price">Level: ${money(item.level_harga)}/m</div>`;
      const sub=row.querySelector('td:nth-child(6)');
      if(sub)sub.textContent=money(net(item));
    });
  }

  function run(){
    const list=items().filter(x=>x&&S(x.kode)&&S(x.item));
    patchRows(document.querySelector('#pmPrintArea'),list);
    patchInvoice(document.querySelector('#pmInvoiceArea'));
    patchInvoice(document.querySelector('#pmInvoicePreview'));
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('button');if(!b)return;
    if(/Preview|Cetak/i.test(S(b.textContent))){
      run();
      setTimeout(run,80);
      setTimeout(run,180);
    }else if(/Invoice/i.test(S(b.textContent))){
      setTimeout(run,80);
    }
  },true);
  window.addEventListener('beforeprint',run,true);
  installStyles();
  function installStyles(){if(document.getElementById('pmDocumentLevelCmV2Styles'))return;const st=document.createElement('style');st.id='pmDocumentLevelCmV2Styles';st.textContent='.pm-cust-level-price{font-size:6.5pt!important;color:#475569!important;margin-top:2px!important;line-height:1.1!important}';document.head.appendChild(st);}
  run();
})();
