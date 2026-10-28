const test=require('node:test'),assert=require('node:assert/strict');
const {runtime}=require('./runtime-harness.cjs');
for(const options of [{name:'normal desktop',reduced:false,motion:false,mobile:false,count:1},{name:'normal touch',reduced:false,motion:false,mobile:true,count:1},{name:'reduced effects',reduced:true,motion:false,mobile:false,count:0},{name:'OS reduced motion',reduced:false,motion:true,mobile:false,count:0}])test('transient splash/ripple nodes are skipped for '+options.name,async()=>{
  const g=await runtime({mobile:options.mobile,reducedMotion:options.motion});g.app.gameData.reducedEffects=options.reduced;
  g.app.start();g.skip();g.answer(g.data.kanaById[g.app.state.target.id].romaji);
  assert.equal(g.el('field').children.filter(e=>e.className==='effect splash').length,options.count);
  g.app.state.sinceSpawn=99999;g.tick();g.app.state.target.progress=1;g.tick();
  assert.equal(g.el('field').children.filter(e=>e.className==='effect ripple').length,options.count);
  assert.equal(g.app.state.correct,1);assert.equal(g.app.state.expirations,1);assert.equal(g.app.state.lives,2);
});
