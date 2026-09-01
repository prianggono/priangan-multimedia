(function(){'use strict';
const renderHistory=()=>typeof window.renderHistory==='function'?window.renderHistory():undefined;
const originalGo=window.go;
window.go=function(target){
  if(target==='history') return renderHistory();
  return typeof originalGo==='function'?originalGo.apply(this,arguments):undefined;
};
document.addEventListener('click',function(e){
  const b=e.target.closest?.('.nav[data-p="history"]');
  if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x===b));
  renderHistory();
},true);
window.__PM_INTEGRITY_ROUTING='2026-09-01-v1';
})();
