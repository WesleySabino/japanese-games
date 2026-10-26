'use strict';
// Real image decoding on disposable profiles; no personal history or browser is used.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const {productionPlan,productionHtml}=require('../scripts/build.cjs');
const game=path.resolve(__dirname,'..'),out=path.join(__dirname,'artifacts/effects');
const report={passed:false,checks:[],pageErrors:[],blockedRequests:[],contextsOpened:0,contextsClosed:0,browserClosed:false,serverClosed:false,userProfileAccess:false,syntheticProfilesOnly:true,serviceWorkers:'block'};
let browser,server,origin,currentPage;const contexts=new Set();
function check(name,evidence={}){report.checks.push({check:name,pass:true,...evidence});console.log('PASS '+name);}
function buildFiles(){
  const files=new Map(),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  for(const entry of productionPlan().entries){const expected=entry.generated!==undefined?Buffer.from(entry.generated):entry.file==='index.html'?Buffer.from(productionHtml(entry.file)):fs.readFileSync(entry.absolute),actual=fs.readFileSync(path.join(game,'dist',entry.file));assert.equal(hash(actual),hash(expected),'Rebuild stale dist/'+entry.file);files.set('/'+entry.file,actual);}
  return files;
}
async function open(options={}){
  const context=await browser.newContext({viewport:options.mobile?{width:390,height:844}:{width:1366,height:768},isMobile:!!options.mobile,hasTouch:!!options.mobile,serviceWorkers:'block'});contexts.add(context);report.contextsOpened++;
  await context.addCookies([{name:'ng_analytics_consent',value:'denied',url:origin,sameSite:'Lax'}]);
  await context.route('**/*',route=>{const req=route.request();if(new URL(req.url()).origin!==origin||!['GET','HEAD'].includes(req.method())){report.blockedRequests.push({method:req.method(),url:req.url()});return route.abort();}if(options.failImages&&/\/(?:drop|splash)\.webp$/.test(req.url()))return route.abort();return route.continue();});
  await context.addInitScript(({gate,legacy,hidden})=>{
    window.preparedImages=[];window.decodeEvents=[];window.releaseScene=()=>{};window.testHidden=hidden;
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.testHidden});
    const src=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src'),decode=HTMLImageElement.prototype.decode;
    Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,get:src.get,set(value){window.preparedImages.push(this);src.set.call(this,value);}});
    if(legacy){Object.defineProperty(HTMLImageElement.prototype,'decode',{configurable:true,value:undefined});window.requestIdleCallback=undefined;}
    else{
      const sceneGate=new Promise(resolve=>window.releaseScene=resolve);
      HTMLImageElement.prototype.decode=function(){const file=new URL(this.src).pathname.split('/').pop();window.decodeEvents.push({file,phase:'start'});const ready=gate&&['garden.webp','spirit.webp','drop.webp'].includes(file)?sceneGate:Promise.resolve();return ready.then(()=>decode.call(this)).then(()=>{window.decodeEvents.push({file,phase:'decoded'});},error=>{window.decodeEvents.push({file,phase:'failed'});throw error;});};
    }
  },{gate:!!options.gate,legacy:!!options.legacy,hidden:!!options.hidden});
  const page=await context.newPage();currentPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));await page.goto(origin+'/?all');await page.waitForFunction(()=>!!window.KanaRain);return page;
}
async function summary(page){return page.evaluate(()=>({images:preparedImages.map(image=>({file:new URL(image.src).pathname.split('/').pop(),complete:image.complete,width:image.naturalWidth,decoding:image.decoding,priority:image.fetchPriority})),events:decodeEvents}));}
async function close(page){const context=page.context();await context.close();contexts.delete(context);report.contextsClosed++;}
async function normal(){
  const page=await open({gate:true});await page.waitForFunction(()=>decodeEvents.length===3);
  let state=await summary(page);assert.deepEqual(state.images.map(i=>i.file).sort(),['drop.webp','garden.webp','spirit.webp']);
  await page.locator('#settingsBtn').click();await page.locator('#settingsDialog').waitFor({state:'visible'});await page.locator('#closeSettings').click();
  check('pending initial-scene decode does not block menu input or start feedback work');
  await page.evaluate(()=>{window.testHidden=true;document.dispatchEvent(new Event('visibilitychange'));window.releaseScene();});
  await page.waitForFunction(()=>decodeEvents.filter(e=>e.phase==='decoded').length===3);await page.waitForTimeout(250);
  assert.equal((await summary(page)).images.length,3);
  await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.testHidden=false;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(250);
  assert.equal((await summary(page)).images.length,3);
  await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await page.waitForFunction(()=>decodeEvents.filter(e=>e.phase==='decoded').length===6);
  state=await summary(page);const firstFeedback=state.events.findIndex(e=>['drop-stained.webp','splash.webp','ripple.webp'].includes(e.file));assert.equal(state.events.slice(0,firstFeedback).filter(e=>e.phase==='decoded').length,3);
  assert(state.images.every(i=>i.complete&&i.width>0&&i.decoding==='async'&&i.priority==='low'));assert.equal(new Set(state.images.map(i=>i.file)).size,6);
  check('same six images decode once, scene first; hidden/pagehide defer feedback and pageshow resumes');
  await page.locator('#startBtn').click();await page.locator('#skipCountdown').click();await page.waitForFunction(()=>KanaRain.state&&!KanaRain.state.paused);
  await page.locator('#answer').fill('zz');await page.locator('#answerForm').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));await page.waitForFunction(()=>!!document.querySelector('.drop.stained'));
  await page.evaluate(()=>{const input=document.getElementById('answer');input.value=KanaRain.accepted(KanaRain.state.drops[0])[0];document.getElementById('answerForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  await page.waitForFunction(()=>!!document.querySelector('.effect.splash'));await page.screenshot({path:path.join(out,'desktop-first-feedback.png')});
  await page.evaluate(()=>{const state=KanaRain.state;if(!state.drops.length){state.sinceSpawn=99999;}else state.drops[0].progress=.999;});
  await page.waitForFunction(()=>KanaRain.state.drops.length);await page.evaluate(()=>KanaRain.state.drops[0].progress=.999);await page.waitForFunction(()=>!!document.querySelector('.effect.ripple'));
  assert.equal((await summary(page)).events.filter(e=>e.phase==='start').length,6);assert.equal(await page.evaluate(()=>KanaRain.state.expirations),1);
  check('first error, correction splash and expiration reuse prepared images with unchanged outcomes');await close(page);
}
async function failures(){
  const page=await open({failImages:true});await page.waitForFunction(()=>preparedImages.length===6&&decodeEvents.filter(e=>e.phase==='decoded'||e.phase==='failed').length===6);
  const state=await summary(page);assert(state.events.some(e=>e.file==='drop.webp'&&e.phase==='failed'));assert(state.events.some(e=>e.file==='splash.webp'&&e.phase==='failed'));assert(state.events.some(e=>e.file==='ripple.webp'&&e.phase==='decoded'));
  await page.locator('#settingsBtn').click();await page.locator('#settingsDialog').waitFor({state:'visible'});await page.locator('#closeSettings').click();await page.locator('#startBtn').click();await page.locator('#skipCountdown').click();await page.waitForFunction(()=>!KanaRain.state.paused);assert.equal(await page.evaluate(()=>KanaRain.state.correct),0);
  check('unavailable scene/feedback images settle safely and do not block controls or gameplay');await close(page);
}
async function fallback(){
  const page=await open({legacy:true,mobile:true});await page.waitForFunction(()=>preparedImages.length===6&&preparedImages.every(i=>i.complete&&i.naturalWidth>0));assert.equal((await summary(page)).events.length,0);
  await page.locator('#startBtn').click();await page.locator('#skipCountdown').click();await page.waitForFunction(()=>KanaRain.state&&!KanaRain.state.paused);await page.screenshot({path:path.join(out,'mobile-fallback-play.png')});
  check('load-event/timer fallback works without decode or requestIdleCallback on phone layout');await close(page);
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});const files=buildFiles();server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname,file=files.get(pathname==='/'?'/index.html':pathname);if(!file){res.writeHead(404).end();return;}const ext=path.extname(pathname==='/'?'index.html':pathname),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.webmanifest':'application/manifest+json'}[ext]||'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache'});res.end(file);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_BROWSER_CHANNEL?{channel:process.env.PLAYWRIGHT_BROWSER_CHANNEL}:{})});await normal();await failures();await fallback();assert.deepEqual(report.pageErrors,[]);report.passed=true;
})().catch(async error=>{report.failure=error.stack;console.error(error);process.exitCode=1;if(currentPage)await currentPage.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}).finally(async()=>{for(const context of contexts){await context.close().catch(()=>{});report.contextsClosed++;}if(browser){await browser.close();report.browserClosed=true;}if(server){await new Promise(resolve=>server.close(resolve));report.serverClosed=true;}report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');if(report.passed)console.log('PASS: feedback image preparation; '+report.checks.length+' checks.');});
