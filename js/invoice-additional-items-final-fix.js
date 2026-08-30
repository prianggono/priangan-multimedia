/* Final Invoice Additional Item Fix
 * Additional items are invoice-only. Never modifies penawaran or master_harga.
 */
(function(){
'use strict';
const KEY='PM_INVOICE_EXTRA_ITEMS';
const S=v=>String(v??'').trim();
const N=v=>{const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
const E=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
const toast=t=>typeof window.msg==='function'?window.msg(t):alert(t);
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch(_){return {};}};
const write=x=>localStorage.setItem(KEY,JSON.stringify(x));
const get=id=>read()[String(id)]||[];
let state=null;

function baseFromEditor(){return N(document.getElementById('invTotal')?.textContent);}
function syncEditor(){
 if(!state?.id)return;
 const box=document.getElementById('invoiceItems'),table=box?.querySelector('table'),tbody=table?.querySelector('tbody');
 if(!tbody)return setTimeout(syncEditor,100);
 const totalRow=Array.from(tbody.querySelectorAll('tr')).find(tr=>/GRAND TOTAL/i.test(tr.textContent||''));
 tbody.querySelectorAll('tr[data-pm-final-extra]').forEach(x=>x.remove());
 if(!state.baseTotal)state.baseTotal=baseFromEditor();
 const add=get(state.id),extra=add.reduce((a,x)=>a+N(x.subtotal),0),total=state.baseTotal+extra;
 add.forEach(x=>{const tr=document.createElement('tr');tr.dataset.pmFinalExtra='1';tr.innerHTML=`<td>+</td><td><strong>${E(x.item)}</strong><div style="color:var(--muted);font-size:12px">${E(x.kode)} • Invoice only</div></td><td>${N(x.qty)} ${E(x.satuan||'unit')}</td><td>${M(x.harga)}</td><td><strong>${M(x.subtotal)}</strong></td><td><button class="btn sm secondary" type="button" onclick="invoiceRemoveItem('${E(x.id)}')">Hapus</button></td>`;if(totalRow)tbody.insertBefore(tr,totalRow);else tbody.appendChild(tr);});
 if(totalRow){const c=totalRow.querySelectorAll('td');if(c.length)c[c.length-1].textContent=M(total);}
 const te=document.getElementById('invTotal');if(te)te.textContent=M(total);
 const paid=N(document.getElementById('invPaid')?.textContent),be=document.getElementById('invBalance');if(be)be.textContent=M(Math.max(0,total-paid));
 if(!document.getElementById('pmFinalAddBtn')){const h=document.createElement('div');h.id='pmFinalAddHead';h.style.cssText='display:flex;justify-content:flex-end;margin-bottom:12px';h.innerHTML='<button id="pmFinalAddBtn" class="btn sm" type="button" onclick="invoiceAddItem()">+ Tambah Item</button>';box.insertBefore(h,box.firstChild);}
}

function openAdd(){
 document.getElementById('pmInvoiceAddDialog')?.remove();
 const el=document.createElement('div');el.id='pmInvoiceAddDialog';el.innerHTML=`<style>
 #pmInvoiceAddDialog{position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,.68);display:flex;align-items:center;justify-content:center;padding:18px}.pmx{width:min(520px,100%);background:#10192d;border:1px solid #2b3a5c;border-radius:16px;padding:20px;color:#fff}.pmx h3{margin:0 0 6px}.pmx p{font-size:12px;color:#9fb0cc;margin:0 0 16px}.pmx label{display:block;font-size:12px;color:#aebbd2;margin:10px 0 6px}.pmx input,.pmx select{width:100%;box-sizing:border-box;background:#071022;color:#fff;border:1px solid #2b3a5c;border-radius:9px;padding:11px}.pmxg{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pmxa{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.pmxa button{border:0;border-radius:9px;padding:10px 15px;font-weight:700}.pmxc{background:#1b2945;color:#fff}.pmxs{background:#00c98b;color:#fff}@media(max-width:600px){.pmxg{grid-template-columns:1fr}}
 </style><div class="pmx"><h3>Tambah Item ke Invoice</h3><p>Item tambahan hanya masuk invoice ini. Penawaran dan price list tetap aman.</p><label>Jenis</label><select id="pmxType"><option value="normal">Item Tambahan</option><option value="overtime">Overtime</option></select><label>Keterangan</label><input id="pmxName" placeholder="Contoh: Overtime Operator"><div class="pmxg"><div><label id="pmxQtyLabel">Jumlah</label><input id="pmxQty" type="number" min="0.5" step="1" value="1"></div><div><label>Harga / Jam atau Unit</label><input id="pmxPrice" type="number" min="0" step="1000" value="0"></div></div><div id="pmxSub" style="margin-top:12px;text-align:right;color:#00d4a8;font-weight:700">Subtotal: Rp 0</div><div class="pmxa"><button class="pmxc" onclick="invoiceCloseAddItem()">Batal</button><button class="pmxs" onclick="invoiceSaveAddItem()">Tambahkan</button></div></div>`;
 document.body.appendChild(el);
 const type=el.querySelector('#pmxType'),name=el.querySelector('#pmxName'),qty=el.querySelector('#pmxQty'),price=el.querySelector('#pmxPrice'),label=el.querySelector('#pmxQtyLabel'),sub=el.querySelector('#pmxSub');
 const calc=()=>sub.textContent='Subtotal: '+M((N(qty.value)||0)*(N(price.value)||0));
 type.onchange=()=>{if(type.value==='overtime'){label.textContent='Kelebihan Jam';qty.step='0.5';name.value=name.value||'Overtime';}else{label.textContent='Jumlah';qty.step='1';}calc();};qty.oninput=calc;price.oninput=calc;name.focus();
}
function saveAdd(){
 if(!state?.id)return toast('Invoice belum dipilih.');
 const type=S(document.getElementById('pmxType')?.value||'normal'),name=S(document.getElementById('pmxName')?.value)||(type==='overtime'?'Overtime':'Item Tambahan'),qty=N(document.getElementById('pmxQty')?.value),price=N(document.getElementById('pmxPrice')?.value);
 if(qty<=0)return toast(type==='overtime'?'Kelebihan jam harus lebih dari 0.':'Jumlah harus lebih dari 0.');
 if(price<0)return toast('Harga tidak valid.');
 const d=read(),k=String(state.id),item={id:'INVADD-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),invoice_item:true,tipe:type,item,kode:type==='overtime'?'OVERTIME':'ADD-INV',qty,satuan:type==='overtime'?'jam':'unit',harga:price,subtotal:qty*price};
 d[k]=[...(d[k]||[]),item];write(d);document.getElementById('pmInvoiceAddDialog')?.remove();syncEditor();
}
function removeAdd(id){if(!state?.id)return;const d=read(),k=String(state.id);d[k]=(d[k]||[]).filter(x=>String(x.id)!==String(id));write(d);syncEditor();}

function installEdit(){
 if(window.__PM_FINAL_EDIT)return;
 if(typeof window.invoiceEdit!=='function')return setTimeout(installEdit,200);
 const prev=window.invoiceEdit;
 window.invoiceEdit=function(id){prev(id);state={id:Number(id),baseTotal:0};let n=0;const wait=()=>{if(document.getElementById('invoiceItems')){state.baseTotal=baseFromEditor();syncEditor();}else if(n++<50)setTimeout(wait,80);};wait();};
 window.__PM_FINAL_EDIT=true;
}
function patchPreview(){
 if(window.__PM_FINAL_PREVIEW)return;
 if(typeof window.previewInvoice!=='function')return setTimeout(patchPreview,200);
 const prev=window.previewInvoice;
 window.previewInvoice=async function(){await prev();const id=state?.id;if(!id)return;const add=get(id);if(!add.length)return;const ov=document.getElementById('pmInvoicePreview'),tbody=ov?.querySelector('.pm-inv-table tbody');if(!tbody)return;const totalRow=Array.from(tbody.querySelectorAll('tr')).find(tr=>/TOTAL INVOICE/i.test(tr.textContent||''));const c=totalRow?.querySelectorAll('td');const base=N(c?.[c.length-1]?.textContent),extra=add.reduce((a,x)=>a+N(x.subtotal),0),total=base+extra;add.forEach(x=>{const tr=document.createElement('tr');tr.dataset.pmFinalPreview='1';tr.innerHTML=`<td class="center">+</td><td><strong>${E(x.item)}</strong><div class="code">${E(x.kode)} • Invoice only</div></td><td class="center">${N(x.qty)} ${E(x.satuan||'unit')}</td><td class="right">${M(x.harga)}</td><td class="right"><strong>${M(x.subtotal)}</strong></td>`;if(totalRow)tbody.insertBefore(tr,totalRow);else tbody.appendChild(tr);});if(totalRow){const cc=totalRow.querySelectorAll('td');if(cc.length)cc[cc.length-1].textContent=M(total);}const rows=ov.querySelectorAll('.pm-inv-payrow');if(rows[0])rows[0].querySelector('strong').textContent=M(total);if(rows[2]){const paid=N(rows[1]?.querySelector('strong')?.textContent);rows[2].querySelector('strong').textContent=M(Math.max(0,total-paid));}};
 window.__PM_FINAL_PREVIEW=true;
}
function patchLabels(){
 document.querySelectorAll('#content').forEach(root=>{root.innerHTML=root.innerHTML.replace(/Sudah Dibayar/g,'Downpayment').replace(/Sudah dibayar/g,'Downpayment');});
 const ov=document.getElementById('pmInvoicePreview');if(ov)ov.innerHTML=ov.innerHTML.replace(/Sudah dibayar/g,'Downpayment');
}
window.invoiceAddItem=openAdd;window.invoiceSaveAddItem=saveAdd;window.invoiceRemoveItem=removeAdd;window.invoiceCloseAddItem=()=>document.getElementById('pmInvoiceAddDialog')?.remove();
installEdit();patchPreview();
setTimeout(installEdit,300);setTimeout(patchPreview,300);setTimeout(patchLabels,400);setTimeout(installEdit,1200);setTimeout(patchPreview,1200);
})();