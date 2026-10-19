const test=require('node:test');
const assert=require('node:assert/strict');
const Novelty=require('../src/novelty.js');

const profiles=[['calm','Calm',60,55],['balanced','Balanced',30,25],['bold','Bold',12,10]];
const finish=(state,id,extra={})=>Novelty.finish(state,{roundId:id,firstCorrect:true,timeout:false,familiar:true,...extra});
const miss=(state,id)=>finish(state,id,{firstCorrect:false,miss:true});
const expire=(state,id)=>finish(state,id,{firstCorrect:false,timeout:true});
const attempt=(id,extra={})=>({attemptId:id,roundId:id,itemId:'kana:あ',facet:'form→sound',gameId:'kana-rain',firstAttempt:true,outcome:'correct',correct:true,...extra});

test('new kana pace profiles are fixed and default safely to Calm',()=>{
  assert.equal(Object.isFrozen(Novelty.profiles),true);
  for(const [id,label,windowSize,recoveryHits] of profiles){
    assert.deepEqual(Novelty.profiles[id],{id,label,windowSize,recoveryHits});
    assert.equal(Object.isFrozen(Novelty.profiles[id]),true);
    assert.equal(Novelty.profile(id),Novelty.profiles[id]);
    assert.equal(Novelty.profile({pace:id}),Novelty.profiles[id]);
    assert.deepEqual(Novelty.constantsFor({pace:id}),{windowSize,recoveryHits,missLimit:4,timeoutLimit:2,cooldownHits:10,maxNew:2,warmup:3});
  }
  for(const invalid of [undefined,null,'unknown','constructor','__proto__',{}, {pace:'unknown'}]){
    assert.equal(Novelty.profile(invalid),Novelty.profiles.calm);
  }
});

for(const [pace,,windowSize,recoveryHits] of profiles){
  test(`${pace} recovery also requires at most one expiration in its ${windowSize}-drop window`,()=>{
    const state=Novelty.create({});Novelty.setPace(state,pace);
    for(let i=0;i<4;i++)miss(state,'miss:'+i);
    assert.equal(state.blocked,true);
    for(let i=0;i<60;i++)expire(state,'expired:'+i);
    assert.equal(state.blocked,true,'aging out all misses does not erase the recovery requirement');
    for(let i=0;i<windowSize-2;i++)finish(state,'hit:'+i);
    assert.equal(state.blocked,true,'two expirations still close admission even when the hit target is met');
    finish(state,'threshold');assert.equal(state.blocked,false);
    assert.equal(state.recent.slice(-windowSize).filter(round=>round.timeout).length,1);
    assert.ok(state.recent.slice(-windowSize).filter(round=>round.firstCorrect).length>=recoveryHits);
    assert.equal(state.cooldownRemaining,0,'the qualifying familiar hits also clear the ten-hit pause');
    assert.equal(state.recent.length,60,'smaller selected windows retain the real 60-drop history');
  });

  test(`${pace} needs a full window and reopens only below four misses and at the hit target`,()=>{
    const incomplete=Novelty.create({novelty:{version:1,pace,seen:{},recent:[],blocked:true}});
    for(let i=0;i<windowSize-1;i++)finish(incomplete,'fresh:'+i);
    assert.equal(incomplete.blocked,true,'enough first-try hits alone cannot replace the missing completion');
    finish(incomplete,'fresh:full');assert.equal(incomplete.blocked,false);
    const state=Novelty.create({});Novelty.setPace(state,pace);
    for(let i=0;i<4;i++)miss(state,'miss:'+i);
    for(let i=0;i<windowSize-5;i++)finish(state,'hit:'+i);
    assert.equal(state.recent.length,windowSize-1);
    assert.equal(state.blocked,true,'an incomplete window cannot reopen admission');
    finish(state,'full-window');
    assert.equal(state.blocked,true,'four misses block even with enough first-try hits');
    // Each further hit pushes one miss out of the tail; the hit target may need more than the miss limit.
    const needed=Math.max(1,4-(windowSize-recoveryHits));
    for(let i=1;i<needed;i++){finish(state,'more:'+i);assert.equal(state.blocked,true,`${4-i} misses leave fewer than ${recoveryHits} first-try hits`);}
    finish(state,'qualifying');
    assert.equal(state.blocked,false,`a complete window with ${4-needed} misses and ${windowSize-4+needed} first-try hits reopens admission`);
  });

  test(`${pace} the first expiration pauses new kana and the second closes the chronic gate`,()=>{
    const state=Novelty.create({});Novelty.setPace(state,pace);
    expire(state,'expired:1');
    assert.equal(state.blocked,false,'one expiration does not alone close the chronic gate');
    assert.equal(state.cooldownRemaining,10);
    for(let i=0;i<3;i++)finish(state,'clean:'+i);
    assert.equal(state.cooldownRemaining,7);
    expire(state,'expired:2');
    assert.equal(state.blocked,true,'two expirations close the gate in every pace');
    assert.equal(state.cooldownRemaining,10,'a further failure restarts the pause');
    const chronic=Novelty.create({});Novelty.setPace(chronic,pace);
    expire(chronic,'adjacent:1');expire(chronic,'adjacent:2');
    for(let i=0;i<10;i++)finish(chronic,'recover-pause:'+i);
    assert.equal(chronic.cooldownRemaining,0);
    assert.equal(chronic.blocked,true,'clearing the short pause cannot bypass a window retaining both expirations');
  });
}

