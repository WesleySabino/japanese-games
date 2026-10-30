/* src/data.js */

/* Kana catalogue and accepted readings. Reusable by kana games.
   Item shape follows spec §5.2 (Kana interface) + `alt` accepted romanizations + `confusables`. */
(function (root) {
  'use strict';
  // [romaji, hiragana, katakana, row, col, kind, alt?]
  var T = [
    ['a','あ','ア','a','a','basic'],['i','い','イ','a','i','basic'],['u','う','ウ','a','u','basic'],['e','え','エ','a','e','basic'],['o','お','オ','a','o','basic'],
    ['ka','か','カ','k','a','basic'],['ki','き','キ','k','i','basic'],['ku','く','ク','k','u','basic'],['ke','け','ケ','k','e','basic'],['ko','こ','コ','k','o','basic'],
    ['sa','さ','サ','s','a','basic'],['shi','し','シ','s','i','basic',['si']],['su','す','ス','s','u','basic'],['se','せ','セ','s','e','basic'],['so','そ','ソ','s','o','basic'],
    ['ta','た','タ','t','a','basic'],['chi','ち','チ','t','i','basic',['ti']],['tsu','つ','ツ','t','u','basic',['tu']],['te','て','テ','t','e','basic'],['to','と','ト','t','o','basic'],
    ['na','な','ナ','n','a','basic'],['ni','に','ニ','n','i','basic'],['nu','ぬ','ヌ','n','u','basic'],['ne','ね','ネ','n','e','basic'],['no','の','ノ','n','o','basic'],
    ['ha','は','ハ','h','a','basic'],['hi','ひ','ヒ','h','i','basic'],['fu','ふ','フ','h','u','basic',['hu']],['he','へ','ヘ','h','e','basic'],['ho','ほ','ホ','h','o','basic'],
    ['ma','ま','マ','m','a','basic'],['mi','み','ミ','m','i','basic'],['mu','む','ム','m','u','basic'],['me','め','メ','m','e','basic'],['mo','も','モ','m','o','basic'],
    ['ya','や','ヤ','y','a','basic'],['yu','ゆ','ユ','y','u','basic'],['yo','よ','ヨ','y','o','basic'],
    ['ra','ら','ラ','r','a','basic'],['ri','り','リ','r','i','basic'],['ru','る','ル','r','u','basic'],['re','れ','レ','r','e','basic'],['ro','ろ','ロ','r','o','basic'],
    ['wa','わ','ワ','w','a','basic'],['wo','を','ヲ','w','o','basic',['o']],['n','ん','ン','nn','-','basic',['nn']],
    ['ga','が','ガ','g','a','dakuten'],['gi','ぎ','ギ','g','i','dakuten'],['gu','ぐ','グ','g','u','dakuten'],['ge','げ','ゲ','g','e','dakuten'],['go','ご','ゴ','g','o','dakuten'],
    ['za','ざ','ザ','z','a','dakuten'],['ji','じ','ジ','z','i','dakuten',['zi']],['zu','ず','ズ','z','u','dakuten'],['ze','ぜ','ゼ','z','e','dakuten'],['zo','ぞ','ゾ','z','o','dakuten'],
    ['da','だ','ダ','d','a','dakuten'],['ji','ぢ','ヂ','d','i','dakuten',['di']],['zu','づ','ヅ','d','u','dakuten',['du']],['de','で','デ','d','e','dakuten'],['do','ど','ド','d','o','dakuten'],
    ['ba','ば','バ','b','a','dakuten'],['bi','び','ビ','b','i','dakuten'],['bu','ぶ','ブ','b','u','dakuten'],['be','べ','ベ','b','e','dakuten'],['bo','ぼ','ボ','b','o','dakuten'],
    ['pa','ぱ','パ','p','a','handakuten'],['pi','ぴ','ピ','p','i','handakuten'],['pu','ぷ','プ','p','u','handakuten'],['pe','ぺ','ペ','p','e','handakuten'],['po','ぽ','ポ','p','o','handakuten']
  ];
  var Y = [['k','き','キ','ky'],['s','し','シ','sh'],['t','ち','チ','ch'],['n','に','ニ','ny'],['h','ひ','ヒ','hy'],['m','み','ミ','my'],['r','り','リ','ry'],
           ['g','ぎ','ギ','gy'],['z','じ','ジ','j'],['b','び','ビ','by'],['p','ぴ','ピ','py']];
  var SM = [['ゃ','ャ','a'],['ゅ','ュ','u'],['ょ','ョ','o']];
  var ALTY = { sh: 'sy', ch: 'ty', j: 'zy' };
  Y.forEach(function (y) { SM.forEach(function (s) {
    var r = y[3] + s[2], alt = [];
    if (ALTY[y[3]]) alt.push(ALTY[y[3]] + s[2]);
    if (y[3] === 'j') alt.push('jy' + s[2]);
    T.push([r, y[1] + s[0], y[2] + s[1], y[0] + 'y', s[2], 'yoon', alt]);
  }); });

  // Visual confusion graph (global seed; the learner's personal confusions are added on top).
  var CONF = [
    'ぬめ','ねれわ','るろ','さち','きさ','はほま','いり','こに','あお','けは','たな','うら','つし','くへ','そん','ソンシツ','クケタ','ウワフ','コユ','アマ','ヌス','チテ','ノメ','ラヲ','シミ','ナメ','ルレ','ロコ',
    'ぎき','ぱば','ぴび','ぷぶ','ぺべ','ぽぼ','パバ','ピビ','プブ','ペベ','ポボ','じぢ','ずづ','ジヂ','ズヅ','しゃしょ','きゃきょ','しゅしょ','ちゃちょ','りゃりょ','にゃにょ'
  ];
  function splitKana(s) { // split into kana units (handles yoon pairs)
    var out = [], small = 'ゃゅょャュョ';
    for (var i = 0; i < s.length; i++) { if (small.indexOf(s[i]) >= 0 && out.length) out[out.length - 1] += s[i]; else out.push(s[i]); }
    return out;
  }
  var kana = [], byChar = {};
  T.forEach(function (t) {
    [['hiragana', t[1]], ['katakana', t[2]]].forEach(function (sc) {
      var k = { id: 'kana:' + sc[1], char: sc[1], script: sc[0], romaji: t[0], alt: t[6] || [], row: t[3], col: t[4],
                kind: t[5], pairId: 'pair:' + t[0] + (t[3] === 'd' && (t[4] === 'i' || t[4] === 'u') ? '_d' : ''), confusables: [] };
      kana.push(k); byChar[k.char] = k;
    });
  });
  CONF.forEach(function (g) {
    var units = /[ゃゅょャュョ]/.test(g) ? [g.slice(0, 2), g.slice(2)] : splitKana(g);
    units.forEach(function (a) { units.forEach(function (b) {
      if (a !== b && byChar[a] && byChar[b] && byChar[a].confusables.indexOf('kana:' + b) < 0) byChar[a].confusables.push('kana:' + b);
    }); });
  });
  // curriculum order: unlock groups (spec: one row → full gojūon → dakuten/combos), hiragana first then katakana
  var ROWS = ['a','k','s','t','n','h','m','y','r','w','nn','g','z','d','b','p','ky','sy','ty','ny','hy','my','ry','gy','zy','by','py'];
  kana.forEach(function (k) { k.order = (k.script === 'katakana' ? 100 : 0) + ROWS.indexOf(k.row); });

  // The input accepts one kana unit, including a compound such as きゃ.
  function toRomaji(symbol) { var k = byChar[String(symbol).normalize('NFC')]; return k ? k.romaji : ''; }
  function romajiVariants(symbol) { var k = byChar[String(symbol).normalize('NFC')]; return k ? [k.romaji].concat(k.alt) : []; }
  var byId = kana.reduce(function (m, k) { m[k.id] = k; return m; }, {});
  function requireKana(id) {
    if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(byId, id)) throw new Error('Unknown kana id: ' + String(id));
    return byId[id];
  }
  // Exact script partner; row/column distinguish homophones such as じ and ぢ.
  function counterpart(id) {
    var source = requireKana(id), other = kana.find(function (k) {
      return k.script !== source.script && k.row === source.row && k.col === source.col && k.pairId === source.pairId;
    });
    if (!other) throw new Error('No script counterpart for kana id: ' + id);
    return other;
  }
  root.JPData = { kana: kana, kanaByChar: byChar, kanaById: byId,
                  toRomaji: toRomaji, romajiVariants: romajiVariants, counterpart: counterpart, rowsOrder: ROWS };
})(typeof window !== 'undefined' ? window : globalThis);

;
/* src/learner.js */
/* Local learner evidence. The v1 storage key is retained so existing gardens migrate.
   Attempts and exposures are durable facts; familiarity is only an estimate. */
