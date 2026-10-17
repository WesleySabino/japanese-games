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
  assert.deepEqual(Novelty.constants,{windowSize:60,missLimit:4,recoveryHits:55,maxNew:2,warmup:3});
});

const missed=(state,id,extra={})=>resolved(state,id,{firstCorrect:false,miss:true,...extra});

test('four first-answer misses on seen kana close admission even with 55 first-try successes in 60 drops',()=>{
  const state=Novelty.create({});
  for(let i=0;i<55;i++)resolved(state,'hit:'+i);
  for(let i=1;i<=3;i++)missed(state,'miss:'+i);
  assert.equal(state.blocked,false,'three misses leave admission open');
  missed(state,'miss:4',{timeout:true});
  assert.equal(state.blocked,true,'a wrong first answer counts even when that drop later expires');
  assert.equal(state.recent.length,59);assert.equal(state.recent.filter(round=>round.miss).length,4);
});

test('expirations alone never close admission',()=>{
  const state=Novelty.create({});
  for(let i=0;i<60;i++)resolved(state,'timeout:'+i,{timeout:true,firstCorrect:false});
  assert.equal(state.blocked,false);assert.equal(state.recent.filter(round=>round.timeout).length,60);
  assert.equal(state.recent.some(round=>round.miss),false);
});

test('a miss is only recorded for a drop that was not a first-try hit',()=>{
  const state=Novelty.create({});
  resolved(state,'hit',{miss:true});resolved(state,'debut-corrected',{firstCorrect:false});
  assert.deepEqual(state.recent.map(round=>round.miss),[false,false]);
  missed(state,'familiar-corrected');assert.equal(state.recent.at(-1).miss,true);
});

test('recovery requires a full window and the hit target; expirations only cost hits',()=>{
  const state=Novelty.create({});
  for(let i=0;i<4;i++)missed(state,'miss:'+i);
  assert.equal(state.blocked,true);
  for(let i=0;i<2;i++)resolved(state,'timeout:'+i,{timeout:true,firstCorrect:false});
  for(let i=0;i<53;i++)resolved(state,'hit:'+i);
  assert.equal(state.recent.length,59);assert.equal(state.blocked,true,'recovery requires the full 60-drop window');
  resolved(state,'hit:53');assert.equal(state.blocked,true,'four misses still block a full window');
  resolved(state,'hit:54');assert.equal(state.blocked,false,'three misses, two expirations and 55 first-try hits reopen admission');
  for(let i=4;i<8;i++)missed(state,'miss:'+i);
  assert.equal(state.blocked,true,'a new reading slump closes admission again');
});

test('expirations delay recovery only by not being first-try hits',()=>{
  const state=Novelty.create({novelty:{version:1,seen:{},recent:[],blocked:true}});
  for(let i=0;i<6;i++)resolved(state,'timeout:'+i,{timeout:true,firstCorrect:false});
  for(let i=0;i<54;i++)resolved(state,'hit:'+i);
  assert.equal(state.blocked,true,'six expirations leave only 54 first-try hits in 60');
  resolved(state,'hit:54');assert.equal(state.blocked,false,'five expirations and 55 first-try hits reopen admission');
});

test('a blocked gate stays blocked when misses age out without sufficient first answers',()=>{
  const state=Novelty.create({});
  for(let i=0;i<4;i++)missed(state,'miss:'+i);
  for(let i=0;i<60;i++)resolved(state,'timeout:'+i,{timeout:true,firstCorrect:false});
  assert.equal(state.blocked,true);assert.equal(state.recent.filter(round=>round.miss).length,0);
  for(let i=0;i<54;i++)resolved(state,'first:'+i);
  assert.equal(state.blocked,true,'54 first-try hits in 60 must not reopen admission');
  resolved(state,'first:54');assert.equal(state.blocked,false,'55 first-try hits in 60 reopen admission');
});

test('saved version 1 rounds without a miss flag load safely: corrections count, expirations do not',()=>{
  const recent=[
    ...Array.from({length:5},(_,i)=>({roundId:'old-timeout:'+i,firstCorrect:false,timeout:true})),
    ...Array.from({length:51},(_,i)=>({roundId:'old-hit:'+i,firstCorrect:true,timeout:false})),
    ...Array.from({length:3},(_,i)=>({roundId:'old-corrected:'+i,firstCorrect:false,timeout:false}))
  ];
  const saved={version:1,seen:{'kana:あ':true},recent,blocked:false},before=JSON.stringify(saved);
  const state=Novelty.create({novelty:saved});
  assert.equal(state,saved);assert.equal(JSON.stringify(state),JSON.stringify({...JSON.parse(before),pace:'calm'}),'loading rewrites nothing but the pace default');
  resolved(state,'new-hit');
  assert.equal(state.blocked,false,'five old expirations and three old corrections keep admission open');
  missed(state,'new-miss');
  assert.equal(state.blocked,true,'the three old corrections and one new miss close admission');
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
  // Saved corrected rounds were wrong first answers, so they count as misses until they age out.
  for(let i=0;i<previousSize-4;i++)resolved(state,'recovery:'+i);
  assert.equal(state.blocked,true,'four preserved corrections still block the expanded window');
  resolved(state,'recovery:last');assert.equal(state.blocked,false,'57 first-try hits and three old corrections recover the expanded window');
  assert.deepEqual(gameData.rows,{hiragana:15,katakana:1});assert.equal(gameData.best.hira,1981);
  assert.equal(state.seen['kana:び'],true);
});

