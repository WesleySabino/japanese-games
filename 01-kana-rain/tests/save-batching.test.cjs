'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createHash}=require('node:crypto');
const KEY='jp-learner-v1',PRIMARY=KEY+':protected:v1',FACET='form→sound';
const current=fs.readFileSync(path.join(__dirname,'../src/learner.js'),'utf8'),baseline=fs.readFileSync(path.join(__dirname,'fixtures/learner-1.12.0.js'),'utf8');
assert.equal(createHash('sha256').update(baseline.replace(/\r\n/g,'\n')).digest('hex'),'11c250e1e483920d2e2dff3ed64bdcbf6fa3fd3fe65b7fbf43de147f21f7688d');
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));
const seed=()=>({version:2,created:1,updatedAt:1,sequence:0,items:{},reveals:{},errorLog:[],attemptLedger:[],exposureLedger:[],games:{'kana-rain':{rows:{hiragana:27,katakana:9},sessions:5,best:{old:900},accuracy:{hira:{attempts:0,correct:0}},katakanaUnlocked:true,journeyMixedUnlocked:true}}});
function shared(){const s=seed();return {local:new Map([[PRIMARY,JSON.stringify(s)]]),idb:new Map([[PRIMARY,clone(s)]]),puts:0};}
function locks(){const jobs=[];return {jobs,request(_name,fn){return new Promise((resolve,reject)=>jobs.push({fn,resolve,reject}));},async run(){const j=jobs.shift();assert.ok(j,'a Web Lock job exists');try{j.resolve(await j.fn());}catch(e){j.reject(e);}},reject(){jobs.shift().reject(new Error('synthetic rejected lock'));}};}
async function load(s,{code=current,lock=locks(),id='a',quota={value:false},onPut}={}){
  const listeners=new Map(),store={get length(){return s.local.size;},key:i=>[...s.local.keys()][i],getItem:k=>s.local.get(k)||null,removeItem:k=>s.local.delete(k),setItem(k,v){if(quota.value)throw Error('synthetic quota');s.local.set(k,v);}};
  const indexedDB={open(){const r={};queueMicrotask(()=>{r.result={transaction(){const tx={};let job;const later=()=>{clearImmediate(job);job=setImmediate(()=>tx.oncomplete?.());};tx.objectStore=()=>({get(k){const q={};queueMicrotask(()=>{q.result=clone(s.idb.get(k));q.onsuccess?.();later();});return q;},put(v,k){if(k===PRIMARY)s.puts++;s.idb.set(k,clone(v));onPut?.(k,v);later();return {};}});tx.abort=()=>{clearImmediate(job);queueMicrotask(()=>tx.onabort?.());};return tx;},close(){}};r.onsuccess?.();});return r;}};
  class Clock extends Date{static now(){return 200000;}}
  const box=vm.createContext({Date:Clock,localStorage:store,indexedDB,navigator:{locks:lock},crypto:{randomUUID:()=>id},addEventListener:(name,fn)=>listeners.set(name,fn),console});box.window=box;vm.runInContext(code,box);await box.Learner.ready;
  return {L:box.Learner,gd:box.Learner.gameData('kana-rain'),lock,hide:()=>listeners.get('pagehide')(),saved:()=>JSON.parse(box.Learner.export())};
}
function hit(t,id){t.L.record('kana:あ',FACET,{attemptId:id,roundId:id,now:150000,correct:true,firstAttempt:true,gameId:'kana-rain',deferSave:true});t.gd.accuracy.hira.attempts++;t.gd.accuracy.hira.correct++;}
function journal(s){return [...s.local].filter(([k])=>k.startsWith(KEY+':pending:')).flatMap(([,v])=>JSON.parse(v));}

