'use strict';
// Native first-upgrade failures under the already-installed historical worker.
// Every profile is disposable; only synthetic facts and an ephemeral localhost are used.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{root,currentBuild,baselineBuild,hash}=require('./helpers/update-fixture.cjs'),{fixture}=require('./helpers/journey-fixture.cjs');
const out=path.join(__dirname,'artifacts/partial-update'),KEY='jp-learner-v1',PRIMARY=KEY+':protected:v1';
const filter=process.argv[2];assert.ok(!filter||['1.10.1','1.12.0','1.12.1','future'].includes(filter),'choose an optional pinned baseline or future scenario');
const contexts=new Set(),report={startedAt:new Date().toISOString(),passed:false,syntheticProgressOnly:true,productionAccess:false,userProfileAccess:false,serviceWorkers:'allowed only in disposable localhost contexts',checks:[],pageErrors:[],outsideRequests:[],contextsOpened:0,contextsClosed:0};
let server,browser,origin,served,candidate,fault=null,networkDown=false;
const requests=[];
function factsPreserved(before,after){
  assert.equal(after.version,before.version,'schema unchanged');
  for(const [name,key]of [['attemptLedger','attemptId'],['exposureLedger','exposureId']]){
    const byId=new Map(after[name].map(e=>[e[key],e]));assert.equal(byId.size,after[name].length,'no duplicate '+name);
    for(const e of before[name])assert.deepEqual(byId.get(e[key]),e,'retained immutable '+key+' '+e[key]);
  }
  const a=after.games['kana-rain'],b=before.games['kana-rain'];
  for(const key of ['rows','best','katakanaUnlocked','journeyMixedUnlocked','sound','reducedEffects','syntheticRetained'])assert.deepEqual(a[key],b[key],'retained '+key);
  assert.deepEqual(a.accuracy.historical,b.accuracy.historical,'historical accuracy retained');
}
function preserved(before,after){
  factsPreserved(before,after);
  for(const [id,item]of Object.entries(before.items))assert.deepEqual(after.items[id].facets,item.facets,'familiarity facts retained for '+id);
  const a=after.games['kana-rain'],b=before.games['kana-rain'];assert.deepEqual(a.accuracy,b.accuracy,'accuracy unchanged without an answer');
  for(const name of ['novelty','katakanaNovelty'])if(b[name])for(const key of ['seen','recent','blocked','cooldownRemaining'])assert.deepEqual(a[name][key],b[name][key],'retained '+name+'.'+key);
}
function historicalSeed(release){
  const raw=fixture(),gd=raw.games['kana-rain'];gd.journeyMixedUnlocked=true;gd.reducedEffects=true;gd.syntheticRetained={nested:['keep this old data',42]};
  gd.accuracy={historical:{attempts:17,correct:14}};gd.novelty.cooldownRemaining=7;gd.novelty.blocked=true;
  gd.novelty.recent=Array.from({length:60},(_,i)=>({roundId:'retained-pressure:'+i,firstCorrect:i<54,timeout:i>=58,miss:i>=54&&i<58,familiar:true}));
  gd.katakanaNovelty={version:1,pace:'calm',seen:Object.fromEntries(['ア','イ','ウ','エ','オ'].map(k=>['kana:'+k,true])),recent:[],blocked:false,cooldownRemaining:0};
  const store=new Map([[KEY,JSON.stringify(raw)]]),box=vm.createContext({Date,Math,console,setTimeout,clearTimeout,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)}});box.window=box;
  vm.runInContext(release.files.get('/src/learner.js').toString(),box);return box.Learner.ready.then(()=>JSON.parse(box.Learner.export()));
}
async function disk(page){return page.evaluate(async({KEY,PRIMARY})=>{
  const key=localStorage.getItem(PRIMARY)?PRIMARY:KEY,journal=JSON.parse(localStorage.getItem(key));
  const indexedDBCopy=await new Promise((resolve,reject)=>{const r=indexedDB.open('kana-garden',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('learner'),read=tx.objectStore('learner').get(key);read.onsuccess=()=>resolve(read.result);read.onerror=()=>reject(read.error);tx.oncomplete=()=>db.close();};});
  return {journal,indexedDB:indexedDBCopy};
},{KEY,PRIMARY});}
async function snapshot(page){
  await page.waitForFunction(()=>window.Learner&&Learner.persistenceStatus().state==='saved',null,{timeout:30000});
  const saved=await page.evaluate(()=>JSON.parse(Learner.export())),copies=await disk(page);
  assert.deepEqual(copies.journal,saved,'localStorage exactly matches saved export');assert.deepEqual(copies.indexedDB,saved,'IndexedDB exactly matches saved export');return saved;
}
async function ready(page){await page.waitForFunction(()=>!!window.KanaRain,null,{timeout:30000});await page.evaluate(()=>KanaAudio.ready);assert.equal(await page.locator('#welcome').isVisible(),true);}
async function cachePresent(page,cache){return page.evaluate(async name=>(await caches.keys()).includes(name),cache);}
async function workerUpdate(page){return page.evaluate(async()=>{
  const r=await navigator.serviceWorker.getRegistration();await r.update();const w=r.installing||r.waiting;if(!w)return r.active?.state;
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('worker did not settle')),30000);function changed(){if(['activated','redundant'].includes(w.state)){clearTimeout(timer);resolve(w.state);}}w.addEventListener('statechange',changed);changed();});
});}
async function open(release,{mobile=false}={}){
  served=release;fault=null;networkDown=false;
  const historical=['1.10.1','1.12.0','1.12.1'].includes(release.version)?release:baselineBuild('1.12.1');
  const seed=await historicalSeed(historical),ctx=await browser.newContext({serviceWorkers:'allow',viewport:mobile?{width:390,height:844}:{width:1366,height:768},isMobile:mobile,hasTouch:mobile});contexts.add(ctx);report.contextsOpened++;
  await ctx.addCookies([{name:'ng_analytics_consent',value:'denied',url:origin}]);
  await ctx.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===origin||['data:','blob:'].includes(u.protocol))return route.continue();report.outsideRequests.push(u.href);return route.abort();});
  await ctx.addInitScript(({seed,origin})=>{if(location.origin===origin&&!localStorage.getItem('partial-update-seeded')){localStorage.setItem('jp-learner-v1',JSON.stringify(seed));localStorage.setItem('partial-update-seeded','true');}},{seed,origin});
  const page=await ctx.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>report.pageErrors.push(e.message));await page.goto(origin);await ready(page);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller&&document.querySelector('#offlineStatus').textContent.includes('ready offline'));
  await page.evaluate(async()=>{const c=await caches.open('partial-update-unrelated');await c.put('/sentinel',new Response('unrelated cache retained'));});
  assert.equal(await cachePresent(page,release.cache),true);const before=await snapshot(page);preserved(seed,before);return {page,ctx,before};
}
async function assertNoReloadLoop(page){const before=await page.evaluate(()=>performance.timeOrigin);await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>performance.timeOrigin),before,'no automatic reload loop');}
async function close(ctx){await ctx.close();if(contexts.delete(ctx))report.contextsClosed++;}
async function play(page,before){
  await page.locator('#mode').selectOption('hira');await page.locator('#startBtn').click();await page.locator('#skipCountdown').click();await page.waitForFunction(()=>KanaRain.state&&!KanaRain.state.paused&&KanaRain.state.target);
  const target=await page.evaluate(()=>({id:KanaRain.state.target.id,reading:KanaRain.accepted(KanaRain.state.target)[0]}));await page.locator('#answer').fill(target.reading);await page.locator('#answer').press('Enter');await page.waitForFunction(()=>KanaRain.state.correct===1);
  await page.locator('#pauseBtn').click();await page.locator('#finishBtn').click();await page.locator('#backBtn').click();const after=await snapshot(page);
  // A real answer legitimately updates one facet, accuracy and pressure; immutable old
  // events, earned access, settings and historical counters must nevertheless remain.
  assert.equal(after.attemptLedger.length,before.attemptLedger.length+1);for(const e of before.attemptLedger)assert.deepEqual(after.attemptLedger.find(x=>x.attemptId===e.attemptId),e);for(const e of before.exposureLedger)assert.deepEqual(after.exposureLedger.find(x=>x.exposureId===e.exposureId),e);
  const recorded=after.attemptLedger.at(-1);assert.equal(recorded.correct,true);assert.equal(recorded.itemId,target.id);
  assert.equal(after.items[target.id].facets['form→sound'].correct,before.items[target.id].facets['form→sound'].correct+1,'one new correct fact updates the answered kana once');
  for(const [id,item]of Object.entries(before.items))if(id!==target.id)assert.deepEqual(after.items[id].facets,item.facets,'unanswered kana facets remain intact');
  const a=after.games['kana-rain'],b=before.games['kana-rain'];for(const key of ['rows','best','katakanaUnlocked','journeyMixedUnlocked','sound','reducedEffects','syntheticRetained'])assert.deepEqual(a[key],b[key]);assert.deepEqual(a.accuracy.historical,b.accuracy.historical);
  return after;
}
async function offline(page,ctx,before,expectedInline){
  const delivered=requests.filter(r=>r.delivered).length;networkDown=true;await ctx.setOffline(true);await page.reload();await ready(page);assert.equal(await page.locator('script[data-game-runtime]').count()>0,expectedInline);preserved(before,await snapshot(page));
  const after=await play(page,before);await page.reload();await ready(page);preserved(after,await snapshot(page));assert.equal(requests.filter(r=>r.delivered).length,delivered,'offline server delivers no bytes');await assertNoReloadLoop(page);return after;
}
async function recover(page,ctx,old,before){
  networkDown=false;fault=null;served=candidate;await ctx.setOffline(false);await workerUpdate(page);await page.waitForFunction(async oldCache=>!(await caches.keys()).includes(oldCache),old.cache);await page.reload();await ready(page);
  assert.equal(await page.locator('#difficultySelect').count(),0);assert.equal(await page.locator('script[data-game-runtime]').count(),1);assert.equal(await page.evaluate(()=>!!KanaDifficulty.rain),true);preserved(before,await snapshot(page));
  const online=await play(page,before),restored=await offline(page,ctx,online,true);assert.equal(await page.evaluate(async()=>(await(await caches.open('partial-update-unrelated')).match('/sentinel'))?.text()),'unrelated cache retained');return restored;
}
async function failureCase(version,kind,mode,mobile=false){
  const old=baselineBuild(version),{page,ctx,before}=await open(old,{mobile}),name=version+'-'+kind+'-'+mode+(mobile?'-phone':'');
  try{
    served=candidate;const start=requests.length;
    const file=kind==='runtime'?'/assets/game-runtime.js':kind==='html'?'/index.html':'/kana-audio-bundle/audio/kyo.mp3';fault={file,mode};
    const response=await page.reload();
    if(kind==='html'&&mode==='503'){
      assert.equal(response.status(),503,'legacy worker exposes HTTP navigation failure rather than silently substituting HTML');assert.equal(await page.evaluate(()=>!!window.KanaRain),false);
      const copies=await disk(page);preserved(before,copies.journal);preserved(before,copies.indexedDB);
      // No script can repair a navigation error emitted by an already-installed
      // worker; the complete previous cache must still work when going offline.
      await offline(page,ctx,before,false);
    }else{
      await ready(page);
      const inline=kind!=='html';assert.equal(await page.locator('script[data-game-runtime]').count()>0,inline,'document executes its own supported runtime contract');
      assert.equal(await page.evaluate(()=>!!KanaDifficulty.rain),inline);assert.equal(await page.locator('#difficultySelect').count(),inline?0:1);
      assert.equal(await page.evaluate(()=>Object.hasOwn(KanaRain.settings,'difficulty')),!inline,'loaded runtime matches the document contract');
      await workerUpdate(page);assert.equal(await cachePresent(page,old.cache),true,'failed candidate install keeps the old complete cache');preserved(before,await snapshot(page));
      assert.ok(requests.slice(start).some(r=>r.file===file&&r.failed),'actual '+mode+' failure exercised at '+file);
      await assertNoReloadLoop(page);await page.screenshot({path:path.join(out,name+'-playable.png')});
      const played=await play(page,before);await offline(page,ctx,played,inline);
    }
    const retained=await snapshot(page),restored=await recover(page,ctx,old,retained);factsPreserved(before,restored);
    report.checks.push({name,passed:true,from:old.version,failure:{file,mode},legacyHttpNavigationError:kind==='html'&&mode==='503',onlineAndOfflineWrites:true,oldAttempts:before.attemptLedger.length,restoredAttempts:restored.attemptLedger.length});console.log('PASS '+name);
  }catch(error){await page.screenshot({path:path.join(out,name+'-failure.png')}).catch(()=>{});throw error;}finally{await close(ctx);}
}
async function futureGeneration(){
  const {page,ctx,before}=await open(candidate),next={...candidate,version:candidate.version+'-next-test',cache:candidate.cache+'-next-test',files:new Map(candidate.files)};
  let html=next.files.get('/index.html').toString();assert.match(html,/<script\b[^>]*data-game-runtime[^>]*>/);html=html.replace(/(<script\b[^>]*data-game-runtime[^>]*>)/,'$1\nwindow.__futureRuntime=true;');next.files.set('/index.html',Buffer.from(html));next.files.set('/sw.js',Buffer.from(next.files.get('/sw.js').toString().replace(candidate.cache,next.cache)));
  try{
    served=next;fault={file:'/index.html',mode:'503'};await page.reload();await ready(page);assert.equal(await page.evaluate(()=>window.__futureRuntime===true),false,'installed cache-first worker remains playable during an HTML HTTP failure');await workerUpdate(page);assert.equal(await cachePresent(page,candidate.cache),true);preserved(before,await snapshot(page));
    fault={file:'/kana-audio-bundle/audio/kyo.mp3',mode:'503'};await workerUpdate(page);await page.reload();await ready(page);assert.equal(await page.evaluate(()=>window.__futureRuntime===true),false,'interrupted install cannot replace the HTML/runtime generation');assert.equal(await cachePresent(page,candidate.cache),true);preserved(before,await snapshot(page));
    const played=await play(page,before);await offline(page,ctx,played,true);assert.equal(await page.evaluate(()=>window.__futureRuntime===true),false);
    networkDown=false;fault=null;served=next;await ctx.setOffline(false);await workerUpdate(page);await page.waitForFunction(async c=>!(await caches.keys()).includes(c),candidate.cache);await page.reload();await ready(page);assert.equal(await page.evaluate(()=>window.__futureRuntime===true),true,'complete next generation is adopted only after successful install');
    const saved=await snapshot(page);const after=await offline(page,ctx,saved,true);assert.equal(await page.evaluate(()=>window.__futureRuntime===true),true);await page.screenshot({path:path.join(out,'future-complete-offline.png')});
    report.checks.push({name:'new-worker-next-generation-is-atomic',passed:true,oldAttempts:before.attemptLedger.length,restoredAttempts:after.attemptLedger.length});console.log('PASS new-worker-next-generation-is-atomic');
  }catch(error){await page.screenshot({path:path.join(out,'future-failure.png')}).catch(()=>{});throw error;}finally{await close(ctx);}
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});candidate=currentBuild();
  const html=candidate.files.get('/index.html').toString(),inline=html.match(/<script\b[^>]*data-game-runtime[^>]*>([\s\S]*?)<\/script>/i);assert.ok(inline,'candidate contains its own atomic runtime');
  report.candidate={version:candidate.version,cache:candidate.cache,indexSha256:hash(candidate.files.get('/index.html')),inlineRuntimeSha256:hash(Buffer.from(inline[1])),compatibilityRuntimeSha256:hash(candidate.files.get('/assets/game-runtime.js'))};
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.mp3':'audio/mpeg','.png':'image/png','.webp':'image/webp'};
  server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname,file=name==='/'?'/index.html':name,failed=!!(fault&&file===fault.file),bytes=served.files.get(file),entry={file,version:served.version,failed,destination:req.headers['sec-fetch-dest'],delivered:!networkDown&&!failed&&!!bytes};requests.push(entry);
    if(networkDown||failed&&fault.mode==='tcp'){req.socket.destroy();return;}res.writeHead(failed?503:bytes?200:404,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(failed?'Deliberate test-only HTTP failure':bytes);
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_BROWSER_CHANNEL?{channel:process.env.PLAYWRIGHT_BROWSER_CHANNEL}:{})});
  for(const version of ['1.10.1','1.12.0','1.12.1'])if(!filter||filter===version)for(const [kind,mode]of [['runtime','tcp'],['runtime','503'],['html','tcp'],['html','503'],['mp3','503']])await failureCase(version,kind,mode);
  if(!filter||filter==='1.12.1')await failureCase('1.12.1','runtime','tcp',true);if(!filter||filter==='future')await futureGeneration();assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.outsideRequests,[]);report.passed=true;
})().catch(e=>{report.failure=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{for(const ctx of [...contexts])await close(ctx).catch(()=>{});await browser?.close();if(server)await new Promise(r=>server.close(r));report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));console.log((report.passed?'PASS':'FAIL')+' partial updates: '+report.checks.length+' scenarios.');});
