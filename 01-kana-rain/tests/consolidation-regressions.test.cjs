'use strict';
// Compare optimized consolidation with the pinned production learner. All data is synthetic.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createHash}=require('node:crypto');
const KEY='jp-learner-v1',PRIMARY=KEY+':protected:v1',FACET='form→sound';
const baseline=fs.readFileSync(path.join(__dirname,'fixtures/learner-1.11.1.js'),'utf8');
assert.equal(createHash('sha256').update(baseline.replace(/\r\n/g,'\n')).digest('hex'),'cdeac72f7937c24bcc0aabb5308d1313afd40bda2830604a406ee21855e91a72');
const current=fs.readFileSync(path.join(__dirname,'../src/learner.js'),'utf8');
const novelty=fs.readFileSync(path.join(__dirname,'../src/novelty.js'),'utf8');
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
function attempt(id,itemId='kana:あ',extra={}){return {attemptId:id,itemId,facet:FACET,gameId:'kana-rain',sessionId:'synthetic-session',roundId:id,at:100000,firstAttempt:true,assistance:false,assistanceReasons:[],outcome:'correct',correct:true,reason:'accepted',response:'a',...extra};}
function exposure(id,itemId='kana:ア',at=90000){return {exposureId:id,itemId,facet:FACET,at,reason:'reference',gameId:'kana-rain',sessionId:'synthetic-session',roundId:id};}
function seed(){return {version:2,created:1,updatedAt:1,sequence:3,items:{'kana:ろ':{itemId:'kana:ろ',firstSeen:1,flags:{legacyNote:true},legacyFacets:{[FACET]:{reps:8,correct:6,errors:2,stability:2,difficulty:5,lastReview:50000}},facets:{}}},reveals:{},errorLog:[],attemptLedger:[attempt('seed-a'),attempt('seed-i','kana:い',{at:110000})],exposureLedger:[exposure('seed-reference')],games:{'kana-rain':{rows:{hiragana:27,katakana:9},best:{oldPoints:900},sessions:4,katakanaUnlocked:true,sound:false,reducedEffects:true,difficulty:'easy',accuracy:{hira:{attempts:20,correct:18}},custom:{keep:['historical',4]},novelty:{version:1,pace:'calm',seen:{'kana:あ':true},recent:[],blocked:false,cooldownRemaining:0},katakanaNovelty:{version:1,pace:'calm',seen:{'kana:ア':true},recent:[],blocked:false,cooldownRemaining:0}}},_sync:{epoch:{id:'legacy:1',at:0},applied:{}}};}
function storage(initial=seed(),idb=true){return {local:new Map([[PRIMARY,JSON.stringify(initial)]]),idb:idb?new Map([[PRIMARY,clone(initial)]]):null,clock:200000};}
async function load(code,shared,name='tab-a',options={}){
  const callbacks=new Map();class Clock extends Date{constructor(...args){super(...(args.length?args:[shared.clock]));}static now(){return shared.clock;}}
  const localStorage={get length(){return shared.local.size;},key:n=>[...shared.local.keys()][n]||null,getItem:k=>shared.local.get(k)||null,removeItem:k=>shared.local.delete(k),setItem(k,v){if(options.quota?.value)throw new Error('synthetic quota');shared.local.set(k,v);}};
  const indexedDB=shared.idb?{open(){const request={};queueMicrotask(()=>{request.result={transaction(){const tx={};let complete;const later=()=>{clearImmediate(complete);complete=setImmediate(()=>tx.oncomplete?.());};tx.objectStore=()=>({get(k){const read={};queueMicrotask(()=>{read.result=clone(shared.idb.get(k));read.onsuccess?.();later();});return read;},put(v,k){shared.idb.set(k,clone(v));options.onPut?.(k,v);later();return {};}});tx.abort=()=>{clearImmediate(complete);queueMicrotask(()=>tx.onabort?.());};return tx;},close(){}};request.onsuccess?.();});return request;}}:undefined;
  const context=vm.createContext({Date:Clock,localStorage,indexedDB,crypto:{randomUUID:()=>name},navigator:options.navigator||{locks:{request:(_key,fn)=>Promise.resolve().then(fn)}},addEventListener:(type,fn)=>callbacks.set(type,fn),console});
  context.window=context;vm.runInContext(code,context);vm.runInContext(novelty,context);await context.Learner.ready;
  const L=context.Learner;return {L,N:context.KanaNovelty,gd:L.gameData('kana-rain'),read:()=>JSON.parse(L.export()),hide:()=>callbacks.get('pagehide')(),context};
}
function record(tab,id,itemId='kana:あ',extra={}){tab.L.record(itemId,FACET,{attemptId:id,now:150000,gameId:'kana-rain',correct:true,firstAttempt:true,assistance:false,response:'a',deferSave:true,...extra});}
async function compare(run){const before=await run(baseline),after=await run(current);assert.deepEqual(after,before,'optimized history, derived evidence and metadata match production semantics');return after;}
function unique(saved){assert.equal(new Set(saved.attemptLedger.map(e=>e.attemptId)).size,saved.attemptLedger.length);assert.equal(new Set(saved.exposureLedger.map(e=>e.exposureId)).size,saved.exposureLedger.length);}

