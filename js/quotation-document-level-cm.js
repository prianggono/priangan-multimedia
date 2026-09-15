/* Priangan Multimedia — Customer document Level finalizer
 * Makes saved/live Level visible in quotation A4 and Invoice.
 * Display only: never changes quotation calculations or Supabase data.
 */
(function(){
  'use strict';
  if(window.__PM_DOCUMENT_LEVEL_CM__) return;
  window.__PM_DOCUMENT_LEVEL_CM__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const M=v=>typeof window.money==='function'?window.money(v):new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const levelCm=v=>{const n=N(v);if(n<=0)return 0;return n<10?Math.round(n*100):Math.round(n);};
  const items=()=>Array.isArray(window.items)?window.items:[];
  const days=(a,b)=>{if(!a||!b)return 1;const x=new Date(S(a).slice(0,10)+'T00:00:00'),y=new Date(S(b).slice(0,10)+'T00:00:00'),d=Math.round((y-x)/86400000);return d>=0?d+1:1;};
  const isLed=item=>/videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/i.test(`${S(item?.item)} ${S(item?.kode)}`) && !/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/i.test(`${S(item?.item)} ${S(item?.kode)}`);
  const levelLabel=item=>item?.level_enabled?(levelCm(item.level_tinggi)>0?` + Level ${levelCm(item.level_tinggi)} cm`:' + Level'):'';
  const levelSubtotal=item=>item?.level_enabled?N(item.lebar)*N(item.level_harga)*Math.max(1,N(item.qty)||1):0;
  const ledSubtotal=item=>isLed(item)?N(item.lebar)*N(item.tinggi)*N(item.harga??item.harga_jual)*Math.max(1,N(item.qty)||1)*days(item.mulai??item.tanggal_mulai,item.selesai??item.tanggal_selesai):0;
  const netSubtotal=item=>{
    const base=isLed(item)?ledSubtotal(item)+levelSubtotal(item):N(item.subtotal);
    const pct=Math.max(0,Math.min(100,N(item.diskon_persen)));
    const disc=pct>0?Math.min(base,Math.round(base*pct/100)):Math.min(base,Math.max(0,N(item.diskon_nominal)));
    return Math.max(0,base-disc);
  };

  function applyQuotation(root,list){
    if(!root||!Array.isArray(list)||!list.length)return;
    const rows=[...root.querySelectorAll('.pm-items tbody tr')].filter(r=>!r.classList.contains('pm-total')&&!r.classList.contains('pm-discount-row')&&!r.classList.contains('pm-cust-total'));
    list.forEach((item,i)=>{
      const row=rows[i]; if(!row||!isLed(item))return;
      const name=row.querySelector('td:nth-child(2) strong');
      if(name){const base=S(item.item||item.nama_item||name.textContent).replace(/\s*\+\s*Level.*$/i,'');name.textContent=base+levelLabel(item);}
      const qty=row.querySelector('td:nth-child(3)');
      if(qty)qty.textContent=`${N(item.lebar)} × ${N(item.tinggi)} m² • ${Math.max(1,N(item.qty)||1)} set`;
      const price=row.querySelector('td:nth-child(5)');
      if(price&&item.level_enabled&&N(item.level_harga)>0)price.innerHTML=`${M(item.harga_jual??item.harga)}<div class="pm-cust-level-price">Level: ${M(item.level_harga)}/m</div>`;
      const subtotal=row.querySelector('td:nth-child(6)');
      if(subtotal)subtotal.textContent=M(netSubtotal(item));
    });
    const total=rowTotal(root);
    if(total){const value=N(window.__pmNetTotal)||list.reduce((s,x)=>s+netSubtotal(x),0);total.textContent=M(value);}
  }

  function rowTotal(root){return root.querySelector('.pm-total td:last-child')||null;}

  function normalizeInvoice(root){
    if(!root)return;
    root.querySelectorAll('strong').forEach(el=>{
      const text=S(el.textContent);
      const m=text.match(/^(.*?\s*\+\s*Level\s+)([0-9]+(?:[.,][0-9]+)?)\s*m$/i);
      if(m)el.textContent=`${m[1]}${levelCm(m[2])} cm`;
    });
  }

  async function loadSavedQuote(root){
    const d=window.__PM_STABLE_DB||window.db;if(!d||!root)return null;
    const body=S(root.textContent),no=(body.match(/PM-\d{4}-\d+/i)||[])[0];if(!no)return null;
    try{const q=await d.from('penawaran').select('id').eq('nomor_penawaran',no).maybeSingle();if(q.error||!q.data?.id)return null;const r=await d.from('penawaran_items').select('*').eq('penawaran_id',q.data.id).order('id',{ascending:true});return r.error?null:(r.data||[]);}catch(_){return null;}
  }

  async function run(){
    const quote=document.querySelector('#pmPrintArea');
    const live=items().filter(x=>x&&S(x.kode)&&S(x.item));
    if(quote){
      if(live.length)applyQuotation(quote,live);
      else{const saved=await loadSavedQuote(quote);if(saved?.length)applyQuotation(quote,saved);}
    }
    normalizeInvoice(document.querySelector('#pmInvoiceArea'));
    normalizeInvoice(document.querySelector('#pmInvoicePreview'));
  }

  function installStyles(){
    if(document.getElementById('pmDocumentLevelCmStyles'))return;
    const st=document.createElement('style');st.id='pmDocumentLevelCmStyles';st.textContent='.pm-cust-level-price{font-size:6.5pt!important;color:#475569!important;margin-top:2px!important;line-height:1.1!important}';document.head.appendChild(st);
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('button');if(!b)return;
    if(/Preview|Cetak|Invoice/i.test(S(b.textContent)))setTimeout(run,80);
  },true);
  window.addEventListener('beforeprint',run,true);
  installStyles();
  run();
})();
