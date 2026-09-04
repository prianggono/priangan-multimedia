/* Priangan Multimedia — Data Vendor CRUD */
(function(){
  'use strict';
  if(window.__PM_VENDOR_MANAGEMENT)return;
  window.__PM_VENDOR_MANAGEMENT=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const getDb=()=>{try{return typeof db!=='undefined'?db:null}catch(_){return null}};
  const msg=t=>typeof window.msg==='function'?window.msg(t):alert(t);

  function openVendorPage(button){
    document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));
    if(button)button.classList.add('active');
    const title=document.querySelector('#title');
    if(title)title.textContent='Data Vendor';
    render();
    document.querySelector('.sidebar')?.classList.remove('open');
  }

  function installNav(){
    const nav=document.querySelector('.sidebar nav');
    if(!nav)return;
    let b=nav.querySelector('[data-p="vendors"]');
    if(!b){
      b=document.createElement('button');
      b.className='nav'; b.type='button'; b.dataset.p='vendors'; b.textContent='♧ Data Vendor';
      const template=nav.querySelector('[data-p="template"]');
      nav.insertBefore(b,template||null);
    }
    if(b.dataset.vendorBound==='1')return;
    b.dataset.vendorBound='1';
    b.addEventListener('click',function(e){
      e.preventDefault();
      e.stopImmediatePropagation();
      openVendorPage(b);
    },true);
  }

  async function render(){
    const content=document.querySelector('#content');if(!content)return;
    const d=getDb();
    if(!d){content.innerHTML='<div class="card"><b>Data Vendor</b><p>Supabase belum terhubung.</p></div>';return}
    const r=await d.from('vendors').select('*').order('id',{ascending:false});
    if(r.error){console.error(r.error);content.innerHTML='<div class="card"><b>Data Vendor</b><p>Gagal membaca data vendor: '+esc(r.error.message)+'</p></div>';return}
    const rows=r.data||[];
    content.innerHTML=`
      <div class="head"><div><h1>Data Vendor</h1><p>Kelola kontak vendor untuk kebutuhan operasional Priangan Multimedia.</p></div><button class="btn" type="button" id="pmVendorAdd">+ Tambah Vendor</button></div>
      <div class="card" id="pmVendorForm" style="display:none;margin-bottom:16px">
        <b id="pmVendorFormTitle">Tambah Vendor</b>
        <input type="hidden" id="pmVendorId">
        <div class="grid g2" style="margin-top:15px">
          <div class="field"><label>Nama *</label><input id="pmVendorNama" placeholder="Nama PIC / kontak"></div>
          <div class="field"><label>Vendor *</label><input id="pmVendorVendor" placeholder="Nama perusahaan vendor"></div>
          <div class="field"><label>Nomor Telepon</label><input id="pmVendorTelepon" placeholder="08xxxxxxxxxx" inputmode="tel"></div>
        </div>
        <div class="actions" style="margin-top:15px"><button class="btn secondary" type="button" id="pmVendorCancel">Batal</button><button class="btn green" type="button" id="pmVendorSave">Simpan</button></div>
      </div>
      <div class="card"><div class="scroll"><table class="table"><thead><tr><th>No.</th><th>Nama</th><th>Vendor</th><th>Nomor Telepon</th><th>Aksi</th></tr></thead><tbody>
      ${rows.length?rows.map((v,i)=>`<tr><td>${i+1}</td><td>${esc(v.nama)}</td><td>${esc(v.vendor)}</td><td>${esc(v.telepon||'-')}</td><td><button class="btn secondary sm" data-edit="${v.id}" type="button">Edit</button> <button class="btn red sm" data-del="${v.id}" type="button">Hapus</button></td></tr>`).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--muted)">Belum ada data vendor.</td></tr>'}
      </tbody></table></div></div>`;

    const form=document.querySelector('#pmVendorForm');
    document.querySelector('#pmVendorAdd').onclick=()=>{form.style.display='block';document.querySelector('#pmVendorFormTitle').textContent='Tambah Vendor';document.querySelector('#pmVendorId').value='';document.querySelector('#pmVendorNama').value='';document.querySelector('#pmVendorVendor').value='';document.querySelector('#pmVendorTelepon').value='';document.querySelector('#pmVendorNama').focus()};
    document.querySelector('#pmVendorCancel').onclick=()=>form.style.display='none';
    document.querySelector('#pmVendorSave').onclick=async()=>{const id=document.querySelector('#pmVendorId').value;const payload={nama:document.querySelector('#pmVendorNama').value.trim(),vendor:document.querySelector('#pmVendorVendor').value.trim(),telepon:document.querySelector('#pmVendorTelepon').value.trim(),updated_at:new Date().toISOString()};if(!payload.nama||!payload.vendor)return msg('Nama dan Vendor wajib diisi.');const q=id?d.from('vendors').update(payload).eq('id',id):d.from('vendors').insert([payload]);const z=await q;if(z.error)return msg('Gagal menyimpan vendor: '+z.error.message);msg(id?'Vendor diperbarui.':'Vendor ditambahkan.');render()};
    content.querySelectorAll('[data-edit]').forEach(btn=>btn.onclick=()=>{const v=rows.find(x=>String(x.id)===btn.dataset.edit);if(!v)return;form.style.display='block';document.querySelector('#pmVendorFormTitle').textContent='Edit Vendor';document.querySelector('#pmVendorId').value=v.id;document.querySelector('#pmVendorNama').value=v.nama||'';document.querySelector('#pmVendorVendor').value=v.vendor||'';document.querySelector('#pmVendorTelepon').value=v.telepon||'';document.querySelector('#pmVendorNama').focus()});
    content.querySelectorAll('[data-del]').forEach(btn=>btn.onclick=async()=>{if(!confirm('Hapus data vendor ini?'))return;const z=await d.from('vendors').delete().eq('id',btn.dataset.del);if(z.error)return msg('Gagal menghapus vendor: '+z.error.message);msg('Vendor dihapus.');render()});
  }

  function hook(){installNav();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
})();
