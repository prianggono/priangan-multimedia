/* Per-quotation price editor — persist edited price to quotation state.
 * Changes only the current quotation item price in the form; master price is never updated.
 * The edited value is synchronized to window.items so the quotation save engine persists it.
 */
(function(){
  'use strict';
  const S=v=>String(v??'').trim();
  const N=v=>{
    if(typeof v==='number')return Number.isFinite(v)?v:0;
    const s=S(v).replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(?:\D|$))/g,'').replace(',','.');
    const n=Number(s);
    return Number.isFinite(n)?n:0;
  };
  const money=v=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(N(v));

  function getItems(){
    try{
      return Array.isArray(window.items)?window.items:[];
    }catch(_){return[]}
  }

  function syncPrice(input){
    const card=input?.closest?.('#items > .item');
    if(!card)return;
    const cards=Array.from(document.querySelectorAll('#items > .item'));
    const index=cards.indexOf(card);
    if(index<0)return;
    const a=getItems();
    const item=a[index];
    if(!item)return;

    const value=N(input.value);
    item.harga=value;
    item.harga_jual=value;
    input.dataset.quotePrice=String(value);
    input.dataset.masterPrice=input.dataset.masterPrice||String(value);

    // Keep the quotation total/subtotal synchronized without destroying the
    // currently edited input. The full redraw happens when the user presses
    // the price-editor "Simpan" button.
    const type=S(item.tipe).toLowerCase();
    const qty=Math.max(1,N(item.qty)||1);
    const days=(!item.mulai||!item.selesai)?1:Math.max(1,Math.round((new Date(S(item.selesai)+'T00:00:00')-new Date(S(item.mulai)+'T00:00:00'))/86400000)+1);
    let subtotal=qty*value*days;
    if(type==='luas')subtotal=N(item.lebar)*N(item.tinggi)*value*days;
    else if(type==='rigging')subtotal=((N(item.panjang)*2)+(N(item.tinggi)*2))*value*days;
    else if(type==='level'){
      const led=a.find(x=>x!==item&&/led|videotron/i.test(S(x.item)));
      subtotal=(led?N(led.lebar):N(item.lebar))*value*days;
    }
    const subtotalEl=card.querySelector('.sum b');
    if(subtotalEl)subtotalEl.textContent=money(subtotal);

    const base=a.filter(x=>S(x.kode)&&S(x.item)).reduce((sum,x)=>{
      const h=N(x.harga??x.harga_jual),q=Math.max(1,N(x.qty)||1),d=(!x.mulai||!x.selesai)?1:Math.max(1,Math.round((new Date(S(x.selesai)+'T00:00:00')-new Date(S(x.mulai)+'T00:00:00'))/86400000)+1);
      const t=S(x.tipe).toLowerCase();
      if(t==='luas')return sum+N(x.lebar)*N(x.tinggi)*h*d;
      if(t==='rigging')return sum+((N(x.panjang)*2)+(N(x.tinggi)*2))*h*d;
      if(t==='level'){
        const led=a.find(y=>y!==x&&/led|videotron/i.test(S(y.item)));
        return sum+(led?N(led.lebar):N(x.lebar))*h*d;
      }
      return sum+q*h*d;
    },0);
    const discount=N(document.querySelector('#pmDisc')?.value);
    const net=Math.max(0,base-discount);
    const total=document.querySelector('#total');
    const grand=document.querySelector('#pmGrand');
    if(total)total.textContent=money(net);
    if(grand)grand.textContent=money(net);
    window.__pmDiscountBase=base;
    window.__pmNetTotal=net;
  }

  function field(card){
    for(const f of card.querySelectorAll('.field')){
      const label=S(f.querySelector('label')?.textContent).toLowerCase();
      if(label.includes('harga jual')) return f.querySelector('input');
    }
    return null;
  }

  function enhance(){
    document.querySelectorAll('#items > .item').forEach(card=>{
      const input=field(card); if(!input || input.dataset.pmPriceEditor==='1') return;
      input.dataset.pmPriceEditor='1';
      input.dataset.masterPrice=input.value||'';
      input.readOnly=true;
      input.classList.add('pm-quote-price-readonly');
      const wrap=input.parentElement;
      if(wrap){
        wrap.style.position='relative';
        const b=document.createElement('button');
        b.type='button'; b.className='btn secondary pm-edit-price'; b.textContent='Edit';
        b.style.marginTop='6px'; b.style.fontSize='12px'; b.style.padding='5px 10px';
        b.addEventListener('click',e=>{
          e.preventDefault(); e.stopPropagation();
          const editing=input.readOnly;
          input.readOnly=!editing;
          b.textContent=input.readOnly?'Edit':'Simpan';
          b.classList.toggle('pm-price-editing',!input.readOnly);
          if(!input.readOnly){
            input.focus(); input.select();
          }else{
            // Commit the edited value to window.items before redrawing.
            syncPrice(input);
            input.dispatchEvent(new Event('change',{bubbles:true}));
            if(typeof window.drawItems==='function')window.drawItems();
          }
        });
        wrap.appendChild(b);
      }
      input.addEventListener('input',()=>syncPrice(input));
      input.addEventListener('change',()=>syncPrice(input));
    });
  }

  const style=document.createElement('style');
  style.textContent=`
    .pm-quote-price-readonly{background:rgba(255,255,255,.035)!important;cursor:default}
    .pm-edit-price{display:inline-flex!important;align-items:center;gap:5px}
    .pm-edit-price.pm-price-editing{border-color:rgba(77,141,255,.65)!important}
  `;
  document.head.appendChild(style);
  new MutationObserver(()=>requestAnimationFrame(enhance)).observe(document.body,{childList:true,subtree:true});
  requestAnimationFrame(enhance);
})();
