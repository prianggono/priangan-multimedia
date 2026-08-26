/* Priangan Multimedia - final runtime integrity fixes */
(function(){
'use strict';
const S=v=>String(v??'').trim();
const norm=v=>S(v).toLowerCase().replace(/\s+/g,'');
const esc=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const N=v=>{const n=Number(S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));
const DB=()=>typeof db!=='undefined'&&db?db:null;
const days=(a,b)=>{if(!a||!b)return 1;const d=Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000);return d>=0?d+1:1};
const exactKey=x=>[norm(x.nama_client),norm(x.perusahaan),norm(x.telepon||x.whatsapp),norm(x.email)].join('|');

function quoteDate(x){return S(x.tanggal_penawaran||x.tanggal||x.created_at||x.tanggal_mulai||'').slice(0,10);}

/* IMPORTANT: use select('*') here. The history screen must not depend on a
   particular date-column name being present in PostgREST schema cache. */
async function history(){
 const d=DB(); if(!d)return;
 const r=await d.from('penawaran').select('*').order('id',{ascending:false});
 if(r.error){console.error('History:',r.error);msg('Gagal membaca riwayat: '+r.error.message);return;}
 const rows=r.data||[]; document.querySelector('#title').textContent='Riwayat Penawaran';
 document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.p==='history'));
 document.querySelector('#content').innerHTML=`<div class="head"><div><h1>Riwayat Penawaran</h1><p>Penawaran tersimpan di Supabase.</p></div><button class="btn" onclick="go('quotation')">+ Buat Penawaran</button></div><div class="card"><div class="scroll"><table class="table"><thead><tr><th>No</th><th>Tanggal</th><th>Client</th><th>Perusahaan</th><th>Event</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows.map(x=>{const st=S(x.status||'DRAFT').toUpperCase(),sent=['TERKIRIM','PUBLISHED','SENT'].includes(st);return `<tr><td>${esc(x.nomor_penawaran||x.nomor||'-')}</td><td>${esc(quoteDate(x)||'-')}</td><td>${esc(x.nama_client||'-')}</td><td>${esc(x.perusahaan||'-')}</td><td>${esc(x.nama_event||x.event_name||x.event||x.project||'-')}</td><td>${M(x.grand_total??x.total)}</td><td>${esc(sent?'TERKIRIM':st)}</td><td><div class="pmHistActions"><button class="btn sm" onclick="editQuotation(${Number(x.id)})">Edit</button>${sent?'<span class="pm-sent-note">Sudah diberikan</span>':`<button class="btn green sm" onclick="publishQuotation(${Number(x.id)})">Publish</button>`}<button class="btn red sm" onclick="deleteQuotation(${Number(x.id)})">Hapus</button></div></td></tr>`}).join('')||'<tr><td colspan="8">Belum ada penawaran.</td></tr>'}</tbody></table></div></div>`;
}

function finance(){ if(typeof window.eventFinancePage==='function') window.eventFinancePage(); }

