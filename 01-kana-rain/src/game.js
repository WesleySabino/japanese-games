(async function () {
  'use strict';
  const D=window.JPData, L=window.Learner, A=window.KanaAudio, R=window.KanaDifficulty, FACET='form→sound', PAIR='script→script', GAME='kana-rain';
  const $=id=>document.getElementById(id), normalize=s=>s.trim().toLowerCase().normalize('NFKC');
  await L.ready;
  let gd=L.gameData(GAME);
  gd.rows=gd.rows || {hiragana:1,katakana:1}; gd.best=gd.best || {}; gd.accuracy=gd.accuracy || {};
  const explore=new URLSearchParams(location.search).has('all');
  let cfg={mode:'hira',duration:180,difficulty:R.profiles[gd.difficulty]?gd.difficulty:'normal'}, G=null, raf=0, mapScript='hiragana', keyboardOpen=false, keyboardOverride=null, composing=false, feedbackTimer, spiritTimer, milestoneTimer, heartTimer, feedbackPriority=-1, feedbackUntil=0, currentFeedback=null, feedbackQueue=[], lastReview=[];
  A.enabled=gd.sound!==false;
  const sfx=kind=>window.KanaSfx?.play(kind);
  const panelOrigins=new Map();
  const mobile=()=>matchMedia('(pointer:coarse)').matches || innerWidth<=650;
  const running=()=>G && !G.over;
  function focusAnswer(){if(!running() || G.paused || G.countingDown)return;$('answer').inputMode=mobile()&&keyboardOpen?'none':'text';$('answer').focus({preventScroll:true});}
  function closeDialogs(){document.querySelectorAll('dialog.game-dialog[open]').forEach(d=>d.close());}
  function openPanel(id){
    const current=document.querySelector('dialog[open]');
    const origin=current?.id==='pauseOverlay'?'pause':current?.id==='results'?'results':running()&&(!G.paused||G.countingDown)?'game':'title';
    panelOrigins.set(id,origin);
    if(running())pause(true,false);
    closeDialogs();renderMenu();
    if(id==='progressDialog')$('gardenContext').textContent=running()?'GAME PAUSED':'ONE DROP AT A TIME';
    if(id==='settingsDialog')$('settingsNote').textContent=running()?'Your current session is paused. Session options unlock when it finishes.':'Small, steady steps. Every answer saves your progress.';
    $(id).showModal();
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
    keyboardOpen=false;keyboardOverride=null;keyboard();enableSetup(true);$('fieldSpirit').className='spirit idle';document.body.classList.remove('low-hearts','heart-hit');$('heartLoss').classList.add('hidden');$('startBtn').focus({preventScroll:true});
  }
  function showPause(){
    $('pauseOverlay').showModal();$('resumeBtn').focus({preventScroll:true});$('pauseOverlay').querySelector('.dialog-panel').scrollTop=0;
  }
  const rowNames={a:'Vowels',nn:'N',ky:'K combinations',sy:'SH combinations',ty:'CH combinations'};
  const facet=()=>cfg.mode==='pair'?PAIR:FACET;
  const symbol=id=>id.slice(id.indexOf(':')+1);
  function opposite(k){return D.kana.find(x=>x.pairId===k.pairId && x.script!==k.script);}
  function unlocked(script){const rows=D.rowsOrder.slice(0,explore?D.rowsOrder.length:gd.rows[script]);return D.kana.filter(k=>k.script===script && rows.includes(k.row));}
  function candidates(mode=cfg.mode){
    if(mode==='hira')return unlocked('hiragana').map(k=>k.id);
    if(mode==='kata'||mode==='pair')return unlocked('katakana').map(k=>k.id);
    if(mode==='mix')return unlocked('hiragana').concat(unlocked('katakana')).map(k=>k.id);
    const known=new Set(unlocked('hiragana').concat(unlocked('katakana')).map(k=>k.char));
    return D.words.filter(w=>D.splitKana(w.surface).every(c=>known.has(c)||['っ','ッ','ー'].includes(c))).map(w=>w.id);
  }
  function modeAvailable(mode){if(explore||mode==='hira')return true;if(mode==='words')return candidates('words').length>=4;return gd.rows.hiragana>=11;}
  function mature(id){const f=L.state(id)?.facets[FACET];return id.startsWith('kana:') && f?.correct>=6 && L.mastery(id,FACET)>=.75;}
  function accepted(id,kanaOnly=false){
    if(id.startsWith('w:'))return [symbol(id),...D.romajiVariants(symbol(id))];
    const k=D.kanaById[id];
    if(kanaOnly||cfg.mode==='pair')return [opposite(k).char];
    return [k.romaji,...k.alt,k.char];
  }
  function fmt(s){s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
  function escapeText(text){const el=document.createElement('span');el.textContent=text;return el.innerHTML;}
  function flash(text,bad=false,ms=1800,priority=bad?4:0){
    const now=performance.now();
    if(now<feedbackUntil){
      if(priority===3&&feedbackPriority===3){feedbackQueue.push({text,bad,ms,priority});return;}
      if(priority<feedbackPriority){if(priority>0)feedbackQueue.push({text,bad,ms,priority});return;}
      if(priority>feedbackPriority&&feedbackPriority>0&&currentFeedback)feedbackQueue.unshift({...currentFeedback,ms:Math.max(1000,feedbackUntil-now)});
    }
    clearTimeout(feedbackTimer);feedbackPriority=priority;feedbackUntil=performance.now()+ms;
    currentFeedback={text,bad,ms,priority};
    $('feedback').textContent=text;$('feedback').className='feedback show'+(bad?' bad':'');
    feedbackTimer=setTimeout(()=>{$('feedback').className='feedback';feedbackPriority=-1;feedbackUntil=0;currentFeedback=null;const next=feedbackQueue.shift();if(next)flash(next.text,next.bad,next.ms,next.priority);},ms);
  }
  function celebrate(text,kind='streak'){
    clearTimeout(milestoneTimer);$('milestoneFeedback').textContent=text;$('milestoneFeedback').className='milestone-feedback show';
    sfx(kind);milestoneTimer=setTimeout(()=>$('milestoneFeedback').className='milestone-feedback',2200);
  }
  const bestKey=(duration=cfg.duration,review=false)=>`${cfg.mode}:${cfg.difficulty}:${duration}${review?':review':''}`;
  function readiness(k){
    const f=L.state(k.id)?.facets[FACET],unaided=f?.unaided||0,attempts=(f?.correct||0)+(f?.errors||0),accuracy=attempts?(f.correct/attempts):0;
    return {k,unaided,accuracy,attempts,ready:unaided>=2&&accuracy>=.85};
  }
  function renderUnlocks(script){
    const count=gd.rows[script],next=D.rowsOrder[count],rows=unlocked(script).map(readiness),ready=rows.filter(x=>x.ready).length;
    $('unlockSummary').textContent=explore?'All rows available in exploration':!next?'All rows unlocked':`${ready} / ${rows.length} kana ready for the next row`;
    $('unlockBar').style.width=(rows.length?ready/rows.length*100:0)+'%';
    $('unlockDetails').innerHTML=rows.map(({k,unaided,accuracy,attempts,ready})=>`<div class="unlock-item ${ready?'ready':'pending'}"><span lang="ja">${k.char}</span><span>${k.romaji}</span><small>${Math.min(2,unaided)}/2 unaided · ${attempts?Math.floor(accuracy*100)+'%':'No answers yet'}</small><span aria-label="${ready?'Ready':'Keep practicing'}">${ready?'✓':'○'}</span></div>`).join('');
  }
  function renderBest(){const best=gd.best[bestKey()]||0;$('menuBest').textContent=best?`Personal best · ${best} points`:'Your first personal best is waiting';}
  function spirit(mood){clearTimeout(spiritTimer);$('fieldSpirit').className='spirit '+mood;spiritTimer=setTimeout(()=>$('fieldSpirit').className='spirit idle',900);}
  function renderMenu(){
    const names={hira:'Hiragana',kata:'Katakana',mix:'Mixed scripts',pair:'Script pairs',words:'Little words'};
    for(const id of ['mode','settingsMode'])[...$(id).options].forEach(o=>{o.disabled=!modeAvailable(o.value);o.textContent=names[o.value]+(o.disabled?' · Locked':'');});
    $('modeLocks').innerHTML=['kata','mix','pair','words'].map(mode=>`<div class="mode-lock"><strong>${names[mode]}</strong><span>${modeAvailable(mode)?'Available':mode==='words'?`${candidates('words').length}/4 readable words · unlock more kana`:`Hiragana rows ${Math.min(11,gd.rows.hiragana)}/11 · unlock the basic rows`}</span></div>`).join('');
    if(!modeAvailable(cfg.mode))cfg.mode='hira';$('mode').value=$('settingsMode').value=cfg.mode;
    $('modeNote').textContent=cfg.mode==='pair'?'Produce the matching hiragana. No answer choices.':cfg.mode==='words'?'Read the whole word. Its meaning appears after an answer.':'Start with hiragana. Other modes grow with you.';
    const active=running();$('difficultySelect').value=cfg.difficulty;$('durationSelect').value=cfg.duration;
    for(const id of ['mode','settingsMode','difficultySelect','durationSelect'])$(id).disabled=!!active;
    document.querySelectorAll('[data-difficulty]').forEach(b=>{b.disabled=!!active;b.classList.toggle('selected',b.dataset.difficulty===cfg.difficulty);b.setAttribute('aria-pressed',b.dataset.difficulty===cfg.difficulty);});
    document.querySelectorAll('[data-duration]').forEach(b=>b.classList.toggle('selected',+b.dataset.duration===cfg.duration));
    const sc=mapScript, rows=unlocked(sc), count=explore?D.rowsOrder.length:gd.rows[sc], row=D.rowsOrder[count-1];
    const current=rows.filter(k=>k.row===row);$('rowName').textContent=rowNames[row]||row.toUpperCase()+'-row';
    $('lesson').innerHTML=current.map(k=>`<button data-kana="${k.char}" data-known="${L.mastery(k.id,FACET)>=.55}" aria-label="Listen to ${k.char}, ${k.romaji}">${k.char}<small>${k.romaji}</small></button>`).join('');
    $('unlockNote').textContent=explore?'Exploration: all content is available. Learning evidence is still saved.':'Each unlocked kana needs 2 unaided successes and at least 85% overall accuracy. Earlier rows count too.';
    const next=D.rowsOrder[count];$('milestone').textContent=next?'Meet '+(rowNames[next]||next.toUpperCase()+'-row'):'Your whole kana garden';
    $('milestoneKana').textContent=next?D.kana.filter(k=>k.script===sc && k.row===next).map(k=>k.char).join(' '):'Keep your reading growing';
    renderMap();renderUnlocks(sc);renderBest();renderEffects();
  }
  function renderMap(){
    const items=D.kana.filter(k=>k.script===mapScript), available=new Set(unlocked(mapScript).map(k=>k.id));
    $('masteryMap').innerHTML=items.map(k=>{const m=L.mastery(k.id,FACET);const cls=m===0?'new':m<.55?'learning':m<.75?'known':'strong';return `<button class="${cls} ${available.has(k.id)?'':'locked'} ${k.kind==='yoon'?'compound':''}" data-kana="${k.char}" title="${k.char} · ${k.romaji} · ${Math.round(m*100)}% familiarity" aria-label="Listen to ${k.char}, ${k.romaji}, ${Math.round(m*100)} percent familiarity">${k.char}</button>`;}).join('');
    const known=items.filter(k=>L.mastery(k.id,FACET)>=.55).length, pct=Math.round(known/items.length*100);
    $('masteryCount').textContent=`${known} / ${items.length} familiar`;$('masteryPercent').textContent=pct+'%';$('masteryBar').style.width=pct+'%';
    $('totalLearned').textContent=D.kana.filter(k=>L.mastery(k.id,FACET)>=.55).length;
  }
  function enableSetup(value){for(const id of ['mode','settingsMode','difficultySelect','durationSelect'])$(id).disabled=!value;document.querySelectorAll('[data-difficulty],[data-duration]').forEach(b=>b.disabled=!value);$('startBtn').disabled=!value;if(value)renderMenu();}
  function cancelCountdown(){if(G)G.countingDown=false;$('countdownOverlay').classList.add('hidden');}
  function scriptFormat(d){return d?.kanaOnly?(D.kanaById[d.id].script==='hiragana'?'katakana':'hiragana'):cfg.mode==='pair'?'hiragana':'romaji';}
  function needsScriptIntro(d){return d?.kanaOnly && !gd.scriptIntro?.[scriptFormat(d)];}
  function introduceScript(d){
    cancelCountdown();pause(true,false);const format=scriptFormat(d);G.introFormat=format;
    $('scriptExample').textContent=`${symbol(d.id)} → ${opposite(D.kanaById[d.id]).char}`;
    $('scriptExplanation').textContent=`Type the matching ${format} for these familiar kana. The answer format is shown above your keyboard. Use the kana keys or your Japanese keyboard.`;
    closeDialogs();$('scriptDialog').showModal();$('continueScriptBtn').focus({preventScroll:true});
  }
  function acknowledgeScript(){
    if(!running())return;gd.scriptIntro=gd.scriptIntro||{};gd.scriptIntro[G.introFormat]=true;L.flush();$('scriptDialog').close();beginCountdown('Ready for the new script?');
  }
  function beginCountdown(title='Ready for the rain?'){
    if(!running())return;
    if(needsScriptIntro(G.target)){introduceScript(G.target);return;}
    if(!G.paused){G.paused=true;G.pauseAt=performance.now();}
    G.countingDown=true;G.countdownEnd=performance.now()+3000;G.countdownValue=3;
    $('countdownTitle').textContent=title;$('countdownNumber').textContent='3';$('countdownOverlay').classList.remove('hidden');
    $('answer').disabled=true;$('submitBtn').disabled=true;$('skipCountdown').focus({preventScroll:true});sfx('tick');
  }
  function completeCountdown(){
    if(!running()||!G.countingDown)return;cancelCountdown();
    const now=performance.now(),elapsed=now-(G.pauseAt||now);G.drops.forEach(d=>d.pausedMs+=elapsed);
    G.paused=false;G.last=now;$('answer').disabled=false;$('submitBtn').disabled=false;focusAnswer();spirit('idle');
    // Count real gameplay once; countdowns on pause/resume are not new sessions.
    if(!G.analyticsStarted){G.analyticsStarted=true;window.NihongoAnalytics?.track('practice_start',{practice_mode:G.reviewIds?'review':G.mode});}
  }
  function start(options={}){
    if(G&&!G.over)return;
    cancelAnimationFrame(raf);clearTimeout(feedbackTimer);clearTimeout(milestoneTimer);clearTimeout(heartTimer);feedbackPriority=-1;feedbackUntil=0;currentFeedback=null;feedbackQueue=[];
    $('feedback').className='feedback';$('milestoneFeedback').className='milestone-feedback';$('heartLoss').classList.add('hidden');document.body.classList.remove('heart-hit');$('field').querySelectorAll('.drop,.effect').forEach(e=>e.remove());
    const profile=R.profiles[cfg.difficulty],weather=R.atTime(cfg.difficulty,0);
    const reviewIds=Array.isArray(options.reviewIds)?[...new Set(options.reviewIds)].filter(id=>candidates().includes(id)):null;
    const sessionDuration=reviewIds?.length?60:cfg.duration,sessionBestKey=bestKey(sessionDuration,!!reviewIds?.length),now=performance.now();
    gd.difficulty=cfg.difficulty;L.flush();
    G={mode:cfg.mode,difficulty:cfg.difficulty,totalLives:profile.hearts,t:sessionDuration,sessionDuration,reviewIds:reviewIds?.length?reviewIds:null,bestKey:sessionBestKey,previousBest:gd.best[sessionBestKey]||0,bestBeaten:false,elapsed:0,lives:profile.hearts,score:0,streak:0,bestStreak:0,correct:0,attempts:0,rts:[],recent:[],drops:[],queue:[],confs:new Set(),missed:new Set(),mistakes:new Set(),newIds:new Set(),last:now,pauseAt:now,sinceSpawn:0,speed:weather.speed,gap:weather.gap,paused:true,countingDown:false,over:false,target:null,lastWarning:-10};
    closeDialogs();$('welcome').classList.add('hidden');$('gameHud').classList.remove('hidden');$('answerDock').classList.remove('hidden');
    document.body.classList.remove('is-menu');document.body.classList.add('is-playing');
    $('answer').disabled=false;$('submitBtn').disabled=false;$('answer').value='';
    $('gameLabel').textContent=(G.reviewIds?'Review · ':'')+profile.name+' · '+({hira:'Hiragana',kata:'Katakana',mix:'Mixed scripts',pair:'Script pairs',words:'Little words'}[cfg.mode]);
    $('personalBest').textContent=(G.reviewIds?'Review best · ':'Best · ')+G.previousBest;
    $('lives').classList.remove('hidden');enableSetup(false);hud();keyboardOverride=null;keyboardOpen=mobile();keyboard();focusAnswer();
    refill();spawn(G.queue.shift());updateTarget();if(!$('scriptDialog').open)beginCountdown();raf=requestAnimationFrame(loop);
  }
  function refill(){
    const plan=L.selectRound(G.reviewIds||candidates(),{facet:facet(),size:8,maxNew:cfg.mode==='words'?2:3});
    // Seed the first garden in curriculum order; reviews are interleaved thereafter.
    if(G.attempts)L.shuffle(plan);
    plan.forEach(id=>G.queue.push({id}));
  }
  function generateRound(plan,rng=Math.random){return {id:plan.id,x:rng(),kanaOnly:cfg.mode==='pair'||mature(plan.id)};}
  function render(root,round){
    const id=round.id,k=D.kanaById[id],st=L.state(id),f=st?.facets[facet()];
    const hint=!round.kanaOnly && (!f || f.correct===0);
    const el=document.createElement('div');el.className='drop'+(id.startsWith('w:')?' word':'');el.dataset.id=id;el.setAttribute('lang','ja');
    const glyph=document.createElement('span');glyph.textContent=symbol(id);el.appendChild(glyph);
    if(hint){const h=document.createElement('span');h.className='hint';h.textContent=accepted(id)[id.startsWith('w:')?1:0];el.appendChild(h);}
    if(round.kanaOnly){const h=document.createElement('span');h.className='answer-script';h.textContent=k.script==='hiragana'?'KATAKANA':'HIRAGANA';el.appendChild(h);}
    root.appendChild(el);return {el,hint};
  }
  function spawn(entry,xHint){
    if(!entry)return;
    const round=generateRound(entry),view=render($('field'),round),w=view.el.offsetWidth,h=view.el.offsetHeight,W=$('field').clientWidth;
    let x=xHint;
    if(x==null){for(let tries=0;tries<10;tries++){x=12+Math.random()*Math.max(1,W-w-24);if(!G.drops.some(d=>d.y<110 && Math.abs(d.x-x)<w+8))break;}}
    x=Math.max(5,Math.min(W-w-5,x));
    const d={id:entry.id,...view,kanaOnly:round.kanaOnly,x,y:8,progress:0,w,h,wrong:0,v:1,born:performance.now(),pausedMs:0};
    if(!L.state(d.id))G.newIds.add(d.id);G.drops.push(d);place(d);if(G.target)keyboard();return d;
  }
  function place(d){d.el.style.transform=`translate(${d.x}px,${d.y}px)`;}
  function positionDrop(d,H=$('field').clientHeight){
    const floor=Math.max(8,H-d.h-27);
    d.y=8+d.progress*(floor-8);place(d);
  }
  function loop(now){
    if(!G||G.over)return;const dt=Math.min(.1,Math.max(0,(now-G.last)/1000));G.last=now;
    if(G.countingDown){
      const remaining=Math.ceil((G.countdownEnd-now)/1000);
      if(remaining<=0)completeCountdown();
      else if(remaining!==G.countdownValue){G.countdownValue=remaining;$('countdownNumber').textContent=remaining;sfx('tick');}
      raf=requestAnimationFrame(loop);return;
    }
    if(!G.paused){
      G.t-=dt;G.elapsed+=dt;G.sinceSpawn+=dt*1000;if(G.t<=0){end('Session complete','timer_elapsed');return;}
      const weather=R.atTime(G.difficulty,G.elapsed);G.speed=weather.speed;G.gap=weather.gap;
      if(!G.queue.length)refill();
      const cap=Math.min(R.profiles[G.difficulty].maxDrops,2+Math.floor(G.correct/8));
      if(G.drops.length<cap && G.sinceSpawn>G.gap && G.queue.length){
        const e=G.queue.shift(),d=spawn(e);
        if(e.partner && G.drops.length<cap){spawn({id:e.partner},d.x+d.w+8);}
        G.sinceSpawn=0;
      }
      const H=$('field').clientHeight,W=$('field').clientWidth;
      // Container queries can resize a sprite after the field observer has fired.
      // Read all sprite sizes together before writing transforms so orientation changes are safe.
      const sizes=G.drops.map(d=>({d,w:d.el.offsetWidth,h:d.el.offsetHeight}));
      sizes.forEach(({d,w,h})=>{if(d.w!==w||d.h!==h){d.w=w;d.h=h;d.x=Math.max(5,Math.min(d.x,W-w-5));}});
      [...G.drops].forEach(d=>{if(G.over)return;d.progress+=G.speed*d.v*dt;
        if(d.progress>=1){miss(d);return;}positionDrop(d,H);
        const danger=d.progress>=.78;d.el.classList.toggle('danger',danger);
        if(danger&&!d.warned){d.warned=true;if(G.elapsed-G.lastWarning>=3){sfx('warning');G.lastWarning=G.elapsed;}}
      });
      $('field').querySelector('.waterline').classList.toggle('danger-active',G.drops.some(d=>d.progress>=.78));
      updateTarget();$('time').textContent=fmt(G.t);
    }
    if(!G.over)raf=requestAnimationFrame(loop);
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
  function score(round,response){return [{itemId:round.id,facet:facet(),correct:response.correct,rtMs:response.rtMs,weight:round.hint?.5:1,chosenItemId:response.chosenItemId,gameId:GAME}];}
  function record(d,correct,chosenItemId){
    const rt=Math.max(0,performance.now()-d.born-d.pausedMs);
    const ev=score(d,{correct,rtMs:rt,chosenItemId})[0];
    const st=L.record(ev.itemId,ev.facet,ev);
    if(correct&&!d.hint&&!d.wrong && rt>=250)st.facets[facet()].unaided=(st.facets[facet()].unaided||0)+1;
    L.flush();
    G.attempts++;if(correct){G.correct++;G.rts.push(rt);}
    const stat=gd.accuracy[cfg.mode] || (gd.accuracy[cfg.mode]={attempts:0,correct:0});stat.attempts++;if(correct)stat.correct++;
    L.flush();G.recent.push(correct?1:0);if(G.recent.length>12)G.recent.shift();
  }
  function effect(d,type){const e=document.createElement('div');e.className='effect '+type;e.style.left=d.x+'px';e.style.top=Math.max(0,d.y)+(type==='ripple'?d.h-45:20)+'px';$('field').appendChild(e);setTimeout(()=>e.remove(),600);}
  function remove(d,pop=false){G.drops=G.drops.filter(x=>x!==d);if(pop){d.el.classList.add('pop');setTimeout(()=>d.el.remove(),220);}else d.el.remove();}
  function hit(d){
    record(d,true);G.streak=d.wrong?0:G.streak+1;G.score+=Math.round((d.hint?5:10)*(1+Math.min(G.streak,10)*.1)*(d.wrong?.3:1));
    G.bestStreak=Math.max(G.bestStreak,G.streak);
    A.play(symbol(d.id));const w=D.words.find(w=>w.id===d.id);
    flash(w?`${w.surface} · ${D.toRomaji(w.surface)} · ${w.glossEn[0]}`:`${symbol(d.id)} · ${D.kanaById[d.id].romaji} ✓`,false,1000);
    if(!G.bestBeaten&&G.previousBest>0&&G.score>G.previousBest){G.bestBeaten=true;celebrate('New personal best!','record');}
    else if([5,10,20].includes(G.streak))celebrate(`${G.streak} in a row!`);
    $('personalBest').textContent=(G.reviewIds?'Review best · ':'Best · ')+Math.max(G.previousBest,G.score);
    effect(d,'splash');spirit('happy');remove(d,true);checkUnlock();hud();renderMap();renderUnlocks(mapScript);updateTarget();
  }
  function wrong(d,text){
    const k=D.kanaById[d.id];const chosen=D.kana.find(x=>x.id!==d.id && (!k||x.script===k.script) && [x.romaji,...x.alt,x.char].includes(text));
    record(d,false,chosen?.id);G.mistakes.add(d.id);d.wrong++;d.v=Math.min(2.2,d.v*1.45);d.el.classList.add('stained');G.streak=0;spirit('worried');
    const reading=d.id.startsWith('w:')?D.toRomaji(symbol(d.id)):k.romaji;
    flash(`${symbol(d.id)} = ${reading}${d.kanaOnly?' → '+opposite(k).char:''}. You typed ${text}${chosen?' → '+chosen.char:''}.`,true,3500);A.play(symbol(d.id));
    if(chosen && (G.reviewIds||candidates()).includes(chosen.id)){G.confs.add(d.id+'|'+chosen.id);G.queue=G.queue.filter(e=>e.id!==d.id && e.id!==chosen.id);G.queue.splice(Math.min(2,G.queue.length),0,{id:d.id,partner:chosen.id});}
    else G.queue.splice(Math.min(2,G.queue.length),0,{id:d.id});hud();renderMap();renderUnlocks(mapScript);
  }
  function miss(d){
    if(G.over||!G.drops.includes(d))return;record(d,false);G.missed.add(d.id);G.lives--;G.streak=0;
    flash(`Lost a heart. ${symbol(d.id)} = ${d.id.startsWith('w:')?D.toRomaji(symbol(d.id)):D.kanaById[d.id].romaji}.`,true,3500);
    clearTimeout(heartTimer);document.body.classList.remove('heart-hit');void $('heartLoss').offsetWidth;document.body.classList.add('heart-hit');$('heartLoss').classList.remove('hidden');
    sfx('heart');heartTimer=setTimeout(()=>{document.body.classList.remove('heart-hit');$('heartLoss').classList.add('hidden');},900);
    A.play(symbol(d.id));spirit('worried');effect(d,'ripple');remove(d);G.queue.splice(Math.min(2,G.queue.length),0,{id:d.id});hud();renderUnlocks(mapScript);
    if(G.lives===0)end(`All ${G.totalLives} ${G.totalLives===1?'heart':'hearts'} lost · ${R.profiles[G.difficulty].name}`,'hearts_lost');
  }
  function checkUnlock(){
    if(explore||cfg.mode==='words')return;
    const scripts=cfg.mode==='hira'?['hiragana']:cfg.mode==='kata'?['katakana']:cfg.mode==='mix'?['hiragana','katakana']:[];
    scripts.forEach(sc=>{if(gd.rows[sc]>=D.rowsOrder.length)return;
      if(unlocked(sc).every(k=>readiness(k).ready)){
        gd.rows[sc]++;L.flush();const row=D.rowsOrder[gd.rows[sc]-1];flash('A new row is growing: '+D.kana.filter(k=>k.script===sc && k.row===row).map(k=>k.char).join(' '),false,4000,3);sfx('unlock');G.queue=[];
      }
    });
  }
  function onInput(force=false){
    if(!G||G.over||G.paused||composing)return;const v=normalize($('answer').value);if(!v)return;
    const matches=[...G.drops].sort((a,b)=>b.y-a.y);const match=matches.find(d=>accepted(d.id,d.kanaOnly).includes(v));
    const longer=G.drops.some(d=>accepted(d.id,d.kanaOnly).some(a=>a.length>v.length&&a.startsWith(v)));
    // n may be the start of na/ni/etc even when those kana are not currently falling.
    if(match && (force||(!longer&&v!=='n'))){$('answer').value='';hit(match);return;}
    if(force){const t=lowest();if(t)wrong(t,v);$('answer').value='';$('answer').classList.add('bad');setTimeout(()=>$('answer').classList.remove('bad'),300);}
  }
  function hud(){$('score').textContent=String(G.score).padStart(3,'0');$('streak').textContent=G.streak>1?'×'+G.streak:'—';$('time').textContent=fmt(G.t);$('lives').textContent='♥ '.repeat(G.lives)+'♡ '.repeat(G.totalLives-G.lives);$('lives').setAttribute('aria-label',`${G.lives} of ${G.totalLives} hearts remaining`);document.body.classList.toggle('low-hearts',G.lives===1);}
  function pause(value=(G?.countingDown||!G?.paused),showDialog=true){
    if(!running())return;
    if(value)cancelCountdown();
    if(G.paused===value){if(value&&showDialog&&!document.querySelector('dialog[open]'))showPause();return;}
    if(value){G.paused=true;G.pauseAt=performance.now();A.stop();spirit('sleep');$('pauseHint').textContent='';if(showDialog){closeDialogs();showPause();}}
    else{
      if($('pauseOverlay').open)$('pauseOverlay').close();
      beginCountdown('Ready to continue?');
    }
    G.last=performance.now();
  }
  function dispose(){cancelCountdown();cancelAnimationFrame(raf);A.stop();if(G){G.over=true;G.drops.forEach(d=>d.el.remove());G.drops=[];}L.flush();}
  function end(reason,completionReason='manual_finish'){
    if(!G||G.over)return;
    const acc=G.attempts?Math.round(G.correct/G.attempts*100):0,key=G.bestKey;
    const old=gd.best[key]||0;gd.best[key]=Math.max(old,G.score);gd.sessions=(gd.sessions||0)+1;L.flush();
    // Explicit end reasons, never inferred from UI copy; no answer, score, or item data leaves the app.
    if(G.analyticsStarted)window.NihongoAnalytics?.track('practice_complete',{practice_mode:G.reviewIds?'review':G.mode,completion_reason:completionReason});
    $('resultTitle').textContent=G.correct?'Your garden grew.':'Every drop is a new beginning.';
    $('resultMessage').textContent=reason+(G.score>old&&G.score?' · A new personal best!':'')+(cfg.mode==='hira'&&gd.rows.hiragana>=12?' Try Little words next.':'');
    $('resultStats').innerHTML=`<div><b>${G.score}</b><small>SCORE</small></div><div><b>${acc}%</b><small>ACCURACY</small></div><div><b>${G.correct}</b><small>READ CORRECTLY</small></div><div><b>${G.bestStreak}</b><small>BEST STREAK</small></div>`;
    const review=[...new Set([...G.mistakes,...G.missed,...[...G.confs].flatMap(c=>c.split('|'))])];
    lastReview=review.filter(id=>candidates().includes(id));$('reviewPracticeBtn').classList.toggle('hidden',!lastReview.length);
    $('resultReview').innerHTML=review.length?'<p>A little more practice · tap to listen</p><div class="review-grid">'+review.map(id=>{
      const char=symbol(id),k=D.kanaById[id],word=D.words.find(w=>w.id===id),reading=k?.romaji||D.toRomaji(char),pair=cfg.mode==='pair'?` → ${opposite(k).char}`:'';
      const tag=A.hasRecording(char)?'button':'div';
      return `<${tag} class="review-card" ${tag==='button'?`type="button" data-kana="${escapeText(char)}" aria-label="Listen to ${escapeText(char)}, ${escapeText(reading)}"`:''}><span lang="ja">${escapeText(char+pair)}</span><small>${escapeText(reading)}</small>${word?`<small>${escapeText(word.glossEn[0])}</small>`:''}${tag==='button'?'<span class="review-audio" aria-hidden="true">♪</span>':''}</${tag}>`;
    }).join('')+'</div>':G.correct?'Keep going. Familiarity grows one answer at a time.':'Listen to the current row, then try again.';
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
  $('difficultySelect').onchange=()=>{if(running())return;cfg.difficulty=$('difficultySelect').value;gd.difficulty=cfg.difficulty;L.flush();renderMenu();};
  $('durationSelect').onchange=()=>{if(running())return;cfg.duration=+$('durationSelect').value;renderMenu();};
  document.querySelectorAll('[data-difficulty]').forEach(b=>b.onclick=()=>{if(running())return;cfg.difficulty=b.dataset.difficulty;gd.difficulty=cfg.difficulty;L.flush();renderMenu();});
  document.querySelectorAll('[data-duration]').forEach(b=>b.onclick=()=>{cfg.duration=+b.dataset.duration;renderMenu();});
  document.querySelectorAll('[data-script]').forEach(b=>b.onclick=()=>{mapScript=b.dataset.script;document.querySelectorAll('[data-script]').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b);});renderMenu();});
  const listen=async e=>{const b=e.target.closest('[data-kana]');if(b){if(running())pause(true,false);if(!await A.play(b.dataset.kana)&&A.enabled)flash('Audio is unavailable. The lesson reading is shown on the tile.',true);}};
  $('lesson').onclick=$('masteryMap').onclick=$('resultReview').onclick=listen;
  $('listenBtn').onclick=async()=>{const t=lowest();if(t){t.hint=true;pause(true);const reading=symbol(t.id)+' = '+(D.kanaById[t.id]?.romaji||D.toRomaji(symbol(t.id)));$('pauseHint').textContent=reading;await A.play(symbol(t.id));}};
  function renderSound(){const b=$('soundBtn');b.querySelector('use').setAttribute('href',A.enabled?'#icon-sound':'#icon-muted');b.querySelector('.control-label').textContent=A.enabled?'Sound on':'Sound off';b.setAttribute('aria-pressed',A.enabled);b.setAttribute('aria-label',A.enabled?'Mute sound':'Enable sound');b.title=A.enabled?'Mute sound':'Enable sound';}
  $('soundBtn').onclick=()=>{A.enabled=!A.enabled;gd.sound=A.enabled;L.flush();renderSound();if(A.enabled)sfx('menu');};
  $('effectsBtn').onclick=()=>{gd.reducedEffects=!gd.reducedEffects;L.flush();renderEffects();};
  $('skipCountdown').onclick=completeCountdown;$('continueScriptBtn').onclick=acknowledgeScript;
  $('reviewPracticeBtn').onclick=()=>start({reviewIds:lastReview});
  $('pauseBtn').onclick=()=>pause();$('resumeBtn').onclick=()=>pause(false);$('finishBtn').onclick=()=>end('Session finished');
  $('answerForm').onsubmit=e=>{e.preventDefault();onInput(true);};$('answer').oninput=()=>onInput();
  $('answer').oncompositionstart=()=>composing=true;$('answer').oncompositionend=()=>{composing=false;onInput();};
  $('keyboardBtn').onclick=()=>{keyboardOpen=!keyboardOpen;keyboard();if(keyboardOpen)$('answer').blur();else focusAnswer();};
  $('keyboardModeBtn').onclick=()=>{keyboardOverride=$('keyboard').classList.contains('letters');const t=G?.drops.find(d=>d.kanaOnly);prepareAnswerFormat(keyboardOverride?scriptFormat(t):'romaji');keyboard();};
  $('keyboard').onclick=e=>{const b=e.target.closest('[data-key]');if(!b)return;if(!G||G.over||G.paused)return;const key=b.dataset.key;if(key==='enter')onInput(true);else{$('answer').value=key==='backspace'?$('answer').value.slice(0,-1):$('answer').value+key;onInput();}};
  $('gardenBtn').onclick=$('progressBtn').onclick=$('pauseGardenBtn').onclick=()=>openPanel('progressDialog');
  $('closeGarden').onclick=$('returnGarden').onclick=()=>closePanel('progressDialog');
  $('settingsBtn').onclick=$('pauseSettingsBtn').onclick=()=>openPanel('settingsDialog');
  $('closeSettings').onclick=$('saveSettings').onclick=()=>closePanel('settingsDialog');
  $('helpBtn').onclick=$('pauseHelpBtn').onclick=()=>openPanel('helpDialog');$('closeHelp').onclick=()=>closePanel('helpDialog');
  $('resetBtn').onclick=()=>{if(!confirm('Reset all learning progress on this device?'))return;dispose();L.reset();gd=L.gameData(GAME);gd.rows={hiragana:1,katakana:1};gd.best={};gd.accuracy={};cfg.mode='hira';cfg.difficulty='normal';L.flush();$('answer').disabled=true;$('submitBtn').disabled=true;showMenu();};
  $('exportBtn').onclick=()=>{const blob=new Blob([L.export()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='kana-rain-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.querySelectorAll('dialog.game-dialog').forEach(d=>d.addEventListener('cancel',e=>{e.preventDefault();if(d.id==='pauseOverlay')pause(false);else if(d.id==='scriptDialog')acknowledgeScript();else if(d.id==='results')showMenu();else closePanel(d.id);}));
  window.addEventListener('nihongo-analytics-settings-open',()=>{if(running())pause();});
  document.addEventListener('keydown',e=>{
    if(G?.countingDown&&e.key==='Tab'){e.preventDefault();$('skipCountdown').focus({preventScroll:true});return;}
    if(document.querySelector('dialog[open]'))return;
    if(e.key==='Escape'&&running()){e.preventDefault();pause();}
    else if(e.key==='Enter'&&!running()&&!['SELECT','BUTTON','INPUT'].includes(e.target.tagName)){e.preventDefault();start();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause(true);});
  let previousField={width:0,height:0};
  function fitField(){
    const W=$('field').clientWidth,H=$('field').clientHeight;
    if(running())G.drops.forEach(d=>{
      d.w=d.el.offsetWidth;d.h=d.el.offsetHeight;
      if(previousField.width)d.x=d.x*W/previousField.width;
      d.x=Math.max(5,Math.min(d.x,W-d.w-5));positionDrop(d,H);
    });
    previousField={width:W,height:H};
  }
  function syncViewport(){const v=window.visualViewport;document.documentElement.style.setProperty('--viewport-height',(v?.height||innerHeight)+'px');document.documentElement.style.setProperty('--viewport-top',(v?.offsetTop||0)+'px');}
  syncViewport();window.addEventListener('resize',syncViewport);window.visualViewport?.addEventListener('resize',syncViewport);window.visualViewport?.addEventListener('scroll',syncViewport);
  new ResizeObserver(fitField).observe($('field'));
  new ResizeObserver(()=>document.documentElement.style.setProperty('--dock-height',$('answerDock').getBoundingClientRect().height+'px')).observe($('answerDock'));
  renderMenu();renderSound();
  A.ready.then(()=>{if(!A.available){$('soundBtn').querySelector('.control-label').textContent='Sound unavailable';$('soundBtn').setAttribute('aria-label','Sound unavailable');$('soundBtn').disabled=true;}});
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{
    $('offlineStatus').textContent='Your garden is ready offline.';
  }).catch(()=>$('offlineStatus').textContent='Offline setup unavailable in this browser.');}
  else $('offlineStatus').textContent='Progress is saved on this device.';
  // Public module boundary for the future minigame shell and meaningful integration tests.
  window.KanaRain={id:GAME,capabilities:{facets:[FACET,PAIR],itemTypes:['kana','word'],input:['typing','touch'],timed:true},generateRound,render,score,dispose,start,pause,end,candidates,accepted,difficultyProfiles:R.profiles,get state(){return G;},get settings(){return {...cfg};},get gameData(){return gd;}};
})();
