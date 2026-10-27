'use strict';
// Disposable native browser, synthetic progress only, production build, no outside requests.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {currentBuild}=require('./helpers/update-fixture.cjs');
const {fixture,data}=require('./helpers/journey-fixture.cjs');
const out=path.join(__dirname,'artifacts/journey'),report={syntheticProgressOnly:true,productionAccess:false,checks:[],errors:[]};
const contexts=new Set();let browser,server,origin;
const pass=(name,details={})=>{report.checks.push({name,...details});console.log('PASS '+name);};
async function open(saved=fixture(),viewport={width:1366,height:768},offline=false){
  const mobile=viewport.width<500||viewport.height<500;
  const c=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,serviceWorkers:offline?'allow':'block'});contexts.add(c);
  await c.addCookies([{name:'ng_analytics_consent',value:'denied',url:origin}]);
  // Context routing does not intercept service-worker requests; a browser-level proxy is unnecessary
  // because the static worker's audited allowlist contains only same-origin requests.
  await c.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await c.addInitScript(saved=>{if(!localStorage.getItem('journey-test-seeded')){localStorage.setItem('jp-learner-v1',JSON.stringify(saved));localStorage.setItem('journey-test-seeded','1');}},saved);
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(origin);await p.waitForFunction(()=>!!window.KanaRain);return p;
}
async function start(p){await p.locator('#mode').selectOption('journey');await p.locator('#startBtn').click();await p.locator('#skipCountdown').click();await pin(p);}
async function pin(p){await p.evaluate(()=>{const g=KanaRain.state;g.sinceSpawn=-1e9;for(const d of g.drops){d.v=0;d.progress=.35;}});}
async function next(p,id){await p.evaluate(id=>{if(id)KanaRain.state.queue=[{id}];KanaRain.state.sinceSpawn=1e9;},id);await p.waitForFunction(()=>KanaRain.state.drops.length>0);await pin(p);}
async function answer(p,pad=false){
  const t=await p.evaluate(()=>({id:KanaRain.state.target.id,correct:KanaRain.state.correct}));
  if(pad){const cell=await p.evaluate(id=>KanaRain.padPath(id),t.id);await p.waitForTimeout(80);await p.locator('[data-family="'+cell.family+'"]').tap();await p.waitForTimeout(80);await p.locator('[data-slot="'+cell.slot+'"]').tap();}
  else{await p.locator('#answer').fill(data.kanaById[t.id].romaji);await p.locator('#answer').press('Enter');}
  await p.waitForFunction(n=>KanaRain.state.correct===n+1,t.correct);return t.id;
}
async function close(p){await p.context().close();contexts.delete(p.context());}
async function responsive(){
  for(const viewport of [{width:1366,height:768},{width:390,height:844},{width:360,height:640},{width:844,height:390}]){
    const p=await open(fixture(),viewport),mobile=viewport.width<500||viewport.height<500;
    await p.locator('#mode').selectOption('journey');await p.screenshot({path:path.join(out,`menu-${viewport.width}x${viewport.height}.png`)});
    await start(p);assert.equal(await p.evaluate(()=>KanaRain.state.journeyStage),'mixed');
    // Ordinary selection starts Katakana; request the next spawn to show both scripts together.
    await p.evaluate(()=>KanaRain.state.sinceSpawn=1e9);await p.waitForFunction(()=>KanaRain.state.drops.length===2);await pin(p);
    await p.evaluate(()=>{KanaRain.state.drops[0].progress=.65;KanaRain.state.drops[1].progress=.2;});
    await p.waitForTimeout(50);
    const geometry=await p.evaluate(()=>{
      const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      return {scripts:[...new Set(KanaRain.state.drops.map(d=>JPData.kanaById[d.id].script))],field:rect('field'),dock:rect('answerDock'),label:rect('gameLabel'),stats:rect('correctCount'),pageWidth:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight};
    });
    assert.equal(geometry.scripts.length,2,'two alphabets can coexist on screen');
    assert.ok(geometry.pageWidth<=viewport.width+1&&geometry.pageHeight<=viewport.height+1,'no document scrolling');
    assert.ok(geometry.field.bottom<=geometry.dock.top+1||geometry.field.right<=geometry.dock.left+1||geometry.field.left>=geometry.dock.right-1,'controls do not cover the playfield');
    assert.ok(geometry.field.height>=100,'positive usable falling path on short phones');
    assert.ok(geometry.label.right<=geometry.stats.left||geometry.label.bottom<=geometry.stats.top||geometry.label.top>=geometry.stats.bottom,'mode label does not overlap counts');
    await p.screenshot({path:path.join(out,`mixed-${viewport.width}x${viewport.height}.png`)});
    await answer(p,mobile);await answer(p,mobile);
    const recent=await p.evaluate(()=>Learner.attempts().slice(-2));
    assert.equal(new Set(recent.map(e=>data.kanaById[e.itemId].script)).size,2);
    assert.ok(recent.every(e=>e.inputMethod===(mobile?'composer':'typing')&&e.responseFormat==='romaji'));
    await p.locator('#pauseBtn').click();await p.locator('#finishBtn').click();await p.locator('#results').waitFor({state:'visible'});
    for(const id of ['againBtn','backBtn'])assert.ok(await p.locator('#'+id).isVisible());
    await p.screenshot({path:path.join(out,`results-${viewport.width}x${viewport.height}.png`)});
    pass('mixed rain and shared controls at '+viewport.width+'x'+viewport.height,{geometry});await close(p);
  }
}
async function transition(){
  const saved=fixture({katakana:false,access:false});saved.attemptLedger=saved.attemptLedger.filter(e=>!(e.itemId==='kana:ぴょ'&&e.attemptId.endsWith(':1')));
  const p=await open(saved);await start(p);assert.equal(await p.evaluate(()=>KanaRain.state.journeyStage),'hiragana');
  if(await p.evaluate(()=>KanaRain.state.target.id)!=='kana:ぴょ'){await answer(p);await next(p,'kana:ぴょ');}
  await answer(p);assert.equal(await p.evaluate(()=>KanaRain.state.journeyStage),'katakana');await next(p);
  assert.equal(await p.evaluate(()=>KanaRain.state.target.id),'kana:ア');
  pass('real Hiragana answer transitions to the first Katakana in the same native session');await close(p);
}
async function twoTabs(){
  const p=await open(),c=p.context(),q=await c.newPage();q.on('pageerror',e=>report.errors.push(e.message));await q.goto(origin);await q.waitForFunction(()=>!!window.KanaRain);
  await start(p);await start(q);
  const base=fixture().attemptLedger.length;
  await Promise.all([answer(p),answer(q)]);
  const ids=await Promise.all([p.evaluate(()=>KanaRain.state.events.at(-1).attemptId),q.evaluate(()=>KanaRain.state.events.at(-1).attemptId)]);
  assert.equal(new Set(ids).size,2);
  await q.close();await p.evaluate(()=>Learner.flush());await p.reload();await p.waitForFunction(()=>!!window.KanaRain);
  const restored=await p.evaluate(()=>({events:Learner.attempts(),gd:KanaRain.gameData}));
  assert.equal(restored.events.length,base+2);for(const id of ids)assert.ok(restored.events.some(e=>e.attemptId===id));
  assert.equal(restored.gd.journeyMixedUnlocked,true);assert.equal(restored.gd.rows.hiragana,27);assert.equal(restored.gd.rows.katakana,2);
  assert.deepEqual(restored.gd.accuracy.kata,{attempts:2,correct:2});
  pass('two native tabs retain both answers and earned mixed access after closing and reloading');await close(p);
}
async function offline(){
  const p=await open(fixture(),undefined,true);await p.evaluate(()=>navigator.serviceWorker.ready);
  await p.reload();await p.waitForFunction(()=>!!window.KanaRain&&!!navigator.serviceWorker.controller);
  await p.context().setOffline(true);await p.reload();await p.waitForFunction(()=>!!window.KanaRain);await start(p);
  await answer(p);await next(p);await answer(p);
  await p.evaluate(()=>Learner.flush());await p.reload();await p.waitForFunction(()=>!!window.KanaRain);
  assert.equal(await p.evaluate(()=>Learner.attempts().length),fixture().attemptLedger.length+2);
  assert.equal(await p.evaluate(()=>KanaRain.gameData.journeyMixedUnlocked),true);
  pass('production build reloads, plays and saves Journey offline under its actual service worker');await close(p);
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});const build=currentBuild(),mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'};
  server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=name==='/'?'/index.html':name,bytes=build.files.get(file);res.writeHead(bytes?200:404,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true});
  await transition();await responsive();await twoTabs();await offline();assert.deepEqual(report.errors,[]);report.passed=true;
})().catch(e=>{report.failure=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{
  for(const c of contexts)await c.close().catch(()=>{});await browser?.close();await new Promise(r=>server?server.close(r):r());
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));
});
