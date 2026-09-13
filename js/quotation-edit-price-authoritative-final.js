/* Priangan Multimedia — authoritative quotation edit loader.
 * Existing quotation prices remain authoritative; current Master Harga prices
 * must never overwrite a saved quotation-specific selling price.
 */
(function(){
'use strict';
if(window.__PM_QUOTATION_EDIT_PRICE_AUTHORITATIVE_V3)return;
window.__PM_QUOTATION_EDIT_PRICE_AUTHORITATIVE_V3=true;
const S=v=>String(v??'').trim();
const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');const n=Number(s);return Number.isFinite(n)?n:0};
const M=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Math.max(0,Math.round(N(v))));
const toast=m=>typeof window.msg==='function'?window.msg(m):console.warn('[PM]',m);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function DB(){try{if(window.__PM_STABLE_DB)return window.__PM_STABLE_DB}catch(_){}try{if(typeof db!=='undefined'&&db)return db}catch(_){}const c=window.PRIANGAN_CONFIG||{};return c.SUPABASE_URL&&c.SUPABASE_ANON_KEY&&window.supabase?.createClient?(window.__PM_STABLE_DB=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY)):null}
const masters=()=>Array.isArray(window.masters)?window.masters:[];
const days=(a,b)=>{if(!a||!b)return 1;const d=Math.round((new Date(S(b)+'T00:00:00')-new Date(S(a)+'T00:00:00'))/86400000);return d>=0?d+1:1};
const masterFor=i=>masters().find(m=>S(m.kode)===S(i.kode))||masters().find(m=>S(m.item).toLowerCase()===S(i.item).toLowerCase())||null;
const typeOf=i=>{const m=masterFor(i),sat=S(m?.satuan).toLowerCase().replace(/\s+/g,'');if(['unit','units','pcs','pc','buah','set'].includes(sat))return'qty';if(['m2','m²','meter2','meterpersegi','luas'].includes(sat))return'luas';const t=(S(i.item)+' '+S(m?.kategori)+' '+S(i.kode)).toLowerCase();if(/rigging|rig/.test(t))return'rigging';if(/level/.test(t))return'level';if(/led|videotron/.test(t))return'luas';return S(i.tipe||i.tipe_perhitungan)||'qty'};
const subtotal=(i,rows)=>{const p=N(i.harga??i.harga_jual),d=days(i.mulai??i.tanggal_mulai,i.selesai??i.tanggal_selesai),t=typeOf(i),q=Math.max(1,N(i.qty??i.jumlah)||1),w=N(i.lebar),h=N(i.tinggi),l=N(i.panjang);if(t==='luas')return w*h*p*d;if(t==='rigging')return((l*2)+(h*2))*p*d;if(t==='level'){const led=(rows||[]).find(x=>x!==i&&/led|videotron/i.test(S(x.item)+' '+S(x.kode)));return(led?N(led.lebar):w)*p*d}return q*p*d};
function calculate(rows){return (rows||[]).reduce((sum,row)=>sum+Math.max(0,subtotal(row,rows)),0)}
async function editQuotationAuthoritative(id){
 const d=DB();if(!d)return toast('Supabase belum terhubung.');
 try{
  const q=await d.from('penawaran').select('*').eq('id',id).maybeSingle();if(q.error)throw q.error;if(!q.data)throw new Error('Penawaran tidak ditemukan.');
  const r=await d.from('penawaran_items').select('*').eq('penawaran_id',id).order('id',{ascending:true});if(r.error)throw r.error;const rows=r.data||[];if(!rows.length)throw new Error('Penawaran belum memiliki item.');
  window.__pmEditingQuotationId=Number(id);window.__PM_EDIT_QUOTATION_ID=Number(id);window.__pmEditingQuotationNumber=S(q.data.nomor_penawaran||q.data.nomor||id);
  window.go('quotation');await wait(220);
  const loaded=rows.map(row=>({id:Date.now()+Math.random(),__savedItemId:row.id,kode:S(row.kode),item:S(row.item||row.nama_item),harga:N(row.harga_jual??row.harga),harga_jual:N(row.harga_jual??row.harga),qty:Math.max(1,N(row.qty??row.jumlah)||1),lebar:N(row.lebar),tinggi:N(row.tinggi),panjang:N(row.panjang),mulai:S(row.tanggal_mulai),selesai:S(row.tanggal_selesai),tipe:S(row.tipe_perhitungan||row.tipe||'qty').toLowerCase()||'qty'}));
  window.items=loaded;window.__pmItems=loaded;if(typeof window.drawItems==='function')window.drawItems();
  const set=(sel,val)=>{const e=document.querySelector(sel);if(e)e.value=val??''};
  set('#qc',q.data.nama_client);set('#qp',q.data.perusahaan);set('#qw',q.data.whatsapp||q.data.telepon);set('#qe',q.data.email);set('#qeve',q.data.nama_event||q.data.event_name||q.data.name_event||q.data.project);set('#qs',q.data.tanggal_mulai);set('#qe2',q.data.tanggal_selesai);
  await wait(80);
  const base=calculate(loaded);
  let savedRp=Math.max(0,N(q.data.diskon));
  let savedPct=Math.trunc(N(q.data.diskon_persen));
  if(savedPct<0||savedPct>100)savedPct=base?savedRp/base*100:0;
  if(!savedRp&&savedPct>0)savedRp=Math.round(base*savedPct/100);
  savedRp=Math.max(0,Math.min(base,savedRp));
  savedPct=base?Math.max(0,Math.min(100,Math.round(savedRp/base*100))):0;
  const p=document.querySelector('#pmDiscPct'),rp=document.querySelector('#pmDisc'),total=document.querySelector('#total'),grand=document.querySelector('#pmGrand');
  if(p)p.value=String(savedPct);if(rp)rp.value=M(savedRp);window.__PM_DISC_MODE='pct';window.__pmDiscountBase=base;window.__pmDiscountValue=savedRp;window.__pmDiscountPct=savedPct;window.__pmNetTotal=Math.max(0,base-savedRp);
  const net=Math.max(0,base-savedRp);if(total)total.textContent=M(net);if(grand)grand.textContent=M(net);
  window.dispatchEvent(new Event('pm:quotation-loaded'));await wait(40);toast('Edit '+window.__pmEditingQuotationNumber+' — harga dan diskon tersimpan digunakan.');
 }catch(e){window.__pmEditingQuotationId=null;window.__PM_EDIT_QUOTATION_ID=null;console.error('[PM] authoritative quotation edit',e);toast('Gagal membuka penawaran: '+(e.message||e))}
}
function install(){window.editQuotation=editQuotationAuthoritative}
[0,100,300,700,1200,2000,3000].forEach(ms=>setTimeout(install,ms));install();
})();
