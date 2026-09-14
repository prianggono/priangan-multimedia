/* Priangan Multimedia — Per-item quotation discount UI
 * UI/calculation extension only. Persistence belongs exclusively to
 * quotation-save-safe.js so quotation save has one authority.
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
  const items=()=>Array.isArray(window.items)?window.items:[];

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
  function rawUnit(item){return Math.max(0,N(item.__pmBaseHarga??item.harga_jual??item.harga??masterFor(item)?.harga_jual));}
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
    const pct=Math.max(0,Math.min(100,N(item.diskon_persen)));
    const baseUnit=rawUnit(item),baseSubtotal=rawSubtotal(item,baseUnit);
    const nominal=pct>0?Math.min(baseSubtotal,Math.round(baseSubtotal*pct/100)):Math.min(baseSubtotal,Math.max(0,N(item.diskon_nominal)));
    const effectiveSubtotal=Math.max(0,baseSubtotal-nominal);
    const factor=baseSubtotal>0?effectiveSubtotal/baseSubtotal:1;
    return{pct,baseUnit,baseSubtotal,nominal,effectiveSubtotal,effectiveUnit:baseUnit*factor};
  }
  function apply(item){
    if(!item)return state(item);
    const s=state(item);
    item.__pmBaseHarga=s.baseUnit;
    item.harga=s.effectiveUnit;
    item.harga_jual=s.effectiveUnit;
    item.diskon_persen=s.pct;
    item.diskon_nominal=s.nominal;
    return s;
  }
  function itemFromCard(card){const id=card?.dataset?.itemId;return items().find(x=>String(x.id)===String(id))||null;}
  function subtotalElement(card){return [...card.querySelectorAll('.pm-item-body > .sum')].find(el=>/subtotal/i.test(S(el.querySelector('span')?.textContent)))||card.querySelector('.pm-item-body > .sum');}
  function priceInput(card){return [...card.querySelectorAll('.field')].map(f=>({i:f.querySelector('input'),l:S(f.querySelector('label')?.textContent).toLowerCase()})).find(x=>x.l.includes('harga jual'))?.i||null;}
  function refreshCard(card,item){
    const s=apply(item),price=priceInput(card),sum=subtotalElement(card),box=card.querySelector('.pm-item-discount');
    if(price)price.value=M(s.baseUnit);
    if(box){const pct=box.querySelector('.pm-item-discount-pct'),rp=box.querySelector('.pm-item-discount-rp');if(pct&&document.activeElement!==pct)pct.value=String(Number(s.pct.toFixed(2)));if(rp)rp.value=M(s.nominal);}
    if(sum?.querySelector('b'))sum.querySelector('b').textContent=M(s.effectiveSubtotal);
  }
  function syncGrand(){try{window.__PM_QUOTATION_CORE?.sync?.();}catch(_){} }
  function enhance(){
    const container=document.querySelector('#items');if(!container)return;
    container.querySelectorAll(':scope > .item').forEach(card=>{
      const item=itemFromCard(card);if(!item)return;
      if(item.__pmBaseHarga==null){
        const master=masterFor(item),storedPct=N(item.diskon_persen),storedNet=N(item.harga);
        item.__pmBaseHarga=storedPct>0&&storedNet>0?storedNet/(1-storedPct/100):N(master?.harga_jual??item.harga_jual??item.harga);
      }
      apply(item);
      if(card.querySelector('.pm-item-discount')){refreshCard(card,item);return;}
      const schedule=card.querySelector('.sched'),subtotal=subtotalElement(card);if(!subtotal)return;
      const box=document.createElement('div');box.className='pm-item-discount';
      box.innerHTML=`<div class="pm-item-discount-grid"><div class="field"><label>Diskon (%)</label><input class="pm-item-discount-pct" type="number" min="0" max="100" step="0.01" value="${N(item.diskon_persen)}"></div><div class="field"><label>Diskon (Rp)</label><input class="pm-item-discount-rp" value="${M(item.diskon_nominal)}" readonly></div></div>`;
      (schedule||subtotal).insertAdjacentElement('afterend',box);
      const pct=box.querySelector('.pm-item-discount-pct');
      pct.addEventListener('focus',()=>{pct.value=String(N(item.diskon_persen));});
      const change=()=>{item.diskon_persen=Math.max(0,Math.min(100,N(pct.value)));item.diskon_nominal=0;apply(item);refreshCard(card,item);syncGrand();};
      pct.addEventListener('input',change);pct.addEventListener('change',change);
    });
  }
  function style(){
    if(document.getElementById('pmItemDiscountStyles'))return;
    const st=document.createElement('style');st.id='pmItemDiscountStyles';st.textContent=`#content .pm-item-discount{margin:12px 0 0;padding-top:12px;border-top:1px solid rgba(255,255,255,.07)}#content .pm-item-discount-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}#content .pm-item-discount label{font-size:12px;color:var(--muted,#9aa7bd)}#content .pm-item-discount-rp{background:rgba(255,255,255,.035)!important;color:#35e6a5!important;font-weight:700}@media(max-width:700px){#content .pm-item-discount-grid{grid-template-columns:1fr}}`;document.head.appendChild(st);
  }
  document.addEventListener('input',e=>{const input=e.target?.closest?.('#items > .item input');if(!input)return;const card=input.closest('#items > .item');const label=S(input.closest('.field')?.querySelector('label')?.textContent).toLowerCase();if(!card||!label.includes('harga jual'))return;const item=itemFromCard(card);if(!item)return;item.__pmBaseHarga=Math.max(0,N(input.value));item.diskon_nominal=0;apply(item);refreshCard(card,item);syncGrand();},true);
  style();
  new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});
  [0,150,350,700,1200].forEach(ms=>setTimeout(enhance,ms));
  window.addEventListener('load',enhance);
})();
