const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=name=>fs.readFileSync(path.join(__dirname,'../src',name+'.js'),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));

async function model(options={}){
  let now=options.now||1700000000000;
  const map=options.map||new Map(),writes=[],journalWrites=[],serialization={stringifies:0,parses:0};
  class Clock extends Date{static now(){return now;}}
  const localStorage={getItem:k=>map.get(k)||null,setItem(k,v){if(options.denyStorage)throw new Error('denied');map.set(k,v);if(k==='jp-learner-v1')journalWrites.push(v);},removeItem:k=>map.delete(k)};
  const countedJSON=Object.create(JSON);countedJSON.stringify=(...args)=>{serialization.stringifies++;return JSON.stringify(...args);};countedJSON.parse=(...args)=>{serialization.parses++;return JSON.parse(...args);};
  const math=options.random?Object.assign(Object.create(Math),{random:options.random}):Math;
  const context=vm.createContext({Date:Clock,Math:math,JSON:options.countJSON?countedJSON:JSON,console,localStorage,queueMicrotask});context.window=context;
  if(options.idb){context.indexedDB={open(){const request={};queueMicrotask(()=>{request.result={transaction(name,mode){const tx={};tx.objectStore=()=>({get(){const read={};queueMicrotask(()=>{read.result=options.idbSaved;read.onsuccess?.();});return read;},put(snapshot,key){writes.push({tx,snapshot,key});return {};}});return tx;}};request.onsuccess?.();});return request;}};}
  vm.runInContext(source('data'),context);vm.runInContext(source('learner'),context);await context.Learner.ready;
  return {context,D:context.JPData,L:context.Learner,map,writes,journalWrites,serialization,advance:ms=>now+=ms};
}

async function game(options={}){
  const m=await model(options);if(options.prepare)options.prepare(m.L,m.D);
  const nodes=new Map(),listeners=new Map(),timers=new Map();let now=1000,frame,serial=0;
  class Element{
    constructor(id=''){this.id=id;this.value='';this.style={setProperty(){}};this.dataset={};this.children=[];this.open=false;this.clientWidth=800;this.clientHeight=600;this.offsetWidth=65;this.offsetHeight=85;this.options=['hira','kata'].map(value=>({value}));const classes=new Set();this.classList={add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:(x,on=!classes.has(x))=>{on?classes.add(x):classes.delete(x);return on;}};this.events=new Map();}
    setAttribute(k,v){this[k]=v;}querySelector(k){this.nested||=new Map();if(!this.nested.has(k))this.nested.set(k,new Element());return this.nested.get(k);}querySelectorAll(){return [];}addEventListener(k,v){this.events.set(k,v);}appendChild(c){this.children.push(c);}focus(){document.activeElement=this;}blur(){}remove(){this.removed=true;}contains(c){return this.children.includes(c);}showModal(){this.open=true;}close(){this.open=false;}getBoundingClientRect(){return {height:100};}
    get innerHTML(){return this.html||this.textContent||'';}set innerHTML(v){this.html=v;}
  }
  const el=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
  for(const id of ['scriptDialog','featureDialog','pauseOverlay','settingsDialog','progressDialog','helpDialog','results'])el(id);
  const document={body:new Element(),documentElement:new Element(),activeElement:null,hidden:false,getElementById:el,createElement:()=>new Element(),addEventListener:(k,v)=>listeners.set(k,v),querySelector:s=>s==='dialog[open]'?[...nodes.values()].find(x=>x.open):null,querySelectorAll:s=>s==='dialog.game-dialog[open]'?[...nodes.values()].filter(x=>x.open):s==='dialog.game-dialog'?[...nodes.values()].filter(x=>x.id.endsWith('Dialog')||['pauseOverlay','results'].includes(x.id)):[]};
  Object.assign(m.context,{document,location:{hostname:'127.0.0.1',search:options.explore?'?all':''},navigator:{},performance:{now:()=>now},URL,URLSearchParams,innerWidth:1000,innerHeight:800,matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{frame=fn;return 1;},cancelAnimationFrame:()=>frame=null,setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),confirm:()=>true,Blob,addEventListener:(k,v)=>listeners.set(k,v),KanaAudio:{enabled:true,ready:Promise.resolve(),available:true,play:async()=>false,stop(){},hasRecording:()=>false}});
  vm.runInContext(source('difficulty'),m.context);vm.runInContext(source('novelty'),m.context);await vm.runInContext(source('game'),m.context);
  const advance=(ms,playFrame=false)=>{now+=ms;m.advance(ms);for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}if(playFrame)frame?.(now);};
  return {...m,nodes,el,document,listeners,app:m.context.KanaRain,advance,skip:()=>el('skipCountdown').onclick(),submit:text=>{el('answer').value=text;el('answerForm').onsubmit({preventDefault(){}});},type:text=>{el('answer').value=text;el('answer').oninput();},continue:()=>el('continueFeedbackBtn').onclick(),tick:()=>advance(16,true)};
}
const first=(id,extra={})=>({attemptId:id,firstAttempt:true,assistance:false,correct:true,responseFormat:'romaji',gameId:'kana-rain',...extra});
function seedFamiliarReadings(L,D,ids=D.kana.map(k=>k.id)){
  // Real independent answers over six spaced reviews, rather than mutating aggregates.
  for(const id of ids)for(let review=0;review<6;review++)L.record(id,'form→sound',first(`familiar:${id}:${review}`,{now:1700000000000-(5-review)*7*86400000,deferSave:true}));
  L.flush();
}
function seededRandom(seed=42){return ()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);}
function nextDrop(g){
  if(!g.app.state.drops.length){g.app.state.sinceSpawn=99999;g.tick();}
  const drop=g.app.state.drops[0];assert.ok(drop,'an eligible drop is available');return drop;
}
function answerNext(g){const drop=nextDrop(g);g.submit(g.app.accepted(drop)[0]);return drop;}

