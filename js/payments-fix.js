/* PRIANGAN MULTIMEDIA — separate DP and pelunasan entry */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const N=v=>{const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0;};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const toast=t=>typeof window.msg==='function'?window.msg(t):alert(t);
  function DB(){if(typeof db!=='undefined'&&db)return db;const c=window.PRIANGAN_CONFIG||{};const u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL),k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);return u&&k&&window.supabase?.createClient?window.supabase.createClient(u,k):null;}
  async function openPayment(id,type){
    const d=DB();if(!d)return toast('Supabase belum terhubung.');
    type=type==='PELUNASAN'?'PELUNASAN':'DP';
    try{
      const q=await d.from('penawaran').select('*').eq('id',id).single();if(q.error)throw q.error;
      const p=await d.from('pembayaran_penawaran').select('*').eq('penawaran_id',id).order('tanggal_bayar',{ascending:false}).order('id',{ascending:false});if(p.error)throw p.error;
      const payments=p.data||[],total=N(q.data.grand_total??q.data.total),paid=payments.reduce((s,x)=>s+N(x.nominal),0),balance=Math.max(0,total-paid);
      if(balance<=0)return toast('Penawaran ini sudah lunas.');
      const isDP=type==='DP';
      document.getElementById('pmPaymentModal')?.remove();
      const modal=document.createElement('div');modal.id='pmPaymentModal';
      modal.innerHTML=`<div class="pm-pay-backdrop"><div class="pm-pay-modal">
        <div class="pm-pay-head"><div><div class="pm-pay-kicker">${isDP?'PEMBAYARAN AWAL':'PEMBAYARAN AKHIR'}</div><h2>${isDP?'Input DP':'Input Pelunasan'}</h2><p>${E(q.data.nomor_penawaran||q.data.nomor||'-')} · ${E(q.data.nama_client||q.data.client_name||'-')} · ${E(q.data.nama_event||q.data.event_name||q.data.event||q.data.project||'-')}</p></div><button type="button" class="pm-pay-close">×</button></div>
        <div class="pm-pay-summary"><span><small>Nilai Penawaran</small><b>${M(total)}</b></span><span><small>Total Dibayar</small><b>${M(paid)}</b></span><span><small>Sisa</small><b>${M(balance)}</b></span></div>
        <div class="pm-pay-note">${isDP?'Masukkan nominal DP yang benar-benar sudah diterima dari client.':'Masukkan nominal pembayaran/pelunasan yang benar-benar sudah diterima dari client.'}</div>
        <div class="grid g2"><div class="field"><label>Tanggal Pembayaran</label><input id="pmPayDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Nominal ${isDP?'DP':'Pelunasan'}</label><input id="pmPayAmount" type="number" min="1" max="${balance}" step="1" value="" placeholder="Masukkan nominal"></div><div class="field"><label>Metode</label><select id="pmPayMethod"><option>Transfer BCA</option><option>Transfer Bank</option><option>Cash</option><option>QRIS</option><option>Lainnya</option></select></div><div class="field"><label>Catatan</label><input id="pmPayNote" placeholder="${isDP?'DP diterima':'Pelunasan diterima'}"></div></div>
        <div class="pm-pay-actions"><button class="btn secondary pm-pay-close" type="button">Batal</button><button class="btn green" id="pmPaySave" type="button">Simpan ${isDP?'DP':'Pelunasan'}</button></div>
        <div class="card" style="margin-top:16px"><b>Riwayat Pembayaran Event</b><div class="scroll"><table class="table"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Nominal</th><th>Metode</th><th>Catatan</th></tr></thead><tbody>${payments.map(x=>`<tr><td>${E(x.tanggal_bayar||'-')}</td><td>${E(x.jenis||'-')}</td><td>${M(x.nominal)}</td><td>${E(x.metode||'-')}</td><td>${E(x.catatan||'-')}</td></tr>`).join('')||'<tr><td colspan="5">Belum ada pembayaran.</td></tr>'}</tbody></table></div></div>
      </div></div>`;
      document.body.appendChild(modal);modal.querySelectorAll('.pm-pay-close').forEach(b=>b.onclick=()=>modal.remove());
      const save=modal.querySelector('#pmPaySave');
      save.onclick=async()=>{const amount=N(modal.querySelector('#pmPayAmount').value);if(amount<=0)return toast('Nominal pembayaran wajib diisi.');if(amount>balance)return toast(`Nominal melebihi sisa pembayaran ${M(balance)}.`);save.disabled=true;save.textContent='Menyimpan...';try{
        const ins=await d.from('pembayaran_penawaran').insert({penawaran_id:id,tanggal_bayar:modal.querySelector('#pmPayDate').value,jenis:type,nominal:amount,metode:S(modal.querySelector('#pmPayMethod').value),catatan:S(modal.querySelector('#pmPayNote').value)}).select('id').single();if(ins.error)throw ins.error;
        const latest=await d.from('pembayaran_penawaran').select('nominal').eq('penawaran_id',id);if(latest.error)throw latest.error;const newPaid=(latest.data||[]).reduce((s,x)=>s+N(x.nominal),0),newBalance=Math.max(0,total-newPaid),status=newBalance<=0?'LUNAS':'DP DITERIMA';
        const up=await d.from('penawaran').update({total_dibayar:newPaid,sisa_pembayaran:newBalance,status_pembayaran:status}).eq('id',id);if(up.error)console.warn('Ringkasan pembayaran:',up.error);
        toast(`${isDP?'DP':'Pelunasan'} ${M(amount)} berhasil dicatat.`);modal.remove();if(typeof window.renderHistory==='function')await window.renderHistory();else if(typeof window.go==='function')window.go('history');
      }catch(e){console.error('Payment save error:',e);toast('Gagal menyimpan pembayaran: '+(e.message||e));}finally{save.disabled=false;save.textContent=`Simpan ${isDP?'DP':'Pelunasan'}`;}};
    }catch(e){console.error('Payment dialog error:',e);const msg=S(e?.message);if(/Could not find the table 'public\.pembayaran_penawaran'/i.test(msg))toast('Tabel pembayaran_penawaran belum ada di Supabase. Jalankan SQL migration pembayaran.');else toast('Gagal mengambil data pembayaran: '+msg);}
  }
  window.inputDP=id=>openPayment(Number(id),'DP');
  window.inputPelunasan=id=>openPayment(Number(id),'PELUNASAN');
  window.addPayment=id=>openPayment(Number(id),'DP');
  window.openPayment=id=>openPayment(Number(id),'DP');
  const style=document.createElement('style');style.textContent=`#pmPaymentModal .pm-pay-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.68);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}#pmPaymentModal .pm-pay-modal{width:min(800px,96vw);max-height:92vh;overflow:auto;background:var(--card,#101722);border:1px solid var(--border,#263246);border-radius:18px;padding:22px;box-shadow:0 25px 80px rgba(0,0,0,.5)}#pmPaymentModal .pm-pay-head{display:flex;justify-content:space-between;align-items:flex-start;gap:15px}.pm-pay-head h2{margin:2px 0 0}.pm-pay-head p{margin:6px 0 0;color:var(--muted)}#pmPaymentModal .pm-pay-kicker{font-size:11px;font-weight:800;letter-spacing:.12em;color:#4d8dff}#pmPaymentModal .pm-pay-close{border:0;background:transparent;color:inherit;font-size:28px;line-height:1;cursor:pointer}#pmPaymentModal .pm-pay-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.pm-pay-summary span{padding:13px;border:1px solid var(--border,#263246);border-radius:12px}.pm-pay-summary small{display:block;color:var(--muted);margin-bottom:4px}.pm-pay-summary b{display:block}#pmPaymentModal .pm-pay-note{margin-bottom:15px;padding:11px 13px;border-radius:10px;background:rgba(47,111,255,.09);border:1px solid rgba(47,111,255,.25);font-size:13px}#pmPaymentModal .pm-pay-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}@media(max-width:650px){#pmPaymentModal .pm-pay-summary{grid-template-columns:1fr}}`;document.head.appendChild(style);
})();
