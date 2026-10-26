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
  files.set(href('index.html'),Buffer.from(production?productionHtml('index.html'):fs.readFileSync(path.join(root,'index.html'))));
  let skipped=0;
  async function fetchFile(input){const url=String(input);requests.push(url);if(url===href(fail||'__none__')||!files.has(url))throw new Error('Unavailable: '+url);return new Response(files.get(url));}
  const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const entries=stores.get(name);return {
    async add(input){const key=String(input);entries.set(key,await fetchFile(key));},
    async addAll(inputs){const responses=await Promise.all(inputs.map(fetchFile));inputs.forEach((input,i)=>entries.set(String(input),responses[i]));},
    async match(input){return entries.get(String(input))?.clone();}
  };},async keys(){return [...stores.keys()];},async delete(name){removed.push(name);return stores.delete(name);}};
  const context=vm.createContext({URL,Response,caches,fetch:fetchFile,self:{location:{href:href('sw.js')},addEventListener(type,fn){handlers[type]=fn;},async skipWaiting(){skipped++;},clients:{async claim(){}}}});
  vm.runInContext(worker,context);const cacheName=vm.runInContext('CACHE',context);
  return {requests,stores,removed,files,cacheName,get skipped(){return skipped;},async install(){let done;handlers.install({waitUntil(promise){done=promise;}});await done;},async activate(){let done;handlers.activate({waitUntil(promise){done=promise;}});await done;}};
}
test('production installs one entry document, one runtime and complete shared assets/audio',async()=>{
  const h=setup(true,{fail:'src/learner.js'});await h.install();const entries=h.stores.get(h.cacheName);
  assert.equal(h.requests.filter(url=>url===href('index.html')).length,1);
  assert.equal(h.requests.filter(url=>url===origin).length,0);
  assert.equal(new Set(h.requests).size,h.requests.length,'each installed URL is requested once');
  for(const file of moduleFiles){assert.equal(entries.has(href(file)),false);assert.equal(h.requests.includes(href(file)),false);}
  for(const file of ['assets/game-runtime.js','src/style.css','assets/nihongo-analytics.css','assets/nihongo-analytics.js','about.html','art.html','privacy.html','assets/drop-stained.webp','assets/splash.webp','assets/ripple.webp'])assert(entries.has(href(file)),file+' available offline');
  assert.equal([...entries.keys()].filter(url=>url.endsWith('.mp3')).length,104);
  assert.equal(h.skipped,1);assert.deepEqual(h.removed,[],'install never removes the prior release');
  await h.activate();assert.deepEqual(h.removed,['kana-rain-previous']);assert(h.stores.has('unrelated-cache'));
});
test('source previews install their actual modules and do not request a production bundle',async()=>{
  const h=setup(false,{fail:'assets/game-runtime.js'});await h.install();const entries=h.stores.get(h.cacheName);
  for(const file of moduleFiles)assert(entries.has(href(file)),file+' cached for source preview');
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
