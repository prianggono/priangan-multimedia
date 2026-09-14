/* Priangan Multimedia — Canonical LED set rule
 * LED/Videotron: area x negotiated price x Set x days.
 * For LED items only, penawaran_items.qty represents Set.
 * Other item types remain unchanged.
 */
(function(){
  'use strict';
  if(window.__PM_LED_SET_CANONICAL__) return;
  window.__PM_LED_SET_CANONICAL__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const items=()=>Array.isArray(window.items)?window.items:[];
  const core=()=>window.__PM_QUOTATION_CORE||{};

  function masterFor(item){
    const c=core();
    if(typeof c.masterFor==='function') return c.masterFor(item);
    const ms=Array.isArray(window.masters)?window.masters:[];
    return ms.find(m=>S(m.kode)===S(item?.kode))||null;
  }
  function isLED(item){
    const m=masterFor(item), text=`${S(m?.item)} ${S(m?.kategori)} ${S(m?.kode)}`.toLowerCase();
    if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(text)) return false;
    return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/i.test(text);
  }
  function days(item){
    const c=core();
    if(typeof c.days==='function') return Math.max(1,N(c.days(item.mulai,item.selesai)));
    if(!item?.mulai||!item?.selesai)return 1;
    const a=new Date(S(item.mulai)+'T00:00:00'),b=new Date(S(item.selesai)+'T00:00:00');
    const d=Math.round((b-a)/86400000);return d>=0?d+1:1;
  }
  function ledSubtotal(item){
    return Math.max(0,N(item?.lebar))*Math.max(0,N(item?.tinggi))*Math.max(0,N(item?.harga??item?.harga_jual))*Math.max(1,N(item?.qty??1))*days(item);
  }
  function netSubtotal(item){
    const base=customSubtotal(item);
    const pct=Math.max(0,Math.min(100,N(item?.diskon_persen)));
    const nominal=pct>0?Math.min(base,Math.round(base*pct/100)):Math.min(base,Math.max(0,N(item?.diskon_nominal)));
    return Math.max(0,base-nominal);
  }
  let originalSubtotal=null;
  function customSubtotal(item){
    if(isLED(item)) return ledSubtotal(item);
    return typeof originalSubtotal==='function'?Math.max(0,N(originalSubtotal(item))):0;
  }

  function patchCore(){
    const c=core();
    if(!c.itemSubtotal) return false;
    if(!originalSubtotal) originalSubtotal=c.itemSubtotal;
    c.itemSubtotal=customSubtotal;
    c.__pmLedSetPatched=true;
    return true;
  }

  function updateTotals(){
    patchCore();
    const valid=items().filter(x=>x&&S(x.kode)&&S(x.item));
    const base=valid.reduce((s,x)=>s+customSubtotal(x),0);
    const itemDiscount=valid.reduce((s,x)=>{
      const b=customSubtotal(x),p=Math.max(0,Math.min(100,N(x.diskon_persen))),r=p>0?Math.min(b,Math.round(b*p/100)):Math.min(b,Math.max(0,N(x.diskon_nominal)));
      return s+r;
    },0);
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

  function findPrice(card){
    return [...card.querySelectorAll('.field')].find(f=>/harga jual/i.test(S(f.querySelector('label')?.textContent)))?.querySelector('input')||null;
  }
  function addSetField(card,item){
    if(!isLED(item))return;
    const dim=card.querySelector('.pm-item-body .dim');
    if(!dim)return;
    let field=dim.querySelector('.pm-led-set-field');
    if(!field){
      field=document.createElement('div');field.className='field pm-led-set-field';
      field.innerHTML=`<label>Set LED (Titik)</label><input class="pm-led-set-input" type="number" min="1" step="1" value="${Math.max(1,N(item.qty)||1)}">`;
      dim.appendChild(field);
      const input=field.querySelector('input');
      const change=()=>{
        item.qty=Math.max(1,Math.round(N(input.value)||1));
        updateCard(card,item);
        updateTotals();
      };
      input.addEventListener('input',change);
      input.addEventListener('change',change);
    }else{
      const input=field.querySelector('input');if(input&&document.activeElement!==input)input.value=String(Math.max(1,N(item.qty)||1));
    }
  }

  function discountNet(item){
    const b=customSubtotal(item),p=Math.max(0,Math.min(100,N(item.diskon_persen))),r=p>0?Math.min(b,Math.round(b*p/100)):Math.min(b,Math.max(0,N(item.diskon_nominal)));
    return Math.max(0,b-r);
  }

  function patchCard(card,item){
    if(!isLED(item))return;
    addSetField(card,item);
    const sub=card.querySelector('.pm-item-body > .sum');
    if(sub?.querySelector('b'))sub.querySelector('b').textContent=M(discountNet(item));
    const summary=card.querySelector('.pm-item-summary');
    if(summary){
      const main=summary.querySelector('.pm-summary-main span');
      if(main){const w=N(item.lebar),h=N(item.tinggi),set=Math.max(1,N(item.qty)||1);const schedule=item.mulai&&item.selesai?`${item.mulai} → ${item.selesai}`:'Jadwal belum lengkap';main.textContent=`${w} × ${h} m • ${set} set • ${schedule}`;}
      const b=summary.querySelector('b');if(b)b.textContent=M(discountNet(item));
    }
    const price=findPrice(card);if(price&&!item.diskon_persen)price.value=M(item.harga);
  }

  function enhance(){
    patchCore();
    const c=document.querySelector('#items');
    if(c)c.querySelectorAll(':scope > .item').forEach(card=>{const item=items().find(x=>String(x.id)===String(card.dataset.itemId));if(item)patchCard(card,item);});
    updateTotals();
    patchPrintPreview();
  }

  function patchPrintPreview(){
    const area=document.querySelector('#pmPrintArea');if(!area)return;
    const rows=[...area.querySelectorAll('.pm-items tbody tr')];
    rows.forEach(row=>{
      const strong=row.querySelector('td:nth-child(2) strong');if(!strong)return;
      const name=S(strong.textContent);
      const item=items().find(x=>S(x.item)===name);
      if(!item||!isLED(item))return;
      const q=row.querySelector('td:nth-child(3)');
      const sub=row.querySelector('td:nth-child(6)');
      const set=Math.max(1,N(item.qty)||1);
      if(q)q.textContent=`${N(item.lebar)} × ${N(item.tinggi)} m² • ${set} set`;
      if(sub)sub.textContent=M(discountNet(item));
    });
  }

  function patchPick(){
    const p=window.pick;if(typeof p!=='function'||p.__pmLedSetWrapped)return false;
    const wrapped=function(id,kode){
      const r=p.apply(this,arguments);
      const item=items().find(x=>String(x.id)===String(id));
      if(item&&isLED(item))item.qty=Math.max(1,N(item.qty)||1);
      requestAnimationFrame(enhance);
      return r;
    };
    wrapped.__pmLedSetWrapped=true;window.pick=wrapped;return true;
  }

  const style=document.createElement('style');
  style.id='pmLedSetStyles';
  style.textContent=`#content .pm-led-set-field{min-width:0}#content .pm-led-set-field label{font-weight:600}#content .pm-led-set-input{border-color:rgba(77,141,255,.45)!important;font-weight:700}#content .pm-item-summary .pm-summary-main span{white-space:normal}`;
  document.head.appendChild(style);

  new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('change',e=>{if(e.target?.closest?.('#items'))requestAnimationFrame(enhance);},true);
  [0,150,350,700,1200,2000].forEach(ms=>setTimeout(()=>{patchCore();patchPick();enhance();},ms));
  window.addEventListener('load',()=>{patchCore();patchPick();enhance();});
  window.__PM_LED_SET_API={isLED,ledSubtotal,customSubtotal,netSubtotal,updateTotals,enhance};
})();