async function clients(){
 const d=DB();if(!d)return;
 const r=await d.from('clients').select('*').order('id',{ascending:true});
 if(r.error){console.error('Clients:',r.error);msg('Gagal membaca client: '+r.error.message);return;}
 const seen=new Set(),rows=(r.data||[]).filter(x=>{const k=exactKey(x);if(seen.has(k))return false;seen.add(k);return true;});
 document.querySelector('#title').textContent='Data Client';
 document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.p==='clients'));
 document.querySelector('#content').innerHTML=`<div class="head"><div><h1>Client</h1><p>Contact identik ditampilkan satu kali. Contact berbeda dalam perusahaan yang sama tetap terpisah.</p></div><button class="btn" onclick="clientForm()">+ Tambah Client</button></div><div class="card"><div class="scroll"><table class="table"><thead><tr><th>Nama</th><th>Perusahaan</th><th>Telepon / WA</th><th>Email</th><th>Aksi</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.nama_client)}</td><td>${esc(x.perusahaan)}</td><td>${esc(x.whatsapp||x.telepon)}</td><td>${esc(x.email)}</td><td><button class="btn sm secondary" onclick="editClient(${Number(x.id)})">Edit</button> <button class="btn sm red" onclick="deleteClient(${Number(x.id)})">Hapus</button></td></tr>`).join('')||'<tr><td colspan="5">Belum ada data client.</td></tr>'}</tbody></table></div></div>`;
}

async function saveClientUnique(){
 const d=DB();if(!d)return;
 const payload={nama_client:S(document.querySelector('#cn')?.value),perusahaan:S(document.querySelector('#cp')?.value),telepon:S(document.querySelector('#ct')?.value),whatsapp:S(document.querySelector('#cw')?.value),email:S(document.querySelector('#ce')?.value),alamat:S(document.querySelector('#ca')?.value)};
 if(!payload.nama_client)return msg('Nama Client wajib diisi.');
 const r=await d.from('clients').select('*').order('id',{ascending:true});if(r.error)return msg('Gagal cek client: '+r.error.message);
 const found=(r.data||[]).find(x=>exactKey(x)===exactKey(payload));
 if(found){msg('Client dengan data yang sama sudah ada. Data lama digunakan.');await clients();return found;}
 const ins=await d.from('clients').insert([payload]).select('*').single();if(ins.error)return msg('Gagal menyimpan client: '+ins.error.message);
 msg('Client berhasil disimpan.');await clients();return ins.data;
}

/* Canonical item mode.
   LED TV is always a unit/qty item, even if old master data accidentally has
   an empty or area-like satuan. Videotron remains luas; Level remains level. */
function itemMode(master){
 const itemText=S(`${master?.item||''} ${master?.kategori||''}`).toLowerCase();
 const satuan=S(master?.satuan).toLowerCase().replace(/²/g,'2');
 if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(itemText))return 'qty';
 if(/unit|pcs|buah|set|hari|trip|orang|lot/.test(satuan))return 'qty';
 if(/level/.test(itemText))return 'level';
 if(/rigging|rig/.test(itemText))return 'rigging';
 if(/videotron|led\s*(indoor|outdoor)|led\s*p\.?\d/.test(itemText))return 'luas';
 return 'qty';
}

function renderItems(){
 const container=document.querySelector('#items'); if(!container)return;
 const ms=(typeof masters!=='undefined'?masters:[]).filter(x=>x.aktif!==false);
 const arr=(typeof items!=='undefined'?items:[]);
 /* Repair stale in-memory item types whenever the master is known. */
 arr.forEach(item=>{const master=ms.find(x=>String(x.kode)===String(item.kode));if(!master)return;const mode=itemMode(master);item.tipe=mode;if(mode==='qty'){item.lebar=0;item.tinggi=0;item.panjang=0;}if(mode==='level'){const led=arr.find(x=>{const t=`${x.item||''} ${x.kode||''}`.toLowerCase();return /led|videotron/.test(t)&&N(x.lebar)>0;});if(led)item.lebar=N(led.lebar);}});
 const sub=i=>{const d=days(i.mulai,i.selesai),p=N(i.harga),q=Math.max(1,N(i.qty||1)),w=N(i.lebar),h=N(i.tinggi),l=N(i.panjang);if(i.tipe==='level')return w*p*d;if(i.tipe==='luas')return w*h*p*d;if(i.tipe==='rigging')return ((l*2)+(h*2))*p*d;return q*p*d};
 const dim=i=>{if(i.tipe==='level')return `<div class="dim"><div class="field"><label>Lebar Level (otomatis)</label><input value="${N(i.lebar)?N(i.lebar)+' m':'-'}" readonly></div><div class="field"><label>Tinggi Level (m)</label><input type="number" min="0" step="0.01" value="${N(i.tinggi)}" onchange="upd(${i.id},'tinggi',this.value)"></div></div>`;if(i.tipe==='rigging')return `<div class="dim"><div class="field"><label>Panjang Rigging (m)</label><input type="number" min="0" step="0.01" value="${N(i.panjang)}" onchange="upd(${i.id},'panjang',this.value)"></div><div class="field"><label>Tinggi Rigging (m)</label><input type="number" min="0" step="0.01" value="${N(i.tinggi)}" onchange="upd(${i.id},'tinggi',this.value)"></div></div>`;if(i.tipe==='luas')return `<div class="dim"><div class="field"><label>Lebar Videotron (m)</label><input type="number" min="0" step="0.01" value="${N(i.lebar)}" onchange="upd(${i.id},'lebar',this.value)"></div><div class="field"><label>Tinggi Videotron (m)</label><input type="number" min="0" step="0.01" value="${N(i.tinggi)}" onchange="upd(${i.id},'tinggi',this.value)"></div></div>`;return `<div class="field"><label>Jumlah (Qty)</label><input type="number" min="1" step="1" value="${Math.max(1,N(i.qty||1))}" onchange="upd(${i.id},'qty',this.value)"></div>`;};
 container.innerHTML=arr.map((item,index)=>`<div class="item"><div class="itemhead"><span class="blue">ITEM #${index+1}</span><button class="btn red sm" type="button" onclick="removeItem(${item.id})">Hapus</button></div><div class="field"><label>Produk / Jasa</label><select onchange="pick(${item.id},this.value)"><option value="">-- Pilih dari Master Harga --</option>${ms.map(m=>`<option value="${esc(m.kode)}" ${item.kode===m.kode?'selected':''}>[${esc(m.kode)}] ${esc(m.item)}</option>`).join('')}</select></div><div class="grid g2"><div class="field"><label>Harga Jual</label><input value="${M(item.harga)}" readonly></div><div class="field"><label>Tipe Perhitungan</label><input value="${esc(item.tipe||'qty')}" readonly></div></div>${dim(item)}<div class="sched"><b>Jadwal Pemakaian</b><div class="grid g2" style="margin-top:12px"><div class="field"><label>Tanggal Mulai</label><input type="date" value="${esc(item.mulai)}" onchange="upd(${item.id},'mulai',this.value)"></div><div class="field"><label>Tanggal Selesai</label><input type="date" value="${esc(item.selesai)}" onchange="upd(${item.id},'selesai',this.value)"></div></div></div><div class="sum"><span>Subtotal</span><b>${M(sub(item))}</b></div></div>`).join('');
 const total=arr.reduce((s,i)=>s+sub(i),0);if(document.querySelector('#total'))document.querySelector('#total').textContent=M(total);
}

