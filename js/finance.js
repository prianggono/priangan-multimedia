/* Priangan Multimedia — Finance Domain Core
 * Single authority for financial reconciliation and operating expenses.
 * Supabase is the source of truth; no financial value is sourced from localStorage.
 */
(function () {
  'use strict';
  if (window.__PM_FINANCE_DOMAIN_CORE) return;
  window.__PM_FINANCE_DOMAIN_CORE = true;

  const S = (v) => String(v ?? '').trim();
  const N = (v) => {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = S(v).replace(/[^0-9,.-]/g, '');
    if (!s) return 0;
    s = s.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const M = (v) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(Math.max(0, Math.round(N(v))));
  const P = (v) => `${N(v).toFixed(2)}%`;
  const E = (v) => S(v).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const D = (v) => {
    if (!v) return '-';
    const d = new Date(S(v).slice(0,10) + 'T00:00:00');
    return Number.isNaN(d.getTime()) ? E(v) : d.toLocaleDateString('id-ID', {day:'2-digit',month:'2-digit',year:'numeric'});
  };
  const DB = () => window.db || window.__PM_STABLE_DB || null;
  const msg = (t) => typeof window.msg === 'function' ? window.msg(t) : console.warn('[PM]', t);
  const days = (a,b) => {
    if (!a || !b) return 1;
    const x = new Date(S(a).slice(0,10)+'T00:00:00'), y = new Date(S(b).slice(0,10)+'T00:00:00');
    const n = Math.round((y-x)/86400000);
    return n >= 0 ? n+1 : 1;
  };
  const masterFor = (i, ms) => {
    const code = S(i.kode || i.kode_item).toLowerCase();
    const name = S(i.item || i.nama_item).toLowerCase();
    return ms.find(x => S(x.kode).toLowerCase() === code) || ms.find(x => name && S(x.item).toLowerCase() === name) || null;
  };
  const itemCost = (i, m, schedules) => {
    const unit = N(i.harga_modal) > 0 ? N(i.harga_modal) : N(m?.harga_modal);
    if (unit <= 0) return 0;
    const type = S(i.tipe_perhitungan || i.tipe).toLowerCase();
    const rows = (schedules || []).filter(s => String(s.item_id) === String(i.id));
    const calc = (s) => {
      const dur = Math.max(1, N(s?.durasi) || N(s?.durasi_hari) || days(s?.tanggal_mulai || i.tanggal_mulai, s?.tanggal_selesai || i.tanggal_selesai));
      const qty = Math.max(1, N(s?.qty ?? s?.jumlah ?? i.qty ?? i.jumlah ?? 1));
      const w = N(i.lebar), h = N(i.tinggi), l = N(i.panjang);
      if (type === 'luas') return w*h*unit*Math.max(1,N(s?.qty ?? 1))*dur;
      if (type === 'level') return w*unit*Math.max(1,N(s?.qty ?? 1))*dur;
      if (type === 'rigging') return (l*2+h*2)*unit*Math.max(1,N(s?.qty ?? 1))*dur;
      return qty*unit*dur;
    };
    return rows.length ? rows.reduce((a,s) => a + calc(s), 0) : calc(null);
  };
  const isSold = (r, paid) => {
    const st = S(r.status).toUpperCase();
    const ist = S(r.status_invoice).toUpperCase();
    return paid > 0 || ['DITERBITKAN','LUNAS'].includes(ist) || ['DEAL','ACC','APPROVED','DISETUJUI'].includes(st);
  };

  let rowsCache = [], expensesCache = [];

  async function load(from='', to='') {
    const d = DB();
    if (!d) throw new Error('Supabase belum terhubung.');
    const [qr, ir, mr, sr, pr, er, cr] = await Promise.all([
      d.from('penawaran').select('*').order('id',{ascending:false}),
      d.from('penawaran_items').select('*').order('id'),
      d.from('master_harga').select('*').order('id'),
      d.from('penawaran_jadwal').select('*').order('id'),
      d.from('pembayaran_penawaran').select('*').order('id'),
      d.from('pengeluaran_keuangan').select('*').order('tanggal',{ascending:false}).order('id',{ascending:false}),
      d.from('clients').select('*').order('id')
    ]);
    if (qr.error) throw qr.error; if (ir.error) throw ir.error; if (mr.error) throw mr.error; if (sr.error) throw sr.error; if (pr.error) throw pr.error; if (er.error) throw er.error;
    const qs=qr.data||[], items=ir.data||[], masters=mr.data||[], schedules=sr.data||[], payments=pr.data||[], clients=cr.error?[]:(cr.data||[]);
    const byQuote=new Map(), paidMap=new Map();
    items.forEach(i => { const k=S(i.penawaran_id); if(!byQuote.has(k)) byQuote.set(k,[]); byQuote.get(k).push(i); });
    payments.forEach(p => { const k=S(p.penawaran_id); paidMap.set(k,(paidMap.get(k)||0)+N(p.nominal)); });
    rowsCache = qs.filter(r => !/BATAL|CANCEL|DIBATALKAN/i.test(S(r.status))).filter(r => { const dt=S(r.tanggal_penawaran||r.tanggal||r.created_at||r.tanggal_mulai).slice(0,10); return (!from||dt>=from)&&(!to||dt<=to); }).map(r => {
      const qits=byQuote.get(S(r.id))||[], details=qits.map(i => ({item:i, cost:itemCost(i, masterFor(i,masters), schedules)}));
      const subtotal=Math.max(0,N(r.subtotal)||qits.reduce((a,i)=>a+N(i.subtotal),0));
      const net=Math.max(0,N(r.grand_total??r.total)||subtotal);
      const pay=N(paidMap.get(S(r.id))), sold=isSold(r,pay), modal=details.reduce((a,x)=>a+x.cost,0), profit=net-modal, margin=net?profit/net*100:0;
      const invoiceTotal=r.nomor_invoice?net:0, balance=r.nomor_invoice?Math.max(0,invoiceTotal-pay):0;
      return {r,qits,net,subtotal,pay,sold,modal,profit,margin,balance,client:clients.find(c=>String(c.id)===String(r.client_id))||null};
    });
    expensesCache=er.data||[]; window.__PM_FIN_EXPENSES=expensesCache;
    render(from,to);
  }

  function render(from='',to='') {
    const c=document.querySelector('#content'); if(!c) return;
    if(typeof window.pmSetCurrentPage==='function') window.pmSetCurrentPage('finance');
    const sales=rowsCache.filter(x=>x.sold);
    const revenue=sales.reduce((a,x)=>a+x.net,0), modal=sales.reduce((a,x)=>a+x.modal,0), profit=sales.reduce((a,x)=>a+x.profit,0);
    const cash=rowsCache.reduce((a,x)=>a+x.pay,0), receivable=sales.reduce((a,x)=>a+x.balance,0), pipeline=rowsCache.filter(x=>!x.sold).reduce((a,x)=>a+x.net,0);
    const expenseTotal=expensesCache.reduce((a,x)=>a+N(x.nominal),0), netProfit=profit-expenseTotal, netCash=cash-expenseTotal, margin=revenue?profit/revenue*100:0;
    const inv=rowsCache.filter(x=>x.r.nomor_invoice), unpaid=inv.filter(x=>x.balance>0).length, lunas=inv.filter(x=>x.balance<=0).length;
    c.innerHTML=`<div class="head"><div><h1>Laporan Keuangan</h1><p>Rekonsiliasi Supabase: penawaran, modal snapshot, pembayaran, invoice dan pengeluaran.</p></div><button class="btn secondary" id="pmFinanceRefresh" type="button">↻ Refresh</button></div>
    <div class="card" style="margin-bottom:16px"><div class="grid g2"><div class="field"><label>Dari Tanggal</label><input id="pmFinanceFrom" type="date" value="${E(from)}"></div><div class="field"><label>Sampai Tanggal</label><input id="pmFinanceTo" type="date" value="${E(to)}"></div></div><div class="actions"><button class="btn" id="pmFinanceApply" type="button">Terapkan Filter</button><button class="btn secondary" id="pmFinanceAll" type="button">Semua Data</button></div></div>
    <div class="grid g4"><div class="card stat"><small>Penjualan Bersih</small><strong>${M(revenue)}</strong></div><div class="card stat"><small>Total Modal</small><strong>${M(modal)}</strong></div><div class="card stat"><small>Laba Kotor</small><strong>${M(profit)}</strong></div><div class="card stat"><small>Margin Kotor</small><strong>${P(margin)}</strong></div></div>
    <div class="grid g4" style="margin-top:16px"><div class="card stat"><small>Kas Masuk</small><strong>${M(cash)}</strong></div><div class="card stat"><small>Piutang</small><strong>${M(receivable)}</strong></div><div class="card stat"><small>Pengeluaran</small><strong>${M(expenseTotal)}</strong></div><div class="card stat"><small>Kas Bersih</small><strong>${M(netCash)}</strong></div></div>
    <div class="grid g4" style="margin-top:16px"><div class="card stat"><small>Laba Bersih Operasional</small><strong>${M(netProfit)}</strong></div><div class="card stat"><small>Pipeline</small><strong>${M(pipeline)}</strong></div><div class="card stat"><small>Invoice Belum Lunas</small><strong>${unpaid}</strong></div><div class="card stat"><small>Invoice Lunas</small><strong>${lunas}</strong></div></div>
    <div class="card" style="margin-top:16px"><div class="actions" style="justify-content:space-between"><b>Pengeluaran Operasional</b><button class="btn green" id="pmExpenseAdd" type="button">+ Tambah Pengeluaran</button></div><div class="scroll" style="margin-top:12px"><table class="table"><thead><tr><th>Tanggal</th><th>Keperluan</th><th>Catatan</th><th>Nominal</th><th>Aksi</th></tr></thead><tbody>${expensesCache.map(x=>`<tr><td>${D(x.tanggal)}</td><td>${E(x.keperluan)}</td><td>${E(x.catatan||'')}</td><td>${M(x.nominal)}</td><td><div class="actions"><button class="btn sm secondary" type="button" data-exp-edit="${Number(x.id)}">Edit</button><button class="btn sm danger" type="button" data-exp-delete="${Number(x.id)}">Hapus</button></div></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Belum ada pengeluaran.</td></tr>'}</tbody></table></div></div>
    <div class="card" style="margin-top:16px"><b>Rekonsiliasi per Transaksi</b><div class="scroll" style="margin-top:12px"><table class="table"><thead><tr><th>Tanggal</th><th>Penawaran</th><th>Invoice</th><th>Client</th><th>Event</th><th>Net</th><th>Modal</th><th>Laba Kotor</th><th>Margin</th><th>Dibayar</th><th>Piutang</th><th>Status</th></tr></thead><tbody>${rowsCache.map(x=>`<tr><td>${D(x.r.tanggal_penawaran||x.r.tanggal||x.r.created_at||x.r.tanggal_mulai)}</td><td>${E(x.r.nomor_penawaran||'-')}</td><td>${E(x.r.nomor_invoice||'-')}</td><td>${E(x.r.nama_client||x.client?.nama_client||'-')}</td><td>${E(x.r.nama_event||x.r.event_name||x.r.event||'-')}</td><td>${M(x.net)}</td><td>${x.sold?M(x.modal):'-'}</td><td>${x.sold?M(x.profit):'-'}</td><td>${x.sold?P(x.margin):'-'}</td><td>${x.pay?M(x.pay):'-'}</td><td>${x.r.nomor_invoice?M(x.balance):'-'}</td><td>${x.r.nomor_invoice?(x.balance<=0?'LUNAS':(x.r.status_invoice||'DITERBITKAN')):(x.sold?'TERJUAL':'PIPELINE')}</td></tr>`).join('')||'<tr><td colspan="12" class="empty">Belum ada data.</td></tr>'}</tbody></table></div></div>`;
    bind();
  }

  function bind() {
    const c=document.querySelector('#content'); if(!c)return;
    c.querySelector('#pmFinanceRefresh')?.addEventListener('click',()=>load(S(c.querySelector('#pmFinanceFrom')?.value),S(c.querySelector('#pmFinanceTo')?.value)));
    c.querySelector('#pmFinanceApply')?.addEventListener('click',()=>load(S(c.querySelector('#pmFinanceFrom')?.value),S(c.querySelector('#pmFinanceTo')?.value)));
    c.querySelector('#pmFinanceAll')?.addEventListener('click',()=>load('',''));
    c.querySelector('#pmExpenseAdd')?.addEventListener('click',()=>openExpenseModal());
    c.querySelectorAll('[data-exp-edit]').forEach(b=>b.addEventListener('click',()=>openExpenseModal(Number(b.dataset.expEdit))));
    c.querySelectorAll('[data-exp-delete]').forEach(b=>b.addEventListener('click',()=>deleteExpense(Number(b.dataset.expDelete))));
  }

  function closeExpenseModal(){document.querySelector('#pmExpenseModal')?.remove();document.body.classList.remove('pm-expense-modal-open');}
  function ensureExpenseStyles(){
    if(document.getElementById('pmExpenseModalStyles'))return;
    const st=document.createElement('style'); st.id='pmExpenseModalStyles'; st.textContent=`#pmExpenseModal{position:fixed;inset:0;z-index:100001;font-family:Arial,Helvetica,sans-serif}#pmExpenseModal .pm-exp-backdrop{position:absolute;inset:0;background:rgba(2,6,23,.72);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px}#pmExpenseModal .pm-exp-dialog{width:min(560px,100%);background:#0d1628;border:1px solid #2b4266;border-radius:14px;box-shadow:0 25px 70px rgba(0,0,0,.5);color:#fff;overflow:hidden}#pmExpenseModal .pm-exp-head{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #223451}#pmExpenseModal .pm-exp-head strong{font-size:16px}#pmExpenseModal .pm-exp-close{background:transparent;border:0;color:#9fb0cf;font-size:24px;cursor:pointer}#pmExpenseModal .pm-exp-body{padding:18px}.pm-exp-actions{display:flex;justify-content:flex-end;gap:8px;padding:14px 18px;border-top:1px solid #223451}body.pm-expense-modal-open{overflow:hidden}`;document.head.appendChild(st);
  }
  function openExpenseModal(id=null){
    ensureExpenseStyles(); closeExpenseModal();
    const row=id?expensesCache.find(x=>Number(x.id)===Number(id)):null;
    const root=document.createElement('div');root.id='pmExpenseModal';root.innerHTML=`<div class="pm-exp-backdrop"><div class="pm-exp-dialog" role="dialog" aria-modal="true"><div class="pm-exp-head"><strong>${row?'Edit Pengeluaran':'Tambah Pengeluaran'}</strong><button class="pm-exp-close" type="button" aria-label="Tutup">×</button></div><div class="pm-exp-body"><div class="grid g2"><div class="field"><label>Tanggal</label><input id="pmExpDate" type="date" value="${E(row?.tanggal||new Date().toISOString().slice(0,10))}"></div><div class="field"><label>Nominal</label><input id="pmExpNominal" type="number" min="0" step="1" value="${N(row?.nominal)}"></div><div class="field"><label>Keperluan</label><input id="pmExpNeed" value="${E(row?.keperluan||'')}"></div><div class="field"><label>Catatan</label><input id="pmExpNote" value="${E(row?.catatan||'')}"></div></div></div><div class="pm-exp-actions"><button class="btn secondary" type="button" id="pmExpCancel">Batal</button><button class="btn green" type="button" id="pmExpSave">Simpan</button></div></div></div>`;document.body.appendChild(root);document.body.classList.add('pm-expense-modal-open');
    const close=()=>closeExpenseModal();root.querySelector('.pm-exp-close').onclick=close;root.querySelector('#pmExpCancel').onclick=close;
    root.querySelector('#pmExpSave').onclick=async()=>{const payload={tanggal:S(root.querySelector('#pmExpDate').value)||new Date().toISOString().slice(0,10),nominal:Math.max(0,N(root.querySelector('#pmExpNominal').value)),keperluan:S(root.querySelector('#pmExpNeed').value),catatan:S(root.querySelector('#pmExpNote').value)};if(!payload.keperluan)return msg('Keperluan wajib diisi.');try{const d=DB();const r=id?await d.from('pengeluaran_keuangan').update(payload).eq('id',id):await d.from('pengeluaran_keuangan').insert([payload]);if(r.error)throw r.error;close();msg(row?'Pengeluaran diperbarui.':'Pengeluaran disimpan.');await load('','')}catch(e){console.error('[PM] expense save',e);msg('Gagal menyimpan pengeluaran: '+(e.message||e));}};
  }
  async function deleteExpense(id){if(!confirm('Hapus pengeluaran ini?'))return;try{const d=DB();const r=await d.from('pengeluaran_keuangan').delete().eq('id',id);if(r.error)throw r.error;msg('Pengeluaran dihapus.');await load('','')}catch(e){console.error('[PM] expense delete',e);msg('Gagal menghapus pengeluaran: '+(e.message||e));}}
  async function financePage(from='',to=''){try{await load(S(from),S(to));}catch(e){console.error('[PM] finance',e);msg('Gagal membaca laporan keuangan: '+(e.message||e));}}
  window.financePage=financePage;window.financePageStable=financePage;window.pmExpenseAdd=openExpenseModal;
  const nav=document.querySelector('[data-p="finance"]');if(nav&&!nav.dataset.pmFinanceCore){nav.dataset.pmFinanceCore='1';nav.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(typeof window.pmSetCurrentPage==='function')window.pmSetCurrentPage('finance');financePage('','')},true)}
})();
