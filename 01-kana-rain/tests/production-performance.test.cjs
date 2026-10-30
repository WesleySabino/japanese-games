'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {inlineGameStyles,inlineGameRuntime,gameRuntime,frozenCompatibilityRuntime,compatibilityRuntime,productionHtml,productionPlan}=require('../scripts/build.cjs');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');

test('production home removes render-blocking CSS requests and rebases images for a subpath',()=>{
  const html=productionHtml('index.html');
  assert.ok(html.includes('<style data-game-styles>'));
  assert.ok(html.includes('<style data-analytics-styles>'));
  assert.doesNotMatch(html,/<link\b[^>]*rel="stylesheet"/);
  assert.ok(html.includes('url("assets/garden.webp")'));
  assert.doesNotMatch(html,/<script\b[^>]*src="assets\/game-runtime\.js"/);
  assert.equal((html.match(/<script data-game-runtime>/g)||[]).length,1);
  assert.ok(html.indexOf('<script data-game-runtime>')>html.indexOf('id="helpDialog"'),'the full game DOM exists before the inline runtime executes');
  assert.ok(html.indexOf('<script data-game-runtime>')<html.lastIndexOf('</body>'));
  assert.ok(html.includes('/* src/learner.js */'),'current learner is atomic with its document');
  assert.ok(html.includes('/* src/game.js */'),'current game is atomic with its document');
  assert.doesNotMatch(html,/<script[^>]*src="src\//);
  assert.equal(new URL('assets/garden.webp','https://example.test/games/rain/').pathname,'/games/rain/assets/garden.webp');
  assert.match(html,/<div id="field"[^>]*role="group"[^>]*aria-label="Falling kana"/);
  assert.doesNotMatch(html,/id="(?:noveltyHud|noveltyDetails|noveltyIntroduced)"/,'published layout must not include the removed diagnostic panel');
});

test('runtime inlining escapes closing script tags and HTML comment state without changing literal values',()=>{
  const sourceTags=['data','learner','audio','sfx','music','difficulty','novelty','game'].map(name=>'<script defer src="src/'+name+'.js"></script>').join('');
  const values=['</script><img src="private-not-an-asset.png">','</ScRiPt>','<!--<script>','a < b','literal $&'];
  const runtime='window.inlineValues='+JSON.stringify(values)+';';
  const html=inlineGameRuntime('<html><head>'+sourceTags+'</head><body><main id="game"></main></body></html>',runtime);
  const embedded=html.match(/<script data-game-runtime>\n([\s\S]*?)\n<\/script>/)[1];
  assert.doesNotMatch(embedded,/<\/script|<!--/i);
  assert.equal((html.match(/<\/script>/g)||[]).length,1,'only the actual closing tag remains');
  const box={};require('node:vm').runInNewContext(embedded,{window:box});
  assert.deepEqual(JSON.parse(JSON.stringify(box.inlineValues)),values);
  assert.doesNotMatch(html,/<script\b[^>]*src=/);
  assert.throws(()=>inlineGameRuntime('<body></body>',runtime),/Missing source runtime tag/,'missing source tags never silently produce an incomplete bundle');
});

test('stable external runtime contains both exact frozen historical compatibility contracts',()=>{
  const bytes=compatibilityRuntime();
  for(const [version,hash]of Object.entries({'1.10.1':'b4403850d0982fcb263784f66bb435983645ee0f52bca516cff15c0223431f69','1.12.1':'39b5e1368120b426775cf39a24d8907f29c3c09da952646522a25991c6f1fdef'})){
    const frozen=frozenCompatibilityRuntime(version);
    assert.equal(createHash('sha256').update(frozen).digest('hex'),hash,version);
    assert.ok(bytes.includes(frozen),'dispatcher contains the original '+version+' bytes');
    assert.notEqual(gameRuntime(),frozen.toString(),'current code never executes frozen '+version);
  }
  const {baselineBuild}=require('./helpers/update-fixture.cjs');
  assert.deepEqual(frozenCompatibilityRuntime('1.10.1'),baselineBuild().files.get('/assets/game-runtime.js'));
  assert.throws(()=>frozenCompatibilityRuntime('../src/game'),/Unsupported/);
  const entry=productionPlan().entries.find(x=>x.file==='assets/game-runtime.js');
  assert.deepEqual(Buffer.from(entry.generated),bytes);
  assert.ok(!productionPlan().entries.some(x=>x.file.startsWith('compatibility/')),'only its stable public URL is shipped');
  assert.ok(!productionHtml('index.html').includes('Frozen cached-entry compatibility'),'new HTML never executes the dispatcher');
});

test('compatibility dispatcher selects exactly one runtime from the actual legacy DOM contract',()=>{
  // Instrument only the already-hash-checked bodies; the emitted selection code
  // remains unchanged. Full historical boot is exercised in native browser tests.
  let dispatch=compatibilityRuntime().toString();
  for(const version of ['1.10.1','1.12.1'])dispatch=dispatch.replace(frozenCompatibilityRuntime(version).toString(),'window.selected.push('+JSON.stringify(version)+');');
  for(const ids of [[],['importBtn'],['applyImportBtn'],['importBtn','applyImportBtn']]){
    const box={window:{selected:[]},document:{getElementById:id=>ids.includes(id)?{}:null}};
    require('node:vm').runInNewContext(dispatch,box);
    assert.deepEqual(box.window.selected,ids.length===2?['1.12.1']:['1.10.1']);
  }
});

test('ordinary source modules and secondary pages retain their current working-tree content',()=>{
  const plan=productionPlan();assert.equal(plan.entries.length,144,'compatibility adds no public URLs');
  for(const entry of plan.entries.filter(e=>e.file.startsWith('src/'))){assert.equal(entry.generated,undefined);assert.deepEqual(fs.readFileSync(entry.absolute),fs.readFileSync(path.join(root,entry.file)));}
  assert.equal(productionHtml('art.html'),fs.readFileSync(path.join(root,'art.html'),'utf8'));
});

test('style inlining preserves literal CSS and external/data URLs',()=>{
  const html='<link rel="stylesheet" href="src/style.css"><link rel="stylesheet" href="/assets/nihongo-analytics.css">';
  const css='.x{background:url(../assets/spirit.webp)}.y{background:url("data:image/svg+xml;base64,AAAA")}/* $& */';
  const result=inlineGameStyles(html,css,'.privacy{color:green}');
  assert.ok(result.includes('url("assets/spirit.webp")'));
  assert.ok(result.includes('url("data:image/svg+xml;base64,AAAA")'));
  assert.ok(result.includes('/* $& */'));
});

test('compact audio lookup ships kana only while keeping complete source provenance',()=>{
  const complete=JSON.parse(fs.readFileSync(path.join(root,'kana-audio-bundle/manifest.json'),'utf8'));
  const compact=JSON.parse(fs.readFileSync(path.join(root,'kana-audio-bundle/runtime-manifest.json'),'utf8'));
  const vm=require('node:vm'),context=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'src/data.js'),'utf8'),context);
  assert.equal(Object.keys(compact.byKana).length,208);
  for(const kana of context.JPData.kana)assert.equal(compact.byKana[kana.char],complete.byKana[kana.char],kana.char);
  for(const char of Object.keys(compact.byKana))assert.ok(context.JPData.kanaByChar[char],char+' is an available kana');
  assert.deepEqual(compact.license,complete.license);
  assert.equal(new Set(Object.values(compact.byKana)).size,104);
  assert.ok(fs.statSync(path.join(root,'kana-audio-bundle/runtime-manifest.json')).size<6000);
  const plan=productionPlan(),files=plan.entries.map(x=>x.file);
  const runtime=gameRuntime();
  const order=['data.js','learner.js','audio.js','sfx.js','music.js','difficulty.js','novelty.js','game.js'].map(x=>runtime.indexOf('/* src/'+x+' */'));
  assert.ok(order.every((x,i)=>x>=0&&(i===0||x>order[i-1])));
  assert.doesNotMatch(runtime,/KanaNoveltyHud|renderNoveltyHud/,'the runtime retains admission rules without the removed renderer');
  for(const file of ['kana-audio-bundle/manifest.json','kana-audio-bundle/original-manifest.json','kana-audio-bundle/PROVENANCE.md','kana-audio-bundle/LICENSE-AUDIO.txt','music/PROVENANCE.md','music/LICENSE-MUSIC.txt'])assert.ok(files.includes(file));
  assert.equal(plan.entries.find(x=>x.file==='index.html').bytes,Buffer.byteLength(productionHtml('index.html')));
});

test('sprite payload stays within startup budget and original master is preserved',()=>{
  assert.ok(fs.statSync(path.join(root,'assets/spirit.webp')).size<65000);
  assert.ok(fs.statSync(path.join(root,'assets/spirit-atlas.png')).size>1000000);
});
