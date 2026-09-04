/* Priangan Multimedia — Pengeluaran Keuangan FORCE UI v2 */
(function(){
  'use strict';
  if(window.__PM_FINANCE_EXPENSE_FORCE_V2)return;
  window.__PM_FINANCE_EXPENSE_FORCE_V2=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const num=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    let s=String(v??'').replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(num(v));
  const today=()=>new Date().toISOString().slice(0,10);
  const getDB=()=>{try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.db||window.__PM_STABLE_DB||null};

  function isFinancePage(){
    const nav=document.querySelector('.nav[data-p="finance"]');
    const title=(document.querySelector('#title')?.textContent||'').trim().toLowerCase();
    return !!nav?.classList.contains('active') || title==='laporan keuangan';
  }

  async function readExpenses(){
    const d=getDB();
    if(!d)return {rows:[],error:'Supabase belum terhubung.'};
    const from=document.querySelector('#pmExpenseFrom')?.value||'';
    const to=document.querySelector('#pmExpenseTo')?.value||'';
    let q=d.from('pengeluaran_keuangan').select('*').order('tanggal',{ascending:false}).order('id',{ascending:false});
    if(from)q=q.gte('tanggal',from);
    if(to)q=q.lte('tanggal',to);
    const r=await q;
    return r.error?{rows:[],error:r.error.message}:{rows:r.data||[],error:''};
  }

  async function draw(){
    const content=document.querySelector('#content');
    if(!content)return;

    // PENTING: modul ini hanya boleh hidup di halaman Laporan Keuangan.
    // Jangan pernah menempelkan kartu Pengeluaran ke Dashboard atau halaman lain.
    if(!isFinancePage()){
      document.querySelector('#pmExpenseForce')?.remove();
      return;
    }
    if(document.querySelector('#pmExpenseForce'))return;

    const r=await readExpenses();
    const rows=r.rows;
    const total=rows.reduce((a,x)=>a+num(x.nominal),0);
    const list=rows.length?rows.map((x,i)=>`<tr>
      <td>${i+1}</td><td>${esc(x.tanggal||'-')}</td><td>${esc(x.keperluan||'-')}</td><td>${esc(x.catatan||'-')}</td><td><b>${money(x.nominal)}</b></td>
      <td><button class="btn secondary" type="button" data-pm-exp-edit="${x.id}">Edit</button> <button class="btn red" type="button" data-pm-exp-del="${x.id}">Hapus</button></td>
    </tr>`).join(''):`<tr><td colspan="6" class="empty">Belum ada pengeluaran pada periode ini.</td></tr>`;

    const box=document.createElement('div');
    box.id='pmExpenseForce';
    box.className='card';
    box.style.cssText='margin:16px 0;border:1px solid #2b4668;background:linear-gradient(145deg,#101a2f,#0b1222);position:relative;z-index:5';
    box.innerHTML=`
      <style>
        #pmExpenseForce .pm-exp-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap}
        #pmExpenseForce .pm-exp-total{font-size:24px;font-weight:900;color:#ffb4ab}
        #pmExpenseForce .pm-exp-form{margin-top:14px;padding:15px;border:1px solid #263654;border-radius:12px;background:rgba(255,255,255,.025)}
        #pmExpenseForce label{display:block;margin-bottom:6px}
        #pmExpenseForce .pm-exp-help{font-size:12px;color:#8ea4c9;margin:5px 0 0}
      </style>
      <div class="pm-exp-head">
        <div><h2 style="margin:0">Pengeluaran</h2><p style="margin:5px 0 0">Catat dana keluar dan <b>untuk apa dana tersebut digunakan</b>.</p></div>
        <div style="text-align:right"><small>Total Pengeluaran Periode</small><div class="pm-exp-total">${money(total)}</div></div>
      </div>
      <div class="card" style="margin-top:14px;padding:12px">
        <div class="grid g2">
          <div class="field"><label>Dari Tanggal</label><input id="pmExpenseFrom" type="date"></div>
          <div class="field"><label>Sampai Tanggal</label><input id="pmExpenseTo" type="date"></div>
        </div>
      </div>
      <div class="pm-exp-form" id="pmExpenseForm">
        <b id="pmExpenseFormTitle">Tambah Pengeluaran</b>
        <input type="hidden" id="pmExpenseId">
        <div class="grid g2" style="margin-top:12px">
          <div class="field"><label>Tanggal *</label><input id="pmExpenseTanggal" type="date" value="${today()}"></div>
          <div class="field"><label>Nominal *</label><input id="pmExpenseNominal" type="number" min="0" step="1" placeholder="Contoh: 500000"></div>
          <div class="field" style="grid-column:1/-1"><label>Pengeluaran untuk apa? *</label><input id="pmExpenseKeperluan" type="text" placeholder="Contoh: Sewa genset event / transport operator / konsumsi crew / pembelian kabel"></div>
          <div class="field" style="grid-column:1/-1"><label>Catatan (opsional)</label><textarea id="pmExpenseCatatan" rows="2" placeholder="Keterangan tambahan"></textarea></div>
        </div>
        <p class="pm-exp-help">Kolom <b>Pengeluaran untuk apa?</b> wajib diisi agar laporan jelas digunakan untuk kebutuhan apa.</p>
        <div class="actions" style="margin-top:12px"><button class="btn green" type="button" id="pmExpenseSave">Simpan Pengeluaran</button><button class="btn secondary" type="button" id="pmExpenseReset">Reset Form</button></div>
      </div>
      ${r.error?`<div style="margin-top:12px;padding:10px;border:1px solid #7f1d1d;border-radius:8px;color:#ffb4ab">Gagal membaca pengeluaran: ${esc(r.error)}</div>`:''}
      <div class="scroll" style="margin-top:14px"><table class="table"><thead><tr><th>No.</th><th>Tanggal</th><th>Pengeluaran untuk apa?</th><th>Catatan</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody>${list}</tbody></table></div>`;

    const head=content.querySelector('.head');
    if(head&&head.nextSibling)content.insertBefore(box,head.nextSibling);else content.prepend(box);

    const fromInput=box.querySelector('#pmExpenseFrom'),toInput=box.querySelector('#pmExpenseTo');
    const reset=()=>{
      box.querySelector('#pmExpenseId').value='';
      box.querySelector('#pmExpenseTanggal').value=today();
      box.querySelector('#pmExpenseNominal').value='';
      box.querySelector('#pmExpenseKeperluan').value='';
      box.querySelector('#pmExpenseCatatan').value='';
      box.querySelector('#pmExpenseFormTitle').textContent='Tambah Pengeluaran';
    };
    const rerender=()=>{box.remove();setTimeout(draw,80)};
    box.querySelector('#pmExpenseReset').onclick=reset;
    box.querySelector('#pmExpenseSave').onclick=async()=>{
      const d=getDB(); if(!d)return alert('Supabase belum terhubung.');
      const id=box.querySelector('#pmExpenseId').value;
      const tanggal=box.querySelector('#pmExpenseTanggal').value||today();
      const nominal=num(box.querySelector('#pmExpenseNominal').value);
      const keperluan=box.querySelector('#pmExpenseKeperluan').value.trim();
      const catatan=box.querySelector('#pmExpenseCatatan').value.trim();
      if(!keperluan)return alert('Isi dulu: Pengeluaran untuk apa?');
      if(nominal<=0)return alert('Nominal harus lebih dari 0.');
      const payload={tanggal,nominal,keperluan,catatan,updated_at:new Date().toISOString()};
      const z=id?await d.from('pengeluaran_keuangan').update(payload).eq('id',id):await d.from('pengeluaran_keuangan').insert([payload]);
      if(z.error){console.error('[PM] expense save',z.error);return alert('Gagal menyimpan pengeluaran: '+z.error.message)}
      rerender();
    };
    [fromInput,toInput].forEach(x=>x?.addEventListener('change',rerender));
    box.querySelectorAll('[data-pm-exp-edit]').forEach(btn=>btn.onclick=()=>{
      const x=rows.find(v=>String(v.id)===btn.dataset.pmExpEdit);if(!x)return;
      box.querySelector('#pmExpenseId').value=x.id;
      box.querySelector('#pmExpenseTanggal').value=x.tanggal||today();
      box.querySelector('#pmExpenseNominal').value=num(x.nominal);
      box.querySelector('#pmExpenseKeperluan').value=x.keperluan||'';
      box.querySelector('#pmExpenseCatatan').value=x.catatan||'';
      box.querySelector('#pmExpenseFormTitle').textContent='Edit Pengeluaran';
      box.querySelector('#pmExpenseKeperluan').focus();
    });
    box.querySelectorAll('[data-pm-exp-del]').forEach(btn=>btn.onclick=async()=>{
      if(!confirm('Hapus pengeluaran ini?'))return;
      const d=getDB();if(!d)return;
      const z=await d.from('pengeluaran_keuangan').delete().eq('id',btn.dataset.pmExpDel);
      if(z.error)return alert('Gagal menghapus pengeluaran: '+z.error.message);
      rerender();
    });
  }

  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(draw,150)};
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    const nav=e.target?.closest?.('[data-p="finance"]');
    const anyNav=e.target?.closest?.('[data-p]');
    if(nav){setTimeout(draw,250);setTimeout(draw,700);setTimeout(draw,1500)}
    else if(anyNav){setTimeout(draw,250)}
  },true);
  setTimeout(draw,700);
})();
