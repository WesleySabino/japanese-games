/* Read-only presentation of the local novelty experiment. */
(function(root){
  'use strict';
  function snapshot(novelty,game,options){
    if(!game||!['hira','kata','mix'].includes(game.mode))return {visible:false};
    const {constants,knownAvailable=true,starterAvailable=false}=options;
    const {windowSize,recoveryHits,maxNew,warmup}=constants;
    const recent=novelty.recent.slice(-windowSize),sampleCount=recent.length;
    const hits=recent.filter(round=>round.firstCorrect===true).length;
    const expired=recent.filter(round=>round.timeout===true).length;
    const introduced=game.newIds.size,familiar=Math.min(warmup,game.familiarSinceIntroduction||0);
    const gate=novelty.blocked?'hold':'open',gateLabel=novelty.blocked?'ON HOLD':'OPEN';
    let reason,sessionText;
    if(game.drops.some(drop=>drop.isIntroduction)){
      reason='on-screen';sessionText='One debut on screen';
    }else if(starterAvailable){
      reason='starter';sessionText='Starter vowels allowed';
    }else if(introduced>=maxNew){
      reason='budget';sessionText='Session limit reached';
    }else if(novelty.blocked){
      reason='recovery';sessionText='Waiting for recovery';
    }else if(knownAvailable&&familiar<warmup){
      reason='spacing';sessionText=`Familiar drops ${familiar} / ${warmup}`;
    }else{
      reason='eligible';sessionText='Eligible when selected';
    }
    const recentText=`Last ${sampleCount}${sampleCount<windowSize?` / ${windowSize}`:''} drops: ${hits} first-try hits · ${expired} expired`;
    const detail=[
      `New kana gate: ${gateLabel}. Only first presentations are held; familiar kana keep falling.`,
      `${recentText}. This window continues across sessions.`,
      `Recovery needs ${windowSize} completed drops, at least ${recoveryHits} first-try hits and at most 1 expired. First-try hits may include a reading hint.`,
      `${introduced} / ${maxNew} introduced this session; ${sessionText.toLowerCase()}. Introduced means shown for the first time, not unlocked or answered correctly.`,
      `${warmup} completed familiar drops separate debuts when familiar kana are available. Completions need not be correct. One debut can be on screen at a time.`,
      'Each alphabet’s five starter vowels bypass recovery, spacing and the session limit; they are excluded from the introduced counter.'
    ].join('\n');
    return {visible:true,gate,gateLabel,sampleCount,windowSize,hits,expired,introduced,maxNew,familiar,warmup,reason,recentText,sessionText,detail};
  }
  const api=Object.freeze({snapshot});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KanaNoveltyHud=api;
})(typeof window!=='undefined'?window:globalThis);
