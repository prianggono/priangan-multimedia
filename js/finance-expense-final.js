/* Priangan Multimedia — Pengeluaran Keuangan FINAL v3 */
(function(){
  'use strict';
  if(window.__PM_FINANCE_EXPENSE_FINAL_V3)return;
  window.__PM_FINANCE_EXPENSE_FINAL_V3=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    let s=S(v).replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const today=()=>new Date().toISOString().slice(0,10);
  const DB=()=>{try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.db||window.__PM_STABLE_DB||window.__PRIANGAN_QUOTE_DB||null};

  function financeActive(){
    return !!document.querySelector('.nav[data-p="finance"].active') && !!document.querySelector('#pmFiV2');
  }

  function remove(){document.querySelector('#pmExpenseFinal')?.remove()}

  async function loadRows(from,to){
    const d=DB();
    if(!d)return {rows:[],error:'Supabase belum terhubung.'};
    let q=d.from('pengeluaran_keuangan').select('*').order('tanggal',{ascending:false}).order('id',{ascending:false});
    if(from)q=q.gte('tanggal',from);
    if(to)q=q.lte('tanggal',to);
    const r=await q;
    return r.error?{rows:[],error:r.error.message}:{rows:r.data||[],error:''};
  }

  async function renderExpense(){
    if(!financeActive()){remove();return;}
    if(document.querySelector('#pmExpenseFinal'))return;

    const host=document.querySelector('#pmFiV2');
    if(!host)return;

    const from=S(document.querySelector('#fiV2From')?.value);
    const to=S(document.querySelector('#fiV2To')?.value);
    const r=await loadRows(from,to);
    if(!financeActive())return;
    if(document.querySelector('#pmExpenseFinal'))return;

    const rows=r.rows,total=rows.reduce((a,x)=>a+N(x.nominal),0);
    const box=document.createElement('div');
    box.id='pmExpenseFinal';
    box.className='card';
    box.style.cssText='margin-top:16px;border:1px solid #263654;background:linear-gradient(145deg,#0d1529,#080d1c);position:relative;z-index:20';
    box.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
        <div><h2 style="margin:0">Pengeluaran</h2><p style="margin:6px 0 0;color:var(--muted)">Catat setiap dana keluar dan jelaskan <b>pengeluaran untuk apa</b>.</p></div>
        <div style="text-align:right"><small>Total Pengeluaran</small><div style="font-size:24px;font-weight:900;color:#ffb4ab">${M(total)}</div></div>
      </div>
      <div class="card" style="margin-top:14px;padding:14px">
        <div class="grid g2">
          <div class="field"><label>Tanggal *</label><input id="pmeTanggal" type="date" value="${today()}"></div>
          <div class="field"><label>Nominal *</label><input id="pmeNominal" type="number" min="1" step="1" placeholder="500000"></div>
          <div class="field" style="grid-column:1/-1"><label>Pengeluaran untuk apa? *</label><input id="pmeKeperluan" type="text" placeholder="Contoh: transport crew, konsumsi, sewa alat, pembelian kabel"></div>
          <div class="field" style="grid-column:1/-1"><label>Catatan</label><textarea id="pmeCatatan" rows="2" placeholder="Keterangan tambahan"></textarea></div>
        </div>
        <div class="actions" style="margin-top:12px"><button class="btn green" id="pmeSave" type="button">Simpan Pengeluaran</button></div>
      </div>
      ${r.error?`<div style="margin-top:10px;color:#ff6b7a">Gagal membaca pengeluaran: ${E(r.error)}</div>`:''}
      <div class="scroll" style="margin-top:14px"><table class="table"><thead><tr><th>No.</th><th>Tanggal</th><th>Pengeluaran untuk apa?</th><th>Catatan</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody>
      ${rows.map((x,i)=>`<tr><td>${i+1}</td><td>${E(x.tanggal)}</td><td>${E(x.keperluan)}</td><td>${E(x.catatan||'-')}</td><td><b>${M(x.nominal)}</b></td><td><button class="btn red" type="button" data-pme-del="${x.id}">Hapus</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Belum ada pengeluaran.</td></tr>'}
      </tbody></table></div>`;

    host.appendChild(box);

    box.querySelector('#pmeSave').onclick=async()=>{
      const d=DB();if(!d)return alert('Supabase belum terhubung.');
      const tanggal=box.querySelector('#pmeTanggal').value||today();
      const nominal=N(box.querySelector('#pmeNominal').value);
      const keperluan=box.querySelector('#pmeKeperluan').value.trim();
      const catatan=box.querySelector('#pmeCatatan').value.trim();
      if(!keperluan)return alert('Isi: Pengeluaran untuk apa?');
      if(nominal<=0)return alert('Nominal harus lebih dari 0.');
      const z=await d.from('pengeluaran_keuangan').insert([{tanggal,nominal,keperluan,catatan,updated_at:new Date().toISOString()}]);
      if(z.error)return alert('Gagal menyimpan pengeluaran: '+z.error.message);
      remove();
      setTimeout(renderExpense,50);
    };

    box.querySelectorAll('[data-pme-del]').forEach(btn=>btn.onclick=async()=>{
      if(!confirm('Hapus pengeluaran ini?'))return;
      const d=DB();if(!d)return;
      const z=await d.from('pengeluaran_keuangan').delete().eq('id',btn.dataset.pmeDel);
      if(z.error)return alert('Gagal menghapus pengeluaran: '+z.error.message);
      remove();setTimeout(renderExpense,50);
    });
  }

  let timer=0;
  function schedule(){clearTimeout(timer);timer=setTimeout(renderExpense,250)}
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-p="finance"]')){setTimeout(renderExpense,300);setTimeout(renderExpense,900);setTimeout(renderExpense,1800)}
    else if(e.target?.closest?.('[data-p]'))setTimeout(renderExpense,300);
  },true);
  setInterval(()=>{if(financeActive()&&!document.querySelector('#pmExpenseFinal'))renderExpense()},1000);
  setTimeout(renderExpense,500);
})();
