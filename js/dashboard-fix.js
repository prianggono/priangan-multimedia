/* PRIANGAN MULTIMEDIA — Dashboard v2
 * Dashboard uses the same deduplicated client count as Client page and adds
 * event/quotation summary plus payment reminders. Internal finance data only.
 */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const n=Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  };
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const D=v=>{
    if(!v)return '-';
    const d=new Date(v);
    return Number.isNaN(d.getTime())?S(v).slice(0,10):d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
  };
  const norm=v=>S(v).toLowerCase().replace(/\s+/g,'');
  const clientKey=v=>[norm(v.nama_client),norm(v.perusahaan),norm(v.telepon||v.whatsapp),norm(v.email)].join('|');
  function DB(){
    if(typeof db!=='undefined'&&db)return db;
    const c=window.PRIANGAN_CONFIG||{};
    const u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL),k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);
    return u&&k&&window.supabase?.createClient?window.supabase.createClient(u,k):null;
  }
  function quoteDate(q){return S(q.tanggal_penawaran||q.tgl_penawaran||q.tanggal||q.created_at||q.tanggal_mulai).slice(0,10);}
  function eventName(q){return S(q.nama_event||q.event_name||q.event||q.project)||'Tanpa Nama Event';}
  function quoteTotal(q){return N(q.grand_total??q.total??q.total_harga??q.subtotal);}
  function status(q){return S(q.status||'DRAFT').toUpperCase();}
  function clientCount(list){
    const seen=new Set();
    for(const c of list||[]){const k=clientKey(c);if(k&&!seen.has(k))seen.add(k);}
    return seen.size;
  }
  function statusClass(s){
    const x=S(s).toUpperCase();
    if(['LUNAS','PAID','DEAL'].includes(x))return 'good';
    if(['TERKIRIM','SENT','PUBLISHED','READY'].includes(x))return 'info';
    return 'warn';
  }
  function injectStyle(){
    if(document.getElementById('pm-dashboard-v2-style'))return;
    const st=document.createElement('style');st.id='pm-dashboard-v2-style';st.textContent=`
      .pm-dash-hero{position:relative;overflow:hidden;border:1px solid rgba(77,141,255,.3);background:linear-gradient(135deg,#101b36 0%,#0d1427 55%,#101c31 100%);border-radius:20px;padding:24px;box-shadow:0 18px 50px rgba(0,0,0,.22);margin-bottom:16px}
      .pm-dash-hero:before{content:"";position:absolute;width:300px;height:300px;border-radius:50%;right:-110px;top:-170px;background:radial-gradient(circle,rgba(47,111,255,.28),transparent 68%);pointer-events:none}
      .pm-dash-hero h1{margin:0 0 6px;font-size:30px}.pm-dash-hero p{margin:0;color:var(--muted)}
      .pm-dash-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:18px}
      .pm-dash-stat{position:relative;min-height:116px;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
      .pm-dash-stat:after{content:"";position:absolute;width:90px;height:90px;border-radius:50%;right:-35px;bottom:-45px;background:rgba(77,141,255,.08)}
      .pm-dash-stat strong{font-size:26px;line-height:1.1}.pm-dash-stat small{color:var(--muted);font-weight:700}.pm-dash-label{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#7fa8ff;font-weight:800}
      .pm-dash-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(320px,.9fr);gap:16px;margin-top:16px}.pm-dash-panel{min-width:0}
      .pm-dash-panel h3{margin:0}.pm-dash-panel .sub{margin:5px 0 16px;color:var(--muted);font-size:13px}
      .pm-reminder{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 0;border-bottom:1px solid var(--border)}.pm-reminder:last-child{border-bottom:0}.pm-reminder-main{min-width:0}.pm-reminder-main b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pm-reminder-main small{display:block;color:var(--muted);margin-top:3px}.pm-reminder-amount{text-align:right;white-space:nowrap}.pm-reminder-amount b{display:block}.pm-badge{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.04em}.pm-badge.warn{background:rgba(245,158,11,.13);color:#fbbf24}.pm-badge.info{background:rgba(59,130,246,.13);color:#7db1ff}.pm-badge.good{background:rgba(16,185,129,.13);color:#52e0b0}
      .pm-empty{padding:22px 0;color:var(--muted);text-align:center}.pm-dash-table{width:100%;border-collapse:collapse}.pm-dash-table th,.pm-dash-table td{text-align:left;padding:11px 8px;border-bottom:1px solid var(--border);font-size:13px}.pm-dash-table th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.05em}.pm-dash-table td:last-child,.pm-dash-table th:last-child{text-align:right}.pm-dash-table tr:last-child td{border-bottom:0}
      .pm-alert{border:1px solid rgba(245,158,11,.28);background:linear-gradient(135deg,rgba(245,158,11,.09),rgba(245,158,11,.025));border-radius:14px;padding:14px;margin-top:16px}.pm-alert b{color:#fbbf24}.pm-alert p{margin:5px 0 0;color:var(--muted);font-size:13px}
      @media(max-width:900px){.pm-dash-grid{grid-template-columns:1fr}}@media(max-width:620px){.pm-dash-stat strong{font-size:21px}.pm-dash-hero h1{font-size:24px}}
    `;document.head.appendChild(st);
  }
  async function renderDashboard(){
    injectStyle();
    const content=document.querySelector('#content');if(!content)return;
    const activeCount=Array.isArray(window.masters)?window.masters.filter(r=>{
      const v=r.aktif;return v===true||v===1||!['FALSE','0','NO','TIDAK','NONAKTIF','INACTIVE','OFF'].includes(S(v).toUpperCase());
    }).length:0;
    let quotes=[],payments=[];
    try{
      const d=DB();
      if(!d)throw new Error('Supabase belum terhubung.');
      const [qr,pr]=await Promise.all([
        d.from('penawaran').select('*').order('id',{ascending:false}),
        d.from('pembayaran_penawaran').select('*').order('tanggal_bayar',{ascending:false})
      ]);
      if(qr.error)throw qr.error;
      quotes=qr.data||[];
      if(!pr.error)payments=pr.data||[];
    }catch(e){
      console.error('Dashboard load error:',e);
      quotes=[];payments=[];
    }
    const paidBy=new Map();
    payments.forEach(p=>{const id=S(p.penawaran_id);paidBy.set(id,(paidBy.get(id)||0)+N(p.nominal));});
    const quoteRows=quotes.map(q=>{
      const total=quoteTotal(q),paid=paidBy.get(S(q.id))||0,balance=Math.max(0,total-paid);
      return {...q,total,paid,balance,status:status(q),event:eventName(q),date:quoteDate(q)};
    });
    const outstanding=quoteRows.filter(q=>q.balance>0).sort((a,b)=>b.balance-a.balance);
    const totalOmzet=quoteRows.reduce((s,q)=>s+q.total,0);
    const totalPaid=quoteRows.reduce((s,q)=>s+q.paid,0);
    const totalOutstanding=quoteRows.reduce((s,q)=>s+q.balance,0);
    const today=new Date();today.setHours(0,0,0,0);
    const next7=new Date(today);next7.setDate(next7.getDate()+7);
    const upcoming=quoteRows.filter(q=>{if(!q.date)return false;const d=new Date(q.date+'T00:00:00');return d>=today&&d<=next7;}).sort((a,b)=>a.date.localeCompare(b.date));
    const sent=quoteRows.filter(q=>['TERKIRIM','SENT','PUBLISHED','READY','DEAL'].includes(q.status)).length;
    const draft=quoteRows.filter(q=>q.status==='DRAFT').length;
    const uniqueClients=clientCount(window.clients||[]);
    const contentHtml=`
      <section class="pm-dash-hero">
        <div class="pm-dash-label">PRIANGAN MULTIMEDIA · SALES & QUOTATION</div>
        <h1>Dashboard</h1>
        <p>Pantau client, penawaran, pembayaran, dan tagihan dalam satu layar.</p>
        <div class="pm-dash-actions">
          <button class="btn" type="button" onclick="go('quotation')">+ Buat Penawaran</button>
          <button class="btn secondary" type="button" onclick="go('clients')">Lihat Client</button>
          <button class="btn secondary" type="button" onclick="go('history')">Riwayat Penawaran</button>
        </div>
      </section>
      <div class="grid g4">
        <div class="card pm-dash-stat"><small>Client</small><strong>${uniqueClients}</strong><span style="color:var(--muted);font-size:12px">kontak unik</span></div>
        <div class="card pm-dash-stat"><small>Penawaran</small><strong>${quoteRows.length}</strong><span style="color:var(--muted);font-size:12px">${draft} draft · ${sent} aktif/terkirim</span></div>
        <div class="card pm-dash-stat"><small>Nilai Penawaran</small><strong>${M(totalOmzet)}</strong><span style="color:var(--muted);font-size:12px">total quotation</span></div>
        <div class="card pm-dash-stat"><small>Tagihan Berjalan</small><strong style="color:#fbbf24">${M(totalOutstanding)}</strong><span style="color:var(--muted);font-size:12px">${outstanding.length} penawaran belum lunas</span></div>
      </div>
      <div class="pm-dash-grid">
        <div class="card pm-dash-panel">
          <h3>Ringkasan Keuangan</h3><div class="sub">Posisi pembayaran seluruh penawaran yang tersimpan.</div>
          <div class="grid g2">
            <div class="card pm-dash-stat"><small>Total Dibayar</small><strong style="color:#00e0a4">${M(totalPaid)}</strong><span style="color:var(--muted);font-size:12px">DP + pelunasan</span></div>
            <div class="card pm-dash-stat"><small>Sisa Tagihan</small><strong style="color:#fbbf24">${M(totalOutstanding)}</strong><span style="color:var(--muted);font-size:12px">perlu follow-up</span></div>
          </div>
          <div style="margin-top:18px"><div style="display:flex;justify-content:space-between;margin-bottom:7px;font-size:12px;color:var(--muted)"><span>Progress pembayaran</span><b>${totalOmzet?Math.min(100,totalPaid/totalOmzet*100).toFixed(0):0}%</b></div><div style="height:9px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden"><div style="height:100%;width:${totalOmzet?Math.min(100,totalPaid/totalOmzet*100):0}%;background:linear-gradient(90deg,#2f6fff,#00d6a0);border-radius:99px"></div></div></div>
          ${upcoming.length?`<div class="pm-alert"><b>Pengingat event 7 hari ke depan</b><p>${upcoming.length} penawaran memiliki tanggal dalam 7 hari ke depan. Pastikan follow-up client dan kesiapan pembayaran.</p></div>`:''}
        </div>
        <div class="card pm-dash-panel">
          <h3>Pengingat Tagihan</h3><div class="sub">Prioritas follow-up berdasarkan nominal yang belum dibayar.</div>
          ${outstanding.slice(0,6).map(q=>`<div class="pm-reminder"><div class="pm-reminder-main"><b>${E(q.nama_client||q.client_name||'-')}</b><small>${E(q.event)} · ${E(q.nomor_penawaran||q.nomor||'-')}</small></div><div class="pm-reminder-amount"><b>${M(q.balance)}</b><span class="pm-badge ${statusClass(q.status)}">${E(q.status)}</span></div></div>`).join('')||'<div class="pm-empty">Tidak ada tagihan berjalan. Semua penawaran sudah lunas.</div>'}
          ${outstanding.length>6?`<div style="margin-top:12px;color:var(--muted);font-size:12px">+ ${outstanding.length-6} tagihan lainnya · buka Riwayat Penawaran untuk detail.</div>`:''}
        </div>
      </div>
      <div class="card pm-dash-panel" style="margin-top:16px">
        <h3>Penawaran Terbaru</h3><div class="sub">Aktivitas terakhir yang tersimpan di database.</div>
        <div class="scroll"><table class="pm-dash-table"><thead><tr><th>No</th><th>Client</th><th>Event</th><th>Tanggal</th><th>Status</th><th>Total</th><th>Sisa</th></tr></thead><tbody>
          ${quoteRows.slice(0,8).map(q=>`<tr><td>${E(q.nomor_penawaran||q.nomor||'-')}</td><td>${E(q.nama_client||q.client_name||'-')}</td><td>${E(q.event)}</td><td>${E(D(q.date))}</td><td><span class="pm-badge ${statusClass(q.status)}">${E(q.status)}</span></td><td>${M(q.total)}</td><td>${M(q.balance)}</td></tr>`).join('')||'<tr><td colspan="7" class="pm-empty">Belum ada penawaran.</td></tr>'}
        </tbody></table></div>
      </div>
      <div class="card" style="margin-top:16px"><div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><b>Master Harga</b><div style="color:var(--muted);font-size:12px;margin-top:4px">${activeCount} item aktif tersedia untuk quotation.</div></div><button class="btn secondary" type="button" onclick="go('master')">Kelola Master Harga</button></div></div>`;
    content.innerHTML=contentHtml;
    const title=document.querySelector('#title');if(title)title.textContent='Dashboard';
    document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.p==='dashboard'));
  }
  window.dashboardPage=renderDashboard;
  window.pmRefreshDashboard=renderDashboard;
})();