(function(root){
'use strict';
var KEY='jp-learner-v1',DAY=86400000,MIN=60000,mem,db=null,store=null,revision=0,listeners=[];
var attemptIds=new Set(),exposureIds=new Set();
var status={state:'checking',saved:false,backend:null,journal:false,indexedDB:false,revision:0};
var clamp=function(x,a,b){return Math.max(a,Math.min(b,x));};
function publish(next){status=Object.assign({},status,next);listeners.slice().forEach(function(fn){try{fn(Object.assign({},status));}catch(e){}});return status;}
function fresh(){return {version:2,items:{},errorLog:[],games:{},attemptLedger:[],exposureLedger:[],reveals:{},sequence:0,created:Date.now()};}
function facet(now){return {stability:.2,difficulty:5,lastReview:now,reps:0,lapses:0,correct:0,errors:0,timeouts:0,rtEmaMs:0,firstAttempts:0,firstCorrect:0,independentFirstAttempts:0,independentFirstCorrect:0,assistedCorrect:0,unknownCorrect:0,unaided:0};}
function item(id){return {itemId:id,firstSeen:Date.now(),lastSeen:0,lastError:0,exposures:0,facets:{},confusions:{},confusionsByFacet:{},scaffold:{romaji:true,furigana:true,gloss:true},flags:{}};}
function state(id,create){var s=mem.items[id];if(!s&&create)s=mem.items[id]=item(id);return s||null;}
function retrievability(f,now){return Math.pow(1+Math.max(0,now-f.lastReview)/DAY/(9*Math.max(.02,f.stability)),-1);}
function mastery(id,name,now){var s=state(id),f=s&&s.facets[name];if(!f||!f.correct)return 0;return .6*retrievability(f,now||Date.now())+.4*Math.min(1,Math.log1p(f.stability)/Math.log1p(60));}
function apply(ev){
var s=state(ev.itemId,true),f=s.facets[ev.facet]||(s.facets[ev.facet]=facet(ev.at)),w=ev.assistance===true?.5:ev.assistance===false?1:.5;
s.exposures++;s.lastSeen=ev.at;
if(ev.outcome==='timeout'){f.timeouts++;return;}
if(ev.firstAttempt){f.firstAttempts++;if(ev.correct)f.firstCorrect++;if(ev.assistance===false){f.independentFirstAttempts++;if(ev.correct)f.independentFirstCorrect++;}}
f.unaided=f.independentFirstCorrect;
var R=f.reps?retrievability(f,ev.at):.5;
if(ev.correct){
f.correct++;if(ev.assistance===true)f.assistedCorrect++;else if(ev.assistance===null)f.unknownCorrect++;
var gain=1+w*Math.exp(.9)*(11-f.difficulty)/10*Math.pow(f.stability,-.2)*(Math.exp((1-R)*1.5)-1);
f.stability*=Math.max(1.05,gain);f.difficulty=clamp(f.difficulty-.15*w,1,10);
if(ev.firstAttempt&&ev.firstResponseMs!=null)f.rtEmaMs=f.rtEmaMs?f.rtEmaMs*.7+ev.firstResponseMs*.3:ev.firstResponseMs;
if(ev.assistance===false){var edges=s.confusionsByFacet[ev.facet]||{};Object.keys(edges).forEach(function(k){edges[k]=Math.max(0,edges[k]-.34);if(edges[k]<.01)delete edges[k];});}
}else{
f.errors++;if(f.reps>2)f.lapses++;f.stability=Math.max(.02,f.stability*(.35+.3*(1-w)));f.difficulty=clamp(f.difficulty+.6*w,1,10);s.lastError=ev.at;
if(ev.chosenItemId&&ev.chosenItemId!==ev.itemId){var graph=s.confusionsByFacet[ev.facet]||(s.confusionsByFacet[ev.facet]={});graph[ev.chosenItemId]=(graph[ev.chosenItemId]||0)+1;mem.errorLog.push({attemptId:ev.attemptId,itemId:ev.itemId,confusedWith:ev.chosenItemId,submittedItemId:ev.submittedItemId,facet:ev.facet,responseFormat:ev.responseFormat,at:ev.at,gameId:ev.gameId});}
if(f.lapses>=6)s.flags.leech=true;
}
s.confusions={};Object.keys(s.confusionsByFacet).forEach(function(name){Object.keys(s.confusionsByFacet[name]).forEach(function(k){s.confusions[k]=(s.confusions[k]||0)+s.confusionsByFacet[name][k];});});
f.reps++;f.lastReview=ev.at;
if(ev.itemId.indexOf('kana:')===0)s.scaffold.romaji=mastery(ev.itemId,'form→sound',ev.at)<.75;
}
function restore(input){
if(!input||![1,2].includes(input.version)||!input.items||!input.games)throw new Error('Unsupported learner export');
var d=Object.assign(fresh(),input);d.sequence=Number.isSafeInteger(d.sequence)?d.sequence:0;d.reveals=d.reveals||{};
if(input.version===1){
d.version=2;d.legacy={version:1,assistance:'unknown',migratedAt:Date.now()};d.legacyErrorLog=(d.errorLog||[]).slice();d.attemptLedger=[];d.exposureLedger=[];d.reveals={};
Object.keys(d.items).forEach(function(id){var s=d.items[id];s.legacyFacets=JSON.parse(JSON.stringify(s.facets||{}));s.legacyConfusions=Object.assign({},s.confusions);s.confusions={};s.confusionsByFacet={};});
}
mem=d;mem.errorLog=[];
Object.keys(d.items).forEach(function(id){var s=d.items[id],base=s.legacyFacets||{};s.facets={};s.confusions={};s.confusionsByFacet={};s.scaffold=s.scaffold||{romaji:true};s.flags=s.flags||{};s.exposures=0;
Object.keys(base).forEach(function(name){var old=base[name];s.facets[name]=Object.assign(facet(old.lastReview||Date.now()),old,{unaided:0,independentFirstCorrect:0,independentFirstAttempts:0,firstAttempts:0,firstCorrect:0,assistedCorrect:0,unknownCorrect:old.correct||0,timeouts:0,legacyAssistance:'unknown'});});
});
attemptIds=new Set();exposureIds=new Set();d.attemptLedger=(d.attemptLedger||[]).filter(function(ev){if(!ev||!ev.attemptId||attemptIds.has(ev.attemptId)||!ev.itemId||!ev.facet)return false;attemptIds.add(ev.attemptId);apply(ev);return true;});
d.exposureLedger=Array.isArray(d.exposureLedger)?d.exposureLedger:[];
d.exposureLedger.forEach(function(ev){if(ev&&ev.exposureId)exposureIds.add(ev.exposureId);});
if(d.errorLog.length>500)d.errorLog=d.errorLog.slice(-500);return d;
}
try{store=root.localStorage;store.setItem('__t','1');store.removeItem('__t');}catch(e){store=null;}
var restoredBackend=null;
try{var journal=store&&JSON.parse(store.getItem(KEY));mem=journal?restore(journal):fresh();if(journal)restoredBackend='journal';}catch(e){mem=fresh();}
var ready=new Promise(function(resolve){
var done=false;function finish(){if(done)return;done=true;publish({state:restoredBackend?'restored':'ready',saved:!!restoredBackend,backend:restoredBackend,journal:restoredBackend==='journal',indexedDB:restoredBackend==='indexedDB'});resolve();}
if(!root.indexedDB){finish();return;}
var request;try{request=root.indexedDB.open('kana-garden',1);}catch(e){finish();return;}
request.onupgradeneeded=function(){request.result.createObjectStore('learner');};
request.onerror=request.onblocked=finish;
request.onsuccess=function(){db=request.result;var read;try{read=db.transaction('learner').objectStore('learner').get(KEY);}catch(e){finish();return;}
read.onsuccess=function(){if(!done&&read.result&&(read.result.updatedAt||0)>(mem.updatedAt||0)){try{restore(read.result);restoredBackend='indexedDB';}catch(e){}}finish();};read.onerror=finish;
};
});
function flush(){
var token=++revision,journalOK=false;mem.updatedAt=Date.now();var serialized=JSON.stringify(mem);
publish({state:'saving',saved:false,revision:token});
if(store)try{store.setItem(KEY,serialized);journalOK=true;}catch(e){}
if(journalOK)publish({state:'saving',saved:true,backend:'journal',journal:true,indexedDB:false,revision:token});
return new Promise(function(resolve){
var settled=false;function finish(idbOK){if(settled)return;settled=true;var result={state:journalOK||idbOK?'saved':'unsaved',saved:journalOK||idbOK,backend:journalOK&&idbOK?'journal+indexedDB':journalOK?'journal':idbOK?'indexedDB':null,journal:journalOK,indexedDB:idbOK,revision:token};if(token===revision)publish(result);resolve(result);}
if(!db){finish(false);return;}
try{var snapshot=JSON.parse(serialized),tx=db.transaction('learner','readwrite');tx.oncomplete=function(){finish(true);};tx.onerror=tx.onabort=function(){finish(false);};tx.objectStore('learner').put(snapshot,KEY);}catch(e){finish(false);}
});
}
function nextId(prefix){mem.sequence++;return prefix+':'+mem.created+':'+mem.sequence;}
function beginSession(gameId){var id=nextId(gameId+':session');flush();return id;}
// Two distinct intervening items AND 60 seconds after a reference are required.
// This conservative bookkeeping rule does not prove long-term retention.
function assistanceFor(id,name,now){var r=mem.reveals[id+'|'+name],delay=r?Math.max(0,(now??Date.now())-r.at):null,assisted=!!r&&(delay<MIN||r.intervening.length<2);return {assisted:assisted,reasons:assisted?['recent-'+r.reason]:[],lastExposureReason:r?r.reason:null,delaySinceExposureMs:delay,interveningItems:r?r.intervening.slice():[]};}
function recordExposure(id,name,ev){ev=ev||{};var at=ev.now||Date.now(),entry={exposureId:ev.exposureId||nextId('exposure'),itemId:id,facet:name,at:at,reason:ev.reason||'reference',gameId:ev.gameId||'',sessionId:ev.sessionId||null,roundId:ev.roundId||null};
if(exposureIds.has(entry.exposureId))return entry;
exposureIds.add(entry.exposureId);mem.exposureLedger.push(entry);mem.reveals[id+'|'+name]=Object.assign({},entry,{intervening:[]});if(!ev.deferSave)flush();return entry;
}
function record(id,name,ev){
ev=ev||{};var attemptId=ev.attemptId||nextId('legacy-call');if(attemptIds.has(attemptId))return state(id,true);
var first=ev.firstAttempt===true,assistance=typeof ev.assistance==='boolean'?ev.assistance:null;
var entry={attemptId:attemptId,sessionId:ev.sessionId||null,roundId:ev.roundId||null,itemId:id,facet:name,responseFormat:ev.responseFormat||null,firstAttempt:first,assistance:assistance,assistanceReasons:Array.isArray(ev.assistanceReasons)?ev.assistanceReasons.slice():[],outcome:ev.outcome==='timeout'?'timeout':ev.correct?'correct':'incorrect',correct:ev.outcome==='timeout'?null:!!ev.correct,reason:ev.reason||(ev.correct?'accepted':'unrecognized-response'),at:ev.now||Date.now(),gameId:ev.gameId||'',response:ev.response==null?null:String(ev.response),chosenItemId:ev.chosenItemId||null,submittedItemId:ev.submittedItemId||null,candidateItemIds:ev.candidateItemIds||[],firstResponseMs:ev.firstResponseMs==null?(first?ev.rtMs??null:null):ev.firstResponseMs,inputActiveMs:ev.inputActiveMs??null,displayActiveMs:ev.displayActiveMs??ev.rtMs??null,waitMs:ev.waitMs??null,delaySinceExposureMs:ev.delaySinceExposureMs??null};
// Optional, new events only: how the answer was entered. Older events keep their exact shape.
if(ev.inputMethod)entry.inputMethod=String(ev.inputMethod);
attemptIds.add(attemptId);mem.attemptLedger.push(entry);apply(entry);
if(first&&entry.outcome!=='timeout')Object.keys(mem.reveals).forEach(function(key){var r=mem.reveals[key];if(r.itemId!==id&&!r.intervening.includes(id))r.intervening.push(id);});
if(mem.errorLog.length>500)mem.errorLog.splice(0,mem.errorLog.length-500);if(!ev.deferSave)flush();return state(id);
}
function priority(s,name,now){var f=s.facets[name];if(!f)return null;var R=retrievability(f,now),p=Math.max(0,.9-R)*10+f.difficulty/10*1.5,conf=0,edges=s.confusionsByFacet[name]||{};Object.keys(edges).forEach(function(k){conf+=edges[k];});p+=Math.min(3,conf)*.8+(s.flags.leech?1.5:0);if(now-s.lastError<10*MIN)p+=4;if(now-s.lastSeen<MIN/2)p-=5;return {p:p,R:R};}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
function selectRound(candidates,opts){
var now=Date.now(),name=opts.facet,size=opts.size||8,mix=opts.mix||{review:.6,weak:.25,fresh:.15},seen=[],unseen=[];
candidates.forEach(function(id){var s=state(id);if(s&&s.facets[name]){var pr=priority(s,name,now);seen.push({id:id,p:pr.p,R:pr.R});}else unseen.push(id);});
var weak=seen.filter(function(x){return x.p>3;}).sort(function(a,b){return b.p-a.p;}),review=seen.filter(function(x){return x.p<=3;}).sort(function(a,b){return a.R-b.R;}),nNew=Math.min(opts.maxNew==null?3:opts.maxNew,unseen.length,Math.max(seen.length<5?size:0,Math.round(size*mix.fresh))),nWeak=Math.min(weak.length,Math.round(size*mix.weak)+(review.length?0:size));
var out=unseen.slice(0,nNew).concat(weak.slice(0,nWeak).map(function(x){return x.id;})),rest=review.concat(weak.slice(nWeak)).slice(0,Math.max(size*2,6));shuffle(rest);
for(var i=0;out.length<size&&i<rest.length;i++)if(!out.includes(rest[i].id))out.push(rest[i].id);
if(opts.interleave!==false)out.slice().forEach(function(id){var s=state(id);if(!s)return;var graph=s.confusionsByFacet[name]||{};Object.keys(graph).forEach(function(c){if(graph[c]>=1&&!out.includes(c)&&candidates.includes(c)&&out.length<size+3)out.push(c);});});return out;
}
root.Learner={ready:ready,state:state,record:record,recordExposure:recordExposure,assistanceFor:assistanceFor,beginSession:beginSession,mastery:mastery,retrievability:retrievability,selectRound:selectRound,shuffle:shuffle,recentErrors:function(n){return mem.errorLog.slice(-(n||20));},gameData:function(id){return mem.games[id]||(mem.games[id]={});},save:flush,flush:flush,all:function(){return mem.items;},attempts:function(){return mem.attemptLedger.slice();},exposures:function(){return mem.exposureLedger.slice();},persistenceStatus:function(){return Object.assign({},status);},subscribePersistence:function(fn){listeners.push(fn);fn(Object.assign({},status));return function(){listeners=listeners.filter(function(x){return x!==fn;});};},export:function(){return JSON.stringify(mem);},import:function(json){restore(JSON.parse(json));return flush();},reset:function(){mem=fresh();attemptIds=new Set();exposureIds=new Set();return flush();}};
if(root.addEventListener)root.addEventListener('pagehide',flush);
})(typeof window!=='undefined'?window:globalThis);

