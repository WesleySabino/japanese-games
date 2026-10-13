const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Novelty=require('../src/novelty.js');
const event=(id,extra={})=>({attemptId:id,roundId:id,itemId:'kana:あ',facet:'form→sound',gameId:'kana-rain',firstAttempt:true,outcome:'correct',correct:true,...extra});
const resolved=(state,id,extra={})=>Novelty.finish(state,{roundId:id,firstCorrect:true,timeout:false,...extra});

test('novelty exposes the same pure API to browser and CommonJS',()=>{
  const context=vm.createContext({});
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../src/novelty.js'),'utf8'),context);
  assert.deepEqual(Object.keys(context.KanaNovelty),Object.keys(Novelty));
  assert.deepEqual(Novelty.constants,{windowSize:60,timeoutLimit:2,recoveryHits:55,maxNew:2,warmup:3});
});

test('two expired drops close admission even with 55 first-try successes in 60 drops',()=>{
  const state=Novelty.create({});
  for(let i=0;i<55;i++)resolved(state,'hit:'+i);
  for(let i=0;i<3;i++)resolved(state,'corrected:'+i,{firstCorrect:false});
  resolved(state,'timeout:1',{timeout:true});resolved(state,'timeout:2',{timeout:true});
  assert.equal(state.blocked,true);assert.equal(state.recent.length,60);
  assert.equal(state.recent.filter(round=>round.firstCorrect).length,55);
  assert.equal(state.recent.filter(round=>round.timeout).length,2);
});

test('recovery requires a full window, enough first answers and at most one expiry',()=>{
  const state=Novelty.create({});
  resolved(state,'timeout:1',{timeout:true});resolved(state,'timeout:2',{timeout:true});
  for(let i=0;i<57;i++)resolved(state,'hit:'+i);
  assert.equal(state.recent.length,59);assert.equal(state.blocked,true,'recovery requires the full 60-drop window');
  resolved(state,'hit:57');assert.equal(state.blocked,true,'two expiries still block a full window with 58 successes');
  resolved(state,'hit:58');assert.equal(state.blocked,false,'59 successes and one expiry reopen admission');
  resolved(state,'timeout:3',{timeout:true});resolved(state,'timeout:4',{timeout:true});
  assert.equal(state.blocked,true,'a new pressure spike closes admission again');
});

test('a blocked gate stays blocked when expiry ages out without sufficient first answers',()=>{
  const state=Novelty.create({});
  resolved(state,'timeout:1',{timeout:true});resolved(state,'timeout:2',{timeout:true});
  for(let i=0;i<60;i++)resolved(state,'corrected:'+i,{firstCorrect:false});
  assert.equal(state.blocked,true);assert.equal(state.recent.filter(round=>round.timeout).length,0);
  for(let i=0;i<54;i++)resolved(state,'first:'+i);
  assert.equal(state.blocked,true,'54 first-try hits in 60 must not reopen admission');
  resolved(state,'first:54');assert.equal(state.blocked,false,'55 first-try hits in 60 reopen admission');
});

test('the larger window keeps the most recent 60 distinct completed drops',()=>{
  const state=Novelty.create({});
  for(let i=0;i<65;i++)resolved(state,'hit:'+i);
  assert.equal(state.recent.length,60);assert.equal(state.recent[0].roundId,'hit:5');
  assert.equal(state.recent.at(-1).roundId,'hit:64');
});

for(const previousSize of [12,30])test(`saved ${previousSize}-drop local history grows to 60 without resetting progress or inventing rounds`,()=>{
  const saved={version:1,seen:{'kana:び':true},recent:Array.from({length:previousSize},(_,i)=>({roundId:'old:'+i,firstCorrect:false,timeout:false})),blocked:true};
  const gameData={rows:{hiragana:15,katakana:1},best:{hira:1981},novelty:saved};
  const state=Novelty.create(gameData,{attempts:[event('do-not-replay')]});
  assert.equal(state,saved);assert.equal(state.recent.length,previousSize);assert.equal(state.blocked,true);
  for(let i=0;i<60-previousSize;i++)resolved(state,'new:'+i);
  assert.equal(state.recent.length,60);assert.equal(state.recent[0].roundId,'old:0');assert.equal(state.blocked,true);
  for(let i=0;i<previousSize-6;i++)resolved(state,'recovery:'+i);
  assert.equal(state.blocked,true,'54 first-try hits do not recover a preserved window');
  resolved(state,'recovery:last');assert.equal(state.blocked,false,'55 first-try hits recover the expanded window');
  assert.deepEqual(gameData.rows,{hiragana:15,katakana:1});assert.equal(gameData.best.hira,1981);
  assert.equal(state.seen['kana:び'],true);
});

