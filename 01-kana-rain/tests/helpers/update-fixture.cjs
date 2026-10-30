'use strict';
// A fixed historical production build, usable in shallow CI checkouts without Git/network access.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const assert = require('node:assert/strict');
const { productionPlan, productionHtml } = require('../../scripts/build.cjs');
const root = path.resolve(__dirname, '../..');
const fixture = path.resolve(__dirname, '../fixtures/releases');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const cacheName = files => {
  const match = files.get('/sw.js')?.toString().match(/\bconst CACHE=['"]([^'"]+)['"]/);
  assert.ok(match, 'release has a named service worker cache');
  return match[1];
};
function safeFile(base, file) {
  assert.ok(typeof file === 'string' && !file.includes('\\') && !file.split('/').includes('..') && !path.isAbsolute(file));
  const absolute = path.resolve(base, file);
  assert.ok(absolute.startsWith(base + path.sep), 'fixture stays inside its root');
  return absolute;
}
function currentBuild() {
  const files = new Map(), plan = productionPlan();
  for (const entry of plan.entries) {
    const expected = entry.generated !== undefined ? Buffer.from(entry.generated) : entry.file === 'index.html' ? Buffer.from(productionHtml(entry.file)) : fs.readFileSync(entry.absolute);
    const built = fs.readFileSync(safeFile(path.join(root, 'dist'), entry.file));
    assert.equal(hash(built), hash(expected), 'Stale dist/' + entry.file + '; run pnpm build');
    files.set('/' + entry.file, built);
  }
  return { files, cache: cacheName(files), version: require('../../package.json').version };
}
function baselineBuild(version = '1.10.1') {
  assert.ok(['1.10.1', '1.12.0', '1.12.1'].includes(version), 'choose a pinned historical release');
  const manifest = JSON.parse(fs.readFileSync(path.join(fixture, version + '.json'), 'utf8'));
  const compressed = fs.readFileSync(path.join(fixture, version + '.payload.json.gz'));
  assert.equal(hash(compressed), manifest.payloadSha256, 'historical payload integrity');
  const payload = JSON.parse(zlib.gunzipSync(compressed));
  const files = new Map();
  for (const entry of manifest.entries) {
    const bytes = entry.storage === 'shared' ? fs.readFileSync(safeFile(root, entry.file)) : Buffer.from(payload[entry.file], 'base64');
    assert.equal(bytes.length, entry.bytes, 'historical byte count: ' + entry.file);
    assert.equal(hash(bytes), entry.sha256, 'historical hash: ' + entry.file + '; preserve/refresh the baseline if shared assets change');
    assert.ok(!files.has('/' + entry.file), 'unique historical path');
    files.set('/' + entry.file, bytes);
  }
  assert.equal(cacheName(files), manifest.cache);
  return { files, cache: manifest.cache, version: manifest.version, commit: manifest.commit };
}

// Explicit maintenance operation: run against dist/ built by the pinned historical checkout.
function capture(directory, version = '1.10.1') {
  const base = fs.realpathSync(directory), files = [];
  function walk(folder, prefix = '') {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const relative = prefix + entry.name;
      if (entry.isDirectory()) walk(path.join(folder, entry.name), relative + '/');
      else { assert.ok(entry.isFile() && !entry.isSymbolicLink()); files.push(relative); }
    }
  }
  walk(base); files.sort();
  const payload = {}, entries = [], map = new Map();
  for (const file of files) {
    const bytes = fs.readFileSync(safeFile(base, file)); map.set('/' + file, bytes);
    const binary = /\.(?:mp3|png|webp)$/.test(file), local = safeFile(root, file);
    const shared = binary && fs.existsSync(local) && hash(fs.readFileSync(local)) === hash(bytes);
    if (!shared) payload[file] = bytes.toString('base64');
    entries.push({ file, bytes: bytes.length, sha256: hash(bytes), storage: shared ? 'shared' : 'payload' });
  }
  const pins = {
    '1.10.1': { cache: 'kana-rain-v38-release-1.10.1', commit: '4e02aee67272e21111875087e6a7a033fed5e4b7' },
    '1.12.0': { cache: 'kana-rain-v48-release-1.12.0', commit: '3b6024aa7c32206770b5d09f207774eb725ad07f' },
    '1.12.1': { cache: 'kana-rain-v49-release-1.12.1', commit: 'a3d71ae4d76c1471b478997a93a201d8992eb0c8' }
  }, pin = pins[version], cache = cacheName(map);
  assert.ok(pin, 'capture only a pinned release');
  assert.equal(cache, pin.cache, 'capture the pinned release, never the current candidate');
  const compressed = zlib.gzipSync(JSON.stringify(payload), { level: 9 });
  fs.mkdirSync(fixture, { recursive: true });
  fs.writeFileSync(path.join(fixture, version + '.payload.json.gz'), compressed);
  fs.writeFileSync(path.join(fixture, version + '.json'), JSON.stringify({ version, commit: pin.commit, cache, payloadSha256: hash(compressed), entries }, null, 2) + '\n');
  console.log('Captured ' + files.length + ' historical files; compressed text payload ' + compressed.length + ' bytes');
}
module.exports = { root, hash, currentBuild, baselineBuild };
if (require.main === module) {
  assert.ok(['--capture', '--capture-1.12.0', '--capture-1.12.1'].includes(process.argv[2])); assert.equal(process.argv.length, 4);
  capture(process.argv[3], process.argv[2] === '--capture' ? '1.10.1' : process.argv[2].slice('--capture-'.length));
}
