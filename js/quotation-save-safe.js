/* Priangan Multimedia — Safe quotation save
 * Single save path for quotation after per-item discount support.
 * Avoids INSERT ... SELECT return representations and persists item discounts
 * directly in penawaran_items.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_SAFE_SAVE__)return;
  window.__PM_QUOTATION_SAFE_SAVE__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);return Number.isFinite(n)?n:0;
  };
  const msg=t=>typeof window.msg==='function'?window.msg(t):console.warn('[PM]',t);
  const db=()=>window.db||window.__PM_STABLE_DB||null;
  const items=()=>Array.isArray(window.items)?window.items:[];
  const core=()=>window.__PM_QUOTATION_CORE||{};
  const days=(a,b)=>{
    if(!a||!b)return 1;
    const x=new Date(S(a)+'T00:00:00'),y=new Date(S(b)+'T00:00:00');
    const d=Math.round((y-x)/86400000);return d>=0?d+1:1;
  };
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const masterFor=item=>{
    const id=item?.master_id??item?.masterId??item?.id_master??item?.master_harga_id;
    return (id!=null&&masters().find(m=>String(m.id)===String(id)))||masters().find(m=>S(m.kode)===S(item?.kode))||null;
  };
  const typeOf=item=>core().typeOf?core().typeOf(item):S(item?.tipe||item?.tipe_perhitungan||'qty');
  const itemSubtotal=item=>core().itemSubtotal?N(core().itemSubtotal(item)):0;

  function complete(item){
    const t=typeOf(item);
    if(!S(item.kode)||!S(item.item)||!item.mulai||!item.selesai)return false;
    if(t==='luas')return N(item.lebar)>0&&N(item.tinggi)>0;
    if(t==='rigging')return N(item.panjang)>0&&N(item.tinggi)>0;
    return true;
  }

  async function removeChildren(d,id){
    const old=await d.from('penawaran_items').select('id').eq('penawaran_id',Number(id));
    if(old.error)throw old.error;
    const ids=(old.data||[]).map(x=>x.id).filter(Boolean);
    if(ids.length){const r=await d.from('penawaran_jadwal').delete().in('item_id',ids);if(r.error)throw r.error;}
    const del=await d.from('penawaran_items').delete().eq('penawaran_id',Number(id));
    if(del.error)throw del.error;
  }

  async function saveSafe(){
    const d=db();
    if(!d)return msg('Supabase belum terhubung.');
    const client=S(document.querySelector('#qc')?.value),company=S(document.querySelector('#qp')?.value),phone=S(document.querySelector('#qw')?.value),email=S(document.querySelector('#qe')?.value),eventName=S(document.querySelector('#qeve')?.value),start=document.querySelector('#qs')?.value||null,end=document.querySelector('#qe2')?.value||null;
    const source=items().filter(x=>x&&S(x.kode)&&S(x.item));
    if(!client||!company||!eventName)return msg('Client, Perusahaan, dan Nama Event wajib diisi.');
    if(!source.length)return msg('Tambahkan minimal 1 item.');
    const bad=source.filter(x=>!complete(x));
    if(bad.length)return msg(`Lengkapi data item: ${bad.map(x=>x.item||x.kode||'Item').join(', ')}.`);

    const button=[...document.querySelectorAll('#content button')].find(b=>S(b.textContent)==='Simpan Penawaran');
    if(button?.dataset.pmSaving==='1')return;
    if(button){button.dataset.pmSaving='1';button.disabled=true;button.dataset.originalText=button.textContent;button.textContent='Menyimpan...';}
    try{
      if(core().sync)core().sync();
      const editId=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID),number=S(window.__pmEditingQuotationNumber||window.__PM_EDIT_QUOTATION_NUMBER)||`PM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const base=source.reduce((sum,x)=>sum+itemSubtotal(x),0);
      const globalDisc=Math.max(0,N(window.__pmDiscountValue));
      const globalPct=base?globalDisc/base*100:0;
      const net=Math.max(0,base-globalDisc);
      const payload={nomor_penawaran:number,nama_client:client,perusahaan:company,telepon_wa:phone,telepon:phone,whatsapp:phone,email,nama_event:eventName,event_name:eventName,tanggal_mulai:start,tanggal_selesai:end,subtotal:base,diskon:globalDisc,diskon_persen:globalPct,diskon_nominal:globalDisc,total:net,grand_total:net,status:'DRAFT'};
      let quoteId=editId||null;
      if(editId){
        const upd=await d.from('penawaran').update(payload).eq('id',editId);
        if(upd.error)throw upd.error;
        await removeChildren(d,editId);
      }else{
        const ins=await d.from('penawaran').insert([payload]);
        if(ins.error)throw ins.error;
        const q=await d.from('penawaran').select('id').eq('nomor_penawaran',number).single();
        if(q.error)throw q.error;
        quoteId=q.data.id;
      }

      const itemPayload=source.map(item=>({
        penawaran_id:quoteId,
        master_harga_id:masterFor(item)?.id??null,
        kode:item.kode,item:item.item,nama_item:item.item,
        harga_jual:N(item.harga),harga:N(item.harga),harga_modal:N(item.harga_modal)||0,
        tipe_perhitungan:typeOf(item),tipe:typeOf(item),
        qty:Math.max(1,N(item.qty)||1),jumlah:Math.max(1,N(item.qty)||1),
        lebar:N(item.lebar)||null,tinggi:N(item.tinggi)||null,panjang:N(item.panjang)||null,
        tanggal_mulai:item.mulai,tanggal_selesai:item.selesai,durasi:days(item.mulai,item.selesai),
        subtotal:itemSubtotal(item),
        diskon_persen:Math.max(0,Math.min(100,N(item.diskon_persen))),
        diskon_nominal:Math.max(0,N(item.diskon_nominal))
      }));
      const insItems=await d.from('penawaran_items').insert(itemPayload);
      if(insItems.error)throw insItems.error;
      const saved=await d.from('penawaran_items').select('id').eq('penawaran_id',quoteId).order('id',{ascending:true});
      if(saved.error)throw saved.error;
      const rows=saved.data||[];
      if(rows.length!==source.length)throw new Error('Jumlah item tersimpan tidak sesuai.');
      const schedules=rows.map((row,index)=>{const item=source[index];const dur=days(item.mulai,item.selesai);return{item_id:row.id,penawaran_item_id:row.id,penawaran_id:quoteId,qty:Math.max(1,N(item.qty)||1),tanggal_mulai:item.mulai,tanggal_selesai:item.selesai,durasi_hari:dur,durasi:dur,subtotal:itemSubtotal(item)};});
      const sched=await d.from('penawaran_jadwal').insert(schedules);
      if(sched.error)throw sched.error;

      const check=await d.from('penawaran_items').select('id,subtotal,diskon_persen,diskon_nominal').eq('penawaran_id',quoteId);
      if(check.error)throw check.error;
      const savedSubtotal=(check.data||[]).reduce((s,r)=>s+N(r.subtotal),0);
      if(Math.round(savedSubtotal)!==Math.round(base))throw new Error('Verifikasi subtotal item gagal.');
      const verify=await d.from('penawaran').select('id,subtotal,diskon,diskon_persen,diskon_nominal,total,grand_total').eq('id',quoteId).single();
      if(verify.error)throw verify.error;
      const v=verify.data||{};
      if(Math.round(N(v.subtotal))!==Math.round(base)||Math.round(N(v.total))!==Math.round(net)||Math.round(N(v.grand_total))!==Math.round(net))throw new Error('Verifikasi total database gagal.');

      window.__pmEditingQuotationId=null;window.__PM_EDIT_QUOTATION_ID=null;window.__pmEditingQuotationNumber=null;window.__PM_EDIT_QUOTATION_NUMBER=null;window.__PM_LAST_QUOTATION_NUMBER=number;window.items=[];
      msg((editId?'Penawaran berhasil diperbarui: ':'Penawaran berhasil disimpan: ')+number);
      if(typeof window.load==='function')await window.load();
      if(typeof window.go==='function')window.go('history');
    }catch(e){console.error('[PM] quotation safe save',e);msg('Gagal menyimpan penawaran: '+(e.message||e));}
    finally{if(button){button.disabled=false;button.dataset.pmSaving='0';button.textContent=button.dataset.originalText||'Simpan Penawaran';}}
  }

  function install(){
    const current=window.saveQuote;
    if(typeof current!=='function')return false;
    if(current.__pmSafeSave)return true;
    saveSafe.__pmSafeSave=true;
    window.saveQuote=saveSafe;
    return true;
  }
  [0,200,500,1000,1800].forEach(ms=>setTimeout(install,ms));
  window.addEventListener('load',install);
  window.__PM_QUOTATION_SAFE_SAVE_API={saveSafe};
})();
