const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=name=>fs.readFileSync(path.join(__dirname,'../src',name+'.js'),'utf8');
const plain=value=>JSON.parse(JSON.stringify(value));

async function model(options={}){
  let now=options.now||1700000000000;
  const map=options.map||new Map(),writes=[];
  class Clock extends Date{static now(){return now;}}
  const localStorage={getItem:k=>map.get(k)||null,setItem(k,v){if(options.denyStorage)throw new Error('denied');map.set(k,v);},removeItem:k=>map.delete(k)};
  const context=vm.createContext({Date:Clock,Math,JSON,console,localStorage,queueMicrotask});context.window=context;
  if(options.idb){context.indexedDB={open(){const request={};queueMicrotask(()=>{request.result={transaction(name,mode){const tx={};tx.objectStore=()=>({get(){const read={};queueMicrotask(()=>{read.result=options.idbSaved;read.onsuccess?.();});return read;},put(snapshot,key){writes.push({tx,snapshot,key});return {};}});return tx;}};request.onsuccess?.();});return request;}};}
  vm.runInContext(source('data'),context);vm.runInContext(source('learner'),context);await context.Learner.ready;
  return {context,D:context.JPData,L:context.Learner,map,writes,advance:ms=>now+=ms};
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
  Object.assign(m.context,{document,location:{search:options.explore?'?all':''},navigator:{},performance:{now:()=>now},URL,URLSearchParams,innerWidth:1000,innerHeight:800,matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>{frame=fn;return 1;},cancelAnimationFrame:()=>frame=null,setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),confirm:()=>true,Blob,addEventListener:(k,v)=>listeners.set(k,v),KanaAudio:{enabled:true,ready:Promise.resolve(),available:true,play:async()=>false,stop(){},hasRecording:()=>false}});
  vm.runInContext(source('difficulty'),m.context);await vm.runInContext(source('game'),m.context);
  const advance=(ms,playFrame=false)=>{now+=ms;m.advance(ms);for(const [id,t] of [...timers])if(t.at<=now){timers.delete(id);t.fn();}if(playFrame)frame?.(now);};
  return {...m,nodes,el,document,listeners,app:m.context.KanaRain,advance,skip:()=>el('skipCountdown').onclick(),submit:text=>{el('answer').value=text;el('answerForm').onsubmit({preventDefault(){}});},type:text=>{el('answer').value=text;el('answer').oninput();},continue:()=>el('continueFeedbackBtn').onclick(),tick:()=>advance(16,true)};
}
const first=(id,extra={})=>({attemptId:id,firstAttempt:true,assistance:false,correct:true,responseFormat:'romaji',gameId:'kana-rain',...extra});

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
  const again=await model({map:m.map});assert.equal(again.L.state('kana:あ').facets['form→sound'].correct,6);assert.equal(again.L.state('kana:あ').facets['form→sound'].unaided,0);
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

test('generated round owns its facet and format; kana and whole-word prompts cannot be copied as readings',async()=>{
  const g=await game({prepare(L){L.record('kana:あ','form→sound',first('seed'));L.state('kana:あ').facets['form→sound'].stability=60;L.state('kana:あ').facets['form→sound'].independentFirstCorrect=2;}});
  const round=g.app.generateRound({id:'kana:あ'});assert.equal(round.facet,'script→script');assert.equal(round.responseFormat,'katakana');assert.deepEqual(plain(g.app.accepted(round)),['ア']);assert.equal(g.app.score(round,{correct:true})[0].facet,'script→script');
  assert.ok(!g.app.accepted('kana:い',false).includes('い'));assert.ok(!g.app.accepted('w:ねこ').includes('ねこ'));assert.ok(g.app.accepted('w:すし').includes('susi'));
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