test('continuous assisted arcade answers unlock K and S across paced sessions without independent evidence',async()=>{
  const g=await game({random:seededRandom()});
  const started=g.context.Date.now(),unlocks=[];
  for(let session=0;session<5&&g.app.gameData.rows.hiragana<3;session++){
    if(g.app.state)g.app.end('Next rain');g.app.start();g.skip();
    for(let answers=0;answers<100&&g.app.gameData.rows.hiragana<3;answers++){
      const before=g.app.gameData.rows.hiragana;answerNext(g);
      if(g.app.gameData.rows.hiragana!==before)unlocks.push(g.app.gameData.rows.hiragana);
    }
    assert.ok(g.app.state.newIds.size<=2,'the introduction budget survives every queue refill and unlock');
  }
  assert.deepEqual(unlocks,[2,3],'a fresh garden can earn two successive rows through actual answers');
  assert.ok(g.context.Date.now()-started<60000,'the whole run stays inside the assistance window');
  const attempts=g.L.attempts();assert.ok(attempts.length>=20);
  assert.ok(attempts.every(event=>event.correct&&event.firstAttempt&&event.assistance===true));
  assert.ok(g.L.exposures().some(event=>event.reason==='answer-feedback'),'normal reading feedback is retained');
  for(const k of g.D.kana.filter(k=>k.script==='hiragana'&&['a','k'].includes(k.row))){
    const f=g.L.state(k.id).facets['form→sound'];assert.ok(f.firstCorrect>=2,k.id);assert.equal(f.independentFirstCorrect,0,k.id);assert.equal(f.assistedCorrect,f.correct,k.id);
  }
  assert.equal(g.app.state.lives,3);assert.ok(g.app.state.streak>0);
  // Newly earned content must actually enter the ongoing rain, with its first-reading hint.
  let introduced;
  for(let n=0;n<24;n++){const drop=nextDrop(g);if(g.D.kanaById[drop.id].row==='s'){introduced=drop;break;}answerNext(g);}
  assert.ok(introduced,'an S-row kana enters the next batch');assert.ok(introduced.el.children.some(child=>child.className==='hint'));
});

test('correcting a wrong first answer and timing out do not earn first-answer unlock successes',async()=>{
  const g=await game({prepare(L,D){
    for(const k of D.kana.filter(k=>k.script==='hiragana'&&k.row==='a'&&k.char!=='あ'))for(let n=0;n<2;n++)L.record(k.id,'form→sound',first(`ready:${k.id}:${n}`,{assistance:true}));
  }});g.app.start({reviewIds:['kana:あ']});g.skip();
  const wrongDrop=nextDrop(g);g.submit('not-an-answer');assert.equal(wrongDrop.v,1.45,'arcade mistake acceleration remains');g.submit('a');
  let f=g.L.state('kana:あ').facets['form→sound'];assert.equal(f.correct,1);assert.equal(f.firstCorrect,0);assert.equal(f.firstAttempts,1);assert.equal(g.app.gameData.rows.hiragana,1);
  const missed=nextDrop(g);missed.progress=1;g.tick();
  f=g.L.state('kana:あ').facets['form→sound'];assert.equal(f.timeouts,1);assert.equal(f.firstCorrect,0);assert.equal(f.firstAttempts,1);assert.equal(g.app.state.lives,2);assert.equal(g.app.gameData.rows.hiragana,1);
  answerNext(g);f=g.L.state('kana:あ').facets['form→sound'];assert.equal(f.correct,2);assert.equal(f.firstCorrect,1);assert.equal(g.app.gameData.rows.hiragana,1,'two total successes cannot substitute for two first-answer successes');
});

test('the 85 percent first-answer threshold still gates every earlier unlocked row',async()=>{
  const g=await game({prepare(L,D){
    L.gameData('kana-rain').rows={hiragana:2,katakana:1};
    for(const k of D.kana.filter(k=>k.script==='hiragana'&&['a','k'].includes(k.row)))for(let n=0;n<(k.char==='あ'?4:2);n++)L.record(k.id,'form→sound',first(`ready:${k.id}:${n}`,{assistance:true}));
    L.record('kana:あ','form→sound',first('old-row-error',{correct:false,assistance:true}));
    L.recordExposure('kana:あ','form→sound',{reason:'answer-feedback'});
  }});g.app.start({reviewIds:['kana:あ']});g.skip();
  let f=g.L.state('kana:あ').facets['form→sound'];assert.equal(f.firstCorrect/f.firstAttempts,.8);
  answerNext(g);assert.equal(g.app.gameData.rows.hiragana,2,'5/6 in an earlier row still blocks S even when every K kana is ready');
  answerNext(g);f=g.L.state('kana:あ').facets['form→sound'];assert.equal(f.firstCorrect,6);assert.equal(f.firstAttempts,7);assert.equal(f.independentFirstCorrect,0);assert.equal(g.app.gameData.rows.hiragana,3,'6/7 first answers pass 85 percent without rewriting independence');
});

test('assisted progress and existing records survive reload and unlock the next row on another hit',async()=>{
  const original=await model(),gd=original.L.gameData('kana-rain');
  Object.assign(gd,{rows:{hiragana:2,katakana:3},best:{'hira:normal:180':1981,'kata:normal:180':321},accuracy:{hira:{attempts:20,correct:20}},playStyle:'arcade',sound:false,featuresIntro:{sokuon:true}});
  for(const k of original.D.kana.filter(k=>k.script==='hiragana'&&['a','k'].includes(k.row)))for(let n=0;n<2;n++)original.L.record(k.id,'form→sound',first(`saved:${k.id}:${n}`,{assistance:true,assistanceReasons:['recent-answer-feedback']}));
  original.L.recordExposure('kana:あ','form→sound',{exposureId:'saved-feedback',reason:'answer-feedback'});await original.L.flush();
  const saved=JSON.parse(original.L.export()),g=await game({map:original.map});
  assert.deepEqual(plain(g.L.attempts()),saved.attemptLedger);assert.deepEqual(plain(g.L.exposures().slice(0,saved.exposureLedger.length)),saved.exposureLedger);
  for(const key of ['rows','best','accuracy','featuresIntro'])assert.deepEqual(plain(g.app.gameData[key]),saved.games['kana-rain'][key]);assert.equal(g.app.gameData.novelty.version,1);
  g.app.start({reviewIds:['kana:あ']});g.skip();answerNext(g);assert.equal(g.app.gameData.rows.hiragana,3);assert.equal(g.app.gameData.rows.katakana,3);assert.deepEqual(plain(g.app.gameData.best),saved.games['kana-rain'].best);
  assert.deepEqual(plain(g.L.attempts().slice(0,saved.attemptLedger.length)),saved.attemptLedger,'old evidence is neither rewritten nor discarded');
  const again=await model({map:g.map}),after=JSON.parse(again.L.export());
  assert.equal(after.version,2);assert.deepEqual(after.games['kana-rain'].rows,{hiragana:3,katakana:3});assert.deepEqual(after.games['kana-rain'].best,saved.games['kana-rain'].best);assert.equal(after.attemptLedger.length,saved.attemptLedger.length+1);
  for(const k of original.D.kana.filter(k=>k.script==='hiragana'&&['a','k'].includes(k.row)))assert.equal(again.L.state(k.id).facets['form→sound'].independentFirstCorrect,0);
});

