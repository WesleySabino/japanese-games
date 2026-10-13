'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {inlineGameStyles,productionHtml,productionPlan}=require('../scripts/build.cjs');
const root=path.resolve(__dirname,'..');

test('production home removes render-blocking CSS requests and rebases images for a subpath',()=>{
  const html=productionHtml('index.html');
  assert.ok(html.includes('<style data-game-styles>'));
  assert.ok(html.includes('<style data-analytics-styles>'));
  assert.doesNotMatch(html,/<link\b[^>]*rel="stylesheet"/);
  assert.ok(html.includes('url("assets/garden.webp")'));
  assert.equal((html.match(/src="assets\/game-runtime\.js"/g)||[]).length,1);
  assert.doesNotMatch(html,/<script[^>]*src="src\//);
  assert.equal(new URL('assets/garden.webp','https://example.test/games/rain/').pathname,'/games/rain/assets/garden.webp');
  assert.match(html,/<div id="field"[^>]*role="group"[^>]*aria-label="Falling kana"/);
});

test('style inlining preserves literal CSS and external/data URLs',()=>{
  const html='<link rel="stylesheet" href="src/style.css"><link rel="stylesheet" href="/assets/nihongo-analytics.css">';
  const css='.x{background:url(../assets/spirit.webp)}.y{background:url("data:image/svg+xml;base64,AAAA")}/* $& */';
  const result=inlineGameStyles(html,css,'.privacy{color:green}');
  assert.ok(result.includes('url("assets/spirit.webp")'));
  assert.ok(result.includes('url("data:image/svg+xml;base64,AAAA")'));
  assert.ok(result.includes('/* $& */'));
});

test('compact audio lookup retains every approved mapping and complete provenance remains bundled',()=>{
  const complete=JSON.parse(fs.readFileSync(path.join(root,'kana-audio-bundle/manifest.json'),'utf8'));
  const compact=JSON.parse(fs.readFileSync(path.join(root,'kana-audio-bundle/runtime-manifest.json'),'utf8'));
  assert.deepEqual(compact.byKana,complete.byKana);
  assert.deepEqual(compact.license,complete.license);
  assert.equal(new Set(Object.values(compact.byKana)).size,112);
  assert.ok(fs.statSync(path.join(root,'kana-audio-bundle/runtime-manifest.json')).size<6000);
  const plan=productionPlan(),files=plan.entries.map(x=>x.file);
  const runtime=plan.entries.find(x=>x.file==='assets/game-runtime.js').generated;
  const order=['data.js','learner.js','audio.js','sfx.js','difficulty.js','novelty.js','game.js'].map(x=>runtime.indexOf('/* src/'+x+' */'));
  assert.ok(order.every((x,i)=>x>=0&&(i===0||x>order[i-1])));
  for(const file of ['kana-audio-bundle/manifest.json','kana-audio-bundle/original-manifest.json','kana-audio-bundle/PROVENANCE.md','kana-audio-bundle/LICENSE-AUDIO.txt'])assert.ok(files.includes(file));
  assert.equal(plan.entries.find(x=>x.file==='index.html').bytes,Buffer.byteLength(productionHtml('index.html')));
});

test('sprite payload stays within startup budget and original master is preserved',()=>{
  assert.ok(fs.statSync(path.join(root,'assets/spirit.webp')).size<65000);
  assert.ok(fs.statSync(path.join(root,'assets/spirit-atlas.png')).size>1000000);
});
