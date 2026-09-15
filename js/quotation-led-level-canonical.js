/* Priangan Multimedia — LED Level add-on
 * Level belongs to its LED card. It never searches for a global/first LED.
 * The quotation UI module remains the single authority for itemSubtotal.
 */
(function(){
  'use strict';
  if(window.__PM_LED_LEVEL_CANONICAL__)return;
  window.__PM_LED_LEVEL_CANONICAL__=true;
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0;};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const items=()=>Array.isArray(window.items)?window.items:[];
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const core=()=>window.__PM_QUOTATION_CORE||{};
  const isLevelMaster=m=>/level/i.test(`${S(m?.item)} ${S(m?.kategori)} ${S(m?.kode)}`)&&!/led\s*tv|televisi/i.test(`${S(m?.item)} ${S(m?.kategori)}`);
  const isLEDMaster=m=>{const t=`${S(m?.item)} ${S(m?.kategori)} ${S(m?.kode)}`.toLowerCase();return !/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(t)&&/videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(t);};
  const masterFor=item=>{if(typeof core().masterFor==='function')return core().masterFor(item);return masters().find(m=>S(m.kode)===S(item?.kode))||null;};
  const isLED=item=>isLEDMaster(masterFor(item));
  const days=item=>{if(typeof core().days==='function')return Math.max(1,N(core().days(item.mulai,item.selesai)));if(!item?.mulai||!item?.selesai)return 1;const a=new Date(S(item.mulai)+'T00:00:00'),b=new Date(S(item.selesai)+'T00:00:00');return Math.max(1,Math.round((b-a)/86400000)+1);};
  function levelMaster(item){const id=item?.level_master_harga_id;if(id!=null){const m=masters().find(x=>String(x.id)===String(id));if(m&&isLevelMaster(m))return m;}return null;}
  function levelSubtotal(item){if(!item?.level_enabled)return 0;const lm=levelMaster(item);if(!lm)return 0;const width=N(item.lebar),price=N(item.level_harga??lm.harga_jual),set=Math.max(1,N(item.qty)||1);return width*price*set*days(item);}
  function hideLevelProducts(){document.querySelectorAll('#items > .item select').forEach(select=>{[...select.options].forEach(o=>{const m=masters().find(x=>S(x.kode)===S(o.value));if(isLevelMaster(m))o.hidden=true;});});}
  function levelOptions(selected){return `<option value="">Tanpa Level</option>`+masters().filter(isLevelMaster).map(m=>`<option value="${S(m.id)}" ${String(m.id)===String(selected??'')?'selected':''}>[${S(m.kode)}] ${S(m.item)}</option>`).join('');}
  function addLevel(card,item){
    if(!isLED(item))return;
    if(card.querySelector('.pm-led-level-box')){syncLevel(card,item);return;}
    const dim=card.querySelector('.pm-item-body .dim');if(!dim)return;
    const box=document.createElement('div');box.className='pm-led-level-box';
    box.innerHTML=`<div class="pm-led-level-head"><label class="pm-led-level-toggle"><input type="checkbox" class="pm-led-level-enabled" ${item.level_enabled?'checked':''}> <span>Gunakan Level</span></label><span class="pm-led-level-note">Opsional</span></div><div class="pm-led-level-fields" style="display:${item.level_enabled?'grid':'none'}"><div class="field"><label>Jenis Level</label><select class="pm-led-level-master">${levelOptions(item.level_master_harga_id)}</select></div><div class="field"><label>Lebar Level</label><input class="pm-led-level-width" value="${N(item.lebar)||0} m" readonly></div><div class="field"><label>Tinggi Level (m)</label><input class="pm-led-level-height" type="number" min="0" step="0.01" value="${N(item.level_tinggi)}"></div><div class="field"><label>Harga Level / m</label><input class="pm-led-level-price" readonly value="${item.level_harga?M(item.level_harga):''}"></div></div><div class="pm-led-level-total" style="display:${item.level_enabled?'flex':'none'}"><span>Subtotal Level</span><b class="pm-led-level-subtotal">Rp 0</b></div>`;
    dim.insertAdjacentElement('afterend',box);
    const toggle=box.querySelector('.pm-led-level-enabled'),sel=box.querySelector('.pm-led-level-master'),h=box.querySelector('.pm-led-level-height');
    toggle.addEventListener('change',()=>{item.level_enabled=toggle.checked;if(!toggle.checked){item.level_master_harga_id=null;item.level_harga=0;item.level_tinggi=0;}syncLevel(card,item);refreshTotals();});
    sel.addEventListener('change',()=>{item.level_master_harga_id=sel.value?Number(sel.value):null;const lm=levelMaster(item);item.level_harga=lm?N(lm.harga_jual):0;syncLevel(card,item);refreshTotals();});
    h.addEventListener('input',()=>{item.level_tinggi=Math.max(0,N(h.value));refreshTotals();});
    syncLevel(card,item);
  }
  function syncLevel(card,item){const box=card.querySelector('.pm-led-level-box');if(!box)return;const on=!!item.level_enabled,fields=box.querySelector('.pm-led-level-fields'),total=box.querySelector('.pm-led-level-total'),sel=box.querySelector('.pm-led-level-master'),w=box.querySelector('.pm-led-level-width'),p=box.querySelector('.pm-led-level-price'),b=box.querySelector('.pm-led-level-subtotal');if(fields)fields.style.display=on?'grid':'none';if(total)total.style.display=on?'flex':'none';if(sel)sel.value=item.level_master_harga_id?String(item.level_master_harga_id):'';if(w)w.value=`${N(item.lebar)} m`;if(p){const lm=levelMaster(item);if(lm&&!N(item.level_harga))item.level_harga=N(lm.harga_jual);p.value=item.level_harga?M(item.level_harga):'';}if(b)b.textContent=M(levelSubtotal(item));}
  function refreshTotals(){
    if(typeof window.__PM_QUOTATION_UI_API?.updateTotal==='function')window.__PM_QUOTATION_UI_API.updateTotal();
    document.querySelectorAll('#items > .item').forEach(card=>{const it=items().find(x=>String(x.id)===String(card.dataset.itemId));if(it&&isLED(it))syncLevel(card,it);});
  }
  function enhance(){hideLevelProducts();document.querySelectorAll('#items > .item').forEach(card=>{const item=items().find(x=>String(x.id)===String(card.dataset.itemId));if(item&&isLED(item))addLevel(card,item);});refreshTotals();}
  const st=document.createElement('style');st.id='pmLedLevelStyles';st.textContent=`#content .pm-led-level-box{margin-top:12px;padding:12px 14px;border:1px solid rgba(77,124,255,.28);border-radius:12px;background:rgba(64,89,150,.06)}#content .pm-led-level-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.pm-led-level-toggle{display:flex;align-items:center;gap:8px;font-weight:700}.pm-led-level-toggle input{width:auto}.pm-led-level-note{font-size:11px;color:var(--muted,#9aa7bd)}#content .pm-led-level-fields{grid-template-columns:1.4fr .8fr .8fr 1fr;gap:12px;margin-top:10px}.pm-led-level-width{color:#9fb5ff!important}.pm-led-level-price{color:#35e6a5!important;font-weight:700}.pm-led-level-total{justify-content:flex-end;align-items:center;gap:12px;margin-top:10px;padding-top:9px;border-top:1px solid rgba(255,255,255,.07)}.pm-led-level-total b{color:#35e6a5}@media(max-width:800px){#content .pm-led-level-fields{grid-template-columns:1fr 1fr}}@media(max-width:520px){#content .pm-led-level-fields{grid-template-columns:1fr}}`;
  document.head.appendChild(st);
  document.addEventListener('change',e=>{if(e.target?.closest?.('#items'))requestAnimationFrame(enhance);},true);
  [200,600].forEach(ms=>setTimeout(enhance,ms));window.addEventListener('load',enhance);
  window.__PM_LED_LEVEL_API={isLED,levelSubtotal,enhance,refreshTotals};
})();
