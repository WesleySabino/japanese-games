'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {runtime}=require('./runtime-harness.cjs'),{fixture}=require('./helpers/journey-fixture.cjs'),Novelty=require('../src/novelty.js');
const Rain=require('../src/difficulty.js'),{baselineBuild}=require('./helpers/update-fixture.cjs');
const plain=value=>JSON.parse(JSON.stringify(value)),FACET='form→sound';

async function historicalGarden(difficulty,pace){
  const saved=fixture(),gd=saved.games['kana-rain'];
  const recent=prefix=>Array.from({length:4},(_,i)=>({roundId:prefix+i,firstCorrect:false,timeout:i===0,miss:i>0,familiar:true}));
  Object.assign(gd,{difficulty,journeyMixedUnlocked:true,reducedEffects:true,
    best:{'hira:normal:180':1981,'arcade-v2:kata:hard:180':321,retired:{points:444}},
    accuracy:{hira:{attempts:53,correct:50},kata:{attempts:15,correct:12}},
    novelty:{...gd.novelty,pace,recent:recent('old:h:'),blocked:true,cooldownRemaining:7},
    katakanaNovelty:{version:1,pace,seen:Object.fromEntries(['ア','イ','ウ','エ','オ'].map(k=>['kana:'+k,true])),recent:recent('old:k:'),blocked:true,cooldownRemaining:6}});
  // Build/export this snapshot with the previously published learner rather than
  // asking the candidate to construct its own expected historical evidence.
  const storage=new Map([['jp-learner-v1',JSON.stringify(saved)]]),box=vm.createContext({Date,Math,JSON,console,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
  box.window=box;vm.runInContext(fs.readFileSync(path.join(__dirname,'fixtures/learner-1.12.0.js'),'utf8'),box);await box.Learner.ready;
  box.Learner.recordExposure('kana:ア',FACET,{exposureId:'old:pronunciation',gameId:'kana-rain',reason:'reference-panel',now:1700000200000});
  box.Learner.record('kana:イ','script→script',{attemptId:'old:paired-script',roundId:'old:paired-script',correct:true,firstAttempt:true,gameId:'kana-rain',response:'い',now:1700000300000});
  await box.Learner.flush();return JSON.parse(box.Learner.export());
}

function preserved(before,after){
  assert.equal(after.version,before.version);
  for(const e of before.attemptLedger)assert.deepEqual(after.attemptLedger.find(x=>x.attemptId===e.attemptId),e,'historical attempt '+e.attemptId);
  for(const e of before.exposureLedger)assert.deepEqual(after.exposureLedger.find(x=>x.exposureId===e.exposureId),e,'historical reference '+e.exposureId);
  for(const [id,item]of Object.entries(before.items))assert.deepEqual(after.items[id].facets,item.facets,'learning facets '+id);
  const a=after.games['kana-rain'],b=before.games['kana-rain'];
  for(const key of ['difficulty','rows','best','accuracy','katakanaUnlocked','journeyMixedUnlocked','reducedEffects','sound'])assert.deepEqual(a[key],b[key],key+' retained');
  for(const key of ['novelty','katakanaNovelty']){
    assert.equal(a[key].pace,'calm');
    for(const field of ['seen','recent','blocked','cooldownRemaining'])assert.deepEqual(a[key][field],b[key][field],key+'.'+field+' retained');
    assert.equal(Novelty.constantsFor(a[key]).windowSize,60);assert.equal(Novelty.constantsFor(a[key]).recoveryHits,55);
  }
}

for(const [difficulty,pace]of [['normal','balanced'],['hard','bold']])for(const mode of ['hira','kata','journey']){
  test(`retired ${difficulty}/${pace} becomes the default in ${mode} without losing progress or admission pressure`,async()=>{
    const before=await historicalGarden(difficulty,pace),g=await runtime({storage:[['jp-learner-v1',JSON.stringify(before)]]});
    preserved(before,JSON.parse(g.learner.export()));
    assert.equal(g.app.settings.difficulty,undefined);assert.equal(g.app.difficultyProfiles,undefined);
    g.el('mode').value=mode;g.el('mode').onchange();g.app.start();g.skip();
    assert.equal(g.app.state.mode,mode);assert.equal(g.app.state.difficulty,undefined);assert.equal(g.app.state.totalLives,3);assert.equal(g.app.state.sessionDuration,180);assert.equal(g.app.state.speed,.1);assert.equal(g.app.state.gap,2400);
    assert.doesNotMatch(g.el('gameLabel').textContent,/\b(?:easy|normal|hard)\b/i);
    if(mode==='journey')assert.equal(g.app.state.journeyStage,'mixed');
    g.app.pause(true);g.app.pause(false);g.app.end('Session complete');
    assert.doesNotMatch(g.el('gameLabel').textContent+' '+g.el('resultMessage').textContent,/\b(?:easy|normal|hard)\b/i);
    await g.learner.flush();const restored=await runtime({storage:g.storage});
    preserved(before,JSON.parse(restored.learner.export()));
    assert.equal(restored.app.settings.noveltyPace,'calm');assert.equal(restored.app.settings.difficulty,undefined);
    assert.equal(new Set(restored.learner.attempts().map(e=>e.attemptId)).size,before.attemptLedger.length,'boot/play/reload never invents answers');
  });
}

test('only the default novelty profile remains executable and retired selections cannot shorten its brake',()=>{
  assert.deepEqual(Object.keys(Novelty.profiles),['calm']);
  for(const id of ['calm','balanced','bold','normal','hard','easy','unknown']){
    assert.equal(Novelty.profile(id).id,'calm');
    const state=Novelty.create({novelty:{version:1,pace:id,seen:{'kana:あ':true},recent:[],blocked:true,cooldownRemaining:4}});
    assert.equal(state.pace,'calm');assert.equal(state.blocked,true);assert.equal(state.cooldownRemaining,4);
    Novelty.setPace(state,id);assert.equal(state.pace,'calm');assert.equal(Novelty.constantsFor(state).recoveryHits,55);assert.equal(state.cooldownRemaining,4);
  }
});

test('default timing and admission transitions exactly match the published Easy behavior',()=>{
  const build=baselineBuild('1.12.0'),box=vm.createContext({});
  for(const name of ['difficulty','novelty'])vm.runInContext(build.files.get('/src/'+name+'.js').toString(),box);
  for(const seconds of [undefined,NaN,Infinity,-5,0,1.6,20,60,90,150,180,36000])assert.deepEqual(Rain.atTime(seconds),plain(box.KanaDifficulty.atTime('easy',seconds)));
  const old=box.KanaNovelty.create({}),current=Novelty.create({});
  assert.deepEqual(Novelty.constantsFor(current),plain(box.KanaNovelty.constantsFor(old)));
  for(let i=0;i<150;i++){
    const miss=i>=12&&i<16,timeout=i===45||i===46,event={roundId:'same:'+i,firstCorrect:!miss&&!timeout,miss,timeout,familiar:i!==17};
    box.KanaNovelty.finish(old,event);Novelty.finish(current,event);
    assert.deepEqual(current,plain(old),'default brake transition after round '+i);
  }
});

for(const [mode,unseen]of [['hira','kana:か'],['kata','kana:カ']])test(`a stale tab cannot reopen ${mode} admissions between snapshot adoption and the next answer`,async()=>{
  const saved=await historicalGarden('hard','bold');
  for(const [name,pressure]of Object.entries(saved.games['kana-rain']).filter(([name])=>['novelty','katakanaNovelty'].includes(name))){
    pressure.pace='calm';pressure.cooldownRemaining=0;pressure.blocked=true;
    pressure.recent=Array.from({length:60},(_,i)=>({roundId:name+':tail:'+i,firstCorrect:i>=6,timeout:i<2,miss:i>=2&&i<6,familiar:true}));
  }
  delete saved.games['kana-rain'].novelty.seen[unseen];
  const g=await runtime({storage:[['jp-learner-v1',JSON.stringify(saved)]]});g.el('mode').value=mode;g.el('mode').onchange();g.app.start();g.skip();await g.learner.flush();
  const map=g.storage,old=vm.createContext({Date,Math,JSON,console,localStorage:{get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}});old.window=old;
  const build=baselineBuild('1.12.0');for(const name of ['learner','novelty'])vm.runInContext(build.files.get('/src/'+name+'.js').toString(),old);await old.Learner.ready;
  const previous=old.Learner.gameData('kana-rain');for(const name of ['novelty','katakanaNovelty'])old.KanaNovelty.setPace(previous[name],'bold');
  assert.equal(previous.novelty.blocked,false);assert.equal(previous.katakanaNovelty.blocked,false,'the old runtime actually reopens its shorter gate');
  await old.Learner.flush();
  assert.equal(JSON.parse(map.get('jp-learner-v1:protected:v1')).games['kana-rain'].novelty.pace,'bold','the stale snapshot really reaches shared storage');
  await g.learner.flush();
  const s=g.app.state;s.drops=[];s.target=null;s.queue=[{id:unseen}];s.sinceSpawn=99999;s.familiarSinceIntroduction=3;g.tick();
  assert.ok(s.drops.length,'known practice continues');assert.ok(s.drops.every(d=>d.id!==unseen),'default pressure rejects a premature queued presentation');
  assert.equal(g.app.gameData.novelty.seen[unseen],undefined,'rejected presentation is never marked introduced');
  assert.equal(g.app.gameData[mode==='kata'?'katakanaNovelty':'novelty'].blocked,true,'admission checks reapply the fixed policy before any new answer');
});
