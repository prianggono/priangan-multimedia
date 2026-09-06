/* Priangan Multimedia — shared application state bridge.
 * app.js keeps core state in global lexical bindings (let db/items/masters/template).
 * Several legacy quotation layers read window.* instead. Expose live getters so
 * both sides always see the same objects instead of stale copies.
 */
(function(){
'use strict';
if(window.__PM_SHARED_STATE_BRIDGE_FINAL)return;
window.__PM_SHARED_STATE_BRIDGE_FINAL=true;
function bridge(name){
  try{
    const d=Object.getOwnPropertyDescriptor(window,name);
    if(d&&d.get&&d.set)return;
    Object.defineProperty(window,name,{configurable:true,enumerable:false,
      get:function(){try{return eval(name)}catch(_){return undefined}},
      set:function(v){try{eval(name+'=v')}catch(_){}
    }});
  }catch(e){console.warn('[PM] state bridge',name,e)}
}
['db','items','masters','clients','template'].forEach(bridge);
})();
