const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.md':'text/plain; charset=utf-8'};
const server = http.createServer((req,res) => {
  let target;
  try { target = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname)); }
  catch { res.writeHead(400).end(); return; }
  if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (target === root) target = path.join(root,'index.html');
  fs.stat(target,(err,stat) => {
    if(err || !stat.isFile()) {res.writeHead(404).end('Not found');return;}
    res.writeHead(200, {'Content-Type':types[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-cache'});
    if(req.method==='HEAD') res.end(); else fs.createReadStream(target).pipe(res);
  });
});
server.listen(Number(process.env.PORT || 4173),'127.0.0.1',() => console.log('Kana Rain: http://127.0.0.1:'+(process.env.PORT || 4173)));