test('attempt IDs survive duplicate delivery and export/reload; timeout is not an invented wrong answer',async()=>{
  const m=await model();m.L.record('kana:あ','form→sound',first('a',{firstResponseMs:4000,inputActiveMs:300,displayActiveMs:4000,waitMs:3700}));m.L.record('kana:あ','form→sound',first('a'));
  m.L.record('kana:あ','script→script',first('b',{correct:null,outcome:'timeout',reason:'timeout',responseFormat:'katakana',firstResponseMs:null}));
  const reloaded=await model({map:m.map});const f=reloaded.L.state('kana:あ').facets;
  assert.equal(reloaded.L.attempts().length,2);assert.equal(f['form→sound'].correct,1);assert.equal(f['form→sound'].independentFirstCorrect,1);assert.equal(f['script→script'].timeouts,1);assert.equal(f['script→script'].errors,0);assert.equal(reloaded.L.recentErrors().length,0);
  reloaded.L.record('kana:あ','form→sound',first('a'));assert.equal(reloaded.L.attempts().length,2);assert.equal(reloaded.L.attempts()[0].waitMs,3700);
  await reloaded.L.import(m.L.export());assert.equal(reloaded.L.state('kana:あ').facets['form→sound'].correct,1);
});

test('legacy export keeps earned rows, unknown assistance and dated legacy errors without fabricating attempts',async()=>{
  const m=await model();const old={version:1,created:1,items:{'kana:あ':{itemId:'kana:あ',facets:{'form→sound':{correct:6,errors:1,unaided:5,stability:2,difficulty:5,lastReview:1,reps:7}},confusions:{'kana:い':2},flags:{},scaffold:{}}},games:{'kana-rain':{rows:{hiragana:8,katakana:4},best:{'hira:normal:180':22}}},errorLog:[{itemId:'kana:あ',confusedWith:'kana:い',at:5,gameId:'kana-rain'}]};
  await m.L.import(JSON.stringify(old));const exported=JSON.parse(m.L.export()),f=m.L.state('kana:あ').facets['form→sound'];
  assert.equal(f.correct,6);assert.equal(f.unknownCorrect,6);assert.equal(f.unaided,0);assert.equal(f.independentFirstCorrect,0);assert.equal(exported.attemptLedger.length,0);assert.equal(exported.legacyErrorLog[0].at,5);assert.equal(m.L.gameData('kana-rain').rows.hiragana,8);
  const again=await game({map:m.map});assert.equal(again.L.state('kana:あ').facets['form→sound'].correct,6);assert.equal(again.L.state('kana:あ').facets['form→sound'].unaided,0);
  assert.deepEqual(plain(again.app.gameData.rows),old.games['kana-rain'].rows);assert.deepEqual(plain(again.app.gameData.best),old.games['kana-rain'].best);assert.equal(again.L.state('kana:あ').facets['form→sound'].firstCorrect,0);assert.equal(again.L.attempts().length,0);
  const migrated=JSON.parse(again.L.export());assert.deepEqual(migrated.legacyErrorLog,old.errorLog);assert.equal(migrated.items['kana:あ'].legacyFacets['form→sound'].correct,6);
});

test('revealed answers stay assisted across future rounds until time and distinct intervening opportunities both pass',async()=>{
  const m=await model();m.L.recordExposure('kana:あ','form→sound',{reason:'reference-panel'});
  assert.equal(m.L.assistanceFor('kana:あ','form→sound').assisted,true);assert.equal(m.L.assistanceFor('kana:い','form→sound').assisted,false);
  m.advance(60001);assert.equal(m.L.assistanceFor('kana:あ','form→sound').assisted,true);
  m.L.record('kana:い','form→sound',first('i1'));m.L.record('kana:い','form→sound',first('i2'));assert.equal(m.L.assistanceFor('kana:あ','form→sound').assisted,true);
  m.L.record('kana:う','form→sound',first('u'));assert.equal(m.L.assistanceFor('kana:あ','form→sound').assisted,false);assert.deepEqual(plain(m.L.assistanceFor('kana:あ','form→sound').reasons),[]);
  const reload=await model({map:m.map,now:1700000060001});assert.equal(reload.L.assistanceFor('kana:あ','form→sound').assisted,false);
});

test('familiarity does not silently turn residence or typing latency into a speed score',async()=>{
  const a=await model(),b=await model();a.L.record('kana:あ','form→sound',first('fast',{firstResponseMs:50}));b.L.record('kana:あ','form→sound',first('slow',{firstResponseMs:20000}));assert.equal(a.L.mastery('kana:あ','form→sound'),b.L.mastery('kana:あ','form→sound'));
});

test('save waits for IndexedDB transaction completion and reports abort; journal success survives an IDB failure',async()=>{
  const m=await model({denyStorage:true,idb:true}),observed=[];m.L.subscribePersistence(s=>observed.push(s.state));const pending=m.L.flush();assert.equal(m.L.persistenceStatus().state,'saving');assert.equal(m.L.persistenceStatus().saved,false);m.writes[0].tx.onabort();assert.equal((await pending).saved,false);assert.equal(m.L.persistenceStatus().state,'unsaved');
  const again=m.L.flush();m.writes[1].tx.oncomplete();assert.equal((await again).backend,'indexedDB');assert.equal(m.L.persistenceStatus().state,'saved');assert.ok(observed.includes('unsaved'));
  const journal=await model({idb:true});const save=journal.L.flush();journal.writes[0].tx.onabort();assert.equal((await save).backend,'journal');assert.equal(journal.L.persistenceStatus().saved,true);
});

test('late completion of an older save cannot erase the latest unsaved warning',async()=>{
  const m=await model({denyStorage:true,idb:true});const older=m.L.flush(),newer=m.L.flush();m.writes[1].tx.onabort();await newer;m.writes[0].tx.oncomplete();await older;assert.equal(m.L.persistenceStatus().state,'unsaved');
});

test('deferred record batches its attempt and game accuracy in one immediately durable journal save',async()=>{
  const m=await model({countJSON:true}),stat=m.L.gameData('kana-rain').accuracy={attempts:0,correct:0};
  m.serialization.stringifies=0;m.serialization.parses=0;
  m.L.record('kana:あ','form→sound',first('batched',{deferSave:true}));stat.attempts++;stat.correct++;
  assert.equal(m.journalWrites.length,0);assert.equal(m.map.has('jp-learner-v1'),false);
  await m.L.flush();const saved=JSON.parse(m.journalWrites[0]);
  assert.equal(saved.attemptLedger.length,1);assert.equal(saved.items['kana:あ'].facets['form→sound'].independentFirstCorrect,1);assert.deepEqual(saved.games['kana-rain'].accuracy,{attempts:1,correct:1});
  assert.equal(m.journalWrites.length,1);assert.equal(m.serialization.stringifies,1);assert.equal(m.serialization.parses,0);
  m.L.record('kana:い','form→sound',first('immediate-default'));
  assert.equal(m.journalWrites.length,2);assert.equal(JSON.parse(m.journalWrites[1]).attemptLedger.length,2);
});