test('switching pace evaluates the same real history without resetting hysteresis or seen kana',()=>{
  const state=Novelty.create({});
  Novelty.markSeen(state,'kana:び');
  for(let i=0;i<4;i++)miss(state,'miss:'+i);
  for(let i=0;i<8;i++)finish(state,'hit:'+i);
  assert.equal(state.blocked,true);
  assert.equal(state.cooldownRemaining,2);
  const recentBefore=JSON.stringify(state.recent),seenBefore=JSON.stringify(state.seen);
  Novelty.setPace(state,'balanced');
  assert.equal(state.pace,'balanced');assert.equal(state.blocked,true,'a new profile does not invent the missing samples');
  Novelty.setPace(state,'bold');
  assert.equal(state.blocked,true,'8 hits and four misses still fail the 12-drop rule');
  finish(state,'ninth-hit');
  assert.equal(state.blocked,true,'three misses leave only 9 of the 10 hits Bold needs');
  finish(state,'tenth-hit');
  assert.equal(state.blocked,false);
  assert.equal(state.cooldownRemaining,0);
  Novelty.setPace(state,'calm');
  assert.equal(state.blocked,true,'switching back sees the four real misses in the longer window');
  Novelty.setPace(state,'bold');
  assert.equal(state.blocked,false,'the same shorter qualifying tail can reopen immediately');
  assert.equal(JSON.stringify(state.seen),seenBefore);
  assert.equal(JSON.stringify(state.recent.slice(0,-2)),recentBefore,'changing profiles neither drops nor fabricates rounds');
});

test('switching any pace cannot clear, restart or make debut hits pay down the persistent pause',()=>{
  const gameData={},state=Novelty.create(gameData);
  Novelty.markSeen(state,'kana:び');Novelty.pause(state);
  finish(state,'one-clean');assert.equal(state.cooldownRemaining,9);
  finish(state,'debut-clean',{familiar:false});assert.equal(state.cooldownRemaining,9);
  const recentBefore=JSON.stringify(state.recent),seenBefore=JSON.stringify(state.seen);
  for(const [pace]of [...profiles,...profiles].reverse()){
    Novelty.setPace(state,pace);
    assert.equal(state.cooldownRemaining,9,pace+' cannot bypass or restart the pause');
    assert.equal(JSON.stringify(state.recent),recentBefore);assert.equal(JSON.stringify(state.seen),seenBefore);
  }
  const saved=JSON.parse(JSON.stringify(gameData)),restored=Novelty.create(saved,{attempts:[attempt('old-wrong',{outcome:'incorrect',correct:false})]});
  assert.equal(restored.cooldownRemaining,9,'an initialized pause survives load without being inferred again');
  for(let i=0;i<8;i++)finish(restored,'more-clean:'+i);
  assert.equal(restored.cooldownRemaining,1);
  for(const [pace]of profiles){Novelty.setPace(restored,pace);assert.equal(restored.cooldownRemaining,1);}
  finish(restored,'tenth-clean');assert.equal(restored.cooldownRemaining,0);
  for(const [pace]of profiles){Novelty.setPace(restored,pace);assert.equal(restored.cooldownRemaining,0);}
});

test('pace changes re-evaluate the same expiration tail without deleting samples or changing cooldown',()=>{
  const state=Novelty.create({});
  expire(state,'expired:1');expire(state,'expired:2');
  for(let i=0;i<10;i++)finish(state,'clean:'+i);
  assert.equal(state.cooldownRemaining,0);assert.equal(state.blocked,true);
  Novelty.setPace(state,'bold');assert.equal(state.blocked,true,'both expirations remain in the 12-drop tail');
  finish(state,'qualifying');assert.equal(state.blocked,false,'one expiration and 11 hits recover Bold');
  const history=JSON.stringify(state.recent);
  for(const pace of ['calm','balanced']){
    Novelty.setPace(state,pace);assert.equal(state.blocked,true,'the longer tail retains both real expirations');
    assert.equal(state.cooldownRemaining,0);assert.equal(JSON.stringify(state.recent),history);
  }
  Novelty.setPace(state,'bold');assert.equal(state.blocked,false);
  assert.equal(state.cooldownRemaining,0);assert.equal(JSON.stringify(state.recent),history);
});