;
/* src/audio.js */
/* Every pronunciation comes from the supplied manifest. No synthesized browser speech. */
(function (root) {
  'use strict';
  const manifestUrl = new URL('../kana-audio-bundle/runtime-manifest.json', document.currentScript.src);
  let pack = null, enabled = true, current = null, generation = 0;
  const ready = fetch(manifestUrl).then(r => { if(!r.ok) throw new Error('Audio manifest unavailable'); return r.json(); }).then(p => {pack=p; return p;}).catch(() => null);
  function stop() { generation++; if(current) {current.pause(); current.onended = null;} current=null; }
  async function play(symbol) {
    stop();
    if(!enabled) return false;
    const token = generation;
    await ready;
    if(!pack || token !== generation || !enabled) return false;
    // Resolve only supplied kana recordings; never fabricate a pronunciation.
    const file = pack.byKana[symbol];
    if(!file) return false;
    current = new Audio(new URL(file, manifestUrl).href);
    try { await current.play(); return true; } catch { return false; }
  }
  root.KanaAudio = {ready,play,stop,hasRecording(symbol){return !!pack?.byKana[symbol];},get playing(){return !!current&&!current.paused&&!current.ended;},get available(){return !!pack;},get enabled(){return enabled;},set enabled(v){enabled=!!v;if(!enabled)stop();}};
})(window);

;
/* src/sfx.js */
/* Soft interface tones complement the recorded pronunciations without changing KanaAudio. */
(function (root) {
  'use strict';

  const AudioContextClass = root.AudioContext || root.webkitAudioContext;
  const cues = Object.freeze({
    menu: [[659, 0, .075]],
    start: [[523, 0, .07], [659, .055, .075], [784, .115, .12]],
    back: [[523, 0, .065], [392, .055, .085]],
    confirm: [[659, 0, .065], [784, .055, .09]],
    tick: [[880, 0, .045]],
    heart: [[392, 0, .08], [294, .075, .12]],
    streak: [[784, 0, .075], [988, .065, .085], [1175, .13, .11]],
    record: [[659, 0, .08], [784, .07, .08], [988, .14, .1], [1319, .23, .15]],
    unlock: [[523, 0, .08], [659, .065, .08], [784, .13, .09], [1047, .205, .16]],
    warning: [[392, 0, .06], [392, .105, .06]]
  });
  let context = null, output = null, resuming = null, unavailable = false;
  let lastKind = null, playCount = 0, lastMenuAt = -Infinity;
  const voices = new Set();
  const enabled = () => !!root.KanaAudio?.enabled;

  // Create/resume audio only in response to a gesture. Game events can then use
  // the running context, without deferred sounds waiting for a future gesture.
  function prime() {
    if (!AudioContextClass || unavailable) return;
    try {
      if (!context || context.state === 'closed') {
        context = new AudioContextClass();
        output = context.createGain();
        output.gain.value = .3;
        output.connect(context.destination);
      }
      if (context.state !== 'running' && !resuming) {
        resuming = Promise.resolve(context.resume()).catch(() => false)
          .finally(() => { resuming = null; });
      }
    } catch {
      unavailable = true;
    }
  }

  function silence() {
    if (!context) return;
    const now = context.currentTime;
    voices.forEach(voice => {
      try {
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setTargetAtTime(.0001, now, .003);
        voice.oscillator.stop(now + .015);
      } catch { /* A completed voice is already silent. */ }
    });
  }

  async function play(kind = 'menu') {
    if (!enabled() || !context || unavailable) return false;
    if (context.state !== 'running' && resuming) {
      // A browser that declines to unlock audio must not leave promises or old
      // interface tones waiting indefinitely.
      await Promise.race([resuming, new Promise(resolve => root.setTimeout(resolve, 80))]);
    }
    if (!enabled() || context.state !== 'running') return false;
    kind = Object.prototype.hasOwnProperty.call(cues, kind) ? kind : 'menu';
    const now = context.currentTime;
    if ((kind === 'menu' || kind === 'tick') && now - lastMenuAt < .035) return false;
    if (kind === 'menu' || kind === 'tick') lastMenuAt = now;

    // Pronunciation always takes priority. These short sine tones are quiet
    // even without the optional playing getter exposed by KanaAudio.
    const peak = root.KanaAudio?.playing ? .012 : .032;
    try {
      cues[kind].forEach(([frequency, delay, duration]) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const start = now + delay, finish = start + duration;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + .005);
        gain.gain.exponentialRampToValueAtTime(.0001, finish);
        oscillator.connect(gain);
        gain.connect(output);
        const voice = { oscillator, gain };
        voices.add(voice);
        oscillator.onended = () => {
          voices.delete(voice);
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(start);
        oscillator.stop(finish + .005);
      });
      lastKind = kind;
      playCount++;
      return true;
    } catch {
      silence();
      return false;
    }
  }

  function buttonCue(button) {
    if (['startBtn', 'againBtn', 'reviewPracticeBtn'].includes(button.id)) return 'start';
    if (button.id === 'resetBtn' || button.classList.contains('danger')) return 'warning';
    if (button.classList.contains('dialog-close') ||
      /^(close|back|return|cancel)/i.test(button.id)) return 'back';
    if (button.matches('[data-script]')) {
      return button.getAttribute('aria-pressed') === 'true' || button.classList.contains('selected') ? 'menu' : 'confirm';
    }
    if (['resumeBtn', 'saveSettings', 'finishBtn', 'exportBtn', 'submitBtn'].includes(button.id)) return 'confirm';
    return 'menu';
  }

  document.addEventListener('pointerdown', prime, { capture: true, passive: true });
  document.addEventListener('keydown', prime, { capture: true, passive: true });
  document.addEventListener('click', event => {
    prime();
    const button = event.target.closest?.('button');
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true' || button.matches('[data-key]')) return;
    void play(buttonCue(button));
    // The capture listener sees the old mute state; stop any remaining notes
    // after the toggle's handler has applied its new state.
    if (button.id === 'soundBtn') root.queueMicrotask(() => { if (!enabled()) silence(); });
  }, true);
  document.addEventListener('change', event => {
    const select = event.target.closest?.('select');
    if (!select || select.disabled) return;
    void play('confirm');
  }, true);

  root.KanaSfx = Object.freeze({
    play,
    get lastKind() { return lastKind; },
    get playCount() { return playCount; }
  });
})(window);

;
/* src/difficulty.js */
/* Difficulty selects novelty recovery. Every session shares the same arcade rain curve. */
(function(root){
  'use strict';
  const rain=Object.freeze({hearts:3,fallSeconds:10,rampSeconds:60,maxMultiplier:3.5,gap:2400,minGap:750,maxDrops:5});
  const profiles=Object.freeze({
    easy:Object.freeze({...rain,name:'Easy',pace:'calm'}),
    normal:Object.freeze({...rain,name:'Normal',pace:'balanced'}),
    hard:Object.freeze({...rain,name:'Hard',pace:'bold'})
  });
  function atTime(id,elapsed){
    const p=rain;
    const seconds=Number.isFinite(elapsed)?Math.max(0,elapsed):0;
    const multiplier=Math.min(p.maxMultiplier,1+seconds/p.rampSeconds);
    const fallSeconds=p.fallSeconds/multiplier;
    return {speed:1/fallSeconds,fallSeconds,gap:Math.max(p.minGap,p.gap/Math.sqrt(multiplier))};
  }
  const api=Object.freeze({profiles,atTime});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KanaDifficulty=api;
})(typeof window!=='undefined'?window:globalThis);

;
/* src/novelty.js */
/* Admission pressure is separate from learning evidence and earned unlocks. */
(function(root){
  'use strict';
  const constants=Object.freeze({windowSize:60,missLimit:4,timeoutLimit:2,recoveryHits:55,cooldownHits:10,maxNew:2,warmup:3});
  const profiles=Object.freeze({
    calm:Object.freeze({id:'calm',label:'Calm',windowSize:60,recoveryHits:55}),
    balanced:Object.freeze({id:'balanced',label:'Balanced',windowSize:30,recoveryHits:25}),
    bold:Object.freeze({id:'bold',label:'Bold',windowSize:12,recoveryHits:10})
  });
  const GAME='kana-rain',FACET='form→sound';
  const isKana=id=>typeof id==='string'&&id.startsWith('kana:');
  function profile(value){const id=typeof value==='string'?value:value?.pace;return Object.hasOwn(profiles,id)?profiles[id]:profiles.calm;}
  function constantsFor(state){const selected=profile(state);return {...constants,windowSize:selected.windowSize,recoveryHits:selected.recoveryHits};}
  function hasSeen(state,id){return state.seen[id]===true;}
  function markSeen(state,id){if(isKana(id))state.seen[id]=true;return state;}
  // Reading misses and expirations are separate signals; either can hold new presentations.
  // Old corrected rounds imply a wrong first answer, even before the miss flag existed.
  const missed=round=>typeof round.miss==='boolean'?round.miss:round.firstCorrect!==true&&round.timeout!==true;
  function pause(state){state.cooldownRemaining=constants.cooldownHits;return state;}
  function updateGate(state){
    const rules=constantsFor(state),recent=state.recent.slice(-rules.windowSize);
    const misses=recent.filter(missed).length,hits=recent.filter(round=>round.firstCorrect).length,timeouts=recent.filter(round=>round.timeout).length;
    if(misses>=rules.missLimit||timeouts>=rules.timeoutLimit)state.blocked=true;
    else if(state.blocked&&recent.length===rules.windowSize&&hits>=rules.recoveryHits)state.blocked=false;
    return state;
  }
  function setPace(state,id){
    if(!Object.hasOwn(profiles,id))return state;
    state.pace=id;return updateGate(state);
  }
  function finish(state,event){
    if(!event||typeof event.roundId!=='string'||!event.roundId||state.recent.some(round=>round.roundId===event.roundId))return state;
    const firstCorrect=event.firstCorrect===true&&event.timeout!==true;
    const familiar=event.familiar!==false;
    // Wrong submissions pause immediately in the runtime; their eventual correction is neutral.
    if(event.timeout===true||(!firstCorrect&&event.failureRecorded!==true))pause(state);
    else if(firstCorrect&&familiar&&state.cooldownRemaining>0)state.cooldownRemaining--;
    state.recent.push({roundId:event.roundId,firstCorrect,timeout:event.timeout===true,miss:event.miss===true&&!firstCorrect,familiar});
    if(state.recent.length>constants.windowSize)state.recent.splice(0,state.recent.length-constants.windowSize);
    // Keep all 60 real samples even for shorter profiles so switching back loses no history.
    return updateGate(state);
  }
  function create(gameData,evidence={}){
    // Existing state carries hysteresis across restarts. Never rebuild it from
    // stale aggregates or rewrite the underlying attempt/exposure ledgers.
    const saved=gameData.novelty;
    if(saved?.version===1&&saved.seen&&Array.isArray(saved.recent)&&typeof saved.blocked==='boolean'){
      saved.pace=profile(saved).id;
      if(!Number.isInteger(saved.cooldownRemaining)||saved.cooldownRemaining<0||saved.cooldownRemaining>constants.cooldownHits){
        saved.cooldownRemaining=0;
        // Do not invent familiar successes in old samples that did not record debut identity.
        for(const round of saved.recent.slice(-constants.cooldownHits)){
          if(!round.firstCorrect)pause(saved);
          else if(round.familiar===true&&saved.cooldownRemaining>0)saved.cooldownRemaining--;
        }
        const last=(evidence.attempts||[]).findLast(event=>event?.gameId===GAME&&event.facet===FACET&&isKana(event.itemId));
        if(last&&(last.outcome==='incorrect'||last.correct===false))pause(saved);
      }
      return updateGate(saved);
    }
    const state={version:1,pace:'calm',seen:{},recent:[],blocked:false,cooldownRemaining:0},rounds=new Map(),completed=new Set();
    // Legacy answers predate the attempt ledger, so those kana are already familiar.
    for(const [id,item] of Object.entries(evidence.items||{})){
      const old=item?.legacyFacets?.[FACET];
      if(old&&(old.correct>0||old.errors>0||old.firstAttempts>0))markSeen(state,id);
    }
    const readings=(evidence.exposures||[]).filter(event=>event?.gameId===GAME&&event.facet===FACET&&event.reason==='initial-reading');
    for(const event of evidence.attempts||[]){
      if(event?.gameId!==GAME||event.facet!==FACET||!isKana(event.itemId))continue;
      // Whether the kana was already seen is decided before this round marks it.
      // An earlier session's initial reading is reliable; same-session hints may belong
      // to this debut and their saved roundId can refer to a different target drop.
      const familiar=hasSeen(state,event.itemId)||readings.some(reading=>reading.itemId===event.itemId&&reading.sessionId&&event.sessionId&&reading.sessionId!==event.sessionId&&Number.isFinite(reading.at)&&Number.isFinite(event.at)&&reading.at<event.at);
      markSeen(state,event.itemId);
      const roundId=event.roundId||event.attemptId;
      if(!roundId||completed.has(roundId))continue;
      const previous=rounds.get(roundId)||{incorrect:false,familiar};
      if(event.outcome==='incorrect'||event.correct===false){pause(state);previous.incorrect=true;rounds.set(roundId,previous);}
      if(event.outcome==='timeout'||event.outcome==='correct'||event.correct===true){
        const timeout=event.outcome==='timeout',firstCorrect=!timeout&&!previous.incorrect&&event.firstAttempt===true;
        finish(state,{roundId,timeout,firstCorrect,familiar:previous.familiar,failureRecorded:previous.incorrect,miss:previous.familiar&&!firstCorrect&&(previous.incorrect||!timeout)});
        rounds.delete(roundId);completed.add(roundId);
      }
    }
    for(const event of readings)markSeen(state,event.itemId);
    gameData.novelty=state;return state;
  }
  const api=Object.freeze({constants,profiles,profile,constantsFor,setPace,create,pause,finish,markSeen,hasSeen});
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KanaNovelty=api;
})(typeof window!=='undefined'?window:globalThis);