test('persisted admission state and seen content survive a JSON save and restart',()=>{
  const gameData={rows:{hiragana:15,katakana:1},best:{hira:1981}},state=Novelty.create(gameData);
  Novelty.markSeen(state,'kana:び');resolved(state,'one',{timeout:true});resolved(state,'two',{timeout:true});
  const saved=JSON.parse(JSON.stringify(gameData)),restored=Novelty.create(saved,{attempts:[event('unrelated-new-replay')]});
  assert.equal(restored,saved.novelty);assert.equal(restored.blocked,true);assert.equal(restored.recent.length,2);
  assert.equal(Novelty.hasSeen(restored,'kana:び'),true);assert.equal(Novelty.hasSeen(restored,'kana:ぶ'),false);
  assert.deepEqual(saved.rows,{hiragana:15,katakana:1});assert.deepEqual(saved.best,{hira:1981});
});

test('migration counts each terminal drop once and keeps corrections separate from first answers',()=>{
  const attempts=[
    event('a1',{roundId:'corrected',outcome:'incorrect',correct:false}),
    event('a2',{roundId:'corrected',firstAttempt:false}),
    event('a3',{roundId:'expired',outcome:'incorrect',correct:false}),
    event('a4',{roundId:'expired',firstAttempt:false,outcome:'timeout',correct:null}),
    event('a4',{roundId:'expired',firstAttempt:false,outcome:'timeout',correct:null}),
    event('unfinished',{outcome:'incorrect',correct:false}),
    event('standalone',{roundId:null,assistance:true})
  ],snapshot=JSON.stringify(attempts),state=Novelty.create({},{attempts});
  assert.deepEqual(state.recent,[
    {roundId:'corrected',firstCorrect:false,timeout:false},
    {roundId:'expired',firstCorrect:false,timeout:true},
    {roundId:'standalone',firstCorrect:true,timeout:false}
  ]);
  assert.equal(JSON.stringify(attempts),snapshot,'the learner ledger is untouched');
  resolved(state,'expired',{timeout:true});assert.equal(state.recent.length,3,'duplicate delivery does not consume another position');
});

test('migration replays all terminal events so hysteresis cannot reopen from an easy-looking tail',()=>{
  const attempts=[event('t1',{outcome:'timeout',correct:null}),event('t2',{outcome:'timeout',correct:null})];
  for(let i=0;i<60;i++)attempts.push(event('corrected:'+i,{firstAttempt:false}));
  const state=Novelty.create({},{attempts});
  assert.equal(state.recent.length,60);assert.equal(state.recent.some(round=>round.timeout),false);assert.equal(state.blocked,true);
});

test('first reading in play counts as introduced but map and lesson references do not',()=>{
  const exposures=[
    {...event('seen-in-play',{itemId:'kana:び'}),reason:'initial-reading'},
    {...event('map',{itemId:'kana:ぶ'}),reason:'reference-panel'},
    {...event('lesson',{itemId:'kana:べ'}),reason:'lesson-reference'},
    {...event('other-facet',{itemId:'kana:ぼ',facet:'script→script'}),reason:'initial-reading'},
    {...event('other-game',{itemId:'kana:ぱ',gameId:'other'}),reason:'initial-reading'}
  ],before=JSON.stringify(exposures),state=Novelty.create({},{exposures});
  assert.deepEqual(state.seen,{'kana:び':true});assert.equal(JSON.stringify(exposures),before);assert.equal(state.recent.length,0);
});

test('legacy answers remain seen without inventing attempts or changing earned progress',()=>{
  const gameData={rows:{hiragana:15,katakana:1},accuracy:{hira:{correct:200,attempts:210}},best:{hira:1981}};
  const items={
    'kana:あ':{legacyFacets:{'form→sound':{correct:2}}},
    'kana:い':{legacyFacets:{'form→sound':{errors:1}}},
    'kana:う':{legacyFacets:{'form→sound':{correct:0,errors:0}}},
    'kana:え':{legacyFacets:{'script→script':{correct:2}}},
    'w:あい':{legacyFacets:{'form→sound':{correct:2}}}
  },original=JSON.stringify(items),progress=JSON.parse(JSON.stringify(gameData)),state=Novelty.create(gameData,{items});
  assert.deepEqual(state.seen,{'kana:あ':true,'kana:い':true});assert.deepEqual(state.recent,[]);assert.equal(state.blocked,false);
  assert.equal(JSON.stringify(items),original);
  for(const key of ['rows','accuracy','best'])assert.deepEqual(gameData[key],progress[key]);
});

test('other facets, games and words cannot close kana reading admission',()=>{
  const attempts=[event('pair',{facet:'script→script',outcome:'timeout'}),event('word',{itemId:'w:ねこ',outcome:'timeout'}),event('other',{gameId:'other',outcome:'timeout'})];
  const state=Novelty.create({},{attempts});assert.deepEqual(state.seen,{});assert.deepEqual(state.recent,[]);assert.equal(state.blocked,false);
});