test('attempt and exposure indexes rebuild after import and reload, and reset permits reused IDs',async()=>{
  const seed=await model();seed.L.record('kana:あ','form→sound',first('indexed-attempt'));seed.L.recordExposure('kana:あ','form→sound',{exposureId:'indexed-exposure',reason:'reference-panel'});
  const imported=await model();await imported.L.import(seed.L.export());
  for(const m of [imported,await model({map:imported.map})]){
    m.L.record('kana:あ','form→sound',first('indexed-attempt'));m.L.recordExposure('kana:あ','form→sound',{exposureId:'indexed-exposure',reason:'audio-playback'});
    assert.equal(m.L.attempts().length,1);assert.equal(m.L.exposures().length,1);assert.equal(m.L.state('kana:あ').facets['form→sound'].correct,1);assert.equal(m.L.assistanceFor('kana:あ','form→sound').lastExposureReason,'reference-panel');
  }
  await imported.L.reset();imported.L.record('kana:あ','form→sound',first('indexed-attempt'));imported.L.recordExposure('kana:あ','form→sound',{exposureId:'indexed-exposure',reason:'audio-playback'});
  assert.equal(imported.L.attempts().length,1);assert.equal(imported.L.exposures().length,1);assert.equal(imported.L.assistanceFor('kana:あ','form→sound').lastExposureReason,'audio-playback');
});

test('one serialization supplies both backends and pending IndexedDB snapshots stay immutable',async()=>{
  const m=await model({idb:true,countJSON:true}),gd=m.L.gameData('kana-rain');gd.sessions=1;m.serialization.stringifies=0;m.serialization.parses=0;
  m.L.record('kana:あ','form→sound',first('snapshot-one'));const firstSnapshot=m.writes[0].snapshot;
  assert.deepEqual(plain(firstSnapshot),JSON.parse(m.journalWrites[0]));assert.equal(m.serialization.stringifies,1);assert.equal(m.serialization.parses,1);
  gd.sessions=2;m.L.record('kana:い','form→sound',first('snapshot-two'));
  assert.equal(firstSnapshot.games['kana-rain'].sessions,1);assert.equal(firstSnapshot.attemptLedger.length,1);assert.equal(m.writes[1].snapshot.games['kana-rain'].sessions,2);assert.equal(m.writes[1].snapshot.attemptLedger.length,2);
  m.writes[1].tx.oncomplete();m.writes[0].tx.onabort();assert.equal(m.L.persistenceStatus().state,'saved');assert.equal(m.L.persistenceStatus().backend,'journal+indexedDB');
});

test('a deferred answer keeps the latest failure warning when an older IndexedDB save succeeds later',async()=>{
  const m=await model({denyStorage:true,idb:true});m.L.record('kana:あ','form→sound',first('older-answer'));
  m.L.record('kana:い','form→sound',first('newer-answer',{deferSave:true}));m.L.gameData('kana-rain').accuracy={attempts:2,correct:2};const latest=m.L.flush();
  m.writes[1].tx.onabort();assert.equal((await latest).saved,false);m.writes[0].tx.oncomplete();
  assert.equal(m.L.persistenceStatus().state,'unsaved');assert.equal(m.L.persistenceStatus().saved,false);assert.equal(JSON.parse(m.L.export()).attemptLedger.length,2);assert.equal(m.writes[1].snapshot.games['kana-rain'].accuracy.attempts,2);
});

test('generated rounds always use romaji and reject copying the kana prompt',async()=>{
  const g=await game({prepare(L,D){seedFamiliarReadings(L,D,['kana:あ']);}});
  assert.ok(g.L.mastery('kana:あ','form→sound')>=.75);
  const round=g.app.generateRound({id:'kana:あ'});assert.equal(round.facet,'form→sound');assert.equal(round.responseFormat,'romaji');assert.deepEqual(plain(g.app.accepted(round)),['a']);assert.equal(g.app.score(round,{correct:true})[0].facet,'form→sound');assert.ok(!g.app.accepted('kana:い').includes('い'));assert.deepEqual(plain(g.app.accepted('w:ねこ')),[]);assert.throws(()=>g.app.generateRound({id:'w:ねこ'}),/Only kana/);
});

test('all familiar hiragana and katakana keep romaji answers through the unlocked catalogue',async()=>{
  const g=await game({explore:true,prepare:seedFamiliarReadings});
  for(const mode of ['hira','kata']){
    g.el('mode').value=mode;g.el('mode').onchange();assert.equal(g.app.settings.mode,mode);
    const ids=g.app.candidates();assert.ok(ids.length>0);
    for(const id of ids){const round=g.app.generateRound({id});assert.equal(round.responseFormat,'romaji');assert.equal(round.facet,'form→sound');assert.ok(!g.app.accepted(round).includes(id.slice(5)),mode+': copying prompt is rejected');}
  }
});

test('normal and review sessions keep their selected response format through repeated answers and pause/resume',async()=>{
  for(const mode of ['hira','kata']){
    const g=await game({explore:true,prepare(L,D){seedFamiliarReadings(L,D);Object.assign(L.gameData('kana-rain'),{scriptIntro:{hiragana:true}});}});
    g.el('mode').value=mode;g.el('mode').onchange();const reviewIds=plain(g.app.candidates().slice(0,3)),format='romaji',facet='form→sound';
    for(const review of [false,true]){
      g.app.start(review?{reviewIds}:{});g.skip();assert.equal(g.app.state.paused,false,`${mode}: session starts without an unexpected script introduction`);
      assert.equal(g.app.state.reviewIds!==null,review);
      const start=g.L.attempts().length;
      for(let answer=0;answer<6;answer++){
        if(!g.app.state.drops.length){g.app.state.sinceSpawn=99999;g.tick();}
        const round=g.app.state.drops[0];assert.ok(round,`${mode}: next round available`);
        assert.equal(round.responseFormat,format);assert.equal(round.facet,facet);
        if(review)assert.ok(reviewIds.includes(round.id),`${mode}: review remains inside its selected collection`);
        if(answer===2){g.app.pause(true);g.advance(2500);g.app.pause(false);g.skip();assert.equal(round.responseFormat,format);assert.equal(g.app.state.paused,false);}
        g.submit(g.app.accepted(round)[0]);
        assert.equal(g.app.state.countingDown,false);assert.equal(g.el('scriptDialog').open,false,'familiarity cannot introduce a new script midway through the session');
        const event=g.L.attempts().at(-1);assert.equal(event.correct,true);assert.equal(event.responseFormat,format);assert.equal(event.facet,facet);
      }
      const attempts=g.L.attempts().slice(start);assert.equal(attempts.length,6);assert.deepEqual([...new Set(attempts.map(event=>event.responseFormat))],[format]);assert.deepEqual([...new Set(attempts.map(event=>event.facet))],[facet]);
      g.app.end('Response-format regression complete');
    }
  }
});

