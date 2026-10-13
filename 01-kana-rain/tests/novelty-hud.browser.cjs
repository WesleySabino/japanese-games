'use strict';
// Local-only UI experiment. Every check uses synthetic history in isolated storage.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(__dirname,'artifacts/novelty-hud');
const url='http://127.0.0.1:4186',checks=[],errors=[],contexts=[];
let browser,server;

async function context(viewport={width:1920,height:1080},remoteName=false){
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
  await ctx.addInitScript(()=>{
    if(localStorage.getItem('novelty-hud-fixture'))return;
    const seen=Object.fromEntries(['あ','い','う','え','お'].map(char=>['kana:'+char,true]));
    const recent=Array.from({length:12},(_,i)=>({roundId:'seed:'+i,firstCorrect:i<10,timeout:i>=10}));
    const saved={version:2,created:Date.now(),items:{},games:{'kana-rain':{rows:{hiragana:3,katakana:1},best:{},accuracy:{},playStyle:'arcade',sound:false,novelty:{version:1,seen,recent,blocked:true}}}};
    localStorage.setItem('jp-learner-v1',JSON.stringify(saved));
    localStorage.setItem('novelty-hud-fixture','1');
  });
  const page=await ctx.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin);
  await page.waitForFunction(()=>!!window.KanaRain);
  return page;
}
async function ready(page){
  for(let i=0;i<12;i++){
    if(await page.locator('#featureDialog').isVisible()){await page.locator('#continueFeatureBtn').click();continue;}
    if(await page.locator('#scriptDialog').isVisible()){await page.locator('#continueScriptBtn').click();continue;}
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
async function spawnNext(page,id='kana:あ'){
  assert.equal(await page.evaluate(()=>KanaRain.state.drops.length),0,'controlled spawn starts with an empty field');
  await page.evaluate(id=>{const g=KanaRain.state;g.queue=[{id}];g.sinceSpawn=100000;},id);
  await page.waitForFunction(()=>KanaRain.state.drops.length>0);
  await freezeScheduling(page);
}
async function answer(page){
  const before=await page.evaluate(()=>KanaRain.state.correct);
  const text=await page.evaluate(()=>KanaRain.accepted(KanaRain.state.drops[0].id,KanaRain.state.drops[0].kanaOnly)[0]);
  await page.locator('#answer').fill(text);
  await page.waitForFunction(value=>KanaRain.state.correct===value,before+1);
  assert.equal(await page.evaluate(()=>KanaRain.state.drops.length),0,'answered drop leaves the field');
}
async function familiar(page,count){for(let i=0;i<count;i++){await spawnNext(page);await answer(page);}}
async function expire(page){
  await spawnNext(page);
  await page.evaluate(()=>{KanaRain.state.drops[0].progress=1;});
  await page.waitForFunction(()=>KanaRain.state.drops.length===0);
}
async function screenshot(page,name){await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});}
async function finish(page){await page.locator('#pauseBtn').click();await page.locator('#finishBtn').click();await page.locator('#results').waitFor({state:'visible'});}
async function behavior(){
  const page=await context();await start(page);
  assert.equal(await page.locator('#noveltyHud').isVisible(),true);
  assert.equal(await page.locator('#noveltyGate').textContent(),'ON HOLD');
  assert.equal(await page.locator('#noveltyIntroduced').textContent(),'0 / 2');
  assert.match(await page.locator('#noveltyRecent').textContent(),/10.*2/);
  await screenshot(page,'01-held');
  await answer(page);await familiar(page,9);
  assert.equal(await page.locator('#noveltyGate').textContent(),'ON HOLD','ten fresh hits still leave both expirations in the window');
  await familiar(page,1);
  assert.equal(await page.locator('#noveltyGate').textContent(),'OPEN');
  const correct=await page.evaluate(()=>KanaRain.state.correct);
  await spawnNext(page,'kana:か');
  assert.equal(await page.evaluate(()=>KanaRain.state.drops[0].id),'kana:か');
  assert.equal(await page.evaluate(()=>KanaRain.state.correct),correct,'presentation updates counter before an answer');
  assert.equal(await page.locator('#noveltyIntroduced').textContent(),'1 / 2');
  assert.match(await page.locator('#noveltySession').textContent(),/screen/i);
  await screenshot(page,'02-first-debut');await answer(page);
  await familiar(page,3);await spawnNext(page,'kana:き');
  assert.equal(await page.evaluate(()=>KanaRain.state.drops[0].id),'kana:き');
  assert.equal(await page.locator('#noveltyIntroduced').textContent(),'2 / 2');
  await answer(page);await familiar(page,3);await spawnNext(page,'kana:く');
  assert.notEqual(await page.evaluate(()=>KanaRain.state.drops[0].id),'kana:く','third debut is replaced with familiar content');
  assert.equal(await page.locator('#noveltyGate').textContent(),'OPEN','budget and pressure remain distinct');
  assert.match(await page.locator('#noveltySession').textContent(),/limit/i);
  await screenshot(page,'03-budget');await answer(page);
  await expire(page);await expire(page);
  assert.equal(await page.locator('#noveltyGate').textContent(),'ON HOLD');
  assert.equal(await page.evaluate(()=>KanaRain.state.lives),1,'real expirations retain the arcade heart cost');
  const snapshot=await page.evaluate(()=>JSON.stringify(KanaRain.gameData.novelty));
  await finish(page);await page.locator('#againBtn').click();await ready(page);await freezeScheduling(page);
  assert.equal(await page.locator('#noveltyGate').textContent(),'ON HOLD');
  assert.equal(await page.locator('#noveltyIntroduced').textContent(),'0 / 2');
  assert.equal(await page.evaluate(()=>JSON.stringify(KanaRain.gameData.novelty)),snapshot,'restart retains the pressure window and seen content');
  await page.reload();await page.waitForFunction(()=>!!window.KanaRain);await start(page);
  assert.equal(await page.locator('#noveltyGate').textContent(),'ON HOLD');
  assert.equal(await page.locator('#noveltyIntroduced').textContent(),'0 / 2');
  assert.equal(await page.evaluate(()=>JSON.stringify(KanaRain.gameData.novelty)),snapshot,'reload preserves durable novelty state');
  checks.push({check:'recovery, presentations before answers, spacing, budget, real expirations, restart and reload',pass:true});
  await page.close();
}
async function responsive(){
  for(const [width,height] of [[1920,1080],[1366,768],[1200,768],[1024,768],[390,844],[320,568],[844,390],[640,360]]){
    const page=await context({width,height});await start(page);
    const label=`${width}x${height}`;
    await screenshot(page,'layout-'+label);
    const layout=await page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
      const values=['score','streak','time'].map(id=>{
        const element=document.getElementById(id),range=document.createRange();range.selectNodeContents(element);
        const ink=range.getBoundingClientRect(),parent=element.closest('.stat').getBoundingClientRect();
        return {id,text:element.textContent,ink:{left:ink.left,right:ink.right},parent:{left:parent.left,right:parent.right}};
      });
      const travel=KanaRain.state.drops.map(drop=>({id:drop.id,height:drop.h,distance:Math.max(8,document.querySelector('#field').clientHeight-drop.h-27)-8}));
      return {viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},stats:rect('.hud-stats'),stat:rect('.hud-stats .stat'),novelty:rect('#noveltyHud'),mode:rect('.mode-plaque'),actions:rect('.hud-actions'),field:rect('#field'),dock:rect('#answerDock'),hearts:rect('#lives'),best:rect('#personalBest'),values,travel};
    });
    assert.ok(layout.document.width<=width+1&&layout.document.height<=height+1,label+' must not create page scroll');
    assert.ok(Math.abs(layout.stat.top-layout.novelty.top)<=2,label+' novelty and score share one row: '+JSON.stringify(layout));
    assert.ok(layout.stats.right<=layout.novelty.left+1,label+' stats and novelty do not overlap');
    if(layout.best.width&&layout.best.height)for(const key of ['stats','novelty']){
      const a=layout.best,b=layout[key];
      assert.ok(a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom,label+' personal best must not overlap '+key);
    }
    for(const value of layout.values)assert.ok(value.ink.left>=value.parent.left+2&&value.ink.right<=value.parent.right-2,label+' '+value.id+' glyphs fit their plaque: '+JSON.stringify(value));
    for(const key of ['stats','novelty','mode','actions','hearts']){
      const r=layout[key];assert.ok(r.left>=-1&&r.right<=width+1&&r.top>=-1&&r.bottom<=height+1,label+' '+key+' stays in viewport');
    }
    assert.ok(layout.field.top>=Math.max(layout.stats.bottom,layout.novelty.bottom,layout.mode.bottom,layout.actions.bottom)-1,label+' HUD stays above falling kana');
    assert.ok(layout.field.bottom<=layout.dock.top+1&&layout.field.height>0,label+' input preserves positive playfield');
    assert.ok(layout.travel.every(drop=>drop.distance>0),label+' falling kana have positive travel, preserving urgency targeting: '+JSON.stringify(layout.travel));
    if(width>=1200){
      assert.ok(Math.abs(layout.mode.top-layout.novelty.top)<=2&&Math.abs(layout.actions.top-layout.novelty.top)<=2,label+' desktop HUD shares its top row');
      assert.ok(layout.mode.right<=layout.stats.left+1&&layout.novelty.right<=layout.actions.left+1,label+' desktop mode, stats, experiment and actions do not overlap');
    }
    await page.evaluate(()=>{KanaRain.state.score=9876;KanaRain.state.streak=122;KanaRain.state.t=600;});
    await answer(page);
    assert.equal(await page.locator('#streak').textContent(),'×123');
    assert.equal(await page.locator('#time').textContent(),'10:00');
    const longValues=await page.evaluate(()=>['score','streak','time','noveltyGate','noveltyIntroduced'].map(id=>{
      const element=document.getElementById(id),range=document.createRange();range.selectNodeContents(element);
      const ink=range.getBoundingClientRect(),parent=element.closest('.stat')?.getBoundingClientRect()||element.getBoundingClientRect();
      return {id,text:element.textContent,ink:{left:ink.left,right:ink.right},parent:{left:parent.left,right:parent.right},font:getComputedStyle(element).fontSize};
    }));
    for(const value of longValues)assert.ok(value.ink.left>=value.parent.left-1&&value.ink.right<=value.parent.right+1,label+' long '+value.id+' text fits: '+JSON.stringify(value));
    await screenshot(page,'long-values-'+label);
    checks.push({check:'same-row responsive geometry and long values',label,layout,longValues});await page.close();
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
  for(const mode of ['words','pair']){
    const page=await context({width:1366,height:768});await page.goto(url+'/?all');await page.waitForFunction(()=>!!window.KanaRain);
    await page.locator('#mode').selectOption(mode);await start(page);
    assert.equal(await page.locator('#noveltyHud').isVisible(),false,mode+' does not show kana reading pressure');
    assert.equal(await page.locator('#gameHud').evaluate(el=>el.classList.contains('has-novelty')),false);
    checks.push({check:'unsupported mode hidden',mode});await page.close();
  }
  const page=await context({width:1366,height:768},true);await start(page);
  assert.equal(await page.locator('#noveltyHud').isVisible(),false,'non-loopback hostname cannot activate the experimental panel');
  assert.equal(await page.locator('#gameHud').evaluate(el=>el.classList.contains('has-novelty')),false);
  checks.push({check:'non-loopback hostname hidden without external network access',pass:true});await page.close();
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  server=spawn(process.execPath,[path.join(root,'scripts/serve.cjs')],{cwd:root,env:{...process.env,PORT:'4186'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});
  const channel=process.env.PLAYWRIGHT_BROWSER_CHANNEL;
  browser=await chromium.launch({headless:true,...(channel?{channel}:{})});
  await behavior();await responsive();await smallScreenTarget();await scope();assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({verifiedAt:new Date().toISOString(),syntheticProgress:true,productionAccess:false,checks,errors},null,2)+'\n');
  console.log('PASS: novelty HUD; '+checks.length+' checks, zero page errors.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  if(browser)await browser.close();if(server)server.kill();
});
