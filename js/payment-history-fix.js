/* PRIANGAN MULTIMEDIA — payment history integration */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  function DB(){if(typeof db!=='undefined'&&db)return db;const c=window.PRIANGAN_CONFIG||{};const u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL),k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);return u&&k&&window.supabase?.createClient?window.supabase.createClient(u,k):null;}
  async function addPaymentSummary(){
    if(!/Riwayat Penawaran/i.test(document.querySelector('#title')?.textContent||''))return;
    const table=document.querySelector('#content table.table');if(!table||table.dataset.paymentSummary==='1')return;
    const d=DB();if(!d)return;
    const pr=await d.from('pembayaran_penawaran').select('penawaran_id,jenis,nominal');if(pr.error){console.warn('Payment summary:',pr.error);return;}
    const map=new Map();(pr.data||[]).forEach(p=>{const id=String(p.penawaran_id);if(!map.has(id))map.set(id,{dp:0,paid:0});const x=map.get(id),amount=N(p.nominal);x.paid+=amount;if(S(p.jenis).toUpperCase()==='DP')x.dp+=amount;});
    const head=table.querySelector('thead tr');if(head){const h1=document.createElement('th');h1.textContent='DP';const h2=document.createElement('th');h2.textContent='Dibayar';head.insertBefore(h1,head.children[5]||null);head.insertBefore(h2,head.children[6]||null);}
    table.querySelectorAll('tbody tr').forEach(tr=>{const edit=tr.querySelector('[onclick*="editQuotation"]');const m=String(edit?.getAttribute('onclick')||'').match(/\((\d+)\)/);if(!m)return;const x=map.get(String(Number(m[1])))||{dp:0,paid:0};const td1=document.createElement('td');td1.textContent=M(x.dp);const td2=document.createElement('td');td2.textContent=M(x.paid);tr.insertBefore(td1,tr.children[5]||null);tr.insertBefore(td2,tr.children[6]||null);});
    table.dataset.paymentSummary='1';
  }
  function addButtons(){
    if(!/Riwayat Penawaran/i.test(document.querySelector('#title')?.textContent||''))return;
    document.querySelectorAll('.pmHistActions').forEach(box=>{if(box.querySelector('.pm-payment-buttons'))return;const edit=box.querySelector('[onclick*="editQuotation"]');const m=String(edit?.getAttribute('onclick')||'').match(/\((\d+)\)/);if(!m)return;const id=Number(m[1]);const wrap=document.createElement('span');wrap.className='pm-payment-buttons';wrap.innerHTML=`<button type="button" class="btn secondary sm" title="Catat uang muka / DP" onclick="inputDP(${id})">DP</button><button type="button" class="btn green sm" title="Catat pembayaran pelunasan" onclick="inputPelunasan(${id})">Bayar</button>`;box.insertBefore(wrap,box.lastElementChild);});
    addPaymentSummary().catch(console.warn);
  }
  const style=document.createElement('style');style.textContent='.pm-payment-buttons{display:inline-flex!important;gap:6px!important;margin-right:4px}.pm-payment-buttons .btn{white-space:nowrap}';document.head.appendChild(style);
  const observer=new MutationObserver(addButtons);observer.observe(document.body,{childList:true,subtree:true});setTimeout(addButtons,100);
})();
