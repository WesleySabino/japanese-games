const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const source = name => fs.readFileSync(path.join(__dirname, '../src', name + '.js'), 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const KEY = 'jp-learner-v1';
function seed() {
  return { version: 2, created: 1, sequence: 0, items: {}, reveals: {}, attemptLedger: [], exposureLedger: [], errorLog: [],
    games: { 'kana-rain': { rows: { hiragana: 2, katakana: 1 }, best: { old: 900 }, katakanaUnlocked: true,
      accuracy: { hira: { attempts: 100, correct: 80 } }, sessions: 10, sound: true, preserved: { custom: 42 },
      novelty: { version: 1, pace: 'calm', seen: {}, recent: [], blocked: false, cooldownRemaining: 0 } } } };
}
async function tab(map, options = {}) {
  const events = new Map();
  const store = { get length() { return map.size; }, key: i => [...map.keys()][i] || null,
    getItem: k => map.get(k) || null, removeItem: k => map.delete(k),
    setItem(k, v) { if (options.denied?.value) throw new Error('quota'); map.set(k, v); } };
  const context = vm.createContext({ localStorage: store, crypto: { randomUUID }, console, navigator: options.navigator || {},
    addEventListener: (name, fn) => events.set(name, fn) });
  context.window = context;
  const previous=options.previous?require('./helpers/update-fixture.cjs').baselineBuild('1.12.0'):null;
  vm.runInContext(previous?previous.files.get('/src/learner.js').toString():source('learner'), context);
  if(options.novelty!==false)vm.runInContext(previous?previous.files.get('/src/novelty.js').toString():source('novelty'), context);
  await context.Learner.ready;
  const L = context.Learner, gd = L.gameData('kana-rain');
  return { L, gd, N: context.KanaNovelty, hide: () => events.get('pagehide')(), saved: () => JSON.parse(L.export()) };
}
function shared() { return new Map([[KEY, JSON.stringify(seed())]]); }
function hit(t, id, extra = {}) {
  t.L.record(id, 'form→sound', { firstAttempt: true, assistance: false, correct: true, gameId: 'kana-rain', deferSave: true, ...extra });
  t.gd.accuracy.hira.attempts++; t.gd.accuracy.hira.correct++;
}
test('stale tabs add evidence and counters once, retain earned rows/settings and keep live references', async () => {
  const map = shared(), a = await tab(map), b = await tab(map), gd = b.gd, novelty = gd.novelty;
  hit(a, 'kana:あ'); a.gd.rows.hiragana = 3; a.gd.sound = false; a.gd.sessions++;
  a.N.markSeen(a.gd.novelty, 'kana:あ'); await a.L.flush();
  hit(b, 'kana:い'); b.gd.rows.katakana = 2; b.gd.sessions++; b.N.markSeen(novelty, 'kana:い'); await b.L.flush();
  await a.hide(); await b.hide(); await b.L.flush();
  const restored = await tab(map), saved = restored.saved(), data = saved.games['kana-rain'];
  assert.equal(saved.attemptLedger.length, 2); assert.equal(new Set(saved.attemptLedger.map(e => e.attemptId)).size, 2);
  assert.deepEqual(data.accuracy.hira, { attempts: 102, correct: 82 }); assert.equal(data.sessions, 12);
  assert.deepEqual(data.rows, { hiragana: 3, katakana: 2 }); assert.equal(data.sound, false);
  assert.deepEqual(data.best, { old: 900 }); assert.deepEqual(data.preserved, { custom: 42 }); assert.equal(data.katakanaUnlocked, true);
  assert.deepEqual(data.novelty.seen, { 'kana:あ': true, 'kana:い': true });
  assert.equal(b.L.gameData('kana-rain'), gd); assert.equal(gd.novelty, novelty);
  assert.equal(restored.L.state('kana:あ').facets['form→sound'].correct, 1);
});
test('a stale success cannot clear a concurrent failure pause or repeat a recovery sample', async () => {
  const map = shared(), a = await tab(map), b = await tab(map);
  a.L.record('kana:あ', 'form→sound', { correct: false, firstAttempt: true, gameId: 'kana-rain', deferSave: true });
  a.N.pause(a.gd.novelty); await a.L.flush();
  hit(b, 'kana:い'); b.N.finish(b.gd.novelty, { roundId: 'recovery', firstCorrect: true, familiar: true }); await b.L.flush();
  assert.equal(b.gd.novelty.cooldownRemaining, 9);
  await b.L.flush(); await a.hide();
  const restored = await tab(map); assert.equal(restored.gd.novelty.cooldownRemaining, 9);
  assert.equal(restored.gd.novelty.recent.filter(r => r.roundId === 'recovery').length, 1);
});
test('pagehide synchronously journals deferred changes even when the commit lock never runs', async () => {
  const map = shared(), a = await tab(map, { navigator: { locks: { request: () => new Promise(() => {}) } } });
  hit(a, 'kana:う'); a.gd.sessions++; a.hide(); // Intentionally do not await a closing page's queued work.
  assert.equal(JSON.parse(map.get(KEY)).attemptLedger.length, 0, 'canonical snapshot has not been written');
  const logs = [...map].filter(([key]) => key.startsWith(KEY + ':pending:')).flatMap(([, v]) => JSON.parse(v));
  assert.equal(logs[0].attempts[0].itemId, 'kana:う');
  const denied = { value: true }, restored = await tab(map, { denied });
  assert.equal(restored.L.attempts().length, 1, 'full write quota must not prevent reading the recovery journal');
  assert.equal(restored.gd.accuracy.hira.correct, 81); assert.equal(restored.gd.sessions, 11);
  denied.value = false;
  await restored.L.flush(); await restored.L.flush();
  assert.equal((await tab(map)).gd.sessions, 11, 'recovery is idempotent');
});
test('failed writes keep pending local changes until storage recovers', async () => {
  const denied = { value: false }, map = shared(), a = await tab(map, { denied }), b = await tab(map);
  denied.value = true; hit(a, 'kana:え'); assert.equal((await a.L.flush()).saved, false);
  hit(b, 'kana:お'); await b.L.flush(); denied.value = false; await a.L.flush();
  const restored = await tab(map); assert.equal(restored.L.attempts().length, 2);
  assert.equal(restored.gd.accuracy.hira.correct, 82);
});
test('explicit reset and import create a new generation that stale pagehide cannot resurrect', async () => {
  const map = shared(), a = await tab(map), b = await tab(map);
  hit(a, 'kana:あ'); await a.L.flush(); await b.L.reset(); await a.hide();
  const cleared = await tab(map); assert.equal(cleared.L.attempts().length, 0); assert.deepEqual(plain(cleared.gd), {});
  const imported = seed(); imported.games['kana-rain'].rows.hiragana = 8;
  await b.L.import(JSON.stringify(imported)); await a.hide();
  const restored = await tab(map); assert.equal(restored.gd.rows.hiragana, 8); assert.equal(restored.L.attempts().length, 0);
});
test('new session and exposure identifiers are unique across tabs sharing the same stored sequence', async () => {
  const map = shared(), a = await tab(map), b = await tab(map);
  const sessions = [a.L.beginSession('kana-rain'), b.L.beginSession('kana-rain'), a.L.beginSession('kana-rain')];
  assert.equal(new Set(sessions).size, 3);
  const one = a.L.recordExposure('kana:あ', 'form→sound'), two = b.L.recordExposure('kana:あ', 'form→sound');
  assert.notEqual(one.exposureId, two.exposureId); await a.hide(); await b.hide();
  assert.equal((await tab(map)).L.exposures().length, 2);
});
test('old attempts/exposures retain their exact shape and aggregate counts after repeated merges', async () => {
  const map = shared(), a = await tab(map); hit(a, 'kana:あ'); a.L.recordExposure('kana:あ', 'form→sound', { exposureId: 'old-reference' });
  await a.L.flush(); const before = a.saved(), b = await tab(map); hit(b, 'kana:あ'); await b.L.flush();
  await a.hide(); await b.hide(); const restored = await tab(map), after = restored.saved();
  assert.deepEqual(after.attemptLedger[0], before.attemptLedger[0]); assert.deepEqual(after.exposureLedger[0], before.exposureLedger[0]);
  assert.equal(restored.L.state('kana:あ').facets['form→sound'].correct, 2);
  assert.equal(after.attemptLedger.length, 2); assert.equal(after.exposureLedger.length, 1);
  assert.deepEqual(plain(restored.gd.accuracy.hira), { attempts: 102, correct: 82 });
});
test('a rejected commit lock reports the durable journal truthfully and recovers on reload', async () => {
  const map = shared(), a = await tab(map, { navigator: { locks: { request: () => Promise.reject(new Error('lock unavailable')) } } });
  hit(a, 'kana:あ'); const result = await a.L.flush();
  assert.equal(result.saved, true); assert.equal(result.backend, 'journal'); assert.equal(a.L.persistenceStatus().state, 'saved');
  const restored = await tab(map); assert.equal(restored.L.attempts().length, 1); assert.equal(restored.gd.accuracy.hira.correct, 81);
});
test('a new Katakana failure resets the pause even when the stale tab already displayed ten recovery hits', async () => {
  const fixture = seed(); fixture.games['kana-rain'].katakanaNovelty = { ...plain(fixture.games['kana-rain'].novelty), cooldownRemaining: 10 };
  const map = new Map([[KEY, JSON.stringify(fixture)]]), a = await tab(map), b = await tab(map);
  for (let n = 0; n < 10; n++) a.N.finish(a.gd.katakanaNovelty, { roundId: 'kata-recovery:' + n, firstCorrect: true, familiar: true });
  await a.L.flush(); assert.equal(a.gd.katakanaNovelty.cooldownRemaining, 0);
  b.L.record('kana:ア', 'form→sound', { correct: false, firstAttempt: true, gameId: 'kana-rain', deferSave: true });
  b.N.pause(b.gd.novelty); b.N.pause(b.gd.katakanaNovelty); await b.L.flush();
  assert.equal((await tab(map)).gd.katakanaNovelty.cooldownRemaining, 10);
});

function defaultBrakeFixture(){
  const saved=seed();
  for(const [name,char]of [['novelty','あ'],['katakanaNovelty','ア']])saved.games['kana-rain'][name]={version:1,pace:'calm',seen:{['kana:'+char]:true},blocked:true,cooldownRemaining:0,
    recent:Array.from({length:60},(_,i)=>({roundId:name+':old:'+i,firstCorrect:i>=6,timeout:i<2,miss:i>=2&&i<6,familiar:true}))};
  return saved;
}
function finishDefaultHits(t){
  for(const [name,char]of [['novelty','あ'],['katakanaNovelty','ア']]){
    const roundId=name+':new-hit';
    hit(t,'kana:'+char,{attemptId:roundId,roundId});
    t.N.finish(t.gd[name],{roundId,firstCorrect:true,familiar:true});
    assert.equal(t.gd[name].blocked,true,'four real misses still close the default gate before consolidation');
  }
}
for(const pace of ['balanced','bold'])test(`a stale 1.12.0 ${pace} preference cannot shorten either default gate during flush, close and reload`,async()=>{
  const fixture=defaultBrakeFixture(),map=new Map([[KEY,JSON.stringify(fixture)]]),current=await tab(map),previous=await tab(map,{previous:true});
  assert.equal(previous.N.profile(pace).windowSize,pace==='bold'?12:30,'the stale tab really uses the published policy');
  for(const name of ['novelty','katakanaNovelty']){current.N.create({novelty:current.gd[name]});previous.N.setPace(previous.gd[name],pace);}
  await previous.L.flush();
  for(const name of ['novelty','katakanaNovelty'])assert.equal(JSON.parse(map.get(KEY+':protected:v1')).games['kana-rain'][name].pace,pace,'the old tab preference really reaches shared storage');
  await current.L.flush();
  for(const name of ['novelty','katakanaNovelty']){assert.equal(current.gd[name].pace,'calm','the active tab normalizes an adopted old preference');assert.equal(current.gd[name].blocked,true,'default pressure applies before another answer');}
  finishDefaultHits(current);await current.L.flush();
  for(const name of ['novelty','katakanaNovelty'])assert.equal(current.gd[name].blocked,true,name+' stays blocked after consolidation');
  const before=current.saved();await previous.hide();await current.hide();const reloaded=await tab(map);
  for(const name of ['novelty','katakanaNovelty']){
    assert.equal(reloaded.gd[name].blocked,true,name+' stays blocked after both tabs close and reload');
    assert.equal(reloaded.gd[name].pace,'calm');
    assert.deepEqual(plain(reloaded.gd[name].recent),plain(before.games['kana-rain'][name].recent));
    assert.equal(reloaded.gd[name].recent.length,60);assert.equal(reloaded.gd[name].recent.filter(r=>r.miss).length,4);
  }
  assert.deepEqual(reloaded.saved().attemptLedger,before.attemptLedger);assert.equal(reloaded.L.attempts().length,2);
  assert.deepEqual(plain(reloaded.gd.rows),fixture.games['kana-rain'].rows);assert.deepEqual(plain(reloaded.gd.best),fixture.games['kana-rain'].best);
});

for(const pace of ['balanced','bold'])test(`preload replay of a pending ${pace} journal uses the default gate before novelty.js loads`,async()=>{
  const fixture=defaultBrakeFixture();for(const name of ['novelty','katakanaNovelty'])fixture.games['kana-rain'][name].pace=pace;
  const map=new Map([[KEY,JSON.stringify(fixture)]]),current=await tab(map,{navigator:{locks:{request:()=>new Promise(()=>{})}}});
  // Same as a new active tab receiving the old preference after its initial normalization.
  finishDefaultHits(current);current.hide();
  const journals=[...map].filter(([key])=>key.startsWith(KEY+':pending:'));assert.equal(journals.length,1);
  assert.equal(JSON.parse(journals[0][1]).flatMap(op=>op.novelty).length,2,'both real gate operations were journaled');
  const reloaded=await tab(map,{novelty:false});assert.equal(reloaded.N,undefined,'replay really ran before the policy module existed');
  for(const name of ['novelty','katakanaNovelty']){
    assert.equal(reloaded.gd[name].blocked,true,name+' remains blocked during preload journal replay');
    assert.equal(reloaded.gd[name].pace,'calm');
    assert.equal(reloaded.gd[name].recent.length,60);assert.equal(reloaded.gd[name].recent.filter(r=>r.miss).length,4);
  }
  assert.equal(reloaded.L.attempts().length,2);await reloaded.L.flush();await reloaded.hide();
  const again=await tab(map);assert.equal(again.L.attempts().length,2,'repeated recovery never reapplies facts');
  for(const name of ['novelty','katakanaNovelty'])assert.equal(again.gd[name].blocked,true,name+' still blocked after durable reload');
});
