/* One adaptive rain curve for every session. */
(function(root){
  'use strict';
  const rain=Object.freeze({hearts:3,fallSeconds:10,rampSeconds:60,maxMultiplier:3.5,gap:2400,minGap:750,maxDrops:5});
  function atTime(elapsed){
    const p=rain;
    const seconds=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
    const multiplier=Math.min(p.maxMultiplier,1+seconds/p.rampSeconds);
    const fallSeconds=p.fallSeconds/multiplier;
    return {speed:1/fallSeconds,fallSeconds,gap:Math.max(p.minGap,p.gap/Math.sqrt(multiplier))};
  }
  const api=Object.freeze({rain,atTime});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KanaDifficulty=api;
})(typeof window!=='undefined'?window:globalThis);
