'use strict';
// Execute the real worker's install handler with deterministic CacheStorage/network
// doubles. Native cache activation and offline playback are covered by test:update.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const {productionPlan,productionHtml}=require('../scripts/build.cjs');
const origin='https://cache-test.invalid/rain/',href=file=>new URL(file,origin).href;
const moduleFiles=['src/data.js','src/learner.js','src/audio.js','src/sfx.js','src/music.js','src/difficulty.js','src/novelty.js','src/game.js'];
function setup(production,{fail}={}){
  const handlers={},requests=[],removed=[],stores=new Map([['kana-rain-previous',new Map([['sentinel','previous release']])],['unrelated-cache',new Map([['sentinel','unrelated data']])]]);
  const files=new Map(productionPlan().entries.map(e=>[href(e.file),e.generated!==undefined?Buffer.from(e.generated):fs.readFileSync(e.absolute)]));
  if(!production)for(const file of [...moduleFiles,'src/style.css'])files.set(href(file),fs.readFileSync(path.join(root,file)));
  files.set(href('index.html'),Buffer.from(production?productionHtml('index.html'):fs.readFileSync(path.join(root,'index.html'))));
  let skipped=0;
  async function fetchFile(input){const url=typeof input==='string'?input:input.url;requests.push(url);if(url===href(fail||'__none__')||!files.has(url))throw new Error('Unavailable: '+url);return new Response(files.get(url));}
  const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const entries=stores.get(name);return {
    async add(input){const key=String(input);entries.set(key,await fetchFile(key));},
    async addAll(inputs){const responses=await Promise.all(inputs.map(fetchFile));inputs.forEach((input,i)=>entries.set(String(input),responses[i]));},
    async put(input,response){entries.set(String(input),response.clone());},
    async match(input){const saved=entries.get(String(input));if(!saved)return;const result=saved.clone();if(saved.redirected)Object.defineProperty(result,'redirected',{value:true});return result;}
  };},async keys(){return [...stores.keys()];},async delete(name){removed.push(name);return stores.delete(name);}};
  const context=vm.createContext({URL,Response,caches,fetch:fetchFile,self:{location:{href:href('sw.js')},addEventListener(type,fn){handlers[type]=fn;},async skipWaiting(){skipped++;},clients:{async claim(){}}}});
  vm.runInContext(worker,context);const cacheName=vm.runInContext('CACHE',context);
  return {requests,stores,removed,files,cacheName,get skipped(){return skipped;},async install(){let done;handlers.install({waitUntil(promise){done=promise;}});await done;},async activate(){let done;handlers.activate({waitUntil(promise){done=promise;}});await done;},async request(file,{navigate=false}={}){let response;handlers.fetch({request:{url:href(file),method:'GET',mode:navigate?'navigate':'cors'},respondWith(promise){response=promise;}});return response;}};
}
test('production installs one atomic entry document, legacy compatibility runtime and complete shared assets/audio',async()=>{
  const h=setup(true);await h.install();const entries=h.stores.get(h.cacheName);
  assert.match(await entries.get(href('index.html')).clone().text(),/<script data-game-runtime>/);
  assert.equal(h.requests.filter(url=>url===href('index.html')).length,1);
  assert.equal(h.requests.filter(url=>url===origin).length,0);
  assert.equal(new Set(h.requests).size,h.requests.length,'each installed URL is requested once');
  for(const file of moduleFiles){assert.equal(entries.has(href(file)),false,'production never caches unused source copies');assert.equal(h.requests.includes(href(file)),false);}
  for(const file of ['assets/game-runtime.js','src/style.css','assets/nihongo-analytics.css','assets/nihongo-analytics.js','about.html','art.html','privacy.html','assets/drop-stained.webp','assets/splash.webp','assets/ripple.webp'])assert(entries.has(href(file)),file+' available offline');
  assert.equal([...entries.keys()].filter(url=>url.endsWith('.mp3')).length,104);
  assert.equal(h.skipped,1);assert.deepEqual(h.removed,[],'install never removes the prior release');
  await h.activate();assert.deepEqual(h.removed,['kana-rain-previous']);assert(h.stores.has('unrelated-cache'));
});
test('source previews install their actual modules and do not request a production bundle',async()=>{
  const h=setup(false,{fail:'assets/game-runtime.js'});await h.install();const entries=h.stores.get(h.cacheName);
  for(const file of moduleFiles){assert(entries.has(href(file)),file+' cached for source preview');assert.equal(await entries.get(href(file)).clone().text(),fs.readFileSync(path.join(root,file),'utf8'),'source preview uses current working code');}
  assert.equal(entries.has(href('assets/game-runtime.js')),false);
  assert.equal(new Set(h.requests).size,h.requests.length);assert.equal(h.skipped,1);
  assert.equal([...entries.keys()].filter(url=>url.endsWith('.mp3')).length,104);
});
for(const [name,production,fail] of [['entry document',true,'index.html'],['production runtime',true,'assets/game-runtime.js'],['source module',false,'src/learner.js'],['recording',true,'kana-audio-bundle/audio/kyo.mp3']]){
  test('failed '+name+' install retains previous and unrelated caches without activation',async()=>{
    const h=setup(production,{fail});await assert.rejects(h.install(),/Unavailable/);assert.equal(h.skipped,0);assert.deepEqual(h.removed,[]);
    assert.equal(h.stores.get('kana-rain-previous').get('sentinel'),'previous release');assert.equal(h.stores.get('unrelated-cache').get('sentinel'),'unrelated data');
  });
}

for(const production of [true,false])test((production?'production':'source')+' installed shell never mixes in newer network HTML, code or CSS',async()=>{
  const h=setup(production);await h.install();const before=h.requests.length;
  const files=['index.html',production?'assets/game-runtime.js':'src/game.js','src/style.css','about.html'];
  for(const file of files){const expected=await h.stores.get(h.cacheName).get(href(file)).clone().text();h.files.set(href(file),Buffer.from('future incomplete generation'));assert.equal(await(await h.request(file,{navigate:file.endsWith('.html')})).text(),expected,file+' stays in the installed generation');}
  assert.equal(h.requests.length,before,'all installed shell responses are cache-first');
  assert.equal(await(await h.request('',{navigate:true})).text(),await h.stores.get(h.cacheName).get(href('index.html')).clone().text(),'root navigation shares the same installed entry');
  assert.equal(await(await h.request('about',{navigate:true})).text(),await h.stores.get(h.cacheName).get(href('about.html')).clone().text(),'page aliases stay separate from the game');
});

test('cached redirected entry remains a usable navigation response without changing its document',async()=>{
  const h=setup(true);await h.install();const saved=new Response('<!doctype html><title>Installed garden</title>',{status:200,headers:{'Content-Type':'text/html'}});Object.defineProperty(saved,'redirected',{value:true});h.stores.get(h.cacheName).set(href('index.html'),saved);
  const response=await h.request('',{navigate:true});assert.equal(response.redirected,false);assert.equal(response.status,200);assert.equal(response.headers.get('Content-Type'),'text/html');assert.equal(await response.text(),'<!doctype html><title>Installed garden</title>');
});
