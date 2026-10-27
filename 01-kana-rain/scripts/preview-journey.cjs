'use strict';
// Local-only demonstration. This script and its progress endpoint are never built.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const args=process.argv.slice(2);
function value(flag){const i=args.indexOf(flag);return i<0?null:args[i+1];}
if(args.some((v,i)=>i%2===0&&!['--progress','--port'].includes(v))||args.length%2)throw Error('Usage: node scripts/preview-journey.cjs --progress <local JSON export> [--port 4198]');
const file=value('--progress');if(!file)throw Error('A local progress export is required.');
const progress=fs.readFileSync(path.resolve(file),'utf8'),saved=JSON.parse(progress);
if(![1,2].includes(saved.version)||!saved.items||!saved.games||Buffer.byteLength(progress)>32*1024*1024)throw Error('Choose a Kana Rain export of at most 32 MiB.');
const id=crypto.createHash('sha256').update(progress).digest('hex');
const port=Number(value('--port')||4198);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid preview port.');
const plan=require('./build.cjs').productionPlan(),allowed=new Map(plan.entries.map(e=>['/'+e.file,e]));
const bootstrap=`(async()=>{
  const until=async check=>{for(let i=0;i<1200;i++){if(check())return;await new Promise(r=>setTimeout(r,50));}throw Error('Preview preparation timed out.');};
  await until(()=>window.KanaRain);
  const badge=document.createElement('aside');badge.id='journeyPreviewStatus';badge.textContent='Prévia local · cópia do seu progresso';document.body.append(badge);
  const style=document.createElement('style');style.textContent='#journeyPreviewStatus{position:fixed;top:6px;right:8px;z-index:90;font:11px/1.3 system-ui;color:#fff0c3;background:#082c32;padding:5px 9px;border:1px solid #b59e65;border-radius:3px;max-width:80vw}.is-playing #journeyPreviewStatus{display:none}';document.head.append(style);
  try{
    const key='journey-preview:${id}';
    if(!localStorage.getItem(key)){
      badge.textContent='Preparando cópia local do progresso…';
      const text=await (await fetch('/__preview__/progress.json',{cache:'no-store'})).text();
      const result=await Learner.importProgress(text);
      if(!result.saved||!result.indexedDB)throw Error('A cópia não foi confirmada no armazenamento local.');
      localStorage.setItem(key,'saved');location.reload();return;
    }
    const mode=document.getElementById('mode');mode.value='journey';mode.dispatchEvent(new Event('change'));
    badge.dataset.ready='true';
  }catch(e){badge.textContent='Prévia: '+e.message;badge.dataset.error='true';}
})();`;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  const origin='http://127.0.0.1:'+port;
  if(req.headers.host!=='127.0.0.1:'+port||req.headers.origin&&req.headers.origin!==origin||!['GET','HEAD'].includes(req.method)){res.writeHead(403).end();return;}
  let name;try{name=decodeURIComponent(new URL(req.url,origin).pathname);}catch{res.writeHead(400).end();return;}
  if(name==='/sw.js'){res.writeHead(404,{'Cache-Control':'no-store'}).end();return;}
  let bytes,type;
  if(name==='/__preview__/bootstrap.js'){bytes=bootstrap;type=mime['.js'];}
  else if(name==='/__preview__/progress.json'){bytes=progress;type=mime['.json'];}
  else{
    const entry=allowed.get(name==='/'?'/index.html':name);
    if(!entry){res.writeHead(404).end();return;}
    bytes=entry.generated??fs.readFileSync(entry.absolute);type=mime[path.extname(entry.file)]||'application/octet-stream';
    if(entry.file==='index.html')bytes=String(bytes).replace('</head>','<script defer src="/__preview__/bootstrap.js"></script></head>');
  }
  res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','Cross-Origin-Resource-Policy':'same-origin','X-Content-Type-Options':'nosniff','Set-Cookie':'ng_analytics_consent=denied; SameSite=Strict; Path=/'});
  res.end(req.method==='HEAD'?undefined:bytes);
});
server.listen(port,'127.0.0.1',()=>console.log('Journey preview: http://127.0.0.1:'+port+'/ (separate local copy; production untouched)'));
