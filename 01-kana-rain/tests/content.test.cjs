'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/data.js'), 'utf8'), context);
const data = context.JPData;
const difficulty = require('../src/difficulty.js');
const corpus = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/romaji-reviewed.json'), 'utf8'));

test('all 60 reviewed primary readings remain usable and all 21 invalid aliases are excluded', () => {
  assert.equal(corpus.length, 60);
  let rejected = 0;
  for (const word of corpus) {
    assert.equal(data.toRomaji(word.surface), word.reviewedCanonical, word.surface);
    const accepted = data.romajiVariants(word.surface);
    assert.ok(accepted.includes(word.reviewedCanonical), word.surface);
    for (const invalid of word.aliasesOutsideLocalUnitReference) {
      assert.ok(!accepted.includes(invalid), word.surface + ': ' + invalid);
      rejected++;
    }
  }
  assert.equal(rejected, 21);
});

test('nasal alternatives preserve boundaries and never duplicate an ordinary n consonant', () => {
  for (const [word, valid, invalid] of [['ほん','honn','honnn'],['ねこ','neko','nneko'],['のむ','nomu','nnomu'],['いぬ','inu','innu']]) {
    const forms = data.romajiVariants(word);
    assert.ok(forms.includes(valid), word);
    assert.ok(!forms.includes(invalid), word);
  }
  const nasalBeforeVowel = data.romajiVariants('んあ');
  assert.ok(nasalBeforeVowel.includes("n'a"));
  assert.ok(nasalBeforeVowel.includes('nna'));
  assert.ok(!nasalBeforeVowel.includes('na'));
  assert.ok(data.romajiVariants('すし').includes('susi'));
  assert.ok(data.romajiVariants('しゃしん').includes('syashin'));
});

test('word prerequisites identify small tsu and both long-vowel spellings without blocking simple words', () => {
  const requirements = surface => Array.from(data.wordRequirements(surface));
  assert.deepEqual(requirements('ねこ'), []);
  assert.deepEqual(requirements('きっぷ'), ['sokuon']);
  assert.deepEqual(requirements('がっこう'), ['sokuon', 'long-vowel-sequence']);
  assert.deepEqual(requirements('コーヒー'), ['long-vowel-mark']);
  assert.deepEqual(requirements('せんせい'), ['long-vowel-sequence']);
  for (const word of data.words) for (const id of word.features) assert.ok(data.features.some(feature => feature.id === id));
});

test('steady practice keeps one drop and unchanged timing even in a long session', () => {
  assert.equal(difficulty.practiceProfile.maxDrops, 1);
  assert.equal(difficulty.practiceProfile.hearts, null);
  const initial = difficulty.atTime('hard', 0, 'practice');
  for (const elapsed of [30, 180, 36000]) assert.deepEqual(difficulty.atTime('hard', elapsed, 'practice'), initial);
  assert.ok(difficulty.atTime('hard', 180, 'arcade').speed > difficulty.atTime('hard', 0, 'arcade').speed);
});
