/* Every pronunciation comes from the supplied manifest. No synthesized browser speech. */
(function (root) {
  'use strict';
  const scriptSrc = document.currentScript?.src;
  const manifestUrl = scriptSrc
    ? new URL('../kana-audio-bundle/runtime-manifest.json', scriptSrc)
    : new URL('kana-audio-bundle/runtime-manifest.json', document.baseURI);
  let pack = null, enabled = true, current = null, generation = 0;
  const ready = fetch(manifestUrl).then(r => { if(!r.ok) throw new Error('Audio manifest unavailable'); return r.json(); }).then(p => {pack=p; return p;}).catch(() => null);
  function stop() { generation++; if(current) {current.pause(); current.onended = null;} current=null; }
  async function play(symbol) {
    stop();
    if(!enabled) return false;
    const token = generation;
    await ready;
    if(!pack || token !== generation || !enabled) return false;
    // Resolve only supplied kana recordings; never fabricate a pronunciation.
    const file = pack.byKana[symbol];
    if(!file) return false;
    current = new Audio(new URL(file, manifestUrl).href);
    try { await current.play(); return true; } catch { return false; }
  }
  root.KanaAudio = {ready,play,stop,hasRecording(symbol){return !!pack?.byKana[symbol];},get playing(){return !!current&&!current.paused&&!current.ended;},get available(){return !!pack;},get enabled(){return enabled;},set enabled(v){enabled=!!v;if(!enabled)stop();}};
})(window);
