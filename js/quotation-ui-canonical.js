/* Priangan Multimedia — Unified Quotation UI
 * Owns negotiated price editor, LED Set, per-item discount and item totals.
 * Optional LED Level is supplied by quotation-led-level-canonical.js.
 * Designed without document.body MutationObserver.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_UI_CANONICAL__) return;
  window.__PM_QUOTATION_UI_CANONICAL__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0;};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const E=v=>S(v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const items=()=>Array.isArray(window.items)?window.items:[];
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const core=()=>window.__PM_QUOTATION_CORE||{};

  function masterFor(item){return typeof core().masterFor==='function'?core().masterFor(item):masters().find(m=>S(m.kode)===S(item?.kode))||null;}
  function mode(item){return typeof core().typeOf==='function'?core().typeOf(item):S(item?.tipe||'qty');}
  function isLED(item){const m=masterFor(item),t=`${S(m?.item)} ${S(m?.kategori)} ${S(m?.kode)}`.toLowerCase();if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(t))return false;return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(t);}
  function days(item){return typeof core().days==='function'?Math.max(1,N(core().days(item.mulai,item.selesai))):(()=>{if(!item?.mulai||!item?.selesai)return 1;const a=new Date(S(item.mulai)+'T00:00:00'),b=new Date(S(item.selesai)+'T00:00:00'),d=Math.round((b-a)/86400000);return d>=0?d+1:1})();}
  const originalSubtotal=typeof core().itemSubtotal==='function'?core().itemSubtotal:null;
  function levelAddon(item){const api=window.__PM_LED_LEVEL_API;return api&&typeof api.levelSubtotal==='function'?Math.max(0,N(api.levelSubtotal(item))):0;}
  function ledBase(item){return Math.max(0,N(item.lebar)*N(item.tinggi)*N(item.harga??item.harga_jual)*Math.max(1,N(item.qty)||1)*days(item));}
  function baseSubtotal(item){
    if(isLED(item))return ledBase(item)+levelAddon(item);
    return originalSubtotal?Math.max(0,N(originalSubtotal(item))):0;
  }
  function patchCore(){const c=core();if(!c.itemSubtotal)return false;if(!c.__pmUiBaseSubtotal)c.__pmUiBaseSubtotal=c.itemSubtotal;const base=c.__pmUiBaseSubtotal;c.itemSubtotal=function(item){if(isLED(item))return ledBase(item)+levelAddon(item);return Math.max(0,N(base(item)));};c.__pmQuotationUiSubtotalPatched=true;return true;}
  function discount(item){const base=baseSubtotal(item),pct=Math.max(0,Math.min(100,N(item.diskon_persen))),rp=pct>0?Math.min(base,Math.round(base*pct/100)):Math.min(base,Math.max(0,N(item.diskon_nominal)));return{base,pct,rp,net:Math.max(0,base-rp)};}
  function priceInput(card){return [...card.querySelectorAll('.field')].find(f=>/harga\s*(jual|penawaran)/i.test(S(f.querySelector('label')?.textContent)))?.querySelector('input')||null;}
  function subtotalEl(card){return [...card.querySelectorAll('.pm-item-body > .sum')].find(e=>/subtotal/i.test(S(e.querySelector('span')?.textContent)))||null;}

  function updateTotal(){
    patchCore();
    const rows=items().filter(x=>S(x.kode)&&S(x.item));
    const base=rows.reduce((s,x)=>s+discount(x).base,0),disc=rows.reduce((s,x)=>s+discount(x).rp,0),global=Math.max(0,N(window.__pmDiscountValue)),total=Math.max(0,base-disc-global);
    const totalEl=document.querySelector('#total'),grand=document.querySelector('#pmGrand');if(totalEl)totalEl.textContent=M(total);if(grand)grand.textContent=M(total);
    window.__pmDiscountBase=base-disc;window.__pmItemDiscountTotal=disc;window.__pmNetTotal=total;
    return{base,disc,global,total};
  }

  function addSet(card,item){
    if(!isLED(item))return;
    const dim=card.querySelector('.pm-item-body .dim');if(!dim||dim.querySelector('.pm-led-set-field'))return;
    const f=document.createElement('div');f.className='field pm-led-set-field';f.innerHTML=`<label>Set LED (Titik)</label><input class="pm-led-set-input" type="number" min="1" step="1" value="${Math.max(1,N(item.qty)||1)}">`;dim.appendChild(f);
    const input=f.querySelector('input');input.addEventListener('input',()=>{item.qty=Math.max(1,Math.round(N(input.value)||1));updateCard(card,item);updateTotal();});
  }

  function addDiscount(card,item){
    if(card.querySelector('.pm-item-discount'))return;
    const sub=subtotalEl(card);if(!sub)return;
    const box=document.createElement('div');box.className='pm-item-discount';box.innerHTML=`<div class="pm-item-discount-grid"><div class="field"><label>Diskon (%)</label><input class="pm-item-discount-pct" type="number" min="0" max="100" step="0.01" value="${N(item.diskon_persen)}"></div><div class="field"><label>Diskon (Rp)</label><input class="pm-item-discount-rp" value="${M(item.diskon_nominal)}" readonly></div></div>`;
    sub.insertAdjacentElement('beforebegin',box);
    const p=box.querySelector('.pm-item-discount-pct');p.addEventListener('input',()=>{item.diskon_persen=Math.max(0,Math.min(100,N(p.value)));item.diskon_nominal=0;updateCard(card,item);updateTotal();});
  }

  function addPriceEditor(card,item){
    const input=priceInput(card);if(!input||input.dataset.pmUnifiedPrice==='1')return;
    input.dataset.pmUnifiedPrice='1';input.readOnly=true;input.dataset.pmQuotePrice=String(N(item.harga));
    const wrap=input.parentElement;if(!wrap)return;const btn=document.createElement('button');btn.type='button';btn.className='btn secondary pm-edit-price';btn.textContent='Edit Harga';btn.style.marginTop='6px';btn.style.fontSize='12px';btn.style.padding='5px 10px';
    btn.addEventListener('click',()=>{if(input.readOnly){input.readOnly=false;btn.textContent='Simpan Harga';input.focus();input.select();return;}const v=Math.max(0,N(input.value));item.harga=v;item.harga_jual=v;item.__harga_diedit=true;input.readOnly=true;btn.textContent='Edit Harga';updateCard(card,item);updateTotal();});
    wrap.appendChild(btn);
  }

  function updateCard(card,item){
    const d=discount(item),sub=subtotalEl(card);if(sub?.querySelector('b'))sub.querySelector('b').textContent=M(d.net);
    const p=card.querySelector('.pm-item-discount-pct'),r=card.querySelector('.pm-item-discount-rp');if(p&&document.activeElement!==p)p.value=String(Number(d.pct.toFixed(2)));if(r)r.value=M(d.rp);
    const summary=card.querySelector('.pm-item-summary');if(summary){const b=summary.querySelector('b');if(b)b.textContent=M(d.net);if(isLED(item)){const sp=summary.querySelector('.pm-summary-main span');if(sp)sp.textContent=`${N(item.lebar)} × ${N(item.tinggi)} m • ${Math.max(1,N(item.qty)||1)} set • ${item.level_enabled?'Level aktif • ':''}${item.mulai&&item.selesai?`${item.mulai} → ${item.selesai}`:'Jadwal belum lengkap'}`;}}
  }

  function enhance(){
    if(!document.querySelector('#items'))return;
    patchCore();
    document.querySelectorAll('#items > .item').forEach(card=>{const item=items().find(x=>String(x.id)===String(card.dataset.itemId));if(!item)return;addPriceEditor(card,item);addDiscount(card,item);addSet(card,item);updateCard(card,item);});
    updateTotal();
  }

  function wrapDraw(){const fn=window.drawItems;if(typeof fn!=='function'||fn.__pmUnifiedDraw)return false;const wrapped=function(){const r=fn.apply(this,arguments);requestAnimationFrame(enhance);return r;};wrapped.__pmUnifiedDraw=true;window.drawItems=wrapped;return true;}
  function wrapPrint(){const fn=window.printQuote;if(typeof fn!=='function'||fn.__pmUnifiedPrint)return false;const wrapped=function(){const r=fn.apply(this,arguments);requestAnimationFrame(()=>{const area=document.querySelector('#pmPrintArea');if(!area)return;[...area.querySelectorAll('.pm-items tbody tr')].forEach(row=>{const strong=row.querySelector('td:nth-child(2) strong');const item=items().find(x=>S(x.item)===S(strong?.textContent));if(!item)return;if(isLED(item)){const q=row.querySelector('td:nth-child(3)'),sub=row.querySelector('td:nth-child(6)');if(q)q.textContent=`${N(item.lebar)} × ${N(item.tinggi)} m² • ${Math.max(1,N(item.qty)||1)} set`;if(sub)sub.textContent=M(discount(item).net);}});});return r;};wrapped.__pmUnifiedPrint=true;window.printQuote=wrapped;return true;}

  const st=document.createElement('style');st.id='pmUnifiedQuotationUIStyles';st.textContent='#content .pm-item-discount{margin:12px 0 0;padding-top:12px;border-top:1px solid rgba(255,255,255,.07)}#content .pm-item-discount-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}#content .pm-item-discount label{font-size:12px;color:var(--muted,#9aa7bd)}#content .pm-item-discount-rp{background:rgba(255,255,255,.035)!important;color:#35e6a5!important;font-weight:700}#content .pm-led-set-field{margin-top:12px}#content .pm-led-set-input{font-weight:700}@media(max-width:700px){#content .pm-item-discount-grid{grid-template-columns:1fr}}';document.head.appendChild(st);

  document.addEventListener('change',e=>{if(e.target?.closest?.('#items'))requestAnimationFrame(enhance);},true);
  [0,100,300,700].forEach(ms=>setTimeout(()=>{wrapDraw();wrapPrint();enhance();},ms));
  window.addEventListener('load',()=>{wrapDraw();wrapPrint();enhance();});
  window.__PM_QUOTATION_UI_API={enhance,updateTotal,isLED,baseSubtotal,discount};
})();
