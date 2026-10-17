const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const Difficulty=require(path.join(root,'src/difficulty.js'));
function model(){
  const map=new Map(),context=vm.createContext({Date,Math,JSON,setTimeout,clearTimeout,console,localStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}});
  context.globalThis=context;
  for(const f of ['data','learner'])vm.runInContext(fs.readFileSync(path.join(root,'src',f+'.js'),'utf8'),context);
  return {D:context.JPData,L:context.Learner,map};
}
test('all kana resolve to the supplied audio files, including homophones and combinations',()=>{
  const {D}=model(),pack=JSON.parse(fs.readFileSync(path.join(root,'kana-audio-bundle/manifest.json')));
  assert.equal(D.kana.length,208);
  for(const k of D.kana){assert.ok(pack.byKana[k.char],k.char);assert.ok(fs.existsSync(path.join(root,'kana-audio-bundle',pack.byKana[k.char])));}
  assert.notEqual(pack.byKana['じ'],pack.byKana['ぢ']);assert.notEqual(pack.byKana['ず'],pack.byKana['づ']);
});
test('single-kana readings retain alternate romanizations and reject removed word content',()=>{
  const {D}=model();assert.equal(D.toRomaji('きょ'),'kyo');assert.equal(D.toRomaji('キャ'),'kya');assert.ok(D.romajiVariants('し').includes('si'));assert.ok(D.romajiVariants('ん').includes('nn'));assert.equal(D.toRomaji('ねこ'),'');assert.deepEqual(Array.from(D.romajiVariants('ねこ')),[]);assert.equal(D.words,undefined);
});

test('each answer immediately persists evidence and keeps facets separate',()=>{
  const {L,map}=model();L.record('kana:あ','form→sound',{correct:true,rtMs:950,gameId:'kana-rain'});
  let saved=JSON.parse(map.get('jp-learner-v1'));assert.equal(saved.items['kana:あ'].facets['form→sound'].correct,1);
  L.record('kana:あ','sound→form',{correct:false,chosenItemId:'kana:お',gameId:'kana-rain'});
  saved=JSON.parse(map.get('jp-learner-v1'));assert.equal(saved.items['kana:あ'].facets['form→sound'].errors,0);assert.equal(saved.items['kana:あ'].facets['sound→form'].errors,1);assert.equal(saved.items['kana:あ'].confusions['kana:お'],1);
});
test('scheduler respects its new-item limit and includes personal confusions',()=>{
  const {D,L}=model(),ids=D.kana.slice(0,30).map(k=>k.id);
  assert.equal(L.selectRound(ids,{facet:'form→sound',size:8,maxNew:3}).length,3);
  L.record(ids[0],'form→sound',{correct:false,chosenItemId:ids[1]});
  const plan=L.selectRound(ids,{facet:'form→sound',size:8,maxNew:2});assert.ok(plan.includes(ids[0]));assert.ok(plan.includes(ids[1]));
});
test('reset replaces saved evidence with an empty model',()=>{
  const {L,map}=model();L.record('kana:あ','form→sound',{correct:true});L.reset();assert.equal(Object.keys(L.all()).length,0);assert.equal(Object.keys(JSON.parse(map.get('jp-learner-v1')).items).length,0);
});

test('difficulty choices vary novelty recovery while sharing three hearts and Normal rain',()=>{
  assert.deepEqual(Object.keys(Difficulty.profiles).sort(),['easy','hard','normal']);
  for(const [id,hearts,fallSeconds] of [['easy',3,10],['normal',3,10],['hard',3,10]]){
    assert.equal(Difficulty.profiles[id].hearts,hearts,id);
    const start=Difficulty.atTime(id,0);
    assert.equal(start.fallSeconds,fallSeconds,id);
    assert.equal(start.speed,1/fallSeconds,id);
  }
});

test('the shared curve accelerates each difficulty and increases its spawn frequency',()=>{
  for(const [id,rampSeconds] of [['easy',60],['normal',60],['hard',60]]){
    const initial=Difficulty.atTime(id,0),later=Difficulty.atTime(id,rampSeconds);
    assert.equal(later.fallSeconds,initial.fallSeconds/2,id+' doubles the fall speed after one ramp interval');
    assert.equal(later.speed,initial.speed*2,id);
    assert.equal(later.gap,initial.gap/Math.sqrt(2),id+' increases spawn frequency gradually');
  }
});

test('long sessions keep difficulty timing finite, monotonic, and within its speed and spawn limits',()=>{
  for(const [id,maxMultiplier] of [['easy',3.5],['normal',3.5],['hard',3.5]]){
    const p=Difficulty.profiles[id],atCap=Difficulty.atTime(id,(maxMultiplier-1)*p.rampSeconds),late=Difficulty.atTime(id,36000);
    assert.equal(atCap.fallSeconds,p.fallSeconds/maxMultiplier,id);
    assert.deepEqual(late,atCap,id+' stops accelerating at its maximum');
    let previous=Difficulty.atTime(id,0);
    for(const seconds of [15,30,60,90,180,600,36000]){
      const current=Difficulty.atTime(id,seconds);
      assert.ok(Number.isFinite(current.speed)&&Number.isFinite(current.fallSeconds)&&Number.isFinite(current.gap),id);
      assert.ok(current.speed>=previous.speed&&current.speed<=maxMultiplier/p.fallSeconds,id+' speed remains bounded');
      assert.ok(current.gap<=previous.gap&&current.gap>=p.minGap,id+' spawn interval remains bounded');
      assert.ok(current.fallSeconds>0,id);
      previous=current;
    }
  }
});

test('the difficulty module exposes the same timing to browser and Node consumers',()=>{
  const context=vm.createContext({window:{}});
  vm.runInContext(fs.readFileSync(path.join(root,'src/difficulty.js'),'utf8'),context);
  assert.ok(context.window.KanaDifficulty);
  for(const id of ['easy','normal','hard']){
    assert.equal(context.window.KanaDifficulty.profiles[id].hearts,Difficulty.profiles[id].hearts);
    assert.deepEqual(JSON.parse(JSON.stringify(context.window.KanaDifficulty.atTime(id,90))),Difficulty.atTime(id,90));
  }
});
