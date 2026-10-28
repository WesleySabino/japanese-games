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
  let padFamily=null,padTarget=null,padChangedAt=-Infinity,padFocusFamily=null,padKeyboardFocus=false;
  A.enabled=gd.sound!==false;
  const sfx=kind=>window.KanaSfx?.play(kind);
  // Menu music follows the title screen and the sound setting.
  const music=()=>window.KanaMusic?.sync();
  const panelOrigins=new Map();
  let importText=null,importBusy=false,importReadId=0;
  let progressDirty=true,keyboardSignature=null,fieldSize={width:0,height:0};
  // Keep feedback bitmaps decoded before their first use, without delaying the
  // menu or input. The initial scene gets its turn first; later images get one
  // low-priority task each and remain referenced for the lifetime of this page.
  function prepareFeedbackImages(){
    if(typeof Image!=='function')return;
    const images=[],scene=['garden.webp','spirit.webp','drop.webp'],feedback=['drop-stained.webp','splash.webp','ripple.webp'],total=scene.length+feedback.length;
    let next=null,task=0,stopped=false;
    const usesIdle=typeof window.requestIdleCallback==='function';
    function cancel(){if(!task)return;if(usesIdle)window.cancelIdleCallback(task);else clearTimeout(task);task=0;}
    function schedule(){
      if(!next||task||stopped||document.hidden)return;
      const run=()=>{task=0;if(stopped||document.hidden)return;const work=next;next=null;work();};
      task=usesIdle?window.requestIdleCallback(run,{timeout:1500}):setTimeout(run,200);
    }
    function image(file){
      return new Promise(resolve=>{
        const bitmap=new Image();images.push(bitmap);bitmap.decoding='async';bitmap.fetchPriority='low';
        let timer,settled=false;
        const finish=()=>{if(settled)return;settled=true;clearTimeout(timer);bitmap.onload=bitmap.onerror=null;resolve();};
        // Failure, an older browser or a stalled request must not block play or
        // leave a preparation chain pending forever. There are no retry loops.
        timer=setTimeout(finish,8000);bitmap.onerror=finish;
        if(typeof bitmap.decode!=='function')bitmap.onload=finish;
        bitmap.src=new URL('assets/'+file,document.baseURI).href;
        if(typeof bitmap.decode==='function')Promise.resolve().then(()=>bitmap.decode()).then(finish,finish);
      });
    }
    function prepareNext(){
      const file=feedback.shift();if(!file)return;
      image(file).then(()=>{next=prepareNext;schedule();});
    }
    function sceneReady(){next=()=>{Promise.all(scene.map(image)).then(()=>{next=prepareNext;schedule();});};schedule();}
    document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else schedule();});
    window.addEventListener('pagehide',()=>{stopped=true;cancel();});
    // This listener also retains the Image objects across session changes/BFCache.
    window.addEventListener('pageshow',()=>{stopped=false;if(images.length<total||next)schedule();});
    if(document.readyState==='complete')sceneReady();else window.addEventListener('load',sceneReady,{once:true});
  }
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
    if(keyboardOpen&&padKeyboardFocus&&focusPad())return;
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
    if(id==='progressDialog'){$('gardenContext').textContent=running()?'GAME PAUSED':'ONE DROP AT A TIME';renderImportAvailability();exposeReference();}
    if(id==='settingsDialog')$('settingsNote').textContent=(running()?'Your current session is paused. ':'')+'Progress stays on this device when storage is available; export a backup from My Kana Garden.';
    $(id).showModal();
    if(id==='progressDialog')renderProgress(true);
    $(id).querySelector('.dialog-close')?.focus({preventScroll:true});
    $(id).querySelector('.dialog-panel').scrollTop=0;
  }
  function closePanel(id){
    if(id==='progressDialog'){if(importBusy)return;clearImportPreview();}
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
    syncAnimationState();music();
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
    if(mode==='journey'){
      const stage=journeyStage();
      return (stage==='hiragana'?unlocked('hiragana'):stage==='katakana'?unlocked('katakana'):[...unlocked('hiragana'),...unlocked('katakana')]).map(k=>k.id);
    }
    return [];
  }
  function journeyStage(){
    if(!modeAvailable('kata'))return 'hiragana';
    // Give the first Katakana row a focused introduction before mixing scripts.
    return gd.journeyMixedUnlocked===true?'mixed':'katakana';
  }
  function unlockJourneyMix(){
    if(gd.journeyMixedUnlocked||!modeAvailable('kata'))return;
    if(D.kana.filter(k=>k.script==='katakana'&&k.row==='a').every(k=>N.hasSeen(novelty,k.id)&&readiness(k).ready)){
      gd.journeyMixedUnlocked=true;L.flush();
    }
  }
  function reviewCandidates(){return cfg.mode==='journey'?[...unlocked('hiragana'),...(modeAvailable('kata')?unlocked('katakana'):[])].map(k=>k.id):candidates();}
  const journeyNames={hiragana:'Journey · Hiragana',katakana:'Journey · Katakana begins',mixed:'Journey · Mixed rain'};
  function modeAvailable(mode){return mode==='hira'||mode==='journey'||mode==='kata'&&(explore||gd.katakanaUnlocked);}
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
    unlockKatakana();unlockJourneyMix();
    const names={hira:'Hiragana',kata:'Katakana',journey:'Journey (both)'};
    [...$('mode').options].forEach(o=>{o.disabled=!modeAvailable(o.value);o.textContent=names[o.value]+(o.disabled?' · Complete Hiragana first':'');});
    if(!running()&&!modeAvailable(cfg.mode))cfg.mode='hira';$('mode').value=cfg.mode;$('mode').disabled=!!running();
    $('menuHint').innerHTML=cfg.mode==='journey'?escapeText({hiragana:'Grow your Hiragana, then discover Katakana.',katakana:'Learn the five Katakana vowels, then mix both alphabets.',mixed:'Hiragana and Katakana in one rain. Same sound controls.'}[journeyStage()]):'Romaji · <kbd>Enter</kbd> to begin';
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
  function importMessage(text,kind='info'){
    $('importStatus').textContent=text;$('importStatus').dataset.kind=kind;
  }
  function renderImportAvailability(){
    const blocked=!!running();
    $('importBtn').disabled=blocked||importBusy;
    $('importAvailability').textContent=blocked?'Finish your current session before importing progress. You can export a backup at any time.':'Choose a JSON file, review it, then apply. Export a backup first if you want a separate copy of your current progress.';
    for(const id of ['applyImportBtn','cancelImportBtn','importBackupBtn','exportBtn','closeGarden','returnGarden'])$(id).disabled=importBusy;
    $('applyImportBtn').disabled=blocked||importBusy||!importText;
    $('importPreview').setAttribute('aria-busy',String(importBusy));
  }
  function clearImportPreview(clearStatus=true){
    importReadId++;importText=null;$('importFile').value='';$('importPreview').classList.add('hidden');
    $('importSummary').replaceChildren();$('importFilename').textContent='';
    if(clearStatus)importMessage('');renderImportAvailability();
  }
  function refreshImportedProgress(){
    gd=L.gameData(GAME);gd.rows=gd.rows||{hiragana:1,katakana:1};gd.best=gd.best||{};gd.accuracy=gd.accuracy||{};
    novelty=N.create(gd,{attempts:L.attempts?.(),exposures:L.exposures?.(),items:L.all?.()});katakanaNovelty=createKatakanaNovelty();
    cfg.noveltyPace=N.profile(novelty).id;cfg.difficulty=difficultyForPace(cfg.noveltyPace);
    if(!modeAvailable(cfg.mode))cfg.mode='hira';
    if(mapScript==='katakana'&&!modeAvailable('kata'))mapScript='hiragana';
    document.querySelectorAll('[data-script]').forEach(b=>{const selected=b.dataset.script===mapScript;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
    A.enabled=gd.sound!==false;music();renderMenu();renderSound();renderEffects();renderProgress(true);
  }
  async function previewProgressFile(){
    const file=$('importFile').files?.[0];if(!file||running()||importBusy)return;
    const readId=++importReadId;importText=null;$('importPreview').classList.add('hidden');renderImportAvailability();
    importMessage('Reading progress file…');
    try{
      if(file.size>32*1024*1024)throw new Error('Choose a progress file of 32 MB or smaller.');
      const text=await file.text();
      if(readId!==importReadId||!$('progressDialog').open)return;
      const summary=L.previewImport(text);
      const rows=[['Answers in the file',summary.attempts],['Reading and audio references',summary.exposures],['New answer records',summary.addedAttempts],['New reference records',summary.addedExposures],['Hiragana rows after import',summary.hiraganaRows],['Katakana rows after import',summary.katakanaRows],['Familiar Hiragana after import',summary.hiraganaFamiliar],['Katakana access after import',summary.katakanaUnlocked?'Available':'Locked']];
      $('importSummary').replaceChildren(...rows.flatMap(([label,value])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);return [dt,dd];}));
      $('importFilename').textContent=file.name;$('importEstimateNote').classList.toggle('hidden',!summary.manualEstimate);
      importText=text;$('importPreview').classList.remove('hidden');importMessage('Preview ready. Your progress has not changed.');renderImportAvailability();
      $('importPreviewTitle').focus({preventScroll:true});$('importPreview').scrollIntoView({block:'nearest',behavior:'instant'});
    }catch(error){
      if(readId!==importReadId)return;
      importText=null;importMessage(error instanceof Error?error.message:'This file could not be read. Choose a Kana Rain progress JSON file.','error');renderImportAvailability();$('importStatus').focus({preventScroll:true});
    }
  }
  async function applyProgressImport(){
    if(!importText||running()||importBusy)return;
    importBusy=true;renderImportAvailability();importMessage('Combining and saving your progress…');
    try{
      const result=await L.importProgress(importText);
      refreshImportedProgress();
      if(result?.saved!==true||!result.indexedDB&&!result.journal)throw new Error('The import could not be saved on this device. Export your current progress before leaving and try again when storage is available.');
      importBusy=false;clearImportPreview(false);
      importMessage(result.indexedDB?'Import saved on this device. Your existing history and settings were kept.':'Import saved in the device recovery journal. Your existing history and settings were kept. The main save is still pending; export a backup before leaving.','success');
      $('importStatus').focus({preventScroll:true});
    }catch(error){
      importBusy=false;renderImportAvailability();
      importMessage(error instanceof Error?error.message:'The import could not be completed. Your current history has been kept.','error');$('importStatus').focus({preventScroll:true});
    }
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
    const weather=R.atTime(cfg.difficulty,0);
    const reviewIds=Array.isArray(options.reviewIds)?[...new Set(options.reviewIds)].filter(id=>reviewCandidates().includes(id)):null;
    const sessionDuration=reviewIds?.length?60:cfg.duration,now=performance.now();
    gd.difficulty=cfg.difficulty;L.flush();
    G={mode:cfg.mode,playStyle:'arcade',sessionId:L.beginSession?.(GAME)||`${GAME}:${Date.now()}`,roundSerial:0,events:[],inputStartedAt:null,inputPausedMs:0,difficulty:cfg.difficulty,totalLives:3,t:sessionDuration,sessionDuration,reviewIds:reviewIds?.length?reviewIds:null,elapsed:0,lives:3,streak:0,bestStreak:0,correct:0,errors:0,attempts:0,expirations:0,drops:[],queue:[],confs:new Set(),missed:new Set(),mistakes:new Set(),newIds:new Set(),last:now,pauseAt:now,sinceSpawn:0,speed:weather.speed,gap:weather.gap,paused:true,countingDown:false,over:false,target:null,lastWarning:-10};
    G.journeyStage=journeyStage();G.nextScript='katakana';
    closeDialogs();$('welcome').classList.add('hidden');$('gameHud').classList.remove('hidden');$('answerDock').classList.remove('hidden');
    document.body.classList.remove('is-menu');document.body.classList.add('is-playing');music();
    $('answer').disabled=false;$('submitBtn').disabled=false;$('answer').value='';
    renderGameLabel();
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
    const kana=D.kanaById[id];if(!kana)return false;
    // Deferred queue entries cannot outlive the current Journey curriculum phase.
    if(G.mode==='journey'&&!(G.reviewIds||candidates()).includes(id))return false;
    // Keep the debut identity until its drop leaves, even though it is now persisted as seen.
    if(G.drops.some(d=>d.id===id&&d.isIntroduction))return false;
    if(N.hasSeen(novelty,id))return true;
    if(G.drops.some(d=>d.isIntroduction))return false;
    const known=(G.reviewIds||candidates()).some(id=>(G.mode!=='journey'||D.kanaById[id].script===kana.script)&&N.hasSeen(novelty,id));
    // Bootstrap an empty alphabet; once familiar content exists, vowels respect both brakes.
    if(starter(id)&&!known)return true;
    if((G.mode==='kata'||G.mode==='journey'&&kana.script==='katakana'?katakanaNovelty:novelty).blocked||novelty.cooldownRemaining>0)return false;
    if(starter(id))return true;
    // Katakana practice can move on once an introduced Katakana is ready;
    // keep every debut in the session history and retain Hiragana's total limit.
    const learning=G.mode==='kata'||G.mode==='journey'&&kana.script==='katakana'?[...G.newIds].filter(id=>D.kanaById[id].script===kana.script&&!readiness(D.kanaById[id]).ready).length:[...G.newIds].filter(id=>D.kanaById[id].script===kana.script).length;
    return learning<N.constants.maxNew&&(!known||G.familiarSinceIntroduction>=N.constants.warmup);
  }
  function nextEntry(){
    if(!G.queue.length)refill();
    const eligible=e=>canPresent(e.id);
    let index=G.mode==='journey'&&G.journeyStage==='mixed'?G.queue.findIndex(e=>D.kanaById[e.id]?.script===G.nextScript&&eligible(e)):-1;
    if(index<0)index=G.queue.findIndex(eligible);
    if(index<0){
      // A queued debut may become blocked after a miss. Keep it deferred and keep the rain going.
      const known=(G.reviewIds||candidates()).filter(id=>N.hasSeen(novelty,id)&&canPresent(id));
      const plan=L.selectRound(known,{facet:facet(),size:8,maxNew:8});
      G.queue.push(...plan.map(id=>({id})));
      index=G.queue.findIndex(e=>canPresent(e.id));
    }
    if(index<0)return null;
    const entry=G.queue.splice(index,1)[0];
    if(G.mode==='journey'&&G.journeyStage==='mixed')G.nextScript=D.kanaById[entry.id].script==='hiragana'?'katakana':'hiragana';
    return entry;
  }
  function refill(){
    const ids=G.reviewIds||candidates();
    // Plan each script independently so 104 familiar Hiragana cannot crowd out Katakana.
    const plan=G.mode==='journey'&&G.journeyStage==='mixed'?['katakana','hiragana'].flatMap(script=>L.selectRound(ids.filter(id=>D.kanaById[id].script===script),{facet:facet(),size:4,maxNew:2})):L.selectRound(ids,{facet:facet(),size:8,maxNew:3});
    // Seed the first garden in curriculum order; reviews are interleaved thereafter.
    if(G.attempts&&(G.mode!=='journey'||ids.some(id=>N.hasSeen(novelty,id))))L.shuffle(plan);
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
    // Journey feeds the existing per-alphabet counters, including their merge/recovery rules.
    const statMode=cfg.mode==='journey'?(katakanaIds.has(d.id)?'kata':'hira'):cfg.mode;
    const stat=gd.accuracy[statMode] || (gd.accuracy[statMode]={attempts:0,correct:0});
    if(detail.outcome!=='timeout'){stat.attempts++;if(correct)stat.correct++;}
    const katakanaRound=D.kanaById[d.id].script==='katakana';
    if(correct===false){N.pause(novelty);if(katakanaRound)N.pause(katakanaNovelty);G.familiarSinceIntroduction=0;}
    if(correct||detail.outcome==='timeout'){
      // Earlier wrong answers make this a reading miss, unless the drop was the kana's debut.
      const outcome={roundId:d.roundId,firstCorrect:correct===true&&firstAttempt,timeout:detail.outcome==='timeout',miss:!d.isIntroduction&&!firstAttempt,familiar:!d.isIntroduction,failureRecorded:!firstAttempt};
      N.finish(novelty,outcome);if(katakanaRound)N.finish(katakanaNovelty,outcome);
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
    const scripts=explore?[]:cfg.mode==='journey'?(modeAvailable('kata')?['hiragana','katakana']:['hiragana']):cfg.mode==='hira'?['hiragana']:['katakana'];
    scripts.forEach(sc=>{if(gd.rows[sc]>=D.rowsOrder.length)return;
      if(unlocked(sc).every(k=>readiness(k).ready)){
        gd.rows[sc]++;L.flush();const row=D.rowsOrder[gd.rows[sc]-1];
        const label=sc==='katakana'?(rowNames[row]||row.toUpperCase()+'-row'):D.kana.filter(k=>k.script===sc && k.row===row).map(k=>k.char).join(' ');
        flash('A new row is growing: '+label,false,4000,3);sfx('unlock');G.queue=[];
      }
    });
    unlockKatakana();unlockJourneyMix();
    if(G.mode==='journey'&&!G.reviewIds&&G.journeyStage!==journeyStage()){
      G.journeyStage=journeyStage();G.queue=[];G.nextScript='katakana';
      renderGameLabel();celebrate(G.journeyStage==='mixed'?'Both alphabets, one rain!':'Your Katakana rain begins!','unlock');
    }
  }
  function renderGameLabel(){
    $('gameLabel').textContent=(G.reviewIds?'Review · ':'')+R.profiles[G.difficulty].name+' · '+(G.mode==='journey'?journeyNames[G.journeyStage]:{hira:'Hiragana',kata:'Katakana'}[G.mode]);
  }
  function submitMatchedAnswer(drop,value,method='typing'){
    G.pendingAnswer=null;drop.submittedResponse=value;drop.submittedMethod=method;$('answer').value='';hit(drop);
  }
  // A completed composition is a deliberate answer, like Enter: it never waits for a longer reading.
  function submitComposed(cell,fromKeyboard=false){
    const v=cell.reading,ordered=[...G.drops].sort((a,b)=>b.y-a.y);
    // The exact cell settles homophones (じ/ぢ, ず/づ, お/を); any drop with the same accepted sound still counts.
    const match=ordered.find(d=>{const k=D.kanaById[d.id];return k.row===cell.row&&k.col===cell.col;})||ordered.find(d=>accepted(d).includes(v));
    const target=padTarget&&G.drops.includes(padTarget)?padTarget:lowest();
    resetPad(fromKeyboard);G.pendingAnswer=null;$('answer').value='';
    if(match)submitMatchedAnswer(match,v,'composer');
    else if(target)wrong(target,v,'composer');
  }
  function focusPad(){
    if(!keyboardOpen||!running()||G.paused||G.countingDown||document.querySelector('dialog[open]'))return false;
    const pad=$('keyboard');if(pad.classList.contains('hidden'))return false;
    const button=pad.querySelector(padFamily?'[data-slot]:not(:disabled)':`[data-family="${padFocusFamily}"]`);
    if(!button||button.disabled)return false;
    button.focus({preventScroll:true});return true;
  }
  function choosePadFamily(id,fromKeyboard=false){
    if(!padCells[id])return;
    if(G.inputStartedAt==null){G.inputStartedAt=performance.now();G.inputPausedMs=0;}
    // An unmatched composition belongs to the drop that was highlighted when it began.
    padFamily=id;padTarget=G.target;padFocusFamily=id;padKeyboardFocus=fromKeyboard;padChangedAt=performance.now();renderPad();
    if(fromKeyboard)focusPad();
  }
  function resetPad(fromKeyboard){
    const restore=fromKeyboard??(padKeyboardFocus&&$('keyboard').contains(document.activeElement));
    if(padFamily){padFocusFamily=padFamily;padChangedAt=performance.now();}
    padFamily=null;padTarget=null;padKeyboardFocus=!!restore&&keyboardOpen&&running()&&!G.paused;
    renderPad();if(padKeyboardFocus)focusPad();
  }
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
    renderNextRow(cfg.mode==='kata'||cfg.mode==='journey'&&modeAvailable('kata')?'katakana':'hiragana');
    const review=[...new Set([...G.mistakes,...G.missed,...[...G.confs].flatMap(c=>c.split('|'))])].filter(canShowFeedbackKana);
    lastReview=review.filter(id=>reviewCandidates().includes(id));$('reviewPracticeBtn').classList.toggle('hidden',!lastReview.length);
    $('resultReview').innerHTML=review.length?'<p class="review-heading"><b>A little more practice</b><span class="review-hint">Tap to listen</span></p><div class="review-grid">'+review.map(id=>{
      const char=symbol(id),reading=readingLabel(id);
      const tag=A.hasRecording(char)?'button':'div';
      return `<${tag} class="review-card" ${tag==='button'?`type="button" data-kana="${escapeText(char)}" aria-label="Listen to ${escapeText(char)}, ${escapeText(reading)}"`:''}><span lang="ja">${escapeText(char)}</span><small>${escapeText(reading)}</small>${tag==='button'?'<span class="review-audio" aria-hidden="true">♪</span>':''}</${tag}>`;
    }).join('')+'</div>':`<p class="review-empty">${G.correct?'Keep the streak growing.':'Listen to the current row, then try again.'}</p>`;
    review.forEach(id=>exposeReading(id,'results-review',true));L.flush();
    dispose();closeDialogs();$('results').showModal();$('answer').disabled=true;$('submitBtn').disabled=true;enableSetup(true);$('answer').blur();$('againBtn').focus({preventScroll:true});$('results').querySelector('.dialog-panel').scrollTop=0;$('results').querySelector('.result-content').scrollTop=0;
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
  let soundUnavailable=false;
  function renderSound(){
    const enabled=A.enabled,b=$('soundBtn'),settings=$('settingsSoundBtn');
    b.querySelector('use').setAttribute('href',enabled?'#icon-sound':'#icon-muted');
    b.querySelector('.control-label').textContent=soundUnavailable?'Sound unavailable':enabled?'Sound on':'Sound off';
    b.setAttribute('aria-pressed',enabled);b.setAttribute('aria-label',soundUnavailable?'Sound unavailable':enabled?'Mute sound':'Enable sound');b.title=soundUnavailable?'Sound unavailable':enabled?'Mute sound':'Enable sound';b.disabled=soundUnavailable;
    settings.setAttribute('aria-pressed',enabled);settings.setAttribute('aria-label',soundUnavailable?'Sound unavailable':enabled?'Mute pronunciation, music and effects':'Enable pronunciation, music and effects');settings.disabled=soundUnavailable;
    textIfChanged($('settingsSoundState'),soundUnavailable?'Unavailable':enabled?'On':'Off');
  }
  function toggleSound(){A.enabled=!A.enabled;gd.sound=A.enabled;L.flush();renderSound();music();if(A.enabled)sfx('menu');}
  $('soundBtn').onclick=$('settingsSoundBtn').onclick=toggleSound;
  $('effectsBtn').onclick=()=>{gd.reducedEffects=!gd.reducedEffects;L.flush();renderEffects();};
  $('skipCountdown').onclick=completeCountdown;
  $('reviewPracticeBtn').onclick=()=>start({reviewIds:lastReview});
  $('pauseBtn').onclick=()=>pause();$('resumeBtn').onclick=()=>pause(false);$('finishBtn').onclick=()=>end('Session finished');
  $('answerForm').onsubmit=e=>{e.preventDefault();onInput(true);};$('answer').oninput=()=>{padKeyboardFocus=false;onInput();};
  $('answer').onfocus=()=>{padKeyboardFocus=false;};
  $('answer').oncompositionstart=()=>{composing=true;if(G)G.pendingAnswer=null;if(G?.inputStartedAt==null&&!G?.paused&&running()){G.inputStartedAt=performance.now();G.inputPausedMs=0;}};$('answer').oncompositionend=()=>{composing=false;onInput();};
  $('keyboardBtn').onclick=()=>{keyboardOpen=!keyboardOpen;if(!keyboardOpen)resetPad();keyboard();if(keyboardOpen)$('answer').blur();else focusAnswer();};
  $('keyboard').onfocusout=e=>{
    // Modal/countdown focus temporarily leaves the pad; an explicit move elsewhere ends pad navigation.
    if(running()&&!G.paused&&!G.countingDown&&e.relatedTarget&&!$('keyboard').contains(e.relatedTarget))padKeyboardFocus=false;
  };
  $('keyboard').onclick=e=>{
    const b=e.target.closest('[data-family],[data-slot],[data-pad]');
    if(!b||b.disabled||!running()||G.paused||G.countingDown)return;
    // A pointer click a few frames after the stage changed is a bounce or ghost tap, not a choice.
    if(e.detail>0&&performance.now()-padChangedAt<PAD_BOUNCE_MS)return;
    // Each press only acts in its own stage, so a stale press can never skip a step.
    const fromKeyboard=e.detail===0;
    if(b.dataset.family){if(!padFamily)choosePadFamily(b.dataset.family,fromKeyboard);}
    else if(b.dataset.slot){const cell=padCells[padFamily]?.[b.dataset.slot];if(cell)submitComposed(cell,fromKeyboard);}
    else if(b.dataset.pad==='back'&&padFamily)resetPad(fromKeyboard);
  };
  $('gardenBtn').onclick=$('progressBtn').onclick=$('pauseGardenBtn').onclick=()=>openPanel('progressDialog');
  $('closeGarden').onclick=$('returnGarden').onclick=()=>closePanel('progressDialog');
  $('settingsBtn').onclick=$('pauseSettingsBtn').onclick=()=>openPanel('settingsDialog');
  $('closeSettings').onclick=$('saveSettings').onclick=()=>closePanel('settingsDialog');
  $('helpBtn').onclick=$('pauseHelpBtn').onclick=()=>openPanel('helpDialog');$('closeHelp').onclick=()=>closePanel('helpDialog');
  $('resetBtn').onclick=()=>{if(!confirm('Reset all learning progress on this device?'))return;dispose();L.reset();gd=L.gameData(GAME);gd.rows={hiragana:1,katakana:1};gd.katakanaUnlocked=false;gd.best={};gd.accuracy={};novelty=N.create(gd);katakanaNovelty=createKatakanaNovelty();cfg.mode='hira';cfg.difficulty='easy';cfg.noveltyPace=N.profile(novelty).id;L.flush();$('answer').disabled=true;$('submitBtn').disabled=true;showMenu();};
  $('exportBtn').onclick=()=>{const blob=new Blob([L.export()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kana-rain-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('importBackupBtn').onclick=()=>$('exportBtn').onclick();
  $('importBtn').onclick=()=>{if(running()||importBusy)return;clearImportPreview();$('importFile').click();};
  $('importFile').onchange=previewProgressFile;
  $('applyImportBtn').onclick=applyProgressImport;
  $('cancelImportBtn').onclick=()=>{if(importBusy)return;clearImportPreview();importMessage('Import cancelled. Your progress has not changed.');$('importBtn').focus({preventScroll:true});};
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
  prepareFeedbackImages();
  let storageWarning=false;
  L.subscribePersistence?.(s=>{
    $('saveStatus').textContent=s.state==='saving'?'Saving progress…':s.state==='unsaved'?'Progress is only in memory':s.state==='saved'||s.state==='restored'?'Progress saved on this device':s.state==='checking'?'Checking saved progress…':'Ready to save progress';
    if(s.state==='unsaved')storageWarning=true;else if(s.saved)storageWarning=false;
    $('storageNotice').classList.toggle('hidden',!storageWarning);
    if(storageWarning){$('storageNotice').innerHTML='<span>Device storage is unavailable. Keep playing, and export your progress before leaving.</span> <button type="button" id="storageExportBtn">Export progress</button>';const b=$('storageExportBtn');if(b)b.onclick=()=>$('exportBtn').onclick();}
  });
  A.ready.then(()=>{soundUnavailable=!A.available;renderSound();});
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{
    $('offlineStatus').textContent='Your garden is ready offline.';
  }).catch(()=>$('offlineStatus').textContent='Offline setup unavailable in this browser.');}
  else $('offlineStatus').textContent='Offline setup is unavailable in this browser.';
  // Public module boundary for the future minigame shell and meaningful integration tests.
  window.KanaRain={id:GAME,capabilities:{facets:[FACET],itemTypes:['kana'],input:['typing','sound-composer'],timed:true,playStyles:['arcade']},generateRound,render,score,dispose,start,pause,end,candidates,accepted,padPath:id=>{const c=padPath(id);return c&&{family:c.family,slot:c.slot,reading:c.reading};},difficultyProfiles:R.profiles,get state(){return G;},get settings(){return {...cfg};},get gameData(){return gd;}};
})();
