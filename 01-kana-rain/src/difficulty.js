/* Session difficulty is a deterministic function of active play time, independent of answers. */
(function(root){
  'use strict';
  const profiles=Object.freeze({
    easy:Object.freeze({name:'Easy',hearts:5,fallSeconds:14,rampSeconds:90,maxMultiplier:3,gap:2800,minGap:1000,maxDrops:3}),
    normal:Object.freeze({name:'Normal',hearts:3,fallSeconds:10,rampSeconds:60,maxMultiplier:3.5,gap:2400,minGap:750,maxDrops:5}),
    hard:Object.freeze({name:'Hard',hearts:1,fallSeconds:7,rampSeconds:45,maxMultiplier:4,gap:1900,minGap:600,maxDrops:6})
  });
  function atTime(id,elapsed){
    const p=profiles[id]||profiles.normal;
    const seconds=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
    const multiplier=Math.min(p.maxMultiplier,1+seconds/p.rampSeconds);
    const fallSeconds=p.fallSeconds/multiplier;
    return {speed:1/fallSeconds,fallSeconds,gap:Math.max(p.minGap,p.gap/Math.sqrt(multiplier))};
  }
  const api=Object.freeze({profiles,atTime});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KanaDifficulty=api;
})(typeof window!=='undefined'?window:globalThis);