test('a kana becoming familiar between drops cannot introduce script conversion into an ongoing reading review',async()=>{
  const g=await game();g.app.start({reviewIds:['kana:あ']});g.skip();
  assert.equal(g.app.state.drops[0].responseFormat,'romaji');assert.equal(g.L.mastery('kana:あ','form→sound'),0);
  g.submit('a');seedFamiliarReadings(g.L,g.D,['kana:あ']);assert.ok(g.L.mastery('kana:あ','form→sound')>=.75);
  g.app.state.sinceSpawn=99999;g.tick();const next=g.app.state.drops[0];assert.equal(next.id,'kana:あ');
  assert.equal(next.responseFormat,'romaji');assert.equal(next.facet,'form→sound');
  assert.equal(g.el('scriptDialog').open,false);assert.equal(g.app.state.paused,false);
  g.submit('a');assert.equal(g.L.attempts().at(-1).facet,'form→sound');assert.equal(g.L.attempts().at(-1).responseFormat,'romaji');
});





test('arcade correction cannot replace the first committed latency and remains assisted on retry',async()=>{
  const g=await game({prepare(L){L.gameData('kana-rain').playStyle='arcade';}});g.app.start();g.skip();g.advance(4000);g.type('x');g.advance(700);g.submit('x');const firstEvent=g.L.attempts()[0];assert.equal(firstEvent.firstResponseMs,4700);assert.equal(firstEvent.inputActiveMs,700);assert.equal(firstEvent.waitMs,4000);
  const d=g.app.state.drops[0];g.advance(2000);g.submit(g.app.accepted(d)[0]);const second=g.L.attempts()[1];assert.equal(second.firstAttempt,false);assert.equal(second.firstResponseMs,4700);assert.equal(second.assistance,true);assert.ok(second.assistanceReasons.includes('previous-incorrect-attempt'));assert.equal(g.L.state(d.id).facets[d.facet].independentFirstCorrect,0);
});

test('homophone readings remain ambiguous without inventing a personal confusion',async()=>{
  const g=await game({explore:true});g.app.start();g.skip();g.submit('ji');const ambiguous=g.L.attempts()[0];assert.equal(ambiguous.reason,'ambiguous-reading');assert.equal(ambiguous.chosenItemId,null);assert.deepEqual(plain(ambiguous.candidateItemIds),['kana:じ','kana:ぢ']);assert.equal(g.L.recentErrors().length,0);
});

test('reference panel and target audio mark relevant reading help without affecting unrelated kana',async()=>{
  const g=await game({prepare(L){L.record('kana:あ','form→sound',first('known'));}});g.app.start();g.skip();g.el('gardenBtn').onclick();assert.ok(g.app.state.drops[0].assistanceReasons.has('reference-panel'));assert.ok(g.L.exposures().some(e=>e.reason==='reference-panel'));
  const h=await game();h.app.start({reviewIds:['kana:あ']});h.skip();await h.el('listenBtn').onclick();assert.equal(h.L.assistanceFor('kana:あ','form→sound').assisted,true);assert.equal(h.L.assistanceFor('kana:か','form→sound').assisted,false);
});

test('a round presented while a reveal is recent stays assisted even if the clock later passes the spacing rule',async()=>{
  const g=await game({prepare(L){L.record('kana:あ','form→sound',first('known'));}});g.app.start({reviewIds:['kana:あ']});g.skip();const d=g.app.state.drops[0];assert.equal(d.id,'kana:あ');
  g.advance(60001);g.L.record('kana:い','form→sound',first('intervening-i'));g.L.record('kana:う','form→sound',first('intervening-u'));assert.equal(g.L.assistanceFor('kana:あ','form→sound').assisted,false);
  g.submit('a');const response=g.L.attempts().at(-1);assert.equal(response.assistance,true);assert.ok(response.assistanceReasons.some(r=>r.includes('lesson-reference')));
});


test('both storage failures keep gameplay and export available with truthful persistent UI',async()=>{
  const g=await game({denyStorage:true});assert.equal(g.L.persistenceStatus().state,'unsaved');assert.ok(!g.el('storageNotice').classList.contains('hidden'));assert.ok(g.el('storageNotice').innerHTML.includes('Export progress'));assert.match(g.el('saveStatus').textContent,/only in memory/);assert.doesNotMatch(g.el('offlineStatus').textContent,/saved/);g.app.start();g.skip();g.submit('a');assert.ok(g.L.export().includes('attemptLedger'));assert.equal(g.app.state.over,false);assert.ok(!g.el('storageNotice').classList.contains('hidden'));
});

test('opening analytics preferences while already paused never resumes the game',async()=>{
  const g=await game();g.app.start();g.skip();g.el('settingsBtn').onclick();assert.equal(g.app.state.paused,true);g.listeners.get('nihongo-analytics-settings-open')();assert.equal(g.app.state.paused,true);assert.equal(g.app.state.countingDown,false);
});

function pacingGarden(L,D){
  L.gameData('kana-rain').rows={hiragana:3,katakana:1};
  for(const k of D.kana.filter(k=>k.script==='hiragana'&&k.row==='a'))L.record(k.id,'form→sound',first('introduced:'+k.id));
}

test('familiar openings, spacing and two debuts survive many queues without reducing the known repertoire',async()=>{
  const g=await game({random:seededRandom(27),prepare:pacingGarden});g.app.start();g.skip();
  const debuts=[],seenKnown=new Set();let familiar=0;
  for(let i=0;i<80;i++){
    const d=nextDrop(g);
    if(d.isIntroduction){assert.ok(familiar>=3,'three completed familiar drops precede every debut');debuts.push(d.id);familiar=0;}
    else{familiar++;seenKnown.add(d.id);}
    g.submit(g.app.accepted(d)[0]);
  }
  assert.equal(debuts.length,2);assert.equal(new Set(debuts).size,2);assert.equal(g.app.state.newIds.size,2);
  assert.equal(g.app.candidates().length,15,'all three unlocked rows remain eligible');
  assert.ok(seenKnown.size>=5);assert.equal(g.app.state.correct,80);assert.equal(g.app.state.lives,3);
});

