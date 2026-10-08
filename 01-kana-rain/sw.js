const CACHE='kana-rain-v10-analytics-routes';
const BASE=new URL('./',self.location.href);
const url=p=>new URL(p,BASE).href;
const SHELL=['./','index.html','about.html','art.html','privacy.html','assets/nihongo-analytics.js','assets/nihongo-analytics.css','src/style.css','src/data.js','src/learner.js','src/audio.js','src/sfx.js','src/difficulty.js','src/game.js','manifest.webmanifest','assets/garden.webp','assets/spirit.webp','assets/drop.webp','assets/drop-stained.webp','assets/splash.webp','assets/ripple.webp','assets/icon.png','kana-audio-bundle/manifest.json'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(SHELL.map(url));
    const manifest=await (await cache.match(url('kana-audio-bundle/manifest.json'))).json();
    const recordings=[...new Set(Object.values(manifest.byKana))];
    // Keep download concurrency bounded on mobile.
    for(let i=0;i<recordings.length;i+=8)await cache.addAll(recordings.slice(i,i+8).map(p=>url('kana-audio-bundle/'+p)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('kana-rain-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==BASE.origin)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    const requested=new URL(event.request.url);
    if(event.request.mode==='navigate'){requested.search='';requested.hash='';}
    // Cache each destination separately so visiting the artwork cannot replace the offline game.
    const pageAliases={'/about':'about.html','/art':'art.html','/privacy':'privacy.html'};
    const target=event.request.mode==='navigate'&&pageAliases[requested.pathname]?url(pageAliases[requested.pathname]):event.request.mode==='navigate'&&requested.pathname===BASE.pathname?url('index.html'):requested.href;
    const cached=await cache.match(target);
    if(/\.(webp|png|mp3)$/.test(target)&&cached)return cached;
    try{
      const response=await fetch(event.request);
      if(response.ok)await cache.put(target,response.clone());
      return response;
    }catch(error){if(cached)return cached;throw error;}
  })());
});
