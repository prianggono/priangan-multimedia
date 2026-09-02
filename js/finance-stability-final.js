/* Priangan Multimedia — Finance Dashboard FINAL
 * Internal financial reporting only.
 * Source: penawaran + penawaran_items + master_harga + pembayaran_penawaran.
 * No client-facing document or DB schema is changed.
 */
(function(){
'use strict';
const S=v=>String(v??'').trim();
const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
const P=v=>`${N(v).toFixed(2)}%`;
const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const D=v=>{if(!v)return'-';const x=new Date(S(v).slice(0,10)+'T00:00:00');return Number.isNaN(x.getTime())?E(v):x.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'})};
const q=s=>document.querySelector(s);
function DB(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}if(window.__PM_STABLE_DB)return window.__PM_STABLE_DB;const c=window.PRIANGAN_CONFIG||{},u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL),k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);if(!u||!k||!window.supabase?.createClient)return null;window.__PM_STABLE_DB=window.supabase.createClient(u,k);return window.__PM_STABLE_DB}
function dateOf(r){return S(r.tanggal_penawaran||r.tanggal||r.created_at||r.tanggal_mulai).slice(0,10)}
function invoiceNo(r){return S(r.nomor_invoice||'')}
function invoiceStatus(r){return S(r.status_invoice||'').toUpperCase()||(invoiceNo(r)?'DRAFT':'BELUM DIBUAT')}
function masterType(m){const sat=S(m?.satuan).toLowerCase().replace(/\s+/g,'');if(['unit','units','pcs','pc','buah','set'].includes(sat))return'qty';if(['m2','m²','meter2','meterpersegi','luas'].includes(sat))return'luas';const t=(S(m?.item)+' '+S(m?.kategori)+' '+S(m?.kode)).toLowerCase();if(/rigging|rig/.test(t))return'rigging';if(/level/.test(t))return'level';if(/led|videotron/.test(t))return'luas';return'qty'}
function itemType(i,m){const raw=S(i.tipe_perhitungan||i.tipe).toLowerCase();return['level','rigging','luas','qty'].includes(raw)?raw:masterType(m)}
function costPerUnit(i,m){const own=N(i.harga_modal??i.modal);return own>0?own:N(m?.harga_modal)}
function itemCost(i,m){const c=costPerUnit(i,m);if(c<=0)return 0;const t=itemType(i,m),qty=Math.max(1,N(i.qty??i.jumlah??1)),w=N(i.lebar),h=N(i.tinggi),len=N(i.panjang),dur=Math.max(1,N(i.durasi||1));if(t==='luas')return w*h*c*dur;if(t==='level')return w*c*dur;if(t==='rigging')return((len*2)+(h*2))*c*dur;return qty*c*dur}
function classify(r){const s=S(r.status||'DRAFT').toUpperCase();return{cancel:s.includes('BATAL')||s.includes('CANCEL'),deal:['DEAL','APPROVED','ACC','DISETUJUI','TERKIRIM','SENT','PUBLISHED','DELIVERED'].includes(s),draft:s==='DRAFT'}}
async function load(from='',to=''){
 const d=DB();if(!d)throw new Error('Supabase belum terhubung.');
 const [qr,ir,mr,pr]=await Promise.all([d.from('penawaran').select('*').order('id',{ascending:false}),d.from('penawaran_items').select('*').order('id'),d.from('master_harga').select('*').order('id'),d.from('pembayaran_penawaran').select('*').order('id',{ascending:true})]);
 if(qr.error)throw qr.error;if(ir.error)throw ir.error;if(mr.error)throw mr.error;if(pr.error)throw pr.error;
 const masters=new Map((mr.data||[]).map(x=>[S(x.kode),x])),byQuote=new Map();(ir.data||[]).forEach(x=>{const k=S(x.penawaran_id);if(!byQuote.has(k))byQuote.set(k,[]);byQuote.get(k).push(x)});
 const paymentRows=pr.data||[];window.__PM_FINANCE_PAYMENT_ROWS=paymentRows;const paidBy=new Map();paymentRows.forEach(x=>{const k=S(x.penawaran_id);paidBy.set(k,(paidBy.get(k)||0)+N(x.nominal))});
 const today=new Date().toISOString().slice(0,10);
 const rows=(qr.data||[]).filter(r=>{const dt=dateOf(r);return(!from||dt>=from)&&(!to||dt<=to)}).map(r=>{
  const details=(byQuote.get(S(r.id))||[]).map(i=>({item:i,master:masters.get(S(i.kode)),cost:itemCost(i,masters.get(S(i.kode)))}));
  const base=N(r.subtotal)||details.reduce((a,x)=>a+N(x.item.subtotal),0),disc=Math.max(0,Math.min(base,N(r.diskon??r.discount??r.nilai_diskon??r.discount_amount))),total=Math.max(0,N(r.grand_total??r.total??r.total_harga)||base-disc),modal=details.reduce((a,x)=>a+x.cost,0),laba=total-modal,margin=total>0?laba/total*100:0;
  const paid=paidBy.get(S(r.id))??N(r.total_dibayar),inv=invoiceNo(r)||invoiceStatus(r)!=='BELUM DIBUAT',invTotal=inv?total:0,balance=inv?Math.max(0,invTotal-paid):0,due=S(r.jatuh_tempo||'').slice(0,10),overdue=inv&&balance>0&&due&&due<today;
  return{r,base,disc,total,modal,laba,margin,paid,inv,invTotal,balance,due,overdue,...classify(r)};
 });
 render(rows,from,to,paymentRows);
}
function sum(rows,key){return rows.reduce((a,r)=>a+N(r[key]),0)}
function render(rows,from,to,paymentRows){
 const active=rows.filter(r=>!r.cancel),sales=active.filter(r=>r.inv||r.deal),inv=active.filter(r=>r.inv),
  omzet=sum(sales,'total'),modal=sum(sales,'modal'),laba=sum(sales,'laba'),disc=sum(active,'disc'),pipeline=sum(active.filter(r=>!r.inv&&!r.deal),'total'),
  paid=sum(inv,'paid'),receivable=sum(inv,'balance'),invoiceUnpaid=inv.filter(r=>r.balance>0).length,overdue=inv.filter(r=>r.overdue).length,
  margin=omzet>0?laba/omzet*100:0,invoiceTotal=sum(inv,'invTotal'),lunas=inv.filter(r=>r.balance<=0).length,draft=active.filter(r=>r.draft).length,deal=active.filter(r=>r.deal).length,cancel=rows.filter(r=>r.cancel).length;
 const ids=new Set(rows.map(r=>S(r.r.id))),cashIn=(paymentRows||[]).filter(p=>ids.has(S(p.penawaran_id))).reduce((a,p)=>a+N(p.nominal),0);
 q('#title').textContent='Laporan Keuangan';document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.p==='finance'));const c=q('#content');
 c.innerHTML=`
 <div class="head"><div><h1>Laporan Keuangan</h1><p>Omzet terjual, margin keuntungan kotor, modal, pembayaran, piutang invoice dan pipeline.</p></div><button class="btn secondary" type="button" onclick="financePageStable(document.querySelector('#financeStableFrom')?.value||'',document.querySelector('#financeStableTo')?.value||'')">↻ Refresh</button></div>
 <div class="card" style="margin-bottom:16px"><div class="grid g2"><div class="field"><label>Dari Tanggal</label><input id="financeStableFrom" type="date" value="${E(from)}"></div><div class="field"><label>Sampai Tanggal</label><input id="financeStableTo" type="date" value="${E(to)}"></div></div><div class="actions"><button class="btn" type="button" onclick="financePageStable(document.querySelector('#financeStableFrom').value,document.querySelector('#financeStableTo').value)">Terapkan Filter</button><button class="btn secondary" type="button" onclick="financePageStable('','')">Semua Data</button></div></div>
 <div class="grid g4"><div class="card stat"><small>Omzet Terjual</small><strong>${M(omzet)}</strong></div><div class="card stat"><small>Total Modal</small><strong>${M(modal)}</strong></div><div class="card stat"><small>Laba Kotor</small><strong style="color:#00e0a4">${M(laba)}</strong></div><div class="card stat"><small>Margin Kotor</small><strong>${P(margin)}</strong></div></div>
 <div class="grid g4" style="margin-top:16px"><div class="card stat"><small>Nilai Invoice</small><strong>${M(invoiceTotal)}</strong></div><div class="card stat"><small>Sudah Dibayar</small><strong style="color:#00d4a8">${M(paid)}</strong></div><div class="card stat"><small>Piutang Invoice</small><strong style="color:#ffbd2e">${M(receivable)}</strong></div><div class="card stat"><small>Invoice Belum Lunas</small><strong>${invoiceUnpaid}</strong></div></div>
 <div class="grid g4" style="margin-top:16px"><div class="card stat"><small>Invoice Lunas</small><strong>${lunas}</strong></div><div class="card stat"><small>Jatuh Tempo</small><strong>${overdue}</strong></div><div class="card stat"><small>Total Diskon</small><strong>${M(disc)}</strong></div><div class="card stat"><small>Kas Masuk</small><strong>${M(cashIn)}</strong></div></div>
 <div class="grid g4" style="margin-top:16px"><div class="card stat"><small>Penawaran Aktif</small><strong>${active.length}</strong></div><div class="card stat"><small>DRAFT</small><strong>${draft}</strong></div><div class="card stat"><small>TERKIRIM / DEAL</small><strong>${deal}</strong></div><div class="card stat"><small>Pipeline</small><strong>${M(pipeline)}</strong></div></div>
 <div class="card" style="margin-top:16px"><div><b>Detail Keuangan per Penawaran / Invoice</b><div style="color:var(--muted);font-size:12px;margin-top:4px">Laba kotor hanya dihitung sebagai omzet terjual (invoice atau status DEAL) dikurangi estimasi modal. DRAFT tetap tampil sebagai pipeline, bukan omzet terjual.</div></div><div class="scroll" style="margin-top:12px"><table class="table"><thead><tr><th>Tanggal</th><th>No Penawaran</th><th>Invoice</th><th>Client</th><th>Event</th><th>Total</th><th>Modal</th><th>Laba Kotor</th><th>Margin</th><th>Dibayar</th><th>Sisa</th><th>Tempo</th><th>Status</th></tr></thead><tbody>${active.map(x=>`<tr><td>${D(dateOf(x.r))}</td><td>${E(x.r.nomor_penawaran||x.r.nomor||'-')}</td><td>${E(invoiceNo(x.r)||'-')}</td><td>${E(x.r.nama_client||x.r.client_name||'-')}</td><td>${E(x.r.event_name||x.r.nama_event||'-')}</td><td>${M(x.total)}</td><td>${M(x.modal)}</td><td><b>${x.inv||x.deal?M(x.laba):'-'}</b></td><td><b>${x.inv||x.deal?P(x.margin):'-'}</b></td><td>${x.inv?M(x.paid):'-'}</td><td>${x.inv?M(x.balance):'-'}</td><td>${x.due?D(x.due):'-'}</td><td>${x.inv?(x.overdue?'JATUH TEMPO':x.balance<=0?'LUNAS':'BELUM LUNAS'):S(x.r.status||'DRAFT')}</td></tr>`).join('')||'<tr><td colspan="13" class="empty">Belum ada data.</td></tr>'}</tbody></table></div></div>
 <div class="grid g2" style="margin-top:16px"><div class="card"><b>Arus Kas / Pembayaran</b><div class="sum" style="margin-top:12px"><span>Kas masuk tercatat</span><b>${M(cashIn)}</b></div><p style="color:var(--muted);font-size:12px;margin:8px 0 0">Total DP dan pelunasan yang tercatat untuk penawaran dalam periode filter.</p></div><div class="card"><b>Kesehatan Piutang</b><div class="sum" style="margin-top:12px"><span>Invoice belum lunas</span><b>${invoiceUnpaid}</b></div><div class="sum" style="margin-top:8px"><span>Jatuh tempo</span><b>${overdue}</b></div><div class="sum" style="margin-top:8px"><span>Total piutang</span><b>${M(receivable)}</b></div></div></div>
 <div class="card" style="margin-top:16px"><b>Catatan Perhitungan</b><p style="color:var(--muted);font-size:12px;line-height:1.6;margin:8px 0 0">Harga modal memakai <code>penawaran_items.harga_modal</code> jika tersedia, jika tidak menggunakan harga modal Master Harga. Qty, Luas, Level dan Rigging mengikuti aturan Penawaran. Untuk Level, modal dihitung lebar × harga modal × durasi; tinggi hanya informasi. Invoice tambahan/overtime yang tersimpan khusus di perangkat tidak diberi biaya modal fiktif.</p></div>`;
}
window.financePageStable=function(from='',to=''){load(S(from),S(to)).catch(e=>{console.error('[PM] finance final',e);const c=q('#content');if(c)c.innerHTML=`<div class="card" style="border-color:#b42318;color:#ffb4ab"><b>Gagal memuat laporan keuangan</b><p>${E(e?.message||e)}</p></div>`})};
const nav=document.querySelector('[data-p="finance"]');if(nav&&!nav.dataset.financeFinal){nav.dataset.financeFinal='1';nav.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();window.financePageStable('','')},true)}
})();