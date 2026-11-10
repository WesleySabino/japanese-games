/* Every pronunciation comes from the supplied manifest. No synthesized browser speech. */
(function (root) {
  'use strict';
  const scriptSrc = document.currentScript?.src;
  const manifestUrl = scriptSrc
    ? new URL('../kana-audio-bundle/runtime-manifest.json', scriptSrc)
    : new URL('kana-audio-bundle/runtime-manifest.json', document.baseURI);
  let pack = null, enabled = true, current = null;
  const ready = fetch(manifestUrl).then(r => { if(!r.ok) throw new Error('Audio manifest unavailable'); return r.json(); }).then(p => {pack=p; return p;}).catch(() => null);
  function stop() {
    const request = current; current = null;
    if(request?.audio) { request.audio.onended = request.audio.onerror = null; request.audio.pause(); }
  }
  async function play(symbol) {
    stop();
    if(!enabled) return false;
    // Request identity owns every async continuation, including Audio.play().
    // Cancellation or replacement must never report a late success to the learner.
    const request = {phase:'loading', audio:null}; current = request;
    await ready;
    if(current !== request) return false;
    // Resolve only supplied kana recordings; never fabricate a pronunciation.
    const file = pack?.byKana[symbol];
    if(!file || !enabled) { stop(); return false; }
    try {
      const audio = new Audio(new URL(file, manifestUrl).href);
      request.audio = audio; request.phase = 'starting';
      audio.onended = audio.onerror = () => { if(current === request) stop(); };
      await audio.play();
      if(current !== request || !enabled) { audio.pause(); return false; }
      request.phase = 'playing'; return true;
    } catch {
      if(current === request) stop();
      return false;
    }
  }
  root.KanaAudio = {ready,play,stop,hasRecording(symbol){return !!pack?.byKana[symbol];},get state(){return current?.phase||'idle';},get playing(){const audio=current?.audio;return !!audio&&!audio.paused&&!audio.ended;},get available(){return !!pack;},get enabled(){return enabled;},set enabled(v){enabled=!!v;if(!enabled)stop();}};
})(window);
