// A static production build. Keep this allowlist explicit so private working files stay out.
'use strict';
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..'),rootReal=fs.realpathSync(root),output=path.resolve(root,'dist');
const ROOT_FILES=['index.html','about.html','robots.txt','sitemap.xml','art.html','privacy.html','manifest.webmanifest','sw.js'];
const SOURCE_FILES=['src/style.css','src/data.js','src/learner.js','src/audio.js','src/sfx.js','src/music.js','src/difficulty.js','src/novelty.js','src/game.js','assets/nihongo-analytics.js','assets/nihongo-analytics.css'];
const CORE_FILES=SOURCE_FILES.filter(file=>file.startsWith('src/')&&file.endsWith('.js'));
const RUNTIME_FILE='assets/game-runtime.js';
const IMAGE_FILES=[
  'assets/garden.webp','assets/social-garden.png','assets/spirit.webp','assets/drop.webp','assets/drop-stained.webp',
  'assets/splash.webp','assets/ripple.webp','assets/icon.png',
  'assets/concepts/visual-development.png','assets/concepts/garden-mood.png',
  'assets/spirit-atlas.png','assets/water-atlas.png'
];
const AUDIO_METADATA=[
  'kana-audio-bundle/runtime-manifest.json','kana-audio-bundle/manifest.json','kana-audio-bundle/original-manifest.json',
  'kana-audio-bundle/LICENSE-AUDIO.txt','kana-audio-bundle/LICENSE-MIT.txt',
  'kana-audio-bundle/PROVENANCE.md'
];
// The menu music is synthesized by src/music.js; these document it like the recordings.
const MUSIC_METADATA=['music/LICENSE-MUSIC.txt','music/PROVENANCE.md'];
const origin='https://local-build.invalid/';

