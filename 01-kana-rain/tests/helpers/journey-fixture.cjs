'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const box={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../src/data.js'),'utf8'),box);
const data=box.JPData,FACET='form→sound';
function fixture({hiragana=true,katakana=true,access=hiragana,rows={hiragana:hiragana?27:1,katakana:katakana?2:1}}={}){
  const known=data.kana.filter(k=>hiragana&&k.script==='hiragana'||katakana&&k.script==='katakana'&&k.row==='a');
  const attempts=known.flatMap(k=>[0,1].map(i=>({attemptId:`journey-seed:${k.id}:${i}`,roundId:`journey-seed:${k.id}:${i}`,sessionId:'synthetic-journey-history',itemId:k.id,facet:FACET,responseFormat:'romaji',inputMethod:'typing',gameId:'kana-rain',correct:true,outcome:'correct',firstAttempt:true,assistance:false,assistanceReasons:[],response:k.romaji,at:1700000000000+i*1000})));
  return {version:2,created:1700000000000,sequence:attempts.length,items:{},errorLog:[],attemptLedger:attempts,exposureLedger:[],reveals:{},games:{'kana-rain':{rows,katakanaUnlocked:access,best:{'hira:normal:180':1981},accuracy:{},sound:false,novelty:{version:1,pace:'calm',seen:Object.fromEntries(known.map(k=>[k.id,true])),recent:[],blocked:false,cooldownRemaining:0}}}};
}
module.exports={fixture,data,FACET};
