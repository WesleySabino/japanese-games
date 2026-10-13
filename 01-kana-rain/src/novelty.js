/* Admission pressure is separate from learning evidence and earned unlocks. */
(function(root){
  'use strict';
  const constants=Object.freeze({windowSize:12,timeoutLimit:2,recoveryHits:10,maxNew:2,warmup:3});
  const GAME='kana-rain',FACET='form→sound';
  const isKana=id=>typeof id==='string'&&id.startsWith('kana:');
  function hasSeen(state,id){return state.seen[id]===true;}
  function markSeen(state,id){if(isKana(id))state.seen[id]=true;return state;}
  function finish(state,event){
    if(!event||typeof event.roundId!=='string'||!event.roundId||state.recent.some(round=>round.roundId===event.roundId))return state;
    state.recent.push({roundId:event.roundId,firstCorrect:event.firstCorrect===true&&event.timeout!==true,timeout:event.timeout===true});
    if(state.recent.length>constants.windowSize)state.recent.splice(0,state.recent.length-constants.windowSize);
    const timeouts=state.recent.filter(round=>round.timeout).length,hits=state.recent.filter(round=>round.firstCorrect).length;
    if(timeouts>=constants.timeoutLimit)state.blocked=true;
    else if(state.blocked&&state.recent.length===constants.windowSize&&hits>=constants.recoveryHits&&timeouts<=1)state.blocked=false;
    return state;
  }
  function create(gameData,evidence={}){
    // Existing state carries hysteresis across restarts. Never rebuild it from
    // stale aggregates or rewrite the underlying attempt/exposure ledgers.
    const saved=gameData.novelty;
    if(saved?.version===1&&saved.seen&&Array.isArray(saved.recent)&&typeof saved.blocked==='boolean')return saved;
    const state={version:1,seen:{},recent:[],blocked:false},rounds=new Map(),completed=new Set();
    for(const event of evidence.attempts||[]){
      if(event?.gameId!==GAME||event.facet!==FACET||!isKana(event.itemId))continue;
      markSeen(state,event.itemId);
      const roundId=event.roundId||event.attemptId;
      if(!roundId||completed.has(roundId))continue;
      const previous=rounds.get(roundId)||{incorrect:false};
      if(event.outcome==='incorrect'||event.correct===false){previous.incorrect=true;rounds.set(roundId,previous);}
      if(event.outcome==='timeout'||event.outcome==='correct'||event.correct===true){
        const timeout=event.outcome==='timeout';
        finish(state,{roundId,timeout,firstCorrect:!timeout&&!previous.incorrect&&event.firstAttempt===true});
        rounds.delete(roundId);completed.add(roundId);
      }
    }
    for(const event of evidence.exposures||[]){
      if(event?.gameId===GAME&&event.facet===FACET&&event.reason==='initial-reading')markSeen(state,event.itemId);
    }
    for(const [id,item] of Object.entries(evidence.items||{})){
      const old=item?.legacyFacets?.[FACET];
      if(old&&(old.correct>0||old.errors>0||old.firstAttempts>0))markSeen(state,id);
    }
    gameData.novelty=state;return state;
  }
  const api=Object.freeze({constants,create,finish,markSeen,hasSeen});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KanaNovelty=api;
})(typeof window!=='undefined'?window:globalThis);