function inside(base,file){
  const relative=path.relative(base,file);
  return relative!==''&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep);
}
function sourceFile(file){
  const absolute=path.resolve(root,file);
  if(!inside(root,absolute))throw new Error('Source path leaves the game directory: '+file);
  const stat=fs.lstatSync(absolute);
  if(!stat.isFile()||stat.isSymbolicLink())throw new Error('Required source must be a regular file: '+file);
  if(!inside(rootReal,fs.realpathSync(absolute)))throw new Error('Source resolves outside the game directory: '+file);
  return {absolute,bytes:stat.size};
}
function read(file){return fs.readFileSync(sourceFile(file).absolute,'utf8');}
function localReference(raw,from){
  const value=raw.trim().replace(/&amp;/gi,'&');
  if(!value||/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value))return null;
  const url=new URL(value,origin+from);
  if(url.origin!==new URL(origin).origin)return null;
  let file=decodeURIComponent(url.pathname).replace(/^\/+/,'');
  if(file.endsWith('/')||!file)file+='index.html';
  if(file.includes('\0'))throw new Error('Invalid local reference in '+from);
  return file;
}
function validateReference(raw,from,allowed){
  const file=localReference(raw,from);
  if(file&&!allowed.has(file))throw new Error(from+' references a file outside the production allowlist: '+raw+' ('+file+')');
}
function validateCss(text,from,allowed){
  const css=text.replace(/\/\*[\s\S]*?\*\//g,'');
  for(const match of css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)){
    validateReference(match[1]??match[2]??match[3],from,allowed);
  }
  for(const match of css.matchAll(/@import\s+(['"])([^'"]+)\1/gi))validateReference(match[2],from,allowed);
}
function validateHtml(file,allowed,contents=read(file)){
  const html=contents.replace(/<!--[\s\S]*?-->/g,'');
  for(const match of html.matchAll(/\b(?:src|href|poster)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>\x60]+))/gi)){
    validateReference(match[1]??match[2]??match[3],file,allowed);
  }
  for(const match of html.matchAll(/\bsrcset\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)){
    const value=match[1]??match[2];
    if(!value.trim().startsWith('data:'))for(const image of value.split(','))validateReference(image.trim().split(/\s+/)[0],file,allowed);
  }
  validateCss(html,file,allowed);
}
function inlineGameStyles(html,gameCss,analyticsCss){
  // A single compressed document avoids two render-blocking network round trips.
  // Rebase CSS image URLs because inline styles are resolved relative to index.html.
  const css=gameCss.replace(/url\(\s*(['"]?)([^)'"\s]+)\1\s*\)/gi,(match,quote,value)=>{
    const file=localReference(value,'src/style.css');
    return file?'url('+JSON.stringify(file)+')':match;
  });
  return html.replace(/<link\b[^>]*\bhref="src\/style\.css"[^>]*>/i,()=>'<style data-game-styles>\n'+css+'\n</style>')
    .replace(/<link\b[^>]*\bhref="\/assets\/nihongo-analytics\.css"[^>]*>/i,()=>'<style data-analytics-styles>\n'+analyticsCss+'\n</style>');
}
function productionHtml(file){
  const html=read(file);
  if(file!=='index.html')return html;
  let output=inlineGameStyles(html,read('src/style.css'),read('assets/nihongo-analytics.css'));
  for(const [index,source] of CORE_FILES.entries())output=output.replace('<script defer src="'+source+'"></script>',index===0?'<script defer src="'+RUNTIME_FILE+'"></script>':'');
  return output;
}
function productionPlan(){
  const audioManifest=JSON.parse(read('kana-audio-bundle/runtime-manifest.json'));
  if(!audioManifest.byKana||!Object.keys(audioManifest.byKana).length)throw new Error('Audio manifest has no recordings');
  const recordings=[...new Set(Object.values(audioManifest.byKana))].sort();
  for(const recording of recordings){
    if(typeof recording!=='string'||!/^audio\/[a-z0-9-]+\.mp3$/i.test(recording))throw new Error('Invalid audio recording path: '+recording);
  }
  const runtime=CORE_FILES.map(file=>'/* '+file+' */\n'+read(file)+'\n;').join('\n');
  const files=[...ROOT_FILES,...SOURCE_FILES,RUNTIME_FILE,...IMAGE_FILES,...AUDIO_METADATA,...MUSIC_METADATA,...recordings.map(file=>'kana-audio-bundle/'+file)].sort();
  const allowed=new Set(files);
  if(allowed.size!==files.length)throw new Error('Duplicate production file in allowlist');
  const entries=files.map(file=>file===RUNTIME_FILE?{file,generated:runtime,bytes:Buffer.byteLength(runtime)}:{file,...sourceFile(file),...(file==='index.html'?{bytes:Buffer.byteLength(productionHtml(file))}:{})});
  const approvedLookup=require('./prepare-runtime-audio.cjs').runtimePlan();
  if(JSON.stringify(approvedLookup.byKana)!==JSON.stringify(audioManifest.byKana))throw new Error('Runtime pronunciation lookup is stale');
  for(const file of ROOT_FILES.filter(file=>file.endsWith('.html')))validateHtml(file,allowed,productionHtml(file));
  for(const file of SOURCE_FILES.filter(file=>file.endsWith('.css')))validateCss(read(file),file,allowed);
  const manifest=JSON.parse(read('manifest.webmanifest'));
  validateReference(manifest.start_url||'./','manifest.webmanifest',allowed);
  for(const icon of manifest.icons||[])validateReference(icon.src,'manifest.webmanifest',allowed);
  const shell=read('sw.js').match(/\bconst\s+SHELL\s*=\s*\[([\s\S]*?)\]\s*;/);
  if(!shell)throw new Error('Cannot validate the service worker shell allowlist');
  for(const match of shell[1].matchAll(/(['"])([^'"]*)\1/g))validateReference(match[2],'sw.js',allowed);
  return {entries,recordings:recordings.length,bytes:entries.reduce((sum,entry)=>sum+entry.bytes,0)};
}
function build(plan){
  // Check the exact generated destination before recursively replacing it.
  if(path.relative(root,output)!=='dist')throw new Error('Unsafe production output directory');
  if(fs.existsSync(output)){
    const stat=fs.lstatSync(output);
    if(stat.isSymbolicLink()||!stat.isDirectory()||path.relative(rootReal,fs.realpathSync(output))!=='dist')throw new Error('Production output must be the local dist directory');
  }
  fs.rmSync(output,{recursive:true,force:true});
  fs.mkdirSync(output);
  for(const {file,absolute,generated} of plan.entries){
    const destination=path.resolve(output,file);
    if(!inside(output,destination))throw new Error('Output path leaves dist: '+file);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    if(generated!==undefined)fs.writeFileSync(destination,generated);
    else if(file==='index.html')fs.writeFileSync(destination,productionHtml(file));
    else fs.copyFileSync(absolute,destination);
  }
}

module.exports={inlineGameStyles,productionHtml,productionPlan};
if(require.main===module)try{
  if(process.argv.slice(2).some(arg=>arg!=='--check'))throw new Error('Usage: node scripts/build.cjs [--check]');
  const plan=productionPlan(),check=process.argv.includes('--check');
  if(!check)build(plan);
  console.log((check?'Validated':'Built')+' '+plan.entries.length+' production files ('+(plan.bytes/1024/1024).toFixed(2)+' MiB), including '+plan.recordings+' recordings.');
  console.log((check?'Output would be: ':'Output: ')+output);
}catch(error){
  console.error('Build failed: '+error.message);
  process.exitCode=1;
}
