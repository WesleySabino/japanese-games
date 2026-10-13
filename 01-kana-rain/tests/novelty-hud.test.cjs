const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Novelty=require('../src/novelty.js');
const Hud=require('../src/novelty-hud.js');
const game=(extra={})=>({mode:'hira',newIds:new Set(),familiarSinceIntroduction:0,drops:[],...extra});
const view=(state,current=game(),options={})=>Hud.snapshot(state,current,{constants:Novelty.constants,...options});
const finish=(state,id,extra={})=>Novelty.finish(state,{roundId:id,firstCorrect:true,...extra});

test('novelty HUD exposes the same read-only API in browser and CommonJS',()=>{
  const context=vm.createContext({});
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../src/novelty-hud.js'),'utf8'),context);
  assert.deepEqual(Object.keys(context.KanaNoveltyHud),Object.keys(Hud));
});

test('pressure display keeps the actual persisted gate, including hysteresis',()=>{
  const state=Novelty.create({});
  finish(state,'t1',{timeout:true});finish(state,'t2',{timeout:true});
  for(let i=0;i<30;i++)finish(state,`corrected:${i}`,{firstCorrect:false});
  const result=view(state);
  assert.equal(result.gateLabel,'ON HOLD');assert.equal(result.reason,'recovery');
  assert.equal(result.expired,0);assert.equal(result.hits,0);assert.equal(result.sampleCount,30);
  for(let i=0;i<24;i++)finish(state,`hit:${i}`);
  assert.equal(view(state).gateLabel,'ON HOLD','24 first-try hits cannot reopen the gate');
  finish(state,'hit:24');
  assert.equal(view(state).gateLabel,'OPEN');
});

test('recent counters show actual completed samples instead of inventing a full window',()=>{
  const state=Novelty.create({});
  finish(state,'first');finish(state,'corrected',{firstCorrect:false});finish(state,'expired',{timeout:true});
  const result=view(state);
  assert.equal(result.sampleCount,3);assert.equal(result.windowSize,30);
  assert.equal(result.hits,1);assert.equal(result.expired,1);
  assert.equal(result.recentText,'Last 3 / 30 drops: 1 first-try hits · 1 expired');
  assert.match(result.detail,/Recovery needs 30 completed drops, at least 25 first-try hits and at most 1 expired/);
  assert.equal(view(Novelty.create({})).sampleCount,0);
});

test('open pressure gate explains warmup, active debuts and session budget independently',()=>{
  const state=Novelty.create({});
  let result=view(state,game({familiarSinceIntroduction:2}));
  assert.equal(result.gateLabel,'OPEN');assert.equal(result.reason,'spacing');
  assert.equal(result.sessionText,'Familiar drops 2 / 3');
  result=view(state,game({newIds:new Set(['kana:さ']),drops:[{id:'kana:さ',isIntroduction:true}],familiarSinceIntroduction:8}));
  assert.equal(result.reason,'on-screen');assert.equal(result.introduced,1);assert.equal(result.familiar,3);
  result=view(state,game({newIds:new Set(['kana:さ','kana:し']),familiarSinceIntroduction:9}));
  assert.equal(result.gateLabel,'OPEN');assert.equal(result.reason,'budget');assert.equal(result.introduced,2);
  result=view(state,game({familiarSinceIntroduction:3}));
  assert.equal(result.reason,'eligible');assert.equal(result.sessionText,'Eligible when selected');
});

test('starter exceptions are visible without falsely opening the saved pressure gate',()=>{
  const state=Novelty.create({});finish(state,'t1',{timeout:true});finish(state,'t2',{timeout:true});
  let result=view(state,game({newIds:new Set(['kana:さ','kana:し'])}),{starterAvailable:true});
  assert.equal(result.gateLabel,'ON HOLD');assert.equal(result.reason,'starter');assert.equal(result.introduced,2);
  assert.match(result.detail,/excluded from the introduced counter/);
  result=view(state,game({drops:[{id:'kana:あ',isIntroduction:true}]}),{starterAvailable:true});
  assert.equal(result.reason,'on-screen');assert.equal(result.introduced,0);
});

test('no familiar candidates bypasses spacing, matching the real admission rule',()=>{
  assert.equal(view(Novelty.create({}),game(),{knownAvailable:false}).reason,'eligible');
});

test('only kana-reading modes receive the panel, including review and practice',()=>{
  const state=Novelty.create({});
  for(const mode of ['hira','kata','mix'])assert.equal(view(state,game({mode,playStyle:'practice',reviewIds:['kana:あ']})).visible,true);
  for(const mode of ['words','pair'])assert.deepEqual(view(state,game({mode})),{visible:false});
  assert.deepEqual(view(state,null),{visible:false});
});

test('repeated rendering does not change history, introduction budgets or gameplay state',()=>{
  const state=Novelty.create({});finish(state,'hit');
  const current=game({newIds:new Set(['kana:さ']),drops:[{id:'kana:さ',isIntroduction:true}],familiarSinceIntroduction:2});
  const before=JSON.stringify({state,current,newIds:[...current.newIds]});
  Object.freeze(state.recent[0]);Object.freeze(state.recent);Object.freeze(state.seen);Object.freeze(state);
  Object.freeze(current.drops[0]);Object.freeze(current.drops);Object.freeze(current);
  const first=view(state,current);
  for(let i=0;i<100;i++)assert.deepEqual(view(state,current),first);
  assert.equal(JSON.stringify({state,current,newIds:[...current.newIds]}),before);
});
