/* Accept Indonesian decimal input (1,5) for LED Level height. */
(function(){
  'use strict';
  if(window.__PM_LEVEL_DECIMAL_INPUT__) return;
  window.__PM_LEVEL_DECIMAL_INPUT__ = true;
  function activate(input){
    if(!input || !input.matches('.pm-led-level-height')) return;
    if(input.type !== 'text') input.type = 'text';
    input.inputMode = 'decimal';
    input.setAttribute('autocomplete','off');
    input.setAttribute('pattern','[0-9]*[.,]?[0-9]*');
  }
  document.addEventListener('focusin', function(e){ activate(e.target); }, true);
  document.addEventListener('click', function(e){ activate(e.target); }, true);
  document.addEventListener('input', function(e){
    const input=e.target;
    if(!input?.matches?.('.pm-led-level-height')) return;
    activate(input);
    const raw=String(input.value??'');
    const normalized=raw.replace(/[^0-9.,]/g,'');
    const parts=normalized.split(/[.,]/);
    if(parts.length>2){
      input.value=parts.shift()+','+parts.join('');
      return;
    }
    if(raw!==input.value) input.value=normalized;
  }, true);
  document.addEventListener('keydown', function(e){
    const input=e.target;
    if(!input?.matches?.('.pm-led-level-height')) return;
    activate(input);
    if(e.key==='.') {
      e.preventDefault();
      const s=input.value;
      if(!/[.,]/.test(s)){
        const start=input.selectionStart ?? s.length;
        const end=input.selectionEnd ?? start;
        input.setRangeText(',',start,end,'end');
        input.dispatchEvent(new Event('input',{bubbles:true}));
      }
    }
  }, true);
})();
