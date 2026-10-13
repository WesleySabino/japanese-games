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
    constructor(id=''){this.id=id;this.value='';this.style={setProperty(){}};this.dataset={};this.children=[];this.open=false;this.clientWidth=800;this.clientHeight=600;this.offsetWidth=65;this.offsetHeight=85;this.options=['hira','kata','mix','pair','words'].map(value=>({value}));const classes=new Set();this.classList={add:(...v)=>v.forEach(x=>classes.add(x)),remove:(...v)=>v.forEach(x=>classes.delete(x)),contains:x=>classes.has(x),toggle:(x,on=!classes.has(x))=>{on?classes.add(x):classes.delete(x);return on;}};this.events=new Map();}
    setAttribute(k,v){this[k]=v;}querySelector(k){this.nested||=new Map();if(!this.nested.has(k))this.nested.set(k,new Element());return this.nested.get(k);}querySelectorAll(){return [];}addEventListener(k,v){this.events.set(k,v);}appendChild(c){this.children.push(c);}focus(){document.activeElement=this;}blur(){}remove(){this.removed=true;}contains(c){return this.children.includes(c);}showModal(){this.open=true;}close(){this.open=false;}getBoundingClientRect(){return {height:100};}
    get innerHTML(){return this.html||this.textContent||'';}set innerHTML(v){this.html=v;}
  }
  const el=id=>{if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id);};
  for(const id of ['scriptDialog','featureDialog','pauseOverlay','settingsDialog','progressDialog','helpDialog','results'])el(id);
  const document={body:new Element(),documentElement:new Element(),activeElement:null,hidden:false,getElementById:el,createElement:()=>new Element(),addEventListener:(k,v)=>listeners.set(k,v),querySelector:s=>s==='dialog[open]'?[...nodes.values()].find(x=>x.open):null,querySelectorAll:s=>s==='dialog.game-dialog[open]'?[...nodes.values()].filter(x=>x.open):s==='dialog.game-dialog'?[...nodes.values()].filter(x=>x.id.endsWith('Dialog')||['pauseOverlay','results'].includes(x.id)):[]};
  Object.assign(m.context,{document,location:{hostname:'127.0.0.1',search:options.explore?'?all':''},navigator:{},performance:{now:()=>now},URL,URLSearchParams,innerWidth:1000,innerHeight:800,matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{frame=fn;return 1;},cancelAnimationFrame:()=>frame=null,setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),confirm:()=>true,Blob,addEventListener:(k,v)=>listeners.set(k,v),KanaAudio:{enabled:true,ready:Promise.resolve(),available:true,play:async()=>false,stop(){},hasRecording:()=>false}});
  vm.runInContext(source('difficulty'),m.context);vm.runInContext(source('novelty'),m.context);vm.runInContext(source('novelty-hud'),m.context);await vm.runInContext(source('game'),m.context);
  const advance=(ms,playFrame=false)=>{now+=ms;m.advance(ms);for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}if(playFrame)frame?.(now);};
  return {...m,nodes,el,document,listeners,app:m.context.KanaRain,advance,skip:()=>el('skipCountdown').onclick(),submit:text=>{el('answer').value=text;el('answerForm').onsubmit({preventDefault(){}});},type:text=>{el('answer').value=text;el('answer').oninput();},continue:()=>el('continueFeedbackBtn').onclick(),tick:()=>advance(16,true)};
}
const first=(id,extra={})=>({attemptId:id,firstAttempt:true,assistance:false,correct:true,responseFormat:'romaji',gameId:'kana-rain',...extra});
function seedFamiliarReadings(L,D,ids=D.kana.map(k=>k.id).concat(D.words.map(w=>w.id))){
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
  const {novelty,...preserved}=plain(g.app.gameData);assert.deepEqual(preserved,saved.games['kana-rain']);assert.equal(novelty.version,1);
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

test('generated round owns its facet and format; kana and whole-word prompts cannot be copied as readings',async()=>{
  const g=await game({prepare(L,D){seedFamiliarReadings(L,D,['kana:あ']);}});
  assert.ok(g.L.mastery('kana:あ','form→sound')>=.75);assert.ok(g.L.state('kana:あ').facets['form→sound'].independentFirstCorrect>=2);
  const round=g.app.generateRound({id:'kana:あ'});assert.equal(round.facet,'form→sound');assert.equal(round.responseFormat,'romaji');assert.equal(round.kanaOnly,false);assert.deepEqual(plain(g.app.accepted(round)),['a']);assert.equal(g.app.score(round,{correct:true})[0].facet,'form→sound');
  assert.ok(!g.app.accepted('kana:い',false).includes('い'));assert.ok(!g.app.accepted('w:ねこ').includes('ねこ'));assert.ok(g.app.accepted('w:すし').includes('susi'));
});

test('all familiar hiragana, katakana, mixed-script and word readings stay romaji; only explicit pairs use hiragana',async()=>{
  const g=await game({explore:true,prepare(L,D){seedFamiliarReadings(L,D);L.gameData('kana-rain').featuresIntro=Object.fromEntries(D.features.map(feature=>[feature.id,true]));}});
  for(const mode of ['hira','kata','mix','words','pair']){
    g.el('mode').value=mode;g.el('mode').onchange();assert.equal(g.app.settings.mode,mode);
    const ids=g.app.candidates();assert.ok(ids.length>0);
    for(const id of ids){
      assert.ok(g.L.mastery(id,'form→sound')>=.75,`${mode}: ${id} is familiar enough to have triggered the former automatic conversion`);
      const round=g.app.generateRound({id}),expected=mode==='pair'?{format:'hiragana',facet:'script→script'}:{format:'romaji',facet:'form→sound'};
      assert.equal(round.responseFormat,expected.format,`${mode}: ${id}`);assert.equal(round.facet,expected.facet,`${mode}: ${id}`);assert.equal(round.kanaOnly,mode==='pair');
      const responses=g.app.accepted(round);
      if(mode==='pair'){
        const kana=g.D.kanaById[id];assert.equal(kana.script,'katakana');
        assert.deepEqual(plain(responses),[g.D.kana.find(k=>k.pairId===kana.pairId&&k.script==='hiragana').char]);
        assert.ok(!responses.includes(kana.romaji),'romaji is not an answer in the explicitly selected pair mode');
      }else assert.ok(!responses.includes(id.slice(id.indexOf(':')+1)),`${mode}: copying the prompt is still rejected`);
    }
  }
});

test('normal and review sessions keep their selected response format through repeated answers and pause/resume',async()=>{
  for(const mode of ['hira','kata','mix','words','pair']){
    const g=await game({explore:true,prepare(L,D){seedFamiliarReadings(L,D);Object.assign(L.gameData('kana-rain'),{featuresIntro:Object.fromEntries(D.features.map(feature=>[feature.id,true])),scriptIntro:{hiragana:true}});}});
    g.el('mode').value=mode;g.el('mode').onchange();const reviewIds=plain(g.app.candidates().slice(0,3)),format=mode==='pair'?'hiragana':'romaji',facet=mode==='pair'?'script→script':'form→sound';
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
  assert.equal(next.responseFormat,'romaji');assert.equal(next.facet,'form→sound');assert.equal(next.kanaOnly,false);
  assert.equal(g.el('scriptDialog').open,false);assert.equal(g.app.state.paused,false);
  g.submit('a');assert.equal(g.L.attempts().at(-1).facet,'form→sound');assert.equal(g.L.attempts().at(-1).responseFormat,'romaji');
});

test('new and reset gardens default to arcade while a selected practice preference survives reload',async()=>{
  const g=await game();assert.equal(g.app.settings.playStyle,'arcade');assert.equal(g.el('practiceSelect').value,'arcade');assert.equal(g.el('settingsPracticeSelect').value,'arcade');assert.equal(g.el('difficultySelect').disabled,false);assert.equal(g.el('durationSelect').disabled,false);
  g.app.start();g.skip();assert.equal(g.app.state.playStyle,'arcade');assert.equal(g.app.state.totalLives,3);assert.equal(g.app.state.t,180);
  g.el('resetBtn').onclick();assert.equal(g.app.settings.playStyle,'arcade');assert.equal(g.el('practiceSelect').value,'arcade');
  g.el('practiceSelect').value='practice';g.el('practiceSelect').onchange();assert.equal(g.app.settings.playStyle,'practice');
  const restored=await game({map:g.map});assert.equal(restored.app.settings.playStyle,'practice');assert.equal(restored.el('settingsPracticeSelect').value,'practice');restored.el('resetBtn').onclick();assert.equal(restored.app.settings.playStyle,'arcade');
});

test('selected finite practice holds correction through pause and ends after eight failed opportunities',async()=>{
  const g=await game({prepare(L){L.gameData('kana-rain').playStyle='practice';}});assert.equal(g.app.settings.playStyle,'practice');g.app.start();g.skip();const speed=g.app.state.speed;
  for(let i=0;i<8;i++){
    assert.equal(g.app.state.drops.length,1);g.submit('not-an-answer');assert.equal(g.app.state.awaitingFeedback,true);assert.equal(g.app.state.practiceCompleted,i+1);
    const correction=g.el('feedback').textContent;g.app.pause(true);g.advance(9000);assert.equal(g.el('feedback').textContent,correction);assert.ok(g.el('feedback').className.includes('show'));g.app.pause(false);assert.equal(g.app.state.awaitingFeedback,true);g.continue();
    if(i<7){g.skip();assert.equal(g.app.state.speed,speed);assert.equal(g.app.state.lives,null);}
  }
  assert.equal(g.app.state.over,true);assert.equal(g.L.attempts().length,8);assert.equal(g.app.state.events.filter(e=>e.firstAttempt).length,8);assert.ok(g.el('resultStats').innerHTML.includes('INDEPENDENT FIRST'));assert.ok(!g.el('resultStats').innerHTML.includes('READ CORRECTLY'));
});

test('practice timeout stays separate, retains its correction until acknowledged, and has no heart loss',async()=>{
  const g=await game({prepare(L){L.gameData('kana-rain').playStyle='practice';}});g.app.start();g.skip();const id=g.app.state.drops[0].id;g.app.state.drops[0].progress=1;g.tick();const ev=g.L.attempts()[0];assert.equal(ev.outcome,'timeout');assert.equal(ev.firstResponseMs,null);assert.equal(g.L.state(id).facets[ev.facet].errors,0);assert.equal(g.app.state.lives,null);assert.equal(g.app.state.awaitingFeedback,true);g.advance(10000);assert.ok(g.el('feedback').className.includes('show'));g.continue();assert.equal(g.app.state.drops.length,1);
});

test('arcade correction cannot replace the first committed latency and remains assisted on retry',async()=>{
  const g=await game({prepare(L){L.gameData('kana-rain').playStyle='arcade';}});g.app.start();g.skip();g.advance(4000);g.type('x');g.advance(700);g.submit('x');const firstEvent=g.L.attempts()[0];assert.equal(firstEvent.firstResponseMs,4700);assert.equal(firstEvent.inputActiveMs,700);assert.equal(firstEvent.waitMs,4000);
  const d=g.app.state.drops[0];g.advance(2000);g.submit(g.app.accepted(d)[0]);const second=g.L.attempts()[1];assert.equal(second.firstAttempt,false);assert.equal(second.firstResponseMs,4700);assert.equal(second.assistance,true);assert.ok(second.assistanceReasons.includes('previous-incorrect-attempt'));assert.equal(g.L.state(d.id).facets[d.facet].independentFirstCorrect,0);
});

test('pair confusion uses the submitted script, while homophone readings remain ambiguous',async()=>{
  const pair=await game({explore:true,prepare(L){L.gameData('kana-rain').playStyle='arcade';L.gameData('kana-rain').scriptIntro={hiragana:true};}});pair.el('mode').value='pair';pair.el('mode').onchange();pair.app.start();pair.skip();pair.submit('い');const ev=pair.L.attempts()[0];assert.equal(ev.facet,'script→script');assert.equal(ev.submittedItemId,'kana:い');assert.equal(ev.chosenItemId,'kana:イ');assert.equal(pair.L.recentErrors()[0].responseFormat,'hiragana');
  const reading=await game({explore:true});reading.app.start();reading.skip();reading.submit('ji');const ambiguous=reading.L.attempts()[0];assert.equal(ambiguous.reason,'ambiguous-reading');assert.equal(ambiguous.chosenItemId,null);assert.deepEqual(plain(ambiguous.candidateItemIds),['kana:じ','kana:ぢ']);assert.equal(reading.L.recentErrors().length,0);
});

test('reference panel marks relevant live rounds; target help propagates to related words but not unrelated items',async()=>{
  const g=await game({prepare(L){L.record('kana:あ','form→sound',first('known'));}});g.app.start();g.skip();g.el('gardenBtn').onclick();assert.ok(g.app.state.drops[0].assistanceReasons.has('reference-panel'));assert.ok(g.L.exposures().some(e=>e.reason==='reference-panel'));
  const h=await game();h.app.start();h.skip();await h.el('listenBtn').onclick();assert.equal(h.L.assistanceFor('w:あさ','form→sound').assisted,true);assert.equal(h.L.assistanceFor('w:ねこ','form→sound').assisted,false);
});

test('a round presented while a reveal is recent stays assisted even if the clock later passes the spacing rule',async()=>{
  const g=await game({prepare(L){L.record('kana:あ','form→sound',first('known'));}});g.app.start({reviewIds:['kana:あ']});g.skip();const d=g.app.state.drops[0];assert.equal(d.id,'kana:あ');
  g.advance(60001);g.L.record('kana:い','form→sound',first('intervening-i'));g.L.record('kana:う','form→sound',first('intervening-u'));assert.equal(g.L.assistanceFor('kana:あ','form→sound').assisted,false);
  g.submit('a');const response=g.L.attempts().at(-1);assert.equal(response.assistance,true);assert.ok(response.assistanceReasons.some(r=>r.includes('lesson-reference')));
});

test('word pattern acknowledgements gate word eligibility and persist without silently accepting Escape',async()=>{
  const g=await game({explore:true});assert.ok(!g.app.candidates('words').includes('w:きっぷ'));g.el('mode').value='words';g.el('mode').onchange();g.app.start();assert.equal(g.el('featureDialog').open,true);assert.equal(g.app.state.drops.length,0);
  g.el('featureDialog').events.get('cancel')({preventDefault(){}});assert.equal(g.app.gameData.featuresIntro,undefined);g.app.pause(false);assert.equal(g.el('featureDialog').open,true);
  while(g.app.state.pendingFeatures.length)g.el('continueFeatureBtn').onclick();assert.equal(g.app.gameData.featuresIntro.sokuon,true);assert.ok(g.app.candidates('words').includes('w:きっぷ'));assert.equal(g.app.state.drops.length,1);const saved=JSON.parse(g.L.export());assert.equal(saved.games['kana-rain'].featuresIntro['long-vowel-mark'],true);assert.ok(saved.exposureLedger.some(e=>e.reason==='feature-introduction'));
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
  const g=await game({prepare(L,D){pacingGarden(L,D);for(let i=0;i<2;i++)L.record('kana:あ','form→sound',first('timeout:'+i,{outcome:'timeout',correct:null}));}});
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
  assert.equal(g.app.gameData.novelty.blocked,true);assert.equal(g.app.state.lives,1);
  const window=plain(g.app.gameData.novelty.recent),attempts=plain(g.L.attempts());
  g.app.end('Restart');const reloaded=await game({map:g.map});
  assert.deepEqual(plain(reloaded.app.gameData.novelty.recent),window);assert.deepEqual(plain(reloaded.L.attempts()),attempts);
  reloaded.app.start({reviewIds:['kana:あ']});reloaded.skip();
  for(let i=0;i<10;i++)answerNext(reloaded);
  assert.equal(reloaded.app.gameData.novelty.blocked,true,'10 correct with two expirations is still blocked');
  answerNext(reloaded);assert.equal(reloaded.app.gameData.novelty.blocked,false);
  assert.equal(reloaded.app.gameData.novelty.recent.length,12);assert.equal(reloaded.app.state.lives,3);
});

test('multiple wrong submissions and their final correction or expiry each resolve just one drop',async()=>{
  const g=await game({prepare:pacingGarden});g.app.start({reviewIds:['kana:あ']});g.skip();
  const before=g.app.gameData.novelty.recent.length;g.submit('zzz');g.submit('zzz');
  assert.equal(g.app.gameData.novelty.recent.length,before,'intermediate errors do not resolve a drop');
  g.submit('a');assert.equal(g.app.gameData.novelty.recent.length,before+1);
  assert.equal(g.app.gameData.novelty.recent.at(-1).firstCorrect,false);
  const d=nextDrop(g);g.submit('zzz');d.progress=1;g.tick();
  assert.equal(g.app.gameData.novelty.recent.length,before+2);
  assert.equal(g.app.gameData.novelty.recent.at(-1).timeout,true);
  assert.equal(g.L.state('kana:あ').facets['form→sound'].timeouts,1);
});

test('practice errors complete one opportunity and all eight opportunities remain playable under pressure',async()=>{
  const g=await game({prepare(L,D){pacingGarden(L,D);L.gameData('kana-rain').playStyle='practice';}});
  g.app.start({reviewIds:['kana:あ']});g.skip();const before=g.app.gameData.novelty.recent.length;
  g.submit('zzz');assert.equal(g.app.gameData.novelty.recent.length,before+1);assert.equal(g.app.gameData.novelty.recent.at(-1).firstCorrect,false);
  g.continue();g.skip();for(let i=0;i<7;i++)answerNext(g);
  assert.equal(g.app.state.practiceCompleted,8);assert.equal(g.app.state.over,true);
});

test('starter vowels stay available under pressure, one debut at a time, without spending later-row slots',async()=>{
  const g=await game({prepare(L){L.gameData('kana-rain').novelty={version:1,seen:{},recent:[],blocked:true};}});
  g.app.start();g.skip();const starters=new Set();
  for(let i=0;i<20;i++){
    const d=nextDrop(g);if(d.isIntroduction&&g.D.kanaById[d.id].row==='a')starters.add(d.id);
    g.app.state.sinceSpawn=99999;g.tick();assert.ok(g.app.state.drops.filter(d=>d.isIntroduction).length<=1);
    g.submit(g.app.accepted(d)[0]);
  }
  assert.equal(starters.size,5);assert.ok(g.app.state.newIds.size<=2);assert.ok(g.app.state.correct>=20);
});

test('a programmatic all-unseen review under pressure ends instead of leaving an empty running field',async()=>{
  const g=await game({prepare(L,D){pacingGarden(L,D);L.gameData('kana-rain').novelty={version:1,seen:{},recent:[],blocked:true};}});
  g.app.start({reviewIds:['kana:か']});assert.equal(g.app.state.over,true);assert.equal(g.app.state.drops.length,0);
});