test('Bold keeps 60 completed drops available when switching back to Calm',()=>{
  const state=Novelty.create({});Novelty.setPace(state,'bold');
  for(let i=0;i<65;i++)finish(state,'round:'+i);
  assert.equal(state.recent.length,60);assert.equal(state.recent[0].roundId,'round:5');
  assert.equal(state.recent.at(-1).roundId,'round:64');
  const before=JSON.stringify(state.recent);Novelty.setPace(state,'calm');
  assert.equal(JSON.stringify(state.recent),before);assert.equal(state.blocked,false);
  finish(state,'round:64',{timeout:true});
  assert.equal(JSON.stringify(state.recent),before,'a duplicate completion remains ignored after switching');
});

test('invalid choices cannot reset or reopen the saved gate',()=>{
  const state=Novelty.create({});Novelty.setPace(state,'balanced');
  for(let i=0;i<4;i++)miss(state,'miss:'+i);
  assert.equal(state.blocked,true);
  const before=JSON.stringify(state);
  for(const invalid of [undefined,null,'unknown','constructor','__proto__']){
    Novelty.setPace(state,invalid);assert.equal(JSON.stringify(state),before);
  }
});

test('existing version 1 state acquires Calm without replaying evidence or resetting progress',()=>{
  const recent=[{roundId:'old',firstCorrect:false,timeout:true}];
  const saved={version:1,seen:{'kana:び':true},recent,blocked:true};
  const gameData={rows:{hiragana:15,katakana:1},best:{hira:1981},novelty:saved};
  const evidence={attempts:[attempt('should-not-replay')],exposures:[],items:{}};
  const before=JSON.stringify(evidence),state=Novelty.create(gameData,evidence);
  assert.equal(state,saved);assert.equal(state.pace,'calm');assert.equal(state.blocked,true);
  assert.equal(state.cooldownRemaining,10,'a legacy failed round initializes the ten-hit pause');
  assert.equal(state.recent,recent);assert.equal(state.recent.length,1);
  assert.equal(state.seen['kana:び'],true);assert.equal(state.seen['kana:あ'],undefined);
  assert.deepEqual(gameData.rows,{hiragana:15,katakana:1});assert.deepEqual(gameData.best,{hira:1981});
  assert.equal(JSON.stringify(evidence),before);
});

test('selected pace and the shared evidence history survive save and reload',()=>{
  const attempts=[attempt('hit')];
  for(let i=0;i<4;i++)attempts.push(attempt('miss:'+i+':1',{roundId:'miss:'+i,outcome:'incorrect',correct:false}),attempt('miss:'+i+':2',{roundId:'miss:'+i,firstAttempt:false}));
  attempts.push(attempt('timeout:1',{outcome:'timeout',correct:null}),attempt('timeout:2',{outcome:'timeout',correct:null}));
  const evidence={attempts,exposures:[],items:{}};
  const evidenceBefore=JSON.stringify(evidence);
  const gameData={rows:{hiragana:15,katakana:1},best:{hira:1981}},state=Novelty.create(gameData,evidence);
  Novelty.setPace(state,'bold');
  const before=JSON.stringify(gameData),saved=JSON.parse(before),restored=Novelty.create(saved,{attempts:[attempt('do-not-replay')]});
  assert.equal(restored.pace,'bold');assert.equal(restored.blocked,true);assert.equal(restored.recent.length,7);
  assert.equal(restored.cooldownRemaining,10);
  assert.deepEqual(restored.recent.map(round=>round.miss),[false,true,true,true,true,false,false]);
  assert.equal(JSON.stringify(saved),before);assert.equal(JSON.stringify(evidence),evidenceBefore);
  assert.deepEqual(saved.rows,{hiragana:15,katakana:1});assert.deepEqual(saved.best,{hira:1981});
});

test('unknown persisted pace falls back to Calm without losing accumulated local evidence',()=>{
  const saved={version:1,pace:'old-experiment',seen:{'kana:び':true},recent:[{roundId:'old',firstCorrect:false,timeout:false}],blocked:true};
  const state=Novelty.create({novelty:saved});
  assert.equal(state,saved);assert.equal(state.pace,'calm');assert.equal(state.blocked,true);
  assert.equal(state.cooldownRemaining,10);
  assert.deepEqual(state.seen,{'kana:び':true});assert.equal(state.recent[0].roundId,'old');
});
