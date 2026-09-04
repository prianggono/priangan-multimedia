/* Priangan Multimedia — Pengeluaran internal */
(function(){
  'use strict';
  if(window.__PM_FINANCE_EXPENSE_FINAL)return;
  window.__PM_FINANCE_EXPENSE_FINAL=true;

  const clean=v=>String(v??'').trim();
  const num=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(num(v));
  const dateText=v=>{if(!v)return '-';const d=new Date(v);return Number.isNaN(d.getTime())?String(v).slice(0,10):d.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'})};
  const db=()=>{try{return typeof window.db!=='undefined'?window.db:null}catch(_){return null}};

  async function loadExpenses(from,to){
    const d=db();if(!d)return {rows:[],error:'Supabase belum terhubung.'};
    let q=d.from('pengeluaran_keuangan').select('*').order('tanggal',{ascending:false}).order('id',{ascending:false});
    if(from)q=q.gte('tanggal',from);if(to)q=q.lte('tanggal',to);
    const r=await q;return r.error?{rows:[],error:r.error.message}:{rows:r.data||[],error:''};
  }

  async function renderExpenses(){
    const content=document.querySelector('#content');if(!content)return;
    const from=document.querySelector('#financeFrom')?.value||'';
    const to=document.querySelector('#financeTo')?.value||'';
    const r=await loadExpenses(from,to);
    const rows=r.rows;
    const total=rows.reduce((s,x)=>s+num(x.nominal),0);
    const error=r.error?`<div class="card" style="border-color:#b42318;color:#ffb4ab;margin-bottom:16px">${esc(r.error)}</div>`:'';
    const list=rows.length?rows.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(dateText(x.tanggal))}</td><td>${esc(x.keperluan)}</td><td>${esc(x.catatan||'-')}</td><td><b>${money(x.nominal)}</b></td><td><button class="btn secondary sm" type="button" data-exp-edit="${x.id}">Edit</button> <button class="btn red sm" type="button" data-exp-del="${x.id}">Hapus</button></td></tr>`).join(''):`<tr><td colspan="6" class="empty">Belum ada pengeluaran pada periode ini.</td></tr>`;
    content.insertAdjacentHTML('beforeend',`<div class="card" id="pmExpenseCard" style="margin-top:16px">
      <div class="head" style="margin-bottom:12px"><div><h2 style="margin:0">Pengeluaran</h2><p>Catat setiap dana keluar dan jelaskan dana tersebut digunakan untuk apa.</p></div><button class="btn" type="button" id="pmExpenseAdd">+ Tambah Pengeluaran</button></div>
      ${error}<div class="card" id="pmExpenseForm" style="display:none;margin-bottom:16px;background:rgba(255,255,255,.02)">
        <b id="pmExpenseTitle">Tambah Pengeluaran</b><input type="hidden" id="pmExpenseId">
        <div class="grid g2" style="margin-top:15px">
          <div class="field"><label>Tanggal *</label><input id="pmExpenseTanggal" type="date"></div>
          <div class="field"><label>Nominal *</label><input id="pmExpenseNominal" inputmode="numeric" placeholder="Rp 0"></div>
          <div class="field" style="grid-column:1/-1"><label>Pengeluaran untuk apa? *</label><input id="pmExpenseKeperluan" placeholder="Contoh: Sewa genset event, transport operator, konsumsi crew, pembelian kabel"></div>
          <div class="field" style="grid-column:1/-1"><label>Catatan (opsional)</label><textarea id="pmExpenseCatatan" rows="2" placeholder="Keterangan tambahan"></textarea></div>
        </div>
        <div class="actions" style="margin-top:15px"><button class="btn secondary" type="button" id="pmExpenseCancel">Batal</button><button class="btn green" type="button" id="pmExpenseSave">Simpan Pengeluaran</button></div>
      </div>
      <div style="margin-bottom:12px"><small>Total Pengeluaran Periode</small><strong style="display:block;font-size:22px;color:#ffb4ab">${money(total)}</strong></div>
      <div class="scroll"><table class="table"><thead><tr><th>No.</th><th>Tanggal</th><th>Pengeluaran untuk apa?</th><th>Catatan</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody>${list}</tbody></table></div>
    </div>`);

    const form=document.querySelector('#pmExpenseForm');
    const reset=()=>{document.querySelector('#pmExpenseId').value='';document.querySelector('#pmExpenseTanggal').value=new Date().toISOString().slice(0,10);document.querySelector('#pmExpenseNominal').value='';document.querySelector('#pmExpenseKeperluan').value='';document.querySelector('#pmExpenseCatatan').value='';document.querySelector('#pmExpenseTitle').textContent='Tambah Pengeluaran'};
    document.querySelector('#pmExpenseAdd').onclick=()=>{reset();form.style.display='block';document.querySelector('#pmExpenseKeperluan').focus()};
    document.querySelector('#pmExpenseCancel').onclick=()=>form.style.display='none';
    document.querySelector('#pmExpenseSave').onclick=async()=>{const id=document.querySelector('#pmExpenseId').value;const payload={tanggal:document.querySelector('#pmExpenseTanggal').value||new Date().toISOString().slice(0,10),nominal:num(document.querySelector('#pmExpenseNominal').value),keperluan:clean(document.querySelector('#pmExpenseKeperluan').value),catatan:clean(document.querySelector('#pmExpenseCatatan').value),updated_at:new Date().toISOString()};if(!payload.keperluan)return alert('Isi dulu pengeluaran untuk apa.');if(payload.nominal<=0)return alert('Nominal harus lebih dari 0.');const z=id?await db().from('pengeluaran_keuangan').update(payload).eq('id',id):await db().from('pengeluaran_keuangan').insert([payload]);if(z.error)return alert('Gagal menyimpan pengeluaran: '+z.error.message);window.financePage?.();};
    document.querySelectorAll('[data-exp-edit]').forEach(b=>b.onclick=()=>{const x=rows.find(v=>String(v.id)===b.dataset.expEdit);if(!x)return;form.style.display='block';document.querySelector('#pmExpenseTitle').textContent='Edit Pengeluaran';document.querySelector('#pmExpenseId').value=x.id;document.querySelector('#pmExpenseTanggal').value=x.tanggal||'';document.querySelector('#pmExpenseNominal').value=String(num(x.nominal));document.querySelector('#pmExpenseKeperluan').value=x.keperluan||'';document.querySelector('#pmExpenseCatatan').value=x.catatan||'';document.querySelector('#pmExpenseKeperluan').focus()});
    document.querySelectorAll('[data-exp-del]').forEach(b=>b.onclick=async()=>{if(!confirm('Hapus pengeluaran ini?'))return;const z=await db().from('pengeluaran_keuangan').delete().eq('id',b.dataset.expDel);if(z.error)return alert('Gagal menghapus: '+z.error.message);window.financePage?.()});
  }

  const original=window.financePage;
  window.financePage=async function(){
    if(original)await original();
    await renderExpenses();
  };
  setTimeout(()=>{if(typeof window.financePage==='function'&&!window.__PM_EXPENSE_BOOT)window.__PM_EXPENSE_BOOT=true},0);
})();
