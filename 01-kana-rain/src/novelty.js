/* Admission pressure is separate from learning evidence and earned unlocks. */
(function(root){
  'use strict';
  const constants=Object.freeze({windowSize:60,missLimit:4,timeoutLimit:2,recoveryHits:55,cooldownHits:10,maxNew:2,warmup:3});
  const profiles=Object.freeze({
    calm:Object.freeze({id:'calm',windowSize:60,recoveryHits:55})
  });
  const GAME='kana-rain',FACET='form→sound';
  const isKana=id=>typeof id==='string'&&id.startsWith('kana:');
  // Legacy pace selections remain readable but no longer change admission rules.
  function profile(){return profiles.calm;}
  function constantsFor(state){const selected=profile(state);return {...constants,windowSize:selected.windowSize,recoveryHits:selected.recoveryHits};}
  function hasSeen(state,id){return state.seen[id]===true;}
  function markSeen(state,id){if(isKana(id))state.seen[id]=true;return state;}
  // Reading misses and expirations are separate signals; either can hold new presentations.
  // Old corrected rounds imply a wrong first answer, even before the miss flag existed.
  const missed=round=>typeof round.miss==='boolean'?round.miss:round.firstCorrect!==true&&round.timeout!==true;
  function pause(state){state.cooldownRemaining=constants.cooldownHits;return state;}
  function updateGate(state){
    const rules=constantsFor(state),recent=state.recent.slice(-rules.windowSize);
    const misses=recent.filter(missed).length,hits=recent.filter(round=>round.firstCorrect).length,timeouts=recent.filter(round=>round.timeout).length;
    if(misses>=rules.missLimit||timeouts>=rules.timeoutLimit)state.blocked=true;
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
    const familiar=event.familiar!==false;
    // Wrong submissions pause immediately in the runtime; their eventual correction is neutral.
    if(event.timeout===true||(!firstCorrect&&event.failureRecorded!==true))pause(state);
    else if(firstCorrect&&familiar&&state.cooldownRemaining>0)state.cooldownRemaining--;
    state.recent.push({roundId:event.roundId,firstCorrect,timeout:event.timeout===true,miss:event.miss===true&&!firstCorrect,familiar});
    if(state.recent.length>constants.windowSize)state.recent.splice(0,state.recent.length-constants.windowSize);
    // Retain all 60 real samples, including history saved by earlier versions.
    return updateGate(state);
  }
  function create(gameData,evidence={}){
    // Existing state carries hysteresis across restarts. Never rebuild it from
    // stale aggregates or rewrite the underlying attempt/exposure ledgers.
    const saved=gameData.novelty;
    if(saved?.version===1&&saved.seen&&Array.isArray(saved.recent)&&typeof saved.blocked==='boolean'){
      saved.pace=profile(saved).id;
      if(!Number.isInteger(saved.cooldownRemaining)||saved.cooldownRemaining<0||saved.cooldownRemaining>constants.cooldownHits){
        saved.cooldownRemaining=0;
        // Do not invent familiar successes in old samples that did not record debut identity.
        for(const round of saved.recent.slice(-constants.cooldownHits)){
          if(!round.firstCorrect)pause(saved);
          else if(round.familiar===true&&saved.cooldownRemaining>0)saved.cooldownRemaining--;
        }
        const last=(evidence.attempts||[]).findLast(event=>event?.gameId===GAME&&event.facet===FACET&&isKana(event.itemId));
        if(last&&(last.outcome==='incorrect'||last.correct===false))pause(saved);
      }
      return updateGate(saved);
    }
    const state={version:1,pace:'calm',seen:{},recent:[],blocked:false,cooldownRemaining:0},rounds=new Map(),completed=new Set();
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
      if(event.outcome==='incorrect'||event.correct===false){pause(state);previous.incorrect=true;rounds.set(roundId,previous);}
      if(event.outcome==='timeout'||event.outcome==='correct'||event.correct===true){
        const timeout=event.outcome==='timeout',firstCorrect=!timeout&&!previous.incorrect&&event.firstAttempt===true;
        finish(state,{roundId,timeout,firstCorrect,familiar:previous.familiar,failureRecorded:previous.incorrect,miss:previous.familiar&&!firstCorrect&&(previous.incorrect||!timeout)});
        rounds.delete(roundId);completed.add(roundId);
      }
    }
    for(const event of readings)markSeen(state,event.itemId);
    gameData.novelty=state;return state;
  }
  const api=Object.freeze({constants,profiles,profile,constantsFor,setPace,create,pause,finish,markSeen,hasSeen});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KanaNovelty=api;
})(typeof window!=='undefined'?window:globalThis);
