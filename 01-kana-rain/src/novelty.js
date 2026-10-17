/* Admission pressure is separate from learning evidence and earned unlocks. */
(function(root){
  'use strict';
  const constants=Object.freeze({windowSize:60,missLimit:4,recoveryHits:55,maxNew:2,warmup:3});
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
  // A miss is a wrong first answer on a kana seen before that drop. Expirations follow the rain's
  // speed rather than reading, so an untouched expiration is never a miss. Rounds saved before
  // misses were recorded count only when a wrong first answer was later corrected.
  const missed=round=>typeof round.miss==='boolean'?round.miss:round.firstCorrect!==true&&round.timeout!==true;
  function updateGate(state){
    const rules=constantsFor(state),recent=state.recent.slice(-rules.windowSize);
    const misses=recent.filter(missed).length,hits=recent.filter(round=>round.firstCorrect).length;
    if(misses>=rules.missLimit)state.blocked=true;
    else if(state.blocked&&recent.length===rules.windowSize&&hits>=rules.recoveryHits)state.blocked=false;
    return state;
  }
  function setPace(state,id){
    if(!Object.hasOwn(profiles,id))return state;
    state.pace=id;return updateGate(state);
  }
  function finish(state,event){
    if(!event||typeof event.roundId!=='string'||!event.roundId||state.recent.some(round=>round.roundId===event.roundId))return state;
    const firstCorrect=event.firstCorrect===true&&event.timeout!==true;
    state.recent.push({roundId:event.roundId,firstCorrect,timeout:event.timeout===true,miss:event.miss===true&&!firstCorrect});
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
    // Legacy answers predate the attempt ledger, so those kana are already familiar.
    for(const [id,item] of Object.entries(evidence.items||{})){
      const old=item?.legacyFacets?.[FACET];
      if(old&&(old.correct>0||old.errors>0||old.firstAttempts>0))markSeen(state,id);
    }
    const readings=(evidence.exposures||[]).filter(event=>event?.gameId===GAME&&event.facet===FACET&&event.reason==='initial-reading');
    for(const event of evidence.attempts||[]){
      if(event?.gameId!==GAME||event.facet!==FACET||!isKana(event.itemId))continue;
      // Whether the kana was already seen is decided before this round marks it.
      // An earlier session's initial reading is reliable; same-session hints may belong
      // to this debut and their saved roundId can refer to a different target drop.
      const familiar=hasSeen(state,event.itemId)||readings.some(reading=>reading.itemId===event.itemId&&reading.sessionId&&event.sessionId&&reading.sessionId!==event.sessionId&&Number.isFinite(reading.at)&&Number.isFinite(event.at)&&reading.at<event.at);
      markSeen(state,event.itemId);
      const roundId=event.roundId||event.attemptId;
      if(!roundId||completed.has(roundId))continue;
      const previous=rounds.get(roundId)||{incorrect:false,familiar};
      if(event.outcome==='incorrect'||event.correct===false){previous.incorrect=true;rounds.set(roundId,previous);}
      if(event.outcome==='timeout'||event.outcome==='correct'||event.correct===true){
        const timeout=event.outcome==='timeout',firstCorrect=!timeout&&!previous.incorrect&&event.firstAttempt===true;
        finish(state,{roundId,timeout,firstCorrect,miss:previous.familiar&&!firstCorrect&&(previous.incorrect||!timeout)});
        rounds.delete(roundId);completed.add(roundId);
      }
    }
    for(const event of readings)markSeen(state,event.itemId);
    gameData.novelty=state;return state;
  }
  const api=Object.freeze({constants,profiles,profile,constantsFor,setPace,create,finish,markSeen,hasSeen});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KanaNovelty=api;
})(typeof window!=='undefined'?window:globalThis);
