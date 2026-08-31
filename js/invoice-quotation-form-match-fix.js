/* Priangan Multimedia — Invoice Add Item: same item rules as Quotation.
 * Invoice has only two actions: Add Item and Overtime.
 * Add Item uses Master Harga and mirrors quotation calculation rules.
 * Overtime is custom: hours x price only.
 * No extra Luas/Level/Rigging fields are shown unless that item actually uses that rule.
 * Existing invoiceSaveAddItem() is reused; no changes to quotation/master data.
 */
(function(){
'use strict';
const S=v=>String(v??'').trim();
const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const r=S(v).replace(/[^0-9,.-]/g,'');if(!r)return 0;const n=Number(r.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
const days=(a,b)=>{if(!a||!b)return 1;const x=new Date(a+'T00:00:00'),y=new Date(b+'T00:00:00'),n=Math.round((y-x)/86400000);return n>=0?n+1:1;};
const oldSave=window.invoiceSaveAddItem;
const masters=()=>Array.isArray(window.masters)?window.masters:[];
function masterFor(code){return masters().find(m=>S(m.kode)===S(code))||null;}
function ruleFor(m){
 const satuan=S(m?.satuan).toLowerCase();
 const text=(S(m?.item)+' '+S(m?.kategori)).toLowerCase();
 if(['unit','units','pcs','pc','buah','set'].includes(satuan)) return 'qty';
 if(/rigging|rig/.test(text)) return 'rigging';
 if(/level/.test(text)) return 'level';
 if(/led|videotron/.test(text)) return 'luas';
 return 'qty';
}
function calc(type,q,w,h,p,price,start,end,hours){
 const t=S(type).toLowerCase();
 if(t==='overtime'){const jam=Math.max(0,N(hours||q));return{dur:jam,basis:jam,subtotal:jam*N(price)};}
 const dur=days(start,end);let basis=t==='luas'?w*h:t==='level'?w:t==='rigging'?(p*2)+(h*2):(q||1);return{dur,basis,subtotal:basis*N(price)*dur};
}
function open(mode){
 document.getElementById('pmInvoiceAddDialog')?.remove();
 const state=window.__PM_INVOICE_ADD_STATE||{};
 const start=S(state.row?.tanggal_mulai),end=S(state.row?.tanggal_selesai),overtime=mode==='overtime';
 const list=masters();
 const el=document.createElement('div');el.id='pmInvoiceAddDialog';
 el.innerHTML=`<style>
#pmInvoiceAddDialog{position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto}.pmx{width:min(720px,100%);max-height:94vh;overflow:auto;background:#10192d;border:1px solid #2b3a5c;border-radius:16px;padding:20px;color:#fff;box-shadow:0 24px 80px rgba(0,0,0,.5)}.pmx h3{margin:0 0 5px;font-size:20px}.pmx-help{color:#9fb0cc;font-size:12px;margin-bottom:16px}.pmx-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pmx-field{margin-top:11px}.pmx-field label{display:block;font-size:12px;color:#aebbd2;margin-bottom:6px}.pmx-field input,.pmx-field select{width:100%;box-sizing:border-box;background:#071022;color:#fff;border:1px solid #2b3a5c;border-radius:9px;padding:11px;min-height:42px}.pmx-wide{grid-column:1/-1}.pmx-calc{margin-top:14px;padding:12px;border:1px solid #243556;border-radius:10px;background:#0b1427}.pmx-calc div{display:flex;justify-content:space-between;gap:12px;margin:4px 0}.pmx-sub{color:#00d4a8;font-size:18px;font-weight:800}.pmx-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.pmx-actions button{border:0;border-radius:9px;padding:11px 16px;font-weight:700;cursor:pointer}.pmx-cancel{background:#1b2945;color:#fff}.pmx-save{background:#00c98b;color:#fff}.pmx-hidden{display:none!important}@media(max-width:650px){.pmx-grid{grid-template-columns:1fr}.pmx-wide{grid-column:auto}}
</style><div class="pmx"><h3>${overtime?'Tambah Overtime ke Invoice':'Tambah Item ke Invoice'}</h3><div class="pmx-help">${overtime?'Overtime adalah tambahan waktu aktual di lapangan: jumlah jam × harga per jam.':'Sama seperti item Penawaran. Pilih dari Master Harga; aturan Qty, Luas, Level dan Rigging mengikuti item tersebut.'}</div><div class="pmx-grid">
<div class="pmx-field ${overtime?'pmx-hidden':''}" id="pmxMasterWrap"><label>Item Master Harga</label><select id="pmxMaster"><option value="">— Pilih produk / jasa —</option>${list.map(m=>`<option value="${E(m.kode)}" data-item="${E(m.item)}" data-price="${N(m.harga_jual)}">${E(m.kode)} — ${E(m.item)} (${M(m.harga_jual)})</option>`).join('')}</select></div>
<div class="pmx-field pmx-wide"><label>Nama / Keterangan Item</label><input id="pmxName" placeholder="Nama item atau keterangan tambahan" value="${overtime?'Overtime':''}"></div>
<div class="pmx-field"><label>Harga Jual</label><input id="pmxPrice" type="number" min="0" step="1000" value="0"></div>
<div class="pmx-field ${overtime?'pmx-hidden':''}" id="pmxTypeWrap"><label>Tipe Perhitungan</label><input id="pmxType" value="qty" readonly></div>
<div class="pmx-field ${overtime?'pmx-hidden':''}"><label>Tanggal Mulai</label><input id="pmxStart" type="date" value="${E(start)}"></div><div class="pmx-field ${overtime?'pmx-hidden':''}"><label>Tanggal Selesai</label><input id="pmxEnd" type="date" value="${E(end)}"></div>
<div class="pmx-field" id="pmxQtyWrap"><label>${overtime?'Jumlah Jam':'Jumlah (Qty)'}</label><input id="pmxQty" type="number" min="0" step="0.5" value="1"></div>
<div class="pmx-field pmx-hidden" id="pmxWidthWrap"><label>Lebar Videotron (m)</label><input id="pmxWidth" type="number" min="0" step="0.01" value="0"></div>
<div class="pmx-field pmx-hidden" id="pmxHeightWrap"><label>Tinggi Videotron (m)</label><input id="pmxHeight" type="number" min="0" step="0.01" value="0"></div>
<div class="pmx-field pmx-hidden" id="pmxLengthWrap"><label>Panjang Rigging (m)</label><input id="pmxLength" type="number" min="0" step="0.01" value="0"></div>
</div><div class="pmx-calc"><div><span>Durasi</span><b id="pmxDuration">${overtime?'0 jam':'1 hari'}</b></div><div><span>Dasar Perhitungan</span><b id="pmxBasis">${overtime?'0 jam':'1 unit'}</b></div><div><span>Subtotal</span><b id="pmxSubtotal" class="pmx-sub">Rp 0</b></div></div><div class="pmx-actions"><button class="pmx-cancel" type="button" onclick="invoiceCloseAddItem()">Batal</button><button class="pmx-save" type="button" id="pmxSaveButton">Tambahkan ke Invoice</button></div></div>`;
 document.body.appendChild(el);
 const master=el.querySelector('#pmxMaster'),name=el.querySelector('#pmxName'),type=el.querySelector('#pmxType'),price=el.querySelector('#pmxPrice'),start=el.querySelector('#pmxStart'),end=el.querySelector('#pmxEnd'),qty=el.querySelector('#pmxQty'),width=el.querySelector('#pmxWidth'),height=el.querySelector('#pmxHeight'),length=el.querySelector('#pmxLength');
 let rule=overtime?'overtime':'qty';
 function refresh(){const c=calc(rule,N(qty.value),N(width.value),N(height.value),N(length.value),N(price.value),start?.value,end?.value,qty.value);el.querySelector('#pmxDuration').textContent=rule==='overtime'?`${N(qty.value)||0} jam`:`${c.dur} hari`;el.querySelector('#pmxBasis').textContent=rule==='luas'?`${c.basis} m²`:rule==='level'?`${c.basis} m`:rule==='rigging'?`${c.basis} m`:rule==='overtime'?`${N(qty.value)||0} jam`:`${N(qty.value)||1} unit`;el.querySelector('#pmxSubtotal').textContent=M(c.subtotal);}
 function showRule(){['pmxWidthWrap','pmxHeightWrap','pmxLengthWrap'].forEach(id=>el.querySelector('#'+id)?.classList.add('pmx-hidden'));if(rule==='luas'){el.querySelector('#pmxWidthWrap')?.classList.remove('pmx-hidden');el.querySelector('#pmxHeightWrap')?.classList.remove('pmx-hidden');}else if(rule==='level'){el.querySelector('#pmxWidthWrap')?.classList.remove('pmx-hidden');el.querySelector('#pmxHeightWrap')?.classList.remove('pmx-hidden');}else if(rule==='rigging'){el.querySelector('#pmxLengthWrap')?.classList.remove('pmx-hidden');el.querySelector('#pmxHeightWrap')?.classList.remove('pmx-hidden');}}
 if(master){master.addEventListener('change',()=>{const o=master.selectedOptions?.[0],m=masterFor(master.value);if(!m)return;name.value=o.dataset.item||m.item||'';price.value=N(o.dataset.price||m.harga_jual);rule=ruleFor(m);type.value=rule;showRule();refresh();});}
 [price,start,end,qty,width,height,length].filter(Boolean).forEach(x=>x.addEventListener('input',refresh));
 if(overtime){rule='overtime';type.value='overtime';price.value=0;start?.removeAttribute('required');end?.removeAttribute('required');}else{showRule();}
 el.querySelector('#pmxSaveButton').addEventListener('click',async()=>{if(typeof oldSave==='function')await oldSave();else toast('Fungsi Tambahkan ke Invoice belum siap.');});
 refresh();
}
window.invoiceAddItem=function(){open('master');};
window.__PM_OPEN_INVOICE_OVERTIME=function(){open('overtime');};
window.__PM_INVOICE_QUOTATION_FORM_MATCH=true;
document.addEventListener('click',function(e){const b=e.target.closest?.('[data-pm-safe-overtime]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();window.__PM_OPEN_INVOICE_OVERTIME();},true);
})();