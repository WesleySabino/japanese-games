'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const origin='https://example.test';

function worker(cached,network=async()=>{throw new TypeError('Offline');}){
  const handlers={},matches=[];
  const context=vm.createContext({
    URL,Response,
    self:{location:{href:origin+'/sw.js'},addEventListener(type,handler){handlers[type]=handler;}},
    caches:{async open(){return {async match(key){matches.push(key);return cached;},async put(){}};}},
    fetch:network,
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../sw.js'),'utf8'),context);
  return {matches,request(url,mode='navigate'){
    let response;
    handlers.fetch({request:{method:'GET',url:origin+url,mode,redirect:mode==='navigate'?'manual':'follow'},respondWith(value){response=value;}});
    return response;
  }};
}

test('offline navigation can consume cached HTML redirected by canonical hosting URLs',async()=>{
  for(const [url,target] of [['/','/index.html'],['/about','/about.html'],['/art','/art.html']]){
    const cached=new Response('<h1>Offline game</h1>',{status:200,headers:{'content-type':'text/html','content-security-policy':"default-src 'self'"}});
    // Models cache.addAll following the host redirect from *.html to its canonical URL.
    Object.defineProperty(cached,'redirected',{value:true});
    const sw=worker(cached),response=await sw.request(url);
    assert.equal(sw.matches[0],origin+target);
    assert.equal(response.redirected,false,'navigation with manual redirects must receive an unredirected response');
    assert.equal(response.status,200);
    assert.equal(response.headers.get('content-type'),'text/html');
    assert.equal(response.headers.get('content-security-policy'),"default-src 'self'");
    assert.equal(await response.text(),'<h1>Offline game</h1>');
  }
});

test('offline script fallback retains the original cached response',async()=>{
  const cached=new Response('window.offline=true;');
  assert.equal(await worker(cached).request('/assets/game-runtime.js','cors'),cached);
});

test('online navigation preserves the current network response',async()=>{
  const cached=new Response('old'),fresh=new Response('latest');
  assert.equal(await worker(cached,async()=>fresh).request('/'),fresh);
});

test('offline cache misses remain visible failures instead of an unrelated fallback page',async()=>{
  await assert.rejects(worker(undefined).request('/unknown'),/Offline/);
});