for(const descending of [false,true])test('consolidation matches production for mixed append/replay with '+(descending?'out-of-order':'ordered')+' timestamps',async()=>{
  await compare(async code=>{const shared=storage(),tab=await load(code,shared),points=[];
    for(let i=0;i<9;i++){
      shared.clock=200000+i*1000;const at=descending?180000-i*5000:120000+i*5000;
      if(i%3===0)tab.L.recordExposure('kana:ア',FACET,{exposureId:'reference:'+i,now:at-500,gameId:'kana-rain',reason:i%2?'audio':'correction',deferSave:true});
      record(tab,'append:'+i,i%2?'kana:ア':'kana:あ',{now:at,correct:i%3!==1,outcome:i%4===3?'timeout':undefined,assistance:i%3===0?true:i%3===1?null:false,firstAttempt:i%4!==2,chosenItemId:i%3===1?'kana:い':null,firstResponseMs:800+i*13});
      tab.gd.accuracy.hira.attempts++;if(i%3!==1)tab.gd.accuracy.hira.correct++;tab.N.markSeen(tab.gd.novelty,i%2?'kana:ア':'kana:あ');
      await tab.L.flush();unique(tab.read());points.push(tab.read());
    }
    const again=await load(code,shared,'reload');points.push(again.read());return points;
  });
});

test('IDB snapshots with equal counts and revision but different facts cannot reuse an older cached interpretation',async()=>{
  const result=await compare(async code=>{const shared=storage(),tab=await load(code,shared);await tab.L.flush();
    const changed=clone(shared.idb.get(PRIMARY));changed.attemptLedger[1]=attempt('same-count-new-fact','kana:う',{at:130000});changed.exposureLedger[0]=exposure('same-count-new-reference','kana:イ',140000);
    // Keep epoch, vector, timestamps and ledger lengths identical: only full content proves equality.
    shared.idb.set(PRIMARY,changed);await tab.L.flush();const saved=tab.read();unique(saved);return saved;
  });
  assert.deepEqual(result.attemptLedger.map(e=>e.attemptId).sort(),['same-count-new-fact','seed-a','seed-i']);
  assert.deepEqual(result.exposureLedger.map(e=>e.exposureId).sort(),['same-count-new-reference','seed-reference']);
});

test('mutable public state and returned event objects cannot alias a previous durable snapshot',async()=>{
  await compare(async code=>{const shared=storage(),tab=await load(code,shared);await tab.L.flush();
    tab.L.attempts()[0].response='changed only through live return value';tab.L.exposures()[0].reason='changed live reference';tab.L.state('kana:あ').facets[FACET].correct=123456;
    record(tab,'next-fact','kana:う');await tab.L.flush();return {live:tab.read(),reload:(await load(code,shared,'reload')).read()};
  });
});

