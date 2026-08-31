/* Priangan Multimedia — quotation discount UI + calculation recovery.
 * Keeps the existing item rules untouched. Discount is applied only to the quotation total.
 * No new database column is required: the saved penawaran.total stores the net total.
 */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);
  const toast=m=>typeof window.msg==='function'?window.msg(m):console.warn(m);

  function baseTotal(){
    return [...document.querySelectorAll('#items > .item .sum b')].reduce((a,b)=>a+N(b.textContent),0);
  }
  function discount(){
    const base=baseTotal();
    const pct=Math.max(0,Math.min(100,N(document.querySelector('#pmDiscPct')?.value)));
    const rp=N(document.querySelector('#pmDisc')?.value);
    let d=rp;
    if(document.activeElement?.id==='pmDiscPct') d=Math.round(base*pct/100);
    else if(!rp && pct) d=Math.round(base*pct/100);
    d=Math.max(0,Math.min(base,d));
    return {base,discount:d,net:Math.max(0,base-d),pct:base?d/base*100:0};
  }
  function renderTotal(){
    const x=discount();
    const total=document.querySelector('#total');
    if(total) total.textContent=money(x.net);
    const net=document.querySelector('#pmNetTotal');
    if(net) net.textContent=money(x.net);
    const d=document.querySelector('#pmDiscValue');
    if(d) d.textContent=money(x.discount);
  }
  function inject(){
    if(!document.querySelector('#items')) return;
    const card=document.querySelector('#items')?.parentElement?.parentElement?.nextElementSibling;
    const total=document.querySelector('#total');
    if(!total) return;
    const sum=total.closest('.sum');
    const host=sum?.parentElement;
    if(!host) return;
    if(!document.querySelector('#pmDiscountBox')){
      const box=document.createElement('div');
      box.id='pmDiscountBox';
      box.className='grid g2';
      box.style.marginBottom='14px';
      box.innerHTML=`
        <div class="field"><label>Diskon (%)</label><input id="pmDiscPct" type="number" min="0" max="100" step="0.01" value="0" inputmode="decimal"></div>
        <div class="field"><label>Diskon (Rp)</label><input id="pmDisc" type="number" min="0" step="1" value="0" inputmode="numeric"></div>`;
      sum.parentElement.insertBefore(box,sum);
      const pct=document.querySelector('#pmDiscPct');
      const rp=document.querySelector('#pmDisc');
      pct.addEventListener('input',()=>{
        const b=baseTotal();
        const d=Math.max(0,Math.min(b,Math.round(b*N(pct.value)/100)));
        rp.value=d;
        renderTotal();
      });
      rp.addEventListener('input',()=>{
        const b=baseTotal();
        const d=Math.max(0,Math.min(b,N(rp.value)));
        rp.value=d;
        pct.value=b?((d/b)*100).toFixed(2):'0';
        renderTotal();
      });
    }
    renderTotal();
  }

  async function restoreEditDiscount(){
    const id=S(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
    if(!id || !window.supabase?.createClient) return;
    if(window.__pmDiscountRestored===id) return;
    const c=window.PRIANGAN_CONFIG||{};
    const u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL);
    const k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);
    if(!u||!k) return;
    window.__pmDiscountRestored=id;
    try{
      const d=window.__PRIANGAN_DISCOUNT_DB ||= window.supabase.createClient(u,k);
      const q=await d.from('penawaran').select('total').eq('id',id).single();
      if(q.error) throw q.error;
      const base=baseTotal(), saved=N(q.data?.total);
      const disc=Math.max(0,Math.min(base,base-saved));
      const pct=document.querySelector('#pmDiscPct'), rp=document.querySelector('#pmDisc');
      if(pct&&rp){ pct.value=base?((disc/base)*100).toFixed(2):'0'; rp.value=Math.round(disc); renderTotal(); }
    }catch(e){ console.warn('[PM] discount restore:',e); }
  }

  const originalSave=window.saveQuote;
  window.saveQuote=async function(){
    const edit=!!(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
    if(edit) return typeof originalSave==='function'?originalSave():toast('Fungsi simpan penawaran tidak tersedia.');
    const x=discount();
    if(!x.base) return typeof originalSave==='function'?originalSave():toast('Fungsi simpan penawaran tidak tersedia.');
    const result=typeof originalSave==='function'?await originalSave():null;
    try{
      const c=window.PRIANGAN_CONFIG||{};
      const u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL);
      const k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);
      if(u&&k&&window.supabase?.createClient){
        const d=window.__PRIANGAN_DISCOUNT_DB ||= window.supabase.createClient(u,k);
        const latest=await d.from('penawaran').select('id').order('id',{ascending:false}).limit(1).maybeSingle();
        if(!latest.error&&latest.data?.id){
          const up=await d.from('penawaran').update({total:x.net}).eq('id',latest.data.id);
          if(up.error) console.warn('[PM] discount save:',up.error);
        }
      }
    }catch(e){console.warn('[PM] discount save:',e)}
    return result;
  };

  const obs=new MutationObserver(()=>requestAnimationFrame(()=>{inject();restoreEditDiscount();}));
  obs.observe(document.body,{childList:true,subtree:true});
  requestAnimationFrame(()=>{inject();restoreEditDiscount();});
  window.__PM_QUOTATION_DISCOUNT_FIX=true;
})();
