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
  assert.deepEqual(Novelty.constants,{windowSize:12,timeoutLimit:2,recoveryHits:10,maxNew:2,warmup:3});
});

test('two expired drops close admission even with ten first-try successes',()=>{
  const state=Novelty.create({});
  for(let i=0;i<10;i++)resolved(state,'hit:'+i);
  resolved(state,'timeout:1',{timeout:true});resolved(state,'timeout:2',{timeout:true});
  assert.equal(state.blocked,true);assert.equal(state.recent.length,12);
  assert.equal(state.recent.filter(round=>round.firstCorrect).length,10);
  assert.equal(state.recent.filter(round=>round.timeout).length,2);
});

test('recovery requires a full window, enough first answers and at most one expiry',()=>{
  const state=Novelty.create({});
  resolved(state,'timeout:1',{timeout:true});resolved(state,'timeout:2',{timeout:true});
  for(let i=0;i<10;i++)resolved(state,'hit:'+i);
  assert.equal(state.blocked,true,'two expiries override ten successes');
  resolved(state,'hit:10');assert.equal(state.blocked,false,'eleven successes and one expiry reopen admission');
  resolved(state,'timeout:3',{timeout:true});resolved(state,'timeout:4',{timeout:true});
  assert.equal(state.blocked,true,'a new pressure spike closes admission again');
});

test('a blocked gate stays blocked when expiry ages out without sufficient first answers',()=>{
  const state=Novelty.create({});
  resolved(state,'timeout:1',{timeout:true});resolved(state,'timeout:2',{timeout:true});
  for(let i=0;i<12;i++)resolved(state,'corrected:'+i,{firstCorrect:false});
  assert.equal(state.blocked,true);assert.equal(state.recent.filter(round=>round.timeout).length,0);
  for(let i=0;i<9;i++)resolved(state,'first:'+i);
  assert.equal(state.blocked,true);resolved(state,'first:9');assert.equal(state.blocked,false);
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
  for(let i=0;i<12;i++)attempts.push(event('corrected:'+i,{firstAttempt:false}));
  const state=Novelty.create({},{attempts});
  assert.equal(state.recent.length,12);assert.equal(state.recent.some(round=>round.timeout),false);assert.equal(state.blocked,true);
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
