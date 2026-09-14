/* Priangan Multimedia — Canonical per-item discount
 * `item.harga` is ALWAYS the negotiated quotation price.
 * Master price is only the initial value supplied by quotation core.
 * Discount never rewrites the negotiated price.
 */
(function(){
  'use strict';
  if(window.__PM_ITEM_DISCOUNT_CANONICAL__) return;
  window.__PM_ITEM_DISCOUNT_CANONICAL__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const items=()=>Array.isArray(window.items)?window.items:[];
  const core=()=>window.__PM_QUOTATION_CORE||{};
  const itemFromCard=card=>items().find(x=>String(x.id)===String(card?.dataset?.itemId))||null;
  const rawSubtotal=item=>core().itemSubtotal?Math.max(0,N(core().itemSubtotal(item))):0;

  function state(item){
    const base=rawSubtotal(item);
    let pct=Math.max(0,Math.min(100,N(item.diskon_persen)));
    let nominal=N(item.diskon_nominal);
    if(pct>0) nominal=Math.min(base,Math.round(base*pct/100));
    else nominal=Math.min(base,Math.max(0,nominal));
    const net=Math.max(0,base-nominal);
    return {base, pct, nominal, net};
  }

  function subtotalEl(card){
    return [...card.querySelectorAll('.pm-item-body > .sum')].find(el=>/subtotal/i.test(S(el.querySelector('span')?.textContent)))||null;
  }

  function updateCard(card,item){
    if(!item)return;
    const st=state(item);
    const box=card.querySelector('.pm-item-discount');
    if(box){
      const p=box.querySelector('.pm-item-discount-pct');
      const r=box.querySelector('.pm-item-discount-rp');
      if(p&&document.activeElement!==p)p.value=String(Number(st.pct.toFixed(2)));
      if(r)r.value=M(st.nominal);
    }
    const sub=subtotalEl(card);
    if(sub?.querySelector('b')) sub.querySelector('b').textContent=M(st.net);
    item.diskon_persen=st.pct;
    item.diskon_nominal=st.nominal;
  }

  function grandTotal(){
    const base=items().filter(x=>S(x.kode)&&S(x.item)).reduce((sum,item)=>sum+rawSubtotal(item),0);
    const itemDiscount=items().filter(x=>S(x.kode)&&S(x.item)).reduce((sum,item)=>sum+state(item).nominal,0);
    const global=Math.max(0,N(window.__pmDiscountValue));
    const total=Math.max(0,base-itemDiscount-global);
    const totalEl=document.querySelector('#total'),grand=document.querySelector('#pmGrand');
    if(totalEl)totalEl.textContent=M(total);
    if(grand)grand.textContent=M(total);
    window.__pmDiscountBase=base-itemDiscount;
    window.__pmNetTotal=total;
    window.__pmItemDiscountTotal=itemDiscount;
    return {base,itemDiscount,global,total};
  }

  function ensure(card,item){
    if(!card||!item)return;
    /* Never infer a discount-adjusted price. The current item.harga is the
       negotiated unit price and remains untouched by this module. */
    if(item.__pmNegotiatedPrice==null) item.__pmNegotiatedPrice=N(item.harga);
    else if(item.__harga_diedit) item.__pmNegotiatedPrice=N(item.harga);
    if(card.querySelector('.pm-item-discount')){updateCard(card,item);return;}

    const sub=subtotalEl(card); if(!sub)return;
    const box=document.createElement('div');
    box.className='pm-item-discount';
    box.innerHTML=`<div class="pm-item-discount-grid"><div class="field"><label>Diskon (%)</label><input class="pm-item-discount-pct" type="number" min="0" max="100" step="0.01" value="${N(item.diskon_persen)}"></div><div class="field"><label>Diskon (Rp)</label><input class="pm-item-discount-rp" value="${M(item.diskon_nominal)}" readonly></div></div>`;
    sub.insertAdjacentElement('beforebegin',box);
    const p=box.querySelector('.pm-item-discount-pct');
    const change=()=>{
      item.diskon_persen=Math.max(0,Math.min(100,N(p.value)));
      item.diskon_nominal=0;
      updateCard(card,item);
      grandTotal();
    };
    p.addEventListener('input',change);
    p.addEventListener('change',change);
    updateCard(card,item);
  }

  function enhance(){
    const c=document.querySelector('#items'); if(!c)return;
    c.querySelectorAll(':scope > .item').forEach(card=>ensure(card,itemFromCard(card)));
    grandTotal();
  }

  const st=document.createElement('style');
  st.id='pmCanonicalItemDiscountStyles';
  st.textContent=`#content .pm-item-discount{margin:12px 0 0;padding-top:12px;border-top:1px solid rgba(255,255,255,.07)}#content .pm-item-discount-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}#content .pm-item-discount label{font-size:12px;color:var(--muted,#9aa7bd)}#content .pm-item-discount-rp{background:rgba(255,255,255,.035)!important;color:#35e6a5!important;font-weight:700}@media(max-width:700px){#content .pm-item-discount-grid{grid-template-columns:1fr}}`;
  document.head.appendChild(st);

  new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});
  [0,150,350,700,1200,2000].forEach(ms=>setTimeout(enhance,ms));
  window.addEventListener('load',enhance);
  window.__PM_ITEM_DISCOUNT_API={state,rawSubtotal,grandTotal,enhance};
})();
