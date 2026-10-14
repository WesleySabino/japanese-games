// Keep full provenance in the original bundle; gameplay only needs the approved lookup.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const bundle=path.join(root,'kana-audio-bundle');
function runtimePlan(){
  const full=JSON.parse(fs.readFileSync(path.join(bundle,'manifest.json'),'utf8'));
  if(!full.byKana||!Object.keys(full.byKana).length)throw new Error('Missing approved pronunciation lookup');
  const catalogue={};
  vm.runInNewContext(fs.readFileSync(path.join(root,'src/data.js'),'utf8'),catalogue);
  const byKana=Object.fromEntries(catalogue.JPData.kana.map(k=>{
    const file=full.byKana[k.char];
    if(typeof file!=='string'||!/^audio\/[a-z0-9-]+\.mp3$/i.test(file)||!fs.statSync(path.join(bundle,file)).isFile())throw new Error('Invalid pronunciation for '+k.char);
    return [k.char,file];
  }));
  return {schemaVersion:1,source:'manifest.json',license:full.license,byKana};
}
module.exports={runtimePlan};
if(require.main===module){
  const runtime=runtimePlan(),text=JSON.stringify(runtime)+'\n',output=path.join(bundle,'runtime-manifest.json');
  if(process.argv.includes('--check')){
    if(fs.readFileSync(output,'utf8')!==text)throw new Error('Runtime pronunciation lookup is stale; run node scripts/prepare-runtime-audio.cjs');
    console.log('Runtime pronunciation lookup matches the current kana catalogue.');
  }else{
    fs.writeFileSync(output,text);
    console.log('Prepared '+Buffer.byteLength(text)+' bytes for '+Object.keys(runtime.byKana).length+' recorded kana.');
  }
}
