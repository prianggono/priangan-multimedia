/* Priangan Multimedia: history actions + edit + publish + delete + discount */
(function () {
  'use strict';
  const S = v => String(v ?? '').trim();
  const N = v => { const n = Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.')); return Number.isFinite(n) ? n : 0; };
  const E = v => S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const M = v => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const D = (a,b) => { if(!a||!b)return 1; const d=Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000); return d>=0?d+1:1; };
  const toast = t => typeof window.msg==='function' ? window.msg(t) : alert(t);
  let editId=null, editNo='', discount=0, discountPct=0;

  function DB(){
    if(typeof db!=='undefined'&&db)return db;
    const c=window.PRIANGAN_CONFIG||{}; const u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL); const k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);
    return u&&k&&window.supabase?.createClient?window.supabase.createClient(u,k):null;
  }
  function missing(e){const s=S(e?.message);let m=s.match(/Could not find the '([^']+)' column/i);if(m)return m[1];m=s.match(/column ['\"]([^'\"]+)['\"] does not exist/i);return m?m[1]:'';}
  async function ins(table,payload){
    let p=Array.isArray(payload)?payload.map(x=>({...x})):{...payload};
    for(let i=0;i<25;i++){const r=await DB().from(table).insert(p).select('id');if(!r.error)return r;const c=missing(r.error);if(!c)return r;if(Array.isArray(p)){if(!p.some(x=>Object.hasOwn(x,c)))return r;p=p.map(x=>{const y={...x};delete y[c];return y;});}else{if(!Object.hasOwn(p,c))return r;delete p[c];}}
    return {error:{message:'Schema '+table+' tidak dapat disesuaikan.'}};
  }
  async function upd(table,id,payload){
    let p={...payload};
    for(let i=0;i<25;i++){const r=await DB().from(table).update(p).eq('id',id);if(!r.error)return r;const c=missing(r.error);if(!c||!Object.hasOwn(p,c))return r;delete p[c];}
    return {error:{message:'Schema '+table+' tidak dapat disesuaikan.'}};
  }
  async function del(table,col,val){return DB().from(table).delete().eq(col,val);}

  function sub(i){
    const h=N(i.harga), dur=D(i.mulai,i.selesai), w=N(i.lebar), t=N(i.tinggi), p=N(i.panjang), q=Math.max(1,N(i.qty));
    if(i.tipe==='luas')return w*t*h*dur;
    if(i.tipe==='rigging')return ((p*2)+(t*2))*h*dur;
    if(i.tipe==='level'){const led=(items||[]).find(x=>/led|videotron/i.test(x.item||''));return (led?N(led.lebar):w)*t*h*dur;}
    return q*h*dur;
  }
  function base(){return (items||[]).reduce((s,i)=>s+sub(i),0);}

  function discountUI(){
    const total=document.querySelector('#total'); if(!total||document.querySelector('#pmDiscount'))return;
    const card=total.closest('.card'); if(!card)return;
    const box=document.createElement('div'); box.id='pmDiscount'; box.style.cssText='margin-top:14px;padding-top:14px;border-top:1px solid var(--border)';
    box.innerHTML=`<div class="grid g2"><div class="field"><label>Diskon (%)</label><input id="pmDiscPct" type="number" min="0" max="100" step="0.01" value="${discountPct.toFixed(2)}"></div><div class="field"><label>Diskon (Rp)</label><input id="pmDisc" type="number" min="0" step="1" value="${Math.round(discount)}"></div></div><div class="sum" style="margin-top:10px"><span>Grand Total</span><b id="pmGrand">${M(Math.max(0,base()-discount))}</b></div>`;
    card.insertBefore(box,total.closest('.sum'));
    const pct=box.querySelector('#pmDiscPct'), amt=box.querySelector('#pmDisc');
    const sync=who=>{const b=base();if(who==='pct'){discountPct=Math.max(0,Math.min(100,N(pct.value)));discount=Math.round(b*discountPct/100);amt.value=discount;}else{discount=Math.max(0,Math.min(b,N(amt.value)));discountPct=b?discount/b*100:0;pct.value=discountPct.toFixed(2);}box.querySelector('#pmGrand').textContent=M(Math.max(0,b-discount));total.textContent=M(b);};
    pct.oninput=()=>sync('pct'); amt.oninput=()=>sync('amt'); sync('amt');
  }
  const obs=new MutationObserver(()=>{if(document.querySelector('#total'))discountUI();if(S(document.querySelector('#title')?.textContent)==='Riwayat Penawaran'&&!document.querySelector('.pmHistActions'))renderHistory();});
  obs.observe(document.body,{childList:true,subtree:true});

  async function editQuote(id){
    const d=DB();if(!d)return toast('Supabase belum terhubung.');
    try{
      const q=await d.from('penawaran').select('*').eq('id',id).single(); if(q.error)throw q.error;
      const r=await d.from('penawaran_items').select('*').eq('penawaran_id',id).order('id'); if(r.error)throw r.error;
      const row=q.data, its=r.data||[]; const b=its.reduce((s,x)=>s+N(x.subtotal),0); const net=N(row.grand_total??row.total); editId=id;editNo=S(row.nomor_penawaran||row.nomor);discount=Math.max(0,Math.min(b,b-net));
      const explicit=row.diskon??row.discount??row.nilai_diskon;if(explicit!=null&&N(explicit)>0)discount=Math.min(b,N(explicit));discountPct=b?discount/b*100:0;
      items=its.map(x=>({id:Date.now()+Math.random(),kode:S(x.kode),item:S(x.item||x.nama_item),harga:N(x.harga_jual??x.harga),qty:N(x.qty??x.jumlah)||1,lebar:N(x.lebar),tinggi:N(x.tinggi),panjang:N(x.panjang),mulai:S(x.tanggal_mulai||x.mulai),selesai:S(x.tanggal_selesai||x.selesai),tipe:S(x.tipe_perhitungan||x.tipe)||'qty'}));
      page='quotation';render();setTimeout(()=>{const set=(s,v)=>{const e=document.querySelector(s);if(e)e.value=v??''};set('#qc',row.nama_client||row.client_name);set('#qp',row.perusahaan);set('#qw',row.whatsapp||row.telepon);set('#qe',row.email);set('#qeve',row.nama_event||row.event_name||row.event||row.project);set('#qs',row.tanggal_mulai);set('#qe2',row.tanggal_selesai);discountUI();document.querySelector('#pmDisc').value=Math.round(discount);document.querySelector('#pmDiscPct').value=discountPct.toFixed(2);document.querySelector('#pmDisc').dispatchEvent(new Event('input'));toast('Mode edit: '+(editNo||id));},0);
    }catch(e){console.error(e);toast('Gagal membuka penawaran: '+(e.message||e));}
  }

  async function saveQuote(){
    const d=DB();if(!d)return toast('Supabase belum terhubung.');
    const button=document.querySelector('button[onclick="saveQuote()"]');if(button?.dataset.busy==='1')return;if(button){button.dataset.busy='1';button.disabled=true;button.textContent='Menyimpan...';}
    try{
      const client=S(document.querySelector('#qc')?.value), company=S(document.querySelector('#qp')?.value), wa=S(document.querySelector('#qw')?.value), email=S(document.querySelector('#qe')?.value), event=S(document.querySelector('#qeve')?.value), start=S(document.querySelector('#qs')?.value)||null,end=S(document.querySelector('#qe2')?.value)||null;
      if(!client||!company||!event)throw Error('Client, Perusahaan, dan Nama Event wajib diisi.');if(!items?.length)throw Error('Tambahkan minimal 1 item.');
      const rows=items.map(i=>({...i,subtotal:sub(i)})).filter(i=>i.kode&&i.item);if(!rows.length)throw Error('Pilih minimal 1 Produk / Jasa.');
      const b=rows.reduce((s,i)=>s+i.subtotal,0);const pct=N(document.querySelector('#pmDiscPct')?.value);const amt=N(document.querySelector('#pmDisc')?.value);discount=amt>0?Math.min(b,amt):Math.round(b*Math.max(0,Math.min(100,pct))/100);discountPct=b?discount/b*100:0;const total=Math.max(0,b-discount);const nomor=editNo||('PM-'+new Date().getFullYear()+'-'+String(Date.now()).slice(-6));
      const p={nomor_penawaran:nomor,nama_client:client,perusahaan,telepon:wa,whatsapp:wa,email,event_name:event,nama_event:event,event,project:event,tanggal_mulai:start,tanggal_selesai:end,total,grand_total:total,status:'DRAFT',tanggal:new Date().toISOString().slice(0,10),tanggal_penawaran:new Date().toISOString().slice(0,10),diskon:discount,discount:discount,nilai_diskon:discount,persen_diskon:discountPct,discount_percent:discountPct};
      let id=editId;
      if(id){const u=await upd('penawaran',id,p);if(u.error)throw Error('Penawaran: '+u.error.message);const old=await d.from('penawaran_items').select('id').eq('penawaran_id',id);if(!old.error)for(const x of old.data||[])await del('penawaran_jadwal','penawaran_item_id',x.id);const di=await del('penawaran_items','penawaran_id',id);if(di.error)throw di.error;}
      else{const q=await ins('penawaran',p);if(q.error)throw Error('Penawaran: '+q.error.message);id=q.data?.[0]?.id;if(!id)throw Error('ID penawaran tidak dikembalikan Supabase.');}
      const ip=rows.map(i=>({penawaran_id:id,kode:i.kode,item:i.item,nama_item:i.item,harga_jual:i.harga,harga:i.harga,tipe_perhitungan:i.tipe,tipe:i.tipe,qty:i.qty,jumlah:i.qty,lebar:i.lebar||null,tinggi:i.tinggi||null,panjang:i.panjang||null,tanggal_mulai:i.mulai||null,tanggal_selesai:i.selesai||null,durasi:D(i.mulai,i.selesai),subtotal:i.subtotal}));
      const ir=await ins('penawaran_items',ip);if(ir.error)throw Error('Item penawaran: '+ir.error.message);if((ir.data||[]).length!==ip.length)throw Error('Item penawaran tidak lengkap tersimpan.');
      const sp=ip.map((i,n)=>({penawaran_item_id:ir.data[n].id,qty:i.qty,jumlah:i.qty,tanggal_mulai:i.tanggal_mulai,tanggal_selesai:i.tanggal_selesai,durasi:i.durasi,subtotal:i.subtotal}));const sr=await ins('penawaran_jadwal',sp);if(sr.error)console.warn('Jadwal gagal:',sr.error);
      toast((editId?'Penawaran berhasil diperbarui: ':'Penawaran berhasil disimpan: ')+nomor+' — Grand Total '+M(total));editId=null;editNo='';items=[];discount=0;discountPct=0;page='history';if(typeof load==='function')await load();render();
    }catch(e){console.error(e);toast('Gagal menyimpan penawaran: '+(e.message||e));}finally{if(button){button.dataset.busy='0';button.disabled=false;button.textContent='Simpan Penawaran';}}
  }

  async function publishQuote(id){
    const d=DB();if(!d)return toast('Supabase belum terhubung.');let last;
    for(const status of ['TERKIRIM','PUBLISHED','SENT']){const r=await d.from('penawaran').update({status}).eq('id',id);if(!r.error){toast('Penawaran ditandai SUDAH DIBERIKAN.');await renderHistory();return;}last=r.error;if(!/constraint|invalid|violates/i.test(S(r.error.message)))break;}
    console.error(last);toast('Gagal publish: '+(last?.message||'unknown error'));
  }
  async function deleteQuote(id){
    const d=DB();if(!d)return toast('Supabase belum terhubung.');if(!confirm('Hapus penawaran ini beserta item dan jadwalnya?'))return;
    try{const old=await d.from('penawaran_items').select('id').eq('penawaran_id',id);if(!old.error)for(const x of old.data||[])await del('penawaran_jadwal','penawaran_item_id',x.id);let r=await del('penawaran_items','penawaran_id',id);if(r.error)throw r.error;r=await del('penawaran','id',id);if(r.error)throw r.error;toast('Penawaran berhasil dihapus.');await renderHistory();}catch(e){console.error(e);toast('Gagal menghapus penawaran: '+(e.message||e));}
  }

  async function renderHistory(){
    const d=DB();if(!d)return;const r=await d.from('penawaran').select('*').order('id',{ascending:false});if(r.error)return toast('Gagal membaca riwayat: '+r.error.message);const rows=r.data||[];
    const c=document.querySelector('#content');if(!c)return;
    c.innerHTML=`<div class="head"><div><h1>Riwayat Penawaran</h1><p>Kelola penawaran yang tersimpan di Supabase.</p></div><button class="btn" onclick="go('quotation')">+ Buat Penawaran</button></div><div class="card"><div class="scroll"><table class="table"><thead><tr><th>No</th><th>Client</th><th>Perusahaan</th><th>Event</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows.map(row=>{const sent=['TERKIRIM','PUBLISHED','SENT'].includes(S(row.status||'DRAFT').toUpperCase());const status=sent?'TERKIRIM':S(row.status||'DRAFT');const event=row.nama_event||row.event_name||row.event||row.project||'-';return `<tr><td>${E(row.nomor_penawaran||row.nomor||'-')}</td><td>${E(row.nama_client||row.client_name||'-')}</td><td>${E(row.perusahaan||'-')}</td><td>${E(event)}</td><td>${M(row.grand_total??row.total)}</td><td><span class="pm-status ${sent?'sent':'draft'}">${E(status)}</span></td><td><div class="pmHistActions"><button class="btn sm" onclick="editQuotation(${Number(row.id)})">Edit</button>${sent?'<span class="pm-sent-note">Sudah diberikan</span>':'<button class="btn green sm" onclick="publishQuotation('+Number(row.id)+')">Publish</button>'}<button class="btn red sm" onclick="deleteQuotation(${Number(row.id)})">Hapus</button></div></td></tr>`;}).join('')||'<tr><td colspan="7">Belum ada penawaran.</td></tr>'}</tbody></table></div></div>`;
  }

  function install(){
    const q=window.quotationPage;if(typeof q==='function'&&!window.__pmQDiscount){window.__pmQDiscount=true;window.quotationPage=function(){q();setTimeout(discountUI,0);};}
    window.saveQuote=saveQuote;window.editQuotation=editQuote;window.publishQuotation=publishQuote;window.deleteQuotation=deleteQuote;window.renderHistoryActions=renderHistory;
    const p=window.printQuote;if(typeof p==='function'&&!window.__pmDiscountPrint){window.__pmDiscountPrint=true;window.printQuote=async function(){await p();const o=document.querySelector('#pmPrintPreview');if(!o)return;const b=base();const a=N(document.querySelector('#pmDisc')?.value);if(a<=0)return;const t=o.querySelector('table'),tb=t?.querySelector('tbody');if(!tb)return;if(!tb.querySelector('.pm-discount-row')){const tr=document.createElement('tr');tr.className='pm-discount-row';tr.innerHTML=`<td colspan="5" style="text-align:right;font-weight:700">DISKON (${(b?100*a/b:0).toFixed(2)}%)</td><td style="font-weight:700">- ${M(a)}</td>`;tb.appendChild(tr);}const cells=[...t.querySelectorAll('td')].filter(x=>/GRAND TOTAL/i.test(x.textContent||''));if(cells[0]?.nextElementSibling)cells[0].nextElementSibling.textContent=M(Math.max(0,b-a));};}
  }

  const st=document.createElement('style');st.textContent=`.pmHistActions{display:flex;gap:6px;align-items:center;flex-wrap:wrap;min-width:260px}.pm-status{display:inline-block;padding:5px 9px;border-radius:999px;font-size:11px;font-weight:800}.pm-status.draft{background:#26324a;color:#b9c9ef}.pm-status.sent{background:#063b2c;color:#35e6a1}.pm-sent-note{font-size:11px;color:#35e6a1;font-weight:700;white-space:nowrap}#pmDiscount{margin-bottom:4px}#pmGrand{color:#35e6a1}`;document.head.appendChild(st);
  install();
})();
