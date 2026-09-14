/* Priangan Multimedia — Quotation print format
 * Aligns quotation print period formatting with invoice conventions and
 * prints package contents directly under package items.
 * Read-only print transformation; quotation/master data are untouched.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_PRINT_FORMAT_FIX__)return;
  window.__PM_QUOTATION_PRINT_FORMAT_FIX__=true;

  const S=v=>String(v??'').trim();
  const E=v=>S(v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const findMaster=code=>masters().find(m=>S(m.kode)===S(code))||null;
  const months=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const monthsShort=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  function parseDate(v){
    const s=S(v).slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
    const [y,m,d]=s.split('-').map(Number);
    const date=new Date(y,m-1,d);
    return Number.isNaN(date.getTime())?null:{y,m,d,date};
  }

  function formatPeriod(start,end,short){
    const a=parseDate(start),b=parseDate(end)||a;
    if(!a)return S(start)||'-';
    if(!b)return short?`${a.d} ${monthsShort[a.m-1]} ${a.y}`:`${a.d} ${months[a.m-1]} ${a.y}`;
    if(a.y===b.y&&a.m===b.m&&a.d===b.d){
      return short?`${a.d} ${monthsShort[a.m-1]} ${a.y}`:`${a.d} ${months[a.m-1]} ${a.y}`;
    }
    if(a.y===b.y&&a.m===b.m){
      return short?`${a.d}-${b.d} ${monthsShort[a.m-1]} ${a.y}`:`${a.d}-${b.d} ${months[a.m-1]} ${a.y}`;
    }
    if(a.y===b.y){
      return short?`${a.d} ${monthsShort[a.m-1]}-${b.d} ${monthsShort[b.m-1]} ${a.y}`:`${a.d} ${months[a.m-1]}-${b.d} ${months[b.m-1]} ${a.y}`;
    }
    return short?`${a.d} ${monthsShort[a.m-1]} ${a.y}-${b.d} ${monthsShort[b.m-1]} ${b.y}`:`${a.d} ${months[a.m-1]} ${a.y}-${b.d} ${months[b.m-1]} ${b.y}`;
  }

  function rawPackageRows(raw){
    return S(raw).replace(/\\n/g,'\n').split(/\r?\n/).map(x=>S(x)).filter(Boolean).map(line=>{
      let m=line.match(/^(.+?)\s*[—–]\s*(.*?)\s*$/);
      if(!m)m=line.match(/^(.+?)\s+-\s*(.*?)\s*$/);
      if(m)return{komponen:S(m[1]),qty:S(m[2])||'-'};
      return{komponen:line,qty:'-'};
    });
  }

  function packageBlock(master){
    const rows=rawPackageRows(master?.isi_paket);
    if(!rows.length)return'';
    return `<div class="pm-quote-package-detail"><div class="pm-quote-package-title">ISI PAKET</div><table><thead><tr><th>Komponen</th><th>Qty</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${E(r.komponen)}</td><td>${E(r.qty)}</td></tr>`).join('')}</tbody></table></div>`;
  }

  function injectStyles(){
    if(document.getElementById('pmQuotationPrintFormatStyles'))return;
    const st=document.createElement('style');
    st.id='pmQuotationPrintFormatStyles';
    st.textContent=`
      #pmPrintPreview .pm-quote-package-row>td{padding:0!important;background:#f7f9fc!important;border-left:0!important;border-right:0!important}
      #pmPrintPreview .pm-quote-package-detail{padding:6px 10px 8px 48px;color:#27334a}
      #pmPrintPreview .pm-quote-package-title{font-size:8px;font-weight:800;letter-spacing:.08em;margin-bottom:4px;color:#54627c}
      #pmPrintPreview .pm-quote-package-detail table{width:100%;border-collapse:collapse;font-size:8px}
      #pmPrintPreview .pm-quote-package-detail th,#pmPrintPreview .pm-quote-package-detail td{padding:2px 5px;border:0;border-top:1px solid #e2e7ef;text-align:left;vertical-align:top}
      #pmPrintPreview .pm-quote-package-detail th:last-child,#pmPrintPreview .pm-quote-package-detail td:last-child{width:55px;text-align:center}
      #pmPrintPreview .pm-quote-package-detail th{font-size:7px;text-transform:uppercase;color:#66748e;font-weight:800}
      @media print{#pmPrintPreview .pm-quote-package-detail{padding-left:48px}}
    `;
    document.head.appendChild(st);
  }

  function transformPreview(){
    const area=document.querySelector('#pmPrintArea');
    if(!area)return;
    injectStyles();

    // Event/project period: full month names, compact range, single date when equal.
    const info=[...area.querySelectorAll('.pm-event-section .pm-period-label')][0];
    if(info){
      const valueEl=info.nextElementSibling;
      if(valueEl){
        const start=document.querySelector('#qs')?.value||'';
        const end=document.querySelector('#qe2')?.value||'';
        valueEl.textContent=formatPeriod(start,end,false);
      }
    }

    // Item rental period: short month names, single date when equal.
    const rows=[...area.querySelectorAll('table.pm-items tbody > tr')];
    rows.forEach(row=>{
      if(row.classList.contains('pm-total')||row.classList.contains('pm-discount-row')||row.classList.contains('pm-quote-package-row'))return;
      const cells=row.children;
      if(!cells||cells.length<6)return;
      const itemName=S(cells[1]?.textContent);
      const code=S(cells[1]?.querySelector?.('.code')?.textContent);
      const sourceItem=window.items?.find(x=>S(x.kode)===code||S(x.item)===itemName);
      const start=sourceItem?.mulai||'';
      const end=sourceItem?.selesai||'';
      if(cells[3])cells[3].textContent=formatPeriod(start,end,true);

      const master=findMaster(code);
      if(master && (S(master.isi_paket)||S(master.satuan).toLowerCase()==='paket')){
        // Prevent duplicate package detail rows if print preview is transformed twice.
        const next=row.nextElementSibling;
        if(next?.classList.contains('pm-quote-package-row'))return;
        const tr=document.createElement('tr');
        tr.className='pm-quote-package-row';
        tr.innerHTML=`<td colspan="6">${packageBlock(master)}</td>`;
        row.parentNode?.insertBefore(tr,row.nextSibling);
      }
    });
  }

  function wrapPrintQuote(){
    const fn=window.printQuote;
    if(typeof fn!=='function'||fn.__pmPeriodPackageWrapped)return false;
    const wrapped=function(){
      const result=fn.apply(this,arguments);
      requestAnimationFrame(()=>requestAnimationFrame(transformPreview));
      return result;
    };
    wrapped.__pmPeriodPackageWrapped=true;
    window.printQuote=wrapped;
    return true;
  }

  [0,200,500,1000,1800].forEach(ms=>setTimeout(wrapPrintQuote,ms));
  window.addEventListener('load',wrapPrintQuote);
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#pmPrintPreview'))requestAnimationFrame(transformPreview);
  },true);
})();
