/* Document Numbering
 * Database owns quotation number and revision.
 * Invoice filename/title is owned by invoice.js.
 * This lifecycle owner also guarantees quotation Level visibility in the A4
 * preview/print DOM, independent of renderer wrapper timing.
 */
(function(){
  'use strict';
  if(window.__PM_DOCUMENT_NUMBERING_CLEAN__) return;
  window.__PM_DOCUMENT_NUMBERING_CLEAN__=true;
  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(v);return Number.isFinite(n)?n:0;};
  const DB=()=>window.db||window.__PM_STABLE_DB||null;

  async function quotationRow(id){
    const db=DB(); if(!db||!id) return null;
    try{
      const r=await db.from('penawaran').select('id,nomor_penawaran,revisi_penawaran').eq('id',Number(id)).maybeSingle();
      return r.error?null:r.data;
    }catch(_){return null;}
  }

  async function setQuotationFilename(id){
    const row=await quotationRow(id); if(!row) return;
    const no=S(row.nomor_penawaran); if(!no) return;
    const rev=N(row.revisi_penawaran);
    window.__PM_QUOTATION_REVISION=rev;
    window.__PM_PRINT_FILENAME=`${no}${rev>0?` V${rev}`:''}.pdf`;
  }

  function money(v){
    return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
  }

  function quotationItems(){
    return Array.isArray(window.items)
      ? window.items.filter(x=>S(x?.kode)&&S(x?.item))
      : [];
  }

  function isLED(i){
    const t=`${S(i?.item)} ${S(i?.kode)} ${S(i?.kategori)}`.toLowerCase();
    if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(t)) return false;
    return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(t);
  }

  function decorateQuotationPreview(){
    const area=document.querySelector('#pmPrintArea');
    if(!area) return false;
    const source=quotationItems();
    const rows=[...area.querySelectorAll('.pm-items tbody tr')]
      .filter(row=>!row.classList.contains('pm-total')&&!row.classList.contains('pm-discount-row'));

    rows.forEach((row,index)=>{
      const item=source[index];
      if(!item||!isLED(item)) return;
      const cell=row.querySelector('td:nth-child(2)');
      const strong=cell?.querySelector('strong');
      if(!cell||!strong) return;

      const levelOn=!!item.level_enabled&&N(item.level_tinggi)>0&&N(item.level_harga)>0;
      const baseName=S(item.item);
      strong.textContent=levelOn
        ? `${baseName} + Level ${N(item.level_tinggi).toLocaleString('id-ID',{maximumFractionDigits:2})} m`
        : baseName;

      let node=cell.querySelector('.pm-print-level');
      if(levelOn){
        if(!node){
          node=document.createElement('div');
          node.className='pm-print-level';
          cell.appendChild(node);
        }
        const levelSubtotal=N(item.lebar)*N(item.level_harga)*Math.max(1,N(item.qty)||1);
        node.textContent=`Level ${N(item.level_tinggi).toLocaleString('id-ID',{maximumFractionDigits:2})} m • ${money(levelSubtotal)}`;
      }else if(node){
        node.remove();
      }

      const q=row.querySelector('td:nth-child(3)');
      if(q) q.textContent=`${N(item.lebar)} × ${N(item.tinggi)} m² • ${Math.max(1,N(item.qty)||1)} set`;
    });

    const terms=area.querySelector('.pm-terms');
    const sig=area.querySelector('.pm-signature');
    if(terms&&sig&&!area.querySelector('.pm-terms-signature-row')){
      const wrapper=document.createElement('div');
      wrapper.className='pm-terms-signature-row';
      terms.parentNode.insertBefore(wrapper,terms);
      wrapper.appendChild(terms);
      wrapper.appendChild(sig);
    }
    return true;
  }

  function installStyles(){
    if(document.getElementById('pmDocumentLifecycleStyles')) return;
    const st=document.createElement('style');
    st.id='pmDocumentLifecycleStyles';
    st.textContent=`
      #pmPrintPreview .pm-print-level{
        margin-top:3px;
        padding:2px 4px;
        border-left:2px solid #93c5fd;
        background:#f8fafc;
        color:#334155;
        font-size:6.2pt;
        line-height:1.25;
        font-weight:700;
      }
      #pmPrintPreview .pm-terms-signature-row{
        display:grid;
        grid-template-columns:minmax(0,1fr) 48mm;
        gap:8mm;
        align-items:end;
        margin-top:10px;
      }
      #pmPrintPreview .pm-terms-signature-row .pm-terms{margin-top:0;}
      #pmPrintPreview .pm-terms-signature-row .pm-terms-body{
        font-size:6.5pt;
        line-height:1.35;
        padding:6px 8px;
      }
      #pmPrintPreview .pm-terms-signature-row .pm-signature{
        width:48mm;
        margin:0;
        text-align:center;
      }
      #pmPrintPreview .pm-terms-signature-row .pm-signature-box{min-height:92px;}
      #pmPrintPreview .pm-terms-signature-row .pm-signature .signature{
        max-width:44mm;
        height:66px;
        max-height:66px;
      }
      @media(max-width:700px){
        #pmPrintPreview .pm-terms-signature-row{
          grid-template-columns:1fr;
          gap:8px;
        }
        #pmPrintPreview .pm-terms-signature-row .pm-signature{width:100%;}
      }
      @media print{
        #pmPrintPreview .pm-terms-signature-row{
          grid-template-columns:minmax(0,1fr) 48mm;
          gap:8mm;
        }
        #pmPrintPreview .pm-terms-signature-row .pm-terms-body{font-size:6.3pt;}
        #pmPrintPreview .pm-terms-signature-row .pm-signature-box{min-height:92px;}
        #pmPrintPreview .pm-terms-signature-row .pm-signature .signature{
          max-width:44mm!important;
          height:66px!important;
          max-height:66px!important;
        }
      }
    `;
    document.head.appendChild(st);
  }

  function install(){
    installStyles();
    if(typeof window.saveQuote==='function'&&!window.saveQuote.__pmDocumentNumbering){
      const original=window.saveQuote;
      const wrapped=async function(){
        const editing=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
        const result=await original.apply(this,arguments);
        await setQuotationFilename(editing||N(window.__PM_LAST_QUOTATION_ID));
        return result;
      };
      wrapped.__pmDocumentNumbering=true;
      window.saveQuote=wrapped;
    }
    if(typeof window.printQuote==='function'&&!window.printQuote.__pmDocumentNumbering){
      const original=window.printQuote;
      const wrapped=async function(){
        await setQuotationFilename(N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID||window.__PM_LAST_QUOTATION_ID));
        return original.apply(this,arguments);
      };
      wrapped.__pmDocumentNumbering=true;
      window.printQuote=wrapped;
    }
    decorateQuotationPreview();
  }

  install();
  const observer=new MutationObserver(()=>{
    install();
    decorateQuotationPreview();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  const timer=setInterval(()=>decorateQuotationPreview(),400);
  setTimeout(()=>clearInterval(timer),30000);

  window.addEventListener('beforeprint',()=>{
    decorateQuotationPreview();
    const filename=S(window.__PM_PRINT_FILENAME);
    if(filename) document.title=filename.replace(/\.pdf$/i,'');
  },true);
})();