'use strict';
// Diagnostic, not a timing gate: native storage, isolated profiles, synthetic history only.
// Never reads personal exports, opens a user profile, or contacts production.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createHash } = require('node:crypto');
const { chromium } = require('playwright');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
assert.ok(process.argv.slice(2).every(arg => arg === '--baseline'), 'Use --baseline for the pinned 1.11.1 learner, or no arguments for current code');
const mode = process.argv.includes('--baseline') ? 'baseline' : 'candidate';
const out = path.join(__dirname, 'artifacts/save-performance', mode);
const learnerPath = path.join(__dirname, mode === 'baseline' ? 'fixtures/learner-1.11.1.js' : '../src/learner.js');
const learnerSource = fs.readFileSync(learnerPath);
if (mode === 'baseline') assert.equal(hash(learnerSource.toString('utf8').replace(/\r\n/g, '\n')), 'cdeac72f7937c24bcc0aabb5308d1313afd40bda2830604a406ee21855e91a72', 'Pinned baseline fixture must match release 1.11.1');
const PRIMARY = 'jp-learner-v1:protected:v1';
const samples = Number(process.env.KANA_SAVE_BENCH_SAMPLES || 7);
assert.ok(Number.isInteger(samples) && samples >= 3 && samples <= 30, 'Use 3–30 measured samples');
const sizes = [{ name: 'small', attempts: 100, exposures: 1000 }, { name: 'medium', attempts: 1000, exposures: 10000 }, { name: 'large', attempts: 5000, exposures: 50000 }];
const report = { startedAt: new Date().toISOString(), passed: false, diagnosticOnly: true, syntheticProgressOnly: true,
  productionAccess: false, userProfileAccess: false, personalExportAccess: false, serviceWorkers: 'blocked',
  mode, learnerSHA256: hash(learnerSource), samplesPerTab: samples, warmupSamplesPerTab: 1, cpuThrottling: false,
  environment: { platform: process.platform, architecture: process.arch, node: process.version, browser: null },
  notes: [
    'Native headless Chromium on this host; these are not measurements on a real phone or a guarantee of game FPS.',
    'Learner-only localhost pages isolate persistence from gameplay rendering and music. Two-tab runs include native storage-event reconciliation and Web Lock contention.',
    'The first requestAnimationFrame callback is a frame scheduling opportunity, not an input-to-paint measurement.',
    'One warm-up response per tab is retained but excluded from timing percentiles. Seven default samples give descriptive percentiles, not population estimates.',
    'LocalStorage and JSON method timing wrappers add small measurement overhead. IndexedDB, Web Locks, quota and storage events remain native. Two-tab intervals can include automatic reconciliation flushes as well as the requested commit.',
    'Large histories may naturally exceed localStorage quota. Backend and failed writes are reported; IndexedDB must still retain all facts.',
    'No timing assertion passes/fails this diagnostic; only isolation, cleanup and retained immutable facts are asserted.'
  ], scenarios: [], outsideRequests: [], pageErrors: [], contextsOpened: 0, contextsClosed: 0, cleanupErrors: [] };
