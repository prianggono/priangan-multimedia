/* Priangan Multimedia — quotation save authoritative final v1
 * Ensures the values visible in the quotation form are persisted to penawaran.
 * Loaded before quotation-save-button-final.js so its wrapper runs first.
 */
(function(){
  'use strict';
  if(window.__PM_QUOTATION_SAVE_AUTHORITATIVE_FINAL_V1)return;
  window.__PM_QUOTATION_SAVE_AUTHORITATIVE_FINAL_V1=true;
  const S=v=>String(v??'').trim();
  const N=v=>{if(typeof v==='number')return Number.isFinite(v)?v:0;const s=S(v).replace(/[^0-9,.-]/g,'');if(!s)return 0;const n=Number(s.replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0};
  function rows(){return Array.isArray(window.items)?window.items:[]}
  function days(a,b){if(!a||!b)return 1;const d=Math.round((new Date(S(b)+'T00:00:00')-new Date(S(a)+'T00:00:00'))/86400000);return d>=0?d+1:1}
  function subtotal(i){const p=N(i?.harga??i?.harga_jual),d=days(i?.mulai??i?.tanggal_mulai,i?.selesai??i?.tanggal_selesai),q=Math.max(1,N(i?.qty??i?.jumlah)||1),w=N(i?.lebar),h=N(i?.tinggi),l=N(i?.panjang),t=S(i?.tipe||i?.tipe_perhitungan).toLowerCase(),text=(S(i?.item)+' '+S(i?.kode)).toLowerCase();if(t==='rigging'||/rigging|rig/.test(text))return((l*2)+(h*2))*p*d;if(t==='level'||/level/.test(text)){const led=rows().find(x=>x!==i&&/led|videotron/i.test(S(x?.item)+' '+S(x?.kode)));return(led?N(led.lebar):w)*h*p*d}if(t==='luas'||/led|videotron/.test(text))return w*h*p*d;return q*p*d}
  function snapshot(){const base=rows().filter(i=>i&&S(i.kode)&&S(i.item)).reduce((s,i)=>s+subtotal(i),0),pct=Math.max(0,Math.min(100,N(document.querySelector('#pmDiscPct')?.value))),nominal=Math.max(0,Math.min(base,Math.round(base*pct/100)));return{base,pct,nominal,total:Math.max(0,base-nominal)}}
  function dbClient(){try{if(typeof db!=='undefined'&&db)return db}catch(_){}return window.__PM_STABLE_DB||window.__PRIANGAN_QUOTE_DB||window.__PRIANGAN_EDIT_DB||null}
  function install(){if(typeof window.saveQuote!=='function'||window.saveQuote.__pmAuthoritativeFinal)return false;const original=window.saveQuote;const wrapped=async function(){const state=snapshot(),client=S(document.querySelector('#qc')?.value),eventName=S(document.querySelector('#qeve')?.value),started=Date.now();const result=await original.apply(this,arguments);const d=dbClient();if(d&&state.base>0){try{const recent=await d.from('penawaran').select('id,nomor_penawaran,nama_client,event_name,created_at').eq('nama_client',client).eq('event_name',eventName).order('id',{ascending:false}).limit(5);const list=recent.data||[];const target=list.find(r=>{const ts=Date.parse(S(r.created_at));return !Number.isFinite(ts)||ts>=started-15000})||list[0];if(target?.id){const fix=await d.from('penawaran').update({subtotal:state.base,diskon:state.nominal,diskon_persen:state.pct,diskon_nominal:state.nominal,total:state.total,grand_total:state.total}).eq('id',target.id);if(fix.error)throw fix.error}}catch(err){console.error('[PM] authoritative quotation persistence:',err)}}return result};wrapped.__pmAuthoritativeFinal=true;window.saveQuote=wrapped;return true}
  install();[50,100,200,400,800,1500,3000].forEach(ms=>setTimeout(install,ms));
})();
