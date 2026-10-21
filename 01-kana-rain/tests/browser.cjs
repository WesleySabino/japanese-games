// Development integration checks. Install development dependencies and a Playwright browser first.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
let server,browser;
async function gameContext(options={}){
  const context=await browser.newContext(options);
  // Existing gameplay checks use an explicit decline; consent boundaries have their own suite.
  await context.addCookies([{name:'ng_analytics_consent',value:'denied',url:'http://127.0.0.1:4180/',sameSite:'Lax'}]);
  // Isolated progress; every run exercises the single arcade contract.
  await context.addInitScript(()=>{
    const key='jp-learner-v1';
    const saved=JSON.parse(localStorage.getItem(key)||'null')||{version:1,items:{},errorLog:[],games:{},created:Date.now()};
    saved.games ||= {};saved.games['kana-rain'] ||= {};saved.games['kana-rain'].playStyle='arcade';
    localStorage.setItem(key,JSON.stringify(saved));
  });
  return context;
}
async function readyToPlay(page){
  if(await page.locator('#countdownOverlay').isVisible())await page.locator('#skipCountdown').click();
  await page.waitForFunction(()=>KanaRain.state&&!KanaRain.state.paused&&!KanaRain.state.countingDown);
}
async function clockSnapshot(page){
  return page.evaluate(()=>({time:KanaRain.state.t,elapsed:KanaRain.state.elapsed,progress:KanaRain.state.drops.map(d=>d.progress)}));
}
async function assertCountdownFrozen(page,delay=350){
  assert.equal(await page.locator('#countdownOverlay').isVisible(),true);
  assert.equal(await page.evaluate(()=>KanaRain.state.countingDown),true);
  const before=await clockSnapshot(page);
  await page.waitForTimeout(delay);
  assert.deepEqual(await clockSnapshot(page),before,'countdown must freeze session time, acceleration, and drops');
}
async function assertWholeViewport(page,label){
  const viewport=await page.evaluate(()=>({
    width:innerWidth,height:innerHeight,
    documentWidth:document.documentElement.scrollWidth,
    documentHeight:document.documentElement.scrollHeight,
    bodyWidth:document.body.scrollWidth,bodyHeight:document.body.scrollHeight,
    scrollX,scrollY
  }));
  assert.ok(viewport.documentWidth<=viewport.width+1,label+' has horizontal page overflow');
  assert.ok(viewport.documentHeight<=viewport.height+1,label+' has vertical page overflow');
  assert.ok(viewport.bodyWidth<=viewport.width+1,label+' body is wider than the viewport');
  assert.ok(viewport.bodyHeight<=viewport.height+1,label+' body is taller than the viewport');
  assert.equal(viewport.scrollX,0,label+' horizontally scrolls');
  assert.equal(viewport.scrollY,0,label+' vertically scrolls');
  const world=await page.locator('.game-world').boundingBox();
  assert.ok(world&&Math.abs(world.x)<=1&&Math.abs(world.y)<=1,label+' world must start at the viewport origin');
  assert.ok(Math.abs(world.width-viewport.width)<=1&&Math.abs(world.height-viewport.height)<=1,label+' world must cover the whole viewport');
}
async function assertFrozen(page){
  assert.equal(await page.evaluate(()=>KanaRain.state.paused),true);
  const remaining=await page.evaluate(()=>({time:KanaRain.state.t,elapsed:KanaRain.state.elapsed,progress:KanaRain.state.drops.map(d=>d.progress)}));
  await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(()=>({time:KanaRain.state.t,elapsed:KanaRain.state.elapsed,progress:KanaRain.state.drops.map(d=>d.progress)})),remaining,'overlay must freeze the timer, acceleration, and falling drops');
}
async function screenshot(page,name){
  await page.screenshot({path:path.join(__dirname,name+'.png'),fullPage:true});
}
async function assertProgressHeading(page){
  const dialog=await page.locator('#progressDialog').boundingBox();
  for(const id of ['gardenTitle','closeGarden']){
    const rect=await page.locator('#'+id).boundingBox();
    assert.ok(rect&&rect.y>=dialog.y-1&&rect.y+rect.height<=dialog.y+dialog.height+1,'Progress '+id+' must be visible when its panel opens: '+JSON.stringify({dialog,rect}));
  }
}
async function assertHeartsVisible(page,label){
  assert.equal(await page.locator('#lives').isVisible(),true,label+' heart counter exists');
  assert.equal(await page.locator('.heart-display small').textContent(),'HEARTS');
  const prominent=await page.locator('#lives').evaluate(el=>{const panel=el.closest('.heart-display'),range=document.createRange();range.selectNodeContents(el);const ink=range.getBoundingClientRect(),box=panel.getBoundingClientRect(),small=innerWidth<=760||innerHeight<=480;return {font:parseFloat(getComputedStyle(el).fontSize),minimum:small?22:28,ink:{left:ink.left,right:ink.right,top:ink.top,bottom:ink.bottom},panel:{left:box.left,right:box.right,top:box.top,bottom:box.bottom}};});
  assert.ok(prominent.font>=prominent.minimum,label+' hearts remain prominent');assert.ok(prominent.ink.left>=prominent.panel.left+1&&prominent.ink.right<=prominent.panel.right-1&&prominent.ink.top>=prominent.panel.top-1&&prominent.ink.bottom<=prominent.panel.bottom+1,label+' large heart glyphs fit their central frame: '+JSON.stringify(prominent));
  const clipped=await page.locator('#lives').evaluate(el=>{
    const r=el.getBoundingClientRect(),issues=[];
    if(r.left<0||r.top<0||r.right>innerWidth+1||r.bottom>innerHeight+1)issues.push({parent:'viewport',counter:{left:r.left,top:r.top,right:r.right,bottom:r.bottom}});
    for(let p=el.parentElement;p;p=p.parentElement){
      // Root overflow is applied to the viewport; fixed children need not contribute to body height.
      if(p===document.body||p===document.documentElement)continue;
      const style=getComputedStyle(p),box=p.getBoundingClientRect(),masked=style.clipPath!=='none';
      const clipsX=masked||style.overflowX!=='visible',clipsY=masked||style.overflowY!=='visible';
      if((clipsX&&(r.left<box.left-1||r.right>box.right+1))||(clipsY&&(r.top<box.top-1||r.bottom>box.bottom+1))){
        issues.push({parent:p.id||p.className,counter:{top:r.top,bottom:r.bottom},bounds:{top:box.top,bottom:box.bottom}});
      }
    }
    return issues;
  });
  assert.deepEqual(clipped,[],label+' heart counter must remain inside any clipping frame');
}
async function finishSession(page){
  if(!await page.evaluate(()=>KanaRain.state.paused))await page.locator('#pauseBtn').click();
  await page.locator('#finishBtn').click();
  assert.equal(await page.locator('#results').isVisible(),true);
}
async function assertInViewport(page,selector,label){
  const rect=await page.locator(selector).boundingBox(),size=page.viewportSize();
  assert.ok(rect&&rect.x>=-1&&rect.y>=-1&&rect.x+rect.width<=size.width+1&&rect.y+rect.height<=size.height+1,label+' must fit the viewport: '+JSON.stringify({rect,size}));
}
async function assertPanelFits(page,id,close,label){
  await assertWholeViewport(page,label);
  await assertInViewport(page,'#'+id,label+' panel');
  if(close)await assertInViewport(page,'#'+close,label+' close control');
}
// Rectangles that only touch at an edge do not overlap.
const apart=(a,b)=>a.right<=b.left+1||a.left>=b.right-1||a.bottom<=b.top+1||a.top>=b.bottom-1;
// Compose a kana on the sound pad with two real taps; the pause keeps them apart from a bounce.
async function tapCompose(page,id){
  const path=await page.evaluate(id=>KanaRain.padPath(id),id);
  await page.waitForTimeout(90);await page.locator('#keyboard [data-family="'+path.family+'"]').tap();
  await page.waitForTimeout(90);await page.locator('#keyboard [data-slot="'+path.slot+'"]').tap();
}
async function assertGameFits(page,label){
  await assertWholeViewport(page,label);
  await assertHeartsVisible(page,label);
  await assertInViewport(page,'#answerDock',label+' input dock');
  await assertInViewport(page,'#keyboard',label+' sound pad');
  const fit=await page.evaluate(()=>{
    const box=el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const drop=KanaRain.state.drops[0]?.el;
    return {field:box(document.querySelector('#field')),dock:box(document.querySelector('#answerDock')),drop:drop&&box(drop),keys:[...document.querySelectorAll('#keyboard button')].filter(b=>b.offsetParent).map(box)};
  });
  assert.ok(fit.drop&&fit.field.height>=fit.drop.height&&fit.drop.top>=fit.field.top-1&&fit.drop.bottom<=fit.field.bottom+1,label+' live drop must fit: '+JSON.stringify(fit));
  assert.ok(apart(fit.field,fit.dock),label+' input must not cover falling drops: '+JSON.stringify({field:fit.field,dock:fit.dock}));
  const size=page.viewportSize();
  assert.equal(fit.keys.length,15,label+' shows the fifteen sound families');
  assert.ok(fit.keys.every(k=>k.left>=-1&&k.top>=-1&&k.right<=size.width+1&&k.bottom<=size.height+1),label+' pad keys must remain usable: '+JSON.stringify(fit.keys));
  assert.ok(fit.keys.every(k=>k.width>=36&&k.height>=36),label+' pad keys keep comfortable touch targets: '+JSON.stringify(fit.keys.map(k=>[k.width,k.height])));
  const layers=await page.evaluate(()=>{const spirit=getComputedStyle(document.querySelector('#fieldSpirit')),field=getComputedStyle(document.querySelector('#field'));return {visible:spirit.display!=='none'&&spirit.visibility!=='hidden',spirit:Number(spirit.zIndex),field:Number(field.zIndex)};});
  assert.ok(!layers.visible||layers.spirit<layers.field,label+' mascot must remain behind falling kana: '+JSON.stringify(layers));
}
async function exerciseResponsiveMatrix(errors,sizes=[[320,568],[360,640],[390,844],[412,915],[568,320],[640,360],[844,390]]){
  const context=await gameContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  for(const [width,height] of sizes){
    const label=width+'×'+height;
    await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:4180');await page.waitForFunction(()=>window.KanaRain);
    await assertWholeViewport(page,label+' menu');
    for(const id of ['startBtn','gardenBtn','settingsBtn','mode','difficultySelect'])await assertInViewport(page,'#'+id,label+' menu '+id);
    if(width===320)await screenshot(page,'smallest-portrait-menu');
    if(width===568)await screenshot(page,'smallest-landscape-menu');
    await page.locator('#settingsBtn').tap();await assertPanelFits(page,'settingsDialog','closeSettings',label+' settings');
    assert.equal(await page.locator('#settingsMode,[data-difficulty],[data-duration],#practiceSelect,#noveltyPaceSelect').count(),0,'settings excludes removed setup controls');await page.locator('#saveSettings').tap();
    await page.locator('#gardenBtn').tap();await assertPanelFits(page,'progressDialog','closeGarden',label+' progress');await assertProgressHeading(page);
    if(width===320)await screenshot(page,'smallest-portrait-progress');
    await page.locator('#returnGarden').tap();
    await page.locator('#helpBtn').tap();await assertPanelFits(page,'helpDialog','closeHelp',label+' help');await page.locator('#closeHelp').tap();
    await page.locator('#startBtn').tap();await readyToPlay(page);await page.waitForFunction(()=>KanaRain.state.drops.length>0);
    if(!await page.locator('#keyboard').isVisible())await page.locator('#keyboardBtn').tap();
    await assertGameFits(page,label+' playing');
    if(width===320)await screenshot(page,'smallest-portrait-playing');
    if(width===568)await screenshot(page,'smallest-landscape-playing');
    await tapCompose(page,await page.evaluate(()=>KanaRain.state.target.id));
    await page.waitForFunction(()=>KanaRain.state.correct===1);
    assert.equal(await page.evaluate(()=>KanaRain.state.attempts),1,label+' a two-tap composition submits exactly once');
    await page.locator('#pauseBtn').tap();await assertPanelFits(page,'pauseOverlay',null,label+' pause');await assertFrozen(page);
    await page.locator('#pauseGardenBtn').tap();await assertPanelFits(page,'progressDialog','closeGarden',label+' paused progress');
    await page.locator('#closeGarden').tap();assert.equal(await page.locator('#pauseOverlay').isVisible(),true);
    await page.locator('#pauseHelpBtn').tap();await assertPanelFits(page,'helpDialog','closeHelp',label+' paused help');await page.locator('#closeHelp').tap();
    await page.locator('#resumeBtn').tap();await readyToPlay(page);
    await finishSession(page);await assertPanelFits(page,'results',null,label+' results');
    assert.deepEqual(await page.locator('#resultStats small').allTextContents(),['CORRECT ANSWERS','WRONG ANSWERS','EXPIRED DROPS']);
    for(const id of ['againBtn','backBtn']){await page.locator('#'+id).scrollIntoViewIfNeeded();await assertInViewport(page,'#'+id,label+' results '+id);}
    await page.locator('#results .dialog-panel').evaluate(panel=>panel.scrollTop=0);
    if(width===320)await screenshot(page,'smallest-portrait-results');
    if(width===568)await screenshot(page,'smallest-landscape-results');
    await page.locator('#backBtn').tap();await assertWholeViewport(page,label+' returned menu');
  }
  await context.close();
}
async function exerciseStableInput(errors){
  const context=await gameContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  for(const [width,height] of [[320,568],[568,320]]){
    const label=width+'×'+height+' fixed answer formats';
    await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:4180');await page.waitForFunction(()=>window.KanaRain);
    await page.evaluate(()=>{
      Learner.reset();const gd=Learner.gameData('kana-rain');gd.rows={hiragana:1,katakana:1};gd.best={};gd.accuracy={};
      for(let i=0;i<6;i++)Learner.record('kana:あ','form→sound',{gameId:'kana-rain',correct:true,rtMs:500,firstAttempt:true,assistance:false,responseFormat:'romaji',now:Date.now()-(5-i)*7*86400000});
      Learner.flush();
    });
    await page.reload();await page.waitForFunction(()=>window.KanaRain);await page.locator('#difficultySelect').selectOption('easy');await page.locator('#startBtn').tap();await readyToPlay(page);
    assert.equal(await page.evaluate(()=>Learner.mastery('kana:あ','form→sound')>=.75&&Learner.state('kana:あ').facets['form→sound'].independentFirstCorrect>=2),true,'fixture reaches the former automatic script-change threshold');
    const firstRound=await page.evaluate(()=>KanaRain.state.target.roundId);
    assert.equal(await page.evaluate(()=>KanaRain.state.target.responseFormat),'romaji');
    assert.match(await page.locator('#inputFormat').textContent(),/romaji/i);
    await page.locator('#answer').fill('partial');
    await page.evaluate(()=>{KanaRain.state.queue.unshift({id:'kana:あ'});KanaRain.state.sinceSpawn=9999;});
    await page.waitForFunction(first=>KanaRain.state.drops.some(d=>d.id==='kana:あ'&&d.roundId!==first),firstRound);
    const matureRound=await page.evaluate(first=>KanaRain.state.drops.find(d=>d.id==='kana:あ'&&d.roundId!==first).roundId,firstRound);
    await page.evaluate(round=>{KanaRain.state.drops.forEach(d=>d.progress=d.roundId===round ? .15 : 0);},matureRound);
    await page.waitForFunction(round=>KanaRain.state.target.roundId===round,matureRound);
    assert.equal(await page.locator('#answer').inputValue(),'partial','a familiar target keeps the unfinished romaji answer');
    assert.equal(await page.evaluate(()=>KanaRain.state.drops.every(d=>d.facet==='form→sound'&&d.responseFormat==='romaji')),true);
    assert.equal(await page.locator('#scriptDialog').isVisible(),false,'mature reading items do not introduce another script');
    assert.equal(await page.locator('#keyboardModeBtn').isVisible(),false,'reading sessions expose no script-switch button');
    assert.equal(await page.locator('#keyboard').evaluate(el=>el.classList.contains('sound-pad')),true);
    await assertGameFits(page,label+' mature romaji sound pad');
    await screenshot(page,width===320?'smallest-portrait-mature-romaji':'smallest-landscape-mature-romaji');
    await page.locator('#answer').fill('');
    await tapCompose(page,await page.evaluate(()=>KanaRain.state.target.id));
    await page.waitForFunction(()=>KanaRain.state.correct===1);
    const physicalAnswer=await page.evaluate(()=>KanaRain.accepted(KanaRain.state.target)[0]);
    await page.locator('#answer').focus();await page.keyboard.type(physicalAnswer);
    await page.waitForFunction(()=>KanaRain.state.correct===2);
    assert.equal(await page.evaluate(()=>KanaRain.state.attempts),2,'physical typing and touch romaji each submit once');
    assert.match(await page.locator('#inputFormat').textContent(),/romaji/i);
    assert.equal(await page.locator('#scriptDialog').isVisible(),false);
    assert.equal(await page.locator('#keyboard').evaluate(el=>el.classList.contains('sound-pad')),true);
    await finishSession(page);


  }
  await context.close();
}
async function exerciseQuickWins(errors){
  const context=await gameContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4180');await page.waitForFunction(()=>window.KanaRain&&window.KanaSfx);
  // Native menu/change gestures unlock browser audio; a declined audio context remains a safe no-op.
  await page.locator('#settingsBtn').click();await page.waitForTimeout(100);
  const tonesAvailable=await page.evaluate(()=>KanaSfx.playCount>0);
  await page.locator('#closeSettings').click();await page.waitForTimeout(60);
  const beforeSelect=await page.evaluate(()=>KanaSfx.playCount);
  await page.locator('#difficultySelect').selectOption('hard');await page.waitForTimeout(100);
  if(tonesAvailable){
    assert.ok(await page.evaluate(()=>KanaSfx.playCount)>beforeSelect,'native select changes play an interface tone');
    assert.equal(await page.evaluate(()=>KanaSfx.lastKind),'confirm');
  }
  await page.locator('#soundBtn').click();await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>KanaAudio.enabled),false);
  const mutedCount=await page.evaluate(()=>KanaSfx.playCount);
  await page.locator('#difficultySelect').selectOption('normal');
  await page.locator('#settingsBtn').click();await page.locator('#closeSettings').click();await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>KanaSfx.playCount),mutedCount,'muted native clicks and select changes produce no tones');
  await page.locator('#soundBtn').click();await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>KanaAudio.enabled),true);
  await page.locator('#startBtn').click();await readyToPlay(page);
  await page.locator('#keyboardBtn').click();
  // Sound pad buttons activate through their native click behavior for Enter and Space.
  for(const [index,keyName] of ['Enter','Space'].entries()){
    await page.evaluate(()=>{KanaRain.state.sinceSpawn=9999;});await page.waitForFunction(()=>KanaRain.state.drops.length>0);await readyToPlay(page);
    const path=await page.evaluate(()=>KanaRain.padPath(KanaRain.state.target.id));
    for(const selector of ['[data-family="'+path.family+'"]','[data-slot="'+path.slot+'"]']){const key=page.locator('#keyboard '+selector);await key.focus();await key.press(keyName);}
    await page.waitForFunction(n=>KanaRain.state.correct===n,index+1);
    assert.equal(await page.evaluate(()=>KanaRain.state.attempts),index+1,'native key activation submits once');
  }
  await page.evaluate(()=>{KanaRain.state.sinceSpawn=9999;});await page.waitForFunction(()=>KanaRain.state.drops.length>0);
  await page.locator('#answer').fill('zzz');await page.locator('#answer').press('Enter');
  const errorText=await page.locator('#feedback').textContent();
  await page.locator('#answer').fill(await page.evaluate(()=>KanaRain.accepted(KanaRain.state.target.id)[0]));
  await page.waitForFunction(()=>KanaRain.state.correct===3);
  assert.equal(await page.locator('#feedback').textContent(),errorText,'success cannot replace the protected correction');
  for(const streak of [5,10,20]){
    await page.evaluate(streak=>{KanaRain.state.streak=streak-1;KanaRain.state.sinceSpawn=9999;},streak);
    await page.waitForFunction(()=>KanaRain.state.drops.length>0);await readyToPlay(page);
    await page.locator('#answer').fill(await page.evaluate(()=>KanaRain.accepted(KanaRain.state.target.id)[0]));
    assert.match(await page.locator('#milestoneFeedback').textContent(),new RegExp('^'+streak+' in a row'));
    assert.equal(await page.locator('#feedback').textContent(),errorText,'streak celebration uses its separate channel');
  }
  assert.equal(await page.locator('#personalBest,#score').count(),0,'HUD presents run counts');
  assert.equal(await page.locator('#correctCount').textContent(),String(await page.evaluate(()=>KanaRain.state.correct)));
  await page.evaluate(()=>{KanaRain.state.sinceSpawn=9999;});await page.waitForFunction(()=>KanaRain.state.drops.length>0);await readyToPlay(page);
  await page.evaluate(()=>{KanaRain.state.drops[0].progress=.8;});
  await page.waitForFunction(()=>document.querySelector('.drop.danger'));
  assert.equal(await page.locator('.waterline.danger-active').count(),1,'the pond marks an approaching miss');
  await page.locator('#pauseBtn').click();await assertFrozen(page);await page.locator('#finishBtn').click();
  await page.locator('#backBtn').click();
  // Earlier unlocked rows and unrounded accuracy both participate in next-row readiness.
  await page.evaluate(()=>{
    Learner.reset();const gd=Learner.gameData('kana-rain');gd.rows={hiragana:2,katakana:1};gd.best={};gd.accuracy={};
    const kana=JPData.kana.filter(k=>k.script==='hiragana'&&['a','k'].includes(k.row));
    // These are prior in-game answers, so admission must recognize the practice repertoire.
    for(const k of kana){for(let i=0;i<2;i++)Learner.record(k.id,'form→sound',{gameId:'kana-rain',correct:true,rtMs:1000,firstAttempt:true,assistance:false,responseFormat:'romaji'});}
    for(let i=0;i<9;i++)Learner.record(kana[0].id,'form→sound',{gameId:'kana-rain',correct:true,rtMs:1000,firstAttempt:true,assistance:false,responseFormat:'romaji'});
    for(let i=0;i<2;i++)Learner.record(kana[0].id,'form→sound',{gameId:'kana-rain',correct:false,rtMs:1000,firstAttempt:true,assistance:false,responseFormat:'romaji'});
    Learner.flush();
  });
  await page.reload();await page.waitForFunction(()=>window.KanaRain);await page.locator('#gardenBtn').click();
  assert.match(await page.locator('#unlockSummary').textContent(),/9\s*\/\s*10/);
  await page.locator('.unlock-details summary').click();
  assert.equal(await page.locator('#unlockDetails .unlock-item').count(),10);
  assert.equal(await page.locator('#unlockDetails .pending').count(),1,'84.6 percent remains below the raw 85 percent threshold');
  assert.match(await page.locator('#unlockDetails .pending').textContent(),/あ/,'the pending item comes from the earlier vowel row');
  await page.locator('#closeGarden').click();await page.locator('#startBtn').click();await readyToPlay(page);
  await page.evaluate(()=>{KanaRain.state.sinceSpawn=9999;});await page.waitForFunction(()=>KanaRain.state.drops.length>=2);await readyToPlay(page);
  const other=await page.evaluate(()=>{const d=KanaRain.state.drops.find(d=>d.id!=='kana:あ');return {id:d.id,answer:KanaRain.accepted(d.id)[0]};});
  await page.locator('#answer').fill(other.answer);
  assert.equal(await page.evaluate(()=>KanaRain.gameData.rows.hiragana),2,'practicing another kana cannot bypass earlier-row readiness');
  await finishSession(page);await context.close();
}
async function exerciseRunCounts(errors){
  const context=await gameContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
  await context.route('**/*',route=>{const url=new URL(route.request().url());return url.origin==='http://127.0.0.1:4180'||['data:','blob:'].includes(url.protocol)?route.continue():route.abort();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4180');await page.waitForFunction(()=>!!window.KanaRain);
  const legacyBest=await page.evaluate(()=>{KanaRain.gameData.best['arcade-v2:hira:easy:180']=321;return {...KanaRain.gameData.best};});
  await page.evaluate(()=>KanaRain.start({reviewIds:['kana:あ']}));await readyToPlay(page);
  const pin=()=>page.evaluate(()=>{KanaRain.state.sinceSpawn=-100000;KanaRain.state.drops.forEach(d=>d.progress=0);});
  const next=async()=>{await page.evaluate(()=>{KanaRain.state.queue=[{id:'kana:あ'}];KanaRain.state.sinceSpawn=99999;});await page.waitForFunction(()=>KanaRain.state.drops.length>0);await pin();};
  await pin();await page.locator('#answer').fill('a');await page.waitForFunction(()=>KanaRain.state.correct===1);
  await next();for(let n=1;n<=2;n++){await page.locator('#answer').fill('zzz');await page.locator('#answer').press('Enter');await page.waitForFunction(n=>KanaRain.state.errors===n,n);}
  assert.equal(await page.evaluate(()=>KanaRain.state.correct),1);assert.equal(await page.locator('#errorCount,#expirationCount').count(),0,'mistakes and expired totals are reserved for results');
  await page.locator('#answer').fill('a');await page.waitForFunction(()=>KanaRain.state.correct===2);
  await next();await page.evaluate(()=>KanaRain.state.drops[0].progress=1);await page.waitForFunction(()=>KanaRain.state.expirations===1);
  assert.deepEqual(await page.evaluate(()=>({correct:KanaRain.state.correct,errors:KanaRain.state.errors,expirations:KanaRain.state.expirations,lives:KanaRain.state.lives})),{correct:2,errors:2,expirations:1,lives:2});
  assert.deepEqual(await page.locator('.hud-stats .stat b').allTextContents(),['2',await page.locator('#time').textContent()]);await assertHeartsVisible(page,'counting run');assert.equal(await page.locator('#lives').getAttribute('aria-label'),'2 of 3 hearts remaining');
  await finishSession(page);assert.deepEqual(await page.locator('#resultStats b').allTextContents(),['2','2','1']);assert.deepEqual(await page.locator('#resultStats small').allTextContents(),['CORRECT ANSWERS','WRONG ANSWERS','EXPIRED DROPS']);
  assert.match(await page.locator('#resultDetails').textContent(),/1 first-try.*1 after correction.*Best streak 1/);assert.ok((await page.locator('#resultCountingNote').textContent()).trim().length>0);
  assert.deepEqual(await page.evaluate(()=>KanaRain.gameData.best),legacyBest,'counting a run leaves every historical point record unchanged');
  assert.equal(await page.evaluate(()=>['score','previousBest','bestKey','bestBeaten'].some(key=>Object.hasOwn(KanaRain.state,key))),false);
  await screenshot(page,'counts-first-try-two-mistakes-correction-expiration');await context.close();
}
async function assertInitialDesktopResults(page,label){
  // Read the first layout before any locator action that could auto-scroll the dialog.
  const layout=await page.evaluate(()=>{
    const box=el=>{const r=el.getBoundingClientRect(),style=getComputedStyle(el);return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,clientWidth:el.clientWidth,clientHeight:el.clientHeight,scrollWidth:el.scrollWidth,scrollHeight:el.scrollHeight,scrollTop:el.scrollTop,scrollLeft:el.scrollLeft,visible:style.display!=='none'&&style.visibility!=='hidden'&&r.width>0&&r.height>0};};
    const control=el=>{const r=box(el),hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);return {...r,id:el.id,enabled:!el.disabled,receivesPointer:hit===el||el.contains(hit)};};
    return {width:innerWidth,height:innerHeight,scrollX,scrollY,dialog:box(document.querySelector('#results')),panel:box(document.querySelector('#results .dialog-panel')),next:box(document.querySelector('#resultNext')),review:box(document.querySelector('#resultReview')),grid:box(document.querySelector('#resultReview .review-grid')),cards:[...document.querySelectorAll('#resultReview .review-card')].map(control),footer:box(document.querySelector('#results .result-actions')),actions:['reviewPracticeBtn','againBtn','backBtn'].map(id=>control(document.getElementById(id)))};
  });
  const detail=label+' initial results: '+JSON.stringify(layout);
  const inside=(inner,outer)=>inner.left>=outer.left-1&&inner.top>=outer.top-1&&inner.right<=outer.right+1&&inner.bottom<=outer.bottom+1;
  const viewport={left:0,top:0,right:layout.width,bottom:layout.height};
  assert.equal(layout.scrollX,0,detail);assert.equal(layout.scrollY,0,detail);
  for(const part of ['dialog','panel']){
    const rect=layout[part];assert.ok(rect.visible&&inside(rect,viewport),detail);
    assert.equal(rect.scrollTop,0,detail);assert.equal(rect.scrollLeft,0,detail);
    assert.ok(rect.scrollHeight<=rect.clientHeight+1,detail+' '+part+' has vertical overflow');
    assert.ok(rect.scrollWidth<=rect.clientWidth+1,detail+' '+part+' has horizontal overflow');
  }
  assert.ok(inside(layout.panel,layout.dialog),detail);
  assert.ok(layout.next.visible&&inside(layout.next,layout.panel)&&inside(layout.next,viewport),detail+' next-row guidance is fully visible');
  assert.equal(layout.cards.length,2,detail+' two real mistakes produce two review cards');
  assert.equal(layout.grid.scrollTop,0,detail);
  assert.ok(layout.grid.scrollHeight<=layout.grid.clientHeight+1&&layout.grid.scrollWidth<=layout.grid.clientWidth+1,detail+' both review cards fit without internal scrolling');
  assert.ok(layout.footer.visible&&inside(layout.footer,layout.panel)&&inside(layout.footer,viewport),detail+' footer fits on first open');
  assert.ok(layout.next.bottom<=layout.footer.top+1&&layout.review.bottom<=layout.footer.top+1,detail+' next-row/review content does not cover footer');
  for(const card of layout.cards)assert.ok(card.visible&&card.receivesPointer&&inside(card,layout.grid)&&inside(card,layout.panel)&&card.bottom<=layout.footer.top+1,detail+' review card is visible and reachable');
  for(const action of layout.actions)assert.ok(action.visible&&action.enabled&&action.receivesPointer&&inside(action,layout.footer)&&inside(action,layout.panel)&&inside(action,viewport),detail+' '+action.id+' is visible and clickable before scrolling');
  return layout;
}
async function exerciseDesktopResults(errors){
  for(const [width,height]of [[1366,768],[1024,600],[761,560]]){
    // Each button gets its own fresh result screen so every real click starts unscrolled.
    for(const actionId of ['reviewPracticeBtn','againBtn','backBtn']){
      const label=width+'×'+height+' '+actionId;
      const context=await gameContext({viewport:{width,height},isMobile:false,hasTouch:false,serviceWorkers:'block'});
      try{
        await context.route('**/*',route=>{const url=new URL(route.request().url());return url.origin==='http://127.0.0.1:4180'||['data:','blob:'].includes(url.protocol)?route.continue():route.abort();});
        await context.addInitScript(()=>{
          if(location.origin!=='http://127.0.0.1:4180')return;
          // Synthetic familiar vowels avoid introduction randomness; no real profile is read.
          const seen=Object.fromEntries(['あ','い','う','え','お'].map(char=>['kana:'+char,true]));
          localStorage.setItem('jp-learner-v1',JSON.stringify({version:2,created:1700000000000,sequence:0,items:{},attemptLedger:[],exposureLedger:[],reveals:{},games:{'kana-rain':{rows:{hiragana:1,katakana:1},best:{},accuracy:{},playStyle:'arcade',sound:false,novelty:{version:1,pace:'calm',seen,recent:[],blocked:false,cooldownRemaining:0}}}}));
        });
        const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
        await page.goto('http://127.0.0.1:4180');await page.waitForFunction(()=>!!window.KanaRain);await page.evaluate(()=>document.fonts.ready);
        await page.locator('#startBtn').click();await readyToPlay(page);
        const pin=()=>page.evaluate(()=>{KanaRain.state.sinceSpawn=-100000;KanaRain.state.drops.forEach(drop=>drop.progress=0);});
        await pin();
        const first=await page.evaluate(()=>({id:KanaRain.state.target.id,answer:JPData.kanaById[KanaRain.state.target.id].romaji}));
        await page.locator('#answer').fill('zzz');await page.locator('#answer').press('Enter');await page.waitForFunction(()=>KanaRain.state.errors===1);
        await page.locator('#answer').fill(first.answer);await page.waitForFunction(()=>KanaRain.state.correct===1);
        const second=first.id==='kana:あ'?'kana:い':'kana:あ';
        // Select a distinct familiar drop, but create both review entries through real wrong submissions.
        await page.evaluate(id=>{KanaRain.state.queue=[{id}];KanaRain.state.sinceSpawn=99999;},second);
        await page.waitForFunction(id=>KanaRain.state.target?.id===id,second);await pin();
        await page.locator('#answer').fill('zzz');await page.locator('#answer').press('Enter');await page.waitForFunction(()=>KanaRain.state.errors===2);
        assert.deepEqual(await page.evaluate(()=>[...KanaRain.state.mistakes].sort()),[first.id,second].sort(),label+' real wrong answers populate the review list');
        await finishSession(page);
        assert.match(await page.locator('#resultNext').textContent(),/Next: K-row/);
        assert.deepEqual(await page.locator('#resultStats b').allTextContents(),['1','2','0']);
        const layout=await assertInitialDesktopResults(page,label);
        const action=layout.actions.find(value=>value.id===actionId);
        // Raw pointer coordinates cannot rescue a clipped footer by auto-scrolling it into view.
        await page.mouse.click((action.left+action.right)/2,(action.top+action.bottom)/2);
        if(actionId==='backBtn')assert.equal(await page.locator('#welcome').isVisible(),true,label+' returns to menu');
        else{
          await page.waitForFunction(()=>KanaRain.state&&!KanaRain.state.over);await readyToPlay(page);
          const reviewIds=await page.evaluate(()=>KanaRain.state.reviewIds);
          if(actionId==='reviewPracticeBtn')assert.deepEqual([...reviewIds].sort(),[first.id,second].sort(),label+' opens the two-kana review');
          else assert.equal(reviewIds,null,label+' starts a regular replay');
        }
      }finally{await context.close();}
    }
  }
}
(async()=>{
  server=spawn(process.execPath,[path.join(__dirname,'../scripts/serve.cjs')],{env:{...process.env,PORT:'4180'},windowsHide:true,stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error('Server exited: '+code)));});
  const channel=process.env.PLAYWRIGHT_BROWSER_CHANNEL;
  browser=await chromium.launch({headless:true,...(channel?{channel}:{})});
  if(process.argv.includes('--quick-ui-only')){
    const errors=[];await exerciseResponsiveMatrix(errors,[[320,568]]);await exerciseStableInput(errors);assert.deepEqual(errors,[]);
    console.log('PASS: focused mobile menu/game/dialogs, mascot behind field, stable romaji, touch/native Enter/Space and preserved partial input.');
    await browser.close();server.kill();return;
  }
  await require('./input.browser.cjs').checkPrefixInput(browser,'http://127.0.0.1:4180/');
  const context=await gameContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4180');
  await page.waitForFunction(()=>window.KanaRain);
  await assertWholeViewport(page,'Desktop title');
  await screenshot(page,'desktop');
  assert.equal(await page.locator('#welcome').isVisible(),true);
  assert.deepEqual(await page.locator('#mode option').evaluateAll(options=>options.map(option=>option.value)),['hira','kata']);
  assert.equal(await page.locator('#difficultySelect option:disabled').count(),0);
  assert.equal(await page.locator('#difficultySelect').inputValue(),'easy');
  await page.locator('#settingsBtn').click();
  assert.equal(await page.locator('#settingsDialog').isVisible(),true);
  assert.equal(await page.locator('#settingsMode,[data-difficulty],[data-duration],#practiceSelect,#noveltyPaceSelect').count(),0);
  await page.locator('#saveSettings').click();
  assert.equal(await page.locator('#settingsDialog').isVisible(),false);
  assert.equal(await page.evaluate(()=>KanaRain.settings.duration),180);
  await page.locator('#difficultySelect').selectOption('normal');
  await page.locator('#settingsBtn').click();await page.keyboard.press('Escape');
  assert.equal(await page.locator('#settingsDialog').isVisible(),false);
  assert.equal(await page.locator('#welcome').isVisible(),true);
  await page.locator('#gardenBtn').click();
  assert.equal(await page.locator('#progressDialog').isVisible(),true);
  assert.ok(await page.locator('#masteryMap button').count()>100);
  assert.match(await page.locator('#unlockSummary').textContent(),/0\s*\/\s*5/);
  assert.equal(await page.locator('#unlockDetails .unlock-item').count(),5);
  assert.match(await page.locator('#unlockNote').textContent(),/2 correct first answers.*85% first-answer accuracy/);
  await assertWholeViewport(page,'Desktop progress menu');
  await page.locator('#closeGarden').click();
  assert.equal(await page.locator('#welcome').isVisible(),true);
  await page.locator('#startBtn').click();
  assert.equal(await page.locator('#countdownNumber').textContent(),'3');
  await assertCountdownFrozen(page,1100);
  assert.equal(await page.locator('#countdownNumber').textContent(),'2');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#pauseOverlay').isVisible(),true,'Escape during countdown opens the pause menu');
  assert.equal(await page.evaluate(()=>KanaRain.state.countingDown),false);
  await assertFrozen(page);await page.locator('#resumeBtn').click();
  await readyToPlay(page);
  await page.waitForFunction(()=>KanaRain.state.drops.length>0);
  await assertWholeViewport(page,'Desktop gameplay');
  assert.equal(await page.locator('#welcome').isVisible(),false);
  assert.equal(await page.evaluate(()=>KanaRain.state.totalLives),3);
  await assertHeartsVisible(page,'Desktop');
  assert.match(await page.locator('#inputFormat').textContent(),/romaji/i);
  assert.match(await page.locator('#targetHint').textContent(),/Any drop.*highlighted/i);
  const first=await page.evaluate(()=>KanaRain.state.drops[0].id);
  const answer=await page.evaluate(id=>JPData.kanaById[id].romaji,first);
  await page.locator('#answer').fill(answer);
  await page.waitForFunction(()=>KanaRain.state.correct===1);
  assert.ok(await page.evaluate(()=>Learner.attempts().at(-1).firstResponseMs<1000),'the initial countdown must not count toward reaction time');
  const persisted=await page.evaluate(id=>JSON.parse(localStorage.getItem('jp-learner-v1')).items[id].facets['form→sound'].correct,first);
  assert.equal(persisted,1);
  await page.waitForFunction(()=>KanaRain.state.drops.length>0);
  const typo=await page.evaluate(()=>({id:KanaRain.state.target.id,char:JPData.kanaById[KanaRain.state.target.id].char,reading:JPData.kanaById[KanaRain.state.target.id].romaji}));
  await page.locator('#answer').fill('zzz');await page.locator('#answer').press('Enter');
  assert.equal(await page.locator('.drop.stained').count(),1);
  assert.match(await page.locator('#feedback').textContent(),/You typed zzz/);
  assert.equal(await page.evaluate(()=>KanaRain.state.lives),3,'a wrong answer costs a heart only if its drop reaches the pond');
  assert.equal(await page.evaluate(id=>KanaRain.state.mistakes.has(id),typo.id),true,'unrecognized typos still enter the review list');
  // Direct progress closes back into play. Progress opened from pause returns to pause.
  const dropsBefore=await page.evaluate(()=>KanaRain.state.drops.map(d=>d.id));
  await page.locator('#progressBtn').click();
  await assertFrozen(page);
  await assertWholeViewport(page,'Desktop progress overlay');
  await screenshot(page,'progress');
  await page.locator('#returnGarden').click();
  await readyToPlay(page);
  assert.equal(await page.evaluate(()=>KanaRain.state.paused),false);
  assert.deepEqual(await page.evaluate(()=>KanaRain.state.drops.map(d=>d.id)),dropsBefore);
  await page.locator('#answer').fill('partial');
  await page.locator('#pauseBtn').click();
  await assertFrozen(page);
  assert.equal(await page.locator('#pauseOverlay').isVisible(),true);
  await page.locator('#pauseGardenBtn').click();
  assert.equal(await page.locator('#progressDialog').isVisible(),true);
  await assertFrozen(page);
  await page.locator('#closeGarden').click();
  assert.equal(await page.locator('#pauseOverlay').isVisible(),true);
  assert.equal(await page.evaluate(()=>KanaRain.state.paused),true);
  await page.locator('#pauseSettingsBtn').click();
  assert.equal(await page.locator('#settingsDialog').isVisible(),true);
  await assertFrozen(page);await assertWholeViewport(page,'Desktop paused settings');
  assert.equal(await page.locator('#difficultySelect').isDisabled(),true,'difficulty cannot change during a session');
  assert.equal(await page.locator('#mode').isDisabled(),true);
  await page.locator('#closeSettings').click();
  assert.equal(await page.locator('#pauseOverlay').isVisible(),true);
  assert.equal(await page.evaluate(()=>KanaRain.state.paused),true);
  await page.locator('#pauseHelpBtn').click();
  assert.equal(await page.locator('#helpDialog').isVisible(),true);
  await assertFrozen(page);await page.locator('#closeHelp').click();
  assert.equal(await page.locator('#pauseOverlay').isVisible(),true);
  assert.equal(await page.evaluate(()=>KanaRain.state.paused),true);
  await page.locator('#resumeBtn').click();
  await assertCountdownFrozen(page);
  assert.equal(await page.locator('#answer').inputValue(),'partial','resume countdown preserves the unfinished answer');
  await readyToPlay(page);
  assert.equal(await page.locator('#answer').inputValue(),'partial');
  await page.locator('#answer').fill('');
  assert.equal(await page.evaluate(()=>KanaRain.state.paused),false);
  await screenshot(page,'playing');
  await finishSession(page);
  await assertWholeViewport(page,'Desktop results');
  assert.equal(await page.locator('#againBtn').isEnabled(),true);
  const reviewCard=page.locator('#resultReview [data-kana="'+typo.char+'"]');
  assert.equal(await reviewCard.count(),1);
  assert.match(await reviewCard.textContent(),new RegExp(typo.reading));
  await reviewCard.click();
  assert.equal(await page.locator('#results').isVisible(),true,'review audio keeps the results open');
  await screenshot(page,'results-review');
  const normalSession=await page.evaluate(()=>({settings:KanaRain.settings,best:{...KanaRain.gameData.best}}));
  await page.locator('#reviewPracticeBtn').click();await readyToPlay(page);
  assert.equal(await page.evaluate(()=>KanaRain.state.sessionDuration),60);
  assert.equal(await page.evaluate(()=>KanaRain.state.difficulty),normalSession.settings.difficulty);
  assert.deepEqual(await page.evaluate(()=>KanaRain.settings),normalSession.settings,'focused review preserves the user session settings');
  assert.equal(await page.evaluate(id=>KanaRain.state.reviewIds.includes(id),typo.id),true);
  assert.equal(await page.evaluate(()=>KanaRain.state.drops.concat(KanaRain.state.queue).every(d=>KanaRain.state.reviewIds.includes(d.id))),true);
  await page.locator('#answer').fill(await page.evaluate(()=>KanaRain.accepted(KanaRain.state.drops[0].id)[0]));
  await page.waitForFunction(()=>KanaRain.state.correct===1);
  await finishSession(page);
  assert.deepEqual(await page.evaluate(()=>KanaRain.gameData.best),normalSession.best,'review leaves all legacy personal bests intact');
  await page.locator('#backBtn').click();await page.locator('#startBtn').click();await readyToPlay(page);
  assert.equal(await page.evaluate(()=>KanaRain.state.reviewIds),null);
  assert.equal(await page.evaluate(()=>KanaRain.state.sessionDuration),normalSession.settings.duration);
  await finishSession(page);
  assert.equal(await page.locator('#reviewPracticeBtn').isVisible(),false,'a session with no mistakes cannot start an empty review');
  await page.reload();await page.waitForFunction(()=>window.KanaRain);
  assert.equal(await page.evaluate(id=>Learner.state(id).facets['form→sound'].correct,first),1);
  // Explore mode cannot revive retired modes, but keeps Katakana available for QA.
  await page.goto('http://127.0.0.1:4180/?all');await page.waitForFunction(()=>window.KanaRain);
  assert.deepEqual(await page.locator('#mode option').evaluateAll(options=>options.map(option=>option.value)),['hira','kata']);
  await page.locator('#mode').selectOption('kata');await page.locator('#startBtn').click();await readyToPlay(page);
  assert.equal(await page.evaluate(()=>KanaRain.state.drops.every(d=>d.responseFormat==='romaji'&&JPData.kanaById[d.id].script==='katakana')),true);
  assert.equal(await page.locator('#answerForm').isVisible(),true,'desktop Katakana is typed like Hiragana');
  await page.locator('#answer').fill(await page.evaluate(()=>KanaRain.accepted(KanaRain.state.target)[0]));await page.waitForFunction(()=>KanaRain.state.correct===1);
  assert.equal(await page.evaluate(()=>{const event=KanaRain.state.events.at(-1);return event.responseFormat==='romaji'&&event.inputMethod==='typing';}),true);
  await finishSession(page);
  await page.waitForFunction(()=>document.querySelector('#offlineStatus').textContent.includes('ready offline'));
  const cacheCount=await page.evaluate(async()=>{const key=(await caches.keys()).find(k=>k.startsWith('kana-rain-'));const c=await caches.open(key);return (await c.keys()).filter(r=>r.url.endsWith('.mp3')).length;});
  assert.equal(cacheCount,104);
  // An artwork navigation must never overwrite the separately cached offline game shell.
  await page.waitForFunction(()=>navigator.serviceWorker.controller);
  await page.goto('http://127.0.0.1:4180/art.html',{waitUntil:'domcontentloaded'});
  assert.equal(await page.title(),'Kana Rain Artwork | Nihongo Grove');
  await context.setOffline(true);await page.goto('http://127.0.0.1:4180/');await page.waitForFunction(()=>window.KanaRain);
  assert.equal(await page.locator('#welcome').isVisible(),true);
  assert.ok(await page.evaluate(()=>KanaAudio.ready.then(()=>KanaAudio.available)));
  assert.ok(await page.evaluate(()=>!!window.KanaSfx),'the offline shell includes interface audio');
  assert.ok(await page.evaluate(async()=>{const r=await fetch('kana-audio-bundle/audio/a.mp3');return r.ok&&(await r.arrayBuffer()).byteLength>1000;}));
  await context.setOffline(false);
  const mobileContext=await gameContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobile=await mobileContext.newPage();mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto('http://127.0.0.1:4180');await mobile.waitForFunction(()=>window.KanaRain);
  await assertWholeViewport(mobile,'Mobile title');await screenshot(mobile,'mobile');
  await mobile.locator('#gardenBtn').tap();
  await assertWholeViewport(mobile,'Mobile progress menu');
  await mobile.locator('#returnGarden').tap();
  await mobile.locator('#difficultySelect').selectOption('easy');
  await mobile.locator('#startBtn').tap();await readyToPlay(mobile);await mobile.waitForFunction(()=>KanaRain.state.drops.length>0);
  assert.equal(await mobile.evaluate(()=>KanaRain.state.totalLives),3);
  await assertHeartsVisible(mobile,'Mobile');
  if(!await mobile.locator('#keyboard').isVisible())await mobile.locator('#keyboardBtn').tap();
  await tapCompose(mobile,await mobile.evaluate(()=>KanaRain.state.drops[0].id));
  await mobile.waitForFunction(()=>KanaRain.state.correct===1);
  await assertWholeViewport(mobile,'Mobile gameplay with the sound pad');
  await mobile.waitForFunction(()=>KanaRain.state.drops.length>0);
  await screenshot(mobile,'mobile-playing');
  await mobile.locator('#progressBtn').tap();await assertFrozen(mobile);
  await assertWholeViewport(mobile,'Mobile progress overlay');
  await screenshot(mobile,'mobile-progress');
  await assertProgressHeading(mobile);
  await mobile.locator('#closeGarden').tap();
  await readyToPlay(mobile);
  assert.equal(await mobile.evaluate(()=>KanaRain.state.paused),false);
  // Paused rotation preserves normalized drop travel, then resumes into usable landscape space.
  await mobile.locator('#pauseBtn').tap();await assertFrozen(mobile);
  const progressBeforeResize=await mobile.evaluate(()=>KanaRain.state.drops.map(d=>({id:d.id,progress:d.progress})));
  await mobile.setViewportSize({width:844,height:390});await mobile.waitForTimeout(150);
  assert.deepEqual(await mobile.evaluate(()=>KanaRain.state.drops.map(d=>({id:d.id,progress:d.progress}))),progressBeforeResize,'resizing must preserve normalized drop travel');
  await mobile.locator('#resumeBtn').tap();await readyToPlay(mobile);await mobile.waitForTimeout(150);
  await assertWholeViewport(mobile,'Short landscape gameplay');
  await assertHeartsVisible(mobile,'Landscape');
  assert.equal(await mobile.locator('#answer').isVisible(),true);
  assert.equal(await mobile.locator('#keyboardBtn').isVisible(),true);
  const dock=await mobile.locator('#answerDock').boundingBox(),field=await mobile.locator('#field').boundingBox();
  await screenshot(mobile,'landscape-playing');
  assert.ok(dock&&field&&dock.y>=0&&dock.y+dock.height<=390+1,'Landscape input dock must remain in the viewport');
  const box=r=>({left:r.x,top:r.y,right:r.x+r.width,bottom:r.y+r.height});
  assert.ok(field.height>=80&&apart(box(field),box(dock)),'Landscape drops must have visible room beside the sound pad: '+JSON.stringify({field,dock}));
  const dropFit=await mobile.evaluate(()=>{
    const field=document.querySelector('#field').getBoundingClientRect(),d=KanaRain.state.drops[0],rect=d.el.getBoundingClientRect();
    return {field:{top:field.top,bottom:field.bottom,height:field.height},drop:{top:rect.top,bottom:rect.bottom,height:rect.height}};
  });
  assert.ok(dropFit.field.height>=dropFit.drop.height,'Landscape drop must fit in the playing area: '+JSON.stringify(dropFit));
  assert.ok(dropFit.drop.top>=dropFit.field.top-1&&dropFit.drop.bottom<=dropFit.field.bottom+1,'Landscape live drop must remain fully visible: '+JSON.stringify(dropFit));
  await mobile.locator('#pauseBtn').tap();await assertFrozen(mobile);
  await assertWholeViewport(mobile,'Short landscape pause menu');
  await mobile.locator('#resumeBtn').tap();
  await readyToPlay(mobile);
  await mobileContext.close();
  // Every novelty difficulty shares a rain curve that accelerates with correct answers, not active time.
  // Each expiration removes one of the universal three hearts.
  const difficultyContext=await gameContext();
  for(const [difficulty,hearts] of [['easy',3],['normal',3],['hard',3]]){
    const level=await difficultyContext.newPage();level.on('pageerror',e=>errors.push(e.message));
    await level.goto('http://127.0.0.1:4180');await level.waitForFunction(()=>window.KanaRain);
    await level.locator('#difficultySelect').selectOption(difficulty);await level.locator('#startBtn').click();
    await readyToPlay(level);
    await level.waitForFunction(()=>KanaRain.state.drops.length>0);
    assert.equal(await level.evaluate(()=>KanaRain.state.difficulty),difficulty);
    assert.equal(await level.evaluate(()=>KanaRain.state.totalLives),hearts);
    assert.equal(await level.evaluate(()=>KanaRain.state.lives),hearts);
    await assertHeartsVisible(level,difficulty);
    assert.match(await level.locator('#lives').getAttribute('aria-label'),new RegExp('^'+hearts+'(?: of '+hearts+')? hearts?'));
    if(difficulty==='easy')await screenshot(level,'difficulty-easy');
    const initial=await level.evaluate(()=>({speed:KanaRain.state.speed,gap:KanaRain.state.gap}));
    await level.evaluate(()=>{KanaRain.state.elapsed=90;});
    await level.waitForFunction(()=>KanaRain.state.elapsed>90);
    assert.deepEqual(await level.evaluate(()=>({speed:KanaRain.state.speed,gap:KanaRain.state.gap})),initial,difficulty+' does not accelerate with time alone');
    await level.evaluate(()=>{KanaRain.state.correct=56;});
    await level.waitForFunction(speed=>KanaRain.state.speed>speed,initial.speed);
    const faster=await level.evaluate(()=>({speed:KanaRain.state.speed,gap:KanaRain.state.gap,expected:KanaDifficulty.atTime(KanaRain.state.difficulty,56*1.6)}));
    assert.equal(faster.speed,faster.expected.speed,difficulty+' reads 56 correct answers as 89.6 s of the shared curve');assert.equal(faster.gap,faster.expected.gap);
    assert.ok(faster.gap<initial.gap,difficulty+' shortens the spawn interval as answers accumulate');
    await level.evaluate(()=>{KanaRain.state.correct=0;});
    for(let i=0;i<hearts;i++){
      await level.waitForFunction(()=>KanaRain.state.drops.length>0);
      await level.locator('#pauseBtn').click();
      const token=difficulty+'-miss-'+i;
      await level.evaluate(token=>{
        const g=KanaRain.state;g.drops.forEach(d=>d.progress=0);g.drops[0].progress=1;g.drops[0].el.dataset.forcedMiss=token;g.sinceSpawn=9999;
      },token);
      await level.locator('#resumeBtn').click();
      await readyToPlay(level);
      const remaining=hearts-i-1;
      await level.waitForFunction(n=>KanaRain.state.lives===n,remaining);
      assert.match(await level.locator('#lives').getAttribute('aria-label'),new RegExp('^'+remaining+'(?: of '+hearts+')? hearts?'));
      assert.equal(await level.locator('[data-forced-miss="'+token+'"]').count(),0,difficulty+' missed drop is removed');
      assert.equal(await level.evaluate(()=>KanaRain.state.over),remaining===0,difficulty+' ends only after its final heart');
      assert.equal(await level.locator('#results').isVisible(),remaining===0);
      assert.equal(await level.evaluate(()=>document.body.classList.contains('low-hearts')),remaining===1);
      if(remaining>0)await assertHeartsVisible(level,difficulty+' '+remaining+' hearts remaining');
      if(remaining>0){
        assert.equal(await level.evaluate(()=>document.body.classList.contains('heart-hit')),true);
        assert.equal(await level.locator('#heartLoss').isVisible(),true);
      }
    }
    assert.equal(await level.evaluate(()=>KanaRain.state.attempts),0,'expired drops do not invent submitted answers');
    assert.equal(await level.evaluate(()=>KanaRain.state.events.filter(event=>event.outcome==='timeout').length),hearts);
    assert.match(await level.locator('#resultMessage').textContent(),new RegExp('All '+hearts+' hearts? lost'),difficulty+' loss message uses its chosen heart allowance');
    await level.close();
  }
  // Practicing the entire vowel row with unaided evidence unlocks the K-row during play.
  const grow=await difficultyContext.newPage();grow.on('pageerror',e=>errors.push(e.message));
  await grow.goto('http://127.0.0.1:4180');await grow.waitForFunction(()=>window.KanaRain);
  await grow.evaluate(()=>{
    Learner.reset();const gd=Learner.gameData('kana-rain');gd.rows={hiragana:1,katakana:1};gd.best={};gd.accuracy={};
    for(const k of JPData.kana.filter(k=>k.script==='hiragana'&&k.row==='a')){
      for(let i=0;i<20;i++)Learner.record(k.id,'form→sound',{correct:true,rtMs:1000,firstAttempt:true,assistance:false,responseFormat:'romaji'});
    }Learner.flush();
  });
  await grow.reload();await grow.waitForFunction(()=>window.KanaRain);await grow.locator('#startBtn').click();
  await readyToPlay(grow);
  await grow.locator('#answer').fill('zzz');await grow.locator('#answer').press('Enter');
  const protectedError=await grow.locator('#feedback').textContent();
  await grow.locator('#answer').fill(await grow.evaluate(()=>JPData.kanaById[KanaRain.state.drops[0].id].romaji));
  assert.equal(await grow.evaluate(()=>KanaRain.gameData.rows.hiragana),2);
  assert.equal(await grow.locator('#feedback').textContent(),protectedError,'unlock does not replace a still-visible correction');
  await grow.locator('#pauseBtn').click();
  await grow.waitForTimeout(4000);
  assert.equal(await grow.locator('#feedback').textContent(),protectedError,'paused correction cannot expire to make room for an unlock message');
  await grow.locator('#resumeBtn').click();await readyToPlay(grow);
  await grow.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('A new row is growing'),{},{timeout:5000});
  const unlockMessage=await grow.locator('#feedback').textContent();
  await grow.evaluate(()=>{KanaRain.state.sinceSpawn=9999;});await grow.waitForFunction(()=>KanaRain.state.drops.length>0);await readyToPlay(grow);
  await grow.locator('#answer').fill(await grow.evaluate(()=>KanaRain.accepted(KanaRain.state.target.id)[0]));
  assert.equal(await grow.locator('#feedback').textContent(),unlockMessage,'success does not replace a protected unlock announcement');
  await difficultyContext.close();
  await exerciseQuickWins(errors);
  await exerciseRunCounts(errors);
  await exerciseDesktopResults(errors);
  await exerciseResponsiveMatrix(errors);
  await exerciseStableInput(errors);
  assert.deepEqual(errors,[]);
  console.log('PASS: desktop and 7 mobile sizes, first-open desktop results/footer at 1366×768/1024×600/761×560, count/timer HUD, exact first-try/correction/wrong/expiration results, legacy records preserved, overlays/scroll-free viewport, frozen countdown and reaction time, focused review/audio, stable romaji for mature items, protected feedback/streak celebrations, readiness/locked setup, native keyboard/SFX/mute, danger/heart cues, persistence/resize, all profiles three hearts and common answer-driven acceleration, offline shell and 104 kana recordings.');
  await browser.close();
  server.kill();
})().catch(async e=>{console.error(e);if(browser)await browser.close();if(server)server.kill();process.exitCode=1;});
