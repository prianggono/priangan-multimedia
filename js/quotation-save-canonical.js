/* Priangan Multimedia — Canonical quotation save
 * item.harga = negotiated quotation price.
 * item discount is stored separately and applied to item subtotal.
 * No generated database columns are sent by the client.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_SAVE_CANONICAL__) return;
  window.__PM_QUOTATION_SAVE_CANONICAL__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s); return Number.isFinite(n)?n:0;
  };
  const msg=t=>typeof window.msg==='function'?window.msg(t):console.warn('[PM]',t);
  const db=()=>window.db||window.__PM_STABLE_DB||null;
  const items=()=>Array.isArray(window.items)?window.items:[];
  const core=()=>window.__PM_QUOTATION_CORE||{};
  const days=(a,b)=>{if(!a||!b)return 1;const x=new Date(S(a)+'T00:00:00'),y=new Date(S(b)+'T00:00:00');const d=Math.round((y-x)/86400000);return d>=0?d+1:1;};
  const itemRawSubtotal=item=>core().itemSubtotal?Math.max(0,N(core().itemSubtotal(item))):0;
  const itemDiscount=item=>{const base=itemRawSubtotal(item);const pct=Math.max(0,Math.min(100,N(item.diskon_persen)));let nom=N(item.diskon_nominal);if(pct>0)nom=Math.round(base*pct/100);return Math.min(base,Math.max(0,nom));};
  const itemNetSubtotal=item=>Math.max(0,itemRawSubtotal(item)-itemDiscount(item));
  const masterFor=item=>{const ms=Array.isArray(window.masters)?window.masters:[];const id=item?.master_id??item?.masterId??item?.id_master??item?.master_harga_id;return (id!=null&&ms.find(m=>String(m.id)===String(id)))||ms.find(m=>S(m.kode)===S(item?.kode))||null;};
  const complete=item=>{const t=S(item?.tipe||item?.tipe_perhitungan||'qty').toLowerCase();if(!S(item?.kode)||!S(item?.item)||!item?.mulai||!item?.selesai)return false;if(t==='luas')return N(item.lebar)>0&&N(item.tinggi)>0;if(t==='rigging')return N(item.panjang)>0&&N(item.tinggi)>0;return true;};

  async function removeChildren(id){
    const d=db();
    const old=await d.from('penawaran_items').select('id').eq('penawaran_id',Number(id));
    if(old.error)throw old.error;
    const ids=(old.data||[]).map(x=>x.id).filter(Boolean);
    if(ids.length){const r=await d.from('penawaran_jadwal').delete().in('item_id',ids);if(r.error)throw r.error;const r2=await d.from('penawaran_jadwal').delete().in('penawaran_item_id',ids);if(r2.error)throw r2.error;}
    const d2=await d.from('penawaran_items').delete().eq('penawaran_id',Number(id));if(d2.error)throw d2.error;
  }

  async function save(){
    const d=db();if(!d)return msg('Supabase belum terhubung.');
    const q=(id)=>document.querySelector(id)?.value||'';
    const client=S(q('#qc')),company=S(q('#qp')),phone=S(q('#qw')),email=S(q('#qe')),eventName=S(q('#qeve')),start=q('#qs')||null,end=q('#qe2')||null;
    const source=items().filter(x=>x&&S(x.kode)&&S(x.item));
    if(!client||!company||!eventName)return msg('Client, Perusahaan, dan Nama Event wajib diisi.');
    const bad=source.filter(x=>!complete(x));if(bad.length)return msg(`Lengkapi data item: ${bad.map(x=>x.item||x.kode).join(', ')}.`);
    const button=[...document.querySelectorAll('#content button')].find(b=>S(b.textContent)==='Simpan Penawaran');
    if(button?.dataset.pmSaving==='1')return;
    if(button){button.dataset.pmSaving='1';button.disabled=true;button.dataset.originalText=button.textContent;button.textContent='Menyimpan...';}
    try{
      const base=source.reduce((s,x)=>s+itemNetSubtotal(x),0);
      const global=Math.max(0,N(window.__pmDiscountValue));
      const total=Math.max(0,base-global);
      const editId=N(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID);
      const number=S(window.__pmEditingQuotationNumber||window.__PM_EDIT_QUOTATION_NUMBER)||`PM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const payload={nomor_penawaran:number,nama_client:client,perusahaan:company,telepon_wa:phone,telepon:phone,whatsapp:phone,email,nama_event:eventName,event_name:eventName,tanggal_mulai:start,tanggal_selesai:end,subtotal:base,diskon:global,diskon_persen:base?global/base*100:0,diskon_nominal:global,total,grand_total:total,status:'DRAFT'};
      let quoteId=editId||null;
      if(editId){const u=await d.from('penawaran').update(payload).eq('id',editId);if(u.error)throw u.error;await removeChildren(editId);}
      else{const ins=await d.from('penawaran').insert([payload]);if(ins.error)throw ins.error;const qr=await d.from('penawaran').select('id').eq('nomor_penawaran',number).maybeSingle();if(qr.error)throw qr.error;if(!qr.data?.id)throw new Error('ID penawaran tidak ditemukan setelah penyimpanan.');quoteId=qr.data.id;}

      const rows=source.map(item=>({
        penawaran_id:quoteId,master_harga_id:masterFor(item)?.id??null,kode:item.kode,item:item.item,nama_item:item.item,
        harga_jual:N(item.harga),harga:N(item.harga),harga_modal:N(item.harga_modal)||0,tipe_perhitungan:S(item.tipe_perhitungan||item.tipe||'qty'),tipe:S(item.tipe||item.tipe_perhitungan||'qty'),qty:Math.max(1,N(item.qty)||1),jumlah:Math.max(1,N(item.qty)||1),lebar:N(item.lebar)||null,tinggi:N(item.tinggi)||null,panjang:N(item.panjang)||null,tanggal_mulai:item.mulai,tanggal_selesai:item.selesai,durasi:days(item.mulai,item.selesai),subtotal:itemNetSubtotal(item),diskon_persen:Math.max(0,Math.min(100,N(item.diskon_persen))),diskon_nominal:itemDiscount(item)
      }));
      const insItems=await d.from('penawaran_items').insert(rows);if(insItems.error)throw insItems.error;
      const saved=await d.from('penawaran_items').select('id').eq('penawaran_id',quoteId).order('id',{ascending:true});if(saved.error)throw saved.error;
      const ids=saved.data||[];if(ids.length!==rows.length)throw new Error('Jumlah item tersimpan tidak sesuai.');
      const schedules=ids.map((r,i)=>{const item=source[i],duration=days(item.mulai,item.selesai);return{item_id:r.id,penawaran_item_id:r.id,penawaran_id:quoteId,qty:Math.max(1,N(item.qty)||1),tanggal_mulai:item.mulai,tanggal_selesai:item.selesai,durasi:duration,subtotal:itemNetSubtotal(item)};});
      const sj=await d.from('penawaran_jadwal').insert(schedules);if(sj.error)throw sj.error;
      const vr=await d.from('penawaran').select('id,subtotal,total,grand_total,diskon_nominal').eq('id',quoteId).single();if(vr.error)throw vr.error;
      const v=vr.data||{};
      if(Math.round(N(v.subtotal))!==Math.round(base)||Math.round(N(v.total))!==Math.round(total)||Math.round(N(v.grand_total))!==Math.round(total))throw new Error('Verifikasi total database gagal.');
      window.__pmEditingQuotationId=null;window.__PM_EDIT_QUOTATION_ID=null;window.__pmEditingQuotationNumber=null;window.__PM_EDIT_QUOTATION_NUMBER=null;window.__PM_LAST_QUOTATION_NUMBER=number;window.items=[];
      msg((editId?'Penawaran berhasil diperbarui: ':'Penawaran berhasil disimpan: ')+number);
      if(typeof window.load==='function')await window.load();if(typeof window.go==='function')window.go('history');
    }catch(e){console.error('[PM] canonical quotation save',e);msg('Gagal menyimpan penawaran: '+(e.message||e));}
    finally{if(button){button.disabled=false;button.dataset.pmSaving='0';button.textContent=button.dataset.originalText||'Simpan Penawaran';}}
  }

  function install(){if(typeof window.saveQuote!=='function'||window.saveQuote===save)return;save.__pmCanonicalSave=true;window.saveQuote=save;return true;}
  install();window.addEventListener('load',install);[0,150,400,900,1500].forEach(ms=>setTimeout(install,ms));
  window.__PM_QUOTATION_SAVE_API={save};
})();