test('only one debut is in flight, including unseen partners and repeated queued copies',async()=>{
  const g=await game({prepare:pacingGarden});g.app.start();g.skip();
  for(let i=0;i<3;i++)answerNext(g);
  g.app.state.queue=[{id:'kana:か',partner:'kana:き'},{id:'kana:か'},{id:'kana:い'}];
  nextDrop(g);
  assert.equal(g.app.state.drops.filter(d=>d.isIntroduction).length,1);
  assert.equal(g.app.state.newIds.size,1);
  assert.equal(g.app.gameData.novelty.seen['kana:か'],true,'presentation is saved before any answer');
  assert.equal(g.app.gameData.novelty.seen['kana:き'],undefined);
  g.app.state.sinceSpawn=99999;g.tick();
  assert.equal(g.app.state.drops.length,2,'familiar rain can continue alongside a debut');
  assert.equal(g.app.state.drops.filter(d=>d.id==='kana:か').length,1);
  assert.equal(g.app.state.drops.filter(d=>d.isIntroduction).length,1);
  const reload=await game({map:g.map});
  assert.equal(reload.app.gameData.novelty.seen['kana:か'],true);
  assert.equal(reload.app.gameData.novelty.seen['kana:き'],undefined);
});

test('imported pressure blocks queued discoveries and real confusion partners but keeps familiar drops flowing',async()=>{
  const g=await game({prepare(L,D){pacingGarden(L,D);for(let i=0;i<4;i++){L.record('kana:あ','form→sound',first('miss:'+i+':1',{roundId:'miss:'+i,correct:false}));L.record('kana:あ','form→sound',first('miss:'+i+':2',{roundId:'miss:'+i,firstAttempt:false}));}}});
  g.app.start();g.skip();assert.equal(g.app.gameData.novelty.blocked,true);
  const d=nextDrop(g);g.submit('ka');assert.equal(d.wrong,1);assert.ok(g.app.state.queue.some(e=>e.partner==='kana:か'));
  g.submit(g.app.accepted(d)[0]);
  const pair=g.app.state.queue.find(e=>e.partner==='kana:か');g.app.state.queue=[{id:'kana:き'},pair];
  nextDrop(g);assert.ok(g.app.state.drops.every(d=>!d.isIntroduction));assert.equal(g.app.state.newIds.size,0);
  assert.equal(g.app.gameData.novelty.seen['kana:か'],undefined);assert.equal(g.app.gameData.novelty.seen['kana:き'],undefined);
  // Exhausting the visible plan cannot starve the field while new content is deferred.
  g.app.state.queue=[{id:'kana:き'}];g.submit(g.app.accepted(g.app.state.drops[0])[0]);
  assert.ok(nextDrop(g));assert.equal(g.app.gameData.novelty.blocked,true);
  g.app.end('Restart');g.app.start();g.skip();assert.equal(g.app.state.newIds.size,0);assert.equal(nextDrop(g).isIntroduction,false);
});

test('completed-drop pressure persists across restart and reload, then recovers through actual hits',async()=>{
  const g=await game({prepare:pacingGarden});g.app.start({reviewIds:['kana:あ']});g.skip();
  for(let i=0;i<2;i++){nextDrop(g).progress=1;g.tick();}
  assert.equal(g.app.gameData.novelty.blocked,true,'two expirations close admission');assert.equal(g.app.state.lives,1);
  for(let i=0;i<3;i++){const d=nextDrop(g);g.submit('zzz');g.submit(g.app.accepted(d)[0]);}
  assert.equal(g.app.gameData.novelty.blocked,true,'the expiration brake remains closed');
  const d=nextDrop(g);g.submit('zzz');g.submit(g.app.accepted(d)[0]);
  assert.equal(g.app.gameData.novelty.blocked,true,'four wrong first answers on a familiar kana close admission');assert.equal(g.app.state.lives,1);
  const window=plain(g.app.gameData.novelty.recent),attempts=plain(g.L.attempts());
  g.app.end('Restart');const reloaded=await game({map:g.map});
  assert.deepEqual(plain(reloaded.app.gameData.novelty.recent),window);assert.deepEqual(plain(reloaded.L.attempts()),attempts);
  reloaded.app.start({reviewIds:['kana:あ']});reloaded.skip();
  // Five starter hits, two expirations and four misses precede the fresh hits.
  for(let i=0;i<56;i++)answerNext(reloaded);
  assert.equal(reloaded.app.gameData.novelty.blocked,true,'56 correct with four misses still in the window is still blocked');
  answerNext(reloaded);assert.equal(reloaded.app.gameData.novelty.blocked,false,'57 first-try hits and three misses reopen admission');
  assert.equal(reloaded.app.gameData.novelty.recent.length,60);assert.equal(reloaded.app.state.lives,3);
});

test('multiple wrong submissions and their final correction or expiry each resolve just one drop',async()=>{
  const g=await game({prepare:pacingGarden});g.app.start({reviewIds:['kana:あ']});g.skip();
  const before=g.app.gameData.novelty.recent.length;g.submit('zzz');g.submit('zzz');
  assert.equal(g.app.gameData.novelty.recent.length,before,'intermediate errors do not resolve a drop');
  g.submit('a');assert.equal(g.app.gameData.novelty.recent.length,before+1);
  assert.equal(g.app.gameData.novelty.recent.at(-1).firstCorrect,false);
  assert.equal(g.app.gameData.novelty.recent.at(-1).miss,true,'a corrected familiar drop is one reading miss');
  const d=nextDrop(g);g.submit('zzz');d.progress=1;g.tick();
  assert.equal(g.app.gameData.novelty.recent.length,before+2);
  assert.equal(g.app.gameData.novelty.recent.at(-1).timeout,true);
  assert.equal(g.app.gameData.novelty.recent.at(-1).miss,true,'a wrong first answer still counts when the drop then expires');
  nextDrop(g).progress=1;g.tick();
  assert.equal(g.app.gameData.novelty.recent.at(-1).timeout,true);
  assert.equal(g.app.gameData.novelty.recent.at(-1).miss,false,'an untouched expiration is not a reading miss');
  assert.equal(g.L.state('kana:あ').facets['form→sound'].timeouts,2);
});

