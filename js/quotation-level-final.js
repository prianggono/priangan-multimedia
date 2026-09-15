/* Priangan Multimedia — LED Level final authority
 * The quotation UI used to have two Level owners:
 * quotation-ui-canonical.js created a master/dropdown Level box,
 * while this file attempted to add a second direct Level box.
 * This file is now the last-mile authority: it identifies LED cards from
 * the rendered Set LED field, replaces any legacy Level box, and observes
 * redraws so the legacy UI cannot come back.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_LEVEL_DIRECT_V4__) return;
  window.__PM_QUOTATION_LEVEL_DIRECT_V4__ = true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const items=()=>Array.isArray(window.items)?window.items:[];
  const cardItem=card=>items().find(x=>String(x.id)===String(card?.dataset.itemId));

  /* DOM is the authoritative LED detector for this UI. This intentionally
     does not depend on master/category lookups being ready. */
  const isLEDCard=card=>!!card?.querySelector('.pm-led-set-field');
  const qty=it=>Math.max(1,Math.round(N(it?.qty??it?.jumlah)||1));

  function levelSubtotal(it){
    if(!it?.level_enabled) return 0;
    return N(it.lebar)*N(it.level_harga)*qty(it);
  }

  function ledSubtotal(it){
    const start=S(it?.mulai??it?.tanggal_mulai), end=S(it?.selesai??it?.tanggal_selesai);
    let days=1;
    if(start&&end){
      const a=new Date(start+'T00:00:00');
      const b=new Date(end+'T00:00:00');
      const d=Math.round((b-a)/86400000);
      days=Math.max(1,d+1);
    }
    return N(it?.lebar)*N(it?.tinggi)*N(it?.harga??it?.harga_jual)*qty(it)*days;
  }

  function base(it){
    const original=window.__PM_QUOTATION_CORE?.itemSubtotal;
    if(isLEDItem(it)) return Math.max(0,ledSubtotal(it)+levelSubtotal(it));
    return typeof original==='function'?Math.max(0,N(original(it))):0;
  }

  function isLEDItem(it){
    const text=`${S(it?.item)} ${S(it?.kode)}`.toLowerCase();
    return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(text);
  }

  function discountNet(it){
    const b=base(it);
    const pct=Math.max(0,Math.min(100,N(it?.diskon_persen)));
    const rp=pct>0?Math.min(b,Math.round(b*pct/100)):Math.min(b,Math.max(0,N(it?.diskon_nominal)));
    return Math.max(0,b-rp);
  }

  function markup(it){
    const on=!!it.level_enabled;
    return `
      <div class="pm-led-level-head">
        <label class="pm-led-level-toggle">
          <input type="checkbox" class="pm-led-level-enabled" ${on?'checked':''}>
          <span>Gunakan Level</span>
        </label>
        <span class="pm-led-level-note">Opsional</span>
      </div>
      <div class="pm-led-level-fields">
        <div class="field">
          <label>Lebar Level (m)</label>
          <input class="pm-led-level-width" value="${N(it.lebar)}" readonly>
        </div>
        <div class="field">
          <label>Tinggi Level (m)</label>
          <input class="pm-led-level-height" type="number" min="0" step="0.01" value="${N(it.level_tinggi)||0}" ${on?'':'disabled'}>
        </div>
        <div class="field">
          <label>Harga Level / m</label>
          <input class="pm-led-level-price" type="number" min="0" step="1" value="${N(it.level_harga)||''}" placeholder="Masukkan harga" ${on?'':'disabled'}>
        </div>
      </div>
      <div class="pm-led-level-total" style="display:${on&&N(it.level_harga)>0?'flex':'none'}">
        <span>Subtotal Level</span>
        <b class="pm-led-level-subtotal">${M(levelSubtotal(it))}</b>
      </div>`;
  }

  function style(){
    if(document.getElementById('pm-led-level-direct-v4-style')) return;
    const st=document.createElement('style');
    st.id='pm-led-level-direct-v4-style';
    st.textContent=`
      #content .pm-led-level-box{margin-top:12px;padding:12px 14px;border:1px solid rgba(77,124,255,.28);border-radius:12px;background:rgba(64,89,150,.06)}
      #content .pm-led-level-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
      #content .pm-led-level-fields{display:grid!important;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px}
      #content .pm-led-level-width[readonly]{opacity:.8}
      #content .pm-led-level-total{display:flex;align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.07)}
      #content .pm-led-level-total b{color:#35e6a5}
      @media(max-width:760px){#content .pm-led-level-fields{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(st);
  }

  function bind(card,it,box){
    if(box.dataset.pmDirectBound==='1') return;
    box.dataset.pmDirectBound='1';

    const toggle=box.querySelector('.pm-led-level-enabled');
    const h=box.querySelector('.pm-led-level-height');
    const p=box.querySelector('.pm-led-level-price');

    toggle?.addEventListener('change',()=>{
      it.level_enabled=!!toggle.checked;
      render(card,it);
      recalc();
    });
    h?.addEventListener('input',()=>{
      it.level_tinggi=Math.max(0,N(h.value));
      updateBox(card,it);
      recalc();
    });
    p?.addEventListener('input',()=>{
      it.level_harga=Math.max(0,N(p.value));
      updateBox(card,it);
      recalc();
    });
  }

  function updateBox(card,it){
    const box=card?.querySelector('.pm-led-level-box');
    if(!box) return;
    const on=!!it.level_enabled;
    const active=document.activeElement;
    const w=box.querySelector('.pm-led-level-width');
    const h=box.querySelector('.pm-led-level-height');
    const p=box.querySelector('.pm-led-level-price');
    const total=box.querySelector('.pm-led-level-total');
    const st=box.querySelector('.pm-led-level-subtotal');
    if(w) w.value=String(N(it.lebar));
    if(h){h.disabled=!on;if(active!==h)h.value=N(it.level_tinggi)||0;}
    if(p){p.disabled=!on;if(active!==p)p.value=it.level_harga?String(N(it.level_harga)):'';}
    if(total) total.style.display=on&&N(it.level_harga)>0?'flex':'none';
    if(st) st.textContent=M(levelSubtotal(it));
  }

  function render(card,it){
    if(!isLEDCard(card)||!it) return;
    let box=card.querySelector('.pm-led-level-box');

    /* Critical blocker fix: canonical UI creates a legacy box containing
       .pm-led-level-master. Replace it completely. */
    if(box?.querySelector('.pm-led-level-master')){
      const next=document.createElement('div');
      next.className='pm-led-level-box';
      next.dataset.pmDirectBound='0';
      next.innerHTML=markup(it);
      box.replaceWith(next);
      box=next;
      bind(card,it,box);
      updateBox(card,it);
      return;
    }

    if(!box){
      const dim=card.querySelector('.pm-item-body .dim');
      if(!dim) return;
      box=document.createElement('div');
      box.className='pm-led-level-box';
      box.dataset.pmDirectBound='0';
      box.innerHTML=markup(it);
      dim.insertAdjacentElement('afterend',box);
      bind(card,it,box);
    }
    updateBox(card,it);
  }

  const markup=markupFor;
  function markupFor(it){ return markupTemplate(it); }
  function markupTemplate(it){
    const on=!!it.level_enabled;
    return `
      <div class="pm-led-level-head">
        <label class="pm-led-level-toggle"><input type="checkbox" class="pm-led-level-enabled" ${on?'checked':''}> <span>Gunakan Level</span></label>
        <span class="pm-led-level-note">Opsional</span>
      </div>
      <div class="pm-led-level-fields">
        <div class="field"><label>Lebar Level (m)</label><input class="pm-led-level-width" value="${N(it.lebar)}" readonly></div>
        <div class="field"><label>Tinggi Level (m)</label><input class="pm-led-level-height" type="number" min="0" step="0.01" value="${N(it.level_tinggi)||0}" ${on?'':'disabled'}></div>
        <div class="field"><label>Harga Level / m</label><input class="pm-led-level-price" type="number" min="0" step="1" value="${N(it.level_harga)||''}" placeholder="Masukkan harga" ${on?'':'disabled'}></div>
      </div>
      <div class="pm-led-level-total" style="display:${on&&N(it.level_harga)>0?'flex':'none'}"><span>Subtotal Level</span><b class="pm-led-level-subtotal">${M(levelSubtotal(it))}</b></div>`;
  }

  function recalc(){
    const rows=items().filter(x=>S(x?.kode)&&S(x?.item));
    const subtotal=rows.reduce((s,it)=>s+base(it),0);
    const itemDisc=rows.reduce((s,it)=>s+(base(it)-discountNet(it)),0);
    const net=Math.max(0,subtotal-itemDisc);
    const globalDisc=Math.min(net,Math.max(0,N(window.__pmDiscountValue)));
    const total=Math.max(0,net-globalDisc);
    window.__pmDiscountBase=net;
    window.__pmItemDiscountTotal=itemDisc;
    window.__pmNetTotal=total;
    const t=document.querySelector('#total'); if(t)t.textContent=M(total);
    const g=document.querySelector('#pmGrand'); if(g)g.textContent=M(total);
    document.querySelectorAll('#items > .item').forEach(card=>{
      const it=cardItem(card); if(!it)return;
      const sub=card.querySelector('.pm-item-body > .sum b'); if(sub)sub.textContent=M(discountNet(it));
      const dr=card.querySelector('.pm-item-discount-rp'); if(dr)dr.value=M(base(it)-discountNet(it));
      updateBox(card,it);
    });
    return total;
  }

  function discountNet(it){
    const b=base(it);
    const pct=Math.max(0,Math.min(100,N(it?.diskon_persen)));
    const rp=pct>0?Math.min(b,Math.round(b*pct/100)):Math.min(b,Math.max(0,N(it?.diskon_nominal)));
    return Math.max(0,b-rp);
  }

  function hydrate(){
    style();
    const c=document.querySelector('#items');
    if(!c) return;
    c.querySelectorAll(':scope > .item').forEach(card=>{
      const it=cardItem(card);
      if(it&&isLEDCard(card)) render(card,it);
    });
    recalc();
  }

  function installObserver(){
    const c=document.querySelector('#items');
    if(!c||c.dataset.pmDirectObserver==='1') return;
    c.dataset.pmDirectObserver='1';
    const obs=new MutationObserver(()=>{
      clearTimeout(window.__PM_LED_LEVEL_HYDRATE_TIMER);
      window.__PM_LED_LEVEL_HYDRATE_TIMER=setTimeout(hydrate,0);
    });
    obs.observe(c,{childList:true,subtree:true});
    window.__PM_LED_LEVEL_OBSERVER=obs;
  }

  function wrapDraw(){
    const fn=window.drawItems;
    if(typeof fn!=='function'||fn.__pmDirectLevelV4) return false;
    /* already wrapped */
    return true;
  }

  function wrapCanonicalDraw(){
    const fn=window.drawItems;
    if(typeof fn!=='function'||fn.__pmDirectLevelV4) return false;
    return true;
  }

  function hookDraw(){
    const fn=window.drawItems;
    if(typeof fn!=='function'||fn.__pmDirectLevelV4)return;
    const wrapped=function(){
      const r=fn.apply(this,arguments);
      requestAnimationFrame(()=>{hydrate();installObserver();});
      return r;
    };
    wrapped.__pmDirectLevelV4=true;
    window.drawItems=wrapped;
  }

  function boot(){
    style();
    hydrate();
    installObserver();
    hookDraw();
    setTimeout(()=>{hydrate();installObserver();hookDraw();},50);
    setTimeout(()=>{hydrate();installObserver();},250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();

  window.__PM_QUOTATION_LEVEL_API={hydrate,recalc,render,levelSubtotal};
})();