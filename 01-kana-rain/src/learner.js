/* Local learner evidence. The v1 storage key is retained so existing gardens migrate.
   Attempts and exposures are durable facts; familiarity is only an estimate. */
(function(root){
'use strict';
var KEY='jp-learner-v1',DAY=86400000,MIN=60000,mem,db=null,store=null,revision=0,listeners=[];
var attemptIds=new Set(),exposureIds=new Set();
// Each tab owns its write-ahead journal. Never overwrite another tab's pending work.
var writer=root.crypto&&root.crypto.randomUUID?root.crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);
var LOG=KEY+':pending:',LOCK=KEY+':commit',pending=[],serial=0,checkpoint;
function copy(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
function epoch(data){return data._sync&&data._sync.epoch||{id:'legacy:'+data.created,at:0};}
function sameEpoch(a,b){return a.id===b.id||a.at===0&&b.at===0;}
function newerEpoch(a,b){return a.at>b.at||a.at===b.at&&a.id>b.id;}
function syncInfo(data){return data._sync||(data._sync={epoch:epoch(data),applied:{}});}
function remember(){checkpoint={games:copy(mem.games),attempts:mem.attemptLedger.length,exposures:mem.exposureLedger.length,sequence:mem.sequence};}
// Mutate existing objects so the running game keeps its gameData/novelty references.
function reconcile(target,source){Object.keys(target).forEach(function(k){if(!Object.hasOwn(source,k))delete target[k];});Object.keys(source).forEach(function(k){var v=source[k];if(v&&typeof v==='object'&&!Array.isArray(v)&&target[k]&&typeof target[k]==='object'&&!Array.isArray(target[k]))reconcile(target[k],v);else target[k]=v;});return target;}
function changes(before,after,path,out){
if(before===after)return;
if(after&&typeof after==='object'&&!Array.isArray(after)){
if(!Object.keys(after).length&&(!before||typeof before!=='object')){out.push({path:path,kind:'set',value:{}});return;}
Object.keys(after).forEach(function(k){changes(before&&before[k],after[k],path.concat(k),out);});return;
}
if(Array.isArray(after)&&JSON.stringify(before)===JSON.stringify(after))return;
var kind='set',delta=after,p=path.join('.');
if(typeof after==='number'&&(/\.accuracy\./.test(p)||path.length===2&&path[1]==='sessions')){kind='add';delta=after-(Number(before)||0);}
else if(typeof after==='number'&&/\.(rows|best)\./.test(p))kind='max';
else if(after===true&&(/Unlocked$/.test(p)||/\.seen\./.test(p)||/\.featuresIntro\./.test(p)))kind='earned';
out.push({path:path,kind:kind,value:copy(delta)});
}
function patch(target,list){(list||[]).forEach(function(c){var obj=target;for(var i=0;i<c.path.length-1;i++){var k=c.path[i];if(!obj[k]||typeof obj[k]!=='object')obj[k]={};obj=obj[k];}var key=c.path[c.path.length-1];
if(c.kind==='novelty'&&obj[key]){var n=obj[key];Object.assign(n.seen,c.value.seen);(c.value.recent||[]).forEach(function(r){if(root.KanaNovelty)root.KanaNovelty.finish(n,r);});n.cooldownRemaining=Math.max(n.cooldownRemaining||0,c.value.cooldownRemaining||0);n.blocked=n.blocked||c.value.blocked;return;}
obj[key]=c.kind==='add'?(Number(obj[key])||0)+c.value:c.kind==='max'?Math.max(Number(obj[key])||0,c.value):c.kind==='earned'?!!obj[key]||c.value:copy(c.value);});}
function capture(){
var games=[],novelty=[],attempts=mem.attemptLedger.slice(checkpoint.attempts),exposures=mem.exposureLedger.slice(checkpoint.exposures);
Object.keys(mem.games).forEach(function(game){
var current=mem.games[game],previous=checkpoint.games[game]||{},a=Object.assign({},current),b=Object.assign({},previous);
['novelty','katakanaNovelty'].forEach(function(name){
var n=current[name],old=previous[name];delete a[name];delete b[name];if(!n)return;
if(!old){games.push({path:[game,name],kind:'novelty',value:copy(n)});return;}
var rest=Object.assign({},n),prior=Object.assign({},old);['seen','recent','blocked','cooldownRemaining'].forEach(function(k){delete rest[k];delete prior[k];});changes(prior,rest,[game,name],games);
var seen=Object.keys(n.seen||{}).filter(function(id){return n.seen[id]&&!(old.seen||{})[id];});
var ids=new Set((old.recent||[]).map(function(r){return r.roundId;})),rounds=(n.recent||[]).filter(function(r){return !ids.has(r.roundId);});
var failed=attempts.some(function(ev){return ev.gameId===game&&(ev.outcome==='incorrect'||ev.outcome==='timeout')&&(name==='novelty'||/^kana:[ァ-ヶ]/.test(ev.itemId));});
if(seen.length||rounds.length||failed||n.cooldownRemaining!==old.cooldownRemaining||n.blocked!==old.blocked)novelty.push({game:game,name:name,seen:seen,rounds:copy(rounds),pause:failed||n.cooldownRemaining>old.cooldownRemaining,blocked:n.blocked===true&&old.blocked!==true});
});changes(b,a,[game],games);
});
if(!attempts.length&&!exposures.length&&!games.length&&!novelty.length&&mem.sequence===checkpoint.sequence)return;
var op={writer:writer,seq:++serial,sequence:mem.sequence,epoch:copy(epoch(mem)),at:Date.now(),attempts:copy(attempts),exposures:copy(exposures),games:games,novelty:novelty,items:{}};
attempts.forEach(function(ev){var s=mem.items[ev.itemId];if(s)op.items[ev.itemId]=copy(s);});
pending.push(op);syncInfo(mem).applied[writer]=serial;remember();
}
function writePending(){if(!store)return false;try{if(!pending.length){store.removeItem(LOG+writer);return false;}store.setItem(LOG+writer,JSON.stringify(pending));return true;}catch(e){return false;}}
function logs(){var all=pending.slice();if(store)try{for(var i=0;i<store.length;i++){var key=store.key(i);if(key&&key.indexOf(LOG)===0&&key!==LOG+writer){try{var entries=JSON.parse(store.getItem(key));if(Array.isArray(entries))all=all.concat(entries);}catch(e){}}}}catch(e){}return all;}
function journalData(){if(store)try{return JSON.parse(store.getItem(KEY));}catch(e){}return null;}
function choose(a,b){if(!b)return a;if(!a)return b;var x=epoch(a),y=epoch(b);if(!sameEpoch(x,y))return newerEpoch(y,x)?b:a;
if(x.at===0&&!Object.keys(a.items||{}).length&&!Object.keys(a.games||{}).length&&(Object.keys(b.items||{}).length||Object.keys(b.games||{}).length))return b;
var av=syncInfo(a).applied,bv=syncInfo(b).applied;var aHas=Object.keys(av).some(function(k){return av[k]>(bv[k]||0);}),bHas=Object.keys(bv).some(function(k){return bv[k]>(av[k]||0);});if(aHas&&!bHas)return a;if(bHas&&!aHas)return b;return (b.updatedAt||0)>(a.updatedAt||0)?b:a;}
function normalized(data){var previous=mem,ai=attemptIds,ei=exposureIds;try{return restore(data);}finally{mem=previous;attemptIds=ai;exposureIds=ei;}}
function merged(base,operations){
var data=copy(base),info=syncInfo(data),rebuild=false,ids=new Set(data.attemptLedger.map(function(e){return e.attemptId;})),exposures=new Set(data.exposureLedger.map(function(e){return e.exposureId;}));
// Concurrent writers may be linearized in either order; a writer's own sequence
// must always win over wall-clock timestamps (which can move backwards).
operations.slice().sort(function(a,b){return a.writer.localeCompare(b.writer)||a.seq-b.seq;}).forEach(function(op){
if(!op||!op.writer||!Number.isSafeInteger(op.seq)||!op.epoch)return;
if(!sameEpoch(info.epoch,op.epoch)){
if(!op.replace||!newerEpoch(op.epoch,info.epoch))return;
data=copy(op.replace);info=syncInfo(data);rebuild=true;ids=new Set(data.attemptLedger.map(function(e){return e.attemptId;}));exposures=new Set(data.exposureLedger.map(function(e){return e.exposureId;}));
}
if((info.applied[op.writer]||0)>=op.seq)return;
patch(data.games,op.games);
(op.novelty||[]).forEach(function(n){var gd=data.games[n.game]||(data.games[n.game]={}),s=gd[n.name];if(!s)return;
n.seen.forEach(function(id){s.seen[id]=true;});if(n.pause)s.cooldownRemaining=10;if(n.blocked)s.blocked=true;
n.rounds.forEach(function(round){if(root.KanaNovelty)root.KanaNovelty.finish(s,Object.assign({failureRecorded:true},round));else if(!s.recent.some(function(r){return r.roundId===round.roundId;})){if(round.timeout)s.cooldownRemaining=10;else if(round.firstCorrect&&round.familiar&&s.cooldownRemaining>0)s.cooldownRemaining--;s.recent.push(copy(round));if(s.recent.length>60)s.recent.shift();}});
// Keep the admission gate conservative even when this script loads before novelty.js.
var size=s.pace==='bold'?12:s.pace==='balanced'?30:60,recent=s.recent.slice(-size),misses=recent.filter(function(r){return r.miss===true;}).length,timeouts=recent.filter(function(r){return r.timeout;}).length;
if(misses>=4||timeouts>=2)s.blocked=true;else if(s.blocked&&recent.length===size&&recent.filter(function(r){return r.firstCorrect;}).length>=(size===12?10:size-5))s.blocked=false;
});
(op.exposures||[]).forEach(function(ev){if(exposures.has(ev.exposureId))return;exposures.add(ev.exposureId);data.exposureLedger.push(copy(ev));data.reveals[ev.itemId+'|'+ev.facet]=Object.assign({},ev,{intervening:[]});});
(op.attempts||[]).forEach(function(ev){if(ids.has(ev.attemptId))return;ids.add(ev.attemptId);rebuild=true;if(!data.items[ev.itemId]&&op.items[ev.itemId])data.items[ev.itemId]=copy(op.items[ev.itemId]);data.attemptLedger.push(copy(ev));if(ev.firstAttempt&&ev.outcome!=='timeout')Object.keys(data.reveals).forEach(function(k){var r=data.reveals[k];if(r.itemId!==ev.itemId&&ev.at>=r.at&&!r.intervening.includes(ev.itemId))r.intervening.push(ev.itemId);});});
info.applied[op.writer]=op.seq;data.sequence=Math.max(data.sequence||0,op.sequence||0);data.updatedAt=Math.max(data.updatedAt||0,op.at);
});
// Rebuild aggregates from the union of immutable facts, never add saved totals twice.
return rebuild?normalized(data):data;
}
function adopt(data){reconcile(mem,data);attemptIds=new Set(mem.attemptLedger.map(function(e){return e.attemptId;}));exposureIds=new Set(mem.exposureLedger.map(function(e){return e.exposureId;}));remember();}
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
// A full quota can reject writes while reads (including recovery journals) work.
try{store=root.localStorage;store.getItem(KEY);}catch(e){store=null;}
var restoredBackend=null;
try{var journal=store&&JSON.parse(store.getItem(KEY));mem=journal?restore(journal):fresh();if(journal)restoredBackend='journal';}catch(e){mem=fresh();}
remember();var durable=copy(mem);
var ready=new Promise(function(resolve){
var done=false;function finish(){if(done)return;done=true;try{durable=merged(durable,logs());adopt(copy(durable));}catch(e){}publish({state:restoredBackend?'restored':'ready',saved:!!restoredBackend,backend:restoredBackend,journal:restoredBackend==='journal',indexedDB:restoredBackend==='indexedDB'});resolve();}
if(!root.indexedDB){finish();return;}
var request;try{request=root.indexedDB.open('kana-garden',1);}catch(e){finish();return;}
request.onupgradeneeded=function(){request.result.createObjectStore('learner');};
request.onerror=request.onblocked=finish;
request.onsuccess=function(){db=request.result;var read;try{read=db.transaction('learner').objectStore('learner').get(KEY);}catch(e){finish();return;}
read.onsuccess=function(){if(!done&&read.result){try{var selected=choose(durable,read.result);if(selected===read.result)restoredBackend='indexedDB';durable=normalized(copy(selected));}catch(e){}}finish();};read.onerror=finish;
};
});
function flush(){
capture();var token=++revision,journalOK=writePending(),hasLocks=!!(root.navigator&&root.navigator.locks);
publish({state:'saving',saved:false,revision:token});
if(journalOK)publish({state:'saving',saved:true,backend:'journal',journal:true,indexedDB:false,revision:token});
function commit(){return new Promise(function(resolve){
var settled=false,snapshot,canonicalOK=false;
function finish(idbOK){if(settled)return;settled=true;
if(snapshot&&(canonicalOK||idbOK)){
durable=copy(snapshot);
// Only this journal's owner removes acknowledged operations. Another tab may
// append to its own journal while this transaction is running.
if(hasLocks){var info=syncInfo(snapshot);pending=pending.filter(function(op){return sameEpoch(op.epoch,info.epoch)?op.seq>(info.applied[writer]||0):newerEpoch(op.epoch,info.epoch);});writePending();}
}
if(snapshot){capture();writePending();adopt(merged(snapshot,pending));}
var result={state:journalOK||idbOK?'saved':'unsaved',saved:journalOK||idbOK,backend:journalOK&&idbOK?'journal+indexedDB':journalOK?'journal':idbOK?'indexedDB':null,journal:journalOK,indexedDB:idbOK,revision:token};if(token===revision)publish(result);resolve(result);
}
function prepare(saved){capture();journalOK=writePending();snapshot=merged(choose(choose(durable,journalData()),saved),logs());
if(store)try{store.setItem(KEY,JSON.stringify(snapshot));canonicalOK=true;journalOK=true;}catch(e){}
adopt(copy(snapshot));return snapshot;
}
if(!db){try{prepare(null);}catch(e){journalOK=false;}finish(false);return;}
try{var tx=db.transaction('learner','readwrite'),objectStore=tx.objectStore('learner'),read=objectStore.get(KEY);
tx.oncomplete=function(){finish(!!snapshot);};tx.onerror=tx.onabort=function(){finish(false);};
read.onsuccess=function(){try{objectStore.put(prepare(read.result),KEY);}catch(e){try{tx.abort();}catch(ignore){}finish(false);}};read.onerror=function(){finish(false);};
}catch(e){try{prepare(null);}catch(ignore){}finish(false);}
});}
// Web Locks serialize journal commits too when IndexedDB is unavailable/full.
// pagehide only needs the synchronous, tab-owned write-ahead journal above.
function lockFailed(){var result={state:journalOK?'saved':'unsaved',saved:journalOK,backend:journalOK?'journal':null,journal:journalOK,indexedDB:false,revision:token};if(token===revision)publish(result);return result;}
if(!hasLocks)return commit();
try{return root.navigator.locks.request(LOCK,commit).catch(lockFailed);}catch(e){return Promise.resolve(lockFailed());}
}
function nextId(prefix){mem.sequence++;return prefix+':'+writer+':'+mem.sequence;}
function replace(data){var at=Math.max(Date.now(),epoch(mem).at+1);mem=data;attemptIds=new Set(mem.attemptLedger.map(function(e){return e.attemptId;}));exposureIds=new Set(mem.exposureLedger.map(function(e){return e.exposureId;}));mem._sync={epoch:{id:writer+':replace:'+String(++serial),at:at},applied:{}};var op={writer:writer,seq:serial,epoch:copy(mem._sync.epoch),at:at,replace:copy(mem)};pending=[op];mem._sync.applied[writer]=serial;remember();return flush();}
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
root.Learner={ready:ready,state:state,record:record,recordExposure:recordExposure,assistanceFor:assistanceFor,beginSession:beginSession,mastery:mastery,retrievability:retrievability,selectRound:selectRound,shuffle:shuffle,recentErrors:function(n){return mem.errorLog.slice(-(n||20));},gameData:function(id){return mem.games[id]||(mem.games[id]={});},save:flush,flush:flush,all:function(){return mem.items;},attempts:function(){return mem.attemptLedger.slice();},exposures:function(){return mem.exposureLedger.slice();},persistenceStatus:function(){return Object.assign({},status);},subscribePersistence:function(fn){listeners.push(fn);fn(Object.assign({},status));return function(){listeners=listeners.filter(function(x){return x!==fn;});};},export:function(){return JSON.stringify(mem);},import:function(json){var previous=mem;try{var imported=restore(JSON.parse(json));}finally{mem=previous;}return replace(imported);},reset:function(){return replace(fresh());}};
if(root.addEventListener)root.addEventListener('pagehide',flush);
if(root.addEventListener)root.addEventListener('storage',function(event){if(event.key&&event.key.indexOf(LOG)===0&&event.key!==LOG+writer&&event.newValue)flush();});
})(typeof window!=='undefined'?window:globalThis);
