/* Local learner evidence. The v1 storage key is retained so existing gardens migrate.
   Attempts and exposures are durable facts; familiarity is only an estimate. */
(function(root){
'use strict';
var KEY='jp-learner-v1',DAY=86400000,MIN=60000,mem,db=null,store=null,revision=0,listeners=[];
// Old runtimes can still replace KEY on pagehide. They never write this primary.
var PRIMARY=KEY+':protected:v1',BACKUP=KEY+':checkpoint:v1';
var readCache={},databaseCache={},queuedCommit=null;
var attemptIds=new Set(),exposureIds=new Set();
// Each tab owns its write-ahead journal. Never overwrite another tab's pending work.
var writer=root.crypto&&root.crypto.randomUUID?root.crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);
var LOG=KEY+':pending:',LOCK=KEY+':commit',pending=[],serial=0,checkpoint;
var IMPORT_LOCKED={},MAX_IMPORT_BYTES=32*1024*1024,importRejections=Object.create(null);
function copy(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
// Private snapshots have already crossed the JSON validation/copy boundary.
// Copy their trees without allocating and parsing a second full-history string.
// Never use this on public game data, imported objects or raw storage reads:
// those must retain JSON's toJSON/getter/Date behavior through copy().
function copySnapshot(value){
if(value===null||typeof value!=='object')return typeof value==='number'?Number.isFinite(value)?value===0?0:value:null:value;
var out,i,v;
if(Array.isArray(value)){out=new Array(value.length);for(i=0;i<value.length;i++){v=value[i];out[i]=v===undefined||typeof v==='function'||typeof v==='symbol'?null:copySnapshot(v);}return out;}
out={};var keys=Object.keys(value);for(i=0;i<keys.length;i++){var k=keys[i];v=value[k];if(v===undefined||typeof v==='function'||typeof v==='symbol')continue;var next=copySnapshot(v);if(k==='__proto__')Object.defineProperty(out,k,{value:next,enumerable:true,writable:true,configurable:true});else out[k]=next;}return out;
}
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
function candidate(value,key){try{
// IndexedDB returns a new object for every read. Reuse a private normalized
// snapshot only after comparing its complete JSON content, never a revision,
// timestamp or ledger length. A truncated/changed snapshot takes the full path.
var raw=key===PRIMARY||key===KEY?JSON.stringify(value):null,cached=raw!==null&&databaseCache[key];
if(cached&&cached.raw===raw)return cached.data;
if(typeof value==='string')value=JSON.parse(value);if(value&&value.snapshot)value=value.snapshot;if(!value||![1,2].includes(value.version)||!value.items||!value.games)return null;if(value.version===2&&['attemptLedger','exposureLedger'].some(function(k){return value[k]!==undefined&&!Array.isArray(value[k]);}))return null;
var data=normalized(copy(value));if(raw!==null)databaseCache[key]={raw:raw,data:data};return data;
}catch(e){return null;}}
function stored(key){if(store)try{var raw=store.getItem(key),cached=readCache[key];if(cached&&cached.raw===raw)return cached.data;var data=candidate(raw);readCache[key]={raw:raw,data:data};return data;}catch(e){}return null;}
function journalData(){return choose(stored(PRIMARY),stored(KEY));}
function unionFacts(a,b,key){var ids=new Set(a.map(function(e){return e[key];})),out=a.slice();b.forEach(function(e){if(!ids.has(e[key])){ids.add(e[key]);out.push(e);}});return out;}
function containsFacts(a,b){return ['attemptLedger','exposureLedger'].every(function(name){var key=name==='attemptLedger'?'attemptId':'exposureId',ids=new Set(a[name].map(function(e){return e[key];}));return b[name].every(function(e){return ids.has(e[key]);});});}
function maximums(a,b){var out=copy(a||{});Object.keys(b||{}).forEach(function(k){var v=b[k];if(v&&typeof v==='object'&&!Array.isArray(v))out[k]=maximums(out[k],v);else if(typeof v==='number')out[k]=Math.max(Number(out[k])||0,v);else if(v===true)out[k]=true;else if(!Object.hasOwn(out,k))out[k]=copy(v);});return out;}
function coversProgress(a,b){return Object.keys(b||{}).every(function(k){var v=b[k],w=a&&a[k];if(v&&typeof v==='object'&&!Array.isArray(v))return coversProgress(w,v);if(typeof v==='number')return typeof w==='number'&&w>=v;if(v===true)return w===true;return w!==undefined;});}
function accuracyCounts(data,game,script){var out={attempts:0,correct:0};data.attemptLedger.forEach(function(ev){if(ev.gameId!==game||ev.facet!=='form→sound'||ev.outcome==='timeout'||(script==='kata'?!/^kana:[ァ-ヶ]/.test(ev.itemId):!/^kana:[ぁ-ゖ]/.test(ev.itemId)))return;out.attempts++;if(ev.correct)out.correct++;});return out;}
function coversSnapshot(a,b){
if((a.sequence||0)<(b.sequence||0)||!coversProgress(a._sync.applied,b._sync.applied))return false;
if(b.legacy&&!a.legacy||b.legacyErrorLog&&JSON.stringify(a.legacyErrorLog)!==JSON.stringify(b.legacyErrorLog))return false;
if(!Object.keys(b.items).every(function(id){var x=a.items[id],y=b.items[id];return x&&coversProgress(x.legacyFacets,y.legacyFacets)&&coversProgress(x.flags,y.flags)&&(!y.firstSeen||x.firstSeen<=y.firstSeen);}))return false;
if(!Object.keys(b.reveals||{}).every(function(k){return a.reveals[k]&&a.reveals[k].at>=b.reveals[k].at;}))return false;
return Object.keys(b.games).every(function(game){var x=a.games[game],y=b.games[game];if(!x||Object.keys(y).some(function(k){return !Object.hasOwn(x,k);})||!coversProgress(x.rows,y.rows)||!coversProgress(x.best,y.best)||!coversProgress(x.featuresIntro,y.featuresIntro)||(x.sessions||0)<(y.sessions||0))return false;
if(Object.keys(y).some(function(k){return /Unlocked$/.test(k)&&y[k]===true&&x[k]!==true;}))return false;
if(['novelty','katakanaNovelty'].some(function(k){return y[k]&&(!x[k]||!coversProgress(x[k].seen,y[k].seen));}))return false;
return Object.keys(y.accuracy||{}).every(function(script){var xa=x.accuracy&&x.accuracy[script],ya=y.accuracy[script];if(script!=='hira'&&script!=='kata')return coversProgress(xa,ya);if(!xa)return false;var ac=accuracyCounts(a,game,script),bc=accuracyCounts(b,game,script);return ['attempts','correct'].every(function(k){return typeof ya[k]!=='number'||typeof xa[k]==='number'&&xa[k]-ac[k]>=ya[k]-bc[k];})&&coversProgress(xa,ya);});
});
}
// Snapshots contain cumulative counters, not deltas. Add only the union's known
// events to the largest historical remainder; do not count shared answers twice.
function joinAccuracy(target,a,b,data,game){target.accuracy=maximums(a.accuracy,b.accuracy);['hira','kata'].forEach(function(script){var aa=a.accuracy&&a.accuracy[script],bb=b.accuracy&&b.accuracy[script];if(!aa&&!bb)return;var ac=accuracyCounts(a.__snapshot,game,script),bc=accuracyCounts(b.__snapshot,game,script),uc=accuracyCounts(data,game,script),out=target.accuracy[script];['attempts','correct'].forEach(function(k){var av=typeof (aa||{})[k]==='number'?aa[k]-ac[k]:-Infinity,bv=typeof (bb||{})[k]==='number'?bb[k]-bc[k]:-Infinity;if(av!==-Infinity||bv!==-Infinity)out[k]=Math.max(0,Math.max(av,bv)+uc[k]);});});}
function joinNovelty(a,b,divergent){if(!a)return copy(b);if(!b)return copy(a);var out=copy(a);out.seen=maximums(a.seen,b.seen);if(divergent){out.recent=unionFacts(a.recent||[],b.recent||[],'roundId').slice(-60);out.cooldownRemaining=Math.max(a.cooldownRemaining||0,b.cooldownRemaining||0);out.blocked=!!(a.blocked||b.blocked);}return out;}
function choose(a,b){
if(!b)return a;if(!a)return b;var x=epoch(a),y=epoch(b);if(!sameEpoch(x,y))return newerEpoch(y,x)?b:a;
var av=syncInfo(a).applied,bv=syncInfo(b).applied,aHas=Object.keys(av).some(function(k){return av[k]>(bv[k]||0);}),bHas=Object.keys(bv).some(function(k){return bv[k]>(av[k]||0);});
var ac=containsFacts(a,b),bc=containsFacts(b,a),preferB=bHas&&!aHas||!(aHas&&!bHas)&&(b.updatedAt||0)>(a.updatedAt||0);
// A strict superset is also the safer source of admission recovery state.
var primary=ac&&!bc?a:bc&&!ac?b:preferB?b:a,other=primary===a?b:a;
// Prove inclusion from event IDs and earned data, never from revision alone.
// The common subset case needs no serialization or aggregate replay.
if((primary===a?ac:bc)&&coversSnapshot(primary,other))return primary;
var data=copySnapshot(primary),divergent=!ac&&!bc,rebuild=false;
data.attemptLedger=unionFacts(primary.attemptLedger,other.attemptLedger,'attemptId');data.exposureLedger=unionFacts(primary.exposureLedger,other.exposureLedger,'exposureId');
if(divergent)data.attemptLedger.sort(function(p,q){return (p.at||0)-(q.at||0)||p.attemptId.localeCompare(q.attemptId);});
Object.keys(other.items).forEach(function(id){var old=other.items[id],s=data.items[id];if(!s){data.items[id]=copy(old);rebuild=true;return;}if(old.legacyFacets){var legacy=maximums(s.legacyFacets,old.legacyFacets);if(JSON.stringify(legacy)!==JSON.stringify(s.legacyFacets)){s.legacyFacets=legacy;rebuild=true;}}if(old.legacyConfusions)s.legacyConfusions=maximums(s.legacyConfusions,old.legacyConfusions);s.flags=maximums(s.flags,old.flags);s.firstSeen=Math.min(s.firstSeen||Infinity,old.firstSeen||Infinity);});
Object.keys(other.games).forEach(function(game){var old=other.games[game],gd=data.games[game];if(!gd){data.games[game]=copy(old);return;}
gd.rows=maximums(gd.rows,old.rows);gd.best=maximums(gd.best,old.best);gd.sessions=Math.max(gd.sessions||0,old.sessions||0);gd.featuresIntro=maximums(gd.featuresIntro,old.featuresIntro);
Object.keys(old).forEach(function(k){if(/Unlocked$/.test(k))gd[k]=!!gd[k]||old[k];else if(!Object.hasOwn(gd,k))gd[k]=copy(old[k]);});
['novelty','katakanaNovelty'].forEach(function(name){if(gd[name]||old[name])gd[name]=joinNovelty(gd[name],old[name],divergent);});
joinAccuracy(gd,Object.assign({__snapshot:primary},primary.games[game]),Object.assign({__snapshot:other},old),data,game);
});
Object.keys(other.reveals||{}).forEach(function(k){var r=other.reveals[k];if(!data.reveals[k]||r.at>data.reveals[k].at)data.reveals[k]=copy(r);});
// Re-evaluate intervening evidence so merging cannot turn a recent hint into
// independent recall, or discard practice that genuinely followed that hint.
if(!ac||!bc){data.exposureLedger.forEach(function(ev){var key=ev.itemId+'|'+ev.facet,r=data.reveals[key];if(!r||ev.at>r.at)data.reveals[key]=Object.assign({},ev,{intervening:[]});});Object.keys(data.reveals).forEach(function(k){var r=data.reveals[k],ids=new Set(r.intervening||[]);data.attemptLedger.forEach(function(ev){if(ev.firstAttempt&&ev.outcome!=='timeout'&&ev.at>=r.at&&ev.itemId!==r.itemId)ids.add(ev.itemId);});r.intervening=Array.from(ids);});}
data.sequence=Math.max(a.sequence||0,b.sequence||0);data.updatedAt=Math.max(a.updatedAt||0,b.updatedAt||0);data._sync.applied=maximums(av,bv);
if(other.legacyErrorLog){var legacyErrors=data.legacyErrorLog||[],keys=new Set(legacyErrors.map(function(ev){return JSON.stringify(ev);}));other.legacyErrorLog.forEach(function(ev){var key=JSON.stringify(ev);if(!keys.has(key)){keys.add(key);legacyErrors.push(copy(ev));}});data.legacyErrorLog=legacyErrors;}if(!data.legacy&&other.legacy)data.legacy=copy(other.legacy);
return divergent||rebuild?normalized(data):data;
}
function normalized(data){var previous=mem,ai=attemptIds,ei=exposureIds;try{return restore(data);}finally{mem=previous;attemptIds=ai;exposureIds=ei;}}
function importError(message){return new Error(message||'Invalid progress file. Choose a Kana Rain progress export.');}
function plainObject(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function importString(value){return typeof value==='string'&&value.length>0&&value.length<=1024;}
function utf8Size(value){var count=0;for(var i=0;i<value.length;i++){var c=value.charCodeAt(i);count+=c<128?1:c<2048?2:3;if(c>=55296&&c<=56319&&i+1<value.length){var low=value.charCodeAt(i+1);if(low>=56320&&low<=57343){count++;i++;}}if(count>MAX_IMPORT_BYTES)return count;}return count;}
// JSON.parse alone accepts finite-looking overflows and dangerous object keys.
// Check the whole document before normalizing any learner or touching storage.
function safeImportTree(value,depth){if(depth>80)throw importError('The progress file is nested too deeply.');if(typeof value==='number'&&!Number.isFinite(value))throw importError('The progress file contains an invalid number.');if(!value||typeof value!=='object')return;Object.keys(value).forEach(function(k){if(k==='__proto__'||k==='constructor'||k==='prototype')throw importError('The progress file contains an unsafe field.');safeImportTree(value[k],depth+1);});}
function checkImportShape(data){
if(!plainObject(data)||![1,2].includes(data.version)||!plainObject(data.items)||!plainObject(data.games))throw importError();
['sequence','created','updatedAt'].forEach(function(k){if(data[k]!==undefined&&(typeof data[k]!=='number'||!Number.isFinite(data[k])||data[k]<0||k==='sequence'&&!Number.isSafeInteger(data[k])))throw importError();});
if(data._sync&&(!plainObject(data._sync)||!plainObject(data._sync.epoch)||!importString(data._sync.epoch.id)||!Number.isFinite(data._sync.epoch.at)||data._sync.epoch.at<0||!plainObject(data._sync.applied)||Object.values(data._sync.applied).some(function(v){return !Number.isSafeInteger(v)||v<0;})))throw importError('Invalid progress synchronization metadata.');
['attemptLedger','exposureLedger','errorLog','legacyErrorLog'].forEach(function(k){if(data[k]!==undefined&&!Array.isArray(data[k]))throw importError();});
if(data.reveals!==undefined&&!plainObject(data.reveals))throw importError();
Object.keys(data.items).forEach(function(id){var s=data.items[id];if(!importString(id)||!plainObject(s)||s.itemId!==undefined&&s.itemId!==id)throw importError('Invalid item history.');['facets','legacyFacets','flags','scaffold','confusions','legacyConfusions','confusionsByFacet'].forEach(function(k){if(s[k]!==undefined&&!plainObject(s[k]))throw importError('Invalid item history.');});['facets','legacyFacets'].forEach(function(k){Object.keys(s[k]||{}).forEach(function(name){var f=s[k][name];if(!importString(name)||!plainObject(f))throw importError('Invalid familiarity history.');['correct','errors','reps','timeouts','stability','difficulty','lastReview','lapses'].forEach(function(field){if(f[field]!==undefined&&(typeof f[field]!=='number'||!Number.isFinite(f[field])||f[field]<0))throw importError('Invalid familiarity history.');});});});});
Object.keys(data.games).forEach(function(id){var gd=data.games[id];if(!importString(id)||!plainObject(gd))throw importError('Invalid game progress.');['rows','best','accuracy','featuresIntro'].forEach(function(k){if(gd[k]!==undefined&&!plainObject(gd[k]))throw importError('Invalid game progress.');});Object.keys(gd.rows||{}).forEach(function(k){if(!Number.isSafeInteger(gd.rows[k])||gd.rows[k]<0||id==='kana-rain'&&(k==='hiragana'||k==='katakana')&&(gd.rows[k]<1||gd.rows[k]>(root.JPData&&Array.isArray(root.JPData.rowsOrder)?root.JPData.rowsOrder.length:27)))throw importError('Invalid row progress.');});Object.keys(gd.best||{}).forEach(function(k){if(typeof gd.best[k]!=='number'||!Number.isFinite(gd.best[k])||gd.best[k]<0)throw importError('Invalid best score.');});Object.keys(gd.accuracy||{}).forEach(function(k){var a=gd.accuracy[k];if(!plainObject(a)||Object.values(a).some(function(v){return typeof v!=='number'||!Number.isFinite(v)||v<0;}))throw importError('Invalid answer counts.');});['novelty','katakanaNovelty'].forEach(function(k){var n=gd[k];if(n===undefined)return;if(!plainObject(n)||n.seen!==undefined&&!plainObject(n.seen)||n.recent!==undefined&&!Array.isArray(n.recent)||n.cooldownRemaining!==undefined&&(!Number.isSafeInteger(n.cooldownRemaining)||n.cooldownRemaining<0))throw importError('Invalid presentation history.');});});
var attempts=new Map(),exposures=new Map();(data.attemptLedger||[]).forEach(function(ev){if(!plainObject(ev)||!importString(ev.attemptId)||!importString(ev.itemId)||!importString(ev.facet)||!Number.isFinite(ev.at)||ev.at<0||!['correct','incorrect','timeout'].includes(ev.outcome)||ev.correct!==(ev.outcome==='timeout'?null:ev.outcome==='correct')||ev.firstAttempt!==undefined&&typeof ev.firstAttempt!=='boolean'||ev.assistance!==undefined&&ev.assistance!==null&&typeof ev.assistance!=='boolean')throw importError('Invalid answer record.');checkImportFact(attempts,ev,'attemptId');});
(data.exposureLedger||[]).forEach(function(ev){if(!plainObject(ev)||!importString(ev.exposureId)||!importString(ev.itemId)||!importString(ev.facet)||!Number.isFinite(ev.at)||ev.at<0)throw importError('Invalid reference record.');checkImportFact(exposures,ev,'exposureId');});
return data;
}
function canonicalFact(value){if(Array.isArray(value))return '['+value.map(canonicalFact).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(function(k){return JSON.stringify(k)+':'+canonicalFact(value[k]);}).join(',')+'}';return JSON.stringify(value);}
function checkImportFact(ids,ev,key){var prior=ids.get(ev[key]);if(prior&&canonicalFact(prior)!==canonicalFact(ev))throw importError('The progress file has conflicting records with the same identifier.');if(!prior)ids.set(ev[key],ev);}
function noImportConflicts(current,imported){['attemptLedger','exposureLedger'].forEach(function(name){var key=name==='attemptLedger'?'attemptId':'exposureId',ids=new Map();(current[name]||[]).forEach(function(ev){checkImportFact(ids,ev,key);});(imported[name]||[]).forEach(function(ev){checkImportFact(ids,ev,key);});});}
function reserveImportFacts(data,operations,importOp){var reserved={attemptLedger:data.attemptLedger.slice(),exposureLedger:data.exposureLedger.slice()};operations.forEach(function(op){if(!op||!op.epoch||!sameEpoch(op.epoch,importOp.epoch))return;reserved.attemptLedger=reserved.attemptLedger.concat(op.attempts||[]);reserved.exposureLedger=reserved.exposureLedger.concat(op.exposures||[]);if(op.replace){reserved.attemptLedger=reserved.attemptLedger.concat(op.replace.attemptLedger||[]);reserved.exposureLedger=reserved.exposureLedger.concat(op.replace.exposureLedger||[]);}});return reserved;}
function parseImport(json){if(typeof json!=='string'||json.length>MAX_IMPORT_BYTES||utf8Size(json)>MAX_IMPORT_BYTES)throw importError('Choose a JSON progress file smaller than 32 MiB.');var parsed;try{parsed=JSON.parse(json);}catch(e){throw importError('This is not a valid JSON progress file.');}safeImportTree(parsed,0);checkImportShape(parsed);var result=normalized(copy(parsed));safeImportTree(result,0);checkImportShape(result);return result;}
function importProvenance(a,b){if(a===undefined)return copy(b);if(b===undefined)return copy(a);var values=(Array.isArray(a)?a:[a]).concat(Array.isArray(b)?b:[b]),seen=new Set();return values.filter(function(value){var key=canonicalFact(value);if(seen.has(key))return false;seen.add(key);return true;}).map(copy);}
// Imports are additive even when the file came from another reset generation.
// Keep local preferences and admission samples; only earned progress is joined.
function joinImported(current,imported){
noImportConflicts(current,imported);var left=copy(current),right=copy(imported);right._sync={epoch:copy(epoch(left)),applied:{}};syncInfo(left);var joined=choose(left,right);
Object.keys(current.games).forEach(function(game){var old=current.games[game],gd=joined.games[game];if(!gd)return;if(game==='kana-rain')['sound','reducedEffects','difficulty'].forEach(function(k){if(!Object.hasOwn(old,k))delete gd[k];});Object.keys(old).forEach(function(k){if(['rows','best','featuresIntro','accuracy','sessions','novelty','katakanaNovelty'].includes(k)||/Unlocked$/.test(k))return;gd[k]=copy(old[k]);});['novelty','katakanaNovelty'].forEach(function(k){var before=old[k],incoming=imported.games[game]&&imported.games[game][k];if(!before)return;gd[k]=copy(before);if(incoming){gd[k].seen=maximums(before.seen,incoming.seen);gd[k].cooldownRemaining=Math.max(before.cooldownRemaining||0,incoming.cooldownRemaining||0);gd[k].blocked=!!(before.blocked||incoming.blocked);}});});
joined._sync=copy(syncInfo(left));if(imported.manualReconstruction)joined.manualReconstruction=importProvenance(current.manualReconstruction,imported.manualReconstruction);var result=normalized(joined);safeImportTree(result,0);checkImportShape(result);return result;
}
function importSummary(imported,joined,current){var gd=joined.games['kana-rain']||{},now=Date.now();return {attempts:imported.attemptLedger.length,exposures:imported.exposureLedger.length,addedAttempts:joined.attemptLedger.length-current.attemptLedger.length,addedExposures:joined.exposureLedger.length-current.exposureLedger.length,hiraganaRows:(gd.rows||{}).hiragana||0,katakanaRows:(gd.rows||{}).katakana||0,katakanaUnlocked:gd.katakanaUnlocked===true,hiraganaFamiliar:Object.keys(joined.items).filter(function(id){var f=joined.items[id].facets['form→sound'];return /^kana:[ぁ-ゖ]/.test(id)&&f&&f.correct&&.6*retrievability(f,now)+.4*Math.min(1,Math.log1p(f.stability)/Math.log1p(60))>=.55;}).length,manualEstimate:!!joined.manualReconstruction};}
function previewImport(json){var imported=parseImport(json),current=copy(mem);return importSummary(imported,joinImported(current,imported),current);}
// Reconcile gate metadata as well as new rounds: a live older tab can write a
// shorter-policy result without appending any facts. Do this on private copies,
// before persistence/adoption, so memory and disk share the same current policy.
function defaultReadingGate(s){
if(!s||s.version!==1||!Array.isArray(s.recent)||typeof s.blocked!=='boolean')return;
s.pace='calm';var recent=s.recent.slice(-60),misses=recent.filter(function(r){return typeof r.miss==='boolean'?r.miss:r.firstCorrect!==true&&r.timeout!==true;}).length,timeouts=recent.filter(function(r){return r.timeout===true;}).length;
if(misses>=4||timeouts>=2)s.blocked=true;else if(s.blocked&&recent.length===60&&recent.filter(function(r){return r.firstCorrect===true;}).length>=55)s.blocked=false;
}
function merged(base,operations){
var data=copySnapshot(base),info=syncInfo(data),rebuild=false,ids=new Set(data.attemptLedger.map(function(e){return e.attemptId;})),exposures=new Set(data.exposureLedger.map(function(e){return e.exposureId;}));
// Concurrent writers may be linearized in either order; a writer's own sequence
// must always win over wall-clock timestamps (which can move backwards).
operations.slice().sort(function(a,b){return a.writer.localeCompare(b.writer)||a.seq-b.seq;}).forEach(function(op){
if(!op||!op.writer||!Number.isSafeInteger(op.seq)||!op.epoch)return;
if(!sameEpoch(info.epoch,op.epoch)){
if(!op.replace||!newerEpoch(op.epoch,info.epoch))return;
data=copy(op.replace);info=syncInfo(data);rebuild=true;ids=new Set(data.attemptLedger.map(function(e){return e.attemptId;}));exposures=new Set(data.exposureLedger.map(function(e){return e.exposureId;}));
}
// Replay additive imports even if an old checkpoint acknowledges their sequence
// but is missing an imported fact or a familiarity-only historical baseline.
if(op.importSnapshot){try{noImportConflicts(reserveImportFacts(data,operations,op),op.importSnapshot);data=joinImported(data,op.importSnapshot);info=syncInfo(data);rebuild=true;ids=new Set(data.attemptLedger.map(function(e){return e.attemptId;}));exposures=new Set(data.exposureLedger.map(function(e){return e.exposureId;}));}catch(e){importRejections[op.writer+':'+op.seq]=e.message;return;}}
var applied=(info.applied[op.writer]||0)>=op.seq;
patch(data.games,applied?(op.games||[]).filter(function(c){return c.kind==='max'||c.kind==='earned';}):op.games);
if(applied)(op.games||[]).filter(function(c){return c.kind==='novelty';}).forEach(function(c){var game=data.games[c.path[0]]||(data.games[c.path[0]]={}),name=c.path[1];if(!game[name])game[name]=copy(c.value);else game[name].seen=maximums(game[name].seen,c.value.seen);});
if(applied)(op.novelty||[]).forEach(function(n){var gd=data.games[n.game],s=gd&&gd[n.name];if(s)(n.seen||[]).forEach(function(id){s.seen[id]=true;});});
if(!applied)(op.novelty||[]).forEach(function(n){var gd=data.games[n.game]||(data.games[n.game]={}),s=gd[n.name];if(!s)return;
n.seen.forEach(function(id){s.seen[id]=true;});if(n.pause)s.cooldownRemaining=10;if(n.blocked)s.blocked=true;
n.rounds.forEach(function(round){if(root.KanaNovelty)root.KanaNovelty.finish(s,Object.assign({failureRecorded:true},round));else if(!s.recent.some(function(r){return r.roundId===round.roundId;})){if(round.timeout)s.cooldownRemaining=10;else if(round.firstCorrect&&round.familiar&&s.cooldownRemaining>0)s.cooldownRemaining--;s.recent.push(copy(round));if(s.recent.length>60)s.recent.shift();}});
defaultReadingGate(s);
});
(op.exposures||[]).forEach(function(ev){if(exposures.has(ev.exposureId))return;exposures.add(ev.exposureId);data.exposureLedger.push(copy(ev));var key=ev.itemId+'|'+ev.facet;if(!data.reveals[key]||ev.at>=data.reveals[key].at)data.reveals[key]=Object.assign({},ev,{intervening:[]});});
(op.attempts||[]).forEach(function(ev){if(ids.has(ev.attemptId))return;ids.add(ev.attemptId);rebuild=true;if(!data.items[ev.itemId]&&op.items[ev.itemId])data.items[ev.itemId]=copy(op.items[ev.itemId]);data.attemptLedger.push(copy(ev));if(ev.firstAttempt&&ev.outcome!=='timeout')Object.keys(data.reveals).forEach(function(k){var r=data.reveals[k];if(r.itemId!==ev.itemId&&ev.at>=r.at&&!r.intervening.includes(ev.itemId))r.intervening.push(ev.itemId);});});
info.applied[op.writer]=Math.max(info.applied[op.writer]||0,op.seq);data.sequence=Math.max(data.sequence||0,op.sequence||0);data.updatedAt=Math.max(data.updatedAt||0,op.at);
});
// Rebuild aggregates from the union of immutable facts, never add saved totals twice.
if(rebuild)data=normalized(data);
var rain=data.games['kana-rain'];if(rain){defaultReadingGate(rain.novelty);defaultReadingGate(rain.katakanaNovelty);}
return data;
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
if(input._sync&&(!input._sync.epoch||typeof input._sync.epoch.id!=='string'||!Number.isFinite(input._sync.epoch.at)||!input._sync.applied||typeof input._sync.applied!=='object'||Array.isArray(input._sync.applied)||Object.values(input._sync.applied).some(function(v){return !Number.isSafeInteger(v)||v<0;})))throw new Error('Invalid learner synchronization metadata');
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
d.exposureLedger=d.exposureLedger.filter(function(ev){if(!ev||typeof ev.exposureId!=='string'||!ev.itemId||!ev.facet||exposureIds.has(ev.exposureId))return false;exposureIds.add(ev.exposureId);return true;});
var repaired=new Set();d.exposureLedger.forEach(function(ev){exposureIds.add(ev.exposureId);var key=ev.itemId+'|'+ev.facet,r=d.reveals[key];if(!r||!Number.isFinite(r.at)||ev.at>r.at){d.reveals[key]=Object.assign({},ev,{intervening:[]});repaired.add(key);}});
Object.keys(d.reveals).forEach(function(k){var r=d.reveals[k];if(!r||!r.itemId||!r.facet||!Number.isFinite(r.at)){delete d.reveals[k];return;}if(!Array.isArray(r.intervening))r.intervening=[];});
repaired.forEach(function(k){var r=d.reveals[k],ids=new Set();d.attemptLedger.forEach(function(ev){if(ev.firstAttempt&&ev.outcome!=='timeout'&&ev.at>=r.at&&ev.itemId!==r.itemId)ids.add(ev.itemId);});r.intervening=Array.from(ids);});
if(d.errorLog.length>500)d.errorLog=d.errorLog.slice(-500);return d;
}
// A full quota can reject writes while reads (including recovery journals) work.
try{store=root.localStorage;store.getItem(KEY);}catch(e){store=null;}
var restoredBackend=null;
var initial=choose(choose(stored(PRIMARY),stored(BACKUP)),stored(KEY));mem=initial?copy(initial):fresh();if(initial)restoredBackend='journal';
remember();var durable=copy(mem);
var ready=new Promise(function(resolve){
var done=false;function finish(){if(done)return;done=true;try{durable=merged(durable,logs());adopt(copySnapshot(durable));}catch(e){}publish({state:restoredBackend?'restored':'ready',saved:!!restoredBackend,backend:restoredBackend,journal:restoredBackend==='journal',indexedDB:restoredBackend==='indexedDB'});resolve();}
if(!root.indexedDB){finish();return;}
var request;try{request=root.indexedDB.open('kana-garden',1);}catch(e){finish();return;}
request.onupgradeneeded=function(){request.result.createObjectStore('learner');};
request.onerror=request.onblocked=finish;
request.onsuccess=function(){db=request.result;var objectStore;try{objectStore=db.transaction('learner').objectStore('learner');}catch(e){finish();return;}
var remaining=3;[PRIMARY,BACKUP,KEY].forEach(function(key){var read;function next(){if(!--remaining)finish();}try{read=objectStore.get(key);}catch(e){next();return;}
read.onsuccess=function(){if(!done){var saved=candidate(read.result,key);if(saved){durable=choose(durable,saved);restoredBackend='indexedDB';}}next();};read.onerror=next;
});
};
});
// A bounded previous copy is best effort. Its own transaction may fail quota
// without rolling back an already completed primary commit.
function checkpointSnapshot(previous,snapshot){if(!db)return;try{var tx=db.transaction('learner','readwrite'),s=tx.objectStore('learner'),read=s.get(BACKUP);tx.onerror=tx.onabort=function(){};read.onsuccess=function(){var old=read.result,base=previous&&sameEpoch(epoch(previous),epoch(snapshot))?previous:snapshot;if(old&&old.snapshot&&sameEpoch(epoch(old.snapshot),epoch(snapshot))&&Date.now()-(old.at||0)<MIN)return;try{s.put({at:Date.now(),snapshot:copySnapshot(base)},BACKUP);}catch(e){}};read.onerror=function(e){if(e&&e.preventDefault)e.preventDefault();};}catch(e){}}
function flush(locked){
capture();var token=++revision,journalOK=writePending(),hasLocks=!!(root.navigator&&root.navigator.locks);
publish({state:'saving',saved:false,revision:token});
if(journalOK)publish({state:'saving',saved:true,backend:'journal',journal:true,indexedDB:false,revision:token});
// Each caller has already captured and synchronously journaled its own facts.
// Share only the pending Web Lock job, before its storage transaction starts.
if(locked!==IMPORT_LOCKED&&hasLocks&&queuedCommit){queuedCommit.token=token;queuedCommit.journalOK=journalOK;return queuedCommit.promise;}
var batch=null;
function commit(){return new Promise(function(resolve){
var settled=false,snapshot,previous,canonicalOK=false;
function finish(idbOK){if(settled)return;settled=true;
if(snapshot&&(canonicalOK||idbOK)){
// The prepared snapshot is commit-owned: memory received a separate JSON copy
// below, and choose/merged never mutate their private snapshot inputs.
durable=snapshot;
// Only this journal's owner removes acknowledged operations. Another tab may
// append to its own journal while this transaction is running.
if(hasLocks){var info=syncInfo(snapshot);pending=pending.filter(function(op){return sameEpoch(op.epoch,info.epoch)?op.seq>(info.applied[writer]||0):newerEpoch(op.epoch,info.epoch);});writePending();}
}
if(snapshot){capture();writePending();adopt(merged(snapshot,pending));}
var finishedToken=batch?batch.token:token;
var result={state:journalOK||idbOK?'saved':'unsaved',saved:journalOK||idbOK,backend:journalOK&&idbOK?'journal+indexedDB':journalOK?'journal':idbOK?'indexedDB':null,journal:journalOK,indexedDB:idbOK,revision:finishedToken};if(finishedToken===revision)publish(result);resolve(result);
}
function prepare(saved){capture();journalOK=writePending();snapshot=merged(choose(choose(durable,journalData()),saved),logs());
var raw=JSON.stringify(snapshot);databaseCache[PRIMARY]={raw:raw,data:snapshot};
if(store)try{store.setItem(PRIMARY,raw);readCache[PRIMARY]={raw:raw,data:snapshot};canonicalOK=true;journalOK=true;}catch(e){}
adopt(copySnapshot(snapshot));return snapshot;
}
if(!db){try{prepare(null);}catch(e){journalOK=false;}finish(false);return;}
try{var tx=db.transaction('learner','readwrite'),objectStore=tx.objectStore('learner'),remaining=2,saved=null;
tx.oncomplete=function(){if(snapshot)checkpointSnapshot(previous,snapshot);finish(!!snapshot);};tx.onerror=tx.onabort=function(){finish(false);};
[PRIMARY,KEY].forEach(function(key){var read=objectStore.get(key);read.onsuccess=function(){try{var value=candidate(read.result,key);if(key===PRIMARY)previous=value;saved=choose(saved,value);if(!--remaining)objectStore.put(prepare(saved),PRIMARY);}catch(e){try{tx.abort();}catch(ignore){}finish(false);}};read.onerror=function(){finish(false);};});
}catch(e){try{prepare(null);}catch(ignore){}finish(false);}
});}
// Web Locks serialize journal commits too when IndexedDB is unavailable/full.
// pagehide only needs the synchronous, tab-owned write-ahead journal above.
function lockFailed(){if(queuedCommit===batch)queuedCommit=null;var ok=batch?batch.journalOK:journalOK,failedToken=batch?batch.token:token;var result={state:ok?'saved':'unsaved',saved:ok,backend:ok?'journal':null,journal:ok,indexedDB:false,revision:failedToken};if(failedToken===revision)publish(result);return result;}
if(locked===IMPORT_LOCKED||!hasLocks)return commit();
batch={token:token,journalOK:journalOK,promise:null};queuedCommit=batch;
try{batch.promise=root.navigator.locks.request(LOCK,function(){if(queuedCommit===batch)queuedCommit=null;return commit();}).catch(lockFailed);return batch.promise;}catch(e){return Promise.resolve(lockFailed());}
}
function nextId(prefix){mem.sequence++;return prefix+':'+writer+':'+mem.sequence;}
function replace(data){var at=Math.max(Date.now(),epoch(mem).at+1);mem=data;attemptIds=new Set(mem.attemptLedger.map(function(e){return e.attemptId;}));exposureIds=new Set(mem.exposureLedger.map(function(e){return e.exposureId;}));mem._sync={epoch:{id:writer+':replace:'+String(++serial),at:at},applied:{}};var op={writer:writer,seq:serial,epoch:copy(mem._sync.epoch),at:at,replace:copy(mem)};pending=[op];mem._sync.applied[writer]=serial;remember();return flush();}
async function importProgress(json){
// Invalid files must not flush pending answers, advance a sequence or write a
// journal. Preview and application share this validation and merge contract.
var imported=parseImport(json);joinImported(copy(mem),imported);await ready;
var joined=joinImported(copy(mem),imported);capture();var op={writer:writer,seq:++serial,epoch:copy(epoch(mem)),at:Date.now(),importSnapshot:copy(imported)};
pending.push(op);adopt(joined);syncInfo(mem).applied[writer]=serial;remember();writePending();
async function applyImport(){
var result=await flush(IMPORT_LOCKED),key=writer+':'+op.seq,message=importRejections[key];
if(message){pending=pending.filter(function(entry){return entry!==op&&!(entry.writer===writer&&entry.seq===op.seq);});writePending();delete importRejections[key];throw importError(message);}
if(!sameEpoch(epoch(mem),op.epoch))throw importError('Progress was reset in another tab. Choose the progress file again to review a new preview.');
return result;
}
// The tab-owned write-ahead journal above survives closing while awaiting this
// lock. The commit reads the latest snapshot and rejects conflicting immutable
// facts before applying an import, so another tab's history remains authoritative.
// Use the ordinary save lock without recursively acquiring it inside flush.
if(root.navigator&&root.navigator.locks)return root.navigator.locks.request(LOCK,applyImport);
return applyImport();
}
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
root.Learner={ready:ready,state:state,record:record,recordExposure:recordExposure,assistanceFor:assistanceFor,beginSession:beginSession,mastery:mastery,retrievability:retrievability,selectRound:selectRound,shuffle:shuffle,recentErrors:function(n){return mem.errorLog.slice(-(n||20));},gameData:function(id){return mem.games[id]||(mem.games[id]={});},save:flush,flush:flush,all:function(){return mem.items;},attempts:function(){return mem.attemptLedger.slice();},exposures:function(){return mem.exposureLedger.slice();},persistenceStatus:function(){return Object.assign({},status);},subscribePersistence:function(fn){listeners.push(fn);fn(Object.assign({},status));return function(){listeners=listeners.filter(function(x){return x!==fn;});};},export:function(){return JSON.stringify(mem);},previewImport:previewImport,importProgress:importProgress,import:function(json){var previous=mem;try{var imported=restore(JSON.parse(json));}finally{mem=previous;}return replace(imported);},reset:function(){return replace(fresh());}};
if(root.addEventListener)root.addEventListener('pagehide',flush);
if(root.addEventListener)root.addEventListener('storage',function(event){if(event.key&&event.key.indexOf(LOG)===0&&event.key!==LOG+writer&&event.newValue)flush();});
})(typeof window!=='undefined'?window:globalThis);
