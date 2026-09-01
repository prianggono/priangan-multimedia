/* PRIANGAN MULTIMEDIA — payment history integration
 * History only exposes DP. Pelunasan is handled from Invoice.
 * IMPORTANT: no MutationObserver here; it caused repeated DOM work/freezes.
 */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const n=Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  function DB(){if(typeof db!=='undefined'&&db)return db;const c=window.PRIANGAN_CONFIG||{};const u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL),k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);return u&&k&&window.supabase?.createClient?window.supabase.createClient(u,k):null;}
  async function addPaymentSummary(){
    if(!/Riwayat Penawaran/i.test(document.querySelector('#title')?.textContent||''))return;
    const table=document.querySelector('#content table.table');if(!table)return;
    const d=DB();if(!d)return;
    const pr=await d.from('pembayaran_penawaran').select('penawaran_id,jenis,nominal');if(pr.error){console.warn('Payment summary:',pr.error);return;}
    const map=new Map();(pr.data||[]).forEach(p=>{const id=String(p.penawaran_id);if(!map.has(id))map.set(id,{dp:0,paid:0});const x=map.get(id),amount=N(p.nominal);x.paid+=amount;if(S(p.jenis).toUpperCase()==='DP')x.dp+=amount;});
    const head=table.querySelector('thead tr');
    if(head && !Array.from(head.children).some(x=>S(x.textContent).toUpperCase()==='DP')){
      const h1=document.createElement('th');h1.textContent='DP';
      const h2=document.createElement('th');h2.textContent='Dibayar';
      const totalHead=Array.from(head.children).find(x=>S(x.textContent).toUpperCase()==='TOTAL');
      head.insertBefore(h1,totalHead||null);head.insertBefore(h2,totalHead||null);
    }
    table.querySelectorAll('tbody tr.pmQuoteDataRow').forEach(tr=>{
      const edit=tr.querySelector('[onclick*="editQuotation"]');const m=String(edit?.getAttribute('onclick')||'').match(/\((\d+)\)/);if(!m)return;
      const x=map.get(String(Number(m[1])))||{dp:0,paid:0};
      const td1=tr.querySelector('.pm-pay-dp'),td2=tr.querySelector('.pm-pay-paid');
      if(td1)td1.textContent=M(x.dp);
      if(td2)td2.textContent=M(x.paid);
    });
    table.dataset.paymentSummary='1';
  }
  function addButtons(){
    if(!/Riwayat Penawaran/i.test(document.querySelector('#title')?.textContent||''))return;
    document.querySelectorAll('.pmHistoryActions').forEach(box=>{
      // Remove any legacy Bayar button left by an older script version.
      box.querySelectorAll('button').forEach(btn=>{
        const text=S(btn.textContent).toLowerCase();
        const click=S(btn.getAttribute('onclick')).toLowerCase();
        if(text==='bayar'||click.includes('inputpelunasan'))btn.remove();
      });
      // Ensure exactly one DP button in quotation history.
      if(!box.querySelector('button[onclick*="inputDP"]')){
        const edit=box.querySelector('[onclick*="editQuotation"]');const m=String(edit?.getAttribute('onclick')||'').match(/\((\d+)\)/);if(m){
          const b=document.createElement('button');b.type='button';b.className='btn secondary sm';b.title='Catat uang muka / DP';b.textContent='DP';b.onclick=()=>window.inputDP?.(Number(m[1]));box.appendChild(b);
        }
      }
    });
    addPaymentSummary().catch(console.warn);
  }
  const style=document.createElement('style');style.textContent='.pm-payment-buttons{display:none!important}.pmHistoryActions button[onclick*="inputPelunasan"]{display:none!important}';document.head.appendChild(style);
  // Explicit calls only; do not observe the whole document.
  setTimeout(addButtons,100);
  window.__PM_HISTORY_PAYMENT_FIXED=true;
})();
