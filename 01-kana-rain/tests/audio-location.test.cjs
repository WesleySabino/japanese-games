'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/audio.js'),'utf8');
for(const [name,baseURI,currentScript,expected]of [
  ['source module','https://example.test/rain/',{src:'https://example.test/rain/src/audio.js'},'https://example.test/rain/'],
  ['external bundle','https://example.test/rain/',{src:'https://example.test/rain/assets/game-runtime.js'},'https://example.test/rain/'],
  ['atomic root document','https://example.test/?all',{src:''},'https://example.test/'],
  ['atomic nested document','https://example.test/games/rain/index.html?all',{src:''},'https://example.test/games/rain/'],
  ['no current script','https://example.test/games/rain/',null,'https://example.test/games/rain/']
])test('pronunciation lookup and playback resolve correctly from '+name,async()=>{
  const requests=[],played=[],box={URL,document:{baseURI,currentScript},fetch:async url=>{requests.push(String(url));return {ok:true,json:async()=>({byKana:{'あ':'audio/a.mp3'}})};},Audio:class{constructor(url){played.push(url);this.paused=false;this.ended=false;}async play(){}pause(){this.paused=true;}}};box.window=box;vm.runInNewContext(source,box);await box.KanaAudio.ready;
  assert.deepEqual(requests,[expected+'kana-audio-bundle/runtime-manifest.json']);assert.equal(box.KanaAudio.available,true);assert.equal(await box.KanaAudio.play('あ'),true);assert.deepEqual(played,[expected+'kana-audio-bundle/audio/a.mp3']);assert.equal(await box.KanaAudio.play('not-a-kana'),false);
});
