
/* Shared learner model (spec §3.2–3.7). IndexedDB with immediate localStorage journal.
   API: Learner.record(itemId, facet, {correct, rtMs, weight, chosenItemId, gameId}), Learner.mastery(id, facet),
        Learner.state(id), Learner.selectRound(candidates, opts), Learner.recentErrors(), Learner.export()/import()/reset() */
(function (root) {
  'use strict';
  var KEY = 'jp-learner-v1', DAY = 86400000, MIN = 60000, TARGET_R = 0.9;
  var RT_FAST = { 'form→sound': 700, 'sound→form': 900, 'form→meaning': 1200, fluency: 700 };
  var RT_SLOW = { 'form→sound': 3500, 'sound→form': 4000, 'form→meaning': 5000, fluency: 3500 };
  var mem = null, store = null;
  try { store = root.localStorage; store.setItem('__t', '1'); store.removeItem('__t'); } catch (e) { store = null; }
  function load() {
    if (mem) return mem;
    try { mem = store && JSON.parse(store.getItem(KEY)); } catch (e) { mem = null; }
    if (!mem || mem.version !== 1) mem = { version: 1, items: {}, errorLog: [], games: {}, created: Date.now() };
    return mem;
  }
  var db = null;
  var ready = new Promise(function (resolve) {
    load();
    if (!root.indexedDB) { resolve(); return; }
    var request = root.indexedDB.open('kana-garden', 1);
    request.onupgradeneeded = function () { request.result.createObjectStore('learner'); };
    request.onerror = request.onblocked = function () { resolve(); };
    request.onsuccess = function () {
      db = request.result;
      var read = db.transaction('learner').objectStore('learner').get(KEY);
      read.onsuccess = function () {
        if (read.result && read.result.version === 1 && (read.result.updatedAt || 0) > (mem.updatedAt || 0)) mem = read.result;
        resolve();
      };
      read.onerror = function () { resolve(); };
    };
  });
  function save() { flush(); }
  function flush() {
    if (!mem) return;
    mem.updatedAt = Date.now();
    if (store) try { store.setItem(KEY, JSON.stringify(mem)); } catch (e) {}
    if (db) try { db.transaction('learner', 'readwrite').objectStore('learner').put(mem, KEY); } catch (e) {}
  }
  if (root.addEventListener) root.addEventListener('pagehide', flush);
  var clamp = function (x, a, b) { return Math.max(a, Math.min(b, x)); };
  var clamp01 = function (x) { return clamp(x, 0, 1); };
  function initFacet(now) { return { stability: 0.2, difficulty: 5, lastReview: now, reps: 0, lapses: 0, correct: 0, errors: 0, rtEmaMs: 0 }; }
  function state(id, create) {
    var d = load(), s = d.items[id];
    if (!s && create) s = d.items[id] = { itemId: id, firstSeen: Date.now(), lastSeen: 0, lastError: 0, exposures: 0, facets: {}, confusions: {}, scaffold: { romaji: true, furigana: true, gloss: true }, flags: {} };
    return s || null;
  }
  function retrievability(f, now) { return Math.pow(1 + ((now - f.lastReview) / DAY) / (9 * f.stability), -1); }
  function mastery(id, facet, now) {
    var s = state(id); now = now || Date.now();
    var f = s && s.facets[facet]; if (!f || !f.correct) return 0;
    var R = retrievability(f, now), lt = Math.min(1, Math.log1p(f.stability) / Math.log1p(60));
    var fast = RT_FAST[facet] || 800, slow = RT_SLOW[facet] || 4000;
    var speed = f.rtEmaMs ? clamp01((slow - f.rtEmaMs) / (slow - fast)) : 0;
    return 0.5 * R + 0.35 * lt + 0.15 * speed;
  }
  function record(id, facet, ev) {
    var now = ev.now || Date.now(), s = state(id, true), f = s.facets[facet] || initFacet(now), w = ev.weight == null ? 1 : ev.weight;
    // anti-guess (§5.4.7): physiologically impossible fast answers count less
    if (ev.correct && ev.rtMs != null && ev.minRtMs && ev.rtMs < ev.minRtMs) w *= 0.5;
    var R = f.reps || f.correct || f.errors ? retrievability(f, now) : 0.5;
    s.exposures++; s.lastSeen = now;
    if (ev.correct) {
      f.correct++;
      var gain = 1 + w * Math.exp(0.9) * (11 - f.difficulty) / 10 * Math.pow(f.stability, -0.2) * (Math.exp((1 - R) * 1.5) - 1);
      var slowF = ev.rtMs > (RT_SLOW[facet] || 4000) ? 0.6 : 1;
      f.stability *= Math.max(1.05, gain * slowF);
      f.difficulty = clamp(f.difficulty - 0.15 * w, 1, 10);
      if (ev.rtMs != null) f.rtEmaMs = f.rtEmaMs ? f.rtEmaMs * 0.7 + ev.rtMs * 0.3 : ev.rtMs;
      // decay confusion edges on correct discrimination (§5.6.2)
      Object.keys(s.confusions).forEach(function (k) { s.confusions[k] = Math.max(0, s.confusions[k] - 0.34); if (s.confusions[k] < 0.01) delete s.confusions[k]; });
    } else {
      f.errors++; if (f.reps > 2) f.lapses++;
      f.stability = Math.max(0.02, f.stability * (0.35 + 0.3 * (1 - w)));
      f.difficulty = clamp(f.difficulty + 0.6 * w, 1, 10);
      s.lastError = now;
      if (ev.chosenItemId && ev.chosenItemId !== id) {
        s.confusions[ev.chosenItemId] = (s.confusions[ev.chosenItemId] || 0) + 1;
        var log = load().errorLog;
        log.push({ itemId: id, confusedWith: ev.chosenItemId, facet: facet, at: now, gameId: ev.gameId || '' });
        if (log.length > 500) log.splice(0, log.length - 500);
      }
      if (f.lapses >= 6) s.flags.leech = true;
    }
    if (w >= 0.5) f.reps++;
    f.lastReview = now; s.facets[facet] = f;
    if (id.indexOf('kana:') === 0) s.scaffold.romaji = mastery(id, 'form→sound', now) < 0.75;
    if (id.indexOf('w:') === 0) s.scaffold.gloss = mastery(id, 'form→meaning', now) < 0.8;
    save();
    return s;
  }
  function priority(s, facet, now) {
    var f = s.facets[facet]; if (!f) return null;
    var R = retrievability(f, now), p = Math.max(0, TARGET_R - R) * 10 + (f.difficulty / 10) * 1.5;
    var conf = 0; for (var k in s.confusions) conf += s.confusions[k];
    p += Math.min(3, conf) * 0.8 + (s.flags.leech ? 1.5 : 0);
    if (now - s.lastError < 10 * MIN) p += 4;          // smart error repetition
    if (now - s.lastSeen < 2 * MIN / 4) p -= 5;          // avoid repeating too soon (scaled for arcade pace: 30 s)
    return { p: p, R: R };
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  /* selectRound: candidates = ordered (curriculum) list of item ids available to the game.
     opts: {facet, size, maxNew, mix:{review,weak,new} } → returns array of ids (≈60% review / 25% weak / 15% new). */
  function selectRound(candidates, opts) {
    var now = Date.now(), facet = opts.facet, size = opts.size || 8, mix = opts.mix || { review: 0.6, weak: 0.25, fresh: 0.15 };
    var seen = [], unseen = [];
    candidates.forEach(function (id) { var s = state(id); if (s && s.facets[facet]) { var pr = priority(s, facet, now); seen.push({ id: id, p: pr.p, R: pr.R }); } else unseen.push(id); });
    var weak = seen.filter(function (x) { return x.p > 3; }).sort(function (a, b) { return b.p - a.p; });
    var review = seen.filter(function (x) { return x.p <= 3; }).sort(function (a, b) { return a.R - b.R; });
    var nNew = Math.min(opts.maxNew == null ? 3 : opts.maxNew, unseen.length, Math.max(seen.length < 5 ? size : 0, Math.round(size * mix.fresh)));
    var nWeak = Math.min(weak.length, Math.round(size * mix.weak) + (review.length ? 0 : size));
    var out = unseen.slice(0, nNew).concat(weak.slice(0, nWeak).map(function (x) { return x.id; }));
    var rest = review.concat(weak.slice(nWeak));
    // review picks: lowest R first with a bit of randomness to avoid fixed order
    rest = rest.slice(0, Math.max(size * 2, 6)); shuffle(rest);
    for (var i = 0; out.length < size && i < rest.length; i++) if (out.indexOf(rest[i].id) < 0) out.push(rest[i].id);
    // Never exceed maxNew when there is little review history; smaller plans are intentional.
    // interleave: pull personal confusions of chosen items into the round (contrastive training)
    if (opts.interleave !== false) out.slice().forEach(function (id) {
      var s = state(id); if (!s) return;
      Object.keys(s.confusions).forEach(function (c) { if (s.confusions[c] >= 1 && out.indexOf(c) < 0 && candidates.indexOf(c) >= 0 && out.length < size + 3) out.push(c); });
    });
    return out;
  }
  function recentErrors(limit) { var l = load().errorLog; return l.slice(-(limit || 20)); }
  function gameData(gameId) { var d = load(); return d.games[gameId] || (d.games[gameId] = {}); }
  root.Learner = {
    ready: ready, state: state, record: record, mastery: mastery, retrievability: retrievability, selectRound: selectRound,
    recentErrors: recentErrors, gameData: gameData, save: save, flush: flush, shuffle: shuffle,
    all: function () { return load().items; },
    export: function () { return JSON.stringify(load()); },
    import: function (json) { mem = JSON.parse(json); flush(); },
    reset: function () { mem = null; if (store) store.removeItem(KEY); load(); flush(); }
  };
})(typeof window !== 'undefined' ? window : globalThis);


