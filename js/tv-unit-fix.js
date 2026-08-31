/* Priangan Multimedia — TV billing rule.
 * TV size in inches is a product specification. If the Master Harga item is a TV,
 * quotation/invoice calculation must use Qty. This patch intentionally avoids
 * wrapping window.pick() or using a MutationObserver, so it cannot create runtime loops.
 */
(function(){
  'use strict';
  function text(v){ return String(v == null ? '' : v).trim(); }
  function isTV(v){
    return /\b(?:LED\s*)?TV\b|\bTV[-_ ]?\d{2,3}\b/i.test(text(v));
  }
  function forceQty(card){
    if(!card) return;
    var sel=card.querySelector('select');
    var selected=sel && sel.selectedOptions && sel.selectedOptions[0];
    var productText=(selected ? selected.textContent : '')+' '+(sel ? sel.value : '');
    if(!isTV(productText)) return;
    var labels=Array.prototype.slice.call(card.querySelectorAll('label'));
    var label=labels.find(function(l){ return /tipe perhitungan/i.test(text(l.textContent)); });
    var field=label && label.closest('.field');
    var type=field && field.querySelector('select,input');
    if(type && text(type.value).toLowerCase() !== 'qty'){
      type.value='qty';
      type.dispatchEvent(new Event('input',{bubbles:true}));
      type.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }
  function invoiceTV(e){
    if(!e.target || e.target.id!=='pmxMaster') return;
    var opt=e.target.selectedOptions && e.target.selectedOptions[0];
    if(!isTV(opt ? opt.textContent : e.target.value)) return;
    var type=document.getElementById('pmxType');
    if(type && text(type.value).toLowerCase()!=='qty'){
      type.value='qty';
      type.dispatchEvent(new Event('input',{bubbles:true}));
      type.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }
  document.addEventListener('change',function(e){
    if(e.target && e.target.matches && e.target.matches('#items .item select')){
      setTimeout(function(){forceQty(e.target.closest('.item'));},0);
    }
    invoiceTV(e);
  },true);
})();