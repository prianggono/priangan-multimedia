/* Priangan Multimedia — HARD invoice preview total fix
 * Source of truth: values visible in the Invoice Editor.
 * This patch works at popup document.write level, because the original
 * preview renderer keeps quotation totals inside its own module scope.
 */
(function(){
  'use strict';
  if(window.__PM_INVOICE_PREVIEW_HARD_TOTAL)return;
  window.__PM_INVOICE_PREVIEW_HARD_TOTAL=true;

  const N=v=>{
    let s=String(v??'').replace(/[^0-9,.-]/g,'');
    if(!s)return 0;
    s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));

  function editorTotals(){
    const total=N(document.getElementById('invTotal')?.textContent || document.getElementById('invTotal')?.value);
    const paid=N(document.getElementById('invPaid')?.textContent || document.getElementById('invPaid')?.value);
    return {total,paid,balance:Math.max(0,total-paid)};
  }

  function patchHtml(html){
    const {total,paid,balance}=editorTotals();
    if(!total || !html) return html;
    let s=String(html);

    // Replace the value immediately following TOTAL INVOICE / GRAND TOTAL.
    s=s.replace(/(TOTAL INVOICE[\s\S]{0,700}?)(Rp\s*[0-9.,]+)/i,(m,a)=>a+M(total));
    s=s.replace(/(GRAND TOTAL[\s\S]{0,700}?)(Rp\s*[0-9.,]+)/i,(m,a)=>a+M(total));

    // Replace payment summary values by row/label. Supports table and div layouts.
    const paymentRow=(label,value)=>{
      const re=new RegExp('('+label+'[\\s\\S]{0,250}?)(Rp\\s*[0-9.,]+)','i');
      s=s.replace(re,(m,a)=>a+M(value));
    };
    paymentRow('Downpayment',paid);
    paymentRow('Down Payment',paid);
    paymentRow('Sisa tagihan',balance);
    paymentRow('Sisa Tagihan',balance);

    return s;
  }

  function patchWindow(win){
    if(!win || win.__PM_HARD_PATCHED)return;
    win.__PM_HARD_PATCHED=true;
    const run=()=>{
      try{
        const doc=win.document;
        if(!doc)return;
        const {total,paid,balance}=editorTotals();
        if(!total)return;
        [...doc.querySelectorAll('tr')].forEach(tr=>{
          const label=String(tr.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
          const cells=tr.querySelectorAll('td,th');
          if(!cells.length)return;
          if(label.startsWith('total invoice')||label.startsWith('grand total'))cells[cells.length-1].textContent=M(total);
          if(label.startsWith('downpayment')||label.startsWith('down payment'))cells[cells.length-1].textContent=M(paid);
          if(label.startsWith('sisa tagihan'))cells[cells.length-1].textContent=M(balance);
        });
        [...doc.querySelectorAll('*')].forEach(el=>{
          if(el.children.length)return;
          const label=String(el.textContent||'').trim().toLowerCase();
          if(label==='total invoice'||label==='grand total'||label==='downpayment'||label==='down payment'||label==='sisa tagihan'){
            const p=el.parentElement;
            if(!p)return;
            const leaves=[...p.querySelectorAll('*')].filter(x=>x!==el&&x.children.length===0);
            if(!leaves.length)return;
            const val=(label==='total invoice'||label==='grand total')?total:(label==='downpayment'||label==='down payment'?paid:balance);
            leaves[leaves.length-1].textContent=M(val);
          }
        });
      }catch(e){console.warn('[PM] hard invoice preview patch',e)}
    };
    [0,30,100,300,700,1200].forEach(ms=>setTimeout(run,ms));
  }

  const nativeOpen=window.open;
  window.open=function(){
    const win=nativeOpen.apply(this,arguments);
    if(win){
      patchWindow(win);
      try{
        const doc=win.document;
        const nativeWrite=doc.write.bind(doc);
        doc.write=function(html){
          return nativeWrite(patchHtml(html));
        };
      }catch(e){console.warn('[PM] popup write patch',e)}
    }
    return win;
  };
})();
