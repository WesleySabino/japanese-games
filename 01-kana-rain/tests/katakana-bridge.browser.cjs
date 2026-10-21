'use strict';
// Source browser QA only: synthetic v2 histories, disposable contexts, owned port4189.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(__dirname,'artifacts/katakana-bridge'),origin='http://127.0.0.1:4189';
const coldOnly=process.argv.includes('--cold-start');assert.ok(process.argv.slice(2).every(arg=>arg==='--cold-start'),'Use only the --cold-start focused flag');
const box={};box.window=box;vm.runInNewContext(fs.readFileSync(path.join(root,'src/data.js'),'utf8'),box);const data=box.JPData;
const checks=[],errors=[],contexts=[],report={startedAt:new Date().toISOString(),origin,productionAccess:false,userProfileAccess:false,syntheticProgress:true,serviceWorkers:'blocked',externalRequests:'aborted',checks,errors};
let browser,server;
const pass=(check,details={})=>{checks.push({check,...details,pass:true});console.log('PASS '+check);};
const apart=(a,b)=>a.right<=b.left+1||a.left>=b.right-1||a.bottom<=b.top+1||a.top>=b.bottom-1;
function attempt(id,index=0){const k=data.kanaById[id];return {attemptId:'bridge-seed:'+id+':'+index,roundId:'bridge-seed-round:'+id+':'+index,sessionId:'synthetic-old-session',itemId:id,facet:'form→sound',responseFormat:'romaji',inputMethod:'typing',firstAttempt:true,assistance:false,assistanceReasons:[],outcome:'correct',correct:true,reason:'accepted',at:1700000000000+index,gameId:'kana-rain',response:k.romaji,chosenItemId:null,submittedItemId:null,candidateItemIds:[],firstResponseMs:900,inputActiveMs:400,displayActiveMs:900,waitMs:500,delaySinceExposureMs:null};}
function fixture({flag=true,legacy=false,complete=false,almost=false,rows=legacy?11:1}={}){
  const attempts=complete||almost?data.kana.filter(k=>k.script==='hiragana').flatMap(k=>Array.from({length:almost&&k.char==='ぴょ'?1:2},(_,i)=>attempt(k.id,i))):legacy?[attempt('kana:ア'),attempt('kana:あ')]:[];
  const gd={rows:{hiragana:complete||almost?27:rows,katakana:legacy?27:1},best:{'hira:normal:180':1981,'arcade-v2:kata:easy:180':321},accuracy:{},sound:false,novelty:{version:1,pace:'calm',seen:Object.fromEntries(data.kana.map(k=>[k.id,true])),recent:[],blocked:false,cooldownRemaining:0}};
  if(typeof flag==='boolean')gd.katakanaUnlocked=flag;
  return {version:2,created:1700000000000,updatedAt:1700000005000,sequence:500,items:{},errorLog:[],attemptLedger:attempts,exposureLedger:[],reveals:{},games:{'kana-rain':gd}};
}
const phone=viewport=>viewport.width<500||viewport.height<500;
async function open(saved=fixture({legacy:true}),viewport={width:1366,height:768}){
  const mobile=phone(viewport),context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,serviceWorkers:'block'});contexts.push(context);
  await context.addCookies([{name:'ng_analytics_consent',value:'denied',url:origin,sameSite:'Lax'}]);await context.route('**/*',r=>{const u=new URL(r.request().url());return ['GET','HEAD'].includes(r.request().method())&&(u.origin===origin||['data:','blob:'].includes(u.protocol))?r.continue():r.abort();});
  await context.addInitScript(saved=>{if(localStorage.getItem('katakana-bridge-fixture'))return;localStorage.setItem('jp-learner-v1',JSON.stringify(saved));localStorage.setItem('katakana-bridge-fixture','1');},saved);
  const p=await context.newPage();p.on('pageerror',e=>errors.push({viewport,error:e.message}));await p.goto(origin,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>!!window.KanaRain);await p.evaluate(()=>document.fonts.ready);const boot=await p.evaluate(()=>({katakanaUnlocked:KanaRain.gameData.katakanaUnlocked,rows:KanaRain.gameData.rows,option:document.querySelector('#mode option[value=kata]').outerHTML,optionDisabled:document.querySelector('#mode option[value=kata]').disabled,location:location.href}));report.boots||=[];report.boots.push(boot);return p;
}
async function tap(p,locator){if(phone(p.viewportSize()))await locator.tap();else await locator.click();}
async function frames(p){await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function ready(p){for(let i=0;i<20;i++){if(await p.locator('#countdownOverlay').isVisible())await tap(p,p.locator('#skipCountdown'));if(await p.evaluate(()=>KanaRain.state&&!KanaRain.state.paused&&!KanaRain.state.countingDown))return;await p.waitForTimeout(30);}throw Error('Katakana game did not begin');}
async function pin(p){await p.evaluate(()=>{const g=KanaRain.state;g.sinceSpawn=-1e9;g.drops.forEach(d=>{d.progress=.18;d.v=0;});});await frames(p);}
async function start(p,{mode='kata',reviewIds}={}){await p.locator('#mode').selectOption(mode);if(reviewIds)await p.evaluate(reviewIds=>KanaRain.start({reviewIds}),reviewIds);else await tap(p,p.locator('#startBtn'));await ready(p);await pin(p);}
async function state(p){return p.evaluate(()=>({correct:KanaRain.state.correct,errors:KanaRain.state.errors,expirations:KanaRain.state.expirations,lives:KanaRain.state.lives,attempts:KanaRain.state.attempts,events:Learner.attempts().length}));}
async function target(p){return p.evaluate(()=>{const d=KanaRain.state.target;return {id:d.id,roundId:d.roundId,format:d.responseFormat,romaji:JPData.kanaById[d.id].romaji,partner:JPData.counterpart(d.id).char,hint:d.el.querySelector('.hint')?.textContent??null,pad:KanaRain.padPath(d.id)};});}
async function next(p,id='kana:イ'){assert.equal(await p.evaluate(()=>KanaRain.state.drops.length),0);await p.evaluate(id=>{const g=KanaRain.state;g.queue=[{id}];g.sinceSpawn=1e9;},id);await p.waitForFunction(()=>KanaRain.state.drops.length===1);await pin(p);return target(p);}
// Phones compose with the visible pad, a stage at a time like a player; desktops type the sound.
async function pad(p,{family,slot}){await p.waitForTimeout(90);await tap(p,p.locator('#keyboard [data-family="'+family+'"]'));await p.waitForTimeout(90);await tap(p,p.locator('#keyboard [data-slot="'+slot+'"]'));}
async function typeSound(p,text){await p.locator('#answer').fill(text);await p.locator('#answer').press('Enter');}
async function answer(p,t){if(phone(p.viewportSize()))await pad(p,t.pad);else await typeSound(p,t.romaji);}
async function miss(p,t){if(phone(p.viewportSize()))await pad(p,t.pad.family==='w'?{family:'k',slot:'a'}:{family:'w',slot:'a'});else await typeSound(p,'qq');}
const method=p=>phone(p.viewportSize())?'composer':'typing';
async function finish(p){await tap(p,p.locator('#pauseBtn'));await tap(p,p.locator('#finishBtn'));await p.locator('#results').waitFor({state:'visible'});}
async function decoded(p){await p.evaluate(async()=>{for(const file of ['drop.webp','garden.webp','spirit.webp']){const image=new Image();image.src=new URL('assets/'+file,location.href);await image.decode();}});await frames(p);}
function assertSoundEvent(event,expected,label){assert.equal(event.facet,'form→sound',label);assert.equal(event.responseFormat,'romaji',label);assert.equal(event.inputMethod,expected,label);assert.ok(!event.assistanceReasons.includes('recognition-options'),label+' is not recognition evidence');}
async function geometry(p,label){
  const g=await p.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};},shown=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;},field=document.querySelector('#field'),pad=document.querySelector('#keyboard'),drop=KanaRain.state.target;return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,choices:!!document.querySelector('#hiraganaChoices'),field:rect(field),drop:rect(drop.el),travel:Math.max(8,field.clientHeight-drop.h-27)-8,dock:rect(document.querySelector('#answerDock')),form:shown(document.querySelector('#answerForm')),pad:shown(pad),buttons:[...pad.querySelectorAll('button')].filter(shown).map(e=>{const b=rect(e),hit=document.elementFromPoint((b.left+b.right)/2,(b.top+b.bottom)/2);return {...b,family:e.dataset.family,hit:hit===e||e.contains(hit)};})};});
  assert.equal(g.choices,false,label+' no per-drop choice buttons remain');
  assert.ok(g.field.width>=g.drop.width&&g.field.height>=g.drop.height&&g.travel>0,label+' the rain field fits a drop and a positive falling path');
  assert.ok(g.documentWidth<=g.width+1&&g.documentHeight<=g.height+1,label+' no document overflow');assert.ok(apart(g.field,g.dock),label+' answer controls never cover rain');
  if(phone({width:g.width,height:g.height})){
    assert.equal(g.pad,true,label+' the sound pad is open on a phone');assert.equal(g.buttons.filter(b=>b.family).length,15,label+' all 15 fixed families are visible');
    for(const b of g.buttons){assert.ok(b.width>=36&&b.height>=36&&b.left>=-1&&b.right<=g.width+1&&b.top>=-1&&b.bottom<=g.height+1,label+' pad targets are 36px and reachable');assert.equal(b.hit,true,label+' pad button receives center touch');}
  }else{assert.equal(g.form,true,label+' desktop shows the typing field');assert.equal(g.pad,false,label+' desktop starts without the pad');}
  return g;
}
async function gates(){
  const fresh=await open(fixture({flag:false}));assert.equal(await fresh.locator('#mode option[value=kata]').evaluate(option=>option.disabled),true);assert.equal(await fresh.evaluate(()=>KanaRain.gameData.katakanaUnlocked),false);await fresh.evaluate(()=>{const select=document.querySelector('#mode');select.value='kata';select.dispatchEvent(new Event('change'));});assert.equal(await fresh.locator('#mode').inputValue(),'hira');await start(fresh,{mode:'hira'});assert.equal(await fresh.locator('#answerForm').isVisible(),true);await finish(fresh);await fresh.locator('#backBtn').click();await fresh.context().close();pass('fresh false flag keeps Katakana locked and Hiragana input unchanged');
  const rowsOnly=await open(fixture({flag:false,rows:27}));assert.equal(await rowsOnly.locator('#mode option[value=kata]').evaluate(option=>option.disabled),true);await rowsOnly.context().close();pass('all27 available Hiragana rows alone do not complete104 kana');
  const almost=await open(fixture({flag:false,almost:true}));assert.equal(await almost.locator('#mode option[value=kata]').evaluate(option=>option.disabled),true);await start(almost,{mode:'hira',reviewIds:['kana:ぴょ']});await almost.locator('#answer').pressSequentially('pyo');await almost.locator('#answer').press('Enter');await almost.waitForFunction(()=>KanaRain.gameData.katakanaUnlocked===true);await finish(almost);await almost.locator('#backBtn').click();assert.equal(await almost.locator('#mode option[value=kata]').evaluate(option=>option.disabled),false);await almost.reload();await almost.waitForFunction(()=>!!window.KanaRain);assert.equal(await almost.evaluate(()=>KanaRain.gameData.katakanaUnlocked),true);await almost.context().close();pass('last required Hiragana first hit unlocks Katakana and persists after reload');
  const saved=fixture({flag:null,legacy:true}),legacy=await open(saved);assert.equal(await legacy.evaluate(()=>KanaRain.gameData.katakanaUnlocked),true);assert.equal(await legacy.locator('#mode option[value=kata]').evaluate(option=>option.disabled),false);assert.deepEqual(await legacy.evaluate(()=>Learner.attempts()),saved.attemptLedger);await legacy.context().close();pass('legacy access migrates monotonically without rewriting old romaji evidence');
}
async function rowProgression(){
  const saved=JSON.parse(JSON.stringify(fixture({complete:true}))),vowels=data.kana.filter(k=>k.script==='katakana'&&k.row==='a').map(k=>k.id);saved.games['kana-rain'].novelty.seen=Object.fromEntries(vowels.map(id=>[id,true]));
  const p=await open(saved);await start(p);const first=await target(p),order=[first.id,...vowels.filter(id=>id!==first.id),...vowels];assert.equal(order.length,10);assert.ok(vowels.includes(first.id));
  for(const [index,id]of order.entries()){
    const t=index?await next(p,id):first;assert.equal(t.id,id);assert.equal(await p.evaluate(()=>KanaRain.gameData.rows.katakana),1,'K-row stays locked until every vowel has two correct first answers');
    if(index<5)assert.equal(t.hint,t.partner,id+' first appearance shows its hiragana partner instead of romaji');else assert.equal(t.hint,null,id+' hint disappears after a correct answer');
    await answer(p,t);await p.waitForFunction(n=>KanaRain.state.correct===n,index+1);const event=await p.evaluate(()=>Learner.attempts().at(-1));
    assert.equal(event.itemId,id);assert.equal(event.correct,true);assert.equal(event.firstAttempt,true);assert.equal(event.response,t.romaji);assertSoundEvent(event,'typing',id);
  }
  assert.equal(await p.evaluate(()=>KanaRain.gameData.rows.katakana),2,'ten real first hits (two per vowel,100 percent) unlock K-row');
  assert.match(await p.locator('#feedback').textContent(),/A new row is growing: K-row/);assert.doesNotMatch(await p.locator('#feedback').textContent(),/[カキクケコ]/u,'the unlock cue names the row without presenting its future glyphs');
  const readiness=await p.evaluate(ids=>ids.map(id=>{const f=Learner.state(id).facets['form→sound'];return {id,firstCorrect:f.firstCorrect,firstAttempts:f.firstAttempts};}),vowels);for(const row of readiness){assert.equal(row.firstCorrect,2);assert.equal(row.firstAttempts,2);}
  assert.deepEqual(await state(p),{correct:10,errors:0,expirations:0,lives:3,attempts:10,events:saved.attemptLedger.length+10});await finish(p);assert.match(await p.locator('#resultNext').textContent(),/Next: S-row/);assert.deepEqual(await p.locator('#resultStats b').allTextContents(),['10','0','0']);await p.locator('#backBtn').click();
  const ledger=await p.evaluate(async()=>{await Learner.flush();return Learner.attempts();});assert.deepEqual(ledger.slice(0,saved.attemptLedger.length),saved.attemptLedger);assert.deepEqual(await p.evaluate(()=>KanaRain.gameData.best),saved.games['kana-rain'].best);await p.reload();await p.waitForFunction(()=>!!window.KanaRain);assert.equal(await p.evaluate(()=>KanaRain.gameData.rows.katakana),2);assert.deepEqual(await p.evaluate(()=>Learner.attempts()),ledger);assert.equal(await p.evaluate(()=>KanaRain.gameData.katakanaUnlocked),true);pass('ten typed Katakana vowel first hits unlock K-row at100 percent and preserve rows/evidence/bests after reload',{readiness});await p.context().close();
}
async function continuousIntroductions(){
  const saved=JSON.parse(JSON.stringify(fixture({complete:true})));saved.games['kana-rain'].novelty.seen=Object.fromEntries(data.kana.filter(k=>k.script==='hiragana').map(k=>[k.id,true]));
  const p=await open(saved);await start(p);const session=await p.evaluate(()=>KanaRain.state.sessionId),introductions=[];let rounds=0;
  for(;rounds<120;rounds++){
    let spawnGate=null;
    if(!await p.evaluate(()=>KanaRain.state.drops.length)){
      // Advance only the spawn clock: the real refill, queue, warmup and admission choose the next item.
      spawnGate=await p.evaluate(()=>({warmup:KanaRain.state.familiarSinceIntroduction,blocked:KanaRain.gameData.novelty.blocked,cooldown:KanaRain.gameData.novelty.cooldownRemaining}));
      await p.evaluate(()=>KanaRain.state.sinceSpawn=1e9);await p.waitForFunction(()=>KanaRain.state.drops.length===1);await pin(p);
    }
    const t=await target(p),admission=await p.evaluate(()=>{const g=KanaRain.state,d=g.target;return {id:d.id,row:JPData.kanaById[d.id].row,introduction:d.isIntroduction,sessionId:g.sessionId,newIds:[...g.newIds],warmup:g.familiarSinceIntroduction,blocked:KanaRain.gameData.novelty.blocked,cooldown:KanaRain.gameData.novelty.cooldownRemaining,prior:[...g.newIds].filter(id=>id!==d.id).map(id=>{const f=Learner.state(id)?.facets['form→sound'];return {id,firstCorrect:f?.firstCorrect||0,firstAttempts:f?.firstAttempts||0};})};});
    assert.equal(admission.sessionId,session);assert.equal(admission.blocked,false);assert.equal(admission.cooldown,0);assert.equal((await state(p)).errors,0);assert.equal((await state(p)).expirations,0);
    if(admission.row!=='a'&&admission.introduction){
      assert.equal(admission.row,'k','the next normal curriculum row follows the vowels');assert.ok(!introductions.some(k=>k.id===t.id),'each counted debut is a distinct Katakana');assert.equal(t.hint,t.partner,'a K-row debut shows its hiragana partner');
      assert.ok(spawnGate&&spawnGate.warmup>=3,'new Katakana still needs three familiar first hits after the previous introduction');assert.equal(spawnGate.blocked,false);assert.equal(spawnGate.cooldown,0);
      assert.ok(admission.prior.filter(k=>k.firstCorrect<2||k.firstCorrect/k.firstAttempts<.85).length<2,'at most two not-yet-ready Katakana share the admission slots');
      if(introductions.length>=2)assert.ok(admission.prior.some(k=>k.firstCorrect>=2&&k.firstCorrect/k.firstAttempts>=.85),'a practiced Katakana frees a slot before the third new form');
      introductions.push({...admission,spawnGate,afterCorrect:await p.evaluate(()=>KanaRain.state.correct)});
    }
    if(introductions.length>=3){await decoded(p);await geometry(p,'third normal K-row introduction');await p.screenshot({path:path.join(output,'progression-third-k-row.png'),fullPage:true});}
    const before=await state(p);await answer(p,t);await p.waitForFunction(n=>KanaRain.state.correct===n+1,before.correct);const event=await p.evaluate(()=>Learner.attempts().at(-1));assert.equal(event.firstAttempt,true);assert.equal(event.correct,true);assertSoundEvent(event,'typing',t.id);
    if(introductions.length>=3)break;
  }
  assert.equal(introductions.length,3,'ordinary scheduling must admit a third K-row form during the same session, rather than stop forever at two');assert.ok(introductions[2].newIds.length>=3,'newIds retains the historical introductions instead of being cleared');assert.equal(await p.evaluate(()=>KanaRain.gameData.rows.katakana),2);assert.equal(await p.evaluate(()=>KanaRain.state.sessionId),session);
  pass('normal scheduling admits a third Katakana in the same session after practice frees a slot; warmup/brakes remain active',{rounds:rounds+1,introductions});await p.context().close();
}
function coldKatakanaFixture(){
  const saved=JSON.parse(JSON.stringify(fixture({complete:true}))),gd=saved.games['kana-rain'];gd.novelty.seen=Object.fromEntries([...data.kana].filter(k=>k.script==='hiragana').map(k=>[k.id,true]));gd.novelty.recent=[];gd.novelty.blocked=true;gd.novelty.cooldownRemaining=10;
  for(let index=0;index<60;index++){
    const id='kana:'+['あ','い','う','え','お'][index%5],roundId='cold-old-hira:'+index,timeout=index>=58;
    saved.attemptLedger.push({attemptId:roundId+':0',roundId,sessionId:'synthetic-old-hira',itemId:id,facet:'form→sound',responseFormat:'romaji',inputMethod:'typing',firstAttempt:true,assistance:false,assistanceReasons:[],correct:timeout?null:true,outcome:timeout?'timeout':'correct',reason:timeout?'timeout':'accepted',response:timeout?null:data.kanaById[id].romaji,gameId:'kana-rain',at:1700001000000+index*1000});
    gd.novelty.recent.push({roundId,firstCorrect:!timeout,timeout,miss:false,familiar:true});
  }
  return saved;
}
async function coldKatakana(){
  report.coldStarts=[];
  for(const wrongAt of [0,5]){
    const saved=coldKatakanaFixture(),p=await open(saved),expected=wrongAt?15:11,proof={kind:'cold-start',wrongAt,expectedFirstVariationAfter:expected,steps:[]};report.coldStarts.push(proof);await start(p);
    assert.equal(await p.evaluate(()=>KanaRain.gameData.novelty.blocked),true,'Hiragana pressure is inherited without being erased');assert.deepEqual(await p.evaluate(()=>Object.keys(KanaRain.gameData.novelty.seen).filter(id=>JPData.kanaById[id]?.script==='katakana')),['kana:ア']);
    for(let correct=1;correct<=expected;correct++){
      if(!await p.evaluate(()=>KanaRain.state.drops.length)){await p.evaluate(()=>KanaRain.state.sinceSpawn=1e9);await p.waitForFunction(()=>KanaRain.state.drops.length===1);await pin(p);}
      const t=await target(p);assert.equal(t.id,'kana:ア','the shared ten-hit pause cannot be bypassed by a new Katakana or a correction');
      if(correct===wrongAt){await miss(p,t);await p.waitForFunction(()=>KanaRain.state.errors===1);assert.equal(await p.evaluate(()=>KanaRain.gameData.novelty.cooldownRemaining),10,'a real Katakana error resets the inherited shared pause immediately');}
      await answer(p,t);await p.waitForFunction(n=>KanaRain.state.correct===n,correct);
      const pressure=await p.evaluate(()=>({correct:KanaRain.state.correct,errors:KanaRain.state.errors,streak:KanaRain.state.streak,blocked:KanaRain.gameData.novelty.blocked,cooldown:KanaRain.gameData.novelty.cooldownRemaining,katakana:KanaRain.gameData.katakanaNovelty?JSON.parse(JSON.stringify(KanaRain.gameData.katakanaNovelty)):null}));proof.steps.push(pressure);
      if(correct===1||correct===wrongAt)assert.equal(pressure.cooldown,10,'a debut hit or correcting the wrong answer does not repay the familiar-hit pause');
    }
    assert.equal(await p.evaluate(()=>KanaRain.gameData.novelty.cooldownRemaining),0);assert.equal(await p.evaluate(()=>KanaRain.gameData.novelty.blocked),true,'long Hiragana pressure remains saved when Katakana can recover');
    await p.evaluate(()=>KanaRain.state.sinceSpawn=1e9);await p.waitForFunction(()=>KanaRain.state.drops.length===1);await pin(p);const next=await target(p);proof.firstExpectedVariation={...next,state:await state(p)};assert.equal(next.id,'kana:イ','cold Katakana must reach イ after the shared pause recovers, without waiting for the old sixty-round Hiragana window');assert.equal(await p.evaluate(()=>KanaRain.state.target.isIntroduction),true);assert.equal(next.hint,'い');assert.equal(await p.evaluate(()=>KanaRain.gameData.katakanaNovelty.blocked),false);
    assert.equal((await state(p)).errors,Number(!!wrongAt));assert.equal((await state(p)).expirations,0);assert.equal((await state(p)).lives,3);const legacy=saved.attemptLedger,ledger=await p.evaluate(async()=>{await Learner.flush();return Learner.attempts();});assert.deepEqual(ledger.slice(0,legacy.length),legacy,'all pre-existing Hiragana evidence survives the recovery');assert.ok(ledger.slice(legacy.length).every(e=>e.responseFormat==='romaji'&&e.inputMethod==='typing'));
    await p.reload();await p.waitForFunction(()=>!!window.KanaRain);assert.equal(await p.evaluate(()=>KanaRain.gameData.novelty.blocked),true);assert.equal(await p.evaluate(()=>KanaRain.gameData.novelty.cooldownRemaining),0);assert.equal(await p.evaluate(()=>KanaRain.gameData.katakanaNovelty.blocked),false);assert.deepEqual(await p.evaluate(()=>Learner.attempts()),ledger);assert.deepEqual(await p.evaluate(()=>KanaRain.gameData.best),saved.games['kana-rain'].best);
    pass('cold Katakana recovers from inherited Hiragana pressure without erasing it or bypassing new Katakana errors',{wrongAt,firstVariationAfter:expected});await p.context().close();
  }
  // Captured by replaying the original immutable runtime:29 correct,streak17,onlyア.
  // This portable v2 export predates katakanaNovelty; it contains no real learner data.
  const saved=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/cold-katakana-legacy29.json'),'utf8')),gd=saved.games['kana-rain'],legacyKata=saved.attemptLedger.filter(e=>data.kanaById[e.itemId]?.script==='katakana');
  assert.equal(Object.hasOwn(gd,'katakanaNovelty'),false);assert.equal(gd.novelty.blocked,true);assert.equal(gd.novelty.cooldownRemaining,0);assert.equal(legacyKata.length,30);assert.equal(legacyKata.filter(e=>e.correct).length,29);assert.ok(legacyKata.every(e=>e.itemId==='kana:ア'));
  const p=await open(saved),proof={kind:'legacy29',legacyCorrect:29,legacyStreak:17,legacyKatakanaEvents:legacyKata.length};report.coldStarts.push(proof);
  const boot=await p.evaluate(()=>JSON.parse(Learner.export()));assert.deepEqual(boot.attemptLedger,saved.attemptLedger);assert.deepEqual(boot.exposureLedger.slice(0,saved.exposureLedger.length),saved.exposureLedger);for(const key of ['rows','best','accuracy','novelty'])assert.deepEqual(boot.games['kana-rain'][key],gd[key],'migration preserves saved '+key);assert.equal(boot.games['kana-rain'].katakanaNovelty.blocked,false);assert.equal(boot.games['kana-rain'].katakanaNovelty.recent.length,29);proof.boot={globalBlocked:boot.games['kana-rain'].novelty.blocked,cooldown:boot.games['kana-rain'].novelty.cooldownRemaining,katakanaBlocked:boot.games['kana-rain'].katakanaNovelty.blocked};
  await start(p);const t=await target(p);assert.equal(t.id,'kana:イ','the migrated29-hit garden offers the next vowel through ordinary admission immediately');assert.equal(t.format,'romaji','old recognition evidence does not keep the retired choice format');proof.firstTarget=t.id;await answer(p,t);await p.waitForFunction(()=>KanaRain.state.correct===1);const event=await p.evaluate(()=>Learner.attempts().at(-1));assert.equal(event.itemId,'kana:イ');assert.equal(event.response,'i');assertSoundEvent(event,'typing','legacy29 next vowel');
  const beforeReload=await p.evaluate(async()=>{await Learner.flush();return JSON.parse(Learner.export());});assert.deepEqual(beforeReload.attemptLedger.slice(0,saved.attemptLedger.length),saved.attemptLedger,'retired hiragana-choice events keep their exact shape');assert.equal(beforeReload.games['kana-rain'].novelty.blocked,true);assert.equal(beforeReload.games['kana-rain'].novelty.cooldownRemaining,0);for(const key of ['rows','best'])assert.deepEqual(beforeReload.games['kana-rain'][key],gd[key]);
  await p.reload();await p.waitForFunction(()=>!!window.KanaRain);const reloaded=await p.evaluate(()=>JSON.parse(Learner.export()));assert.deepEqual(reloaded.attemptLedger,beforeReload.attemptLedger);assert.deepEqual(reloaded.exposureLedger.slice(0,beforeReload.exposureLedger.length),beforeReload.exposureLedger);for(const key of ['rows','best','novelty','katakanaNovelty'])assert.deepEqual(reloaded.games['kana-rain'][key],beforeReload.games['kana-rain'][key],'reload preserves migrated '+key);proof.reloadPreserved=true;proof.legacyPrefixesPreserved=true;
  pass('legacy29-hit/streak17 Katakana save migrates to the next vowel with all old evidence/pressure/rows/bests preserved after reload',{firstTarget:t.id,legacyKatakanaEvents:legacyKata.length});await p.context().close();
}
async function viewport(width,height){
  const label=width+'x'+height,saved=fixture({legacy:true}),p=await open(saved,{width,height}),expected=method(p);await start(p);let t=await target(p);assert.equal(t.format,'romaji');
  await geometry(p,label+' first drop');
  await miss(p,t);await p.waitForFunction(()=>KanaRain.state.errors===1);assert.equal((await state(p)).lives,3);assert.equal(await p.evaluate(()=>KanaRain.gameData.novelty.cooldownRemaining),10,'a wrong sound immediately pauses new admissions');assert.equal(await p.evaluate(()=>KanaRain.state.familiarSinceIntroduction),0);
  assert.match(await p.locator('#feedback').textContent(),new RegExp('^'+data.kanaById[t.id].char+' = '+t.partner+'\\. You (typed|chose) '),'the correction names the hiragana partner');
  let event=await p.evaluate(()=>Learner.attempts().at(-1));assert.equal(event.correct,false);assertSoundEvent(event,expected,label+' wrong');
  await answer(p,t);await p.waitForFunction(()=>KanaRain.state.correct===1);event=await p.evaluate(()=>Learner.attempts().at(-1));assert.equal(event.correct,true);assert.equal(event.firstAttempt,false);assertSoundEvent(event,expected,label+' correction');assert.equal(await p.evaluate(()=>KanaRain.gameData.novelty.cooldownRemaining),10,'a correction does not repay admission cooldown');
  // The first drop is random; later fixtures avoid it so each one is a genuinely new or distinct mistake.
  const avoid=ids=>ids.find(id=>id!==t.id),expiringId=avoid(['kana:イ','kana:エ']);
  const yoon=await next(p,avoid(['kana:キャ','kana:シュ']));assert.equal(yoon.hint,yoon.partner,'a new yoon shows its hiragana partner');assert.ok(yoon.pad.slot.startsWith('y')&&yoon.pad.reading===yoon.romaji,'a yoon has its own pad slot');const yoonGeometry=await geometry(p,label+' yoon');await decoded(p);await p.screenshot({path:path.join(output,label+'-yoon.png'),fullPage:true});await answer(p,yoon);await p.waitForFunction(()=>KanaRain.state.correct===2);assertSoundEvent(await p.evaluate(()=>Learner.attempts().at(-1)),expected,label+' yoon');
  await next(p,expiringId);await tap(p,p.locator('#pauseBtn'));const paused=await state(p);await tap(p,p.locator('#resumeBtn'));await ready(p);await pin(p);assert.deepEqual(await state(p),paused,'pause and resume add no answers');
  await p.evaluate(()=>{KanaRain.state.drops[0].progress=1;});await p.waitForFunction(()=>KanaRain.state.expirations===1);assert.equal(await p.evaluate(()=>KanaRain.gameData.novelty.cooldownRemaining),10,'an expiration resets the admission hold');assert.equal(await p.evaluate(()=>KanaRain.state.familiarSinceIntroduction),0);
  await next(p,avoid(['kana:ウ','kana:オ']));await geometry(p,label+' two hearts');await p.screenshot({path:path.join(output,label+'-two-hearts.png'),fullPage:true});await finish(p);
  assert.deepEqual(await p.locator('#resultStats b').allTextContents(),['2','1','1']);assert.match(await p.locator('#resultDetails').textContent(),/1 first-try.*1 after correction.*Best streak 1/);assert.ok(await p.locator('#resultReview .review-card').count()>=2);await p.screenshot({path:path.join(output,label+'-results.png'),fullPage:true});await p.locator('#reviewPracticeBtn').scrollIntoViewIfNeeded();await tap(p,p.locator('#reviewPracticeBtn'));await ready(p);await pin(p);assert.equal(await p.evaluate(()=>KanaRain.state.sessionDuration),60);await geometry(p,label+' review');t=await target(p);await answer(p,t);await p.waitForFunction(()=>KanaRain.state.correct===1);await finish(p);await p.locator('#backBtn').scrollIntoViewIfNeeded();await tap(p,p.locator('#backBtn'));assert.equal(await p.locator('#welcome').isVisible(),true);
  const ledger=await p.evaluate(async()=>{await Learner.flush();return Learner.attempts();});assert.deepEqual(ledger.slice(0,saved.attemptLedger.length),saved.attemptLedger);const added=ledger.slice(saved.attemptLedger.length);assert.ok(added.every(e=>e.responseFormat==='romaji'));assert.ok(added.filter(e=>e.outcome!=='timeout').every(e=>e.inputMethod===expected),'every submitted Katakana answer used '+expected);assert.deepEqual(await p.evaluate(()=>KanaRain.gameData.best),saved.games['kana-rain'].best);await p.reload();await p.waitForFunction(()=>!!window.KanaRain);assert.deepEqual(await p.evaluate(()=>Learner.attempts()),ledger);assert.equal(await p.evaluate(()=>KanaRain.gameData.katakanaUnlocked),true);pass(label+' Katakana by '+expected+': hiragana hint/correction, wrong/correction/expiry counts, review/menu/reload and layout',{viewport:label,yoonGeometry});await p.context().close();
}
async function homophones(){
  // Typing a shared sound answers a lone homophone; the pad's exact cell picks the written row.
  const desk=await open(fixture({legacy:true}));await start(desk);await answer(desk,await target(desk));await desk.waitForFunction(()=>KanaRain.state.correct===1);
  for(const [id,typed]of [['kana:ヂ','ji'],['kana:ヅ','zu'],['kana:ヲ','o']]){const t=await next(desk,id);const before=await state(desk);await typeSound(desk,typed);await desk.waitForFunction(n=>KanaRain.state.correct===n+1,before.correct);const event=await desk.evaluate(()=>Learner.attempts().at(-1));assert.equal(event.itemId,id);assert.equal(event.response,typed);assert.equal(t.hint,data.counterpart(id).char);}
  await desk.context().close();
  const phoneContext=await open(fixture({legacy:true}),{width:390,height:844});await start(phoneContext);await answer(phoneContext,await target(phoneContext));await phoneContext.waitForFunction(()=>KanaRain.state.correct===1);
  await phoneContext.evaluate(()=>{const g=KanaRain.state;g.queue=[{id:'kana:ジ'},{id:'kana:ヂ'}];g.sinceSpawn=1e9;});await phoneContext.waitForFunction(()=>KanaRain.state.drops.length===1);await phoneContext.evaluate(()=>KanaRain.state.sinceSpawn=1e9);await phoneContext.waitForFunction(()=>KanaRain.state.drops.length===2);
  await phoneContext.evaluate(()=>{const g=KanaRain.state;g.sinceSpawn=-1e9;g.drops.forEach(d=>{d.progress=d.id==='kana:ジ'?.6:.18;d.v=0;});});await frames(phoneContext);assert.equal((await target(phoneContext)).id,'kana:ジ');
  await pad(phoneContext,{family:'d',slot:'i'});await phoneContext.waitForFunction(()=>KanaRain.state.correct===2);assert.equal(await phoneContext.evaluate(()=>Learner.attempts().at(-1).itemId),'kana:ヂ','the D-family cell answers ヂ even while ジ is lower');assert.deepEqual(await phoneContext.evaluate(()=>KanaRain.state.drops.map(d=>d.id)),['kana:ジ']);
  pass('Katakana homophones: typing a shared sound answers a lone drop and the pad cell keeps the exact written row');await phoneContext.context().close();
}
async function feedbackSafety(){
  report.feedbackSafety=[];
  for(const mobile of [false,true]){
    const saved=coldKatakanaFixture(),gd=saved.games['kana-rain'],unseen=mobile?'kana:カ':'kana:ヌ',label=mobile?'mobile':'desktop';
    gd.rows.katakana=mobile?2:1;gd.novelty.seen['kana:ア']=true;
    if(mobile){
      saved.attemptLedger.push({...attempt('kana:ア',90),attemptId:'old-unseen-confusion',roundId:'old-unseen-round',correct:false,outcome:'incorrect',reason:'different-item',response:'ka',chosenItemId:'kana:カ',candidateItemIds:['kana:カ']});
      saved.exposureLedger.push({exposureId:'old-unseen-review',itemId:'kana:カ',facet:'form→sound',gameId:'kana-rain',reason:'results-review',at:1700000002000,sessionId:'synthetic-old-session',roundId:'old-unseen-round'});
    }
    const p=await open(saved,mobile?{width:390,height:844}:{width:1366,height:768});await start(p);assert.equal((await target(p)).id,'kana:ア');
    assert.equal(await p.evaluate(()=>location.search),'','the regression runs in normal mode, never ?all');assert.equal(await p.evaluate(()=>KanaRain.state.reviewIds),null);
    if(mobile)await pad(p,{family:'k',slot:'a'});else await typeSound(p,'nu');await p.waitForFunction(()=>KanaRain.state.errors===1);
    const error=await p.evaluate(()=>Learner.attempts().at(-1));assert.equal(error.itemId,'kana:ア');assert.equal(error.response,mobile?'ka':'nu');assert.equal(error.chosenItemId,unseen);assert.deepEqual(error.candidateItemIds,[unseen]);assertSoundEvent(error,mobile?'composer':'typing',label+' preserved mistaken sound');
    assert.doesNotMatch(await p.locator('#feedback').textContent(),new RegExp(data.kanaById[unseen].char),'an inferred sound cannot reveal an unintroduced Katakana');
    const safety=await p.evaluate(id=>({seen:KanaRain.gameData.novelty.seen[id]===true,confs:[...KanaRain.state.confs],partners:KanaRain.state.queue.map(entry=>entry.partner).filter(Boolean),cooldown:KanaRain.gameData.novelty.cooldownRemaining,lives:KanaRain.state.lives}),unseen);
    assert.equal(safety.seen,false);assert.deepEqual(safety.confs,[]);assert.deepEqual(safety.partners,[]);assert.equal(safety.cooldown,10);assert.equal(safety.lives,3);
    if(!mobile)for(const raw of ['カ','ｶ','キャ','romajiカmixed','アカ']){
      const before=await state(p);await typeSound(p,raw);await p.waitForFunction(n=>KanaRain.state.errors===n+1,before.errors);
      const event=await p.evaluate(()=>Learner.attempts().at(-1));assert.equal(event.response,raw.toLowerCase().normalize('NFKC'));assert.equal(event.chosenItemId,null);
      const feedback=await p.locator('#feedback').textContent();assert.match(feedback,/^ア = あ\./);assert.doesNotMatch(feedback.slice('ア = あ.'.length),/[ァ-ヿｦ-ﾟ]/u,'an unsafe pasted response is stored without being echoed in feedback');
    }
    await decoded(p);await p.screenshot({path:path.join(output,'feedback-unseen-'+label+'.png'),fullPage:true});
    // Saved confusion evidence is durable. A stale transient review entry must still be filtered at rendering.
    if(mobile)await p.evaluate(()=>KanaRain.state.confs.add('kana:ア|kana:カ'));
    const exposureCount=await p.evaluate(()=>Learner.exposures().length);await finish(p);
    assert.deepEqual(await p.locator('#resultStats b').allTextContents(),['0',mobile?'1':'6','0']);assert.deepEqual(await p.locator('#resultReview .review-card > span[lang=ja]').allTextContents(),['ア']);
    assert.deepEqual(await p.locator('#resultNext .next-kana > span[lang=ja]').allTextContents(),['ア'],'automatic readiness guidance only names the presented Katakana');assert.match(await p.locator('#resultNext').textContent(),new RegExp('0 / '+(mobile?10:5)+' kana ready'));assert.match(await p.locator('#resultNext .next-more').textContent(),new RegExp('\\+'+(mobile?9:4)+' more kana'));
    assert.equal(await p.evaluate(({id,start})=>Learner.exposures().slice(start).some(event=>event.itemId===id),{id:unseen,start:exposureCount}),false,'review does not create a new exposure for the hidden partner');
    await p.screenshot({path:path.join(output,'feedback-review-'+label+'.png'),fullPage:true});await p.locator('#reviewPracticeBtn').scrollIntoViewIfNeeded();await tap(p,p.locator('#reviewPracticeBtn'));await ready(p);await pin(p);assert.deepEqual(await p.evaluate(()=>KanaRain.state.reviewIds),['kana:ア']);await finish(p);
    const beforeReload=await p.evaluate(async()=>{await Learner.flush();return JSON.parse(Learner.export());});assert.deepEqual(beforeReload.attemptLedger.slice(0,saved.attemptLedger.length),saved.attemptLedger);assert.deepEqual(beforeReload.exposureLedger.slice(0,saved.exposureLedger.length),saved.exposureLedger);
    await p.reload();await p.waitForFunction(()=>!!window.KanaRain);const after=await p.evaluate(()=>JSON.parse(Learner.export()));assert.deepEqual(after.attemptLedger,beforeReload.attemptLedger);assert.deepEqual(after.exposureLedger.slice(0,beforeReload.exposureLedger.length),beforeReload.exposureLedger);assert.ok(!after.exposureLedger.slice(beforeReload.exposureLedger.length).some(event=>event.itemId===unseen),'normal menu references do not expose the hidden Katakana');for(const key of ['rows','best'])assert.deepEqual(after.games['kana-rain'][key],gd[key]);assert.notEqual(after.games['kana-rain'].novelty.seen[unseen],true);
    if(mobile)assert.equal(await p.evaluate(()=>Learner.state('kana:ア').confusions['kana:カ']),2,'the historical confusion and the new mistake both remain evidence');
    const proof={input:mobile?'composer':'typing',unseen,rows:gd.rows.katakana,legacyEvidencePreserved:true,review:['kana:ア'],rawPasteCases:mobile?0:5};report.feedbackSafety.push(proof);pass(label+' normal Katakana errors keep unintroduced glyphs out of feedback/review while preserving responses and legacy progress',proof);await p.context().close();
  }
}
(async()=>{fs.mkdirSync(output,{recursive:true});report.mode=coldOnly?'cold-start':'full';server=spawn(process.execPath,[path.join(root,'scripts/serve.cjs')],{cwd:root,env:{...process.env,PORT:'4189'},windowsHide:true,stdio:['ignore','pipe','pipe']});await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(Error('Owned server exited '+code)));});const channel=process.env.PLAYWRIGHT_BROWSER_CHANNEL;browser=await chromium.launch({headless:true,...(channel?{channel}:{})});if(coldOnly)await coldKatakana();else{await gates();await coldKatakana();await rowProgression();await continuousIntroductions();for(const [w,h]of [[320,568],[390,844],[761,600],[1366,768],[568,320]])await viewport(w,h);await homophones();await feedbackSafety();}assert.deepEqual(errors,[]);report.pass=true;console.log('PASS Katakana bridge: '+checks.length+' checks, zero page errors.');})().catch(e=>{report.pass=false;report.failure=e.stack||String(e);console.error(e);process.exitCode=1;}).finally(async()=>{for(const c of contexts)await c.close().catch(()=>{});if(browser)await browser.close();if(server&&server.exitCode===null){server.kill();await new Promise(resolve=>{server.once('exit',resolve);setTimeout(resolve,1500);});}report.browserClosed=true;report.contextsClosed=contexts.length;report.serverClosed=!server||server.exitCode!==null||server.signalCode!==null;report.finishedAt=new Date().toISOString();fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,coldOnly?'verification-cold-start.json':'verification.json'),JSON.stringify(report,null,2)+'\n');});