test('mid-flight public event and facet aliases do not replace committed facts or derived evidence',async()=>{
  const result=await compare(async code=>{const shared=storage();let tab,armed=false;
    tab=await load(code,shared,'mid-flight',{onPut(key){if(key!==PRIMARY||!armed)return;armed=false;
      // prepare() has already installed its independent public copy, while the
      // native transaction has not completed. Public readers may retain aliases.
      const answerAlias=tab.L.attempts()[0],referenceAlias=tab.L.exposures()[0],facetAlias=tab.L.state('kana:あ').facets[FACET];
      answerAlias.response='unsupported mutation during commit';referenceAlias.reason='unsupported mutation during commit';facetAlias.correct=123456;
    }});
    record(tab,'mid-flight-new-fact','kana:う');armed=true;await tab.L.flush();assert.equal(armed,false,'the mutation hook ran before transaction completion');
    return {live:tab.read(),reload:(await load(code,shared,'reload')).read()};
  });
  assert.equal(result.live.attemptLedger[0].response,'a');assert.equal(result.live.exposureLedger[0].reason,'reference');assert.equal(result.live.items['kana:あ'].facets[FACET].correct,1);
  assert.deepEqual(result.live.attemptLedger,result.reload.attemptLedger,'public answer facts and durable facts remain consistent');
  assert.deepEqual(result.live.exposureLedger,result.reload.exposureLedger,'public reference facts and durable facts remain consistent');
  assert.deepEqual(result.live.items,result.reload.items,'public derived evidence and durable evidence remain consistent');
});

test('unchanged ledger IDs and revision do not hide a richer legacy baseline or earned metadata',async()=>{
  const result=await compare(async code=>{const shared=storage(),tab=await load(code,shared);await tab.L.flush();
    const changed=clone(shared.idb.get(PRIMARY));changed.items['kana:ろ'].legacyFacets[FACET].correct=12;changed.items['kana:ろ'].legacyFacets[FACET].reps=14;changed.items['kana:ろ'].flags.otherHistoricalFlag=true;changed.games['kana-rain'].rows.katakana=14;changed.games['kana-rain'].best.importedLegacy=1600;
    shared.idb.set(PRIMARY,changed);await tab.L.flush();await tab.L.flush();return {saved:tab.read(),reload:(await load(code,shared,'reload')).read()};
  });
  assert.equal(result.reload.items['kana:ろ'].facets[FACET].correct,12);assert.equal(result.reload.games['kana-rain'].rows.katakana,14);assert.equal(result.reload.games['kana-rain'].best.importedLegacy,1600);
});

test('consolidation retains JSON-compatible semantics for public game data',async()=>{
  await compare(async code=>{const shared=storage(),tab=await load(code,shared);
    const value={absent:undefined,nan:NaN,positive:Infinity,negative:-Infinity,zero:-0,sparse:[,undefined,NaN,Infinity,-0],nested:{keep:true},date:new Date(123456)};
    const custom={keep:5};Object.defineProperty(custom,'toJSON',{enumerable:false,value(){return {rendered:true};}});value.custom=custom;
    tab.gd.extension=value;record(tab,'json-compatible');await tab.L.flush();return {live:tab.read(),reload:(await load(code,shared,'reload')).read()};
  });
});

test('stale tabs keep live references, references/help evidence and earned metadata through repeated consolidation',async()=>{
  await compare(async code=>{const shared=storage(),a=await load(code,shared,'a'),b=await load(code,shared,'b'),gd=b.gd,noveltyRef=gd.novelty;
    a.L.recordExposure('kana:ア',FACET,{exposureId:'live-help',now:210000,reason:'audio',gameId:'kana-rain',deferSave:true});record(a,'a-fact','kana:い',{now:211000});a.gd.rows.katakana=10;a.gd.sessions++;a.gd.sound=true;await a.L.flush();
    record(b,'b-late','kana:う',{now:190000,correct:false,chosenItemId:'kana:え'});b.N.pause(b.gd.novelty);b.gd.best.katakana=1500;b.gd.sessions++;await b.L.flush();
    assert.equal(b.L.gameData('kana-rain'),gd);assert.equal(gd.novelty,noveltyRef);
    await a.hide();await b.hide();await a.L.flush();await b.L.flush();const reload=await load(code,shared,'reload');unique(reload.read());return {saved:reload.read(),help:clone(reload.L.assistanceFor('kana:ア',FACET,211001))};
  });
});