function installItemCapture(){
 document.addEventListener('change',function(ev){
  const el=ev.target;if(!el.closest('#items'))return;
  const code=el.getAttribute('onchange')||'';
  let m=code.match(/^pick\(([^,]+),this\.value\)$/);
  if(m){ev.stopImmediatePropagation();const id=Number(m[1]),master=(typeof masters!=='undefined'?masters:[]).find(x=>String(x.kode)===String(el.value)),arr=(typeof items!=='undefined'?items:[]),item=arr.find(x=>x.id===id);if(!master||!item)return;item.kode=master.kode;item.item=master.item;item.harga=N(master.harga_jual);item.tipe=itemMode(master);item.qty=Math.max(1,N(item.qty||1));if(item.tipe==='level'){const led=arr.find(x=>/led|videotron/i.test(x.item||'')&&N(x.lebar)>0);item.lebar=led?N(led.lebar):0;}else if(item.tipe==='qty'){item.lebar=0;item.tinggi=0;item.panjang=0;}renderItems();return;}
  m=code.match(/^upd\(([^,]+),'([^']+)',this\.value\)$/);
  if(m){ev.stopImmediatePropagation();const id=Number(m[1]),key=m[2],arr=(typeof items!=='undefined'?items:[]),item=arr.find(x=>x.id===id);if(!item)return;item[key]=(key==='mulai'||key==='selesai')?el.value:(N(el.value)||0);renderItems();}
 },true);
}

function installNavCapture(){
 document.addEventListener('click',function(ev){
  const b=ev.target.closest('.nav[data-p]');if(!b)return;
  const p=b.dataset.p;
  if(!['history','finance','clients'].includes(p))return;
  ev.preventDefault();ev.stopImmediatePropagation();
  if(p==='history')history();else if(p==='finance')finance();else clients();
 },true);
}

window.__pmRuntimeFix={history,clients,saveClientUnique,itemMode,renderItems};
window.saveClient=saveClientUnique;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installNavCapture();installItemCapture()});else{installNavCapture();installItemCapture();}
})();
