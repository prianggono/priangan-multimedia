/* Priangan Multimedia — LED Level single owner
 * One controller for Level UI on LED quotation cards.
 * No Level dropdown. Checkbox is the only switch.
 * Level = LED width × Level price × Set, never × rental days.
 * Initializes after async quotation rendering via #content observer.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_LEVEL_SINGLE_OWNER_V6__) return;
  window.__PM_QUOTATION_LEVEL_SINGLE_OWNER_V6__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const items=()=>Array.isArray(window.items)?window.items:[];
  const cardItem=card=>items().find(x=>String(x.id)===String(card?.dataset.itemId));
  const isLEDText=it=>/videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/i.test(`${S(it?.item)} ${S(it?.kode)}`);
  const isLEDCard=card=>!!card?.querySelector('.pm-led-set-field') || isLEDText(cardItem(card));
  const qty=it=>Math.max(1,Math.round(N(it?.qty??it?.jumlah)||1));
  const days=it=>{
    const a=S(it?.mulai??it?.tanggal_mulai),b=S(it?.selesai??it?.tanggal_selesai);
    if(!a||!b) return 1;
    const da=new Date(a+'T00:00:00'),db=new Date(b+'T00:00:00');
    if(Number.isNaN(da.getTime())||Number.isNaN(db.getTime())) return 1;
    return Math.max(1,Math.round((db-da)/86400000)+1);
  };
  const levelSubtotal=it=>it?.level_enabled?N(it.lebar)*N(it.level_harga)*qty(it):0;
  const ledSubtotal=it=>N(it.lebar)*N(it.tinggi)*N(it.harga??it.harga_jual)*qty(it)*days(it);
  const baseSubtotal=it=>isLEDText(it)?Math.max(0,ledSubtotal(it)+levelSubtotal(it)):(typeof window.__PM_QUOTATION_CORE?.itemSubtotal==='function'?Math.max(0,N(window.__PM_QUOTATION_CORE.itemSubtotal(it))):0);
  const netSubtotal=it=>{
    const b=baseSubtotal(it),pct=Math.max(0,Math.min(100,N(it?.diskon_persen)));
    const disc=pct>0?Math.min(b,Math.round(b*pct/100)):Math.min(b,Math.max(0,N(it?.diskon_nominal)));
    return Math.max(0,b-disc);
  };

  function ensureStyle(){
    if(document.getElementById('pm-led-level-single-v6-style')) return;
    const st=document.createElement('style');
    st.id='pm-led-level-single-v6-style';
    st.textContent=`
      #content .pm-led-level-box{margin-top:12px;padding:12px 14px;border:1px solid rgba(77,124,255,.28);border-radius:12px;background:rgba(64,89,150,.06)}
      #content .pm-led-level-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
      #content .pm-led-level-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:12px}
      #content .pm-led-level-toggle{display:flex;align-items:center;gap:8px;cursor:pointer}
      #content .pm-led-level-note{font-size:12px;color:var(--muted,#9aa7bd)}
      #content .pm-led-level-total{align-items:center;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.07)}
      #content .pm-led-level-total b{color:#35e6a5}
      #content .pm-led-level-width[readonly]{opacity:.8}
      @media(max-width:760px){#content .pm-led-level-fields{grid-template-columns:1fr}}
    `;
    document.head.appendChild(st);
  }

  function refreshName(card,it){
    const h=N(it?.level_tinggi);
    const label=it?.level_enabled&&h>0?`${S(it.item)} + Level ${h.toLocaleString('id-ID',{maximumFractionDigits:2})} m`:S(it.item);
    card.querySelectorAll('.pm-item-display-name').forEach(el=>el.textContent=label);
  }

  function markup(it){
    const on=!!it?.level_enabled;
    return `<div class="pm-led-level-head"><label class="pm-led-level-toggle"><input type="checkbox" class="pm-led-level-enabled" ${on?'checked':''}> <span>Gunakan Level</span></label><span class="pm-led-level-note">Opsional</span></div><div class="pm-led-level-fields"><div class="field"><label>Lebar Level (m)</label><input class="pm-led-level-width" value="${N(it.lebar)}" readonly></div><div class="field"><label>Tinggi Level (m)</label><input class="pm-led-level-height" type="number" min="0" step="0.01" value="${N(it.level_tinggi)||0}" ${on?'':'disabled'}></div><div class="field"><label>Harga Level / m</label><input class="pm-led-level-price" type="number" min="0" step="1" value="${N(it.level_harga)||''}" placeholder="Masukkan harga" ${on?'':'disabled'}></div></div><div class="pm-led-level-total" style="display:${on&&N(it.level_harga)>0?'flex':'none'}"><span>Subtotal Level</span><b class="pm-led-level-subtotal">${M(levelSubtotal(it))}</b></div>`;
  }

  function updateBox(card,it){
    const box=card.querySelector('.pm-led-level-box'); if(!box) return;
    const on=!!it.level_enabled,active=document.activeElement;
    const cb=box.querySelector('.pm-led-level-enabled'),w=box.querySelector('.pm-led-level-width'),h=box.querySelector('.pm-led-level-height'),p=box.querySelector('.pm-led-level-price'),total=box.querySelector('.pm-led-level-total'),sub=box.querySelector('.pm-led-level-subtotal');
    if(cb) cb.checked=on;
    if(w) w.value=String(N(it.lebar));
    if(h){h.disabled=!on;if(active!==h)h.value=N(it.level_tinggi)||0;}
    if(p){p.disabled=!on;if(active!==p)p.value=it.level_harga?String(N(it.level_harga)):'';}
    if(total) total.style.display=on&&N(it.level_harga)>0?'flex':'none';
    if(sub) sub.textContent=M(levelSubtotal(it));
    refreshName(card,it);
  }

  function bind(card,it,box){
    if(box.dataset.pmLevelSingleBound==='1') return;
    box.dataset.pmLevelSingleBound='1';
    box.querySelector('.pm-led-level-enabled')?.addEventListener('change',e=>{it.level_enabled=!!e.target.checked;updateBox(card,it);recalc();});
    box.querySelector('.pm-led-level-height')?.addEventListener('input',e=>{it.level_tinggi=Math.max(0,N(e.target.value));updateBox(card,it);recalc();});
    box.querySelector('.pm-led-level-price')?.addEventListener('input',e=>{it.level_harga=Math.max(0,N(e.target.value));updateBox(card,it);recalc();});
  }

  function renderCard(card,it){
    if(!isLEDCard(card)||!it) return;
    let box=card.querySelector('.pm-led-level-box');
    if(box?.querySelector('.pm-led-level-master')){box.remove();box=null;}
    if(!box){
      const dim=card.querySelector('.pm-item-body .dim');
      if(!dim) return;
      box=document.createElement('div');
      box.className='pm-led-level-box';
      box.innerHTML=markup(it);
      dim.insertAdjacentElement('afterend',box);
    }
    bind(card,it,box);
    updateBox(card,it);
  }

  function recalc(){
    const rows=items().filter(x=>S(x?.kode)&&S(x?.item));
    const total=rows.reduce((sum,it)=>sum+netSubtotal(it),0);
    window.__pmNetTotal=total;
    const t=document.querySelector('#total'); if(t)t.textContent=M(total);
    const g=document.querySelector('#pmGrand'); if(g)g.textContent=M(total);
    document.querySelectorAll('#items > .item').forEach(card=>{
      const it=cardItem(card); if(!it)return;
      const sub=card.querySelector('.pm-item-body > .sum b'); if(sub)sub.textContent=M(netSubtotal(it));
      const dr=card.querySelector('.pm-item-discount-rp'); if(dr)dr.value=M(baseSubtotal(it)-netSubtotal(it));
      updateBox(card,it);
    });
    return total;
  }

  function hydrate(){
    ensureStyle();
    const c=document.querySelector('#items'); if(!c)return;
    c.querySelectorAll(':scope > .item').forEach(card=>{const it=cardItem(card);if(it)renderCard(card,it);});
    recalc();
  }

  function watchItems(){
    const c=document.querySelector('#items');
    if(!c||c.dataset.pmLevelSingleItemsWatch==='1') return;
    c.dataset.pmLevelSingleItemsWatch='1';
    const obs=new MutationObserver(()=>{
      if(window.__PM_LEVEL_HYDRATE_RUNNING__) return;
      window.__PM_LEVEL_HYDRATE_RUNNING__=true;
      try{hydrate();}finally{window.__PM_LEVEL_HYDRATE_RUNNING__=false;}
    });
    obs.observe(c,{childList:true,subtree:true});
  }

  function watchContent(){
    const c=document.querySelector('#content');
    if(!c||c.dataset.pmLevelSingleContentWatch==='1') return;
    c.dataset.pmLevelSingleContentWatch='1';
    const obs=new MutationObserver(()=>{
      const itemsEl=document.querySelector('#items');
      if(itemsEl){hydrate();watchItems();}
    });
    obs.observe(c,{childList:true,subtree:true});
    window.__PM_LEVEL_CONTENT_OBSERVER=obs;
  }

  function boot(){ensureStyle();hydrate();watchItems();watchContent();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
  window.__PM_QUOTATION_LEVEL_API={hydrate,recalc,render:renderCard,levelSubtotal};
})();