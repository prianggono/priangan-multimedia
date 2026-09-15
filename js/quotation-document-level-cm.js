/* Priangan Multimedia — Customer document Level finalizer
 * Makes saved Level visible in quotation A4 and Invoice.
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
  const cm=v=>Math.round(N(v));
  const levelLabel=item=>{
    if(!item?.level_enabled) return '';
    const h=cm(item.level_tinggi);
    return h>0?` + Level ${h} cm`:' + Level';
  };
  const led=item=>/videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/i.test(`${S(item?.item)} ${S(item?.kode)}`) && !/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/i.test(`${S(item?.item)} ${S(item?.kode)}`);

  function apply(root,list){
    if(!root||!Array.isArray(list)||!list.length) return;
    const rows=[...root.querySelectorAll('.pm-items tbody tr')].filter(r=>!r.classList.contains('pm-cust-total')&&!r.classList.contains('pm-inv-sync-total'));
    list.forEach((item,i)=>{
      const row=rows[i]; if(!row||!led(item)) return;
      const name=row.querySelector('td:nth-child(2) strong');
      const label=levelLabel(item);
      if(name){
        const base=S(item.item||item.nama_item||name.textContent).replace(/\s*\+\s*Level.*$/i,'');
        name.textContent=base+label;
      }
      const price=row.querySelector('td:nth-child(5)');
      if(price && N(item.level_harga)>0 && item.level_enabled){
        const base=M(item.harga_jual??item.harga);
        price.innerHTML=`${base}<div class="pm-cust-level-price">Level: ${M(item.level_harga)}/m</div>`;
      }
    });
  }

  async function loadSaved(root){
    const d=window.__PM_STABLE_DB||window.db; if(!d||!root) return null;
    const body=S(root.textContent);
    const no=(body.match(/PM-\d{4}-\d+/i)||[])[0]; if(!no) return null;
    try{
      const q=await d.from('penawaran').select('id').eq('nomor_penawaran',no).maybeSingle();
      if(q.error||!q.data?.id) return null;
      const r=await d.from('penawaran_items').select('*').eq('penawaran_id',q.data.id).order('id',{ascending:true});
      if(r.error) return null;
      return r.data||[];
    }catch(_){return null;}
  }

  async function run(){
    const quote=document.querySelector('#pmPrintArea');
    const list=Array.isArray(window.items)?window.items:[];
    if(quote){
      if(list.length) apply(quote,list);
      else {const saved=await loadSaved(quote); if(saved?.length) apply(quote,saved);}
    }
    normalizeExisting(document.querySelector('#pmInvoiceArea'));
    normalizeExisting(document.querySelector('#pmInvoicePreview'));
  }

  function normalizeExisting(root){
    if(!root) return;
    root.querySelectorAll('strong').forEach(el=>{
      const text=S(el.textContent);
      const m=text.match(/^(.*?\s*\+\s*Level\s+)([0-9]+(?:[.,][0-9]+)?)\s*m$/i);
      if(m) el.textContent=`${m[1]}${cm(m[2])} cm`;
    });
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('button'); if(!b)return;
    if(/Preview|Cetak|Invoice/i.test(S(b.textContent))) setTimeout(run,80);
  },true);
  window.addEventListener('beforeprint',run,true);
  window.addEventListener('load',run);
  run();
})();