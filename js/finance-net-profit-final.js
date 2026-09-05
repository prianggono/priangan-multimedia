/* Priangan Multimedia — Net Profit integration FINAL
 * Laba Kotor tetap = Penjualan Bersih - COGS.
 * Pengeluaran operasional dikurangkan setelah Laba Kotor untuk mendapatkan Laba Bersih.
 */
(function(){
  'use strict';
  if(window.__PM_FINANCE_NET_PROFIT_FINAL)return;
  window.__PM_FINANCE_NET_PROFIT_FINAL=true;
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;let s=S(v).replace(/[^0-9,.-]/g,'');if(!s)return 0;s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const DB=()=>{try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.db||window.__PM_STABLE_DB||window.__PRIANGAN_QUOTE_DB||null};
  let timer=0;
  async function render(){
    const host=document.querySelector('#pmFiV2');
    if(!host||!document.querySelector('.nav[data-p="finance"].active'))return;
    const grossEl=[...host.querySelectorAll('.fi-k')].find(x=>/Laba Kotor/i.test(x.textContent||''));
    if(!grossEl)return;
    const grossText=grossEl.querySelector('strong')?.textContent||'0';
    const gross=N(grossText);
    const from=S(document.querySelector('#fiV2From')?.value),to=S(document.querySelector('#fiV2To')?.value);
    const d=DB();if(!d)return;
    let q=d.from('pengeluaran_keuangan').select('nominal');
    if(from)q=q.gte('tanggal',from);
    if(to)q=q.lte('tanggal',to);
    const r=await q;
    if(r.error)return;
    const expense=(r.data||[]).reduce((a,x)=>a+N(x.nominal),0);
    let box=host.querySelector('#pmNetProfitSummary');
    if(!box){box=document.createElement('div');box.id='pmNetProfitSummary';box.className='card';box.style.cssText='margin-top:16px;border:1px solid #263654;background:linear-gradient(145deg,#0d1529,#080d1c)';host.appendChild(box)}
    const net=gross-expense;
    box.innerHTML=`<div style="font-weight:900;font-size:16px;margin-bottom:12px">Ringkasan Profit</div><div class="grid g2"><div class="fi-k"><small>Laba Kotor</small><strong>${M(gross)}</strong><div class="fi-note">Penjualan Bersih − COGS / Modal</div></div><div class="fi-k"><small>Pengeluaran Operasional</small><strong style="color:#ffb4ab">− ${M(expense)}</strong><div class="fi-note">Dana keluar yang dicatat di Pengeluaran</div></div></div><div style="margin-top:14px;padding:14px 16px;border:1px solid #263654;border-radius:12px;background:#091122;display:flex;justify-content:space-between;align-items:center;gap:12px"><span style="font-weight:900">LABA BERSIH</span><strong style="font-size:25px;color:${net>=0?'#00f5a0':'#ff4d6d'}">${M(net)}</strong></div>`;
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>render().catch(()=>{}),350)}
  const ob=new MutationObserver(schedule);ob.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-p="finance"],#fiV2Apply,#fiV2All,#fiV2Refresh'))setTimeout(render,500)},true);
  setTimeout(render,1000);
})();
