/* Priangan Multimedia — Final LED Level controller
 * One owner for Level UI on LED items.
 * Level is configured directly inside each LED card; no Level dropdown.
 * Checkbox is the only switch. Level charge = LED width × Level price × Set.
 * Level is not multiplied by rental days.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_LEVEL_FINAL__)return;
  window.__PM_QUOTATION_LEVEL_FINAL__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const items=()=>Array.isArray(window.items)?window.items:[];
  const core=()=>window.__PM_QUOTATION_CORE||{};
  const cardItem=card=>items().find(x=>String(x.id)===String(card?.dataset.itemId));
  const isLED=it=>{
    const m=typeof core().masterFor==='function'?core().masterFor(it):null;
    const t=`${S(m?.item)} ${S(m?.kategori)} ${S(m?.kode)} ${S(it?.item)}`.toLowerCase();
    if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(t))return false;
    return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(t);
  };
  const days=it=>{
    if(typeof core().days==='function')return Math.max(1,N(core().days(it?.mulai,it?.selesai)));
    if(!it?.mulai||!it?.selesai)return 1;
    const a=new Date(S(it.mulai)+'T00:00:00'),b=new Date(S(it.selesai)+'T00:00:00');
    return Math.max(1,Math.round((b-a)/86400000)+1);
  };
  const setQty=it=>Math.max(1,N(it?.qty??it?.jumlah)||1);
  const levelBase=it=>it?.level_enabled?N(it.lebar)*N(it.level_harga)*setQty(it):0;
  const ledBase=it=>N(it.lebar)*N(it.tinggi)*N(it.harga??it.harga_jual)*setQty(it)*days(it);
  const base=it=>isLED(it)?Math.max(0,ledBase(it)+levelBase(it)):typeof core().itemSubtotal==='function'?Math.max(0,N(core().itemSubtotal(it))):0;
  const net=it=>{
    const b=base(it),pct=Math.max(0,Math.min(100,N(it?.diskon_persen))),rp=pct>0?Math.min(b,Math.round(b*pct/100)):Math.min(b,Math.max(0,N(it?.diskon_nominal)));
    return Math.max(0,b-rp);
  };

  function directMarkup(it){
    return `<div class="pm-led-level-head"><label class="pm-led-level-toggle"><input type="checkbox" class="pm-led-level-enabled" ${it.level_enabled?'checked':''}> <span>Gunakan Level</span></label><span class="pm-led-level-note">Opsional</span></div><div class="pm-led-level-fields"><div class="field"><label>Lebar Level (m)</label><input class="pm-led-level-width" value="${N(it.lebar)}" readonly></div><div class="field"><label>Tinggi Level (m)</label><input class="pm-led-level-height" type="number" min="0" step="0.01" value="${N(it.level_tinggi)||0}" ${it.level_enabled?'':'disabled'}></div><div class="field"><label>Harga Level / m</label><input class="pm-led-level-price" type="number" min="0" step="1" value="${N(it.level_harga)||''}" placeholder="Masukkan harga" ${it.level_enabled?'':'disabled'}></div></div><div class="pm-led-level-total"><span>Subtotal Level</span><b class="pm-led-level-subtotal">${M(levelBase(it))}</b></div>`;
  }

  function patchCore(){
    const c=core();
    if(!c.itemSubtotal||c.__pmDirectLevelBase)return;
    c.__pmDirectLevelBase=c.itemSubtotal;
    c.itemSubtotal=function(it){
      if(isLED(it))return Math.max(0,ledBase(it)+levelBase(it));
      return Math.max(0,N(c.__pmDirectLevelBase(it)));
    };
  }

  function recalc(){
    patchCore();
    const rows=items().filter(x=>S(x?.kode)&&S(x?.item));
    const baseTotal=rows.reduce((s,x)=>s+base(x),0);
    const itemDisc=rows.reduce((s,x)=>s+(base(x)-net(x)),0);
    const globalDisc=Math.max(0,N(window.__pmDiscountValue));
    const total=Math.max(0,baseTotal-itemDisc-Math.min(baseTotal-itemDisc,globalDisc));
    window.__pmDiscountBase=baseTotal-itemDisc;
    window.__pmItemDiscountTotal=itemDisc;
    window.__pmNetTotal=total;
    const a=document.querySelector('#total'); if(a)a.textContent=M(total);
    const g=document.querySelector('#pmGrand'); if(g)g.textContent=M(total);
    document.querySelectorAll('#items > .item').forEach(card=>{
      const it=cardItem(card); if(!it)return;
      const sub=card.querySelector('.pm-item-body > .sum b'); if(sub)sub.textContent=M(net(it));
      const dr=card.querySelector('.pm-item-discount-rp'); if(dr)dr.value=M(base(it)-net(it));
      const sb=card.querySelector('.pm-item-summary b'); if(sb)sb.textContent=M(net(it));
      const name=card.querySelector('.pm-item-body .pm-item-display-name');
      if(name&&isLED(it)){const h=N(it.level_tinggi);name.textContent=it.level_enabled&&h>0?`${S(it.item)} + Level ${h.toLocaleString('id-ID',{maximumFractionDigits:2})} m`:S(it.item);}
    });
    return total;
  }

  function renderBox(card,it){
    let box=card.querySelector('.pm-led-level-box');
    const dim=card.querySelector('.pm-item-body .dim');
    if(!dim)return;
    if(!box || box.dataset.pmDirectFinal!=='1'){
      const next=document.createElement('div');
      next.className='pm-led-level-box'; next.dataset.pmDirectFinal='1'; next.innerHTML=directMarkup(it);
      if(box)box.replaceWith(next); else dim.insertAdjacentElement('afterend',next);
      box=next;
      bind(card,it,box);
    }
    const on=!!it.level_enabled;
    box.querySelector('.pm-led-level-enabled').checked=on;
    const h=box.querySelector('.pm-led-level-height'),p=box.querySelector('.pm-led-level-price'),w=box.querySelector('.pm-led-level-width');
    if(w)w.value=String(N(it.lebar));
    if(h){if(document.activeElement!==h)h.value=N(it.level_tinggi)||0;h.disabled=!on;}
    if(p){if(document.activeElement!==p)p.value=it.level_harga?String(N(it.level_harga)):'';p.disabled=!on;}
    const fields=box.querySelector('.pm-led-level-fields'); if(fields)fields.style.display='grid';
    const total=box.querySelector('.pm-led-level-total'); if(total)total.style.display=on&&N(it.level_harga)>0?'flex':'none';
    const st=box.querySelector('.pm-led-level-subtotal'); if(st)st.textContent=M(levelBase(it));
  }

  function bind(card,it,box){
    if(box.dataset.pmBound==='1')return; box.dataset.pmBound='1';
    box.querySelector('.pm-led-level-enabled').addEventListener('change',e=>{it.level_enabled=!!e.target.checked;renderBox(card,it);recalc();});
    box.querySelector('.pm-led-level-height').addEventListener('input',e=>{it.level_tinggi=Math.max(0,N(e.target.value));renderBox(card,it);recalc();});
    box.querySelector('.pm-led-level-price').addEventListener('input',e=>{it.level_harga=Math.max(0,N(e.target.value));renderBox(card,it);recalc();});
  }

  function hydrate(){
    const c=document.querySelector('#items'); if(!c)return;
    c.querySelectorAll(':scope > .item').forEach(card=>{const it=cardItem(card);if(it&&isLED(it))renderBox(card,it);});
    recalc();
  }

  function wrapDraw(){
    const fn=window.drawItems;
    if(typeof fn!=='function'||fn.__pmDirectLevel)return false;
    const wrapped=function(){const r=fn.apply(this,arguments);requestAnimationFrame(hydrate);return r;};
    wrapped.__pmDirectLevel=true; window.drawItems=wrapped; return true;
  }

  hydrate();
  wrapDraw();
  window.addEventListener('load',()=>{hydrate();wrapDraw();});
  window.__PM_QUOTATION_LEVEL_API={hydrate,recalc,renderBox};
})();