test('a wrong first answer on a debut is not a reading miss',async()=>{
  const g=await game({prepare:pacingGarden});g.app.start();g.skip();
  for(let i=0;i<3;i++)answerNext(g);
  g.app.state.queue=[{id:'kana:か'}];const d=nextDrop(g);assert.equal(d.isIntroduction,true);
  g.submit('zzz');g.submit(g.app.accepted(d)[0]);
  assert.deepEqual(plain(g.app.gameData.novelty.recent.at(-1)),{roundId:d.roundId,firstCorrect:false,timeout:false,miss:false,familiar:false});
  g.app.state.queue=[{id:'kana:か'}];const again=nextDrop(g);assert.equal(again.isIntroduction,false);
  g.submit('zzz');g.submit(g.app.accepted(again)[0]);
  assert.equal(g.app.gameData.novelty.recent.at(-1).miss,true,'the same kana counts once it has been seen');
});


test('one starter bootstraps an empty alphabet but other vowels respect pressure',async()=>{
  const g=await game({prepare(L){L.gameData('kana-rain').novelty={version:1,seen:{},recent:[],blocked:true};}});
  g.app.start();g.skip();const starters=new Set();
  for(let i=0;i<20;i++){
    const d=nextDrop(g);if(d.isIntroduction&&g.D.kanaById[d.id].row==='a')starters.add(d.id);
    g.app.state.sinceSpawn=99999;g.tick();assert.ok(g.app.state.drops.filter(d=>d.isIntroduction).length<=1);
    g.submit(g.app.accepted(d)[0]);
  }
  assert.equal(starters.size,1);assert.equal(g.app.state.newIds.size,0);assert.ok(g.app.state.correct>=20);
  assert.equal(g.app.gameData.novelty.blocked,true);
  for(let i=0;i<60;i++)answerNext(g);
  assert.equal(g.app.gameData.novelty.blocked,false,'familiar play recovers without a bootstrap deadlock');
  for(let i=0;i<20;i++)answerNext(g);
  assert.ok(Object.keys(g.app.gameData.novelty.seen).length>1,'new vowels resume after genuine recovery');
});

test('a programmatic all-unseen review under pressure ends instead of leaving an empty running field',async()=>{
  const g=await game({prepare(L,D){pacingGarden(L,D);L.gameData('kana-rain').novelty={version:1,seen:{},recent:[],blocked:true};}});
  g.app.start({reviewIds:['kana:か']});assert.equal(g.app.state.over,true);assert.equal(g.app.state.drops.length,0);
});


test('legacy practice and retired-mode evidence survive simplification, export and reload',async()=>{
  const old=await model(),gd=old.L.gameData('kana-rain');
  Object.assign(gd,{rows:{hiragana:4,katakana:3},playStyle:'practice',difficulty:'hard',duration:600,best:{'hira:hard:600':1981,'words:normal:180':444,'pair:easy:60':123},accuracy:{words:{attempts:10,correct:7}},featuresIntro:{sokuon:true},scriptIntro:{hiragana:true},novelty:{version:1,pace:'balanced',seen:{'kana:あ':true},recent:[{roundId:'old-round',firstCorrect:false,timeout:true}],blocked:true}});
  old.L.record('w:ねこ','form→sound',first('old-word',{sessionId:'old-practice',assistance:true,response:'neko'}));
  old.L.record('kana:ア','script→script',first('old-pair',{sessionId:'old-pair-session',responseFormat:'hiragana',response:'あ'}));
  old.L.recordExposure('w:ねこ','form→sound',{exposureId:'old-word-help',reason:'reference-panel'});await old.L.flush();
  const before=JSON.parse(old.L.export());
  for(const current of [await game({map:old.map}),await game({map:old.map})]){
    const after=JSON.parse(current.L.export());
    for(const key of ['items','attemptLedger'])assert.deepEqual(after[key],before[key],key+' historical data stays verbatim');
    assert.deepEqual(after.exposureLedger.slice(0,before.exposureLedger.length),before.exposureLedger);
    for(const key of ['rows','best','accuracy','featuresIntro','scriptIntro'])assert.deepEqual(after.games['kana-rain'][key],before.games['kana-rain'][key],key+' survives removed modes');
    assert.equal(current.app.settings.playStyle,'arcade');assert.equal(current.app.settings.duration,180);assert.equal(current.app.settings.difficulty,'normal','old novelty pace takes precedence over old rain difficulty');
    current.app.start();current.skip();assert.equal(current.app.state.score,undefined,'point scoring is retired');assert.equal(current.app.state.bestKey,undefined,'counts never compete with historical point records');assert.equal(current.app.state.totalLives,3);assert.equal(current.app.state.t,180);
    current.app.end('Migration check');
  }
});

test('single difficulty persists its recovery profile and locks across active and paused sessions',async()=>{
  const profiles={easy:['calm',60,55],normal:['balanced',30,25],hard:['bold',12,10]};
  const g=await game();assert.equal(g.app.settings.difficulty,'easy');
  for(const [difficulty,[pace,size,hits]] of Object.entries(profiles)){
    g.el('difficultySelect').value=difficulty;g.el('difficultySelect').onchange();
    assert.equal(g.app.gameData.novelty.pace,pace);assert.equal(g.app.settings.difficulty,difficulty);
    const rules=g.context.KanaNovelty.constantsFor(g.app.gameData.novelty);assert.equal(rules.windowSize,size);assert.equal(rules.recoveryHits,hits);
    const restored=await game({map:g.map});assert.equal(restored.app.settings.difficulty,difficulty);restored.app.start();restored.skip();
    assert.equal(restored.el('difficultySelect').disabled,true);assert.equal(restored.app.state.totalLives,3);assert.equal(restored.app.state.sessionDuration,180);assert.equal(restored.app.state.speed,.1);
    restored.el('difficultySelect').value=difficulty==='hard'?'easy':'hard';restored.el('difficultySelect').onchange();assert.equal(restored.app.settings.difficulty,difficulty);
    restored.app.pause(true);restored.el('difficultySelect').onchange();assert.equal(restored.app.gameData.novelty.pace,pace);
    restored.app.end('Profile check');
  }
});

