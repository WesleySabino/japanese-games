'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {runtime}=require('./runtime-harness.cjs');
const {fixture,data,FACET}=require('./helpers/journey-fixture.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
async function garden(saved=fixture()){
  return runtime({storage:[['jp-learner-v1',JSON.stringify(saved)]]});
}
function start(g,options){g.el('mode').value='journey';g.el('mode').onchange();g.app.start(options);g.skip();}
function answer(g){const d=g.app.state.target;assert.ok(d);g.answer(data.kanaById[d.id].romaji);return d;}
function next(g,id){assert.equal(g.app.state.drops.length,0);if(id)g.app.state.queue=[{id}];g.app.state.sinceSpawn=99999;g.tick();assert.ok(g.app.state.target);return g.app.state.target;}

test('Journey is a third available mode, starting a fresh garden with Hiragana only',async()=>{
  const g=await runtime();start(g);
  assert.equal(g.app.settings.mode,'journey');assert.equal(g.app.state.journeyStage,'hiragana');
  assert.equal(g.el('mode').options.find(o=>o.value==='journey').disabled,false);
  assert.equal(g.app.candidates().length,5);
  assert.ok(g.app.candidates().every(id=>data.kanaById[id].script==='hiragana'));
  assert.equal(g.app.gameData.katakanaUnlocked,false);assert.equal(g.app.state.target.id,'kana:あ');
  answer(g);next(g,'kana:ア');assert.notEqual(g.app.state.target.id,'kana:ア','a stale or injected queue cannot bypass the curriculum');
});

test('the final qualifying Hiragana opens Katakana inside the same regular Journey session',async()=>{
  const saved=fixture({katakana:false,access:false});
  saved.attemptLedger=saved.attemptLedger.filter(e=>!(e.itemId==='kana:ぴょ'&&e.attemptId.endsWith(':1')));
  const g=await garden(saved);start(g);const session=g.app.state.sessionId;
  assert.equal(g.app.state.journeyStage,'hiragana');
  if(g.app.state.target.id!=='kana:ぴょ'){answer(g);next(g,'kana:ぴょ');}
  answer(g);
  assert.equal(g.app.gameData.katakanaUnlocked,true);assert.equal(g.app.state.journeyStage,'katakana');
  assert.equal(g.app.state.sessionId,session);assert.equal(g.app.state.over,false);
  assert.ok(g.app.candidates().every(id=>data.kanaById[id].script==='katakana'));
  assert.equal(next(g).id,'kana:ア','the next drop begins Katakana without restarting');
});

test('five ready Katakana vowels earn mixed rain without resetting counts, time or session',async()=>{
  const saved=fixture({katakana:false});
  const vowels=data.kana.filter(k=>k.script==='katakana'&&k.row==='a');
  const complete=fixture();saved.attemptLedger.push(...complete.attemptLedger.filter(e=>vowels.some(k=>k.id===e.itemId)&&!(e.itemId==='kana:オ'&&e.attemptId.endsWith(':1'))));
  for(const k of vowels)saved.games['kana-rain'].novelty.seen[k.id]=true;
  const g=await garden(saved);start(g);assert.equal(g.app.state.journeyStage,'katakana');
  const session=g.app.state.sessionId;
  if(g.app.state.target.id!=='kana:オ'){answer(g);next(g,'kana:オ');}
  const before=g.app.state.correct;answer(g);
  assert.equal(g.app.state.journeyStage,'mixed');assert.equal(g.app.gameData.journeyMixedUnlocked,true);
  assert.equal(g.app.state.correct,before+1);assert.equal(g.app.state.sessionId,session);assert.equal(g.app.state.lives,3);
  assert.equal(g.app.gameData.rows.katakana,2);assert.ok(g.app.candidates().includes('kana:あ'));assert.ok(g.app.candidates().includes('kana:カ'));
  const scripts=new Set();for(let i=0;i<12;i++){scripts.add(data.kanaById[next(g).id].script);answer(g);}
  assert.deepEqual([...scripts].sort(),['hiragana','katakana']);
});

test('balanced planning keeps both scripts in the rain and continues introducing Katakana',async()=>{
  const g=await garden();start(g);let hira=0,kata=0;const prior=g.app.gameData.katakanaNovelty.recent.length;
  for(let i=0;i<80;i++){
    if(!g.app.state.drops.length)next(g);
    const k=data.kanaById[g.app.state.target.id];if(k.script==='hiragana')hira++;else kata++;
    answer(g);
  }
  assert.ok(hira>=28&&kata>=28,`${hira} Hiragana / ${kata} Katakana; neither script is starved`);
  assert.ok([...g.app.state.newIds].filter(id=>data.kanaById[id].script==='katakana').length>=3,'ready learning slots permit more than two new Katakana');
  assert.equal(g.app.state.errors,0);assert.equal(g.app.state.expirations,0);
  assert.deepEqual(plain(g.app.gameData.accuracy.hira),{attempts:hira,correct:hira});
  assert.deepEqual(plain(g.app.gameData.accuracy.kata),{attempts:kata,correct:kata});
  assert.equal(g.app.gameData.accuracy.journey,undefined,'retain the existing per-alphabet recovery contract');
  assert.equal(g.app.gameData.katakanaNovelty.recent.length,Math.min(60,kata+prior),'Hiragana never supplies Katakana long-brake recovery');
});

test('wrong answers pause new forms in both scripts; only Katakana rounds update its own long brake',async()=>{
  const g=await garden();start(g);answer(g);const d=next(g,'kana:あ');
  const before=g.app.gameData.katakanaNovelty.recent.length;
  g.answer('qq');assert.equal(g.app.gameData.novelty.cooldownRemaining,10);answer(g);
  assert.equal(g.app.gameData.katakanaNovelty.recent.length,before);
  const blocked=next(g,'kana:カ');assert.notEqual(blocked.id,'kana:カ');answer(g);
  next(g,'kana:ア');g.answer('qq');answer(g);
  assert.ok(g.app.gameData.katakanaNovelty.recent.at(-1).miss);
  assert.equal(g.app.gameData.novelty.cooldownRemaining,10);
  assert.equal(g.app.state.journeyStage,'mixed','earned mixing does not relock after mistakes');
  assert.ok(d);
});

test('two real Katakana expirations close its long gate while familiar practice continues',async()=>{
  const g=await garden();start(g);
  g.app.state.target.progress=1;g.tick();
  next(g,'kana:ア').progress=1;g.tick();
  assert.equal(g.app.state.lives,1);assert.equal(g.app.state.expirations,2);
  assert.equal(g.app.gameData.katakanaNovelty.blocked,true);
  for(let i=0;i<10;i++){next(g,'kana:あ');answer(g);}
  assert.equal(g.app.gameData.novelty.cooldownRemaining,0);
  assert.equal(g.app.gameData.katakanaNovelty.blocked,true);
  assert.notEqual(next(g,'kana:カ').id,'kana:カ','Hiragana recovery cannot bypass Katakana pressure');
});

test('the same romaji answers one of two visible script partners once, and the sound pad answers the other',async()=>{
  const g=await garden();start(g);answer(g);next(g,'kana:ア');
  g.app.state.queue=[{id:'kana:あ'}];g.app.state.sinceSpawn=99999;g.tick();
  assert.equal(g.app.state.drops.length,2);const first=g.app.state.target;
  const before=g.learner.attempts().length;g.answer('a');
  assert.equal(g.learner.attempts().length,before+1);assert.equal(g.learner.attempts().at(-1).itemId,first.id);
  assert.equal(g.app.state.drops.length,1);
  const other=g.app.state.target;g.compose(other.id);
  assert.equal(g.app.state.drops.length,0);assert.equal(g.learner.attempts().length,before+2);
  assert.deepEqual(Array.from(g.learner.attempts().slice(-2),e=>e.inputMethod),['typing','composer']);
});

test('mistakes in either script remain available together in the 60-second Journey review',async()=>{
  const g=await garden();start(g);g.answer('qq');const kata=g.app.state.target.id;answer(g);
  next(g,'kana:あ');g.answer('qq');answer(g);g.app.end('Synthetic mixed review');
  assert.equal(g.el('reviewPracticeBtn').classList.contains('hidden'),false);
  g.el('reviewPracticeBtn').onclick();g.skip();
  assert.equal(g.app.state.sessionDuration,60);assert.deepEqual([...g.app.state.reviewIds].sort(),[kata,'kana:あ'].sort());
  assert.equal(g.app.state.correct,0);assert.equal(g.app.state.lives,3);
});

test('mixed access and every original event survive play, save and reload; separate modes stay usable',async()=>{
  const saved=fixture(),g=await garden(saved);start(g);
  for(let i=0;i<12;i++){if(!g.app.state.drops.length)next(g);answer(g);}
  g.app.end('Synthetic persistence');await g.learner.flush();
  const before=JSON.parse(g.learner.export());const restored=await runtime({storage:g.storage});
  assert.deepEqual(plain(restored.learner.attempts()),before.attemptLedger);
  for(const e of saved.attemptLedger)assert.deepEqual(plain(restored.learner.attempts().find(x=>x.attemptId===e.attemptId)),e);
  assert.deepEqual(plain(restored.app.gameData.best),saved.games['kana-rain'].best);
  assert.equal(restored.app.gameData.journeyMixedUnlocked,true);start(restored);assert.equal(restored.app.state.journeyStage,'mixed');
  restored.app.end('Done');for(const mode of ['hira','kata']){
    restored.el('mode').value=mode;restored.el('mode').onchange();restored.app.start();restored.skip();
    assert.equal(data.kanaById[restored.app.state.target.id].script,mode==='hira'?'hiragana':'katakana');restored.app.end('Done');
  }
});

test('exploration can transition into mixed rain without granting any additional curriculum rows',async()=>{
  const saved=fixture();saved.attemptLedger=saved.attemptLedger.filter(e=>!(e.itemId==='kana:オ'&&e.attemptId.endsWith(':1')));
  const g=await runtime({explore:true,storage:[['jp-learner-v1',JSON.stringify(saved)]]});start(g);
  assert.equal(g.app.state.journeyStage,'katakana');
  if(g.app.state.target.id!=='kana:オ'){answer(g);next(g,'kana:オ');}answer(g);
  assert.equal(g.app.state.journeyStage,'mixed');assert.deepEqual(plain(g.app.gameData.rows),saved.games['kana-rain'].rows);
});

test('earned mixed access survives lower subsequent accuracy and only an explicit reset clears it',async()=>{
  const g=await garden();start(g);answer(g);next(g,'kana:ア');g.answer('qq');g.answer('qq');answer(g);
  assert.ok(g.learner.state('kana:ア').facets[FACET].firstCorrect/g.learner.state('kana:ア').facets[FACET].firstAttempts<.85);
  g.app.end('Synthetic reset boundary');await g.learner.flush();
  const restored=await runtime({storage:g.storage});start(restored);assert.equal(restored.app.state.journeyStage,'mixed');
  restored.app.end('Done');restored.el('resetBtn').onclick();start(restored);
  assert.equal(restored.app.state.journeyStage,'hiragana');assert.notEqual(restored.app.gameData.journeyMixedUnlocked,true);
  assert.equal(restored.app.gameData.katakanaUnlocked,false);
});
