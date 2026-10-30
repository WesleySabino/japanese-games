const CACHE='kana-rain-v51-local-atomic-shell';
const BASE=new URL('./',self.location.href);
const url=p=>new URL(p,BASE).href;
// Public secondary pages still use the separate CSS; only the home page inlines it.
const SHELL=['index.html','about.html','art.html','privacy.html','assets/nihongo-analytics.js','assets/nihongo-analytics.css','src/style.css','manifest.webmanifest','assets/garden.webp','assets/spirit.webp','assets/drop.webp','assets/drop-stained.webp','assets/splash.webp','assets/ripple.webp','assets/icon.png','kana-audio-bundle/runtime-manifest.json'];
const SOURCE_SCRIPTS=['src/data.js','src/learner.js','src/audio.js','src/sfx.js','src/music.js','src/difficulty.js','src/novelty.js','src/game.js'];
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    // Read the entry document once before selecting the matching code. The fetch
    // handler maps root navigations to index.html, so a second './' copy is unused.
    await cache.add(url('index.html'));
    const html=await (await cache.match(url('index.html'))).text();
    // Atomic production HTML contains its current runtime. The stable external
    // bundle is retained only for older documents still loading in another tab.
    const scripts=html.includes('data-game-runtime')||html.includes('src="assets/game-runtime.js"')?['assets/game-runtime.js']:SOURCE_SCRIPTS;
    await cache.addAll([...SHELL.filter(p=>p!=='index.html'),...scripts].map(url));
    const manifest=await (await cache.match(url('kana-audio-bundle/runtime-manifest.json'))).json();
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
    const pageAliases=Object.fromEntries(['about','art','privacy'].map(name=>[url(name),url(name+'.html')]));
    const target=event.request.mode==='navigate'&&pageAliases[requested.href]?pageAliases[requested.href]:event.request.mode==='navigate'&&requested.pathname===BASE.pathname?url('index.html'):requested.href;
    const cached=await cache.match(target);
    // Installed HTML, CSS and code belong to one complete generation. An
    // update may replace them only through install + activate, never piecemeal.
    if(cached){
      if(event.request.mode==='navigate'&&cached.redirected)return new Response(cached.body,{status:cached.status,statusText:cached.statusText,headers:cached.headers});
      return cached;
    }
    const response=await fetch(event.request);
    if(response.ok)try{await cache.put(target,response.clone());}catch{}
    return response;
  })());
});
