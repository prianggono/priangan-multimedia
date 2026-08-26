/* Priangan Multimedia — exact-contact deduplication.
 * Same person/contact with identical name + company + phone/WA + email is one client.
 * Different people in the same company remain separate contacts.
 */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const norm=v=>S(v).toLowerCase().replace(/\s+/g,'');
  const key=v=>[norm(v.nama_client),norm(v.perusahaan),norm(v.telepon||v.whatsapp),norm(v.email)].join('|');
  function DB(){
    if(typeof db!=='undefined'&&db)return db;
    const c=window.PRIANGAN_CONFIG||{},u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL),k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);
    return u&&k&&window.supabase?.createClient?window.supabase.createClient(u,k):null;
  }
  async function findExisting(data){
    const d=DB(); if(!d) throw new Error('Supabase belum terhubung.');
    const r=await d.from('clients').select('*').order('id',{ascending:true});
    if(r.error)throw r.error;
    const wanted=key(data);
    return (r.data||[]).find(x=>key(x)===wanted)||null;
  }
  async function saveUnique(data,id=null){
    const d=DB();if(!d)throw new Error('Supabase belum terhubung.');
    const payload={nama_client:S(data.nama_client),perusahaan:S(data.perusahaan),telepon:S(data.telepon),whatsapp:S(data.whatsapp),email:S(data.email),alamat:S(data.alamat)};
    if(!payload.nama_client)throw new Error('Nama Client wajib diisi.');
    if(id){
      const r=await d.from('clients').update(payload).eq('id',id).select('*').single();if(r.error)throw r.error;return r.data;
    }
    const existing=await findExisting(payload);
    if(existing)return existing;
    const r=await d.from('clients').insert([payload]).select('*').single();if(r.error)throw r.error;return r.data;
  }
  window.pmSaveClientFromQuotation=async function(){
    const data={nama_client:S(document.querySelector('#qc')?.value),perusahaan:S(document.querySelector('#qp')?.value),telepon:S(document.querySelector('#qw')?.value),whatsapp:S(document.querySelector('#qw')?.value),email:S(document.querySelector('#qe')?.value),alamat:S(document.querySelector('#qalamat')?.value)};
    if(!data.nama_client)throw new Error('Nama Client wajib diisi sebelum menyimpan penawaran.');
    if(!data.perusahaan)throw new Error('Perusahaan wajib diisi sebelum menyimpan penawaran.');
    const client=await saveUnique(data);window.__pmLastSavedClientId=client?.id||null;return client;
  };
  window.saveClient=async function(id=null){
    try{
      const data={nama_client:document.querySelector('#cn')?.value,perusahaan:document.querySelector('#cp')?.value,telepon:document.querySelector('#ct')?.value,whatsapp:document.querySelector('#cw')?.value,email:document.querySelector('#ce')?.value,alamat:document.querySelector('#ca')?.value};
      await saveUnique(data,id);
      if(typeof load==='function')await load();if(typeof render==='function')render();
      if(typeof window.msg==='function')window.msg(id?'Client berhasil diperbarui.':'Client berhasil disimpan. Jika data kontak identik sudah ada, data lama digunakan.');
    }catch(e){console.error('Client dedupe save error:',e);if(typeof window.msg==='function')window.msg('Gagal menyimpan client: '+(e.message||e));}
  };
  // Hide exact duplicates already present in the loaded master list without deleting database rows.
  const originalClientsPage=window.clientsPage;
  window.clientsPage=function(){
    const original=window.clients;
    if(Array.isArray(original)){
      const seen=new Set();window.clients=original.filter(x=>{const k=key(x);if(seen.has(k))return false;seen.add(k);return true;});
    }
    try{return originalClientsPage?originalClientsPage.apply(this,arguments):undefined}finally{window.clients=original;}
  };
})();
