'use strict';
// First-presentation rules stay active without a progress-counter UI.
// Every check uses synthetic history in isolated storage, never a real profile.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(__dirname,'artifacts/novelty-presentation');
const url='http://127.0.0.1:4186',checks=[],errors=[],contexts=[];
let browser,server;

async function context(viewport={width:1920,height:1080},remoteName=false,fixtureKind='held'){
  const ctx=await browser.newContext({viewport,isMobile:viewport.width<500,hasTouch:viewport.width<500,serviceWorkers:'block'});
  contexts.push(ctx);
  const origin=remoteName?'http://kana-rain.invalid:4186':url;
  await ctx.addCookies([{name:'ng_analytics_consent',value:'denied',url:origin,sameSite:'Lax'}]);
  await ctx.route('**/*',async route=>{
    const target=new URL(route.request().url());
    if(remoteName&&target.hostname==='kana-rain.invalid'){
      const response=await route.fetch({url:url+target.pathname+target.search});
      await route.fulfill({response});
    }else if(target.hostname==='127.0.0.1'||['data:','blob:'].includes(target.protocol))await route.continue();
    else await route.abort();
  });
  await ctx.addInitScript(fixtureKind=>{
    if(localStorage.getItem('novelty-presentation-fixture'))return;
    const chars=fixtureKind==='empty'?[]:fixtureKind==='vowel-hold'?['あ']:['あ','い','う','え','お'];
    const seen=Object.fromEntries(chars.map(char=>['kana:'+char,true]));
    const recent=fixtureKind==='held'?Array.from({length:60},(_,i)=>({roundId:'seed:'+i,firstCorrect:i<54,timeout:i>=58})):[];
    const saved={version:2,created:Date.now(),items:{},games:{'kana-rain':{rows:{hiragana:3,katakana:1},best:{},accuracy:{},playStyle:'arcade',sound:false,novelty:{version:1,pace:'calm',seen,recent,blocked:fixtureKind==='held'||fixtureKind==='empty',cooldownRemaining:['empty','vowel-hold'].includes(fixtureKind)?10:0}}}};
    localStorage.setItem('jp-learner-v1',JSON.stringify(saved));
    localStorage.setItem('novelty-presentation-fixture','1');
  },fixtureKind);
  const page=await ctx.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin);
  await page.waitForFunction(()=>!!window.KanaRain);
  return page;
}
async function ready(page){
  for(let i=0;i<12;i++){
    if(await page.locator('#countdownOverlay').isVisible())await page.locator('#skipCountdown').click();
    if(await page.evaluate(()=>KanaRain.state&&!KanaRain.state.paused&&!KanaRain.state.countingDown))return;
    await page.waitForTimeout(30);
  }
  throw new Error('Game did not reach active play');
}
async function start(page){await page.locator('#startBtn').click();await ready(page);await freezeScheduling(page);}
async function freezeScheduling(page){
  await page.evaluate(()=>{KanaRain.state.sinceSpawn=-100000;KanaRain.state.drops.forEach(drop=>drop.progress=0);});
}
async function noCounter(page){
  assert.equal(await page.locator('#noveltyHud,#noveltyGate,#noveltyRecent,#noveltyIntroduced,#noveltySession,#noveltyDetails').count(),0,'presentation-counter DOM is removed');
  assert.equal(await page.locator('#gameHud').evaluate(el=>el.classList.contains('has-novelty')),false,'HUD does not reserve space for the removed panel');
  assert.doesNotMatch(await page.locator('#gameHud').textContent(),/NEW KANA|INTRODUCED|Familiar drops|first-try hits|ON HOLD/i,'live presentation counters are absent');
}
async function noveltyState(page){
  return page.evaluate(()=>{
    const novelty=KanaRain.gameData.novelty,g=KanaRain.state;
    return {blocked:novelty.blocked,cooldown:novelty.cooldownRemaining,recent:novelty.recent,seen:novelty.seen,introduced:[...g.newIds],familiar:g.familiarSinceIntroduction,drops:g.drops.map(d=>({id:d.id,isIntroduction:d.isIntroduction}))};
  });
}
async function spawnFromQueue(page,id){
  const count=await page.evaluate(()=>KanaRain.state.drops.length);
  await page.evaluate(id=>{const g=KanaRain.state;g.queue=[{id}];g.sinceSpawn=100000;},id);
  await page.waitForFunction(count=>KanaRain.state.drops.length===count+1,count);
  await freezeScheduling(page);
}
async function spawnNext(page,id='kana:あ'){
  assert.equal(await page.evaluate(()=>KanaRain.state.drops.length),0,'controlled spawn starts with an empty field');
  await spawnFromQueue(page,id);
}
async function answer(page){
  const before=await page.evaluate(()=>({correct:KanaRain.state.correct,count:KanaRain.state.drops.length}));
  const text=await page.evaluate(()=>KanaRain.accepted(KanaRain.state.drops[0].id)[0]);
  await page.locator('#answer').fill(text);
  await page.waitForFunction(value=>KanaRain.state.correct===value,before.correct+1);
  assert.equal(await page.evaluate(()=>KanaRain.state.drops.length),before.count-1,'answered drop leaves the field');
}
async function familiar(page,count){for(let i=0;i<count;i++){await spawnNext(page);await answer(page);}}
async function expire(page){
  await spawnNext(page);
  await page.evaluate(()=>{KanaRain.state.drops[0].progress=1;});
  await page.waitForFunction(()=>KanaRain.state.drops.length===0);
}
async function misread(page){
  await spawnNext(page);
  const attempts=await page.evaluate(()=>KanaRain.state.attempts);
  await page.locator('#answer').fill('zzz');await page.locator('#answer').press('Enter');
  await page.waitForFunction(value=>KanaRain.state.attempts===value+1,attempts);
  await answer(page);
}
async function screenshot(page,name){await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});}
async function finish(page){await page.locator('#pauseBtn').click();await page.locator('#finishBtn').click();await page.locator('#results').waitFor({state:'visible'});}
async function behavior(){
  const page=await context();await start(page);await noCounter(page);
  let state=await noveltyState(page);
  assert.equal(state.blocked,true);assert.deepEqual(state.introduced,[]);
  assert.equal(state.recent.length,60);assert.equal(state.recent.filter(e=>e.firstCorrect).length,54);assert.equal(state.recent.filter(e=>e.timeout).length,2);
  await screenshot(page,'01-held-without-counter');
  // The saved window holds four corrected rounds (saved before misses were flagged) and two expirations.
  await answer(page);await familiar(page,53);
  assert.equal((await noveltyState(page)).blocked,true,'54 fresh hits still leave the four saved corrections in the 60-drop window');
  await familiar(page,1);
  assert.equal((await noveltyState(page)).blocked,true,'55 hits cannot reopen admission while two expirations remain');
  await familiar(page,3);assert.equal((await noveltyState(page)).blocked,true,'58 hits still retain both expirations');
  await familiar(page,1);assert.equal((await noveltyState(page)).blocked,false,'59 hits and one remaining expiration reopen admission');
  const correct=await page.evaluate(()=>KanaRain.state.correct);
  await spawnNext(page,'kana:か');state=await noveltyState(page);
  assert.equal(state.drops[0].id,'kana:か');assert.equal(state.drops[0].isIntroduction,true);
  assert.equal(state.seen['kana:か'],true,'presentation is saved before the answer');
  assert.equal(await page.evaluate(()=>KanaRain.state.correct),correct,'presenting kana does not manufacture a correct answer');
  assert.deepEqual(state.introduced,['kana:か']);assert.equal(state.familiar,0);
  await spawnFromQueue(page,'kana:き');state=await noveltyState(page);
  assert.equal(state.drops.filter(d=>d.isIntroduction).length,1,'only one debut may occupy the screen');
  assert.equal(state.seen['kana:き'],undefined,'a deferred kana is not prematurely marked seen');
  assert.deepEqual(state.introduced,['kana:か']);
  await screenshot(page,'02-first-debut-without-counter');
  await answer(page);await answer(page);
  for(const expectedFamiliar of [2,3]){
    await spawnNext(page,'kana:き');state=await noveltyState(page);
    assert.notEqual(state.drops[0].id,'kana:き','new kana waits for three completed familiar drops');
    await answer(page);assert.equal((await noveltyState(page)).familiar,expectedFamiliar);
  }
  await spawnNext(page,'kana:き');state=await noveltyState(page);
  assert.equal(state.drops[0].id,'kana:き');assert.deepEqual(state.introduced,['kana:か','kana:き']);
  await answer(page);await familiar(page,3);await spawnNext(page,'kana:く');state=await noveltyState(page);
  assert.notEqual(state.drops[0].id,'kana:く','third debut is replaced with familiar content');
  assert.equal(state.blocked,false,'session budget and recent-error pressure remain distinct');
  assert.equal(state.seen['kana:く'],undefined);assert.equal(state.introduced.length,2);
  await screenshot(page,'03-budget-without-counter');await answer(page);
  await expire(page);await expire(page);
  assert.equal((await noveltyState(page)).blocked,true,'two real expirations close admission');
  assert.equal((await noveltyState(page)).cooldown,10,'expiration also starts the persistent cooldown');
  assert.equal(await page.evaluate(()=>KanaRain.state.lives),1,'real expirations retain the arcade heart cost');
  for(let i=0;i<3;i++)await misread(page);
  assert.equal((await noveltyState(page)).blocked,true,'the expiration brake remains closed during misreadings');
  await misread(page);
  state=await noveltyState(page);
  assert.equal(state.blocked,true,'four wrong first answers on familiar kana close admission');
  assert.deepEqual(state.recent.slice(-6).map(e=>[e.timeout,e.miss]),[[true,false],[true,false],[false,true],[false,true],[false,true],[false,true]]);
  assert.equal(await page.evaluate(()=>KanaRain.state.lives),1,'wrong answers do not cost hearts');
  const snapshot=await page.evaluate(()=>JSON.stringify(KanaRain.gameData.novelty));
  await finish(page);await page.locator('#againBtn').click();await ready(page);await freezeScheduling(page);
  state=await noveltyState(page);assert.equal(state.blocked,true);assert.deepEqual(state.introduced,[]);
  assert.equal(await page.evaluate(()=>JSON.stringify(KanaRain.gameData.novelty)),snapshot,'restart retains the pressure window and seen content');
  await page.reload();await page.waitForFunction(()=>!!window.KanaRain);await start(page);await noCounter(page);
  state=await noveltyState(page);assert.equal(state.blocked,true);assert.deepEqual(state.introduced,[]);
  assert.equal(await page.evaluate(()=>JSON.stringify(KanaRain.gameData.novelty)),snapshot,'reload preserves durable novelty state');
  checks.push({check:'recovery requires at most one expiration, first presentation, one debut, three first-try familiar hits, two-kana budget, two expirations/four misreadings close admission, restart/reload persistence without counters',pass:true});
  await page.close();
}
async function safeguards(){
  const page=await context(undefined,false,'open');await start(page);await answer(page);await familiar(page,2);
  await spawnNext(page,'kana:か');await spawnFromQueue(page,'kana:あ');
  await page.evaluate(()=>{KanaRain.state.drops.forEach(d=>d.progress=d.id==='kana:あ'?.3:0);});
  await page.waitForFunction(()=>KanaRain.state.target.id==='kana:あ');
  const before=await noveltyState(page);await page.locator('#answer').fill('zzz');await page.locator('#answer').press('Enter');
  await page.waitForFunction(()=>KanaRain.gameData.novelty.cooldownRemaining===10);
  let state=await noveltyState(page);assert.equal(state.recent.length,before.recent.length,'wrong submission pauses before the round completes');assert.equal(state.familiar,0);
  await page.locator('#answer').fill('a');await page.waitForFunction(()=>!KanaRain.state.drops.some(d=>d.id==='kana:あ'));
  assert.equal((await noveltyState(page)).cooldown,10,'correcting a wrong first answer earns no cooldown credit');assert.equal((await noveltyState(page)).familiar,0);
  await answer(page);assert.equal((await noveltyState(page)).cooldown,10,'a first-try debut answer earns no familiar cooldown credit');assert.equal((await noveltyState(page)).familiar,0);
  await finish(page);await page.locator('#againBtn').click();await ready(page);await freezeScheduling(page);assert.equal((await noveltyState(page)).cooldown,10,'restart retains cooldown');
  await page.reload();await page.waitForFunction(()=>!!window.KanaRain);assert.equal(await page.evaluate(()=>KanaRain.gameData.novelty.cooldownRemaining),10,'reload retains cooldown');await start(page);await answer(page);await familiar(page,8);
  assert.equal((await noveltyState(page)).cooldown,1,'nine familiar first-try hits are insufficient');
  await spawnNext(page,'kana:き');state=await noveltyState(page);assert.equal(state.seen['kana:き'],undefined,'new kana stays deferred before the tenth hit');assert.notEqual(state.drops[0].id,'kana:き');await answer(page);
  assert.equal((await noveltyState(page)).cooldown,0);await spawnNext(page,'kana:き');assert.equal((await noveltyState(page)).drops[0].id,'kana:き');await answer(page);
  // A wrong answer on the debut itself also starts the immediate hold.
  await finish(page);await page.locator('#againBtn').click();await ready(page);await freezeScheduling(page);await answer(page);await familiar(page,2);await spawnNext(page,'kana:く');assert.equal((await noveltyState(page)).drops[0].isIntroduction,true);await page.locator('#answer').fill('zzz');await page.locator('#answer').press('Enter');assert.equal((await noveltyState(page)).cooldown,10);await answer(page);assert.equal((await noveltyState(page)).cooldown,10);
  checks.push({check:'wrong submission pauses immediately; corrected/debut answers earn no cooldown credit; ten familiar first hits are required across restart/reload',pass:true});await page.close();
  const vowel=await context(undefined,false,'vowel-hold');await start(vowel);await answer(vowel);await spawnNext(vowel,'kana:い');const held=await noveltyState(vowel);assert.equal(held.seen['kana:い'],undefined,'unseen starter vowel obeys the hold once a familiar kana exists');assert.notEqual(held.drops[0].id,'kana:い');await vowel.close();
  const empty=await context(undefined,false,'empty');await start(empty);const boot=await noveltyState(empty);assert.equal(boot.drops[0].isIntroduction,true);assert.equal(boot.drops[0].id,'kana:あ');assert.equal(boot.cooldown,10);checks.push({check:'starter vowels bootstrap only an alphabet without familiar content and otherwise obey both brakes',pass:true});await empty.close();
}
async function responsive(){
  for(const [width,height] of [[1920,1080],[1366,768],[1200,768],[1024,768],[390,844],[320,568],[844,390],[640,360]]){
    const page=await context({width,height});await start(page);await noCounter(page);
    const label=`${width}x${height}`;
    await screenshot(page,'layout-'+label);
    const layout=await page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
      const values=['score','streak','time'].map(id=>{
        const element=document.getElementById(id),range=document.createRange();range.selectNodeContents(element);
        const ink=range.getBoundingClientRect(),parent=element.closest('.stat').getBoundingClientRect();
        return {id,text:element.textContent,ink:{left:ink.left,right:ink.right},parent:{left:parent.left,right:parent.right}};
      });
      const controls=[...document.querySelectorAll('.hud-actions button,.utility-controls button')].map(el=>({id:el.id,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}));
      const travel=KanaRain.state.drops.map(drop=>({id:drop.id,height:drop.h,distance:Math.max(8,document.querySelector('#field').clientHeight-drop.h-27)-8}));
      return {viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},stats:rect('.hud-stats'),stat:rect('.hud-stats .stat'),mode:rect('.mode-plaque'),actions:rect('.hud-actions'),field:rect('#field'),dock:rect('#answerDock'),hearts:rect('#lives'),best:rect('#personalBest'),values,controls,travel};
    });
    assert.ok(layout.document.width<=width+1&&layout.document.height<=height+1,label+' must not create page scroll');
    if(layout.best.width&&layout.best.height){
      const a=layout.best,b=layout.stats;
      assert.ok(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom,label+' personal best must not overlap stats');
    }
    for(const value of layout.values)assert.ok(value.ink.left>=value.parent.left+2&&value.ink.right<=value.parent.right-2,label+' '+value.id+' glyphs fit their plaque: '+JSON.stringify(value));
    for(const key of ['stats','mode','actions','hearts']){
      const r=layout[key];if(r.width&&r.height)assert.ok(r.left>=-1&&r.right<=width+1&&r.top>=-1&&r.bottom<=height+1,label+' '+key+' stays in viewport');
    }
    for(const control of layout.controls)if(control.width&&control.height)assert.ok(control.width>=32&&control.width<=64&&control.height>=32&&control.height<=64,label+' '+control.id+' retains compact usable controls');
    assert.ok(layout.field.top>=Math.max(layout.stats.bottom,layout.mode.bottom,layout.actions.bottom)-1,label+' HUD stays above falling kana');
    const a=layout.field,b=layout.dock;
    assert.ok((a.right<=b.left+1||a.left>=b.right-1||a.bottom<=b.top+1||a.top>=b.bottom-1)&&a.height>0,label+' input preserves positive playfield');
    assert.ok(layout.travel.every(drop=>drop.distance>0),label+' falling kana have positive travel, preserving urgency targeting: '+JSON.stringify(layout.travel));
    if(width>=1200){
      assert.ok(Math.abs(layout.mode.top-layout.stat.top)<=2&&Math.abs(layout.actions.top-layout.stat.top)<=2,label+' desktop HUD shares its top row');
      assert.ok(layout.mode.right<=layout.stats.left+1&&layout.stats.right<=layout.actions.left+1,label+' desktop mode, stats and actions do not overlap');
    }
    await page.evaluate(()=>{KanaRain.state.score=9876;KanaRain.state.streak=122;KanaRain.state.t=600;});
    await answer(page);
    assert.equal(await page.locator('#streak').textContent(),'×123');
    assert.equal(await page.locator('#time').textContent(),'10:00');
    const longValues=await page.evaluate(()=>['score','streak','time'].map(id=>{
      const element=document.getElementById(id),range=document.createRange();range.selectNodeContents(element);
      const ink=range.getBoundingClientRect(),parent=element.closest('.stat').getBoundingClientRect();
      return {id,text:element.textContent,ink:{left:ink.left,right:ink.right},parent:{left:parent.left,right:parent.right},font:getComputedStyle(element).fontSize};
    }));
    for(const value of longValues)assert.ok(value.ink.left>=value.parent.left-1&&value.ink.right<=value.parent.right+1,label+' long '+value.id+' text fits: '+JSON.stringify(value));
    await screenshot(page,'long-values-'+label);
    checks.push({check:'responsive HUD geometry, compact controls and long values without novelty counters',label,layout,longValues});await page.close();
  }
}
async function smallScreenTarget(){
  const page=await context({width:320,height:568});
  await page.locator('#difficultySelect').selectOption('easy');await start(page);
  const first=await page.evaluate(()=>KanaRain.state.target.roundId);
  await page.locator('#answer').fill('partial');
  await page.evaluate(()=>{KanaRain.state.queue.unshift({id:'kana:あ'});KanaRain.state.sinceSpawn=100000;});
  await page.waitForFunction(first=>KanaRain.state.drops.some(drop=>drop.id==='kana:あ'&&drop.roundId!==first),first);
  const next=await page.evaluate(first=>KanaRain.state.drops.find(drop=>drop.id==='kana:あ'&&drop.roundId!==first).roundId,first);
  await page.evaluate(next=>{KanaRain.state.sinceSpawn=-100000;KanaRain.state.drops.forEach(drop=>drop.progress=drop.roundId===next?.15:0);},next);
  await page.waitForFunction(next=>KanaRain.state.target.roundId===next,next,{timeout:3000});
  assert.equal(await page.locator('#answer').inputValue(),'partial','changing urgency preserves an unfinished romaji answer');
  checks.push({check:'small portrait retains positive rain travel and switches to the lower target',pass:true});await page.close();
}
async function scope(){
  const page=await context({width:1366,height:768},true);await start(page);await noCounter(page);
  checks.push({check:'no presentation counter on a non-loopback hostname, without external network access',pass:true});await page.close();
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  server=spawn(process.execPath,[path.join(root,'scripts/serve.cjs')],{cwd:root,env:{...process.env,PORT:'4186'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});
  const channel=process.env.PLAYWRIGHT_BROWSER_CHANNEL;
  browser=await chromium.launch({headless:true,...(channel?{channel}:{})});
  await behavior();await safeguards();await responsive();await smallScreenTarget();await scope();assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({verifiedAt:new Date().toISOString(),syntheticProgress:true,productionAccess:false,checks,errors},null,2)+'\n');
  console.log('PASS: novelty presentation rules without counters; '+checks.length+' checks, zero page errors.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  if(browser)await browser.close();if(server)server.kill();
});
