/* Priangan Multimedia — Per-item quotation discount
 * Owns only per-item discount UI/calculation. Price editing and quotation save
 * are handled by their dedicated modules.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_ITEM_DISCOUNT__)return;
  window.__PM_QUOTATION_ITEM_DISCOUNT__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));

  function items(){return Array.isArray(window.items)?window.items:[];}
  function itemFromCard(card){const id=card?.dataset?.itemId;return items().find(x=>String(x.id)===String(id))||null;}
  function masterFor(item){
    const id=item?.master_id??item?.masterId??item?.id_master??item?.master_harga_id;
    const ms=Array.isArray(window.masters)?window.masters:[];
    return (id!=null&&ms.find(m=>String(m.id)===String(id)))||ms.find(m=>S(m.kode)===S(item?.kode))||null;
  }
  function days(item){
    if(!item?.mulai||!item?.selesai)return 1;
    const a=new Date(S(item.mulai)+'T00:00:00'),b=new Date(S(item.selesai)+'T00:00:00');
    const d=Math.round((b-a)/86400000);return d>=0?d+1:1;
  }
  function typeOf(item){
    const m=masterFor(item),text=`${S(m?.item)} ${S(m?.kategori)}`.toLowerCase(),sat=S(m?.satuan).toLowerCase().replace(/²/g,'2');
    if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(text))return'qty';
    if(/unit|units|pcs|pc|buah|set|hari|trip|orang|lot/.test(sat))return'qty';
    if(/level/.test(text))return'level';
    if(/rigging|rig/.test(text))return'rigging';
    if(/videotron|led\s*(indoor|outdoor)|led\s*p\.?\d/.test(text))return'luas';
    if(/m2|meter2|luas/.test(sat))return'luas';
    return S(item?.tipe||item?.tipe_perhitungan)||'qty';
  }
  function rawUnit(item){
    const marked=N(item.__pmBaseHarga);
    if(marked>0)return marked;
    const current=N(item.harga_jual??item.harga),master=N(masterFor(item)?.harga_jual);
    return Math.max(0,current>0?current:master);
  }
  function rawSubtotal(item,baseUnit){
    const price=N(baseUnit),d=days(item),type=typeOf(item),qty=Math.max(1,N(item.qty)||1),w=N(item.lebar),h=N(item.tinggi),l=N(item.panjang);
    if(type==='luas')return w*h*price*d;
    if(type==='rigging')return ((l*2)+(h*2))*price*d;
    if(type==='level'){
      const led=items().find(x=>x!==item&&/led|videotron/i.test(`${S(x.item)} ${S(x.kode)}`));
      return (led?N(led.lebar):w)*price*d;
    }
    return qty*price*d;
  }
  function state(item){
    let pct=Math.max(0,Math.min(100,N(item.diskon_persen)));
    const baseUnit=rawUnit(item),baseSubtotal=rawSubtotal(item,baseUnit);
    let nominal=N(item.diskon_nominal);
    if(pct>0)nominal=Math.min(baseSubtotal,Math.round(baseSubtotal*pct/100));
    else nominal=Math.min(baseSubtotal,Math.max(0,nominal));
    if(baseSubtotal<=0)nominal=0;
    const effectiveSubtotal=Math.max(0,baseSubtotal-nominal),factor=baseSubtotal>0?effectiveSubtotal/baseSubtotal:1,effectiveUnit=baseUnit*factor;
    return{pct,baseUnit,baseSubtotal,nominal,effectiveSubtotal,effectiveUnit};
  }
  function apply(item){
    if(!item)return state(item);
    const s=state(item);
    item.__pmBaseHarga=s.baseUnit;item.harga=s.effectiveUnit;item.harga_jual=s.effectiveUnit;item.diskon_persen=s.pct;item.diskon_nominal=s.nominal;
    return s;
  }
  function subtotalElement(card){return [...card.querySelectorAll('.pm-item-body > .sum')].find(el=>/subtotal/i.test(S(el.querySelector('span')?.textContent)))||card.querySelector('.pm-item-body > .sum');}
  function priceInput(card){return [...card.querySelectorAll('.field')].map(f=>({i:f.querySelector('input'),l:S(f.querySelector('label')?.textContent).toLowerCase()})).find(x=>x.l.includes('harga jual'))?.i||null;}
  function refreshCard(card,item){
    const s=state(item),price=priceInput(card),sum=subtotalElement(card),box=card.querySelector('.pm-item-discount');
    if(price)price.value=M(s.pct>0? s.effectiveUnit : s.baseUnit);
    if(box){const pct=box.querySelector('.pm-item-discount-pct'),rp=box.querySelector('.pm-item-discount-rp');if(pct&&document.activeElement!==pct)pct.value=String(Number(s.pct.toFixed(2)));if(rp)rp.value=M(s.nominal);}
    if(sum?.querySelector('b'))sum.querySelector('b').textContent=M(s.effectiveSubtotal);
  }
  function syncGrand(){try{if(window.__PM_QUOTATION_CORE?.sync)window.__PM_QUOTATION_CORE.sync();}catch(_){} }
  function enhance(){
    const container=document.querySelector('#items');if(!container)return;
    container.querySelectorAll(':scope > .item').forEach(card=>{
      const item=itemFromCard(card);if(!item)return;
      const master=masterFor(item),masterPrice=N(master?.harga_jual);
      if(N(item.__pmBaseHarga)<=0 && N(item.harga)<=0 && masterPrice>0){
        item.__pmBaseHarga=masterPrice;
        item.harga=masterPrice;
        item.harga_jual=masterPrice;
      }else if(N(item.__pmBaseHarga)<=0 && masterPrice>0 && N(item.diskon_persen)===0 && N(item.diskon_nominal)===0){
        item.__pmBaseHarga=masterPrice;
      }
      if(item.__pmBaseHarga==null||N(item.__pmBaseHarga)<=0){
        const fallback=N(item.harga_jual??item.harga??masterPrice);
        if(fallback>0)item.__pmBaseHarga=fallback;
      }
      apply(item);
      if(card.querySelector('.pm-item-discount')){refreshCard(card,item);return;}
      const schedule=card.querySelector('.sched'),subtotal=subtotalElement(card);if(!subtotal)return;
      const box=document.createElement('div');box.className='pm-item-discount';
      box.innerHTML=`<div class="pm-item-discount-grid"><div class="field"><label>Diskon (%)</label><input class="pm-item-discount-pct" type="number" min="0" max="100" step="0.01" value="${N(item.diskon_persen)}"></div><div class="field"><label>Diskon (Rp)</label><input class="pm-item-discount-rp" value="${M(item.diskon_nominal)}" readonly></div></div>`;
      (schedule||subtotal).insertAdjacentElement('afterend',box);
      const pct=box.querySelector('.pm-item-discount-pct');
      pct.addEventListener('focus',()=>{pct.value=String(N(item.diskon_persen));});
      const change=()=>{const v=Math.max(0,Math.min(100,N(pct.value)));item.diskon_persen=v;item.diskon_nominal=0;apply(item);refreshCard(card,item);syncGrand();};
      pct.addEventListener('input',change);pct.addEventListener('change',change);
    });
  }
  function style(){
    if(document.getElementById('pmItemDiscountStyles'))return;
    const st=document.createElement('style');st.id='pmItemDiscountStyles';st.textContent=`#content .pm-item-discount{margin:12px 0 0;padding-top:12px;border-top:1px solid rgba(255,255,255,.07)}#content .pm-item-discount-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}#content .pm-item-discount label{font-size:12px;color:var(--muted,#9aa7bd)}#content .pm-item-discount-rp{background:rgba(255,255,255,.035)!important;color:#35e6a5!important;font-weight:700}@media(max-width:700px){#content .pm-item-discount-grid{grid-template-columns:1fr}}`;document.head.appendChild(st);
  }
  style();
  new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('input',e=>{if(e.target?.classList?.contains('pm-item-discount-pct')){const card=e.target.closest('#items > .item');const item=itemFromCard(card);if(item)syncGrand();}},true);
  [0,150,350,700,1200,2000].forEach(ms=>setTimeout(enhance,ms));
  window.addEventListener('load',enhance);
})();