;
/* src/game.js */
(async function () {
  'use strict';
  const D=window.JPData, L=window.Learner, A=window.KanaAudio, R=window.KanaDifficulty, N=window.KanaNovelty, FACET='form→sound', GAME='kana-rain';
  const $=id=>document.getElementById(id), normalize=s=>s.trim().toLowerCase().normalize('NFKC');
  await L.ready;
  let gd=L.gameData(GAME);
  gd.rows=gd.rows || {hiragana:1,katakana:1}; gd.best=gd.best || {}; gd.accuracy=gd.accuracy || {};
  // Preserve access earned under the earlier curriculum; new gardens start locked.
  if(typeof gd.katakanaUnlocked!=='boolean'){
    gd.katakanaUnlocked=gd.rows.hiragana>=11||gd.rows.katakana>1||D.kana.some(k=>k.script==='katakana'&&((L.state(k.id)?.facets[FACET]?.reps||0)>0||(L.state(k.id)?.legacyFacets?.[FACET]?.reps||0)>0));
    L.flush();
  }
  let novelty=N.create(gd,{attempts:L.attempts?.(),exposures:L.exposures?.(),items:L.all?.()});
  const katakanaIds=new Set(D.kana.filter(k=>k.script==='katakana').map(k=>k.id));
  function createKatakanaNovelty(){
    // Keep Katakana's long reading brake separate from earlier Hiragana pressure.
    // Only attributable evidence can reconstruct it; the shared short pause stays global.
    const holder={novelty:gd.katakanaNovelty},state=N.create(holder,{
      attempts:(L.attempts?.()||[]).filter(event=>katakanaIds.has(event.itemId)),
      exposures:(L.exposures?.()||[]).filter(event=>katakanaIds.has(event.itemId)),
      items:Object.fromEntries(Object.entries(L.all?.()||{}).filter(([id])=>katakanaIds.has(id)))
    });
    for(const id of katakanaIds)if(N.hasSeen(novelty,id))N.markSeen(state,id);
    N.setPace(state,N.profile(novelty).id);gd.katakanaNovelty=state;return state;
  }
  let katakanaNovelty=createKatakanaNovelty();
  const explore=new URLSearchParams(location.search).has('all');
  // The saved novelty pace is authoritative: old rain difficulty must not change it.
  const difficultyForPace=id=>Object.keys(R.profiles).find(key=>R.profiles[key].pace===id)||'easy';
  let cfg={mode:'hira',duration:180,difficulty:difficultyForPace(N.profile(novelty).id),playStyle:'arcade',noveltyPace:N.profile(novelty).id}, G=null, raf=0, mapScript='hiragana', keyboardOpen=false, composing=false, feedbackTimer, spiritTimer, milestoneTimer, heartTimer, feedbackPriority=-1, feedbackUntil=0, currentFeedback=null, feedbackQueue=[], lastReview=[];
  // Sound pad: a fixed grid of consonant families, replaced in place by that family's sounds.
  // Cells come from the catalogue, so each of the 104 readings per script has exactly one two-tap path.
  // [family, name, main letter, other spellings in the row]
  const PAD_FAMILIES=[['a','Vowels'],['k','K'],['s','S/SH','S','SH'],['t','T/CH/TS','T','CH TS'],['n','N'],['h','H/F','H','F'],['m','M'],['y','Y'],['r','R'],['w','W'],['g','G'],['z','Z/J','Z','J'],['d','D'],['b','B'],['p','P']];
  const PAD_SLOTS=['a','i','u','e','o','ya','yu','yo','n'],PAD_BOUNCE_MS=70;
  const padKey=k=>k.row==='nn'?['n','n']:k.kind==='yoon'?[k.row[0],'y'+k.col]:[k.row,k.col];
  const padCells={};
  D.kana.filter(k=>k.script==='hiragana').forEach(k=>{const [family,slot]=padKey(k);(padCells[family]||(padCells[family]={}))[slot]={family,slot,reading:k.romaji,row:k.row,col:k.col};});
  function padPath(id){const k=D.kanaById[id]||D.kanaByChar[id];if(!k)return null;const [family,slot]=padKey(k);return padCells[family]?.[slot]||null;}
  let padFamily=null,padTarget=null,padChangedAt=-Infinity;
  A.enabled=gd.sound!==false;
  const sfx=kind=>window.KanaSfx?.play(kind);
  const panelOrigins=new Map();
  let progressDirty=true,keyboardSignature=null,fieldSize={width:0,height:0};
  const mobile=()=>matchMedia('(pointer:coarse)').matches || innerWidth<=650;
  const running=()=>G && !G.over;
  // Both alphabets are answered by sound; a katakana's support label is its known hiragana.
  const readingLabel=id=>D.kanaById[id]?.script==='katakana'?D.counterpart(id).char:D.kanaById[id]?.romaji||'';
  const canShowFeedbackKana=id=>{const k=D.kanaById[id];return !!k&&(k.script!=='katakana'||N.hasSeen(novelty,id));};
  const katakanaFeedbackForms=[...katakanaIds].map(id=>D.kanaById[id]).sort((a,b)=>b.char.length-a.char.length);
  function feedbackResponse(text){
    // Keep the recorded response intact; pasted kana must not bypass presentation pacing.
    // Match compounds before their base kana, including normalized half-width input.
    for(const chunk of text.normalize('NFKC').match(/[\p{Script=Katakana}\u30fc\u3099\u309a]+/gu)||[]){
      for(let at=0;at<chunk.length;){
        const k=katakanaFeedbackForms.find(k=>chunk.startsWith(k.char,at));
        if(!k||!canShowFeedbackKana(k.id))return 'an unlearned kana';
        at+=k.char.length;
      }
    }
    return text;
  }
  function stopLoop(){cancelAnimationFrame(raf);raf=0;}
  function wakeLoop(){if(!raf&&running()&&!document.hidden&&(G.countingDown||!G.paused))raf=requestAnimationFrame(loop);}
  function syncAnimationState(){document.body.classList.toggle('game-paused',document.hidden||!!(running()&&(G.paused||G.countingDown)));}
  function textIfChanged(el,value){value=String(value);if(el.textContent!==value)el.textContent=value;}
  function statText(id,value){
    const el=$(id),text=String(value),chars=String(text.length);
    if(el.dataset.hudChars!==chars){el.dataset.hudChars=chars;el.style.setProperty('--hud-stat-chars',chars);}
    textIfChanged(el,text);
  }
  function invalidateProgress(){progressDirty=true;renderProgress();}
  function renderProgress(force=false){if(force||progressDirty&&$('progressDialog').open){renderMap();renderUnlocks(mapScript);renderLearningStats();progressDirty=false;}}
  function focusAnswer(){
    if(!running() || G.paused || G.countingDown)return;
    // With the sound pad open on a phone, never focus the field: no native keyboard can open unasked.
    if(mobile()&&keyboardOpen){$('answer').inputMode='none';$('answer').blur();return;}
    $('answer').inputMode='text';$('answer').focus({preventScroll:true});
  }
  function closeDialogs(){document.querySelectorAll('dialog.game-dialog[open]').forEach(d=>d.close());}
  function openPanel(id){
    const current=document.querySelector('dialog[open]');
    const origin=current?.id==='pauseOverlay'?'pause':current?.id==='results'?'results':running()&&(!G.paused||G.countingDown)?'game':'title';
    panelOrigins.set(id,origin);
    if(running())pause(true,false);
    closeDialogs();renderMenu();
    if(id==='progressDialog'){$('gardenContext').textContent=running()?'GAME PAUSED':'ONE DROP AT A TIME';exposeReference();}
    if(id==='settingsDialog')$('settingsNote').textContent=running()?'Your current session is paused.':'Progress stays on this device when storage is available.';
    $(id).showModal();
    if(id==='progressDialog')renderProgress(true);
    $(id).querySelector('.dialog-close')?.focus({preventScroll:true});
    $(id).querySelector('.dialog-panel').scrollTop=0;
  }
  function closePanel(id){
    A.stop();$(id).close();
    const origin=panelOrigins.get(id);panelOrigins.delete(id);
    if(origin==='pause' && running())showPause();
    else if(origin==='game' && running())pause(false);
    else if(origin==='results' && G?.over)$('results').showModal();
  }
  function showMenu(){
    cancelCountdown();clearTimeout(milestoneTimer);clearTimeout(feedbackTimer);clearTimeout(heartTimer);feedbackQueue=[];feedbackPriority=-1;feedbackUntil=0;currentFeedback=null;
    $('milestoneFeedback').className='milestone-feedback';$('feedback').className='feedback';
    closeDialogs();$('welcome').classList.remove('hidden');$('gameHud').classList.add('hidden');$('answerDock').classList.add('hidden');
    document.body.classList.remove('is-playing');document.body.classList.add('is-menu');
    keyboardOpen=false;keyboard();enableSetup(true);$('fieldSpirit').className='spirit idle';document.body.classList.remove('low-hearts','heart-hit');$('heartLoss').classList.add('hidden');$('startBtn').focus({preventScroll:true});
    syncAnimationState();
    exposeLesson();
  }
  function showPause(){
    $('pauseOverlay').showModal();$('resumeBtn').focus({preventScroll:true});$('pauseOverlay').querySelector('.dialog-panel').scrollTop=0;
  }
  const rowNames={a:'Vowels',nn:'N',ky:'K combinations',sy:'SH combinations',ty:'CH combinations'};
  const facet=()=>FACET;
  const symbol=id=>id.slice(id.indexOf(':')+1);
  function unlocked(script){const rows=D.rowsOrder.slice(0,explore?D.rowsOrder.length:gd.rows[script]);return D.kana.filter(k=>k.script===script && rows.includes(k.row));}
  function candidates(mode=cfg.mode){
    if(mode==='hira')return unlocked('hiragana').map(k=>k.id);
    if(mode==='kata')return unlocked('katakana').map(k=>k.id);
    return [];
  }
  function modeAvailable(mode){return mode==='hira'||mode==='kata'&&(explore||gd.katakanaUnlocked);}
  function unlockKatakana(){
    if(explore||gd.katakanaUnlocked||gd.rows.hiragana<D.rowsOrder.length)return;
    if(D.kana.filter(k=>k.script==='hiragana').every(k=>readiness(k).ready)){gd.katakanaUnlocked=true;L.flush();}
  }
  function accepted(id){
    if(typeof id==='object')id=id.id;
    const k=D.kanaById[id];
    return k?[k.romaji,...k.alt]:[];
  }
  function fmt(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function escapeText(text){const el=document.createElement('span');el.textContent=text;return el.innerHTML;}
  function expose(id,name,reason,deferSave=false){
    L.recordExposure?.(id,name,{reason,gameId:GAME,sessionId:G?.sessionId,roundId:G?.target?.roundId,deferSave});
    G?.drops.forEach(d=>{if(d.id===id && d.facet===name){d.assistanceReasons.add(reason);d.hint=true;}});
  }
  function exposeReading(id,reason,deferSave=false){
    expose(id,FACET,reason,true);
    if(!deferSave)L.flush();
  }
  function exposeReference(){D.kana.filter(k=>k.script===mapScript).forEach(k=>exposeReading(k.id,'reference-panel',true));L.flush();}
  function exposeLesson(){const row=D.rowsOrder[(explore?D.rowsOrder.length:gd.rows[mapScript])-1];unlocked(mapScript).filter(k=>k.row===row).forEach(k=>exposeReading(k.id,'lesson-reference',true));L.flush();}
  async function playReading(id,reason){if(await A.play(symbol(id)))exposeReading(id,reason);}
  function clearFeedback(){clearTimeout(feedbackTimer);$('feedback').className='feedback';feedbackPriority=-1;feedbackUntil=0;currentFeedback=null;const next=feedbackQueue.shift();if(next)flash(next.text,next.bad,next.ms,next.priority,next.onShow);}
  function scheduleFeedback(){
    clearTimeout(feedbackTimer);if(!currentFeedback||G?.paused)return;
    feedbackUntil=performance.now()+currentFeedback.ms;feedbackTimer=setTimeout(clearFeedback,currentFeedback.ms);
  }
  function flash(text,bad=false,ms=1800,priority=bad?4:0,onShow=null){
    const now=performance.now();
    if(currentFeedback && (now<feedbackUntil || G?.paused)){
      if(priority===3&&feedbackPriority===3){feedbackQueue.push({text,bad,ms,priority,onShow});return;}
      if(priority<feedbackPriority){if(priority>0)feedbackQueue.push({text,bad,ms,priority,onShow});return;}
      if(priority>feedbackPriority&&feedbackPriority>0&&currentFeedback)feedbackQueue.unshift({...currentFeedback,ms:Math.max(1000,feedbackUntil-now)});
    }
    clearTimeout(feedbackTimer);feedbackPriority=priority;feedbackUntil=performance.now()+ms;
    currentFeedback={text,bad,ms,priority,onShow:null};
    $('feedback').textContent=text;$('feedback').className='feedback show'+(bad?' bad':'');
    onShow?.();scheduleFeedback();
  }
  function celebrate(text,kind='streak'){
    clearTimeout(milestoneTimer);$('milestoneFeedback').textContent=text;$('milestoneFeedback').className='milestone-feedback show';
    sfx(kind);milestoneTimer=setTimeout(()=>$('milestoneFeedback').className='milestone-feedback',2200);
  }
  function readiness(k){
    // Arcade progress rewards first-try hits; normal reading feedback must not block it.
    // Independent recall remains separate evidence in the learner's unchanged history.
    const f=L.state(k.id)?.facets[FACET],correct=f?.firstCorrect||0,attempts=f?.firstAttempts||0,accuracy=attempts?(correct/attempts):0;
    return {k,correct,accuracy,attempts,ready:correct>=2&&accuracy>=.85};
  }
  // Consecutive first-try hits that make a kana ready: at least 2 hits and 85% first-try accuracy (integer math).
  const hitsToReady=({correct,attempts})=>Math.max(0,2-correct,Math.ceil((85*attempts-100*correct)/15));
  function renderNextRow(script){
    const box=$('resultNext'),next=D.rowsOrder[gd.rows[script]];
    if(explore||!next&&script!=='hiragana'){box.innerHTML='';box.classList.add('hidden');return;}
    const rows=unlocked(script).map(readiness),pending=rows.filter(x=>!x.ready).map(x=>({k:x.k,need:hitsToReady(x)})).sort((a,b)=>a.need-b.need);
    const visible=pending.filter(({k})=>canShowFeedbackKana(k.id)).slice(0,4);
    const shown=visible.map(({k,need})=>`<span class="next-kana"><span lang="ja">${escapeText(k.char)}</span> +${need}</span>`).join(' '),more=pending.length-visible.length;
    const heading=next?'Next: '+(rowNames[next]||next.toUpperCase()+'-row'):pending.length?'Finish Hiragana':'Hiragana complete · Katakana ready';
    box.innerHTML=`<p class="next-heading"><b>${escapeText(heading)}</b><span class="next-ready">${rows.length-pending.length} / ${rows.length} kana ready</span></p>`+
      (pending.length?`<p class="next-needs"><span class="next-label">First-try hits to go</span> ${shown}${more>0?` <span class="next-more">+${more} more kana</span>`:''}</p>`:'');
    box.classList.remove('hidden');
  }
  function renderUnlocks(script){
    const count=gd.rows[script],next=D.rowsOrder[count],rows=unlocked(script).map(readiness),ready=rows.filter(x=>x.ready).length;
    $('unlockSummary').textContent=explore?'All rows available in exploration':!next?'All rows unlocked':`${ready} / ${rows.length} kana ready for the next row`;
    $('unlockBar').style.width=(rows.length?ready/rows.length*100:0)+'%';
    $('unlockDetails').innerHTML=rows.map(({k,correct,accuracy,attempts,ready})=>`<div class="unlock-item ${ready?'ready':'pending'}"><span lang="ja">${k.char}</span><span>${k.romaji}</span><small>${Math.min(2,correct)}/2 first-try hits · ${attempts?Math.floor(accuracy*100)+'%':'No answers yet'}</small><span aria-label="${ready?'Ready':'Keep practicing'}">${ready?'✓':'○'}</span></div>`).join('');
  }
  function spirit(mood){clearTimeout(spiritTimer);$('fieldSpirit').className='spirit '+mood;spiritTimer=setTimeout(()=>$('fieldSpirit').className='spirit idle',900);}
  function renderDifficulty(){
    $('difficultySelect').value=cfg.difficulty;$('difficultySelect').disabled=!!running();
    $('difficultyNote').textContent={easy:'New kana return more cautiously after mistakes or expired drops.',normal:'A balanced return of new kana after mistakes or expired drops.',hard:'New kana return sooner after mistakes or expired drops.'}[cfg.difficulty];
  }
  function changeDifficulty(id){
    if(running()||!Object.hasOwn(R.profiles,id))return;
    cfg.difficulty=id;N.setPace(novelty,R.profiles[id].pace);N.setPace(katakanaNovelty,R.profiles[id].pace);cfg.noveltyPace=N.profile(novelty).id;gd.difficulty=id;L.flush();renderMenu();
  }
  function renderMenu(){
    unlockKatakana();
    const names={hira:'Hiragana',kata:'Katakana'};
    [...$('mode').options].forEach(o=>{o.disabled=!modeAvailable(o.value);o.textContent=names[o.value]+(o.disabled?' · Complete Hiragana first':'');});
    if(!running()&&!modeAvailable(cfg.mode))cfg.mode='hira';$('mode').value=cfg.mode;$('mode').disabled=!!running();
    $('menuHint').innerHTML='Romaji · <kbd>Enter</kbd> to begin';
    document.querySelectorAll('[data-script]').forEach(b=>{b.disabled=b.dataset.script==='katakana'&&!modeAvailable('kata');});
    if(mapScript==='katakana'&&!modeAvailable('kata'))mapScript='hiragana';
    renderDifficulty();
    const sc=mapScript, rows=unlocked(sc), count=explore?D.rowsOrder.length:gd.rows[sc], row=D.rowsOrder[count-1];
    const current=rows.filter(k=>k.row===row);$('rowName').textContent=rowNames[row]||row.toUpperCase()+'-row';
    $('lesson').innerHTML=current.map(k=>`<button data-kana="${k.char}" data-known="${L.mastery(k.id,FACET)>=.55}" aria-label="Listen to ${k.char}, ${readingLabel(k.id)}">${k.char}<small>${readingLabel(k.id)}</small></button>`).join('');
    $('unlockNote').textContent=explore?'Exploration: all kana are available.':'Each available kana needs 2 correct first answers and at least 85% first-answer accuracy. Reading hints and pronunciation do not block unlocks.';
    const next=D.rowsOrder[count];$('milestone').textContent=next?'Meet '+(rowNames[next]||next.toUpperCase()+'-row'):'Your whole kana garden';
    $('milestoneKana').textContent=next?D.kana.filter(k=>k.script===sc && k.row===next).map(k=>k.char).join(' '):'Keep your reading growing';
    invalidateProgress();renderEffects();
  }
  function renderMap(){
    const items=D.kana.filter(k=>k.script===mapScript), available=new Set(unlocked(mapScript).map(k=>k.id));
    $('masteryMap').innerHTML=items.map(k=>{const m=L.mastery(k.id,FACET);const cls=m===0?'new':m<.55?'learning':m<.75?'known':'strong';return `<button class="${cls} ${available.has(k.id)?'':'locked'} ${k.kind==='yoon'?'compound':''}" data-kana="${k.char}" title="${k.char} · ${readingLabel(k.id)} · ${Math.round(m*100)}% familiarity" aria-label="Listen to ${k.char}, ${readingLabel(k.id)}, ${Math.round(m*100)} percent familiarity">${k.char}</button>`;}).join('');
    const known=items.filter(k=>L.mastery(k.id,FACET)>=.55).length, pct=Math.round(known/items.length*100);
    $('masteryCount').textContent=`${known} / ${items.length} familiar`;$('masteryPercent').textContent=pct+'%';$('masteryBar').style.width=pct+'%';
    $('totalLearned').textContent=D.kana.filter(k=>L.mastery(k.id,FACET)>=.55).length;
  }
  function renderLearningStats(){
    const events=(L.attempts?.()||[]).filter(e=>e.gameId===GAME&&e.facet===FACET&&D.kanaById[e.itemId]);
    const independent=events.filter(e=>e.firstAttempt&&e.outcome!=='timeout'&&e.assistance===false),correct=independent.filter(e=>e.correct).length,help=events.filter(e=>e.correct&&e.assistance===true).length;
    $('learningStats').innerHTML=`<p><strong>${correct}/${independent.length}</strong> independent first answers · <strong>${help}</strong> correct answers with help.</p><p>Reading hints, recent audio and corrections count as help. Familiarity estimates practice; it does not prove long-term retention.</p>`;
  }
  function enableSetup(value){for(const id of ['mode','difficultySelect'])$(id).disabled=!value;$('startBtn').disabled=!value;if(value)renderMenu();else renderDifficulty();}
  function cancelCountdown(){if(G)G.countingDown=false;$('countdownOverlay').classList.add('hidden');stopLoop();}
  function beginCountdown(title='Ready for the rain?'){
    if(!running())return;
    if(!G.paused){G.paused=true;G.pauseAt=performance.now();}
    G.countingDown=true;G.countdownEnd=performance.now()+3000;G.countdownValue=3;
    $('countdownTitle').textContent=title;$('countdownNumber').textContent='3';$('countdownOverlay').classList.remove('hidden');
    $('answer').disabled=true;$('submitBtn').disabled=true;$('skipCountdown').focus({preventScroll:true});sfx('tick');
    syncAnimationState();wakeLoop();
  }
  function completeCountdown(){
    if(!running()||!G.countingDown)return;cancelCountdown();
    const now=performance.now();G.drops.forEach(d=>d.pausedMs+=Math.max(0,now-Math.max(G.pauseAt??now,d.born)));
    if(G.inputStartedAt!=null)G.inputPausedMs+=Math.max(0,now-Math.max(G.pauseAt??now,G.inputStartedAt));
    G.paused=false;G.last=now;$('answer').disabled=false;$('submitBtn').disabled=false;focusAnswer();spirit('idle');
    scheduleFeedback();
    // Count real gameplay once; countdowns on pause/resume are not new sessions.
    if(!G.analyticsStarted){G.analyticsStarted=true;window.NihongoAnalytics?.track('practice_start',{practice_mode:G.reviewIds?'review':G.mode});}
    syncAnimationState();wakeLoop();
  }
  function start(options={}){
    if(G&&!G.over)return;
    stopLoop();clearTimeout(feedbackTimer);clearTimeout(milestoneTimer);clearTimeout(heartTimer);feedbackPriority=-1;feedbackUntil=0;currentFeedback=null;feedbackQueue=[];
    $('feedback').className='feedback';$('milestoneFeedback').className='milestone-feedback';$('heartLoss').classList.add('hidden');document.body.classList.remove('heart-hit');$('field').querySelectorAll('.drop,.effect').forEach(e=>e.remove());
    const profile=R.profiles[cfg.difficulty],weather=R.atTime(cfg.difficulty,0);
    const reviewIds=Array.isArray(options.reviewIds)?[...new Set(options.reviewIds)].filter(id=>candidates().includes(id)):null;
    const sessionDuration=reviewIds?.length?60:cfg.duration,now=performance.now();
    gd.difficulty=cfg.difficulty;L.flush();
    G={mode:cfg.mode,playStyle:'arcade',sessionId:L.beginSession?.(GAME)||`${GAME}:${Date.now()}`,roundSerial:0,events:[],inputStartedAt:null,inputPausedMs:0,difficulty:cfg.difficulty,totalLives:3,t:sessionDuration,sessionDuration,reviewIds:reviewIds?.length?reviewIds:null,elapsed:0,lives:3,streak:0,bestStreak:0,correct:0,errors:0,attempts:0,expirations:0,drops:[],queue:[],confs:new Set(),missed:new Set(),mistakes:new Set(),newIds:new Set(),last:now,pauseAt:now,sinceSpawn:0,speed:weather.speed,gap:weather.gap,paused:true,countingDown:false,over:false,target:null,lastWarning:-10};
    closeDialogs();$('welcome').classList.add('hidden');$('gameHud').classList.remove('hidden');$('answerDock').classList.remove('hidden');
    document.body.classList.remove('is-menu');document.body.classList.add('is-playing');
    $('answer').disabled=false;$('submitBtn').disabled=false;$('answer').value='';
    $('gameLabel').textContent=(G.reviewIds?'Review · ':'')+profile.name+' · '+({hira:'Hiragana',kata:'Katakana'}[cfg.mode]);
    $('lives').classList.remove('hidden');enableSetup(false);hud();keyboardOpen=mobile();resetPad();keyboard();focusAnswer();
    fitField();initializeRounds();syncAnimationState();wakeLoop();
  }
  function initializeRounds(){
    G.familiarSinceIntroduction=0;
    G.pauseAt=performance.now();refill();
    if(!G.queue.length||!G.queue[0]){end('No eligible items yet. Open the garden and unlock more kana.','manual_finish');return;}
    if(!spawn(nextEntry())){end('No familiar items in this review yet. Start a regular rain first.','manual_finish');return;}
    updateTarget();beginCountdown();
  }
  // Admission controls first presentations, never the unlocked repertoire or rain curve.
  const starter=id=>D.kanaById[id]?.row==='a';
  function canPresent(id){
    if(!D.kanaById[id])return false;
    // Keep the debut identity until its drop leaves, even though it is now persisted as seen.
    if(G.drops.some(d=>d.id===id&&d.isIntroduction))return false;
    if(N.hasSeen(novelty,id))return true;
    if(G.drops.some(d=>d.isIntroduction))return false;
    const known=(G.reviewIds||candidates()).some(id=>N.hasSeen(novelty,id));
    // Bootstrap an empty alphabet; once familiar content exists, vowels respect both brakes.
    if(starter(id)&&!known)return true;
    if((G.mode==='kata'?katakanaNovelty:novelty).blocked||novelty.cooldownRemaining>0)return false;
    if(starter(id))return true;
    // Katakana practice can move on once an introduced Katakana is ready;
    // keep every debut in the session history and retain Hiragana's total limit.
    const learning=G.mode==='kata'?[...G.newIds].filter(id=>!readiness(D.kanaById[id]).ready).length:G.newIds.size;
    return learning<N.constants.maxNew&&(!known||G.familiarSinceIntroduction>=N.constants.warmup);
  }
  function nextEntry(){
    if(!G.queue.length)refill();
    let index=G.queue.findIndex(e=>canPresent(e.id));
    if(index<0){
      // A queued debut may become blocked after a miss. Keep it deferred and keep the rain going.
      const known=(G.reviewIds||candidates()).filter(id=>N.hasSeen(novelty,id)&&canPresent(id));
      const plan=L.selectRound(known,{facet:facet(),size:8,maxNew:8});
      G.queue.push(...plan.map(id=>({id})));
      index=G.queue.findIndex(e=>canPresent(e.id));
    }
    return index<0?null:G.queue.splice(index,1)[0];
  }
  function refill(){
    const plan=L.selectRound(G.reviewIds||candidates(),{facet:facet(),size:8,maxNew:3});
    // Seed the first garden in curriculum order; reviews are interleaved thereafter.
    if(G.attempts)L.shuffle(plan);
    plan.forEach(id=>G.queue.push({id}));
  }
  function generateRound(plan,rng=Math.random){if(!D.kanaById[plan.id])throw new RangeError('Only kana can appear in Kana Rain.');return {id:plan.id,x:rng(),facet:FACET,responseFormat:'romaji'};}
  function render(root,round){
    const id=round.id,st=L.state(id),f=st?.facets[round.facet];
    const hint=!f || f.correct===0;
    const el=document.createElement('div');el.className='drop';el.dataset.id=id;el.setAttribute('lang','ja');
    const glyph=document.createElement('span');glyph.textContent=symbol(id);el.appendChild(glyph);
    if(hint){const h=document.createElement('span');h.className='hint';h.textContent=readingLabel(id);el.appendChild(h);}
    root.appendChild(el);return {el,hint};
  }
  function spawn(entry,xHint){
    if(!entry||!canPresent(entry.id))return;
    const isIntroduction=!N.hasSeen(novelty,entry.id);
    const round=generateRound(entry),view=render($('field'),round),w=view.el.offsetWidth,h=view.el.offsetHeight,W=fieldSize.width;
    let x=xHint;
    if(x==null){for(let tries=0;tries<10;tries++){x=12+Math.random()*Math.max(1,W-w-24);if(!G.drops.some(d=>d.y<110 && Math.abs(d.x-x)<w+8))break;}}
    x=Math.max(5,Math.min(W-w-5,x));
    const prior=L.assistanceFor?.(round.id,round.facet)||{assisted:false,reasons:[]};
    const d={...round,...view,hint:view.hint||prior.assisted,roundId:`${G.sessionId}:r:${++G.roundSerial}`,attemptCount:0,assistanceReasons:new Set([...(view.hint?['initial-reading']:[]),...(prior.assisted?prior.reasons:[])]),firstResponseMs:null,x,y:8,progress:0,w,h,wrong:0,v:1,born:performance.now(),pausedMs:0};
    d.isIntroduction=isIntroduction;
    if(isIntroduction){N.markSeen(novelty,d.id);if(!starter(d.id))G.newIds.add(d.id);G.familiarSinceIntroduction=0;}
    if(katakanaIds.has(d.id))N.markSeen(katakanaNovelty,d.id);
    G.drops.push(d);dropResizeObserver.observe(d.el);if(view.hint)exposeReading(d.id,'initial-reading');else if(isIntroduction)L.flush();place(d);return d;
  }
  function place(d){d.el.style.transform=`translate(${d.x}px,${d.y}px)`;}
  function positionDrop(d,H=fieldSize.height){
    const floor=Math.max(8,H-d.h-27);
    d.y=8+d.progress*(floor-8);place(d);
  }
  function loop(now){
    raf=0;
    if(!G||G.over)return;const dt=Math.min(.1,Math.max(0,(now-G.last)/1000));G.last=now;
    if(G.countingDown){
      const remaining=Math.min(3,Math.ceil((G.countdownEnd-now)/1000));
      if(remaining<=0)completeCountdown();
      else if(remaining!==G.countdownValue){G.countdownValue=remaining;$('countdownNumber').textContent=remaining;sfx('tick');}
      wakeLoop();return;
    }
    if(!G.paused){
      G.t-=dt;G.elapsed+=dt;G.sinceSpawn+=dt*1000;if(G.t<=0){completePendingAnswer();end('Session complete','timer_elapsed');return;}
      // Complete an exact prefix after a brief typing pause; active time freezes with play.
      if(G.pendingAnswer){G.pendingAnswer.remaining-=dt;if(G.pendingAnswer.remaining<=0)completePendingAnswer();}
      if(G.over||G.paused)return;
      const weather=R.atTime(G.difficulty,rainSeconds());G.speed=weather.speed;G.gap=weather.gap;
      if(!G.queue.length)refill();
      const cap=Math.min(R.profiles[G.difficulty].maxDrops,2+Math.floor(G.correct/8));
      if(G.drops.length<cap && G.sinceSpawn>G.gap && G.queue.length){
        const e=nextEntry(),d=spawn(e);
        if(d){
          if(e.partner && G.drops.length<cap&&!spawn({id:e.partner},d.x+d.w+8))G.queue.push({id:e.partner});
          G.sinceSpawn=0;
        }
      }
      const H=fieldSize.height;
      [...G.drops].forEach(d=>{if(G.over)return;d.progress+=G.speed*d.v*dt;
        if(d.progress>=1){
          // A correct answer entered in time must not lose a heart to our ambiguity delay.
          if(G.pendingAnswer?.drop===d)completePendingAnswer();
          if(G.drops.includes(d))miss(d);return;
        }positionDrop(d,H);
        const danger=d.progress>=.78;if(d.danger!==danger){d.danger=danger;d.el.classList.toggle('danger',danger);}
        if(danger&&!d.warned){d.warned=true;if(G.elapsed-G.lastWarning>=3){sfx('warning');G.lastWarning=G.elapsed;}}
      });
      const danger=G.drops.some(d=>d.progress>=.78);if(G.dangerActive!==danger){G.dangerActive=danger;$('field').querySelector('.waterline').classList.toggle('danger-active',danger);}
      updateTarget();statText('time',fmt(G.t));
    }
    wakeLoop();
  }
  // Adaptive rain: the shared curve reads an effective time that each correct answer advances
  // and each expiration steps back, so the pace follows the player instead of the clock.
  const RAIN_SECONDS_PER_HIT=1.6,RAIN_SECONDS_PER_EXPIRATION=20;
  function rainSeconds(){return Math.max(0,G.correct*RAIN_SECONDS_PER_HIT-G.expirations*RAIN_SECONDS_PER_EXPIRATION);}
  function lowest(){return G?.drops.reduce((a,b)=>!a||b.y>a.y?b:a,null);}
  function updateTarget(){
    const t=lowest();if(t===G.target)return;
    G.target?.el.classList.remove('target');G.target=t;t?.el.classList.add('target');
    // The pad never changes with the drops; only the shared guidance is refreshed.
    renderPadPrompt();
    $('inputScript').textContent='a';
    $('inputFormat').textContent='Type romaji';
    $('targetHint').textContent='Any drop · highlighted first';
    $('inputNote').textContent='Answers flow automatically. Enter to submit.';
  }
  function score(round,response){return [{...response,itemId:round.id,facet:round.facet||FACET,responseFormat:round.responseFormat||'romaji',gameId:GAME}];}
  function record(d,correct,detail={}){
    const now=performance.now(),displayActiveMs=Math.max(0,now-d.born-d.pausedMs),firstAttempt=d.attemptCount===0;
    const inputActiveMs=G.inputStartedAt==null?null:Math.max(0,now-G.inputStartedAt-G.inputPausedMs);
    if(firstAttempt&&detail.outcome!=='timeout')d.firstResponseMs=displayActiveMs;
    const prior=L.assistanceFor?.(d.id,d.facet)||{assisted:false,reasons:[],delaySinceExposureMs:null};
    const reasons=[...d.assistanceReasons,...(prior.assisted?prior.reasons:[])];
    if(d.wrong)reasons.push('previous-incorrect-attempt');
    const ev=score(d,{...detail,deferSave:true,correct,sessionId:G.sessionId,roundId:d.roundId,attemptId:`${d.roundId}:a:${++d.attemptCount}`,firstAttempt,assistance:reasons.length>0,assistanceReasons:[...new Set(reasons)],firstResponseMs:d.firstResponseMs,inputActiveMs,displayActiveMs,waitMs:inputActiveMs==null?null:Math.max(0,displayActiveMs-inputActiveMs),delaySinceExposureMs:prior.delaySinceExposureMs})[0];
    L.record(ev.itemId,ev.facet,ev);G.events.push(ev);G.inputStartedAt=null;G.inputPausedMs=0;
    // Count submitted answers, not keystrokes or unique kana. Expirations are separate.
    if(detail.outcome!=='timeout'){G.attempts++;if(correct===true)G.correct++;else if(correct===false)G.errors++;}
    const stat=gd.accuracy[cfg.mode] || (gd.accuracy[cfg.mode]={attempts:0,correct:0});
    if(detail.outcome!=='timeout'){stat.attempts++;if(correct)stat.correct++;}
    if(correct===false){N.pause(novelty);if(G.mode==='kata')N.pause(katakanaNovelty);G.familiarSinceIntroduction=0;}
    if(correct||detail.outcome==='timeout'){
      // Earlier wrong answers make this a reading miss, unless the drop was the kana's debut.
      const outcome={roundId:d.roundId,firstCorrect:correct===true&&firstAttempt,timeout:detail.outcome==='timeout',miss:!d.isIntroduction&&!firstAttempt,familiar:!d.isIntroduction,failureRecorded:!firstAttempt};
      N.finish(novelty,outcome);if(G.mode==='kata')N.finish(katakanaNovelty,outcome);
      if(detail.outcome==='timeout'||!firstAttempt)G.familiarSinceIntroduction=0;
      else if(!d.isIntroduction)G.familiarSinceIntroduction++;
    }
    L.flush();return ev;
  }
  function effect(d,type){const e=document.createElement('div');e.className='effect '+type;e.style.left=d.x+'px';e.style.top=Math.max(0,d.y)+(type==='ripple'?d.h-45:20)+'px';$('field').appendChild(e);setTimeout(()=>e.remove(),600);}
  function remove(d,pop=false){if(G.pendingAnswer?.drop===d)G.pendingAnswer=null;dropResizeObserver.unobserve?.(d.el);G.drops=G.drops.filter(x=>x!==d);if(pop){d.el.classList.add('pop');setTimeout(()=>d.el.remove(),220);}else d.el.remove();}
  function hit(d){
    record(d,true,{response:d.submittedResponse,reason:'accepted',inputMethod:d.submittedMethod});G.streak=d.wrong?0:G.streak+1;
    G.bestStreak=Math.max(G.bestStreak,G.streak);
    playReading(d.id,'answer-feedback');
    flash(`${symbol(d.id)} · ${readingLabel(d.id)} ✓`,false,1000,0,()=>exposeReading(d.id,'answer-feedback'));
    if([5,10,20].includes(G.streak))celebrate(`${G.streak} in a row!`);
    effect(d,'splash');spirit('happy');remove(d,true);checkUnlock();hud();invalidateProgress();updateTarget();
  }
  function confusionFor(d,text){
    if(text===symbol(d.id))return {reason:'copied-prompt',candidateItemIds:[]};
    const k=D.kanaById[d.id],options=D.kana.filter(x=>x.script===k.script&&x.id!==d.id&&[x.romaji,...x.alt].includes(text));
    return {chosenItemId:options.length===1?options[0].id:null,candidateItemIds:options.map(x=>x.id),reason:options.length>1?'ambiguous-reading':options.length?'different-item':/[ぁ-ヿ]/.test(text)?'wrong-response-format':'unrecognized-response'};
  }
  function wrong(d,text,method='typing'){
    const detail=confusionFor(d,text),chosen=D.kanaById[detail.chosenItemId];
    record(d,false,{...detail,response:text,inputMethod:method});G.mistakes.add(d.id);d.wrong++;d.v=Math.min(2.2,d.v*1.45);d.el.classList.add('stained');G.streak=0;spirit('worried');
    const visibleChosen=chosen&&canShowFeedbackKana(chosen.id);
    flash(`${symbol(d.id)} = ${readingLabel(d.id)}. You ${method==='composer'?'chose':'typed'} ${feedbackResponse(text)}${visibleChosen?' → '+chosen.char:''}.`,true,3500,4,()=>exposeReading(d.id,'correction'));playReading(d.id,'correction');
    if(visibleChosen && (G.reviewIds||candidates()).includes(chosen.id)){G.confs.add(d.id+'|'+chosen.id);G.queue=G.queue.filter(e=>e.id!==d.id && e.id!==chosen.id);G.queue.splice(Math.min(2,G.queue.length),0,{id:d.id,partner:chosen.id});}
    else G.queue.splice(Math.min(2,G.queue.length),0,{id:d.id});hud();invalidateProgress();
  }
  function miss(d){
    if(G.over||!G.drops.includes(d))return;record(d,null,{outcome:'timeout',reason:'timeout'});G.missed.add(d.id);G.lives--;G.expirations++;G.streak=0;
    G.pendingAnswer=null;$('answer').value='';resetPad();
    flash(`Lost a heart. ${symbol(d.id)} = ${readingLabel(d.id)}.`,true,3500,4,()=>exposeReading(d.id,'timeout-feedback'));
    playReading(d.id,'timeout-feedback');
    clearTimeout(heartTimer);document.body.classList.remove('heart-hit');void $('heartLoss').offsetWidth;document.body.classList.add('heart-hit');$('heartLoss').classList.remove('hidden');
    sfx('heart');heartTimer=setTimeout(()=>{document.body.classList.remove('heart-hit');$('heartLoss').classList.add('hidden');},900);
    spirit('worried');effect(d,'ripple');remove(d);G.queue.splice(Math.min(2,G.queue.length),0,{id:d.id});hud();invalidateProgress();
    if(G.lives===0)end(`All 3 hearts lost · ${R.profiles[G.difficulty].name}`,'hearts_lost');
    else updateTarget();
  }
  function checkUnlock(){
    if(explore)return;
    const scripts=cfg.mode==='hira'?['hiragana']:['katakana'];
    scripts.forEach(sc=>{if(gd.rows[sc]>=D.rowsOrder.length)return;
      if(unlocked(sc).every(k=>readiness(k).ready)){
        gd.rows[sc]++;L.flush();const row=D.rowsOrder[gd.rows[sc]-1];
        const label=sc==='katakana'?(rowNames[row]||row.toUpperCase()+'-row'):D.kana.filter(k=>k.script===sc && k.row===row).map(k=>k.char).join(' ');
        flash('A new row is growing: '+label,false,4000,3);sfx('unlock');G.queue=[];
      }
    });
    unlockKatakana();
  }
  function submitMatchedAnswer(drop,value,method='typing'){
    G.pendingAnswer=null;drop.submittedResponse=value;drop.submittedMethod=method;$('answer').value='';hit(drop);
  }
  // A completed composition is a deliberate answer, like Enter: it never waits for a longer reading.
  function submitComposed(cell){
    const v=cell.reading,ordered=[...G.drops].sort((a,b)=>b.y-a.y);
    // The exact cell settles homophones (じ/ぢ, ず/づ, お/を); any drop with the same accepted sound still counts.
    const match=ordered.find(d=>{const k=D.kanaById[d.id];return k.row===cell.row&&k.col===cell.col;})||ordered.find(d=>accepted(d).includes(v));
    const target=padTarget&&G.drops.includes(padTarget)?padTarget:lowest();
    resetPad();G.pendingAnswer=null;$('answer').value='';
    if(match)submitMatchedAnswer(match,v,'composer');
    else if(target)wrong(target,v,'composer');
  }
  function choosePadFamily(id){
    if(!padCells[id])return;
    if(G.inputStartedAt==null){G.inputStartedAt=performance.now();G.inputPausedMs=0;}
    // An unmatched composition belongs to the drop that was highlighted when it began.
    padFamily=id;padTarget=G.target;padChangedAt=performance.now();renderPad();
  }
  function resetPad(){if(padFamily)padChangedAt=performance.now();padFamily=null;padTarget=null;renderPad();}
  function completePendingAnswer(){
    const pending=G.pendingAnswer;G.pendingAnswer=null;
    if(pending&&!composing&&normalize($('answer').value)===pending.value&&G.drops.includes(pending.drop))submitMatchedAnswer(pending.drop,pending.value);
  }
  function onInput(force=false){
    if(G)G.pendingAnswer=null;
    if(!G||G.over||G.paused||composing)return;const v=normalize($('answer').value);if(!v)return;
    if(G.inputStartedAt==null){G.inputStartedAt=performance.now();G.inputPausedMs=0;}
    const matches=[...G.drops].sort((a,b)=>b.y-a.y);const match=matches.find(d=>accepted(d).includes(v));
    const longer=G.drops.some(d=>accepted(d).some(a=>a.length>v.length&&a.startsWith(v)));
    if(match){
      if(force||!longer)submitMatchedAnswer(match,v);
      else G.pendingAnswer={drop:match,value:v,remaining:.3};
      return;
    }
    if(force){const t=lowest();if(t)wrong(t,v,'typing');$('answer').value='';$('answer').classList.add('bad');setTimeout(()=>$('answer').classList.remove('bad'),300);}
  }
  function hud(){
    statText('correctCount',G.correct);
    statText('streak',G.streak>1?'×'+G.streak:'—');
    statText('time',fmt(G.t));
    $('lives').textContent='♥ '.repeat(G.lives)+'♡ '.repeat(G.totalLives-G.lives);
    $('lives').setAttribute('aria-label',`${G.lives} of 3 hearts remaining`);document.body.classList.toggle('low-hearts',G.lives===1);
  }
  function pause(value=(G?.countingDown||!G?.paused),showDialog=true){
    if(!running())return;
    if(value)cancelCountdown();
    if(G.paused===value){if(value){stopLoop();syncAnimationState();if(showDialog&&!document.querySelector('dialog[open]'))showPause();}return;}
    if(value){if(currentFeedback)currentFeedback.ms=Math.max(0,feedbackUntil-performance.now());clearTimeout(feedbackTimer);G.paused=true;G.pauseAt=performance.now();A.stop();spirit('sleep');$('pauseHint').textContent='';if(showDialog){closeDialogs();showPause();}}
    else{
      if($('pauseOverlay').open)$('pauseOverlay').close();
      beginCountdown('Ready to continue?');
    }
    G.last=performance.now();
    if(value)stopLoop();syncAnimationState();
  }
  function dispose(){cancelCountdown();A.stop();feedbackQueue=[];clearFeedback();if(G){G.pendingAnswer=null;G.over=true;G.drops.forEach(d=>{dropResizeObserver.unobserve?.(d.el);d.el.remove();});G.drops=[];}resetPad();syncAnimationState();L.flush();}
  function end(reason,completionReason='manual_finish'){
    if(!G||G.over)return;
    const firstCorrect=G.events.filter(e=>e.firstAttempt&&e.correct),corrected=G.events.filter(e=>e.correct&&!e.firstAttempt);
    // Keep historical point records intact; counts never overwrite or convert those values.
    gd.sessions=(gd.sessions||0)+1;L.flush();
    // Explicit end reasons, never inferred from UI copy; no answer, count, or item data leaves the app.
    if(G.analyticsStarted)window.NihongoAnalytics?.track('practice_complete',{practice_mode:G.reviewIds?'review':G.mode,completion_reason:completionReason});
    $('resultTitle').textContent=G.correct?'Nice practice!':'Ready for another rain?';
    $('resultMessage').textContent=reason+'. '+(G.correct?'Every answer is practice.':'Listen to a few kana, then try again.');
    $('resultStats').innerHTML=`<div><b>${G.correct}</b><small>CORRECT ANSWERS</small></div><div><b>${G.errors}</b><small>WRONG ANSWERS</small></div><div><b>${G.expirations}</b><small>EXPIRED DROPS</small></div>`;
    $('resultDetails').textContent=`${firstCorrect.length} first-try · ${corrected.length} after correction · Best streak ${G.bestStreak}`;
    renderNextRow(cfg.mode==='kata'?'katakana':'hiragana');
    const review=[...new Set([...G.mistakes,...G.missed,...[...G.confs].flatMap(c=>c.split('|'))])].filter(canShowFeedbackKana);
    lastReview=review.filter(id=>candidates().includes(id));$('reviewPracticeBtn').classList.toggle('hidden',!lastReview.length);
    $('resultReview').innerHTML=review.length?'<p class="review-heading"><b>A little more practice</b><span class="review-hint">Tap to listen</span></p><div class="review-grid">'+review.map(id=>{
      const char=symbol(id),reading=readingLabel(id);
      const tag=A.hasRecording(char)?'button':'div';
      return `<${tag} class="review-card" ${tag==='button'?`type="button" data-kana="${escapeText(char)}" aria-label="Listen to ${escapeText(char)}, ${escapeText(reading)}"`:''}><span lang="ja">${escapeText(char)}</span><small>${escapeText(reading)}</small>${tag==='button'?'<span class="review-audio" aria-hidden="true">♪</span>':''}</${tag}>`;
    }).join('')+'</div>':`<p class="review-empty">${G.correct?'Keep the streak growing.':'Listen to the current row, then try again.'}</p>`;
    review.forEach(id=>exposeReading(id,'results-review',true));L.flush();
    dispose();closeDialogs();$('results').showModal();$('answer').disabled=true;$('submitBtn').disabled=true;enableSetup(true);$('answer').blur();$('againBtn').focus({preventScroll:true});$('results').querySelector('.dialog-panel').scrollTop=0;
  }
  function keyboard(){
    $('keyboard').classList.toggle('hidden',!keyboardOpen);$('keyboardBtn').setAttribute('aria-expanded',keyboardOpen);
    $('keyboardBtn').setAttribute('aria-label',keyboardOpen?'Use the device keyboard':'Show the sound pad');
    $('keyboardBtn').querySelector('use')?.setAttribute('href',keyboardOpen?'#icon-keyboard':'#icon-pad');
    document.body.dataset.keyboard=String(keyboardOpen);document.body.classList.toggle('has-keyboard',keyboardOpen);
    $('answer').inputMode=mobile()&&keyboardOpen?'none':'text';
    if(keyboardOpen&&keyboardSignature!=='sound-pad'){
      // Built once: both stages keep fixed positions and never depend on the falling kana.
      keyboardSignature='sound-pad';
      const face=([,name,main,alt])=>main?`<span class="pad-main">${main}</span><span class="pad-alt">${alt}</span>`:name.length>1?`<span class="pad-word">${name}</span>`:`<span class="pad-main">${name}</span>`;
      const families=PAD_FAMILIES.map(f=>`<button type="button" data-family="${f[0]}" aria-label="${f[1]} family">${face(f)}</button>`).join('');
      const slots=PAD_SLOTS.map(slot=>`<button type="button" data-slot="${slot}" class="${slot==='n'?'final-n':slot.length>1?'yoon':'vowel'}" disabled aria-hidden="true"></button>`).join('');
      $('keyboard').innerHTML=`<div class="pad-families" role="group" aria-label="Sound families">${families}</div><div class="pad-sounds" role="group" aria-label="Sounds in the chosen family">${slots}<button type="button" class="pad-back" data-pad="back" aria-label="Back to the sound families">‹ Back</button></div>`;
    }
    renderPad();
  }
  function renderPadPrompt(){
    const label=PAD_FAMILIES.find(f=>f[0]===padFamily)?.[1];
    $('answer').placeholder=!keyboardOpen?'Type the sound here…':label?label+' → choose the sound':'Family → sound · any drop';
  }
  function renderPad(){
    renderPadPrompt();
    const pad=$('keyboard');pad.dataset.stage=padFamily?'sound':'family';
    if(keyboardSignature!=='sound-pad')return;
    const cells=padCells[padFamily]||{};
    pad.querySelectorAll('[data-slot]').forEach(b=>{const cell=cells[b.dataset.slot];textIfChanged(b,cell?cell.reading:'');b.disabled=!cell;b.setAttribute('aria-hidden',String(!cell));});
  }
  function renderEffects(){document.body.classList.toggle('reduce-effects',!!gd.reducedEffects);$('effectsBtn').setAttribute('aria-pressed',!!gd.reducedEffects);$('effectsBtn').textContent='Reduced effects: '+(gd.reducedEffects?'On':'Off');}
  $('startBtn').onclick=$('againBtn').onclick=start;
  $('backBtn').onclick=showMenu;
  $('mode').onchange=()=>{if(running())return;const selected=$('mode').value;if(modeAvailable(selected))cfg.mode=selected;renderMenu();};
  $('difficultySelect').onchange=()=>changeDifficulty($('difficultySelect').value);
  document.querySelectorAll('[data-script]').forEach(b=>b.onclick=()=>{mapScript=b.dataset.script;document.querySelectorAll('[data-script]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b);});renderMenu();if($('progressDialog').open)exposeReference();else if(!$('welcome').classList.contains('hidden'))exposeLesson();});
  const listen=async e=>{const b=e.target.closest('[data-kana]');if(b){const k=D.kana.find(k=>k.char===b.dataset.kana);if(!k)return;if(running())pause(true,false);exposeReading(k.id,'reference-audio');if(!await A.play(b.dataset.kana)&&A.enabled)flash('Audio is unavailable. The lesson reading is shown on the tile.',true);}};
  $('lesson').onclick=$('masteryMap').onclick=$('resultReview').onclick=listen;
  $('listenBtn').onclick=async()=>{const t=lowest();if(t){pause(true);const reading=symbol(t.id)+' = '+readingLabel(t.id);$('pauseHint').textContent=reading;exposeReading(t.id,'target-help');await A.play(symbol(t.id));}};
  function renderSound(){const b=$('soundBtn');b.querySelector('use').setAttribute('href',A.enabled?'#icon-sound':'#icon-muted');b.querySelector('.control-label').textContent=A.enabled?'Sound on':'Sound off';b.setAttribute('aria-pressed',A.enabled);b.setAttribute('aria-label',A.enabled?'Mute sound':'Enable sound');b.title=A.enabled?'Mute sound':'Enable sound';}
  $('soundBtn').onclick=()=>{A.enabled=!A.enabled;gd.sound=A.enabled;L.flush();renderSound();if(A.enabled)sfx('menu');};
  $('effectsBtn').onclick=()=>{gd.reducedEffects=!gd.reducedEffects;L.flush();renderEffects();};
  $('skipCountdown').onclick=completeCountdown;
  $('reviewPracticeBtn').onclick=()=>start({reviewIds:lastReview});
  $('pauseBtn').onclick=()=>pause();$('resumeBtn').onclick=()=>pause(false);$('finishBtn').onclick=()=>end('Session finished');
  $('answerForm').onsubmit=e=>{e.preventDefault();onInput(true);};$('answer').oninput=()=>onInput();
  $('answer').oncompositionstart=()=>{composing=true;if(G)G.pendingAnswer=null;if(G?.inputStartedAt==null&&!G?.paused&&running()){G.inputStartedAt=performance.now();G.inputPausedMs=0;}};$('answer').oncompositionend=()=>{composing=false;onInput();};
  $('keyboardBtn').onclick=()=>{keyboardOpen=!keyboardOpen;if(!keyboardOpen)resetPad();keyboard();if(keyboardOpen)$('answer').blur();else focusAnswer();};
  $('keyboard').onclick=e=>{
    const b=e.target.closest('[data-family],[data-slot],[data-pad]');
    if(!b||b.disabled||!running()||G.paused||G.countingDown)return;
    // A pointer click a few frames after the stage changed is a bounce or ghost tap, not a choice.
    if(e.detail>0&&performance.now()-padChangedAt<PAD_BOUNCE_MS)return;
    // Each press only acts in its own stage, so a stale press can never skip a step.
    if(b.dataset.family){if(!padFamily)choosePadFamily(b.dataset.family);}
    else if(b.dataset.slot){const cell=padCells[padFamily]?.[b.dataset.slot];if(cell)submitComposed(cell);}
    else if(b.dataset.pad==='back'&&padFamily)resetPad();
  };
  $('gardenBtn').onclick=$('progressBtn').onclick=$('pauseGardenBtn').onclick=()=>openPanel('progressDialog');
  $('closeGarden').onclick=$('returnGarden').onclick=()=>closePanel('progressDialog');
  $('settingsBtn').onclick=$('pauseSettingsBtn').onclick=()=>openPanel('settingsDialog');
  $('closeSettings').onclick=$('saveSettings').onclick=()=>closePanel('settingsDialog');
  $('helpBtn').onclick=$('pauseHelpBtn').onclick=()=>openPanel('helpDialog');$('closeHelp').onclick=()=>closePanel('helpDialog');
  $('resetBtn').onclick=()=>{if(!confirm('Reset all learning progress on this device?'))return;dispose();L.reset();gd=L.gameData(GAME);gd.rows={hiragana:1,katakana:1};gd.katakanaUnlocked=false;gd.best={};gd.accuracy={};novelty=N.create(gd);katakanaNovelty=createKatakanaNovelty();cfg.mode='hira';cfg.difficulty='easy';cfg.noveltyPace=N.profile(novelty).id;L.flush();$('answer').disabled=true;$('submitBtn').disabled=true;showMenu();};
  $('exportBtn').onclick=()=>{const blob=new Blob([L.export()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kana-rain-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.querySelectorAll('dialog.game-dialog').forEach(d=>d.addEventListener('cancel',e=>{e.preventDefault();if(d.id==='pauseOverlay')pause(false);else if(d.id==='results')showMenu();else closePanel(d.id);}));
  window.addEventListener('nihongo-analytics-settings-open',()=>{if(running())pause(true);});
  document.addEventListener('keydown',e=>{
    if(G?.countingDown&&e.key==='Tab'){e.preventDefault();$('skipCountdown').focus({preventScroll:true});return;}
    if(document.querySelector('dialog[open]'))return;
    if(e.key==='Escape'&&running()){e.preventDefault();pause();}
    else if(e.key==='Enter'&&!running()&&!['SELECT','BUTTON','INPUT'].includes(e.target.tagName)){e.preventDefault();start();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pause(true);stopLoop();}syncAnimationState();});
  function fitField(){
    const W=$('field').clientWidth,H=$('field').clientHeight;
    if(running())G.drops.forEach(d=>{
      if(fieldSize.width)d.x=d.x*W/fieldSize.width;
      d.x=Math.max(5,Math.min(d.x,W-d.w-5));positionDrop(d,H);
    });
    fieldSize={width:W,height:H};
  }
  // Container queries and font changes can resize drops without changing the field.
  // Observe those changes once, rather than reading every sprite in every frame.
  const dropResizeObserver=new ResizeObserver(entries=>{
    if(!running())return;
    const sizes=entries.map(entry=>{const d=G.drops.find(d=>d.el===entry.target);return d?{d,w:d.el.offsetWidth,h:d.el.offsetHeight}:null;}).filter(Boolean);
    sizes.forEach(({d,w,h})=>{if(d.w!==w||d.h!==h){d.w=w;d.h=h;d.x=Math.max(5,Math.min(d.x,fieldSize.width-w-5));positionDrop(d);}});
  });
  function syncViewport(){const v=window.visualViewport;document.documentElement.style.setProperty('--viewport-height',(v?.height||innerHeight)+'px');document.documentElement.style.setProperty('--viewport-top',(v?.offsetTop||0)+'px');}
  syncViewport();window.addEventListener('resize',syncViewport);window.visualViewport?.addEventListener('resize',syncViewport);window.visualViewport?.addEventListener('scroll',syncViewport);
  new ResizeObserver(fitField).observe($('field'));fitField();
  new ResizeObserver(()=>document.documentElement.style.setProperty('--dock-height',$('answerDock').getBoundingClientRect().height+'px')).observe($('answerDock'));
  renderMenu();renderSound();exposeLesson();
  let storageWarning=false;
  L.subscribePersistence?.(s=>{
    $('saveStatus').textContent=s.state==='saving'?'Saving progress…':s.state==='unsaved'?'Progress is only in memory':s.state==='saved'||s.state==='restored'?'Progress saved on this device':s.state==='checking'?'Checking saved progress…':'Ready to save progress';
    if(s.state==='unsaved')storageWarning=true;else if(s.saved)storageWarning=false;
    $('storageNotice').classList.toggle('hidden',!storageWarning);
    if(storageWarning){$('storageNotice').innerHTML='<span>Device storage is unavailable. Keep playing, and export your progress before leaving.</span> <button type="button" id="storageExportBtn">Export progress</button>';const b=$('storageExportBtn');if(b)b.onclick=()=>$('exportBtn').onclick();}
  });
  A.ready.then(()=>{if(!A.available){$('soundBtn').querySelector('.control-label').textContent='Sound unavailable';$('soundBtn').setAttribute('aria-label','Sound unavailable');$('soundBtn').disabled=true;}});
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{
    $('offlineStatus').textContent='Your garden is ready offline.';
  }).catch(()=>$('offlineStatus').textContent='Offline setup unavailable in this browser.');}
  else $('offlineStatus').textContent='Offline setup is unavailable in this browser.';
  // Public module boundary for the future minigame shell and meaningful integration tests.
  window.KanaRain={id:GAME,capabilities:{facets:[FACET],itemTypes:['kana'],input:['typing','sound-composer'],timed:true,playStyles:['arcade']},generateRound,render,score,dispose,start,pause,end,candidates,accepted,padPath:id=>{const c=padPath(id);return c&&{family:c.family,slot:c.slot,reading:c.reading};},difficultyProfiles:R.profiles,get state(){return G;},get settings(){return {...cfg};},get gameData(){return gd;}};
})();

;