(async function () {
  'use strict';
  const D=window.JPData, L=window.Learner, A=window.KanaAudio, R=window.KanaDifficulty, FACET='form→sound', PAIR='script→script', GAME='kana-rain';
  const $=id=>document.getElementById(id), normalize=s=>s.trim().toLowerCase().normalize('NFKC');
  await L.ready;
  let gd=L.gameData(GAME);
  gd.rows=gd.rows || {hiragana:1,katakana:1}; gd.best=gd.best || {}; gd.accuracy=gd.accuracy || {};
  const explore=new URLSearchParams(location.search).has('all');
  let cfg={mode:'hira',duration:180,difficulty:R.profiles[gd.difficulty]?gd.difficulty:'normal',playStyle:gd.playStyle==='practice'?'practice':'arcade'}, G=null, raf=0, mapScript='hiragana', keyboardOpen=false, keyboardOverride=null, composing=false, feedbackTimer, spiritTimer, milestoneTimer, heartTimer, feedbackPriority=-1, feedbackUntil=0, currentFeedback=null, feedbackQueue=[], lastReview=[];
  A.enabled=gd.sound!==false;
  const sfx=kind=>window.KanaSfx?.play(kind);
  const panelOrigins=new Map();
  let progressDirty=true,keyboardSignature=null,fieldSize={width:0,height:0};
  const mobile=()=>matchMedia('(pointer:coarse)').matches || innerWidth<=650;
  const running=()=>G && !G.over;
  function stopLoop(){cancelAnimationFrame(raf);raf=0;}
  function wakeLoop(){if(!raf&&running()&&!document.hidden&&(G.countingDown||(!G.paused&&!G.awaitingFeedback)))raf=requestAnimationFrame(loop);}
  function syncAnimationState(){document.body.classList.toggle('game-paused',document.hidden||!!(running()&&(G.paused||G.countingDown||G.awaitingFeedback)));}
  function textIfChanged(el,value){value=String(value);if(el.textContent!==value)el.textContent=value;}
  function invalidateProgress(){progressDirty=true;renderProgress();}
  function renderProgress(force=false){if(force||progressDirty&&$('progressDialog').open){renderMap();renderUnlocks(mapScript);progressDirty=false;}}
  function focusAnswer(){if(!running() || G.paused || G.countingDown)return;$('answer').inputMode=mobile()&&keyboardOpen?'none':'text';$('answer').focus({preventScroll:true});}
  function closeDialogs(){document.querySelectorAll('dialog.game-dialog[open]').forEach(d=>d.close());}
  function openPanel(id){
    const current=document.querySelector('dialog[open]');
    const origin=current?.id==='pauseOverlay'?'pause':current?.id==='results'?'results':running()&&(!G.paused||G.countingDown)?'game':'title';
    panelOrigins.set(id,origin);
    if(running())pause(true,false);
    closeDialogs();renderMenu();
    if(id==='progressDialog'){$('gardenContext').textContent=running()?'GAME PAUSED':'ONE DROP AT A TIME';exposeReference();}
    if(id==='settingsDialog')$('settingsNote').textContent=running()?'Your current session is paused. Session options unlock when it finishes.':'Small, steady steps. Progress stays on this device when storage is available.';
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
    $('continueFeedbackBtn').classList.add('hidden');
    closeDialogs();$('welcome').classList.remove('hidden');$('gameHud').classList.add('hidden');$('answerDock').classList.add('hidden');
    document.body.classList.remove('is-playing');document.body.classList.add('is-menu');
    keyboardOpen=false;keyboardOverride=null;keyboard();enableSetup(true);$('fieldSpirit').className='spirit idle';document.body.classList.remove('low-hearts','heart-hit');$('heartLoss').classList.add('hidden');$('startBtn').focus({preventScroll:true});
    syncAnimationState();
    exposeLesson();
  }
  function showPause(){
    $('pauseOverlay').showModal();$('resumeBtn').focus({preventScroll:true});$('pauseOverlay').querySelector('.dialog-panel').scrollTop=0;
  }
  const rowNames={a:'Vowels',nn:'N',ky:'K combinations',sy:'SH combinations',ty:'CH combinations'};
  const facet=()=>cfg.mode==='pair'?PAIR:FACET;
  const symbol=id=>id.slice(id.indexOf(':')+1);
  function opposite(k){return D.kana.find(x=>x.pairId===k.pairId && x.script!==k.script);}
  function unlocked(script){const rows=D.rowsOrder.slice(0,explore?D.rowsOrder.length:gd.rows[script]);return D.kana.filter(k=>k.script===script && rows.includes(k.row));}
  function candidates(mode=cfg.mode,includePending=false){
    if(mode==='hira')return unlocked('hiragana').map(k=>k.id);
    if(mode==='kata'||mode==='pair')return unlocked('katakana').map(k=>k.id);
    if(mode==='mix')return unlocked('hiragana').concat(unlocked('katakana')).map(k=>k.id);
    const known=new Set(unlocked('hiragana').concat(unlocked('katakana')).map(k=>k.char));
    return D.words.filter(w=>D.splitKana(w.surface).every(c=>known.has(c)||['っ','ッ','ー'].includes(c)) && (includePending||D.wordRequirements(w).every(id=>gd.featuresIntro?.[id]))).map(w=>w.id);
  }
  function modeAvailable(mode){if(mode==='words')return candidates('words',true).length>=4;if(explore||mode==='hira')return true;return gd.rows.hiragana>=11;}
  function mature(id){const f=L.state(id)?.facets[FACET];return id.startsWith('kana:') && f?.independentFirstCorrect>=2 && L.mastery(id,FACET)>=.75;}
  function accepted(id,kanaOnly=false){
    if(typeof id==='object'){kanaOnly=id.responseFormat!=='romaji';id=id.id;}
    if(id.startsWith('w:'))return D.words.find(w=>w.id===id)?.acceptedRomaji||D.romajiVariants(symbol(id));
    const k=D.kanaById[id];
    if(kanaOnly)return [opposite(k).char];
    return [k.romaji,...k.alt];
  }
  function fmt(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function escapeText(text){const el=document.createElement('span');el.textContent=text;return el.innerHTML;}
  function expose(id,name,reason,deferSave=false){
    L.recordExposure?.(id,name,{reason,gameId:GAME,sessionId:G?.sessionId,roundId:G?.target?.roundId,deferSave});
    G?.drops.forEach(d=>{if(d.id===id && d.facet===name){d.assistanceReasons.add(reason);d.hint=true;}});
  }
  function exposeReading(id,reason,deferSave=false){
    expose(id,FACET,reason,true);const k=D.kanaById[id];
    if(k){expose(id,PAIR,reason,true);expose(opposite(k).id,PAIR,reason,true);
      D.words.filter(w=>D.splitKana(w.surface).includes(k.char)).forEach(w=>expose(w.id,FACET,reason,true));
    }
    if(!deferSave)L.flush();
  }
  function exposeReference(){D.kana.filter(k=>k.script===mapScript).forEach(k=>exposeReading(k.id,'reference-panel',true));L.flush();}
  function exposeLesson(){const row=D.rowsOrder[(explore?D.rowsOrder.length:gd.rows[mapScript])-1];unlocked(mapScript).filter(k=>k.row===row).forEach(k=>exposeReading(k.id,'lesson-reference',true));L.flush();}
  async function playReading(id,reason){if(await A.play(symbol(id)))exposeReading(id,reason);}
  function clearFeedback(){clearTimeout(feedbackTimer);$('feedback').className='feedback';$('continueFeedbackBtn').classList.add('hidden');feedbackPriority=-1;feedbackUntil=0;currentFeedback=null;const next=feedbackQueue.shift();if(next)flash(next.text,next.bad,next.ms,next.priority,next.onShow);}
  function scheduleFeedback(){
    clearTimeout(feedbackTimer);if(!currentFeedback||G?.paused||G?.awaitingFeedback)return;
    feedbackUntil=performance.now()+currentFeedback.ms;feedbackTimer=setTimeout(clearFeedback,currentFeedback.ms);
  }
  function flash(text,bad=false,ms=1800,priority=bad?4:0,onShow=null){
    const now=performance.now();
    if(currentFeedback && (now<feedbackUntil || G?.paused || G?.awaitingFeedback)){
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
  const bestKey=(duration=cfg.duration,review=false)=>`${cfg.mode}:${cfg.difficulty}:${cfg.playStyle==='practice'?'practice:8':duration}${review?':review':''}`;
  function readiness(k){
    const f=L.state(k.id)?.facets[FACET],unaided=f?.independentFirstCorrect||0,attempts=f?.independentFirstAttempts||0,accuracy=attempts?(unaided/attempts):0;
    return {k,unaided,accuracy,attempts,ready:unaided>=2&&accuracy>=.85};
  }
  function renderUnlocks(script){
    const count=gd.rows[script],next=D.rowsOrder[count],rows=unlocked(script).map(readiness),ready=rows.filter(x=>x.ready).length;
    $('unlockSummary').textContent=explore?'All rows available in exploration':!next?'All rows unlocked':`${ready} / ${rows.length} kana ready for the next row`;
    $('unlockBar').style.width=(rows.length?ready/rows.length*100:0)+'%';
    $('unlockDetails').innerHTML=rows.map(({k,unaided,accuracy,attempts,ready})=>`<div class="unlock-item ${ready?'ready':'pending'}"><span lang="ja">${k.char}</span><span>${k.romaji}</span><small>${Math.min(2,unaided)}/2 independent first · ${attempts?Math.floor(accuracy*100)+'%':'No independent answers yet'}</small><span aria-label="${ready?'Ready':'Keep practicing'}">${ready?'✓':'○'}</span></div>`).join('');
  }
  function renderBest(){const best=gd.best[bestKey()]||0;$('menuBest').textContent=best?`Personal best · ${best} points`:'Your first personal best is waiting';}
  function spirit(mood){clearTimeout(spiritTimer);$('fieldSpirit').className='spirit '+mood;spiritTimer=setTimeout(()=>$('fieldSpirit').className='spirit idle',900);}
  function renderMenu(){
    const names={hira:'Hiragana',kata:'Katakana',mix:'Mixed scripts',pair:'Script pairs',words:'Little words'};
    for(const id of ['mode','settingsMode'])[...$(id).options].forEach(o=>{o.disabled=!modeAvailable(o.value);o.textContent=names[o.value]+(o.disabled?' · Locked':'');});
    $('modeLocks').innerHTML=['kata','mix','pair','words'].map(mode=>`<div class="mode-lock"><strong>${names[mode]}</strong><span>${modeAvailable(mode)?'Available':mode==='words'?`${candidates('words',true).length}/4 readable words · unlock more kana`:`Hiragana rows ${Math.min(11,gd.rows.hiragana)}/11 · unlock the basic rows`}</span></div>`).join('');
    if(!modeAvailable(cfg.mode))cfg.mode='hira';$('mode').value=$('settingsMode').value=cfg.mode;
    $('modeNote').textContent=cfg.mode==='pair'?'Produce the matching hiragana. No answer choices.':cfg.mode==='words'?'Read the whole word. Its meaning appears after an answer.':'Start with hiragana. Other modes grow with you.';
    const active=running();$('difficultySelect').value=cfg.difficulty;$('durationSelect').value=cfg.duration;
    $('practiceSelect').value=$('settingsPracticeSelect').value=cfg.playStyle;
    for(const id of ['mode','settingsMode','difficultySelect','durationSelect','practiceSelect','settingsPracticeSelect'])$(id).disabled=!!active;
    $('durationSelect').disabled=!!active||cfg.playStyle==='practice';$('difficultySelect').disabled=!!active||cfg.playStyle==='practice';
    document.querySelectorAll('[data-difficulty]').forEach(b=>{b.disabled=!!active;b.classList.toggle('selected',b.dataset.difficulty===cfg.difficulty);b.setAttribute('aria-pressed',b.dataset.difficulty===cfg.difficulty);});
    document.querySelectorAll('[data-duration]').forEach(b=>b.classList.toggle('selected',+b.dataset.duration===cfg.duration));
    const sc=mapScript, rows=unlocked(sc), count=explore?D.rowsOrder.length:gd.rows[sc], row=D.rowsOrder[count-1];
    const current=rows.filter(k=>k.row===row);$('rowName').textContent=rowNames[row]||row.toUpperCase()+'-row';
    $('lesson').innerHTML=current.map(k=>`<button data-kana="${k.char}" data-known="${L.mastery(k.id,FACET)>=.55}" aria-label="Listen to ${k.char}, ${k.romaji}">${k.char}<small>${k.romaji}</small></button>`).join('');
    $('unlockNote').textContent=explore?'Exploration: all kana are available. Word features are introduced before use.':'Each unlocked kana needs 2 independent first-answer successes and at least 85% accuracy on independent first answers. Reference help stays marked until 60 seconds and two other items have passed. This is a practice estimate.';
    const next=D.rowsOrder[count];$('milestone').textContent=next?'Meet '+(rowNames[next]||next.toUpperCase()+'-row'):'Your whole kana garden';
    $('milestoneKana').textContent=next?D.kana.filter(k=>k.script===sc && k.row===next).map(k=>k.char).join(' '):'Keep your reading growing';
    invalidateProgress();renderBest();renderEffects();
  }
  function renderMap(){
    const items=D.kana.filter(k=>k.script===mapScript), available=new Set(unlocked(mapScript).map(k=>k.id));
    $('masteryMap').innerHTML=items.map(k=>{const m=L.mastery(k.id,FACET);const cls=m===0?'new':m<.55?'learning':m<.75?'known':'strong';return `<button class="${cls} ${available.has(k.id)?'':'locked'} ${k.kind==='yoon'?'compound':''}" data-kana="${k.char}" title="${k.char} · ${k.romaji} · ${Math.round(m*100)}% familiarity" aria-label="Listen to ${k.char}, ${k.romaji}, ${Math.round(m*100)} percent familiarity">${k.char}</button>`;}).join('');
    const known=items.filter(k=>L.mastery(k.id,FACET)>=.55).length, pct=Math.round(known/items.length*100);
    $('masteryCount').textContent=`${known} / ${items.length} familiar`;$('masteryPercent').textContent=pct+'%';$('masteryBar').style.width=pct+'%';
    $('totalLearned').textContent=D.kana.filter(k=>L.mastery(k.id,FACET)>=.55).length;
  }
  function enableSetup(value){for(const id of ['mode','settingsMode','difficultySelect','durationSelect','practiceSelect','settingsPracticeSelect'])$(id).disabled=!value;document.querySelectorAll('[data-difficulty],[data-duration]').forEach(b=>b.disabled=!value);$('startBtn').disabled=!value;if(value)renderMenu();}
  function cancelCountdown(){if(G)G.countingDown=false;$('countdownOverlay').classList.add('hidden');stopLoop();}
  function scriptFormat(d){return d?.responseFormat||'romaji';}
  function needsScriptIntro(d){return d?.kanaOnly && !gd.scriptIntro?.[scriptFormat(d)];}
  function introduceScript(d){
    cancelCountdown();pause(true,false);const format=scriptFormat(d);G.introFormat=format;
    $('scriptExample').textContent=`${symbol(d.id)} → ${opposite(D.kanaById[d.id]).char}`;
    $('scriptExplanation').textContent=`Type the matching ${format} for these familiar kana. The answer format is shown above your keyboard. Use the kana keys or your Japanese keyboard.`;
    exposeReading(d.id,'script-introduction');
    closeDialogs();$('scriptDialog').showModal();$('continueScriptBtn').focus({preventScroll:true});
  }
  function acknowledgeScript(){
    if(!running())return;gd.scriptIntro=gd.scriptIntro||{};gd.scriptIntro[G.introFormat]=true;L.flush();$('scriptDialog').close();beginCountdown('Ready for the new script?');
  }
  function beginCountdown(title='Ready for the rain?'){
    if(!running())return;
    if(G.pendingFeatures?.length){introduceFeature();return;}
    if(G.awaitingFeedback){G.paused=false;stopLoop();syncAnimationState();scheduleFeedback();$('continueFeedbackBtn').focus({preventScroll:true});return;}
    if(needsScriptIntro(G.target)){introduceScript(G.target);return;}
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
    $('continueFeedbackBtn').classList.add('hidden');
    const profile=cfg.playStyle==='practice'?R.practiceProfile:R.profiles[cfg.difficulty],weather=R.atTime(cfg.difficulty,0,cfg.playStyle);
    const reviewIds=Array.isArray(options.reviewIds)?[...new Set(options.reviewIds)].filter(id=>candidates(cfg.mode,true).includes(id)):null;
    const sessionDuration=reviewIds?.length?60:cfg.duration,sessionBestKey=bestKey(sessionDuration,!!reviewIds?.length),now=performance.now();
    gd.difficulty=cfg.difficulty;gd.playStyle=cfg.playStyle;L.flush();
    G={mode:cfg.mode,playStyle:cfg.playStyle,sessionId:L.beginSession?.(GAME)||`${GAME}:${Date.now()}`,roundSerial:0,events:[],practiceTotal:8,practiceCompleted:0,awaitingFeedback:false,inputStartedAt:null,inputPausedMs:0,difficulty:cfg.difficulty,totalLives:profile.hearts,t:sessionDuration,sessionDuration,reviewIds:reviewIds?.length?reviewIds:null,bestKey:sessionBestKey,previousBest:gd.best[sessionBestKey]||0,bestBeaten:false,elapsed:0,lives:profile.hearts,score:0,streak:0,bestStreak:0,correct:0,attempts:0,rts:[],recent:[],drops:[],queue:[],confs:new Set(),missed:new Set(),mistakes:new Set(),newIds:new Set(),last:now,pauseAt:now,sinceSpawn:0,speed:weather.speed,gap:weather.gap,paused:true,countingDown:false,over:false,target:null,lastWarning:-10};
    const eligible=G.reviewIds||candidates(cfg.mode,true);
    G.pendingFeatures=cfg.mode==='words'?D.features.filter(f=>!gd.featuresIntro?.[f.id] && eligible.some(id=>D.wordRequirements(D.words.find(w=>w.id===id)).includes(f.id))).map(f=>f.id):[];
    closeDialogs();$('welcome').classList.add('hidden');$('gameHud').classList.remove('hidden');$('answerDock').classList.remove('hidden');
    document.body.classList.remove('is-menu');document.body.classList.add('is-playing');
    $('answer').disabled=false;$('submitBtn').disabled=false;$('answer').value='';
    $('gameLabel').textContent=(G.reviewIds?'Review · ':'')+profile.name+' · '+({hira:'Hiragana',kata:'Katakana',mix:'Mixed scripts',pair:'Script pairs',words:'Little words'}[cfg.mode]);
    $('personalBest').textContent=(G.reviewIds?'Review best · ':'Best · ')+G.previousBest;
    $('lives').classList.remove('hidden');enableSetup(false);hud();keyboardOverride=null;keyboardOpen=mobile();keyboard();focusAnswer();
    fitField();if(G.pendingFeatures.length)introduceFeature();else initializeRounds();syncAnimationState();wakeLoop();
  }
  function introduceFeature(){
    if(!running()||!G.pendingFeatures.length)return;cancelCountdown();pause(true,false);const f=D.features.find(x=>x.id===G.pendingFeatures[0]);
    $('featureTitle').textContent=f.title;$('featureExplanation').textContent=f.explanation;
    $('featureExample').textContent=`${f.example} = ${f.reading}`;$('featureContrast').textContent=`Compare ${f.contrast} = ${f.contrastReading}`;
    closeDialogs();$('featureDialog').showModal();$('continueFeatureBtn').focus({preventScroll:true});
  }
  function acknowledgeFeature(){
    if(!running()||!G.pendingFeatures.length)return;const id=G.pendingFeatures.shift();gd.featuresIntro=gd.featuresIntro||{};gd.featuresIntro[id]=true;
    D.words.filter(w=>D.wordRequirements(w).includes(id)).forEach(w=>expose(w.id,FACET,'feature-introduction',true));L.flush();$('featureDialog').close();
    if(G.pendingFeatures.length)introduceFeature();else initializeRounds();
  }
  function initializeRounds(){
    G.pauseAt=performance.now();refill();if(G.playStyle==='practice'){const plan=G.queue.slice(0,8);G.queue=Array.from({length:8},(_,i)=>plan[i%plan.length]);}
    if(!G.queue.length||!G.queue[0]){end('No eligible items yet. Open the garden and unlock more kana.','manual_finish');return;}
    spawn(G.queue.shift());updateTarget();if(!$('scriptDialog').open)beginCountdown();
  }
  function refill(){
    const plan=L.selectRound(G.reviewIds||candidates(),{facet:facet(),size:8,maxNew:cfg.mode==='words'?2:3});
    // Seed the first garden in curriculum order; reviews are interleaved thereafter.
    if(G.attempts)L.shuffle(plan);
    plan.forEach(id=>G.queue.push({id}));
  }
  function generateRound(plan,rng=Math.random){const k=D.kanaById[plan.id],kanaOnly=!!k&&(cfg.mode==='pair'||mature(plan.id));return {id:plan.id,x:rng(),kanaOnly,facet:kanaOnly?PAIR:FACET,responseFormat:kanaOnly?opposite(k).script:'romaji'};}
  function render(root,round){
    const id=round.id,k=D.kanaById[id],st=L.state(id),f=st?.facets[round.facet];
    const hint=!round.kanaOnly && (!f || f.correct===0);
    const el=document.createElement('div');el.className='drop'+(id.startsWith('w:')?' word':'');el.dataset.id=id;el.setAttribute('lang','ja');
    const glyph=document.createElement('span');glyph.textContent=symbol(id);el.appendChild(glyph);
    if(hint){const h=document.createElement('span');h.className='hint';h.textContent=accepted(round)[0];el.appendChild(h);}
    if(round.kanaOnly){const h=document.createElement('span');h.className='answer-script';h.textContent=k.script==='hiragana'?'KATAKANA':'HIRAGANA';el.appendChild(h);}
    root.appendChild(el);return {el,hint};
  }
  function spawn(entry,xHint){
    if(!entry)return;
    const round=generateRound(entry),view=render($('field'),round),w=view.el.offsetWidth,h=view.el.offsetHeight,W=fieldSize.width;
    let x=xHint;
    if(x==null){for(let tries=0;tries<10;tries++){x=12+Math.random()*Math.max(1,W-w-24);if(!G.drops.some(d=>d.y<110 && Math.abs(d.x-x)<w+8))break;}}
    x=Math.max(5,Math.min(W-w-5,x));
    const prior=L.assistanceFor?.(round.id,round.facet)||{assisted:false,reasons:[]};
    const d={...round,...view,hint:view.hint||prior.assisted,roundId:`${G.sessionId}:r:${++G.roundSerial}`,attemptCount:0,assistanceReasons:new Set([...(view.hint?['initial-reading']:[]),...(prior.assisted?prior.reasons:[])]),firstResponseMs:null,x,y:8,progress:0,w,h,wrong:0,v:1,born:performance.now(),pausedMs:0};
    if(!L.state(d.id))G.newIds.add(d.id);G.drops.push(d);dropResizeObserver.observe(d.el);if(view.hint)exposeReading(d.id,'initial-reading');place(d);if(G.target)keyboard();return d;
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
      const remaining=Math.ceil((G.countdownEnd-now)/1000);
      if(remaining<=0)completeCountdown();
      else if(remaining!==G.countdownValue){G.countdownValue=remaining;$('countdownNumber').textContent=remaining;sfx('tick');}
      wakeLoop();return;
    }
    if(!G.paused&&!G.awaitingFeedback){
      if(G.playStyle==='arcade')G.t-=dt;G.elapsed+=dt;G.sinceSpawn+=dt*1000;if(G.playStyle==='arcade'&&G.t<=0){end('Session complete','timer_elapsed');return;}
      const weather=R.atTime(G.difficulty,G.elapsed,G.playStyle);G.speed=weather.speed;G.gap=weather.gap;
      if(!G.queue.length&&G.playStyle==='arcade')refill();
      const cap=G.playStyle==='practice'?1:Math.min(R.profiles[G.difficulty].maxDrops,2+Math.floor(G.correct/8));
      if(G.drops.length<cap && G.sinceSpawn>G.gap && G.queue.length){
        const e=G.queue.shift(),d=spawn(e);
        if(e.partner && G.drops.length<cap){spawn({id:e.partner},d.x+d.w+8);}
        G.sinceSpawn=0;
      }
      const H=fieldSize.height;
      [...G.drops].forEach(d=>{if(G.over)return;d.progress+=G.speed*d.v*dt;
        if(d.progress>=1){miss(d);return;}positionDrop(d,H);
        const danger=d.progress>=.78;if(d.danger!==danger){d.danger=danger;d.el.classList.toggle('danger',danger);}
        if(danger&&!d.warned){d.warned=true;if(G.elapsed-G.lastWarning>=3){sfx('warning');G.lastWarning=G.elapsed;}}
      });
      const danger=G.drops.some(d=>d.progress>=.78);if(G.dangerActive!==danger){G.dangerActive=danger;$('field').querySelector('.waterline').classList.toggle('danger-active',danger);}
      updateTarget();textIfChanged($('time'),G.playStyle==='practice'?`${G.practiceCompleted}/${G.practiceTotal}`:fmt(G.t));
    }
    wakeLoop();
  }
  function lowest(){return G?.drops.reduce((a,b)=>!a||b.y>a.y?b:a,null);}
  function prepareAnswerFormat(format){
    const text=$('answer').value;
    const incompatible=format==='romaji'?/[ぁ-ヿ]/.test(text):format==='katakana'?/[a-zぁ-ゖ]/i.test(text):/[a-zァ-ヺ]/i.test(text);
    if(incompatible){$('answer').value='';flash(`Now type ${format}. Start a fresh answer for this format.`,false,2600,1);}
  }
  function updateTarget(){
    const t=lowest();if(t===G.target)return;
    G.target?.el.classList.remove('target');G.target=t;t?.el.classList.add('target');keyboardOverride=null;
    const format=scriptFormat(t),only=format!=='romaji';if(t)prepareAnswerFormat(format);
    $('answer').placeholder=only?'Type the matching '+format+'…':'Type the sound here…';
    $('inputScript').textContent=only?(format==='katakana'?'カ':'あ'):'a';
    $('inputFormat').textContent='Type '+format;
    $('targetHint').textContent='Any drop · highlighted first';
    $('inputNote').textContent=only?'Use your Japanese keyboard or the touch keyboard.':'Answers flow automatically. Enter to submit.';
    if(only&&!keyboardOpen){keyboardOpen=true;$('keyboardBtn').setAttribute('aria-expanded','true');}keyboard();
    if(needsScriptIntro(t) && !document.querySelector('dialog[open]'))introduceScript(t);
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
    if(detail.outcome!=='timeout'){G.attempts++;if(correct){G.correct++;G.rts.push(displayActiveMs);}}
    const stat=gd.accuracy[cfg.mode] || (gd.accuracy[cfg.mode]={attempts:0,correct:0});
    if(detail.outcome!=='timeout'){stat.attempts++;if(correct)stat.correct++;}
    L.flush();G.recent.push(correct?1:0);if(G.recent.length>12)G.recent.shift();return ev;
  }
  function effect(d,type){const e=document.createElement('div');e.className='effect '+type;e.style.left=d.x+'px';e.style.top=Math.max(0,d.y)+(type==='ripple'?d.h-45:20)+'px';$('field').appendChild(e);setTimeout(()=>e.remove(),600);}
  function remove(d,pop=false){dropResizeObserver.unobserve?.(d.el);G.drops=G.drops.filter(x=>x!==d);if(pop){d.el.classList.add('pop');setTimeout(()=>d.el.remove(),220);}else d.el.remove();}
  function hit(d){
    const ev=record(d,true,{response:d.submittedResponse,reason:'accepted'});G.streak=d.wrong?0:G.streak+1;G.score+=Math.round((ev.assistance?5:10)*(1+Math.min(G.streak,10)*.1)*(d.wrong?.3:1));
    G.bestStreak=Math.max(G.bestStreak,G.streak);
    playReading(d.id,'answer-feedback');const w=D.words.find(w=>w.id===d.id);
    flash(w?`${w.surface} · ${D.toRomaji(w.surface)} · ${w.glossEn[0]}`:`${symbol(d.id)} · ${D.kanaById[d.id].romaji}${d.kanaOnly?' → '+opposite(D.kanaById[d.id]).char:''} ✓`,false,1000,0,()=>exposeReading(d.id,'answer-feedback'));
    if(!G.bestBeaten&&G.previousBest>0&&G.score>G.previousBest){G.bestBeaten=true;celebrate('New personal best!','record');}
    else if([5,10,20].includes(G.streak))celebrate(`${G.streak} in a row!`);
    $('personalBest').textContent=(G.reviewIds?'Review best · ':'Best · ')+Math.max(G.previousBest,G.score);
    effect(d,'splash');spirit('happy');remove(d,true);checkUnlock();if(G.playStyle==='practice')finishPracticeOpportunity(false);hud();invalidateProgress();updateTarget();
  }
  function confusionFor(d,text){
    const format=d.responseFormat;
    if(format!=='romaji'){
      const typed=D.kana.find(k=>k.script===format&&k.char===text),chosen=typed&&opposite(typed);
      return {chosenItemId:chosen?.id,submittedItemId:typed?.id,candidateItemIds:typed?[typed.id]:[],reason:typed?'script-mismatch':'wrong-response-format'};
    }
    if(text===symbol(d.id))return {reason:'copied-prompt',candidateItemIds:[]};
    const k=D.kanaById[d.id],options=k?D.kana.filter(x=>x.script===k.script&&x.id!==d.id&&[x.romaji,...x.alt].includes(text)):D.words.filter(w=>w.id!==d.id&&w.acceptedRomaji.includes(text));
    return {chosenItemId:options.length===1?options[0].id:null,candidateItemIds:options.map(x=>x.id),reason:options.length>1?'ambiguous-reading':options.length?'different-item':/[ぁ-ヿ]/.test(text)?'wrong-response-format':'unrecognized-response'};
  }
  function wrong(d,text){
    const k=D.kanaById[d.id],detail=confusionFor(d,text),chosen=D.kanaById[detail.chosenItemId];
    record(d,false,{...detail,response:text});G.mistakes.add(d.id);d.wrong++;if(G.playStyle==='arcade')d.v=Math.min(2.2,d.v*1.45);d.el.classList.add('stained');G.streak=0;spirit('worried');
    const reading=d.id.startsWith('w:')?D.toRomaji(symbol(d.id)):k.romaji;
    if(G.playStyle==='practice')G.awaitingFeedback=true;
    flash(`${symbol(d.id)} = ${reading}${d.kanaOnly?' → '+opposite(k).char:''}. You typed ${text}${chosen?' → '+chosen.char:''}.`,true,3500,4,()=>exposeReading(d.id,'correction'));playReading(d.id,'correction');
    if(G.playStyle==='practice'){remove(d);finishPracticeOpportunity(true);hud();invalidateProgress();updateTarget();return;}
    if(chosen && (G.reviewIds||candidates()).includes(chosen.id)){G.confs.add(d.id+'|'+chosen.id);G.queue=G.queue.filter(e=>e.id!==d.id && e.id!==chosen.id);G.queue.splice(Math.min(2,G.queue.length),0,{id:d.id,partner:chosen.id});}
    else G.queue.splice(Math.min(2,G.queue.length),0,{id:d.id});hud();invalidateProgress();
  }
  function miss(d){
    if(G.over||!G.drops.includes(d))return;record(d,null,{outcome:'timeout',reason:'timeout'});G.missed.add(d.id);if(G.playStyle==='arcade')G.lives--;G.streak=0;
    if(G.playStyle==='practice')G.awaitingFeedback=true;
    flash(`${G.playStyle==='arcade'?'Lost a heart.':'Time to review.'} ${symbol(d.id)} = ${d.id.startsWith('w:')?D.toRomaji(symbol(d.id)):D.kanaById[d.id].romaji}${d.kanaOnly?' → '+opposite(D.kanaById[d.id]).char:''}.`,true,3500,4,()=>exposeReading(d.id,'timeout-feedback'));
    playReading(d.id,'timeout-feedback');
    if(G.playStyle==='practice'){spirit('worried');remove(d);finishPracticeOpportunity(true);hud();updateTarget();return;}
    clearTimeout(heartTimer);document.body.classList.remove('heart-hit');void $('heartLoss').offsetWidth;document.body.classList.add('heart-hit');$('heartLoss').classList.remove('hidden');
    sfx('heart');heartTimer=setTimeout(()=>{document.body.classList.remove('heart-hit');$('heartLoss').classList.add('hidden');},900);
    spirit('worried');effect(d,'ripple');remove(d);G.queue.splice(Math.min(2,G.queue.length),0,{id:d.id});hud();invalidateProgress();
    if(G.lives===0)end(`All ${G.totalLives} ${G.totalLives===1?'heart':'hearts'} lost · ${R.profiles[G.difficulty].name}`,'hearts_lost');
  }
  function finishPracticeOpportunity(needsConfirmation){
    G.practiceCompleted++;G.awaitingFeedback=needsConfirmation;
    if(needsConfirmation){stopLoop();syncAnimationState();$('answer').disabled=true;$('submitBtn').disabled=true;$('continueFeedbackBtn').classList.remove('hidden');$('continueFeedbackBtn').focus({preventScroll:true});}
    else if(G.practiceCompleted>=G.practiceTotal)end('Eight practice opportunities complete','practice_set_complete');
  }
  function continueFeedback(){
    if(!running()||!G.awaitingFeedback)return;G.awaitingFeedback=false;clearFeedback();
    if(G.practiceCompleted>=G.practiceTotal){end('Eight practice opportunities complete','practice_set_complete');return;}
    G.sinceSpawn=0;spawn(G.queue.shift());updateTarget();beginCountdown('Ready for the next item?');
  }
  function checkUnlock(){
    if(explore||cfg.mode==='words')return;
    const scripts=cfg.mode==='hira'?['hiragana']:cfg.mode==='kata'?['katakana']:cfg.mode==='mix'?['hiragana','katakana']:[];
    scripts.forEach(sc=>{if(gd.rows[sc]>=D.rowsOrder.length)return;
      if(unlocked(sc).every(k=>readiness(k).ready)){
        gd.rows[sc]++;L.flush();const row=D.rowsOrder[gd.rows[sc]-1];flash('A new row is growing: '+D.kana.filter(k=>k.script===sc && k.row===row).map(k=>k.char).join(' '),false,4000,3);sfx('unlock');if(G.playStyle==='arcade')G.queue=[];
      }
    });
  }
  function onInput(force=false){
    if(!G||G.over||G.paused||G.awaitingFeedback||composing)return;const v=normalize($('answer').value);if(!v)return;
    if(G.inputStartedAt==null){G.inputStartedAt=performance.now();G.inputPausedMs=0;}
    const matches=[...G.drops].sort((a,b)=>b.y-a.y);const match=matches.find(d=>accepted(d).includes(v));
    const longer=G.drops.some(d=>accepted(d).some(a=>a.length>v.length&&a.startsWith(v)));
    // n may be the start of na/ni/etc even when those kana are not currently falling.
    if(match && (force||(!longer&&v!=='n'))){match.submittedResponse=v;$('answer').value='';hit(match);return;}
    if(force){const t=lowest();if(t)wrong(t,v);$('answer').value='';$('answer').classList.add('bad');setTimeout(()=>$('answer').classList.remove('bad'),300);}
  }
  function hud(){
    $('score').textContent=String(G.score).padStart(3,'0');$('streak').textContent=G.streak>1?'×'+G.streak:'—';
    textIfChanged($('time'),G.playStyle==='practice'?`${G.practiceCompleted}/${G.practiceTotal}`:fmt(G.t));
    const caption=$('time').parentElement?.querySelector('small');if(caption)caption.textContent=G.playStyle==='practice'?'ITEMS':'TIME';
    $('lives').classList.toggle('hidden',G.playStyle==='practice');$('lives').textContent=G.playStyle==='practice'?'':'♥ '.repeat(G.lives)+'♡ '.repeat(G.totalLives-G.lives);
    $('lives').setAttribute('aria-label',G.playStyle==='practice'?'Practice has no hearts':`${G.lives} of ${G.totalLives} hearts remaining`);document.body.classList.toggle('low-hearts',G.playStyle==='arcade'&&G.lives===1);
  }
  function pause(value=(G?.countingDown||!G?.paused),showDialog=true){
    if(!running())return;
    if(value)cancelCountdown();
    if(G.paused===value){if(value){stopLoop();syncAnimationState();if(showDialog&&!document.querySelector('dialog[open]'))showPause();}return;}
    if(value){if(currentFeedback&&!G.awaitingFeedback)currentFeedback.ms=Math.max(0,feedbackUntil-performance.now());clearTimeout(feedbackTimer);G.paused=true;G.pauseAt=performance.now();A.stop();spirit('sleep');$('pauseHint').textContent='';if(showDialog){closeDialogs();showPause();}}
    else{
      if($('pauseOverlay').open)$('pauseOverlay').close();
      beginCountdown('Ready to continue?');
    }
    G.last=performance.now();
    if(value)stopLoop();syncAnimationState();
  }
  function dispose(){cancelCountdown();A.stop();feedbackQueue=[];clearFeedback();if(G){G.over=true;G.drops.forEach(d=>{dropResizeObserver.unobserve?.(d.el);d.el.remove();});G.drops=[];}syncAnimationState();L.flush();}
  function end(reason,completionReason='manual_finish'){
    if(!G||G.over)return;
    const key=G.bestKey,first=G.events.filter(e=>e.firstAttempt&&e.outcome!=='timeout'),independent=first.filter(e=>!e.assistance),independentCorrect=independent.filter(e=>e.correct),helpCorrect=G.events.filter(e=>e.correct&&e.assistance),expired=G.events.filter(e=>e.outcome==='timeout');
    const old=gd.best[key]||0;gd.best[key]=Math.max(old,G.score);gd.sessions=(gd.sessions||0)+1;L.flush();
    // Explicit end reasons, never inferred from UI copy; no answer, score, or item data leaves the app.
    if(G.analyticsStarted)window.NihongoAnalytics?.track('practice_complete',{practice_mode:G.reviewIds?'review':G.mode,completion_reason:completionReason});
    $('resultTitle').textContent=G.correct?'Your garden grew.':'Every drop is a new beginning.';
    const readingFirst=independentCorrect.filter(e=>e.facet===FACET).length,pairFirst=independentCorrect.filter(e=>e.facet===PAIR).length;
    $('resultMessage').textContent=reason+`. Independent first answers: ${readingFirst} readings; ${pairFirst} script matches. ${helpCorrect.length} correct answers used help or a correction. Familiarity is a practice estimate, not proof of long-term retention.`+(G.score>old&&G.score?' A new personal best!':'')+(cfg.mode==='hira'&&gd.rows.hiragana>=12?' Try Little words next.':'');
    $('resultStats').innerHTML=`<div><b>${G.score}</b><small>POINTS</small></div><div><b>${independentCorrect.length}/${independent.length}</b><small>INDEPENDENT FIRST</small></div><div><b>${helpCorrect.length}</b><small>CORRECT WITH HELP</small></div><div><b>${expired.length}</b><small>EXPIRED DROPS</small></div>`;
    const review=[...new Set([...G.mistakes,...G.missed,...[...G.confs].flatMap(c=>c.split('|'))])];
    lastReview=review.filter(id=>candidates().includes(id));$('reviewPracticeBtn').classList.toggle('hidden',!lastReview.length);
    $('resultReview').innerHTML=review.length?'<p>A little more practice · tap to listen</p><div class="review-grid">'+review.map(id=>{
      const char=symbol(id),k=D.kanaById[id],word=D.words.find(w=>w.id===id),reading=k?.romaji||D.toRomaji(char),pair=cfg.mode==='pair'?` → ${opposite(k).char}`:'';
      const tag=A.hasRecording(char)?'button':'div';
      return `<${tag} class="review-card" ${tag==='button'?`type="button" data-kana="${escapeText(char)}" aria-label="Listen to ${escapeText(char)}, ${escapeText(reading)}"`:''}><span lang="ja">${escapeText(char+pair)}</span><small>${escapeText(reading)}</small>${word?`<small>${escapeText(word.glossEn[0])}</small>`:''}${tag==='button'?'<span class="review-audio" aria-hidden="true">♪</span>':''}</${tag}>`;
    }).join('')+'</div>':G.correct?'Keep going. Familiarity grows one answer at a time.':'Listen to the current row, then try again.';
    review.forEach(id=>exposeReading(id,'results-review',true));L.flush();$('continueFeedbackBtn').classList.add('hidden');
    dispose();closeDialogs();$('results').showModal();$('answer').disabled=true;$('submitBtn').disabled=true;enableSetup(true);$('answer').blur();$('againBtn').focus({preventScroll:true});$('results').querySelector('.dialog-panel').scrollTop=0;
  }
  function keyboard(){
    $('keyboard').classList.toggle('hidden',!keyboardOpen);$('keyboardBtn').setAttribute('aria-expanded',keyboardOpen);
    document.body.dataset.keyboard=String(keyboardOpen);document.body.classList.toggle('has-keyboard',keyboardOpen);
    $('answer').inputMode=mobile()&&keyboardOpen?'none':'text';
    const t=G?.target,kana=keyboardOverride==null?(!!t?.kanaOnly||cfg.mode==='pair'):keyboardOverride;
    $('keyboardModeBtn').classList.toggle('hidden',!keyboardOpen||!G?.drops.some(d=>d.kanaOnly));
    $('keyboardModeBtn').textContent=kana?'ABC':'かな';$('keyboardModeBtn').setAttribute('aria-label',kana?'Switch keyboard to romaji letters':'Switch keyboard to kana');
    if(!keyboardOpen)return;
    const kanaTarget=t?.kanaOnly?t:G?.drops.find(d=>d.kanaOnly);
    const pool=kana&&kanaTarget?unlocked(D.kanaById[kanaTarget.id].script==='hiragana'?'katakana':'hiragana').map(k=>k.char):[];
    // Pair mode can use hiragana counterparts even when katakana has progressed farther.
    if(kana){candidates().forEach(id=>{const k=D.kanaById[id];if(k){const c=opposite(k).char;if(!pool.includes(c))pool.push(c);}});}
    $('keyboard').classList.toggle('letters',!kana);
    const signature=JSON.stringify([kana,kana?pool:[]]);if(signature===keyboardSignature)return;keyboardSignature=signature;
    const activeKey=$('keyboard').contains(document.activeElement)?document.activeElement.dataset.key:null;
    const key=c=>`<button type="button" data-key="${escapeText(c)}">${escapeText(c)}</button>`;
    const actions='<button type="button" class="wide" data-key="backspace">Delete</button><button type="button" class="wide" data-key="enter">Enter ↵</button>';
    $('keyboard').innerHTML=kana?pool.map(key).join('')+actions:['qwertyuiop','asdfghjkl',"zxcvbnm'"].map(row=>'<div class="keyboard-row">'+row.split('').map(key).join('')+'</div>').join('')+'<div class="keyboard-actions">'+actions+'</div>';
    if(activeKey)[...$('keyboard').querySelectorAll('[data-key]')].find(b=>b.dataset.key===activeKey)?.focus({preventScroll:true});
  }
  function renderEffects(){document.body.classList.toggle('reduce-effects',!!gd.reducedEffects);$('effectsBtn').setAttribute('aria-pressed',!!gd.reducedEffects);$('effectsBtn').textContent='Reduced effects: '+(gd.reducedEffects?'On':'Off');}
  $('startBtn').onclick=$('againBtn').onclick=start;
  $('backBtn').onclick=showMenu;
  for(const id of ['mode','settingsMode'])$(id).onchange=()=>{if(running())return;cfg.mode=$(id).value;renderMenu();};
  for(const id of ['practiceSelect','settingsPracticeSelect'])$(id).onchange=()=>{if(running())return;cfg.playStyle=$(id).value==='arcade'?'arcade':'practice';gd.playStyle=cfg.playStyle;L.flush();renderMenu();};
  $('difficultySelect').onchange=()=>{if(running())return;cfg.difficulty=$('difficultySelect').value;gd.difficulty=cfg.difficulty;L.flush();renderMenu();};
  $('durationSelect').onchange=()=>{if(running())return;cfg.duration=+$('durationSelect').value;renderMenu();};
  document.querySelectorAll('[data-difficulty]').forEach(b=>b.onclick=()=>{if(running())return;cfg.difficulty=b.dataset.difficulty;gd.difficulty=cfg.difficulty;L.flush();renderMenu();});
  document.querySelectorAll('[data-duration]').forEach(b=>b.onclick=()=>{cfg.duration=+b.dataset.duration;renderMenu();});
  document.querySelectorAll('[data-script]').forEach(b=>b.onclick=()=>{mapScript=b.dataset.script;document.querySelectorAll('[data-script]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b);});renderMenu();if($('progressDialog').open)exposeReference();else if(!$('welcome').classList.contains('hidden'))exposeLesson();});
  const listen=async e=>{const b=e.target.closest('[data-kana]');if(b){if(running())pause(true,false);exposeReading((D.kana.find(k=>k.char===b.dataset.kana)||D.words.find(w=>w.surface===b.dataset.kana)).id,'reference-audio');if(!await A.play(b.dataset.kana)&&A.enabled)flash('Audio is unavailable. The lesson reading is shown on the tile.',true);}};
  $('lesson').onclick=$('masteryMap').onclick=$('resultReview').onclick=listen;
  $('listenBtn').onclick=async()=>{const t=lowest();if(t){pause(true);const reading=symbol(t.id)+' = '+(D.kanaById[t.id]?.romaji||D.toRomaji(symbol(t.id)));$('pauseHint').textContent=reading;exposeReading(t.id,'target-help');await A.play(symbol(t.id));}};
  function renderSound(){const b=$('soundBtn');b.querySelector('use').setAttribute('href',A.enabled?'#icon-sound':'#icon-muted');b.querySelector('.control-label').textContent=A.enabled?'Sound on':'Sound off';b.setAttribute('aria-pressed',A.enabled);b.setAttribute('aria-label',A.enabled?'Mute sound':'Enable sound');b.title=A.enabled?'Mute sound':'Enable sound';}
  $('soundBtn').onclick=()=>{A.enabled=!A.enabled;gd.sound=A.enabled;L.flush();renderSound();if(A.enabled)sfx('menu');};
  $('effectsBtn').onclick=()=>{gd.reducedEffects=!gd.reducedEffects;L.flush();renderEffects();};
  $('skipCountdown').onclick=completeCountdown;$('continueScriptBtn').onclick=acknowledgeScript;$('continueFeatureBtn').onclick=acknowledgeFeature;$('continueFeedbackBtn').onclick=continueFeedback;
  $('reviewPracticeBtn').onclick=()=>start({reviewIds:lastReview});
  $('pauseBtn').onclick=()=>pause();$('resumeBtn').onclick=()=>pause(false);$('finishBtn').onclick=()=>end('Session finished');
  $('answerForm').onsubmit=e=>{e.preventDefault();onInput(true);};$('answer').oninput=()=>onInput();
  $('answer').oncompositionstart=()=>{composing=true;if(G?.inputStartedAt==null&&!G?.paused&&running()){G.inputStartedAt=performance.now();G.inputPausedMs=0;}};$('answer').oncompositionend=()=>{composing=false;onInput();};
  $('keyboardBtn').onclick=()=>{keyboardOpen=!keyboardOpen;keyboard();if(keyboardOpen)$('answer').blur();else focusAnswer();};
  $('keyboardModeBtn').onclick=()=>{keyboardOverride=$('keyboard').classList.contains('letters');const t=G?.drops.find(d=>d.kanaOnly);prepareAnswerFormat(keyboardOverride?scriptFormat(t):'romaji');keyboard();};
  $('keyboard').onclick=e=>{const b=e.target.closest('[data-key]');if(!b)return;if(!G||G.over||G.paused)return;const key=b.dataset.key;if(key==='enter')onInput(true);else{$('answer').value=key==='backspace'?$('answer').value.slice(0,-1):$('answer').value+key;onInput();}};
  $('gardenBtn').onclick=$('progressBtn').onclick=$('pauseGardenBtn').onclick=()=>openPanel('progressDialog');
  $('closeGarden').onclick=$('returnGarden').onclick=()=>closePanel('progressDialog');
  $('settingsBtn').onclick=$('pauseSettingsBtn').onclick=()=>openPanel('settingsDialog');
  $('closeSettings').onclick=$('saveSettings').onclick=()=>closePanel('settingsDialog');
  $('helpBtn').onclick=$('pauseHelpBtn').onclick=()=>openPanel('helpDialog');$('closeHelp').onclick=()=>closePanel('helpDialog');
  $('resetBtn').onclick=()=>{if(!confirm('Reset all learning progress on this device?'))return;dispose();L.reset();gd=L.gameData(GAME);gd.rows={hiragana:1,katakana:1};gd.best={};gd.accuracy={};cfg.mode='hira';cfg.difficulty='normal';cfg.playStyle='arcade';L.flush();$('answer').disabled=true;$('submitBtn').disabled=true;showMenu();};
  $('exportBtn').onclick=()=>{const blob=new Blob([L.export()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kana-rain-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.querySelectorAll('dialog.game-dialog').forEach(d=>d.addEventListener('cancel',e=>{e.preventDefault();if(d.id==='pauseOverlay')pause(false);else if(d.id==='scriptDialog'){d.close();showPause();}else if(d.id==='featureDialog'){d.close();showPause();}else if(d.id==='results')showMenu();else closePanel(d.id);}));
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
  window.KanaRain={id:GAME,capabilities:{facets:[FACET,PAIR],itemTypes:['kana','word'],input:['typing','touch'],timed:true,playStyles:['arcade','practice']},generateRound,render,score,dispose,start,pause,end,candidates,accepted,difficultyProfiles:R.profiles,get state(){return G;},get settings(){return {...cfg};},get gameData(){return gd;}};
})();
