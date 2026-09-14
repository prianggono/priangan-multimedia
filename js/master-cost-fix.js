/* Priangan Multimedia — Master Harga Domain Core
 * Single authority for master price CRUD and editor.
 * Package contents are edited here and stored in master_harga.isi_paket.
 */
(function(){
'use strict';
if(window.__PM_MASTER_HARGA_CORE)return;window.__PM_MASTER_HARGA_CORE=true;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const active=v=>{if(v===true||v===1)return true;const s=String(v??'').trim().toUpperCase();return !['FALSE','0','NO','TIDAK','NONAKTIF','INACTIVE','OFF'].includes(s)};
const dbx=()=>window.__PM_STABLE_DB||window.db||null;
const getMasters=()=>Array.isArray(window.masters)?window.masters:[];
const msg=v=>typeof window.msg==='function'?window.msg(v):console.warn('[PM]',v);
const money=v=>typeof window.money==='function'?window.money(v):new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(v)||0);
const renderApp=()=>typeof window.render==='function'?window.render():null;

function parsePackageRows(raw){
  return String(raw??'').replace(/\\n/g,'\n').split(/\r?\n/).map(x=>String(x).trim()).filter(Boolean).map(line=>{
    let m=line.match(/^(.*?)\s+[—–]\s+([^—–]+)$/);
    if(!m)m=line.match(/^(.*?)\s+-\s+([^\-]+)$/);
    if(m)return {komponen:String(m[1]).trim(),qty:String(m[2]).trim()||'-'};
    return {komponen:line,qty:'-'};
  });
}
function serializePackageRows(){
  return [...document.querySelectorAll('#packageItems .pm-package-edit-row')].map(row=>{
    const name=String(row.querySelector('.pm-package-component')?.value||'').trim();
    const qty=String(row.querySelector('.pm-package-qty')?.value||'').trim()||'-';
    return name?`${name} — ${qty}`:null;
  }).filter(Boolean).join('\n');
}
function packageRowHtml(row,index){
  const name=esc(row?.komponen||''),qty=esc(row?.qty||'-');
  return `<div class="pm-package-edit-row" data-package-index="${index}"><div class="field"><label>Komponen</label><input class="pm-package-component" autocomplete="off" value="${name}" placeholder="Contoh: Parled"></div><div class="field"><label>Qty</label><input class="pm-package-qty" autocomplete="off" inputmode="numeric" value="${qty}" placeholder="Qty"></div><button type="button" class="btn sm danger pm-package-remove" aria-label="Hapus komponen">Hapus</button></div>`;
}
function packageEditor(row=null){
  const isExistingPackage=!!row && (String(row?.satuan||'').trim().toLowerCase()==='paket' || !!String(row?.isi_paket||'').trim());
  const initial=parsePackageRows(row?.isi_paket||'');
  const rows=initial.length?initial:[{komponen:'',qty:'-'}];
  return `<div id="pmPackageEditor" class="pm-package-master-editor ${isExistingPackage?'is-open':''}"><div class="pm-package-master-head"><div><b>Isi Paket</b><div>Tambahkan komponen dan Qty yang termasuk dalam paket.</div></div><button type="button" class="btn secondary sm" id="pmTogglePackageEditor">${isExistingPackage?'Sembunyikan':'Isi Paket'}</button></div><div id="pmPackageEditorBody" ${isExistingPackage?'':'hidden'}><div id="packageItems">${rows.map(packageRowHtml).join('')}</div><div class="actions pm-package-add-actions"><button type="button" class="btn secondary" id="pmAddPackageComponent">+ Tambah Komponen</button></div><div class="pm-package-master-note">Data ini akan disimpan ke Master Harga dan ditampilkan pada tombol <b>Lihat Isi Paket</b>.</div></div></div>`;
}
function bindPackageEditor(){
  const form=document.getElementById('masterForm');
  if(!form||form.dataset.pmPackageBound==='1')return;
  form.dataset.pmPackageBound='1';
  const satuan=document.getElementById('ms');
  const editor=document.getElementById('pmPackageEditor');
  const body=document.getElementById('pmPackageEditorBody');
  const list=document.getElementById('packageItems');
  const toggle=document.getElementById('pmTogglePackageEditor');
  const isOpen=()=>!!body && !body.hidden;
  const setOpen=(open)=>{if(!body||!toggle)return;body.hidden=!open;editor?.classList.toggle('is-open',open);toggle.textContent=open?'Sembunyikan':'Isi Paket';};
  const add=()=>{
    if(!list)return;
    const idx=list.querySelectorAll('.pm-package-edit-row').length;
    list.insertAdjacentHTML('beforeend',packageRowHtml({komponen:'',qty:'-'},idx));
    list.lastElementChild?.querySelector('.pm-package-component')?.focus();
  };
  toggle?.addEventListener('click',e=>{e.preventDefault();setOpen(!isOpen());});
  document.getElementById('pmAddPackageComponent')?.addEventListener('click',e=>{e.preventDefault();setOpen(true);add();});
  list?.addEventListener('click',e=>{
    const b=e.target.closest('.pm-package-remove');
    if(!b)return;
    e.preventDefault();
    const rows=[...list.querySelectorAll('.pm-package-edit-row')];
    if(rows.length===1){rows[0].querySelector('.pm-package-component').value='';rows[0].querySelector('.pm-package-qty').value='-';return;}
    b.closest('.pm-package-edit-row')?.remove();
  });
  satuan?.addEventListener('input',()=>{if(String(satuan.value||'').trim().toLowerCase()==='paket')setOpen(true);});
  satuan?.addEventListener('change',()=>{if(String(satuan.value||'').trim().toLowerCase()==='paket')setOpen(true);});
}
function installPackageStyles(){
  if(document.getElementById('pmPackageMasterEditorStyles'))return;
  const st=document.createElement('style');st.id='pmPackageMasterEditorStyles';st.textContent=`
    .pm-package-master-editor{margin-top:18px;padding:16px;border:1px solid rgba(93,125,255,.28);border-radius:14px;background:rgba(62,86,150,.07)}
    .pm-package-master-editor.is-open{border-color:rgba(93,125,255,.45);background:rgba(62,86,150,.09)}
    .pm-package-master-editor[hidden]{display:none!important}
    .pm-package-master-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}
    .pm-package-master-head>div>div{margin-top:3px;color:var(--muted,#9aa7bd);font-size:12px}
    #pmPackageEditorBody[hidden]{display:none!important}
    .pm-package-edit-row{display:grid;grid-template-columns:minmax(0,1fr) 150px auto;gap:10px;align-items:end;padding:10px 0;border-top:1px solid rgba(255,255,255,.07)}
    .pm-package-edit-row .field{margin:0}
    .pm-package-remove{height:38px;margin-bottom:0}
    .pm-package-add-actions{margin-top:8px!important}
    .pm-package-master-note{margin-top:10px;color:var(--muted,#9aa7bd);font-size:12px}
    @media(max-width:700px){.pm-package-edit-row{grid-template-columns:1fr 120px auto}.pm-package-master-head{align-items:stretch;flex-direction:column}.pm-package-master-head .btn{width:100%}}
  `;document.head.appendChild(st);
}

function costForm(row=null){const editing=!!row,id=row?.id??'',hm=Number(row?.harga_modal)||0,hj=Number(row?.harga_jual)||0;installPackageStyles();return `<div id="masterForm" class="card master-editor" style="margin-bottom:16px"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px"><div><b>${editing?'Edit Master Harga':'Tambah Master Harga'}</b><div style="color:var(--muted);font-size:12px;margin-top:3px">${editing?'Perbarui harga modal, harga jual, dan data item lalu tekan Simpan.':'Masukkan produk/jasa baru beserta harga modal dan harga jual.'}</div></div>${editing?`<span class="badge ok">EDIT #${esc(row.id)}</span>`:''}</div><input type="hidden" id="mmid" value="${esc(id)}"><div class="grid g2"><div class="field"><label>Kode</label><input id="mk" autocomplete="off" value="${esc(row?.kode||'')}"></div><div class="field"><label>Item</label><input id="mi" autocomplete="off" value="${esc(row?.item||'')}"></div><div class="field"><label>Kategori</label><input id="mc" autocomplete="off" value="${esc(row?.kategori||'')}"></div><div class="field"><label>Satuan</label><input id="ms" autocomplete="off" value="${esc(row?.satuan||'')}"></div><div class="field"><label>Harga Modal</label><input id="hm" type="number" min="0" step="1" value="${hm}"></div><div class="field"><label>Harga Jual</label><input id="mh" type="number" min="0" step="1" value="${hj}"></div><div class="field"><label>Aktif</label><select id="ma"><option value="true" ${!row||active(row?.aktif)?'selected':''}>YA</option><option value="false" ${row&&!active(row?.aktif)?'selected':''}>TIDAK</option></select></div></div>${packageEditor(row)}<div class="actions"><button class="btn secondary" type="button" onclick="closeMasterEditor()">Batal</button><button class="btn green" type="button" onclick="saveMasterEditor()">Simpan</button></div></div>`}
function closeEditor(){document.getElementById('masterForm')?.remove()}
function openCreate(){closeEditor();document.querySelector('#content')?.insertAdjacentHTML('afterbegin',costForm());bindPackageEditor();document.getElementById('mk')?.focus()}
function openEdit(id){const row=getMasters().find(x=>String(x.id)===String(id));if(!row)return msg('Data master tidak ditemukan.');closeEditor();document.querySelector('#content')?.insertAdjacentHTML('afterbegin',costForm(row));bindPackageEditor();document.getElementById('hm')?.focus();document.getElementById('hm')?.select()}

async function save(){const d=dbx();if(!d)return msg('Supabase belum terhubung.');const id=String(document.getElementById('mmid')?.value||'').trim(),kode=String(document.getElementById('mk')?.value||'').trim(),item=String(document.getElementById('mi')?.value||'').trim();if(!kode||!item)return msg('Kode dan Item wajib diisi.');const hm=Number(document.getElementById('hm')?.value),hj=Number(document.getElementById('mh')?.value);if(!Number.isFinite(hm)||hm<0)return msg('Harga Modal harus berupa angka 0 atau lebih.');if(!Number.isFinite(hj)||hj<0)return msg('Harga Jual harus berupa angka 0 atau lebih.');const satuan=String(document.getElementById('ms')?.value||'').trim();const packageBody=document.getElementById('pmPackageEditorBody');const isPackage=String(satuan).toLowerCase()==='paket'||(packageBody&&!packageBody.hidden);const isiPaket=isPackage?serializePackageRows():String(getMasters().find(x=>String(x.id)===String(id))?.isi_paket||'');const payload={kode,item,kategori:String(document.getElementById('mc')?.value||'').trim(),satuan,harga_modal:hm,harga_jual:hj,aktif:document.getElementById('ma')?.value==='true'};if(isPackage)payload.isi_paket=isiPaket;const b=document.querySelector('#masterForm .actions .btn.green');if(b){b.disabled=true;b.textContent='Menyimpan...'}try{if(!id){const dup=await d.from('master_harga').select('id,kode,item').eq('kode',kode).limit(1).maybeSingle();if(dup.error)throw dup.error;if(dup.data?.id){msg(`Kode ${kode} sudah digunakan oleh "${dup.data.item||'item lain'}". Gunakan Kode berbeda atau edit item tersebut.`);return;}}const r=id?await d.from('master_harga').update(payload).eq('id',id).select('*').single():await d.from('master_harga').insert([payload]).select('*').single();if(r.error){if(r.error.code==='23505'||/duplicate|unique/i.test(String(r.error.message||''))){msg(`Kode ${kode} sudah ada. Gunakan Kode berbeda.`);return}throw r.error}const saved=r.data,arr=getMasters(),ix=arr.findIndex(x=>String(x.id)===String(saved?.id));if(ix>=0)arr[ix]=saved;else if(saved)arr.push(saved);window.masters=arr;closeEditor();renderApp();msg(id?'Master Harga diperbarui.':'Master Harga berhasil ditambahkan.')}catch(e){console.error('[PM] master save',e);msg('Gagal menyimpan: '+(e.message||e))}finally{if(b){b.disabled=false;b.textContent='Simpan'}}}

async function remove(id){const d=dbx();if(!d)return msg('Supabase belum terhubung.');const row=getMasters().find(x=>String(x.id)===String(id));if(!row)return msg('Data master tidak ditemukan.');const ok=window.confirm(`Hapus Master Harga?\n\nKode: ${row.kode||'-'}\nItem: ${row.item||'-'}\n\nData akan dihapus dari Master Harga.`);if(!ok)return;try{const r=await d.from('master_harga').delete().eq('id',id);if(r.error)throw r.error;window.masters=getMasters().filter(x=>String(x.id)!==String(id));closeEditor();renderApp();msg(`Master Harga ${row.kode||''} berhasil dihapus.`.trim())}catch(e){console.error('[PM] master delete',e);const text=String(e?.message||e);if(/foreign key|violates|constraint|referenced/i.test(text))msg('Item tidak dapat dihapus karena masih digunakan oleh data lain. Nonaktifkan item tersebut melalui Edit.');else msg('Gagal menghapus: '+text)}}

function page(){const arr=getMasters();installPackageStyles();document.querySelector('#content').innerHTML=`<div class="head"><div><h1>Master Harga</h1><p>Satu sumber data untuk harga modal, harga jual, satuan, kategori dan status item.</p></div><div class="actions"><input type="file" id="csvInput" accept=".csv,text/csv" style="display:none"><button class="btn secondary" type="button" onclick="document.getElementById('csvInput').click()">Import CSV</button><button class="btn green" type="button" onclick="masterForm()">+ Tambah Item</button></div></div><div class="card"><div class="scroll"><table class="table"><thead><tr><th>Kode</th><th>Item</th><th>Kategori</th><th>Satuan</th><th>Harga Modal</th><th>Harga Jual</th><th>Aktif</th><th>Aksi</th></tr></thead><tbody>${arr.map(row=>`<tr><td>${esc(row.kode)}</td><td>${esc(row.item)}</td><td>${esc(row.kategori)}</td><td>${esc(row.satuan)}</td><td>${money(row.harga_modal)}</td><td><b>${money(row.harga_jual)}</b></td><td>${active(row.aktif)?'YA':'TIDAK'}</td><td><div class="actions" style="justify-content:flex-end;gap:6px"><button class="btn sm secondary" type="button" onclick="editMaster(${Number(row.id)})">Edit</button><button class="btn sm danger" type="button" onclick="deleteMaster(${Number(row.id)})">Hapus</button></div></td></tr>`).join('')||'<tr><td colspan="8" class="empty">Belum ada data.</td></tr>'}</tbody></table></div></div>`}

window.pmMasterPage=page;window.pmMasterForm=openCreate;window.pmSaveMaster=save;window.pmDeleteMaster=remove;window.masterPage=page;window.masterForm=openCreate;window.editMaster=openEdit;window.closeMasterEditor=closeEditor;window.saveMasterEditor=save;window.deleteMaster=remove;
})();
