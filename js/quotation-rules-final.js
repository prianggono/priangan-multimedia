/* Priangan Multimedia — Final quotation calculation rules
 * Single calculation helper for LED/Level.
 * LED = width x height x negotiated price x set x days.
 * Level = LED width x entered/saved level price x set. NEVER x days.
 * Master price is only the initial default; quotation price stays negotiated.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_RULES_FINAL__)return;
  window.__PM_QUOTATION_RULES_FINAL__=true;
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0;};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const items=()=>Array.isArray(window.items)?window.items:[];
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const core=()=>window.__PM_QUOTATION_CORE||{};
  const days=(a,b)=>{if(typeof core().days==='function')return Math.max(1,N(core().days(a,b)));if(!a||!b)return 1;const x=new Date(S(a)+'T00:00:00'),y=new Date(S(b)+'T00:00:00'),d=Math.round((y-x)/86400000);return d>=0?d+1:1;};
  const masterFor=i=>{const id=i?.master_id??i?.master_harga_id;if(id!=null){const m=masters().find(x=>String(x.id)===String(id));if(m)return m;}return masters().find(x=>S(x.kode)===S(i?.kode))||null;};
  const isLED=i=>{const m=masterFor(i),t=`${S(m?.item)} ${S(m?.kategori)} ${S(m?.kode)} ${S(i?.item)}`.toLowerCase();if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(t))return false;return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(t);};
  const isLevelMaster=m=>{const t=`${S(m?.item)} ${S(m?.kategori)} ${S(m?.kode)}`.toLowerCase();return /level/.test(t)&&!/led\s*tv|televisi/.test(t);};
  const levelMaster=i=>{const id=i?.level_master_harga_id;return id==null?null:masters().find(m=>String(m.id)===String(id)&&isLevelMaster(m))||null;};
  const ledPrice=i=>Math.max(0,N(i?.harga??i?.harga_jual));
  const levelPrice=i=>Math.max(0,N(i?.level_harga)||(levelMaster(i)?N(levelMaster(i).harga_jual):0));
  const levelAmount=i=>{if(!i?.level_enabled||!levelMaster(i))return 0;return Math.max(0,N(i.lebar))*levelPrice(i)*Math.max(1,N(i.qty)||1);};
  const ledAmount=i=>Math.max(0,N(i.lebar)*N(i.tinggi)*ledPrice(i)*Math.max(1,N(i.qty)||1)*days(i.mulai,i.selesai));
  let baseOriginal=null;
  function base(i){return isLED(i)?ledAmount(i)+levelAmount(i):Math.max(0,N(baseOriginal?baseOriginal(i):0));}
  const discount=i=>{const b=base(i),p=Math.max(0,Math.min(100,N(i?.diskon_persen))),r=p>0?Math.min(b,Math.round(b*p/100)):Math.min(b,Math.max(0,N(i?.diskon_nominal)));return{base:b,pct:p,rp:r,net:Math.max(0,b-r)};};
  function installCoreBridge(){const c=core();if(!c||typeof c.itemSubtotal!=='function')return false;if(c.__PM_FINAL_RULES_DESCRIPTOR__)return true;baseOriginal=c.__PM_FINAL_RULES_BASE||c.itemSubtotal;c.__PM_FINAL_RULES_BASE=baseOriginal;let finalFn=i=>isLED(i)?ledAmount(i)+levelAmount(i):Math.max(0,N(baseOriginal(i)));try{Object.defineProperty(c,'itemSubtotal',{configurable:true,enumerable:true,get(){return finalFn;},set(fn){if(typeof fn==='function'&&fn!==finalFn){baseOriginal=fn;c.__PM_FINAL_RULES_BASE=fn;finalFn=i=>isLED(i)?ledAmount(i)+levelAmount(i):Math.max(0,N(baseOriginal(i)));}}});c.__PM_FINAL_RULES_DESCRIPTOR__=true;return true;}catch(e){c.itemSubtotal=finalFn;c.__PM_FINAL_RULES_DESCRIPTOR__=true;return true;}}
  function itemForCard(card){const id=card?.dataset?.itemId;return items().find(x=>String(x.id)===String(id))||null;}
  function refreshCard(card,i){const d=discount(i);const sum=[...card.querySelectorAll('.pm-item-body > .sum')].find(e=>/subtotal/i.test(S(e.querySelector('span')?.textContent)));if(sum?.querySelector('b'))sum.querySelector('b').textContent=M(d.net);const rp=card.querySelector('.pm-item-discount-rp');if(rp)rp.value=M(d.rp);const lvl=card.querySelector('.pm-led-level-subtotal');if(lvl)lvl.textContent=M(levelAmount(i));const lp=card.querySelector('.pm-led-level-price');if(lp&&document.activeElement!==lp)lp.value=M(levelPrice(i));}
  function refreshTotal(){installCoreBridge();const rows=items().filter(x=>S(x.kode)&&S(x.item)),baseTotal=rows.reduce((s,i)=>s+discount(i).base,0),itemDisc=rows.reduce((s,i)=>s+discount(i).rp,0),globalDisc=Math.max(0,N(window.__pmDiscountValue)),total=Math.max(0,baseTotal-itemDisc-globalDisc);const totalEl=document.querySelector('#total');if(totalEl)totalEl.textContent=M(total);const grand=document.querySelector('#pmGrand');if(grand)grand.textContent=M(total);window.__pmDiscountBase=baseTotal-itemDisc;window.__pmItemDiscountTotal=itemDisc;window.__pmNetTotal=total;return total;}
  function enableLevelPrice(){document.addEventListener('focus',e=>{const el=e.target;if(!el?.matches?.('.pm-led-level-price'))return;el.readOnly=false;el.dataset.pmEditable='1';el.value=String(N(el.value)||0);},true);document.addEventListener('input',e=>{const el=e.target;if(!el?.matches?.('.pm-led-level-price'))return;const card=el.closest('#items > .item'),i=itemForCard(card);if(!i)return;i.level_harga=Math.max(0,N(el.value));refreshCard(card,i);refreshTotal();},true);document.addEventListener('blur',e=>{const el=e.target;if(!el?.matches?.('.pm-led-level-price'))return;const card=el.closest('#items > .item'),i=itemForCard(card);if(!i)return;el.value=M(i.level_harga);el.readOnly=false;},true);}
  function observer(){let root=null,ob=null;const attach=()=>{const c=document.querySelector('#items');if(!c||c===root)return;if(ob)ob.disconnect();root=c;ob=new MutationObserver(()=>requestAnimationFrame(()=>{installCoreBridge();c.querySelectorAll(':scope > .item').forEach(card=>{const i=itemForCard(card);if(i)refreshCard(card,i);});refreshTotal();}));ob.observe(c,{childList:true,subtree:false});};[0,200,600,1200].forEach(ms=>setTimeout(attach,ms));window.addEventListener('load',attach);}
  enableLevelPrice();installCoreBridge();observer();
  window.__PM_QUOTATION_RULES_API={days,masterFor,isLED,levelMaster,ledAmount,levelAmount,base,discount,refreshTotal,applyCore:installCoreBridge};
})();