/* Priangan Multimedia — History quotation delete fix */
(function(){
'use strict';
if(window.__PM_HISTORY_DELETE_FIX_V1)return;
window.__PM_HISTORY_DELETE_FIX_V1=true;
function DB(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.db||window.__PM_STABLE_DB||window.__PRIANGAN_QUOTE_DB||null}
function notify(t){try{if(typeof window.msg==='function')window.msg(t);else alert(t)}catch(_){}
}
async function removeQuotation(id){
 const d=DB(); if(!d)throw Error('Supabase belum terhubung.');
 const qid=String(id);
 const ir=await d.from('penawaran_items').select('id').eq('penawaran_id',qid); if(ir.error)throw ir.error;
 const ids=(ir.data||[]).map(x=>x.id);
 const p=await d.from('pembayaran_penawaran').delete().eq('penawaran_id',qid); if(p.error)throw p.error;
 const s1=await d.from('penawaran_jadwal').delete().eq('penawaran_id',qid); if(s1.error)throw s1.error;
 if(ids.length){const s2=await d.from('penawaran_jadwal').delete().in('penawaran_item_id',ids);if(s2.error)throw s2.error;const s3=await d.from('penawaran_jadwal').delete().in('item_id',ids);if(s3.error)throw s3.error;}
 const i=await d.from('penawaran_items').delete().eq('penawaran_id',qid); if(i.error)throw i.error;
 const q=await d.from('penawaran').delete().eq('id',qid); if(q.error)throw q.error;
}
function getId(btn){
 const host=btn.closest('[data-id]'); if(host?.dataset?.id)return host.dataset.id;
 const s=btn.getAttribute('onclick')||'';
 let m=s.match(/(?:hapus|delete|remove)\s*\(\s*["']?([^"'\),\s]+)/i); if(m)return m[1];
 m=s.match(/["'](\d+)["']/); return m?m[1]:null;
}
document.addEventListener('click',async e=>{
 const btn=e.target?.closest?.('button,[role="button"]'); if(!btn)return;
 if(!/hapus|delete/i.test(btn.textContent||''))return;
 const title=(document.querySelector('#title')?.textContent||'').toLowerCase();
 if(!/riwayat|penawaran/.test(title))return;
 const id=getId(btn); if(!id||btn.dataset.pmDeleteRunning)return;
 e.preventDefault();e.stopImmediatePropagation();btn.dataset.pmDeleteRunning='1';
 try{
   if(!confirm('Hapus penawaran ini beserta item, jadwal, dan riwayat pembayarannya? Client dan Master Harga tidak akan dihapus.'))return;
   await removeQuotation(id);
   notify('Penawaran berhasil dihapus.');
   if(typeof window.go==='function')window.go('history');
   else if(typeof window.history==='function')window.history();
 }catch(err){console.error('[PM] history delete failed',err);notify('Gagal menghapus penawaran: '+(err?.message||err));}
 finally{delete btn.dataset.pmDeleteRunning}
},true);
})();
