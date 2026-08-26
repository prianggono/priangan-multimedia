/* DP / payment tracking for quotations. Internal only. */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function DB(){if(typeof db!=='undefined'&&db)return db;const c=window.PRIANGAN_CONFIG||{};const u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL),k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);return u&&k&&window.supabase?.createClient?window.supabase.createClient(u,k):null;}
  const toast=t=>typeof window.msg==='function'?window.msg(t):alert(t);

  async function paymentDialog(id){
    const d=DB();if(!d)return toast('Supabase belum terhubung.');
    const q=await d.from('penawaran').select('*').eq('id',id).single();if(q.error)return toast('Gagal membaca penawaran: '+q.error.message);
    const p=await d.from('pembayaran_penawaran').select('*').eq('penawaran_id',id).order('tanggal_bayar',{ascending:false});
    if(p.error)return toast('Tabel pembayaran belum siap: '+p.error.message);
    const total=N(q.data.grand_total??q.data.total);const paid=(p.data||[]).reduce((s,x)=>s+N(x.nominal),0);const balance=Math.max(0,total-paid);
    const old=document.getElementById('pmPaymentModal');if(old)old.remove();
    const modal=document.createElement('div');modal.id='pmPaymentModal';modal.innerHTML=`<div class="pm-pay-backdrop"><div class="pm-pay-modal"><div class="pm-pay-head"><div><h2>Pembayaran — ${E(q.data.nomor_penawaran||'-')}</h2><p>${E(q.data.nama_client||'-')} · ${E(q.data.nama_event||q.data.event_name||'-')}</p></div><button type="button" class="pm-pay-close">×</button></div><div class="pm-pay-summary"><span>Nilai Penawaran <b>${M(total)}</b></span><span>Sudah Dibayar <b>${M(paid)}</b></span><span>Sisa <b>${M(balance)}</b></span></div><div class="grid g2"><div class="field"><label>Tanggal Bayar</label><input id="pmPayDate" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Jenis</label><select id="pmPayType"><option value="DP">DP</option><option value="PELUNASAN">Pelunasan</option><option value="LAINNYA">Lainnya</option></select></div><div class="field"><label>Nominal</label><input id="pmPayAmount" type="number" min="0" step="1" value="${balance>0?Math.min(balance,total*.5):0}"></div><div class="field"><label>Metode</label><select id="pmPayMethod"><option>Transfer BCA</option><option>Transfer Bank</option><option>Cash</option><option>QRIS</option><option>Lainnya</option></select></div><div class="field" style="grid-column:1/-1"><label>Catatan</label><input id="pmPayNote" placeholder="Contoh: DP 50% sudah diterima"></div></div><div class="pm-pay-actions"><button class="btn secondary pm-pay-close" type="button">Batal</button><button class="btn green" id="pmPaySave" type="button">Simpan Pembayaran</button></div><div class="card" style="margin-top:16px"><b>Riwayat Pembayaran</b><div class="scroll"><table class="table"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Nominal</th><th>Metode</th><th>Catatan</th></tr></thead><tbody>${(p.data||[]).map(x=>`<tr><td>${E(x.tanggal_bayar)}</td><td>${E(x.jenis)}</td><td>${M(x.nominal)}</td><td>${E(x.metode||'-')}</td><td>${E(x.catatan||'-')}</td></tr>`).join('')||'<tr><td colspan="5">Belum ada pembayaran.</td></tr>'}</tbody></table></div></div></div></div>`;
    document.body.appendChild(modal);modal.querySelectorAll('.pm-pay-close').forEach(b=>b.onclick=()=>modal.remove());
    modal.querySelector('#pmPaySave').onclick=async()=>{const btn=modal.querySelector('#pmPaySave');const amount=N(modal.querySelector('#pmPayAmount').value);if(amount<=0)return toast('Nominal pembayaran harus lebih dari 0.');if(amount>balance)return toast('Nominal melebihi sisa pembayaran.');btn.disabled=true;btn.textContent='Menyimpan...';try{const ins=await d.from('pembayaran_penawaran').insert({penawaran_id:id,tanggal_bayar:modal.querySelector('#pmPayDate').value,jenis:modal.querySelector('#pmPayType').value,nominal:amount,metode:modal.querySelector('#pmPayMethod').value,catatan:S(modal.querySelector('#pmPayNote').value)});if(ins.error)throw ins.error;const newPaid=paid+amount;const newBalance=Math.max(0,total-newPaid);const status=newBalance<=0?'LUNAS':newPaid>0?'DP DITERIMA':'BELUM BAYAR';const up=await d.from('penawaran').update({total_dibayar:newPaid,sisa_pembayaran:newBalance,status_pembayaran:status}).eq('id',id);if(up.error)console.warn('Payment summary update:',up.error);toast('Pembayaran berhasil dicatat.');modal.remove();if(typeof window.renderHistory==='function')window.renderHistory();else if(typeof window.go==='function')window.go('history');}catch(e){console.error(e);toast('Gagal menyimpan pembayaran: '+(e.message||e));}finally{btn.disabled=false;btn.textContent='Simpan Pembayaran';}};
  }

  window.addPayment=paymentDialog;
  window.openPayment=paymentDialog;

  const style=document.createElement('style');style.textContent=`
    #pmPaymentModal .pm-pay-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}
    #pmPaymentModal .pm-pay-modal{width:min(760px,96vw);max-height:92vh;overflow:auto;background:var(--card,#101722);border:1px solid var(--border,#263246);border-radius:18px;padding:22px;box-shadow:0 25px 80px rgba(0,0,0,.45)}
    #pmPaymentModal .pm-pay-head{display:flex;justify-content:space-between;align-items:flex-start;gap:15px}.pm-pay-head h2{margin:0}.pm-pay-head p{margin:6px 0 0;color:var(--muted)}
    #pmPaymentModal .pm-pay-close{border:0;background:transparent;color:inherit;font-size:24px;cursor:pointer}.pm-pay-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.pm-pay-summary span{padding:12px;border:1px solid var(--border,#263246);border-radius:12px}.pm-pay-summary b{display:block;margin-top:4px}
    #pmPaymentModal .pm-pay-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}
    @media(max-width:650px){.pm-pay-summary{grid-template-columns:1fr}.pm-pay-modal{padding:15px}}
  `;document.head.appendChild(style);
})();
