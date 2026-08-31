/* Priangan Multimedia — final Invoice UI.
 * Invoice item form mirrors quotation rules. Only relevant fields are shown.
 * Overtime is separate and uses hours x hourly price only.
 */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const N=v=>{const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:0;};
  const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
  const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const days=(a,b)=>{if(!a||!b)return 1;const x=new Date(a+'T00:00:00'),y=new Date(b+'T00:00:00'),d=Math.round((y-x)/86400000);return d>=0?d+1:1;};
  function rule(m){
    const sat=S(m?.satuan).toLowerCase();
    if(['unit','units','pcs','pc','buah','set'].includes(sat))return 'qty';
    const t=(S(m?.item)+' '+S(m?.kategori)).toLowerCase();
    if(/rigging|rig/.test(t))return 'rigging';
    if(/level/.test(t))return 'level';
    if(/led|videotron/.test(t))return 'luas';
    return 'qty';
  }
  function close(){document.getElementById('pmInvoiceAddDialog')?.remove();}
  function open(mode){
    close();
    const state=window.__PM_INVOICE_ADD_STATE||{};
    const start=S(state.row?.tanggal_mulai),end=S(state.row?.tanggal_selesai),ot=mode==='overtime';
    const el=document.createElement('div');el.id='pmInvoiceAddDialog';
    el.innerHTML=`<style>
#pmInvoiceAddDialog{position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto}.pmx{width:min(720px,100%);max-height:94vh;overflow:auto;background:#10192d;border:1px solid #2b3a5c;border-radius:16px;padding:20px;color:#fff;box-shadow:0 24px 80px rgba(0,0,0,.5)}.pmx h3{margin:0 0 5px}.pmx-help{color:#9fb0cc;font-size:12px;margin-bottom:14px}.pmx-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pmx-field{margin-top:10px}.pmx-field label{display:block;font-size:12px;color:#aebbd2;margin-bottom:6px}.pmx-field input,.pmx-field select{width:100%;box-sizing:border-box;background:#071022;color:#fff;border:1px solid #2b3a5c;border-radius:9px;padding:11px;min-height:42px}.pmx-wide{grid-column:1/-1}.pmx-hide{display:none!important}.pmx-calc{margin-top:14px;padding:12px;border:1px solid #243556;border-radius:10px;background:#0b1427}.pmx-calc div{display:flex;justify-content:space-between;margin:4px 0}.pmx-sub{color:#00d4a8;font-size:18px;font-weight:800}.pmx-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.pmx-actions button{border:0;border-radius:9px;padding:11px 16px;font-weight:700;cursor:pointer}.pmx-cancel{background:#1b2945;color:#fff}.pmx-save{background:#00c98b;color:#fff}@media(max-width:650px){.pmx-grid{grid-template-columns:1fr}.pmx-wide{grid-column:auto}}
</style><div class="pmx"><h3>${ot?'Tambah Overtime ke Invoice':'Tambah Item ke Invoice'}</h3><div class="pmx-help">${ot?'Overtime custom sesuai kondisi lapangan: jumlah jam × harga per jam.':'Sama seperti Penawaran. Aturan perhitungan mengikuti Master Harga dan hanya field yang diperlukan yang ditampilkan.'}</div><div class="pmx-grid">
<div class="pmx-field ${ot?'pmx-hide':''}" id="pmxMasterWrap"><label>Item Master Harga</label><select id="pmxMaster"><option value="">— Pilih produk / jasa —</option>${masters().map(m=>`<option value="${E(m.kode)}" data-item="${E(m.item)}" data-price="${N(m.harga_jual)}">${E(m.kode)} — ${E(m.item)} (${M(m.harga_jual)})</option>`).join('')}</select></div>
<div class="pmx-field pmx-hide"><select id="pmxSource"><option value="master">master</option><option value="overtime">overtime</option></select></div>
<div class="pmx-field pmx-wide"><label>Nama / Keterangan Item</label><input id="pmxName" value="${ot?'Overtime':''}" placeholder="Nama item atau keterangan tambahan"></div>
<div class="pmx-field"><label>Harga Jual${ot?' / Jam':''}</label><input id="pmxPrice" type="number" min="0" step="1000" value="0"></div>
<div class="pmx-field ${ot?'pmx-hide':''}" id="pmxTypeWrap"><label>Tipe Perhitungan</label><input id="pmxType" value="qty" readonly></div>
<div class="pmx-field ${ot?'pmx-hide':''}"><label>Tanggal Mulai</label><input id="pmxStart" type="date" value="${E(start)}"></div>
<div class="pmx-field ${ot?'pmx-hide':''}"><label>Tanggal Selesai</label><input id="pmxEnd" type="date" value="${E(end)}"></div>
<div class="pmx-field"><label>${ot?'Jumlah Jam':'Jumlah (Qty)'}</label><input id="pmxQty" type="number" min="0" step="${ot?'0.5':'1'}" value="${ot?'0':'1'}"></div>
<div class="pmx-field pmx-hide" id="pmxWidthWrap"><label>Lebar (m)</label><input id="pmxWidth" type="number" min="0" step="0.01" value="0"></div>
<div class="pmx-field pmx-hide" id="pmxHeightWrap"><label>Tinggi (m)</label><input id="pmxHeight" type="number" min="0" step="0.01" value="0"></div>
<div class="pmx-field pmx-hide" id="pmxLengthWrap"><label>Panjang Rigging (m)</label><input id="pmxLength" type="number" min="0" step="0.01" value="0"></div>
</div><div class="pmx-calc"><div><span>Durasi</span><b id="pmxDuration">${ot?'0 jam':'1 hari'}</b></div><div><span>Dasar Perhitungan</span><b id="pmxBasis">${ot?'0 jam':'1 unit'}</b></div><div><span>Subtotal</span><b id="pmxSubtotal" class="pmx-sub">Rp 0</b></div></div><div class="pmx-actions"><button class="pmx-cancel" type="button">Batal</button><button class="pmx-save" type="button">Tambahkan ke Invoice</button></div></div>`;
    document.body.appendChild(el);
    const q=id=>el.querySelector(id),master=q('#pmxMaster'),source=q('#pmxSource'),name=q('#pmxName'),type=q('#pmxType'),price=q('#pmxPrice'),st=q('#pmxStart'),en=q('#pmxEnd'),qty=q('#pmxQty'),w=q('#pmxWidth'),h=q('#pmxHeight'),len=q('#pmxLength');
    source.value=ot?'overtime':'master';
    let r=ot?'overtime':'qty';
    function show(){q('#pmxWidthWrap').classList.toggle('pmx-hide',r!=='luas');q('#pmxHeightWrap').classList.toggle('pmx-hide',!['luas','level','rigging'].includes(r));q('#pmxLengthWrap').classList.toggle('pmx-hide',r!=='rigging');}
    function refresh(){const dur=ot?1:days(st.value,en.value);let basis=r==='luas'?N(w.value)*N(h.value):r==='level'?N(w.value):r==='rigging'?(N(len.value)*2)+(N(h.value)*2):(N(qty.value)||1);const sub=basis*N(price.value)*dur;q('#pmxDuration').textContent=ot?`${N(qty.value)||0} jam`:`${dur} hari`;q('#pmxBasis').textContent=ot?`${N(qty.value)||0} jam`:r==='luas'?`${basis} m²`:r==='level'||r==='rigging'?`${basis} m`:`${N(qty.value)||1} unit`;q('#pmxSubtotal').textContent=M(sub);}
    if(master){master.addEventListener('change',()=>{const o=master.selectedOptions[0],m=masters().find(x=>S(x.kode)===S(master.value));if(!m)return;name.value=o.dataset.item||m.item||'';price.value=N(o.dataset.price||m.harga_jual);r=rule(m);type.value=r;show();refresh();});}
    [price,st,en,qty,w,h,len].forEach(x=>x&&x.addEventListener('input',refresh));
    q('.pmx-cancel').onclick=close;
    q('.pmx-save').onclick=()=>{source.value=ot?'overtime':'master';if(typeof window.invoiceSaveAddItem!=='function'){alert('Fungsi penyimpanan item invoice belum siap.');return;}window.invoiceSaveAddItem();};
    show();refresh();
  }
  window.invoiceAddItem=()=>open('master');
  window.__PM_OPEN_INVOICE_OVERTIME=()=>open('overtime');
  window.invoiceCloseAddItem=close;
  function toolbar(){
    const target=document.getElementById('invoiceItems');if(!target||document.getElementById('pmInvoiceActions'))return;
    const bar=document.createElement('div');bar.id='pmInvoiceActions';bar.style.cssText='display:flex;justify-content:flex-end;gap:8px;margin-top:12px';
    bar.innerHTML='<button class="btn" type="button" data-pm-final-add>+ TAMBAH ITEM</button><button class="btn" type="button" data-pm-safe-overtime>+ OVERTIME</button>';
    target.parentNode.insertBefore(bar,target.nextSibling);
    bar.querySelector('[data-pm-final-add]').onclick=()=>open('master');
  }
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-pm-safe-overtime]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();open('overtime');},true);
  new MutationObserver(toolbar).observe(document.body,{childList:true,subtree:true});
  setTimeout(toolbar,250);
  window.__PM_FINAL_INVOICE_UI=true;
})();