test('answer and visual/audio references journal immediately but share one queued consolidation',async()=>{
  const s=shared(),t=await load(s);hit(t,'answer');const a=t.L.flush();
  t.L.recordExposure('kana:あ',FACET,{exposureId:'visual',now:150001,reason:'answer-feedback',gameId:'kana-rain',deferSave:true});const b=t.L.flush();
  t.L.recordExposure('kana:あ',FACET,{exposureId:'audio',now:150002,reason:'answer-feedback',gameId:'kana-rain',deferSave:true});const c=t.L.flush();
  assert.equal(t.lock.jobs.length,1);assert.equal(a,b);assert.equal(b,c);assert.equal(s.puts,0);
  assert.deepEqual(journal(s).flatMap(op=>op.attempts).map(e=>e.attemptId),['answer']);
  assert.deepEqual(journal(s).flatMap(op=>op.exposures).map(e=>e.exposureId),['visual','audio']);
  let done=false;c.then(()=>done=true);await Promise.resolve();assert.equal(done,false,'a journal alone does not complete the queued transaction');
  await t.lock.run();const results=await Promise.all([a,b,c]);assert.equal(s.puts,1);assert.ok(results.every(r=>r.indexedDB&&r.saved));
  assert.equal(t.L.persistenceStatus().revision,3);assert.equal(t.L.persistenceStatus().state,'saved');
  const restored=await load(s,{id:'reload'});assert.equal(restored.saved().attemptLedger.length,1);assert.equal(restored.saved().exposureLedger.length,2);assert.equal(restored.gd.accuracy.hira.correct,1);
});

test('closing before the shared lock starts retains every event and game counter in its own journal',async()=>{
  const s=shared(),t=await load(s);hit(t,'close-answer');t.gd.sessions++;t.L.flush();
  t.L.recordExposure('kana:ア',FACET,{exposureId:'close-audio',now:150001,gameId:'kana-rain',deferSave:true});t.L.flush();t.hide();
  assert.equal(t.lock.jobs.length,1);assert.equal(s.puts,0);
  const restored=await load(s,{id:'reload'});assert.deepEqual(restored.saved().attemptLedger.map(e=>e.attemptId),['close-answer']);assert.deepEqual(restored.saved().exposureLedger.map(e=>e.exposureId),['close-audio']);assert.equal(restored.gd.sessions,6);
  const p=restored.L.flush();await restored.lock.run();await p;assert.equal(restored.gd.accuracy.hira.correct,1);
});

test('a new event after transaction preparation queues a follow-up and cannot alias the committed snapshot',async()=>{
  const s=shared();let t,armed=false,follow;
  t=await load(s,{onPut(k){if(k===PRIMARY&&armed){armed=false;hit(t,'during-transaction');follow=t.L.flush();t.L.attempts()[0].response='unsupported live edit';}}});
  hit(t,'first');armed=true;const first=t.L.flush();await t.lock.run();await first;
  assert.equal(t.lock.jobs.length,1);assert.equal(t.L.persistenceStatus().state,'saving');
  await t.lock.run();await follow;assert.equal(s.puts,2);
  const restored=await load(s,{id:'reload'});assert.deepEqual(restored.saved().attemptLedger.map(e=>e.attemptId),['first','during-transaction']);assert.equal(restored.saved().attemptLedger[0].response,null);assert.equal(restored.gd.accuracy.hira.correct,2);
});

test('a rejected shared lock reports the newest unsaved revision and permits a later retry',async()=>{
  const s=shared(),quota={value:true},t=await load(s,{quota});hit(t,'quota-first');const a=t.L.flush();hit(t,'quota-second');const b=t.L.flush();
  assert.equal(t.lock.jobs.length,1);t.lock.reject();await Promise.all([a,b]);assert.equal(t.L.persistenceStatus().state,'unsaved');assert.equal(t.L.persistenceStatus().revision,2);
  quota.value=false;const retry=t.L.flush();assert.equal(t.lock.jobs.length,1);await t.lock.run();await retry;
  assert.equal(t.L.persistenceStatus().state,'saved');assert.equal((await load(s,{id:'reload'})).saved().attemptLedger.length,2);
});

test('private-tree copying matches the released JSON semantics and keeps mutable readers isolated',async()=>{
  async function scenario(code){const s=shared(),lock={request:(_name,fn)=>Promise.resolve().then(fn)},t=await load(s,{code,lock});
    t.gd.extension={nil:null,sparse:[,undefined,NaN,-0,Infinity],missing:undefined,nested:{bool:true,text:'あ\ud800',number:5},date:new Date(123456),toJSONWord:'literal'};
    const custom={};Object.defineProperty(custom,'toJSON',{value(){return {keyDependent:true};}});t.gd.extension.custom=custom;
    hit(t,'json-first');await t.L.flush();t.L.state('kana:あ').facets[FACET].correct=999;t.L.attempts()[0].response='live mutation';hit(t,'json-second');await t.L.flush();
    return {live:t.saved(),restored:(await load(s,{code,lock,id:'reload'})).saved()};
  }
  assert.deepEqual(await scenario(current),await scenario(baseline));
});
