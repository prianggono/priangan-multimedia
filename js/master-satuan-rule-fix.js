/* Priangan Multimedia — Master Harga satuan is the source of truth for unit billing.
 * Only an explicit Master Harga satuan of unit/pcs/buah/set forces Qty.
 * Other calculation rules are left untouched.
 */
(function(){
  'use strict';
  const S=v=>String(v??'').trim().toLowerCase();
  const isUnit=v=>['unit','units','pcs','pc','buah','set'].includes(S(v));
  let busy=false;

  function getDb(){
    if(window.db) return window.db;
    const c=window.PRIANGAN_CONFIG||{};
    const url=(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL||'').trim();
    const key=(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY||'').trim();
    if(!url||!key||!window.supabase?.createClient) return null;
    window.__PM_MASTER_RULE_DB ||= window.supabase.createClient(url,key);
    return window.__PM_MASTER_RULE_DB;
  }

  async function applyFromMaster(card){
    if(!card||busy)return;
    const select=card.querySelector('select');
    const code=select?.value;
    if(!code)return;
    const db=getDb();
    if(!db)return;
    busy=true;
    try{
      const result=await db.from('master_harga').select('satuan').eq('kode',code).maybeSingle();
      if(result.error || !isUnit(result.data?.satuan))return;
      const fields=[...card.querySelectorAll('.field')];
      const typeField=fields.find(f=>/tipe perhitungan/i.test(S(f.querySelector('label')?.textContent)));
      const type=typeField?.querySelector('select,input');
      if(type && S(type.value)!=='qty'){
        type.value='qty';
        type.dispatchEvent(new Event('input',{bubbles:true}));
        type.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }finally{busy=false;}
  }

  document.addEventListener('change',e=>{
    if(!e.target.matches('#items .item select'))return;
    applyFromMaster(e.target.closest('.item'));
  },true);
})();