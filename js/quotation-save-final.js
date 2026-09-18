/* Priangan Multimedia — Quotation Repository / Save
 * Single quotation persistence authority.
 * All quotation header, client linkage, items and schedules are committed by Supabase RPC.
 * Master Harga is only the source for defaults; saved quotation values are independent snapshots.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_SAVE_REPOSITORY__) return;
  window.__PM_QUOTATION_SAVE_REPOSITORY__=true;

  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0;};
  const I=v=>Math.max(0,Math.round(N(v)));
  const msg=t=>typeof window.msg==='function'?window.msg(t):console.warn('[PM]',t);
  const DB=()=>window.db||window.__PM_STABLE_DB||null;
  const sourceItems=()=>Array.isArray(window.items)?window.items:[];
  const masters=()=>Array.isArray(window.masters)?window.masters:[];

  function masterFor(i){const id=i?.master_id??i?.master_harga_id;if(id!=null){const m=masters().find(x=>String(x.id)===String(id));if(m)return m;}return masters().find(x=>S(x.kode)===S(i?.kode))||null;}
  function typeOf(i){return S(i?.tipe_perhitungan||i?.tipe||'qty').toLowerCase()||'qty';}
  function days(a,b){if(typeof window.__PM_QUOTATION_CORE?.days==='function')return Math.max(1,N(window.__PM_QUOTATION_CORE.days(a,b)));if(!a||!b)return 1;const d=Math.round((new Date(S(b)+'T00:00:00')-new Date(S(a)+'T00:00:00'))/86400000);return d>=0?d+1:1;}
  function complete(i){if(!S(i.kode)||!S(i.item)||!i.mulai||!i.selesai)return false;const t=typeOf(i);if(t==='luas')return N(i.lebar)>0&&N(i.tinggi)>0;if(t==='rigging')return N(i.panjang)>0&&N(i.tinggi)>0;return true;}
  function readHeader(){const q=s=>document.querySelector(s)?.value||'';return{nama_client:S(q('#qc')),perusahaan:S(q('#qp')),telepon_wa:S(q('#qw')),telepon:S(q('#qw')),whatsapp:S(q('#qw')),email:S(q('#qe')),nama_event:S(q('#qeve')),event_name:S(q('#qeve')),event:S(q('#qeve')),tanggal_mulai:q('#qs')||'',tanggal_selesai:q('#qe2')||'',status:'DRAFT',nomor_penawaran:'',diskon:I(window.__pmDiscountValue)};}
  function readItems(){return sourceItems().filter(x=>x&&S(x.kode)&&S(x.item)).map(i=>{
    const base=Math.max(0,Math.round(N(window.__PM_QUOTATION_CORE?.itemSubtotal?.(i))));
    const pct=Math.max(0,Math.min(100,N(i.diskon_persen))),explicit=Math.max(0,N(i.diskon_nominal));
    const disc=pct>0?Math.min(base,Math.round(base*pct/100)):Math.min(base,Math.round(explicit));
    const net=Math.max(0,base-disc);
    return {master_harga_id:masterFor(i)?.id??i.master_harga_id??null,kode:S(i.kode),item:S(i.item),nama_item:S(i.item),kategori:S(i.kategori||masterFor(i)?.kategori),satuan:S(i.satuan||masterFor(i)?.satuan),harga:I(i.harga??i.harga_jual),harga_jual:I(i.harga_jual??i.harga),harga_modal:I(i.harga_modal??masterFor(i)?.harga_modal),tipe_perhitungan:typeOf(i).toUpperCase(),tipe:typeOf(i).toUpperCase(),qty:Math.max(1,N(i.qty??i.jumlah)||1),jumlah:Math.max(1,N(i.jumlah??i.qty)||1),durasi:days(i.mulai||i.tanggal_mulai,i.selesai||i.tanggal_selesai),lebar:N(i.lebar)||null,tinggi:N(i.tinggi)||null,panjang:N(i.panjang)||null,tanggal_mulai:S(i.mulai||i.tanggal_mulai),tanggal_selesai:S(i.selesai||i.tanggal_selesai),diskon_persen:pct,diskon_nominal:disc,subtotal:net,level_enabled:!!i.level_enabled,level_master_harga_id:i.level_enabled&&i.level_master_harga_id?Number(i.level_master_harga_id):null,level_tinggi:i.level_enabled&&N(i.level_tinggi)>0?N(i.level_tinggi):null,level_harga:i.level_enabled&&N(i.level_harga)>0?N(i.level_harga):null,level_subtotal:i.level_enabled&&N(i.level_harga)>0?I(N(i.lebar)*N(i.level_harga)*Math.max(1,N(i.qty)||1)):0};
  });}
  function readClient(h){return{nama_client:h.nama_client,perusahaan:h.perusahaan,telepon:h.telepon,whatsapp:h.whatsapp,email:h.email,alamat:S(document.querySelector('#qalamat')?.value)};}
  async function save(){const d=DB();if(!d)return msg('Supabase belum terhubung.');const header=readHeader();if(!header.nama_client||!header.perusahaan||!header.nama_event)return msg('Client, Perusahaan, dan Nama Event wajib diisi.');const rows=readItems();if(!rows.length)return msg('Tambahkan minimal 1 item.');const bad=sourceItems().filter(x=>x&&S(x.kode)&&S(x.item)&&!complete(x));if(bad.length)return msg(`Lengkapi data item: ${bad.map(x=>x.item||x.kode).join(', ')}.`);const button=[...document.querySelectorAll('#content button')].find(b=>S(b.textContent)==='Simpan Penawaran');if(button?.dataset.pmSaving==='1')return;if(button){button.dataset.pmSaving='1';button.disabled=true;button.dataset.originalText=button.textContent;button.textContent='Menyimpan...';}
    try{const editId=I(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID)||null;const result=await d.rpc('save_penawaran_atomic',{p_edit_id:editId,p_quote:header,p_client:readClient(header),p_items:rows});if(result.error)throw result.error;const quoteId=Number(result.data||0);if(!quoteId)throw new Error('Supabase tidak mengembalikan ID penawaran.');const verify=await d.from('penawaran').select('id,nomor_penawaran,client_id,subtotal,total,grand_total,diskon_nominal,status_pembayaran,revisi_penawaran').eq('id',quoteId).single();if(verify.error)throw verify.error;const q=verify.data||{};const itemsCheck=await d.from('penawaran_items').select('id,subtotal').eq('penawaran_id',quoteId);if(itemsCheck.error)throw itemsCheck.error;if((itemsCheck.data||[]).length!==rows.length)throw new Error('Verifikasi jumlah item gagal.');if(!q.client_id)throw new Error('Relasi client_id belum tersimpan.');const sum=(itemsCheck.data||[]).reduce((s,r)=>s+N(r.subtotal),0);if(Math.round(N(q.subtotal))!==Math.round(sum))throw new Error(`Verifikasi total gagal: subtotal header ${I(q.subtotal)} tidak sama dengan subtotal item ${I(sum)}.`);window.__pmEditingQuotationId=null;window.__PM_EDIT_QUOTATION_ID=null;window.__pmEditingQuotationNumber=null;window.__PM_EDIT_QUOTATION_NUMBER=null;window.__PM_LAST_QUOTATION_NUMBER=S(q.nomor_penawaran);window.__PM_LAST_QUOTATION_ID=quoteId;window.items=[];msg((editId?'Penawaran berhasil diperbarui: ':'Penawaran berhasil disimpan: ')+S(q.nomor_penawaran));if(typeof window.load==='function')await window.load();if(typeof window.go==='function')window.go('history');
    }catch(e){console.error('[PM] quotation repository save',e);msg('Gagal menyimpan penawaran: '+(e.message||e));}finally{if(button){button.disabled=false;button.dataset.pmSaving='0';button.textContent=button.dataset.originalText||'Simpan Penawaran';}}}
  window.saveQuote=save;window.__PM_QUOTATION_SAVE_API={save};
})();
