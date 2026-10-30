'use strict';
// Runs only against an isolated test server and synthetic browser storage.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(__dirname,'artifacts/new-kana-pace');
const url='http://127.0.0.1:4187',checks=[],errors=[],contexts=[];
const legacyPaces=[undefined,'calm','balanced','bold'];
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
    // Historical pressure closes the default long reading brake without inventing evidence.
    const recent=Array.from({length:60},(_,i)=>({roundId:'pace-seed:'+i,firstCorrect:i>=6,timeout:i<2}));
    const attempts=recent.map((round,i)=>({attemptId:'pace-attempt:'+i,roundId:round.roundId,itemId:'kana:'+chars[i%5],facet:'form→sound',gameId:'kana-rain',at:at+i*1000,firstAttempt:true,assistance:false,correct:round.timeout?null:round.firstCorrect,outcome:round.timeout?'timeout':round.firstCorrect?'correct':'incorrect',reason:'synthetic-fixture'}));
    const exposures=chars.map((char,i)=>({exposureId:'pace-exposure:'+i,itemId:'kana:'+char,facet:'form→sound',gameId:'kana-rain',at:at+i,reason:'initial-reading'}));
    const novelty={version:1,seen:Object.fromEntries(chars.map(char=>['kana:'+char,true])),recent,blocked:!pace||pace==='calm',cooldownRemaining:3};
    if(pace)novelty.pace=pace;
    const saved={version:2,created:at,items:{},attemptLedger:attempts,exposureLedger:exposures,games:{'kana-rain':{rows:{hiragana:15,katakana:1},best:{'hira:normal:180':1981},accuracy:{},playStyle:'arcade',difficulty:({calm:'easy',balanced:'normal',bold:'hard'})[pace]||'hard',sound:false,reducedEffects:true,katakanaUnlocked:true,journeyMixedUnlocked:true,novelty,katakanaNovelty:{...novelty,seen:{'kana:ア':true},recent:recent.map(r=>({...r,roundId:'kata-'+r.roundId}))}}}};
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
    return {attempts:saved.attemptLedger,exposures:saved.exposureLedger,items:saved.items,rows:gd.rows,best:gd.best,legacyDifficulty:gd.difficulty,access:gd.katakanaUnlocked,mixedAccess:gd.journeyMixedUnlocked,recent:gd.novelty.recent,seen:gd.novelty.seen,cooldown:gd.novelty.cooldownRemaining,kataRecent:gd.katakanaNovelty.recent,kataSeen:gd.katakanaNovelty.seen,kataCooldown:gd.katakanaNovelty.cooldownRemaining};
  });
}
async function selected(page){
  assert.equal(await page.locator('#difficultySelect,#difficultyNote,#noveltyHud,#noveltyDetails,#noveltyPaceSelect,[data-novelty-pace],#practiceSelect,#durationSelect,#settingsMode,[data-difficulty]').count(),0,'retired difficulty controls and counters are absent');
  assert.equal(await page.evaluate(()=>KanaRain.settings.noveltyPace),'calm');
  assert.equal(await page.evaluate(()=>KanaRain.gameData.novelty.pace),'calm');
  assert.equal(await page.evaluate(()=>KanaRain.gameData.katakanaNovelty.pace),'calm');
  assert.equal(await page.evaluate(()=>Object.hasOwn(KanaRain.settings,'difficulty')),false);
  assert.doesNotMatch(await page.locator('#welcome').innerText(),/\b(?:easy|normal|hard|difficulty)\b/i);
}
async function controlsAndPersistence(){
  for(const pace of legacyPaces){
    const page=await context({width:1366,height:768},pace);await selected(page);const initial=await history(page);
    assert.equal(initial.recent.length,60);assert.equal(initial.attempts.length,60);assert.equal(initial.exposures.length>=5,true);assert.equal(initial.best['hira:normal:180'],1981);assert.deepEqual(initial.rows,{hiragana:15,katakana:1});
    assert.equal(initial.legacyDifficulty,({calm:'easy',balanced:'normal',bold:'hard'})[pace]||'hard');assert.equal(initial.cooldown,3);assert.equal(initial.kataCooldown,3);assert.equal(initial.access,true);assert.equal(initial.mixedAccess,true);
    for(const mode of ['hira','kata','journey']){await page.locator('#mode').selectOption(mode);await selected(page);assert.deepEqual(await history(page),initial,'changing alphabet retains complete evidence, historical records and pressure');}
    await page.reload();await page.waitForFunction(()=>!!window.KanaRain);await selected(page);const restored=await history(page);for(const key of Object.keys(initial).filter(key=>key!=='exposures'))assert.deepEqual(restored[key],initial[key],'calm normalization retains '+key+' after reload');assert.deepEqual(restored.exposures.slice(0,initial.exposures.length),initial.exposures,'old references remain exact; the visible lesson can add fresh references on reload');
    assert.equal(await page.evaluate(()=>KanaRain.gameData.novelty.blocked),true,'the long default brake accounts for historical expirations');
    checks.push({check:'old preferences normalize to the default without erasing evidence, legacy records, access, samples or cooldown across reload',pace:pace||'missing',pass:true});await page.close();
  }
}
async function profileRulesAndLocks(){
  for(const mode of ['hira','kata','journey']){
    const page=await context({width:1366,height:768},'bold');await selected(page);await page.locator('#mode').selectOption(mode);await start(page);
    assert.equal(await page.locator('#mode').isDisabled(),true);assert.equal(await page.locator('#difficultySelect,#difficultyNote').count(),0);
    assert.deepEqual(await page.locator('.hud-stats .stat small').allTextContents(),['CORRECT','TIME']);assert.equal(await page.locator('.heart-display small').textContent(),'HEARTS');assert.equal(await page.locator('#errorCount,#expirationCount').count(),0);
    const session=await page.evaluate(()=>({rules:KanaNovelty.constantsFor(KanaRain.gameData.novelty),blocked:KanaRain.gameData.novelty.blocked,hearts:KanaRain.state.totalLives,duration:KanaRain.state.sessionDuration,speed:KanaRain.state.speed,gap:KanaRain.state.gap,hasScore:Object.hasOwn(KanaRain.state,'score'),hasBestKey:Object.hasOwn(KanaRain.state,'bestKey'),hasDifficulty:Object.hasOwn(KanaRain.state,'difficulty')}));
    assert.equal(session.rules.windowSize,60);assert.equal(session.rules.recoveryHits,55);assert.equal(session.rules.timeoutLimit,2);assert.equal(session.rules.cooldownHits,10);assert.equal(session.blocked,true);assert.equal(session.hearts,3);assert.equal(session.duration,180);assert.equal(session.hasScore,false);assert.equal(session.hasBestKey,false);assert.equal(session.hasDifficulty,false);
    assert.ok(Math.abs(session.speed-.1)<.005,'initial rain timing is unchanged');assert.ok(Math.abs(session.gap-2400)<120);
    assert.deepEqual(await page.evaluate(()=>KanaDifficulty.atTime(60)),{speed:.2,fallSeconds:5,gap:2400/Math.sqrt(2)});
    assert.doesNotMatch(await page.locator('#gameLabel').innerText(),/\b(?:easy|normal|hard|difficulty)\b/i);
    await page.locator('#pauseBtn').click();await page.locator('#pauseSettingsBtn').click();assert.equal(await page.evaluate(()=>KanaRain.state.paused),true);
    assert.equal(await page.locator('#settingsDialog select,#settingsDialog [data-difficulty],#settingsDialog [data-novelty-pace]').count(),0,'settings has no duplicated setup');
    await page.locator('#closeSettings').click();await page.locator('#pauseHelpBtn').click();assert.doesNotMatch(await page.locator('#helpDialog').innerText(),/\b(?:easy|normal|hard|difficulty)\b/i);await page.locator('#closeHelp').click();
    await page.locator('#finishBtn').click();await page.locator('#results').waitFor({state:'visible'});
    assert.deepEqual(await page.locator('#resultStats small').allTextContents(),['CORRECT ANSWERS','WRONG ANSWERS','EXPIRED DROPS']);assert.match(await page.locator('#resultDetails').textContent(),/streak/i);assert.doesNotMatch(await page.locator('#results').innerText(),/\b(?:easy|normal|hard|difficulty)\b/i);
    await page.locator('#backBtn').click();assert.equal(await page.locator('#mode').isEnabled(),true);
    checks.push({check:'default brake, three hearts, adaptive rain, count-only runtime and alphabet lock with no difficulty labels in play/help/results',mode,pass:true});await page.close();
  }
}
async function scope(){
  const page=await context({width:1366,height:768});await page.goto(url+'/?all');await page.waitForFunction(()=>!!window.KanaRain);
  assert.deepEqual(await page.locator('#mode option').evaluateAll(options=>options.map(option=>option.value)),['hira','kata','journey']);
  for(const mode of ['mix','pair','words','practice']){
    const result=await page.evaluate(mode=>{const el=document.querySelector('#mode');el.value=mode;el.dispatchEvent(new Event('change'));return {mode:KanaRain.settings.mode,candidates:KanaRain.candidates(mode)};},mode);
    assert.ok(['hira','kata'].includes(result.mode));assert.deepEqual(result.candidates,[]);
  }
  assert.equal(await page.evaluate(()=>JPData.words),undefined);assert.deepEqual(await page.evaluate(()=>KanaRain.capabilities.itemTypes),['kana']);
  checks.push({check:'removed modes remain unreachable even with explore URL and synthetic changes',pass:true});await page.close();
}
async function menuGeometry(page,label){
  const layout=await page.evaluate(()=>{
    const rect=el=>{const box=el.getBoundingClientRect();return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height};};
    const welcome=document.querySelector('#welcome'),panel=document.querySelector('.session-selectors');
    const visible=selector=>{const el=document.querySelector(selector);if(!el)return null;const style=getComputedStyle(el);return style.display!=='none'&&style.visibility!=='hidden'&&el.getClientRects().length>0?{selector,...rect(el)}:null;};
    // The menu is a nested scroller: document dimensions alone missed this regression.
    welcome.scrollTop=50;welcome.scrollLeft=50;
    const scroll={width:welcome.scrollWidth,height:welcome.scrollHeight,clientWidth:welcome.clientWidth,clientHeight:welcome.clientHeight,top:welcome.scrollTop,left:welcome.scrollLeft};
    welcome.scrollTop=0;welcome.scrollLeft=0;
    return {welcome:rect(welcome),panel:rect(panel),scroll,buttons:[...document.querySelectorAll('.main-menu .menu-button')].map(rect),
      flow:['.title-lockup','.main-menu','.session-selectors','.session-summary','#menuCounts','#menuHint'].map(visible).filter(Boolean),
      selects:[...panel.querySelectorAll('select')].map(el=>{const style=getComputedStyle(el);return {id:el.id,select:rect(el),label:rect(el.closest('label')),caption:rect(el.closest('label').querySelector('.setup-label')),textAlign:style.textAlign,textAlignLast:style.textAlignLast,paddingLeft:parseFloat(style.paddingLeft),paddingRight:parseFloat(style.paddingRight)};})};
  });
  const {welcome,panel,scroll}=layout;
  assert.equal(layout.buttons.length,3,label+' has all three main-menu options');
  for(const button of layout.buttons)for(const edge of ['left','right','width']){
    assert.ok(Math.abs(panel[edge]-button[edge])<=1,label+' alphabet frame shares the menu button '+edge+': '+JSON.stringify({panel,button}));
  }
  assert.ok(scroll.width<=scroll.clientWidth+1&&scroll.height<=scroll.clientHeight+1,label+' welcome content fits without its own scrollbar: '+JSON.stringify({scroll,flow:layout.flow,panel}));
  assert.equal(scroll.top,0,label+' welcome cannot scroll vertically');assert.equal(scroll.left,0,label+' welcome cannot scroll horizontally');
  for(const item of layout.flow){
    assert.ok(item.left>=welcome.left-1&&item.right<=welcome.right+1&&item.top>=welcome.top-1&&item.bottom<=welcome.bottom+1,label+' '+item.selector+' stays inside the menu');
  }
  for(let i=1;i<layout.flow.length;i++){
    const before=layout.flow[i-1],after=layout.flow[i];
    assert.ok(after.top>=before.bottom-1,label+' '+before.selector+' overlaps '+after.selector+': '+JSON.stringify({before,after}));
  }
  for(const item of layout.selects){
    const {select,caption}=item;
    assert.ok(select.left>=panel.left+4&&select.right<=panel.right-4&&select.top>=panel.top+4&&select.bottom<=panel.bottom-4,label+' '+item.id+' dark field has visible padding on every side');
    assert.ok(Math.abs((select.left+select.right-item.label.left-item.label.right)/2)<=2,label+' '+item.id+' is centered in its column');
    const topInset=Math.min(select.top,caption.top)-panel.top,bottomInset=panel.bottom-Math.max(select.bottom,caption.bottom);
    assert.ok(Math.abs(topInset-bottomInset)<=2,label+' '+item.id+' label and field are vertically balanced in their panel: '+JSON.stringify({topInset,bottomInset}));
    assert.equal(item.textAlign,'center',label+' '+item.id+' selected value is centered');
    assert.equal(item.textAlignLast,'center',label+' '+item.id+' native selected value uses centered alignment');
    assert.ok(Math.abs(item.paddingLeft-item.paddingRight)<=1,label+' '+item.id+' selected text has balanced horizontal padding');
  }
}
async function responsive(){
  for(const [width,height] of [[1916,908],[1533,726],[1920,900],[1920,1080],[1366,768],[1280,720],[1920,720],[1024,600],[390,844],[320,568],[844,390]]){
    const page=await context({width,height}),label=width+'x'+height;await selected(page,'calm');
    const menu=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}));assert.ok(menu.scrollWidth<=width+1);assert.ok(menu.scrollHeight<=height+1);
    for(const id of ['mode','startBtn']){const rect=await page.locator('#'+id).boundingBox();assert.ok(rect&&rect.x>=-1&&rect.y>=-1&&rect.x+rect.width<=width+1&&rect.y+rect.height<=height+1,label+' '+id+' fits');}
    assert.equal(await page.locator('#mode option[value="kata"]').isEnabled(),true,'synthetic fixture includes unlocked Katakana');
    for(const mode of ['hira','kata','journey']){await page.locator('#mode').selectOption(mode);await selected(page);await menuGeometry(page,label+' '+mode);}
    await screenshot(page,'single-default-'+label);await page.locator('#settingsBtn').click();
    assert.equal(await page.locator('#settingsDialog select,#settingsDialog [data-difficulty],#settingsDialog [data-novelty-pace]').count(),0);
    for(const id of ['saveSettings','closeSettings']){await page.locator('#'+id).scrollIntoViewIfNeeded();const rect=await page.locator('#'+id).boundingBox();assert.ok(rect&&rect.y>=-1&&rect.y+rect.height<=height+1,label+' '+id+' reachable');}
    await page.locator('#closeSettings').click();await menuGeometry(page,label+' after closing settings');
    checks.push({check:'welcome has no internal scroll; all three alphabet modes fit, fields are centered, menu texts do not overlap, settings closing controls remain reachable',label,pass:true});await page.close();
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
  console.log('PASS: single default and simplified arcade; '+checks.length+' checks, zero page errors.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  if(browser)await browser.close();if(server)server.kill();
});
