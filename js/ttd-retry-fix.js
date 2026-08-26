/* TTD final retry: resolve template signature from Supabase Storage and inject it into A4 preview. */
(function(){
  'use strict';

  const S = (v) => String(v ?? '').trim();

  function DB(){
    if(typeof db !== 'undefined' && db) return db;
    const c=window.PRIANGAN_CONFIG||{};
    const u=S(localStorage.getItem('SUPABASE_URL')||c.SUPABASE_URL);
    const k=S(localStorage.getItem('SUPABASE_ANON_KEY')||c.SUPABASE_ANON_KEY);
    return u&&k&&window.supabase?.createClient ? window.supabase.createClient(u,k) : null;
  }

  async function template(){
    const d=DB();
    if(!d) return {};
    const r=await d.from('template_surat').select('*').order('id',{ascending:false}).limit(1).maybeSingle();
    if(!r.error&&r.data) return r.data;
    try{return JSON.parse(localStorage.getItem('PRIANGAN_TEMPLATE_BACKUP')||'{}')}catch(_){return{}}
  }

  function storageCandidates(raw){
    const value=S(raw);
    if(!value) return [];
    const out=[];
    const parts=value.split('/').filter(Boolean);
    if(parts.length>1) out.push([parts[0],parts.slice(1).join('/')]);

    const match=value.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/i);
    if(match) out.push([decodeURIComponent(match[1]),decodeURIComponent(match[2])]);

    ['surat-assets','templates','assets'].forEach(bucket=>out.push([bucket,value]));
    return out.filter((pair,index,self)=>index===self.findIndex(x=>x[0]===pair[0]&&x[1]===pair[1]));
  }

  async function url(v){
    const raw=S(v);
    if(!raw)return '';
    if(/^(data:|blob:)/i.test(raw))return raw;
    const d=DB();
    if(!d)return raw;

    for(const [bucket,path] of storageCandidates(raw)){
      try{
        const signed=await d.storage.from(bucket).createSignedUrl(path,3600);
        if(!signed.error&&signed.data?.signedUrl)return signed.data.signedUrl;
      }catch(_){}
      try{
        const pub=d.storage.from(bucket).getPublicUrl(path);
        if(pub?.data?.publicUrl)return pub.data.publicUrl;
      }catch(_){}
    }
    return raw;
  }

  async function apply(){
    const o=document.getElementById('pmPrintPreview');
    if(!o)return;
    const t=await template();
    const u=await url(t.ttd_url);
    if(!u)return;

    let box=o.querySelector('.pm-signature-box');
    if(!box)box=o.querySelector('.pm-signature');
    if(!box)return;

    let img=box.querySelector('img.signature');
    if(!img){
      img=document.createElement('img');
      img.className='signature';
      img.alt='Tanda tangan';
      const line=box.querySelector('.pm-signature-line');
      box.insertBefore(img,line||box.firstChild);
    }

    img.style.display='block';
    img.style.visibility='visible';
    img.style.opacity='1';
    img.src=u;
    img.onerror=()=>console.warn('TTD URL tidak dapat dimuat:',u);

    const name=box.querySelector('strong');
    const role=box.querySelector('.pm-signature-role');
    if(name)name.textContent=S(t.nama_penandatangan)||name.textContent;
    if(role)role.textContent=S(t.jabatan_penandatangan)||role.textContent;
  }

  let timer=null;
  const observer=new MutationObserver(()=>{
    if(document.getElementById('pmPrintPreview')){
      clearTimeout(timer);
      timer=setTimeout(apply,120);
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.pmRetryTTD=apply;
})();