test('acknowledged journals repair missing events while preserving their saved counter deltas exactly once',async()=>{
  const saved=await compare(async code=>{const initial=seed();initial._sync.applied.remote=3;const shared=storage(initial),op={writer:'remote',seq:3,sequence:6,epoch:clone(initial._sync.epoch),at:190000,attempts:[attempt('acknowledged-but-missing','kana:ア',{at:160000})],exposures:[exposure('acknowledged-reference','kana:ア',159000)],games:[{path:['kana-rain','sessions'],kind:'add',value:1},{path:['kana-rain','rows','katakana'],kind:'max',value:12}],novelty:[],items:{}};
    shared.local.set(KEY+':pending:remote',JSON.stringify([op]));let tab=await load(code,shared);for(let i=0;i<3;i++){await tab.L.flush();tab=await load(code,shared,'reload-'+i);}unique(tab.read());return tab.read();
  });
  assert(saved.attemptLedger.some(e=>e.attemptId==='acknowledged-but-missing'));assert(saved.exposureLedger.some(e=>e.exposureId==='acknowledged-reference'));assert.equal(saved.games['kana-rain'].sessions,4);assert.equal(saved.games['kana-rain'].rows.katakana,12);
});

test('additive estimated baselines and reset epochs retain production behavior after warm saves',async()=>{
  await compare(async code=>{const shared=storage(),a=await load(code,shared,'a'),stale=await load(code,shared,'stale');record(a,'before-import');await a.L.flush();
    const imported=seed();imported.attemptLedger.push(attempt('import-fact','kana:ア'));imported.items['kana:ろ'].legacyFacets[FACET].stability=8;imported.items['kana:ろ'].legacyFacets[FACET].correct=10;imported.items['kana:ろ'].legacyFacets[FACET].reps=12;imported.manualReconstruction=[{kind:'synthetic-estimate',at:1}];imported.games['kana-rain'].rows.katakana=11;imported.games['kana-rain'].sound=true;
    await a.L.importProgress(JSON.stringify(imported));await a.L.flush();const importedState=a.read();record(stale,'stale-after-import','kana:え');await stale.hide();await a.L.flush();const joined=a.read();
    shared.clock=300000;await a.L.reset();await stale.hide();const reset=(await load(code,shared,'after-reset')).read();return {importedState,joined,reset};
  });
});

for(const version of [1,2])test('warm legacy '+version+' normalization preserves missing review timestamps across clock advances and checkpoint recovery',async()=>{
  await compare(async code=>{const initial=seed();initial.version=version;
    delete initial.items['kana:ろ'].legacyFacets[FACET].lastReview;
    if(version===1){initial.items['kana:ろ'].facets=clone(initial.items['kana:ろ'].legacyFacets);delete initial.items['kana:ろ'].legacyFacets;delete initial.attemptLedger;delete initial.exposureLedger;delete initial.reveals;}
    const shared=storage(initial);shared.local.set(KEY,JSON.stringify(initial));shared.idb.set(KEY,clone(initial));let tab=await load(code,shared),points=[];
    for(const now of [200000,280000,390000]){shared.clock=now;await tab.L.flush();await new Promise(resolve=>setImmediate(resolve));points.push(tab.read());}
    // A new immutable fact still follows the same normalization/replay rules.
    shared.clock=450000;record(tab,'new-after-clock-change','kana:い',{now:449000});await tab.L.flush();await new Promise(resolve=>setImmediate(resolve));points.push(tab.read());
    // Use the actual checkpoint after corrupting both primaries and removing smaller legacy mirrors.
    shared.local.set(PRIMARY,'{invalid');shared.idb.set(PRIMARY,{version:2,items:null,games:null});shared.local.delete(KEY);shared.idb.delete(KEY);
    shared.clock=550000;tab=await load(code,shared,'checkpoint-recovery');points.push(tab.read());return points;
  });
});
