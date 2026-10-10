/* Local learner evidence. The v1 storage key is retained so existing gardens migrate.
   Attempts and exposures are durable facts; familiarity is only an estimate. */
(function(root){
'use strict';
var KEY='jp-learner-v1',DAY=86400000,MIN=60000,mem,db=null,store=null,revision=0,listeners=[];
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
var seen=new Set();d.attemptLedger=(d.attemptLedger||[]).filter(function(ev){if(!ev||!ev.attemptId||seen.has(ev.attemptId)||!ev.itemId||!ev.facet)return false;seen.add(ev.attemptId);apply(ev);return true;});
d.exposureLedger=Array.isArray(d.exposureLedger)?d.exposureLedger:[];
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
var token=++revision,journalOK=false;mem.updatedAt=Date.now();var snapshot=JSON.parse(JSON.stringify(mem));
publish({state:'saving',saved:false,revision:token});
if(store)try{store.setItem(KEY,JSON.stringify(snapshot));journalOK=true;}catch(e){}
if(journalOK)publish({state:'saving',saved:true,backend:'journal',journal:true,indexedDB:false,revision:token});
return new Promise(function(resolve){
var settled=false;function finish(idbOK){if(settled)return;settled=true;var result={state:journalOK||idbOK?'saved':'unsaved',saved:journalOK||idbOK,backend:journalOK&&idbOK?'journal+indexedDB':journalOK?'journal':idbOK?'indexedDB':null,journal:journalOK,indexedDB:idbOK,revision:token};if(token===revision)publish(result);resolve(result);}
if(!db){finish(false);return;}
try{var tx=db.transaction('learner','readwrite');tx.oncomplete=function(){finish(true);};tx.onerror=tx.onabort=function(){finish(false);};tx.objectStore('learner').put(snapshot,KEY);}catch(e){finish(false);}
});
}
function nextId(prefix){mem.sequence++;return prefix+':'+mem.created+':'+mem.sequence;}
function beginSession(gameId){var id=nextId(gameId+':session');flush();return id;}
// Two distinct intervening items AND 60 seconds after a reference are required.
// This conservative bookkeeping rule does not prove long-term retention.
function assistanceFor(id,name,now){var r=mem.reveals[id+'|'+name],delay=r?Math.max(0,(now??Date.now())-r.at):null,assisted=!!r&&(delay<MIN||r.intervening.length<2);return {assisted:assisted,reasons:assisted?['recent-'+r.reason]:[],lastExposureReason:r?r.reason:null,delaySinceExposureMs:delay,interveningItems:r?r.intervening.slice():[]};}
function recordExposure(id,name,ev){ev=ev||{};var at=ev.now||Date.now(),entry={exposureId:ev.exposureId||nextId('exposure'),itemId:id,facet:name,at:at,reason:ev.reason||'reference',gameId:ev.gameId||'',sessionId:ev.sessionId||null,roundId:ev.roundId||null};
if(mem.exposureLedger.some(function(x){return x.exposureId===entry.exposureId;}))return entry;
mem.exposureLedger.push(entry);mem.reveals[id+'|'+name]=Object.assign({},entry,{intervening:[]});if(!ev.deferSave)flush();return entry;
}
function record(id,name,ev){
ev=ev||{};var attemptId=ev.attemptId||nextId('legacy-call');if(mem.attemptLedger.some(function(x){return x.attemptId===attemptId;}))return state(id,true);
var first=ev.firstAttempt===true,assistance=typeof ev.assistance==='boolean'?ev.assistance:null;
var entry={attemptId:attemptId,sessionId:ev.sessionId||null,roundId:ev.roundId||null,itemId:id,facet:name,responseFormat:ev.responseFormat||null,firstAttempt:first,assistance:assistance,assistanceReasons:Array.isArray(ev.assistanceReasons)?ev.assistanceReasons.slice():[],outcome:ev.outcome==='timeout'?'timeout':ev.correct?'correct':'incorrect',correct:ev.outcome==='timeout'?null:!!ev.correct,reason:ev.reason||(ev.correct?'accepted':'unrecognized-response'),at:ev.now||Date.now(),gameId:ev.gameId||'',response:ev.response==null?null:String(ev.response),chosenItemId:ev.chosenItemId||null,submittedItemId:ev.submittedItemId||null,candidateItemIds:ev.candidateItemIds||[],firstResponseMs:ev.firstResponseMs==null?(first?ev.rtMs??null:null):ev.firstResponseMs,inputActiveMs:ev.inputActiveMs??null,displayActiveMs:ev.displayActiveMs??ev.rtMs??null,waitMs:ev.waitMs??null,delaySinceExposureMs:ev.delaySinceExposureMs??null};
mem.attemptLedger.push(entry);apply(entry);
if(first&&entry.outcome!=='timeout')Object.keys(mem.reveals).forEach(function(key){var r=mem.reveals[key];if(r.itemId!==id&&!r.intervening.includes(id))r.intervening.push(id);});
if(mem.errorLog.length>500)mem.errorLog.splice(0,mem.errorLog.length-500);flush();return state(id);
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
root.Learner={ready:ready,state:state,record:record,recordExposure:recordExposure,assistanceFor:assistanceFor,beginSession:beginSession,mastery:mastery,retrievability:retrievability,selectRound:selectRound,shuffle:shuffle,recentErrors:function(n){return mem.errorLog.slice(-(n||20));},gameData:function(id){return mem.games[id]||(mem.games[id]={});},save:flush,flush:flush,all:function(){return mem.items;},attempts:function(){return mem.attemptLedger.slice();},exposures:function(){return mem.exposureLedger.slice();},persistenceStatus:function(){return Object.assign({},status);},subscribePersistence:function(fn){listeners.push(fn);fn(Object.assign({},status));return function(){listeners=listeners.filter(function(x){return x!==fn;});};},export:function(){return JSON.stringify(mem);},import:function(json){restore(JSON.parse(json));return flush();},reset:function(){mem=fresh();return flush();}};
if(root.addEventListener)root.addEventListener('pagehide',flush);
})(typeof window!=='undefined'?window:globalThis);