test('results name the next row and the first-try hits each kana still needs',async()=>{
  const g=await game({prepare(L){
    const log=(char,answers)=>answers.forEach((correct,n)=>L.record('kana:'+char,'form→sound',first(`next:${char}:${n}`,{correct,deferSave:true})));
    // あ ready (2/2), い needs 1, う at 2/3 needs 4 (6/7 ≥ 85%, 5/6 is not), え and お unseen need 2.
    log('あ',[true,true]);log('い',[true]);log('う',[true,false,true]);L.flush();
  }});
  g.app.start();g.skip();g.app.end('Result check');
  const box=g.el('resultNext');assert.equal(box.classList.contains('hidden'),false);
  assert.match(box.innerHTML,/Next: K-row<\/b> · 1 \/ 5 kana ready/);
  assert.deepEqual([...box.innerHTML.matchAll(/<span lang="ja">(.+?)<\/span> \+(\d+)/g)].map(m=>m[1]+m[2]),['い1','え2','お2','う4']);
  assert.doesNotMatch(box.innerHTML,/more kana/);
  const explored=await game({explore:true});explored.app.start();explored.skip();explored.app.end('Result check');
  assert.equal(explored.el('resultNext').classList.contains('hidden'),true,'exploration has no next row');
});

test('retired modes cannot be revived programmatically and focused review keeps three hearts',async()=>{
  const g=await game({explore:true});
  for(const mode of ['mix','pair','words','practice','unknown']){
    assert.deepEqual(plain(g.app.candidates(mode)),[],'no candidates for '+mode);
    g.el('mode').value=mode;g.el('mode').onchange();assert.ok(['hira','kata'].includes(g.app.settings.mode));
  }
  g.el('mode').value='hira';g.el('mode').onchange();g.app.gameData.novelty.seen['kana:あ']=true;
  g.app.start({reviewIds:['w:ねこ','kana:あ']});g.skip();assert.deepEqual(plain(g.app.state.reviewIds),['kana:あ']);assert.equal(g.app.state.sessionDuration,60);assert.equal(g.app.state.totalLives,3);assert.ok(g.app.state.drops.every(drop=>drop.id==='kana:あ'));
  g.submit('zzz');g.submit('a');g.app.end('Result check');
  assert.match(g.el('resultStats').innerHTML,/CORRECT ANSWERS/);assert.match(g.el('resultStats').innerHTML,/WRONG ANSWERS/);assert.match(g.el('resultStats').innerHTML,/EXPIRED DROPS/);assert.doesNotMatch(g.el('resultStats').innerHTML,/POINTS|STREAK|FIRST|INDEPENDENT|WITH HELP/);assert.match(g.el('resultDetails').textContent,/first-try.*after correction.*Best streak/);
  g.el('gardenBtn').onclick();assert.match(g.el('learningStats').innerHTML,/independent|with help/i);
});


test('a wrong answer immediately defers queued new kana and survives abandoning the drop',async()=>{
  const g=await game({prepare:pacingGarden});g.app.start({reviewIds:['kana:あ','kana:か']});g.skip();
  const pending=nextDrop(g);g.submit('zzz');
  assert.equal(g.app.gameData.novelty.cooldownRemaining,10);
  assert.equal(g.app.gameData.novelty.blocked,false,'one wrong answer does not require a full pressure window');
  assert.equal(g.app.state.familiarSinceIntroduction,0);
  g.app.state.queue=[{id:'kana:か'}];g.app.state.sinceSpawn=99999;g.tick();
  assert.ok(g.app.state.drops.every(d=>!d.isIntroduction),'an unfinished wrong round already prevents the queued debut');
  const saved=g.map.get('jp-learner-v1');
  assert.equal(JSON.parse(saved).games['kana-rain'].novelty.cooldownRemaining,10,'pause is journaled with the error');
  g.app.end('Restart');const reloaded=await game({map:g.map});
  assert.equal(reloaded.app.gameData.novelty.cooldownRemaining,10);
  reloaded.app.start({reviewIds:['kana:あ','kana:か']});reloaded.skip();
  for(let i=0;i<9;i++)answerNext(reloaded);
  assert.equal(reloaded.app.gameData.novelty.cooldownRemaining,1);
  reloaded.app.state.queue=[{id:'kana:か'}];const ninth=nextDrop(reloaded);
  assert.equal(ninth.isIntroduction,false,'nine successes cannot admit new content');
  reloaded.submit(reloaded.app.accepted(ninth)[0]);
  assert.equal(reloaded.app.gameData.novelty.cooldownRemaining,0);
  reloaded.app.state.queue=[{id:'kana:か'}];assert.equal(nextDrop(reloaded).isIntroduction,true);
  assert.equal(pending.wrong,1);
});

test('an untouched expiration pauses after one loss and consecutive errors reset the ten-hit recovery',async()=>{
  const g=await game({prepare:pacingGarden});g.app.start({reviewIds:['kana:あ','kana:か']});g.skip();
  nextDrop(g).progress=1;g.tick();assert.equal(g.app.state.lives,2);
  assert.equal(g.app.gameData.novelty.blocked,false);assert.equal(g.app.gameData.novelty.cooldownRemaining,10);
  for(let i=0;i<9;i++)answerNext(g);
  assert.equal(g.app.gameData.novelty.cooldownRemaining,1);
  const d=nextDrop(g);g.submit('zzz');assert.equal(g.app.gameData.novelty.cooldownRemaining,10);
  g.submit(g.app.accepted(d)[0]);assert.equal(g.app.gameData.novelty.cooldownRemaining,10,'correction does not advance recovery');
  assert.equal(g.app.state.familiarSinceIntroduction,0,'failure and correction cannot provide debut spacing');
  for(let i=0;i<10;i++)answerNext(g);
  assert.equal(g.app.gameData.novelty.cooldownRemaining,0);
  g.app.state.queue=[{id:'kana:か'}];assert.equal(nextDrop(g).isIntroduction,true);
});

test('debut errors and starter vowels cannot bypass the persistent pause',async()=>{
  const g=await game({prepare:pacingGarden});g.app.start();g.skip();for(let i=0;i<3;i++)answerNext(g);
  g.app.state.queue=[{id:'kana:か'}];const d=nextDrop(g);assert.equal(d.isIntroduction,true);
  g.submit('zzz');assert.equal(g.app.gameData.novelty.cooldownRemaining,10);
  g.submit(g.app.accepted(d)[0]);assert.equal(g.app.gameData.novelty.cooldownRemaining,10);
  assert.equal(g.app.gameData.novelty.recent.at(-1).miss,false,'debut failure pauses without inventing a familiar miss');
  const fresh=await game();fresh.app.start();fresh.skip();const vowel=nextDrop(fresh);
  fresh.submit('zzz');fresh.submit(fresh.app.accepted(vowel)[0]);
  for(let i=0;i<9;i++){
    fresh.app.state.queue=[{id:'kana:い'}];const familiar=nextDrop(fresh);
    assert.equal(familiar.isIntroduction,false,'new starter respects the same pause');fresh.submit(fresh.app.accepted(familiar)[0]);
  }
  assert.equal(fresh.app.gameData.novelty.cooldownRemaining,1);
});
