/* Priangan Multimedia — Business Rules Canonical
 * Final authority for LED/Level quotation calculation and customer document print sync.
 * LED: width * height * negotiated price * set * days.
 * Optional Level: LED width * level price * set. Level is NOT multiplied by days.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_BUSINESS_RULES_CANONICAL__)return;
  window.__PM_QUOTATION_BUSINESS_RULES_CANONICAL__=true;
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0;};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const items=()=>Array.isArray(window.items)?window.items:[];
  const core=()=>window.__PM_QUOTATION_CORE||{};
  const days=(a,b)=>{if(!a||!b)return 1;const x=new Date(S(a)+'T00:00:00'),y=new Date(S(b)+'T00:00:00'),d=Math.round((y-x)/86400000);return d>=0?d+1:1;};
  const masterFor=item=>{const id=item?.master_id??item?.masterId??item?.id_master??item?.master_harga_id;if(id!=null){const byId=masters().find(m=>String(m.id)===String(id));if(byId)return byId;}return masters().find(m=>S(m.kode)===S(item?.kode))||masters().find(m=>S(m.item).toLowerCase()===S(item?.item).toLowerCase())||null;};
  const isLevelMaster=m=>{const t=`${S(m?.item)} ${S(m?.kategori)} ${S(m?.kode)}`.toLowerCase();return /level/.test(t)&&!/led\s*tv|televisi/.test(t);};
  const isLED=item=>{const m=masterFor(item),t=`${S(m?.item)} ${S(m?.kategori)} ${S(m?.kode)}`.toLowerCase();if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(t))return false;return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(t);};
  const levelMaster=item=>{const id=item?.level_master_harga_id;return id==null?null:masters().find(m=>String(m.id)===String(id)&&isLevelMaster(m))||null;};
  const negotiated=item=>Math.max(0,N(item?.harga??item?.harga_jual));
  const levelBase=item=>{if(!item?.level_enabled)return 0;const lm=levelMaster(item);if(!lm)return 0;const width=Math.max(0,N(item?.lebar)),price=Math.max(0,N(item?.level_harga)||N(lm.harga_jual)),set=Math.max(1,N(item?.qty)||1);return width*price*set;};
  const ledBase=item=>Math.max(0,N(item?.lebar)*N(item?.tinggi)*negotiated(item)*Math.max(1,N(item?.qty)||1)*days(item?.mulai,item?.selesai));
  const original=()=>core().itemSubtotal;
  function subtotal(item){
    if(isLED(item))return Math.max(0,ledBase(item)+levelBase(item));
    const fn=core().__pmBusinessRulesOriginalSubtotal||original();
    if(typeof fn==='function')return Math.max(0,N(fn(item)));
    return 0;
  }
  function discount(item){const base=subtotal(item),pct=Math.max(0,Math.min(100,N(item?.diskon_persen))),rp=pct>0?Math.min(base,Math.round(base*pct/100)):Math.min(base,Math.max(0,N(item?.diskon_nominal)));return{base,pct,rp,net:Math.max(0,base-rp)};}
  function displayName(item){const base=S(item?.item||item?.nama_item||'-');if(!item?.level_enabled)return base;const h=N(item?.level_tinggi);return h>0?`${base} + Level ${h.toLocaleString('id-ID',{maximumFractionDigits:2})} m`:`${base} + Level`;}
  function installCalculation(){const c=core();if(!c||typeof c.itemSubtotal!=='function')return false;if(!c.__pmBusinessRulesOriginalSubtotal)c.__pmBusinessRulesOriginalSubtotal=c.itemSubtotal;c.itemSubtotal=function(item){return subtotal(item);};c.__pmBusinessRulesSubtotalPatched=true;return true;}
  function updateCard(card,item){const d=discount(item);const sum=[...card.querySelectorAll('.pm-item-body > .sum')].find(e=>/subtotal/i.test(S(e.querySelector('span')?.textContent)));if(sum?.querySelector('b'))sum.querySelector('b').textContent=M(d.net);const rp=card.querySelector('.pm-item-discount-rp');if(rp)rp.value=M(d.rp);const name=card.querySelector('.pm-item-display-name');if(name)name.textContent=displayName(item);const strong=card.querySelector('.pm-item-summary strong');if(strong)strong.textContent=displayName(item);const sp=card.querySelector('.pm-summary-main span');if(sp){let metric='';if(isLED(item))metric=`${N(item.lebar)} × ${N(item.tinggi)} m • ${Math.max(1,N(item.qty)||1)} set`;else metric=`Qty ${Math.max(1,N(item.qty)||1)}`;sp.textContent=`${metric}${item.mulai&&item.selesai?' • '+S(item.mulai)+' → '+S(item.selesai):''}${item.level_enabled?' • Level '+(N(item.level_tinggi)>0?N(item.level_tinggi).toLocaleString('id-ID',{maximumFractionDigits:2})+' m':'aktif'):''}`;}}
  function updateQuotationDOM(){installCalculation();document.querySelectorAll('#items > .item').forEach(card=>{const item=items().find(x=>String(x.id)===String(card.dataset.itemId));if(item)updateCard(card,item);});const rows=items().filter(x=>S(x.kode)&&S(x.item)),base=rows.reduce((s,x)=>s+discount(x).base,0),disc=rows.reduce((s,x)=>s+discount(x).rp,0),global=Math.max(0,N(window.__pmDiscountValue)),total=Math.max(0,base-disc-global);const t=document.querySelector('#total'),g=document.querySelector('#pmGrand');if(t)t.textContent=M(total);if(g)g.textContent=M(total);window.__pmDiscountBase=base-disc;window.__pmItemDiscountTotal=disc;window.__pmNetTotal=total;return total;}
  function patchPrintArea(){
    const areas=[document.querySelector('#pmPrintArea'),document.querySelector('#pmInvoiceArea'),document.querySelector('#pmInvoicePreview')].filter(Boolean);
    areas.forEach(area=>{
      const rows=[...area.querySelectorAll('table tbody tr')].filter(r=>!r.classList.contains('pm-inv-sync-total')&&!r.classList.contains('pm-inv-sync-extra'));
      const list=items().filter(x=>S(x.kode)&&S(x.item));
      rows.forEach((row,i)=>{const item=list[i];if(!item)return;const strong=row.querySelector('td:nth-child(2) strong');if(strong)strong.textContent=displayName(item);if(isLED(item)){const q=row.querySelector('td:nth-child(3)');if(q)q.textContent=`${N(item.lebar)} × ${N(item.tinggi)} m² • ${Math.max(1,N(item.qty)||1)} set`;const sub=row.querySelector('td:nth-child(6));if(sub)sub.textContent=M(discount(item).net);}});
    });
  }
  function installNativePrintHook(){const fn=window.print;if(typeof fn!=='function'||fn.__pmBusinessRulesPrint)return false;return true;}
  function hook(){const fn=window.print;if(typeof fn!=='function'||fn.__pmBusinessRulesPrintHook)return false;const wrapped=function(){updateQuotationDOM();patchPrintArea();return fn.apply(this,arguments);};wrapped.__pmBusinessRulesPrintHook=true;window.print=wrapped;return true;}
  function hookSave(){const fn=window.saveQuote;if(typeof fn!=='function'||fn.__pmBusinessRulesSaveHook)return false;const wrapped=function(){updateQuotationDOM();installCalculation();return fn.apply(this,arguments);};wrapped.__pmBusinessRulesSaveHook=true;window.saveQuote=wrapped;return true;}
  function hookDraw(){const fn=window.drawItems;if(typeof fn!=='function'||fn.__pmBusinessRulesDrawHook)return false;const wrapped=function(){const r=fn.apply(this,arguments);requestAnimationFrame(()=>requestAnimationFrame(updateQuotationDOM));return r;};wrapped.__pmBusinessRulesDrawHook=true;window.drawItems=wrapped;return true;}
  document.addEventListener('input',e=>{if(e.target?.closest?.('#items'))requestAnimationFrame(updateQuotationDOM);},true);
  document.addEventListener('change',e=>{if(e.target?.closest?.('#items'))requestAnimationFrame(updateQuotationDOM);},true);
  [0,100,250,500,900,1500].forEach(ms=>setTimeout(()=>{installCalculation();hookDraw();hookSave();hook();if(ms===1500)updateQuotationDOM();},ms));
  window.addEventListener('load',()=>{installCalculation();hookDraw();hookSave();hook();updateQuotationDOM();});
  window.__PM_QUOTATION_BUSINESS_RULES_API={subtotal,discount,displayName,updateQuotationDOM,patchPrintArea,installCalculation};
})();
