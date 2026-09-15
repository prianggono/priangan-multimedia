/* Priangan Multimedia — Final quotation save authority.
 * One save path. Database item values are the source of truth after insert.
 * LED = width x height x negotiated price x set x days.
 * Optional Level = LED width x saved level price x set (no days).
 * Item discount is applied per item; global discount is applied at quotation level.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_SAVE_FINAL__)return;
  window.__PM_QUOTATION_SAVE_FINAL__=true;
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0;};
  const I=v=>Math.max(0,Math.round(N(v)));
  const msg=t=>typeof window.msg==='function'?window.msg(t):console.warn('[PM]',t);
  const db=()=>window.db||window.__PM_STABLE_DB||null;
  const items=()=>Array.isArray(window.items)?window.items:[];
  const masters=()=>Array.isArray(window.masters)?window.masters:[];
  const core=()=>window.__PM_QUOTATION_CORE||{};
  const days=(a,b)=>{if(typeof core().days==='function')return Math.max(1,N(core().days(a,b)));if(!a||!b)return 1;const x=new Date(S(a)+'T00:00:00'),y=new Date(S(b)+'T00:00:00'),d=Math.round((y-x)/86400000);return d>=0?d+1:1;};
  const masterFor=i=>{const id=i?.master_id??i?.master_harga_id;if(id!=null){const m=masters().find(x=>String(x.id)===String(id));if(m)return m;}return masters().find(x=>S(x.kode)===S(i?.kode))||null;};
  const mode=i=>typeof core().typeOf==='function'?core().typeOf(i):S(i?.tipe||i?.tipe_perhitungan||'qty');
  const isLED=i=>{const m=masterFor(i),t=`${S(m?.item)} ${S(m?.kategori)} ${S(m?.kode)} ${S(i?.item)}`.toLowerCase();if(/led\s*tv|televisi|tv\s*[- ]?\d{2,3}\b/.test(t))return false;return /videotron|led\s*(indoor|outdoor)|\bled\s*p\.?\d/.test(t);};
  const baseCalc=i=>{
    const p=Math.max(0,N(i?.harga??i?.harga_jual)),q=Math.max(1,N(i?.qty??i?.jumlah)||1),d=days(i?.mulai??i?.tanggal_mulai,i?.selesai??i?.tanggal_selesai),t=S(mode(i)).toLowerCase();
    if(isLED(i)){
      const led=N(i.lebar)*N(i.tinggi)*p*q*d;
      const level=i.level_enabled&&N(i.level_harga)>0?N(i.lebar)*N(i.level_harga)*q:0;
      return Math.max(0,led+level);
    }
    if(t==='rigging')return Math.max(0,((N(i.panjang)*2)+(N(i.tinggi)*2))*p*d);
    if(t==='level')return 0;
    return Math.max(0,q*p*d);
  };
  const itemDisc=i=>{const b=baseCalc(i),pct=Math.max(0,Math.min(100,N(i.diskon_persen))),rp=pct>0?Math.min(b,Math.round(b*pct/100)):Math.min(b,Math.max(0,N(i.diskon_nominal)));return Math.min(b,rp);};
  const netCalc=i=>Math.max(0,baseCalc(i)-itemDisc(i));
  const complete=i=>{const t=S(mode(i)).toLowerCase();if(!S(i.kode)||!S(i.item)||!i.mulai||!i.selesai)return false;if(t==='luas')return N(i.lebar)>0&&N(i.tinggi)>0;if(t==='rigging')return N(i.panjang)>0&&N(i.tinggi)>0;return true;};
  async function removeChildren(id){const d=db();const old=await d.from('penawaran_items').select('id').eq('penawaran_id',Number(id));if(old.error)throw old.error;const ids=(old.data||[]).map(x=>x.id).filter(Boolean);if(ids.length){const j=await d.from('penawaran_jadwal').delete().in('item_id',ids);if(j.error)throw j.error;const j2=await d.from('penawaran_jadwal').delete().in('penawaran_item_id',ids);if(j2.error)throw j2.error;}const del=await d.from('penawaran_items').delete().eq('penawaran_id',Number(id));if(del.error)throw del.error;}
  async function save(){
    const d=db();if(!d)return msg('Supabase belum terhubung.');
    const q=s=>document.querySelector(s)?.value||'';
    const client=S(q('#qc')),company=S(q('#qp')),phone=S(q('#qw')),email=S(q('#qe')),eventName=S(q('#qeve')),start=q('#qs')||null,end=q('#qe2')||null;
    const source=items().filter(x=>x&&S(x.kode)&&S(x.item));
    if(!client||!company||!eventName)return msg('Client, Perusahaan, dan Nama Event wajib diisi.');
    if(!source.length)return msg('Tambahkan minimal 1 item.');
    const bad=source.filter(x=>!complete(x));if(bad.length)return msg(`Lengkapi data item: ${bad.map(x=>x.item||x.kode).join(', ')}.`);
    const button=[...document.querySelectorAll('#content button')].find(b=>S(b.textContent)==='Simpan Penawaran');
    if(button?.dataset.pmSaving==='1')return;
    if(button){button.dataset.pmSaving='1';button.disabled=true;button.dataset.originalText=button.textContent;button.textContent='Menyimpan...';}
    try{
      const editId=I(window.__pmEditingQuotationId||window.__PM_EDIT_QUOTATION_ID),number=S(window.__pmEditingQuotationNumber||window.__PM_EDIT_QUOTATION_NUMBER)||`PM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      const globalDisc=Math.max(0,N(window.__pmDiscountValue));
      const optimisticBase=source.reduce((s,x)=>s+baseCalc(x),0),optimisticItemDisc=source.reduce((s,x)=>s+itemDisc(x),0),optimisticSubtotal=Math.max(0,optimisticBase-optimisticItemDisc),optimisticTotal=Math.max(0,optimisticSubtotal-globalDisc);
      const optimisticPct=optimisticSubtotal?globalDisc/optimisticSubtotal*100:0;
      const payload={nomor_penawaran:number,nama_client:client,perusahaan:company,telepon_wa:phone,telepon:phone,whatsapp:phone,email,nama_event:eventName,event_name:eventName,tanggal_mulai:start,tanggal_selesai:end,subtotal:I(optimisticSubtotal),diskon:I(globalDisc),diskon_persen:optimisticPct,diskon_nominal:I(globalDisc),total:I(optimisticTotal),grand_total:I(optimisticTotal),status:'DRAFT'};
      let quoteId=editId||null;
      if(editId){const u=await d.from('penawaran').update(payload).eq('id',editId);if(u.error)throw u.error;await removeChildren(editId);}
      else{const ins=await d.from('penawaran').insert([payload]).select('id').single();if(ins.error)throw ins.error;quoteId=ins.data?.id;if(!quoteId)throw new Error('ID penawaran tidak ditemukan setelah penyimpanan.');}
      const rows=source.map(i=>({
        penawaran_id:quoteId,master_harga_id:masterFor(i)?.id??null,kode:i.kode,item:i.item,nama_item:i.item,harga_jual:I(i.harga),harga:I(i.harga),harga_modal:I(i.harga_modal)||0,
        tipe_perhitungan:mode(i),tipe:mode(i),qty:Math.max(1,N(i.qty)||1),jumlah:Math.max(1,N(i.qty)||1),lebar:N(i.lebar)||null,tinggi:N(i.tinggi)||null,panjang:N(i.panjang)||null,
        tanggal_mulai:i.mulai,tanggal_selesai:i.selesai,durasi:days(i.mulai,i.selesai),diskon_persen:Math.max(0,Math.min(100,N(i.diskon_persen))),diskon_nominal:I(itemDisc(i)),subtotal:I(netCalc(i)),
        level_enabled:!!i.level_enabled,level_master_harga_id:i.level_enabled&&i.level_master_harga_id?Number(i.level_master_harga_id):null,level_tinggi:i.level_enabled&&N(i.level_tinggi)>0?N(i.level_tinggi):null,level_harga:i.level_enabled&&N(i.level_harga)>0?N(i.level_harga):null,level_subtotal:i.level_enabled&&N(i.level_harga)>0?I(N(i.lebar)*N(i.level_harga)*Math.max(1,N(i.qty)||1)):0
      }));
      const insItems=await d.from('penawaran_items').insert(rows);if(insItems.error)throw insItems.error;
      const saved=await d.from('penawaran_items').select('id,subtotal,diskon_persen,diskon_nominal').eq('penawaran_id',quoteId).order('id',{ascending:true});if(saved.error)throw saved.error;
      const dbRows=saved.data||[];if(dbRows.length!==rows.length)throw new Error('Jumlah item yang tersimpan tidak sesuai.');
      const dbSubtotal=dbRows.reduce((s,r)=>s+N(r.subtotal),0),dbItemDisc=dbRows.reduce((s,r)=>s+N(r.diskon_nominal),0);
      const global=Math.min(dbSubtotal,globalDisc),dbPct=dbSubtotal?global/dbSubtotal*100:0,dbTotal=Math.max(0,dbSubtotal-global);
      const schedules=dbRows.map((r,i)=>{const it=source[i];return{item_id:r.id,penawaran_item_id:r.id,penawaran_id:quoteId,qty:Math.max(1,N(it.qty)||1),tanggal_mulai:it.mulai,tanggal_selesai:it.selesai,durasi:days(it.mulai,it.selesai),subtotal:I(netCalc(it))};});
      const sj=await d.from('penawaran_jadwal').insert(schedules);if(sj.error)throw sj.error;
      const syncPayload={subtotal:I(dbSubtotal),diskon:I(global),diskon_persen:dbPct,diskon_nominal:I(global),total:I(dbTotal),grand_total:I(dbTotal)};
      const su=await d.from('penawaran').update(syncPayload).eq('id',quoteId);if(su.error)throw su.error;
      const verify=await d.from('penawaran').select('id,subtotal,total,grand_total,diskon_nominal,diskon_persen').eq('id',quoteId).single();if(verify.error)throw verify.error;
      const v=verify.data||{};
      if(Math.round(N(v.subtotal))!==Math.round(dbSubtotal)||Math.round(N(v.total))!==Math.round(dbTotal)||Math.round(N(v.grand_total))!==Math.round(dbTotal))throw new Error(`Verifikasi total database gagal: DB subtotal ${I(v.subtotal)} / target ${I(dbSubtotal)}, DB total ${I(v.total)} / target ${I(dbTotal)}.`);
      window.__pmEditingQuotationId=null;window.__PM_EDIT_QUOTATION_ID=null;window.__pmEditingQuotationNumber=null;window.__PM_EDIT_QUOTATION_NUMBER=null;window.__PM_LAST_QUOTATION_NUMBER=number;window.items=[];
      msg((editId?'Penawaran berhasil diperbarui: ':'Penawaran berhasil disimpan: ')+number);
      if(typeof window.load==='function')await window.load();if(typeof window.go==='function')window.go('history');
    }catch(e){console.error('[PM] final quotation save',e);msg('Gagal menyimpan penawaran: '+(e.message||e));}
    finally{if(button){button.disabled=false;button.dataset.pmSaving='0';button.textContent=button.dataset.originalText||'Simpan Penawaran';}}
  }
  window.saveQuote=save;
  window.__PM_QUOTATION_SAVE_API={save,baseCalc,netCalc,itemDisc};
})();