const contexts = new Set();
let browser, server, origin;
function fixture(config) {
  const created = 1700000000000, items = ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ', 'ア', 'イ', 'ウ', 'エ', 'オ'];
  const data = { version: 2, created, updatedAt: created + config.exposures * 1000, sequence: config.attempts + config.exposures,
    items: {}, errorLog: [], reveals: {}, games: { 'kana-rain': { rows: { hiragana: 27, katakana: 9 }, katakanaUnlocked: true,
      sound: false, reducedEffects: false, best: { retainedHistorical: 200 }, accuracy: {}, featuresIntro: {}, sessions: 20, diagnosticMarker: 'synthetic-only' } },
    attemptLedger: [], exposureLedger: [], _sync: { epoch: { id: 'save-performance-synthetic', at: 0 }, applied: {} } };
  for (let i = 0; i < config.attempts; i++) {
    const id = 'kana:' + items[i % items.length], correct = i % 7 !== 0;
    data.attemptLedger.push({ attemptId: 'seed:attempt:' + i, sessionId: 'synthetic:session:' + Math.floor(i / 100), roundId: 'synthetic:round:' + i,
      itemId: id, facet: 'form→sound', responseFormat: 'romaji', inputMethod: i % 3 ? 'typing' : 'composer', firstAttempt: true,
      assistance: i % 4 === 0, assistanceReasons: i % 4 === 0 ? ['recent-audio'] : [], outcome: correct ? 'correct' : 'incorrect', correct,
      reason: correct ? 'accepted' : 'unrecognized-response', at: created + i * 10000, gameId: 'kana-rain', response: correct ? 'a' : 'x',
      chosenItemId: null, submittedItemId: null, candidateItemIds: [], firstResponseMs: 1100, inputActiveMs: 600, displayActiveMs: 1100, waitMs: 500, delaySinceExposureMs: 1000 });
  }
  for (let i = 0; i < config.exposures; i++) data.exposureLedger.push({ exposureId: 'seed:exposure:' + i, itemId: 'kana:' + items[i % items.length],
    facet: 'form→sound', at: created + i * 1000, reason: i % 2 ? 'audio' : 'reference', gameId: 'kana-rain', sessionId: 'synthetic:session:' + Math.floor(i / 1000), roundId: null });
  return data;
}
const client = `
window.saveBenchmark = { readyMs: null, errors: [], measurements: [], active: null };
const bench = window.saveBenchmark, stringify = JSON.stringify, parse = JSON.parse, nativeSet = Storage.prototype.setItem;
JSON.stringify = function(...args) { const t = performance.now(); try { return stringify.apply(this,args); } finally { if(bench.active){bench.active.stringifyMs+=performance.now()-t;bench.active.stringifyCalls++;} } };
JSON.parse = function(...args) { const t = performance.now(); try { return parse.apply(this,args); } finally { if(bench.active){bench.active.parseMs+=performance.now()-t;bench.active.parseCalls++;} } };
Storage.prototype.setItem = function(key,value) { const t=performance.now();let ok=false;try{const r=nativeSet.call(this,key,value);ok=true;return r;}finally{if(bench.active){bench.active.localWriteMs+=performance.now()-t;bench.active.localWriteCalls++;bench.active.localWriteAttemptedChars+=String(value).length;if(!ok)bench.active.localWriteFailures++;}} };
const observer = PerformanceObserver.supportedEntryTypes.includes('longtask') ? new PerformanceObserver(list=>{for(const e of list.getEntries())bench.longTasks.push({start:e.startTime,duration:e.duration});}) : null;
bench.longTasks=[];observer?.observe({type:'longtask',buffered:true});
window.measureSave = async function(label,warmup=false) {
  const m={label,warmup,stringifyMs:0,stringifyCalls:0,parseMs:0,parseCalls:0,localWriteMs:0,localWriteCalls:0,localWriteFailures:0,localWriteAttemptedChars:0};
  const at=performance.now(), stamp=Date.now(), item='kana:あ';bench.active=m;
  Learner.recordExposure(item,'form→sound',{exposureId:'sample:exposure:'+label,now:stamp,reason:'reference',gameId:'kana-rain',deferSave:true});
  Learner.record(item,'form→sound',{attemptId:'sample:attempt:'+label,sessionId:'synthetic:measured',roundId:'sample:round:'+label,now:stamp,gameId:'kana-rain',correct:true,firstAttempt:true,assistance:false,response:'a',responseFormat:'romaji',inputMethod:'typing',firstResponseMs:900,deferSave:true});
  m.recordSyncMs=performance.now()-at;const call=performance.now(), pending=Learner.flush();m.flushCallSyncMs=performance.now()-call;m.recordAndJournalSyncMs=performance.now()-at;
  const nextFrame=new Promise(resolve=>requestAnimationFrame(()=>resolve(performance.now()-at)));
  const status=await pending;m.commitWallMs=performance.now()-at;bench.active=null;m.nextRafOpportunityMs=await nextFrame;
  await new Promise(resolve=>setTimeout(resolve,0));m.longTasks=bench.longTasks.filter(e=>e.start>=at&&e.start<=at+m.commitWallMs);m.backend=status.backend;m.saved=status.saved;
  bench.measurements.push(m);return m;
};
`;
async function serve() {
  const html = Buffer.from('<!doctype html><title>Synthetic save diagnostic</title><button id="record">Synthetic response</button><script>' + client + '</script><script>const boot=performance.now();</script><script src="/learner.js"></script><script>Learner.ready.then(()=>saveBenchmark.readyMs=performance.now()-boot);</script>');
  server = http.createServer((req, res) => {
    const p = new URL(req.url, 'http://localhost').pathname;
    const body = p === '/learner.js' ? learnerSource : p === '/benchmark.html' ? html : p === '/blank.html' ? Buffer.from('<!doctype html><title>Disposable seed page</title>') : null;
    res.writeHead(body ? 200 : 404, { 'Content-Type': p.endsWith('.js') ? 'text/javascript' : 'text/html', 'Cache-Control': 'no-store' }); res.end(body);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  origin = 'http://127.0.0.1:' + server.address().port;
}
async function context() {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1366, height: 768 } });contexts.add(ctx);report.contextsOpened++;
  await ctx.route('**/*', route => { const req=route.request(),u=new URL(req.url());if(u.origin===origin&&req.method()==='GET')return route.continue();report.outsideRequests.push({url:u.href,method:req.method()});return route.abort(); });
  ctx.on('page', page => { page.setDefaultTimeout(120000);page.on('pageerror', error => report.pageErrors.push(error.message)); });return ctx;
}
async function close(ctx) { await ctx.close();if(contexts.delete(ctx))report.contextsClosed++; }
async function seed(ctx,data) {
  const page=await ctx.newPage();await page.goto(origin+'/blank.html');
  const local = await page.evaluate(async ({ PRIMARY, data }) => {
    let localSeeded=true,error=null;try{localStorage.setItem(PRIMARY,JSON.stringify(data));}catch(e){localSeeded=false;error=e.name;}
    await new Promise((resolve,reject)=>{const r=indexedDB.open('kana-garden',1);r.onupgradeneeded=()=>r.result.createObjectStore('learner');r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('learner','readwrite');tx.objectStore('learner').put(data,PRIMARY);tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};});
    return {localSeeded,error};
  },{PRIMARY,data});await page.close();return local;
}
async function open(ctx) {
  const page=await ctx.newPage();const t=performance.now();await page.goto(origin+'/benchmark.html');await page.waitForFunction(()=>saveBenchmark.readyMs!==null);return {page,readyMs:await page.evaluate(()=>saveBenchmark.readyMs),navigationAndReadyWallMs:performance.now()-t};
}
async function proof(page, config, expected, source) {
  const result=await page.evaluate(async ({PRIMARY,expected,source})=>{
    const data=source==='idb'?await new Promise((resolve,reject)=>{const r=indexedDB.open('kana-garden',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('learner'),g=tx.objectStore('learner').get(PRIMARY);g.onsuccess=()=>resolve(g.result);g.onerror=()=>reject(g.error);tx.oncomplete=()=>db.close();};}):JSON.parse(Learner.export());
    const digest=async x=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(x))))].map(x=>x.toString(16).padStart(2,'0')).join('');
    const attempts=data.attemptLedger,exposures=data.exposureLedger,ids=new Set(attempts.map(e=>e.attemptId)),expIds=new Set(exposures.map(e=>e.exposureId));
    return {attempts:attempts.length,exposures:exposures.length,uniqueAttempts:ids.size,uniqueExposures:expIds.size,allAdded:expected.every(id=>ids.has('sample:attempt:'+id)&&expIds.has('sample:exposure:'+id)),seedAttemptHash:await digest(attempts.filter(e=>e.attemptId.startsWith('seed:'))),seedExposureHash:await digest(exposures.filter(e=>e.exposureId.startsWith('seed:'))),settings:data.games['kana-rain'],backend:window.Learner?.persistenceStatus().backend};
  },{PRIMARY,expected,source});
  const baseline=fixture(config);assert.equal(result.seedAttemptHash,hash(JSON.stringify(baseline.attemptLedger)));assert.equal(result.seedExposureHash,hash(JSON.stringify(baseline.exposureLedger)));
  assert.equal(result.attempts,config.attempts+expected.length);assert.equal(result.exposures,config.exposures+expected.length);assert.equal(result.uniqueAttempts,result.attempts);assert.equal(result.uniqueExposures,result.exposures);assert.equal(result.allAdded,true);
  assert.deepEqual(result.settings,baseline.games['kana-rain']);return result;
}
function summary(rows) {
  const measured=rows.filter(r=>!r.warmup),stats={samples:measured.length};
  for(const key of ['recordSyncMs','flushCallSyncMs','recordAndJournalSyncMs','commitWallMs','nextRafOpportunityMs','stringifyMs','parseMs','localWriteMs']){const sorted=measured.map(r=>r[key]).sort((a,b)=>a-b),pick=p=>sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)];stats[key]={p50:pick(.5),p95:pick(.95),max:sorted.at(-1)};}
  stats.localWriteFailures=measured.reduce((n,r)=>n+r.localWriteFailures,0);stats.backends=[...new Set(measured.map(r=>r.backend))];stats.longTaskCount=measured.reduce((n,r)=>n+r.longTasks.length,0);stats.longTaskTotalMs=measured.reduce((n,r)=>n+r.longTasks.reduce((n,e)=>n+e.duration,0),0);return stats;
}
async function scenario(config,tabs) {
  console.log('RUN '+config.name+' '+tabs+' tab(s)');const ctx=await context(),data=fixture(config),entry={size:config.name,tabs,initialAttempts:config.attempts,initialExposures:config.exposures,seedJSONBytes:Buffer.byteLength(JSON.stringify(data)),rows:[],loads:[]};report.scenarios.push(entry);
  try{
    entry.seedStorage=await seed(ctx,data);const first=await open(ctx),a=first.page;entry.loads.push({tab:'a',readyMs:first.readyMs,navigationAndReadyWallMs:first.navigationAndReadyWallMs});let b;
    if(tabs===2){const second=await open(ctx);b=second.page;entry.loads.push({tab:'b',readyMs:second.readyMs,navigationAndReadyWallMs:second.navigationAndReadyWallMs});}
    const expected=[];
    for(let i=-1;i<samples;i++){
      const labels=['a'+i,...(b?['b'+i]:[])].map(label=>config.name+'-'+tabs+'-'+label);expected.push(...labels);
      const measured=await Promise.all([a,...(b?[b]:[])].map((page,index)=>page.evaluate(({label,warmup})=>measureSave(label,warmup),{label:labels[index],warmup:i<0})));
      for(const row of measured){assert.equal(row.saved,true,'Native journal or IndexedDB retains each response');entry.rows.push(row);}
    }
    if(b){
      const label=config.name+'-'+tabs+'-closing';expected.push(label);
      entry.pendingClose=await b.evaluate(label=>{Learner.recordExposure('kana:あ','form→sound',{exposureId:'sample:exposure:'+label,reason:'reference',gameId:'kana-rain',deferSave:true});Learner.record('kana:あ','form→sound',{attemptId:'sample:attempt:'+label,correct:true,firstAttempt:true,assistance:false,gameId:'kana-rain',deferSave:true});const start=performance.now();window.pendingCloseSave=Learner.flush();return {flushCallSyncMs:performance.now()-start,pendingJournalPresent:Object.keys(localStorage).some(k=>k.startsWith('jp-learner-v1:pending:')&&localStorage.getItem(k).includes('sample:attempt:'+label))};},label);
      assert.equal(entry.pendingClose.pendingJournalPresent,true);await b.close();await a.evaluate(()=>Learner.flush());
    }
    entry.diskProof=await proof(a,config,expected,'idb');
    entry.export=await a.evaluate(()=>{const t=performance.now(),text=Learner.export();return {ms:performance.now()-t,bytes:new TextEncoder().encode(text).length};});
    const reloadStart=performance.now();await a.reload();await a.waitForFunction(()=>saveBenchmark.readyMs!==null);entry.reload={readyMs:await a.evaluate(()=>saveBenchmark.readyMs),navigationAndReadyWallMs:performance.now()-reloadStart};
    entry.reloadProof=await proof(a,config,expected,'memory');entry.summary=summary(entry.rows);entry.passed=true;console.log('PASS '+config.name+' '+tabs+' tab(s) '+JSON.stringify(entry.summary));
  }finally{await close(ctx);}
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await serve();const channel=process.env.PLAYWRIGHT_BROWSER_CHANNEL;
  browser=await chromium.launch({headless:true,...(channel?{channel}:{})});report.environment.browser=browser.version();
  for(const config of sizes)for(const tabs of [1,2])await scenario(config,tabs);
  assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.outsideRequests,[]);assert.equal(hash(fs.readFileSync(learnerPath)),report.learnerSHA256,'Measured persistence source remained unchanged');report.passed=true;
})().catch(error=>{report.failure={message:error.message,stack:error.stack};console.error(error);process.exitCode=1;}).finally(async()=>{
  for(const ctx of contexts)try{await close(ctx);}catch(e){report.cleanupErrors.push(e.message);}
  if(browser)try{await browser.close();report.browserClosed=true;}catch(e){report.cleanupErrors.push(e.message);}
  if(server)try{await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));report.serverClosed=true;}catch(e){report.cleanupErrors.push(e.message);}
  report.finishedAt=new Date().toISOString();if(report.cleanupErrors.length){report.passed=false;process.exitCode=1;}
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log('Save performance diagnostic '+(report.passed?'PASS':'FAIL')+'; '+path.join(out,'verification.json'));
});
