/* Admission pressure is separate from learning evidence and earned unlocks. */
(function(root){
  'use strict';
  const constants=Object.freeze({windowSize:60,timeoutLimit:2,recoveryHits:55,maxNew:2,warmup:3});
  const profiles=Object.freeze({
    calm:Object.freeze({id:'calm',label:'Calm',windowSize:60,recoveryHits:55}),
    balanced:Object.freeze({id:'balanced',label:'Balanced',windowSize:30,recoveryHits:25}),
    bold:Object.freeze({id:'bold',label:'Bold',windowSize:12,recoveryHits:10})
  });
  const GAME='kana-rain',FACET='form→sound';
  const isKana=id=>typeof id==='string'&&id.startsWith('kana:');
  function profile(value){const id=typeof value==='string'?value:value?.pace;return Object.hasOwn(profiles,id)?profiles[id]:profiles.calm;}
  function constantsFor(state){const selected=profile(state);return {...constants,windowSize:selected.windowSize,recoveryHits:selected.recoveryHits};}
  function hasSeen(state,id){return state.seen[id]===true;}
  function markSeen(state,id){if(isKana(id))state.seen[id]=true;return state;}
  function updateGate(state){
    const rules=constantsFor(state),recent=state.recent.slice(-rules.windowSize);
    const timeouts=recent.filter(round=>round.timeout).length,hits=recent.filter(round=>round.firstCorrect).length;
    if(timeouts>=rules.timeoutLimit)state.blocked=true;
    else if(state.blocked&&recent.length===rules.windowSize&&hits>=rules.recoveryHits&&timeouts<=1)state.blocked=false;
    return state;
  }
  function setPace(state,id){
    if(!Object.hasOwn(profiles,id))return state;
    state.pace=id;return updateGate(state);
  }
  function finish(state,event){
    if(!event||typeof event.roundId!=='string'||!event.roundId||state.recent.some(round=>round.roundId===event.roundId))return state;
    state.recent.push({roundId:event.roundId,firstCorrect:event.firstCorrect===true&&event.timeout!==true,timeout:event.timeout===true});
    if(state.recent.length>constants.windowSize)state.recent.splice(0,state.recent.length-constants.windowSize);
    // Keep all 60 real samples even for shorter profiles so switching back loses no history.
    return updateGate(state);
  }
  function create(gameData,evidence={}){
    // Existing state carries hysteresis across restarts. Never rebuild it from
    // stale aggregates or rewrite the underlying attempt/exposure ledgers.
    const saved=gameData.novelty;
    if(saved?.version===1&&saved.seen&&Array.isArray(saved.recent)&&typeof saved.blocked==='boolean'){saved.pace=profile(saved).id;return saved;}
    const state={version:1,pace:'calm',seen:{},recent:[],blocked:false},rounds=new Map(),completed=new Set();
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
  const api=Object.freeze({constants,profiles,profile,constantsFor,setPace,create,finish,markSeen,hasSeen});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KanaNovelty=api;
})(typeof window!=='undefined'?window:globalThis);
