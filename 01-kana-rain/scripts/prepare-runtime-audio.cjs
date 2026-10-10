// Keep full provenance in the original bundle; gameplay only needs the approved lookup.
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const bundle=path.join(root,'kana-audio-bundle');
const full=JSON.parse(fs.readFileSync(path.join(bundle,'manifest.json'),'utf8'));
if(!full.byKana||!Object.keys(full.byKana).length)throw new Error('Missing approved pronunciation lookup');
for(const file of Object.values(full.byKana)){
  if(typeof file!=='string'||!/^audio\/[a-z0-9-]+\.mp3$/i.test(file)||!fs.statSync(path.join(bundle,file)).isFile())throw new Error('Invalid pronunciation file');
}
const runtime={schemaVersion:1,source:'manifest.json',license:full.license,byKana:full.byKana};
const text=JSON.stringify(runtime)+'\n',output=path.join(bundle,'runtime-manifest.json');
if(process.argv.includes('--check')){
  if(fs.readFileSync(output,'utf8')!==text)throw new Error('Runtime pronunciation lookup is stale; run node scripts/prepare-runtime-audio.cjs');
  console.log('Runtime pronunciation lookup matches the complete approved bundle.');
}else{
  fs.writeFileSync(output,text);
  console.log('Prepared '+Buffer.byteLength(text)+' bytes for '+Object.keys(full.byKana).length+' recorded symbols.');
}
