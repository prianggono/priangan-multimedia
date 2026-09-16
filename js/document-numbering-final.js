/* Priangan Multimedia — Document Numbering
 * Database owns quotation/invoice numbers and revision.
 * This file only prepares customer-facing filenames and aligns invoice metadata.
 */
(function(){
  'use strict';
  if(window.__PM_DOCUMENT_NUMBERING_FINAL)return;
  window.__PM_DOCUMENT_NUMBERING_FINAL=true;

  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const DB=()=>window.db||window.__PM_STABLE_DB||null;
  const period=(a,b)=>{
    const aa=S(a).slice(0,10),bb=S(b||a).slice(0,10);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(aa))return S(a)||'-';
    const [ay,am,ad]=aa.split('-').map(Number),[by,bm,bd]=bb.split('-').map(Number);
    const mn=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    if(ay===by&&am===bm&&ad===bd)return `${ad} ${mn[am-1]} ${ay}`;
    if(ay===by&&am===bm)return `${ad}-${bd} ${mn[am-1]} ${ay}`;
    if(ay===by)return `${ad} ${mn[am-1]}-${bd} ${mn[bm-1]} ${ay}`;
    return `${ad} ${mn[am-1]} ${ay}-${bd} ${mn[bm-1]} ${by}`;
  };
  async function rowById(id){
    const d=DB();if(!d||!id)return null;
    const r=await d.from('penawaran').select('id,nomor_penawaran,nomor_invoice,nama_event,revisi_penawaran,tanggal_mulai,tanggal_selesai').eq('id',Number(id)).maybeSingle();
    return r.error?null:r.data;
  }
  async function prepareQuotationFilename(){
    const id=N(window.__PM_LAST_QUOTATION_ID||window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
    const row=await rowById(id);
    const no=S(row?.nomor_penawaran||window.__PM_LAST_QUOTATION_NUMBER);
    const rev=N(row?.revisi_penawaran||0);
    if(!no)return;
    window.__PM_PRINT_FILENAME=`${no}${rev>0?` V${rev}`:''}.pdf`;
    document.title=window.__PM_PRINT_FILENAME.replace(/\.pdf$/i,'');
  }
  async function prepareInvoicePreview(){
    const id=N(window.__PM_LAST_QUOTATION_ID||window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
    const row=await rowById(id);
    const number=S(row?.nomor_invoice||document.getElementById('invNo')?.value);
    if(number){
      window.__PM_INVOICE_PRINT_NUMBER=number;
      window.__PM_PRINT_FILENAME=`${number}.pdf`;
      document.title=number;
    }
    const area=document.querySelector('#pmInvoiceDocumentPreview');
    if(!area||!row)return;
    area.querySelector('.pm-inv-intro')?.remove();
    area.querySelector('.pm-inv-doc > strong')?.remove();
    const info=area.querySelector('.pm-inv-info');
    if(info?.children?.[1]&&!info.querySelector('.pm-inv-period')){
      const wrap=document.createElement('div');
      wrap.className='pm-inv-period';
      wrap.innerHTML=`<div class="pm-inv-label">PERIODE</div><div>${period(row.tanggal_mulai,row.tanggal_selesai)}</div>`;
      info.children[1].appendChild(wrap);
    }
  }
  document.addEventListener('click',async e=>{
    const b=e.target.closest?.('button');if(!b)return;
    const text=S(b.textContent);
    if(/Preview Surat|Cetak.*PDF|Preview \/ Cetak A4/i.test(text))setTimeout(prepareQuotationFilename,120);
    if(/Preview Invoice|Cetak.*Invoice/i.test(text))setTimeout(prepareInvoicePreview,120);
  },true);
  window.addEventListener('beforeprint',()=>{const f=S(window.__PM_PRINT_FILENAME);if(f)document.title=f.replace(/\.pdf$/i,'')},true);
})();