test('persisted admission state and seen content survive a JSON save and restart',()=>{
  const gameData={rows:{hiragana:15,katakana:1},best:{hira:1981}},state=Novelty.create(gameData);
  Novelty.markSeen(state,'kana:び');for(const id of ['one','two','three','four'])missed(state,id);
  const saved=JSON.parse(JSON.stringify(gameData)),restored=Novelty.create(saved,{attempts:[event('unrelated-new-replay')]});
  assert.equal(restored,saved.novelty);assert.equal(restored.blocked,true);assert.equal(restored.recent.length,4);
  assert.deepEqual(restored.recent.map(round=>round.miss),[true,true,true,true]);
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
  // The first round debuts あ, so its correction is not a miss; the next round's wrong first answer is.
  assert.deepEqual(state.recent,[
    {roundId:'corrected',firstCorrect:false,timeout:false,miss:false},
    {roundId:'expired',firstCorrect:false,timeout:true,miss:true},
    {roundId:'standalone',firstCorrect:true,timeout:false,miss:false}
  ]);
  assert.equal(JSON.stringify(attempts),snapshot,'the learner ledger is untouched');
  resolved(state,'expired',{timeout:true});assert.equal(state.recent.length,3,'duplicate delivery does not consume another position');
});

test('migration replays all terminal events so hysteresis cannot reopen from an easy-looking tail',()=>{
  const attempts=[event('debut')];
  for(let i=0;i<4;i++)attempts.push(event('m'+i+':1',{roundId:'m'+i,outcome:'incorrect',correct:false}),event('m'+i+':2',{roundId:'m'+i,firstAttempt:false}));
  for(let i=0;i<60;i++)attempts.push(event('t'+i,{outcome:'timeout',correct:null}));
  const state=Novelty.create({},{attempts});
  assert.equal(state.recent.length,60);assert.equal(state.recent.some(round=>round.miss),false);assert.equal(state.blocked,true);
});

test('migration counts only wrong first answers on kana seen before that round',()=>{
  const attempts=[
    event('debut-wrong',{roundId:'debut',itemId:'kana:い',outcome:'incorrect',correct:false}),event('debut-right',{roundId:'debut',itemId:'kana:い',firstAttempt:false}),
    event('seen-expired',{itemId:'kana:い',outcome:'timeout',correct:null}),
    event('seen-wrong',{roundId:'seen',itemId:'kana:い',outcome:'incorrect',correct:false}),event('seen-right',{roundId:'seen',itemId:'kana:い',firstAttempt:false})
  ],state=Novelty.create({},{attempts});
  assert.deepEqual(state.recent.map(round=>[round.roundId,round.miss]),[['debut',false],['seen-expired',false],['seen',true]]);
});

test('legacy answers establish familiarity before four corrected ledger rounds are replayed',()=>{
  const ids=['kana:あ','kana:い','kana:う','kana:え'];
  const items=Object.fromEntries(ids.map(id=>[id,{legacyFacets:{'form→sound':{correct:2}}}]));
  const attempts=ids.flatMap((itemId,i)=>[
    event('legacy:'+i+':1',{roundId:'legacy:'+i,itemId,outcome:'incorrect',correct:false}),
    event('legacy:'+i+':2',{roundId:'legacy:'+i,itemId,firstAttempt:false})
  ]),evidence={items,attempts},before=JSON.stringify(evidence),state=Novelty.create({},evidence);
  assert.deepEqual(state.recent.map(round=>round.miss),[true,true,true,true]);
  assert.equal(state.blocked,true,'four misses on previously answered kana close admission');
  assert.equal(JSON.stringify(evidence),before,'legacy facts and the attempt ledger are untouched');
});

test('only a provably earlier session reading establishes familiarity before the first ledger round',()=>{
  const ids=['kana:い','kana:う','kana:え','kana:お'];
  const exposures=[
    {...event('prior',{itemId:ids[0],sessionId:'old',at:100}),reason:'initial-reading'},
    // Current hints may have null or another target's roundId; neither proves an earlier debut.
    {...event('own',{itemId:ids[1],sessionId:'current',roundId:null,at:100}),reason:'initial-reading'},
    {...event('ambiguous',{itemId:ids[2],sessionId:'current',roundId:'another-target',at:100}),reason:'initial-reading'},
    {...event('future',{itemId:ids[3],sessionId:'later',at:10000}),reason:'initial-reading'}
  ];
  const attempts=ids.flatMap((itemId,i)=>[
    event('reading:'+i+':1',{roundId:'reading:'+i,itemId,sessionId:'current',at:1000,outcome:'incorrect',correct:false}),
    event('reading:'+i+':2',{roundId:'reading:'+i,itemId,sessionId:'current',at:2000,firstAttempt:false})
  ]),evidence={exposures,attempts},before=JSON.stringify(evidence),state=Novelty.create({},evidence);
  assert.deepEqual(state.recent.map(round=>round.miss),[true,false,false,false]);
  assert.deepEqual(Object.keys(state.seen).sort(),ids.sort(),'all in-game initial readings remain seen after replay');
  assert.equal(JSON.stringify(evidence),before,'exposure and attempt chronology is untouched');
});

test('valid saved version 1 state is unchanged even when replay evidence contains legacy familiarity',()=>{
  const saved={version:1,pace:'balanced',seen:{'kana:い':true},recent:[{roundId:'saved',firstCorrect:false,timeout:false}],blocked:true};
  const before=JSON.stringify(saved),gameData={novelty:saved};
  const state=Novelty.create(gameData,{items:{'kana:あ':{legacyFacets:{'form→sound':{correct:2}}}},attempts:[event('unused')]});
  assert.equal(state,saved);assert.equal(JSON.stringify(state),before);
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
