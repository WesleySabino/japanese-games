'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/data.js'), 'utf8'), context);
const data = context.JPData;

test('every available kana keeps its canonical reading and accepted aliases', () => {
  assert.equal(data.kana.length, 208);
  for (const kana of data.kana) {
    assert.equal(data.toRomaji(kana.char), kana.romaji, kana.char);
    assert.ok(data.romajiVariants(kana.char).includes(kana.romaji), kana.char);
    assert.equal(data.kanaById[kana.id], kana);
  }
  for (const [char, aliases] of [['し',['shi','si']], ['ち',['chi','ti']], ['つ',['tsu','tu']], ['しゃ',['sha','sya']], ['ん',['n','nn']], ['ン',['n','nn']]])
    for (const alias of aliases) assert.ok(data.romajiVariants(char).includes(alias), char+': '+alias);
});

test('retired whole-word helpers and catalogue cannot make removed modes playable', () => {
  assert.equal(data.words, undefined); assert.equal(data.features, undefined); assert.equal(data.wordRequirements, undefined);
  for (const unknown of ['ねこ','ほん','コーヒー','んあ','w:ねこ','']) {
    assert.equal(data.toRomaji(unknown), '');
    assert.deepEqual(Array.from(data.romajiVariants(unknown)), []);
  }
});
