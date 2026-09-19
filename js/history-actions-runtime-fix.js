/* Priangan Multimedia — History Domain Core */
(function(){
  'use strict';
  if(window.__PM_HISTORY_DOMAIN_CORE) return;
  window.__PM_HISTORY_DOMAIN_CORE=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'');
    if(!s) return 0;
    const n=Number(s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));
    return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  const E=v=>S(v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const D=v=>{
    if(!v) return '-';
    const d=new Date(S(v).slice(0,10)+'T00:00:00');
    return Number.isNaN(d.getTime())?E(v):d.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'});
  };
  const DB=()=>window.db||window.__PM_STABLE_DB||window.__PRIANGAN_QUOTE_DB||null;

  const masterType=m=>{
    const sat=S(m?.satuan).toLowerCase().replace(/\s+/g,'');
    if(['unit','units','pcs','pc','buah','set','hari','trip','orang','lot'].includes(sat)) return 'qty';
    if(['m2','m²','meter2','meterpersegi','luas'].includes(sat)) return 'luas';
    const t=`${S(m?.item)} ${S(m?.kategori)} ${S(m?.kode)}`.toLowerCase();
    if(/level/.test(t)) return 'level';
    if(/rigging|rig/.test(t)) return 'rigging';
    if(/led|videotron/.test(t)) return 'luas';
    return 'qty';
  };

  const cost=(i,m)=>{
    const c=N(i.harga_modal??m?.harga_modal);
    if(c<=0) return {value:0,missing:true};
    const t=S(i.tipe_perhitungan||i.tipe||masterType(m)).toLowerCase();
    const q=Math.max(1,N(i.qty||i.jumlah)||1),w=N(i.lebar),h=N(i.tinggi),l=N(i.panjang),d=Math.max(1,N(i.durasi)||1);
    if(t==='luas') return {value:w*h*c*d,missing:false};
    if(t==='level') return {value:w*c*d,missing:false};
    if(t==='rigging') return {value:(l*2+h*2)*c*d,missing:false};
    return {value:q*c*d,missing:false};
  };

  function populateEditedQuotationHeader(q){
    const set=(id,value)=>{
      const el=document.querySelector('#'+id);
      if(el) el.value=S(value);
    };
    set('qc',q.nama_client||q.client||q.nama_pelanggan||'');
    set('qp',q.perusahaan||q.company||'');
    set('qw',q.telepon_wa||q.telepon||q.whatsapp||q.no_telepon||q.phone||'');
    set('qe',q.email||'');
    set('qeve',q.nama_event||q.event_name||q.event||q.project_name||'');
    set('qs',q.tanggal_mulai||q.tanggal_mulai_event||'');
    set('qe2',q.tanggal_selesai||q.tanggal_selesai_event||'');
  }

  function installQuotationHeaderUX(){
    if(document.getElementById('pmHistoryQuotationUX')) return;
    const style=document.createElement('style');
    style.id='pmHistoryQuotationUX';
    style.textContent=`
      #content .pm-item-card > .itemhead{cursor:pointer;user-select:none}
      #content .pm-item-card > .itemhead:hover{background:rgba(255,255,255,.018)}
      #content .pm-item-card .pm-collapse-btn{display:none!important}
    `;
    document.head.appendChild(style);
    document.addEventListener('click',e=>{
      const header=e.target.closest?.('#items > .pm-item-card > .itemhead');
      if(!header) return;
      if(e.target.closest('button,a,input,select,textarea')) return;
      const card=header.closest('.pm-item-card');
      const id=card?.dataset.itemId;
      if(!id||typeof window.toggleQuotationItem!=='function') return;
      e.preventDefault();
      window.toggleQuotationItem(id);
    },true);
  }

  async function editQuotation(id){
    const d=DB(),qid=Number(id);
    if(!d||!qid) return window.msg?.('Penawaran tidak ditemukan.');
    try{
      const [qr,ir,sr]=await Promise.all([
        d.from('penawaran').select('*').eq('id',qid).maybeSingle(),
        d.from('penawaran_items').select('*').eq('penawaran_id',qid).order('id'),
        d.from('penawaran_jadwal').select('*').eq('penawaran_id',qid).order('id')
      ]);
      if(qr.error) throw qr.error;
      if(ir.error) throw ir.error;
      if(sr.error) throw sr.error;
      if(!qr.data) return window.msg?.('Penawaran tidak ditemukan.');

      const q=qr.data,ss=sr.data||[],map=new Map();
      ss.forEach(s=>map.set(String(s.item_id),s));
      window.items=(ir.data||[]).map((r,i)=>{
        const s=map.get(String(r.id))||ss[i]||{};
        const quotePrice = N(r.harga ?? r.harga_jual);
        return {
          id:Date.now()+Math.random()+i,
          db_id:r.id,
          master_id:r.master_harga_id,
          master_harga_id:r.master_harga_id,
          kode:S(r.kode||r.kode_item),
          item:S(r.item||r.nama_item),
          nama_item:S(r.nama_item||r.item),
          kategori:S(r.kategori||''),
          satuan:S(r.satuan||''),
          harga:quotePrice,
          harga_jual:quotePrice,
          harga_modal:N(r.harga_modal),
          diskon_persen:N(r.diskon_persen),
          diskon_nominal:N(r.diskon_nominal),
          qty:Math.max(1,N(r.qty??r.jumlah??s.qty)||1),
          jumlah:Math.max(1,N(r.jumlah??r.qty??s.qty)||1),
          lebar:N(r.lebar),
          tinggi:N(r.tinggi),
          panjang:N(r.panjang),
          mulai:S(r.tanggal_mulai||s.tanggal_mulai||''),
          selesai:S(r.tanggal_selesai||s.tanggal_selesai||''),
          durasi:Math.max(1,N(r.durasi||s.durasi||s.durasi_hari)||1),
          tipe:S(r.tipe_perhitungan||r.tipe||''),
          tipe_perhitungan:S(r.tipe_perhitungan||r.tipe||''),
          level_enabled:!!r.level_enabled,
          level_master_harga_id:r.level_master_harga_id!=null?Number(r.level_master_harga_id):null,
          level_tinggi:r.level_enabled&&N(r.level_tinggi)>0?N(r.level_tinggi):null,
          level_harga:r.level_enabled&&N(r.level_harga)>0?N(r.level_harga):null,
          level_subtotal:r.level_enabled&&N(r.level_subtotal)>0?N(r.level_subtotal):0,
          __level_price_auto:r.level_enabled&&r.level_master_harga_id!=null
        };
      });

      window.__pmEditingQuotationId=qid;
      window.__PM_EDIT_QUOTATION_ID=qid;
      window.__pmEditingQuotationNumber=S(q.nomor_penawaran||q.nomor||'');
      window.__PM_EDIT_QUOTATION_NUMBER=S(q.nomor_penawaran||q.nomor||'');
      window.__PM_DISC_MODE='rp';
      window.__pmDiscountValue=Math.max(0,N(q.diskon_nominal??q.diskon));
      window.__pmDiscountPct=Math.max(0,N(q.diskon_persen));

      installQuotationHeaderUX();
      if(typeof window.go==='function') window.go('quotation');
      else if(typeof window.quotationPage==='function') window.quotationPage();

      populateEditedQuotationHeader(q);
      setTimeout(()=>{
        populateEditedQuotationHeader(q);
        if(typeof window.drawItems==='function') window.drawItems();
      },80);
    }catch(e){
      console.error('[PM] edit quotation',e);
      window.msg?.('Gagal membuka penawaran: '+(e.message||e));
    }
  }

  async function publishQuotation(id){
    const d=DB();
    if(!d) return window.msg?.('Supabase belum terhubung.');
    try{
      const r=await d.from('penawaran').update({status:'TERKIRIM'}).eq('id',Number(id));
      if(r.error) throw r.error;
      window.msg?.('Penawaran berhasil dipublish.');
      await renderHistory();
    }catch(e){
      console.error('[PM] history publish',e);
      window.msg?.('Gagal publish penawaran: '+(e.message||e));
    }
  }

  async function deleteQuotation(id){
    if(!confirm('Hapus penawaran ini beserta item, jadwal, item tambahan invoice, dan pembayaran?')) return;
    const d=DB(),qid=Number(id);
    try{
      if(!d) throw Error('Supabase belum terhubung.');
      const p=await d.from('pembayaran_penawaran').delete().eq('penawaran_id',qid);if(p.error) throw p.error;
      const x=await d.from('penawaran_invoice_items').delete().eq('penawaran_id',qid);if(x.error) throw x.error;
      const old=await d.from('penawaran_items').select('id').eq('penawaran_id',qid);if(old.error) throw old.error;
      const ids=(old.data||[]).map(x=>x.id).filter(Boolean);
      const j=await d.from('penawaran_jadwal').delete().eq('penawaran_id',qid);if(j.error) throw j.error;
      if(ids.length){
        const j1=await d.from('penawaran_jadwal').delete().in('item_id',ids);if(j1.error) throw j1.error;
        const j2=await d.from('penawaran_jadwal').delete().in('penawaran_item_id',ids);if(j2.error) throw j2.error;
      }
      const i=await d.from('penawaran_items').delete().eq('penawaran_id',qid);if(i.error) throw i.error;
      const r=await d.from('penawaran').delete().eq('id',qid);if(r.error) throw r.error;
      window.msg?.('Penawaran berhasil dihapus.');
      await renderHistory();
    }catch(e){
      console.error('[PM] history delete',e);
      window.msg?.('Gagal menghapus penawaran: '+(e.message||e));
    }
  }

  function installHistoryMobileStyles(){
    if(document.getElementById('pmHistoryMobileStyles')) return;
    const st=document.createElement('style');
    st.id='pmHistoryMobileStyles';
    st.textContent=`
      @media(max-width:700px){
        #content .pm-history-table{
          width:100%!important;
          min-width:0!important;
          table-layout:auto!important;
        }
        #content .pm-history-table thead{display:none}
        #content .pm-history-table tbody{display:block}
        #content .pm-history-table tbody tr{
          display:grid;
          grid-template-columns:minmax(0,1fr) minmax(0,1fr);
          gap:2px 18px;
          padding:9px 0;
          border-bottom:1px solid #20304b;
        }
        #content .pm-history-table tbody tr:last-child{border-bottom:0}
        #content .pm-history-table tbody td{
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:7px;
          min-width:0;
          padding:5px 0;
          border:0;
          white-space:normal!important;
          overflow-wrap:anywhere;
          word-break:normal;
          text-align:right!important;
        }
        #content .pm-history-table tbody td::before{
          flex:0 0 auto;
          margin-right:auto;
          color:#7185aa;
          font-size:10px;
          font-weight:700;
          text-align:left;
        }
        #content .pm-history-table tbody td:nth-child(1)::before{content:"No"}
        #content .pm-history-table tbody td:nth-child(2)::before{content:"Tanggal"}
        #content .pm-history-table tbody td:nth-child(3)::before{content:"Client"}
        #content .pm-history-table tbody td:nth-child(4)::before{content:"Perusahaan"}
        #content .pm-history-table tbody td:nth-child(5)::before{content:"Event"}
        #content .pm-history-table tbody td:nth-child(6)::before{content:"Total"}
        #content .pm-history-table tbody td:nth-child(7)::before{content:"DP"}
        #content .pm-history-table tbody td:nth-child(8)::before{content:"Dibayar"}
        #content .pm-history-table tbody td:nth-child(9)::before{content:"Margin"}
        #content .pm-history-table tbody td:nth-child(10)::before{content:"Status"}
        #content .pm-history-table tbody td:nth-child(11){
          grid-column:1 / -1;
          justify-content:flex-start;
          text-align:left!important;
          padding-top:8px;
        }
        #content .pm-history-table tbody td:nth-child(11)::before{content:"Aksi"}
        #content .pm-history-table .pmHistoryActions{
          flex:1;
          flex-wrap:wrap;
          justify-content:flex-start!important;
          gap:6px;
        }
        #content .pm-history-table .pmHistoryActions .btn.sm{
          min-height:36px;
          padding:7px 10px;
        }
        #content .pm-history-table .pm-history-action-cell{min-width:0}
      }
    `;
    document.head.appendChild(st);
  }

  async function renderHistory(){
    installHistoryMobileStyles();
    const d=DB();
    if(!d) return window.msg?.('Supabase belum terhubung.');
    try{
      const [qr,ir,mr,pr]=await Promise.all([
        d.from('penawaran').select('*').order('id',{ascending:false}),
        d.from('penawaran_items').select('*').order('id'),
        d.from('master_harga').select('*').order('id'),
        d.from('pembayaran_penawaran').select('penawaran_id,jenis,nominal').order('id',{ascending:true})
      ]);
      if(qr.error) throw qr.error;
      if(ir.error) throw ir.error;
      if(mr.error) throw mr.error;
      if(pr.error) throw pr.error;

      const rows=qr.data||[],items=ir.data||[],masters=mr.data||[],payments=pr.data||[];
      const byQ=new Map(),payBy=new Map();
      items.forEach(i=>{const k=S(i.penawaran_id);if(!byQ.has(k))byQ.set(k,[]);byQ.get(k).push(i);});
      payments.forEach(p=>{const k=S(p.penawaran_id),x=payBy.get(k)||{dp:0,paid:0},a=N(p.nominal);x.paid+=a;if(S(p.jenis).toUpperCase()==='DP')x.dp+=a;payBy.set(k,x);});

      const body=rows.map(r=>{
        const qid=S(r.id),list=byQ.get(qid)||[];
        const base=N(r.subtotal)||list.reduce((a,i)=>a+N(i.subtotal),0);
        const net=N(r.grand_total??r.total);
        const calc=list.reduce((a,i)=>{const c=cost(i,masters.find(x=>S(x.kode)===S(i.kode)));return{v:a.v+c.value,missing:a.missing||c.missing};},{v:0,missing:false});
        const margin=net>0?(net-calc.v)/net*100:0;
        const st=S(r.status||'DRAFT').toUpperCase(),sent=['TERKIRIM','PUBLISHED','SENT'].includes(st),pay=payBy.get(qid)||{dp:0,paid:0};
        return `<tr><td>${E(r.nomor_penawaran||r.nomor||'-')}</td><td>${D(r.tanggal_penawaran||r.created_at||r.tanggal_mulai)}</td><td>${E(r.nama_client||'-')}</td><td>${E(r.perusahaan||'-')}</td><td>${E(r.nama_event||r.event_name||r.event||'-')}</td><td>${M(net||base)}</td><td>${M(pay.dp)}</td><td>${M(pay.paid)}</td><td>${calc.missing?'—':margin.toFixed(1)+'%'}</td><td>${E(sent?'TERKIRIM':st)}</td><td><div class="pmHistoryActions">${sent?'':`<button class="btn green sm" type="button" data-pm-history-action="publish" data-id="${Number(r.id)}">Publish</button>`}<button class="btn sm" type="button" data-pm-history-action="edit" data-id="${Number(r.id)}">Edit</button><button class="btn secondary sm" type="button" data-pm-history-action="dp" data-id="${Number(r.id)}">DP</button><button class="btn red sm" type="button" data-pm-history-action="delete" data-id="${Number(r.id)}">Hapus</button></div></td></tr>`;
      }).join('');

      const c=document.querySelector('#content');
      document.querySelector('#title').textContent='Riwayat Penawaran';
      document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.p==='history'));
      c.innerHTML=`<div class="head"><div><h1>Riwayat Penawaran</h1><p>Penawaran tersimpan di Supabase.</p></div><button class="btn" type="button" data-pm-history-action="new">+ Buat Penawaran</button></div><div class="card"><div class="scroll"><table class="table pm-history-table"><thead><tr><th>No</th><th>Tanggal</th><th>Client</th><th>Perusahaan</th><th>Event</th><th>Total</th><th>DP</th><th>Dibayar</th><th>Margin Internal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${body||'<tr><td colspan="11" class="empty">Belum ada penawaran.</td></tr>'}</tbody></table></div></div><style>.pm-history-table .pm-history-action-cell{min-width:260px}.pmHistoryActions{display:flex;flex-wrap:wrap;gap:6px;align-items:center;position:relative;z-index:20}.pmHistoryActions .btn.sm{padding:6px 10px;font-size:12px;white-space:nowrap;pointer-events:auto!important;cursor:pointer!important}</style>`;

      if(c.dataset.pmHistoryActions!=='1'){
        c.dataset.pmHistoryActions='1';
        c.addEventListener('click',e=>{
          const b=e.target.closest?.('[data-pm-history-action]');
          if(!b) return;
          const id=Number(b.dataset.id),a=b.dataset.pmHistoryAction;
          e.preventDefault();
          e.stopImmediatePropagation();
          if(a==='edit') editQuotation(id);
          else if(a==='publish') publishQuotation(id);
          else if(a==='dp'){
            if(typeof window.inputDP==='function') window.inputDP(id);
            else window.msg?.('Modul pembayaran belum tersedia.');
          }else if(a==='delete') deleteQuotation(id);
          else if(a==='new') window.go?.('quotation');
        },true);
      }
    }catch(e){
      console.error('[PM] history render',e);
      window.msg?.('Gagal membaca riwayat: '+(e.message||e));
    }
  }

  window.renderHistory=renderHistory;
  // App shell route contract: app.js calls window.historyPage().
  window.historyPage=renderHistory;
  window.editQuotation=editQuotation;
  window.publishQuotation=publishQuotation;
  window.deleteQuotation=deleteQuotation;

  function installNav(){
    const n=document.querySelector('.nav[data-p="history"]');
    if(!n||n.dataset.pmHistoryCore) return;
    n.dataset.pmHistoryCore='1';
    n.addEventListener('click',e=>{
      e.preventDefault();
      e.stopImmediatePropagation();
      installQuotationHeaderUX();
      renderHistory();
      document.querySelector('.sidebar')?.classList.remove('open');
    },true);
  }

  installQuotationHeaderUX();
  installNav();
  window.addEventListener('load',installNav);
})();
