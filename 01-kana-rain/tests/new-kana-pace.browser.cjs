'use strict';
// Runs only against an isolated test server and synthetic browser storage.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(__dirname,'artifacts/new-kana-pace');
const url='http://127.0.0.1:4187',checks=[],errors=[],contexts=[];
const profiles={calm:{hits:55,size:60},balanced:{hits:25,size:30},bold:{hits:10,size:12}};
let browser,server;

async function context(viewport={width:1920,height:1080},pace){
  const ctx=await browser.newContext({viewport,isMobile:viewport.width<500||viewport.height<500,hasTouch:viewport.width<500||viewport.height<500,serviceWorkers:'block'});
  contexts.push(ctx);
  await ctx.addCookies([{name:'ng_analytics_consent',value:'denied',url,sameSite:'Lax'}]);
  await ctx.route('**/*',route=>{
    const target=new URL(route.request().url());
    if(target.origin===url||['data:','blob:'].includes(target.protocol))return route.continue();
    return route.abort();
  });
  await ctx.addInitScript(({pace})=>{
    if(localStorage.getItem('new-kana-pace-fixture'))return;
    const at=1700000000000,chars=['あ','い','う','え','お'];
    const recent=Array.from({length:60},(_,i)=>({roundId:'pace-seed:'+i,firstCorrect:i>=5,timeout:i<2}));
    const attempts=recent.map((round,i)=>({attemptId:'pace-attempt:'+i,roundId:round.roundId,itemId:'kana:'+chars[i%5],facet:'form→sound',gameId:'kana-rain',at:at+i*1000,firstAttempt:true,assistance:false,correct:round.timeout?null:round.firstCorrect,outcome:round.timeout?'timeout':round.firstCorrect?'correct':'incorrect',reason:'synthetic-fixture'}));
    const exposures=chars.map((char,i)=>({exposureId:'pace-exposure:'+i,itemId:'kana:'+char,facet:'form→sound',gameId:'kana-rain',at:at+i,reason:'initial-reading'}));
    const novelty={version:1,seen:Object.fromEntries(chars.map(char=>['kana:'+char,true])),recent,blocked:!pace||pace==='calm'};
    if(pace)novelty.pace=pace;
    const saved={version:2,created:at,items:{},attemptLedger:attempts,exposureLedger:exposures,games:{'kana-rain':{rows:{hiragana:15,katakana:1},best:{'hira:normal:180':1981},accuracy:{},playStyle:'arcade',difficulty:'normal',sound:false,novelty}}};
    localStorage.setItem('jp-learner-v1',JSON.stringify(saved));
    localStorage.setItem('new-kana-pace-fixture','1');
  },{pace});
  const page=await ctx.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(()=>!!window.KanaRain);
  return page;
}
async function ready(page){
  for(let i=0;i<16;i++){
    if(await page.locator('#featureDialog').isVisible()){await page.locator('#continueFeatureBtn').click();continue;}
    if(await page.locator('#scriptDialog').isVisible()){await page.locator('#continueScriptBtn').click();continue;}
    if(await page.locator('#countdownOverlay').isVisible())await page.locator('#skipCountdown').click();
    if(await page.evaluate(()=>KanaRain.state&&!KanaRain.state.paused&&!KanaRain.state.countingDown))return;
    await page.waitForTimeout(30);
  }
  throw new Error('Game did not reach active play');
}
async function start(page){
  await page.locator('#startBtn').click();await ready(page);
  await page.evaluate(()=>{KanaRain.state.sinceSpawn=-100000;KanaRain.state.drops.forEach(drop=>drop.progress=0);});
}
async function screenshot(page,name){await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});}
async function history(page){
  return page.evaluate(()=>{
    const saved=JSON.parse(Learner.export()),gd=saved.games['kana-rain'];
    return {attempts:saved.attemptLedger,exposures:saved.exposureLedger,items:saved.items,rows:gd.rows,best:gd.best,recent:gd.novelty.recent,seen:gd.novelty.seen};
  });
}
async function selected(page,pace){
  assert.equal(await page.locator('#noveltyHud, #noveltyDetails').count(),0,'pacing counters are absent from the interface');
  assert.equal(await page.locator('#noveltyPaceSelect').inputValue(),pace,'menu selection follows the saved pace');
  assert.equal(await page.evaluate(()=>KanaRain.settings.noveltyPace),pace,'session settings expose the chosen pace');
  assert.equal(await page.evaluate(()=>KanaRain.gameData.novelty.pace),pace,'durable novelty state holds the chosen pace');
  for(const id of Object.keys(profiles)){
    assert.equal(await page.locator(`[data-novelty-pace="${id}"]`).getAttribute('aria-pressed'),String(id===pace),'exactly one settings card is selected');
  }
}
async function controlsAndPersistence(){
  const page=await context();
  await selected(page,'calm');
  const initial=await history(page);
  assert.equal(initial.recent.length,60,'legacy window keeps every one of its 60 events');
  assert.equal(initial.attempts.length,60);assert.ok(initial.exposures.length>=5);
  assert.equal(initial.exposures.filter(event=>event.exposureId.startsWith('pace-exposure:')).length,5,'fixture exposures survive normal menu references');
  assert.equal(initial.best['hira:normal:180'],1981);
  assert.deepEqual(initial.rows,{hiragana:15,katakana:1});
  await page.locator('#difficultySelect').selectOption('easy');
  await page.locator('#durationSelect').selectOption('300');
  const rain=await page.evaluate(()=>({difficulty:KanaRain.settings.difficulty,duration:KanaRain.settings.duration,playStyle:KanaRain.settings.playStyle}));
  await page.locator('#noveltyPaceSelect').selectOption('bold');await selected(page,'bold');
  await page.locator('#settingsBtn').click();
  for(const pace of ['balanced','calm','bold','balanced']){
    await page.locator(`[data-novelty-pace="${pace}"]`).click();await selected(page,pace);
    const rules=profiles[pace],note=await page.locator('#noveltyPaceNote').textContent();
    assert.match(note,new RegExp(String(rules.hits)+' first-try'));
    assert.match(note,new RegExp(String(rules.size)));
    assert.match(note,/at most (?:one|1) expir/i);
    assert.deepEqual(await history(page),initial,'changing pace preserves recent events and learning evidence verbatim');
    assert.equal(await page.evaluate(()=>KanaRain.gameData.novelty.blocked),pace==='calm','changing the selected window recomputes the gate from the same retained history');
    assert.deepEqual(await page.evaluate(()=>({difficulty:KanaRain.settings.difficulty,duration:KanaRain.settings.duration,playStyle:KanaRain.settings.playStyle})),rain,'pace is independent of rain difficulty, duration and session style');
  }
  await page.locator('#saveSettings').click();await page.reload();
  await page.waitForFunction(()=>!!window.KanaRain);await selected(page,'balanced');
  const restored=await history(page);
  for(const key of ['attempts','items','rows','best','recent','seen'])assert.deepEqual(restored[key],initial[key],'reload preserves '+key);
  assert.deepEqual(restored.exposures.slice(0,initial.exposures.length),initial.exposures,'reload retains every original exposure before adding normal menu references');
  assert.equal(await page.locator('#noveltyPaceSelect').isEnabled(),true);
  checks.push({check:'legacy default, synchronized controls, evidence preservation, independent rain settings and reload persistence',pass:true});
  await page.close();
}
async function profileRulesAndLocks(){
  for(const [pace,rules] of Object.entries(profiles)){
    const page=await context({width:1366,height:768},pace);await selected(page,pace);await start(page);
    assert.equal(await page.locator('#noveltyPaceSelect').isDisabled(),true,'active session locks the menu control');
    assert.equal(await page.locator('#noveltyPaceSettings').evaluate(fieldset=>fieldset.disabled),true,'active session locks the settings group');
    for(const id of Object.keys(profiles))assert.equal(await page.locator(`[data-novelty-pace="${id}"]`).isDisabled(),true);
    const novelty=await page.evaluate(()=>{
      const N=window.KanaNovelty;
      return {rules:N.constantsFor(KanaRain.gameData.novelty),blocked:KanaRain.gameData.novelty.blocked};
    });
    assert.equal(novelty.rules.windowSize,rules.size,'the selected evaluation window remains active without a counter');
    assert.equal(novelty.rules.recoveryHits,rules.hits,'the selected recovery threshold remains active without a counter');
    assert.equal(novelty.blocked,pace==='calm','only the selected window affects the brake');
    assert.equal(await page.locator('#noveltyHud, #noveltyDetails').count(),0,'active play does not render pacing counters or their details');
    assert.equal(await page.evaluate(()=>KanaRain.state.totalLives),3,'normal rain still supplies three hearts');
    assert.equal(await page.evaluate(()=>KanaRain.state.sessionDuration),180,'pace does not change session duration');
    await page.locator('#pauseBtn').click();await page.locator('#pauseSettingsBtn').click();
    assert.equal(await page.evaluate(()=>KanaRain.state.paused),true);
    for(const id of Object.keys(profiles))assert.equal(await page.locator(`[data-novelty-pace="${id}"]`).isDisabled(),true,'paused games retain their pace');
    assert.match(await page.locator('#noveltyPaceScope').textContent(),/finish.*session/i);
    const before=await page.evaluate(()=>JSON.stringify(KanaRain.gameData.novelty));
    await page.locator('[data-novelty-pace="bold"]').dispatchEvent('click');
    assert.equal(await page.evaluate(()=>JSON.stringify(KanaRain.gameData.novelty)),before,'event handlers reject a synthetic click on a locked option');
    await page.locator('#closeSettings').click();
    // Closing paused Settings resumes via the existing countdown flow.
    if(await page.locator('#pauseOverlay').isVisible())await page.locator('#finishBtn').click();
    else {await ready(page);await page.locator('#pauseBtn').click();await page.locator('#finishBtn').click();}
    await page.locator('#results').waitFor({state:'visible'});await page.locator('#backBtn').click();
    await selected(page,pace);assert.equal(await page.locator('#noveltyPaceSelect').isEnabled(),true,'finishing unlocks pace again');
    checks.push({check:'selected pacing rules without counters, independent hearts/time and active/paused locks',pace,pass:true});
    await page.close();
  }
}
async function scope(){
  for(const mode of ['words','pair']){
    const page=await context({width:1366,height:768});
    await page.goto(url+'/?all');await page.waitForFunction(()=>!!window.KanaRain);
    await page.locator('#noveltyPaceSelect').selectOption('bold');
    await page.locator('#mode').selectOption(mode);
    assert.equal(await page.locator('#noveltyPaceSelect').isDisabled(),true);
    await page.locator('#settingsBtn').click();
    assert.equal(await page.locator('#noveltyPaceSettings').evaluate(fieldset=>fieldset.disabled),true);
    for(const id of Object.keys(profiles))assert.equal(await page.locator(`[data-novelty-pace="${id}"]`).isDisabled(),true);
    assert.match(await page.locator('#noveltyPaceScope').textContent(),/Hiragana.*Katakana.*Mixed scripts/i,'unsupported modes explain scope');
    const before=await history(page);
    await page.locator('[data-novelty-pace="calm"]').dispatchEvent('click');
    await selected(page,'bold');assert.deepEqual(await history(page),before);
    await page.locator('#settingsMode').selectOption('hira');
    assert.equal(await page.locator('#noveltyPaceSettings').evaluate(fieldset=>fieldset.disabled),false);
    await selected(page,'bold');
    checks.push({check:'unsupported mode disables controls and retains the saved reading pace',mode,pass:true});await page.close();
  }
}
async function responsive(){
  for(const [width,height] of [[1920,1080],[1366,768],[390,844],[320,568],[844,390]]){
    const page=await context({width,height}),label=`${width}x${height}`;
    const menu=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    assert.ok(menu.scroll<=width+1,label+' menu has no horizontal overflow');
    await page.locator('#settingsBtn').click();
    await page.locator('#noveltyPaceSettings').scrollIntoViewIfNeeded();
    const layout=await page.evaluate(()=>{
      const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      const dialog=document.querySelector('#settingsDialog');
      return {viewport:{width:innerWidth,height:innerHeight},documentWidth:document.documentElement.scrollWidth,dialog:{...rect(dialog),clientWidth:dialog.clientWidth,scrollWidth:dialog.scrollWidth},cards:[...document.querySelectorAll('[data-novelty-pace]')].map(el=>({...rect(el),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth}))};
    });
    assert.ok(layout.documentWidth<=width+1,label+' settings do not widen the page');
    assert.ok(layout.dialog.left>=-1&&layout.dialog.right<=width+1&&layout.dialog.top>=-1&&layout.dialog.bottom<=height+1,label+' dialog fits the viewport');
    assert.ok(layout.dialog.scrollWidth<=layout.dialog.clientWidth+1,label+' dialog scroll is vertical only');
    for(const card of layout.cards){
      assert.ok(card.left>=layout.dialog.left&&card.right<=layout.dialog.right,label+' pace card stays inside the dialog');
      assert.ok(card.scrollWidth<=card.clientWidth+1,label+' pace card content fits');
    }
    if(width<=390)for(let i=1;i<layout.cards.length;i++)assert.ok(layout.cards[i].top>=layout.cards[i-1].bottom-1,label+' mobile pace cards stack vertically');
    else if(width>=1366)assert.ok(layout.cards.every(card=>Math.abs(card.top-layout.cards[0].top)<=1),label+' desktop pace cards share a row');
    await screenshot(page,'settings-pace-'+label);
    await page.locator('#saveSettings').scrollIntoViewIfNeeded();
    const cta=await page.locator('#saveSettings').boundingBox();
    assert.ok(cta&&cta.y>=-1&&cta.y+cta.height<=height+1,label+' Return to the Garden is reachable by scrolling');
    await page.locator('#saveSettings').click();assert.equal(await page.locator('#settingsDialog').isVisible(),false);
    await page.locator('#settingsBtn').click();await page.locator('#closeSettings').scrollIntoViewIfNeeded();
    const close=await page.locator('#closeSettings').boundingBox();
    assert.ok(close&&close.y>=-1&&close.y+close.height<=height+1,label+' Close settings is reachable by scrolling');
    await page.locator('#closeSettings').click();
    checks.push({check:'responsive menu and cards, vertical dialog scrolling and reachable closing controls',label,layout});await page.close();
  }
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  server=spawn(process.execPath,[path.join(root,'scripts/serve.cjs')],{cwd:root,env:{...process.env,PORT:'4187'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited '+code)));});
  const channel=process.env.PLAYWRIGHT_BROWSER_CHANNEL;
  browser=await chromium.launch({headless:true,...(channel?{channel}:{})});
  await controlsAndPersistence();await profileRulesAndLocks();await scope();await responsive();assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify({verifiedAt:new Date().toISOString(),syntheticProgress:true,productionAccess:false,externalRequests:'blocked',checks,errors},null,2)+'\n');
  console.log('PASS: selectable new kana pace; '+checks.length+' checks, zero page errors.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  if(browser)await browser.close();if(server)server.kill();
});
