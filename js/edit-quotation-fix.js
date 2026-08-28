/* Reliable quotation edit loader: rebuild saved items through app.addItem/pick so the real lexical items array is populated. */
(function(){
'use strict';
const S=v=>String(v??'').trim(),N=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
const toast=m=>typeof window.msg==='function'?window.msg(m):alert(m);
function DB(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}const c=window.PRIANGAN_CONFIG||{},u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL),k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);if(!u||!k||!window.supabase?.createClient)return null;window.__PRIANGAN_EDIT_DB ||= window.supabase.createClient(u,k);return window.__PRIANGAN_EDIT_DB}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function setVal(sel,val){const e=document.querySelector(sel);if(!e)return;e.value=val??'';e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}))}
function itemIdFromCard(card){const s=card?.querySelector('button[onclick^="removeItem("]')?.getAttribute('onclick')||'';const m=s.match(/removeItem\(([^)]+)\)/);return m?Number(m[1]):null}
function fieldInput(card,label){const f=[...card.querySelectorAll('.field')].find(x=>S(x.querySelector('label')?.textContent).toLowerCase().includes(label.toLowerCase()));return f?.querySelector('input')||null}
async function editQuotationFixed(id){
 const d=DB();if(!d)return toast('Supabase belum terhubung.');
 try{
  const q=await d.from('penawaran').select('*').eq('id',id).single();if(q.error)throw q.error;
  const r=await d.from('penawaran_items').select('*').eq('penawaran_id',id).order('id',{ascending:true});if(r.error)throw r.error;
  const row=q.data||{},saved=r.data||[];if(!saved.length)throw new Error('Penawaran ini belum memiliki item.');
  if(typeof window.go!=='function')throw new Error('Navigasi penawaran tidak tersedia.');
  window.go('quotation');await wait(100);
  setVal('#qc',row.nama_client);setVal('#qp',row.perusahaan);setVal('#qw',row.whatsapp||row.telepon);setVal('#qe',row.email);setVal('#qeve',row.nama_event||row.event_name||row.event||row.project);setVal('#qs',row.tanggal_mulai);setVal('#qe2',row.tanggal_selesai);
  /* quotationPage() creates a blank item only when the lexical items array is empty. Remove that real item before rebuilding. */
  const blank=document.querySelector('#items .item');const blankId=itemIdFromCard(blank);if(blankId&&typeof window.removeItem==='function')window.removeItem(blankId);else if(typeof window.removeItem==='function'){
    /* If the DOM was cleared by another fix, force the app to redraw from its own state. */
  }
  for(const savedItem of saved){
    if(typeof window.addItem!=='function'||typeof window.pick!=='function')throw new Error('Fungsi item penawaran tidak tersedia.');
    window.addItem();await wait(0);
    let cards=[...document.querySelectorAll('#items .item')],card=cards[cards.length-1],select=card?.querySelector('select');
    if(!select)throw new Error('Form item tidak dapat dimuat.');
    const code=S(savedItem.kode);select.value=code;select.dispatchEvent(new Event('change',{bubbles:true}));
    const id=itemIdFromCard(card);if(id&&code)window.pick(id,code);await wait(0);
    card=[...document.querySelectorAll('#items .item')].at(-1);const itemId=itemIdFromCard(card);if(!itemId)continue;
    const set=(label,value)=>{const inp=fieldInput(card,label);if(inp&&value!==undefined&&value!==null&&value!==''){inp.value=value;inp.dispatchEvent(new Event('change',{bubbles:true}))}};
    set('Lebar Videotron',N(savedItem.lebar));set('Tinggi Videotron',N(savedItem.tinggi));set('Tinggi Level',N(savedItem.tinggi));set('Panjang Rigging',N(savedItem.panjang));set('Tinggi Rigging',N(savedItem.tinggi));set('Jumlah (Qty)',N(savedItem.qty)||1);
    const start=fieldInput(card,'Tanggal Mulai'),end=fieldInput(card,'Tanggal Selesai');if(start){start.value=S(savedItem.tanggal_mulai);start.dispatchEvent(new Event('change',{bubbles:true}))}if(end){end.value=S(savedItem.tanggal_selesai);end.dispatchEvent(new Event('change',{bubbles:true}))}
  }
  toast(`Mode edit aktif: ${S(row.nomor_penawaran||row.nomor||id)} — ${saved.length} item dimuat.`);
 }catch(e){console.error('Edit quotation fix:',e);toast('Gagal membuka penawaran: '+(e.message||e))}
}
window.editQuotation=editQuotationFixed;window.__PRIANGAN_EDIT_QUOTATION_FIXED=true;
})();
