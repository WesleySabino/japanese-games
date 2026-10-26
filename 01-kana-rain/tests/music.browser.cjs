'use strict';
// Real-browser checks for the menu music: silence before a gesture, title screen only, both
// sound controls, hidden tabs, ducking under interface tones, levels and the loop seam.
// Isolated contexts with synthetic progress only; the report stays in ignored test artifacts.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require('playwright');
const url = 'http://127.0.0.1:4184', out = path.join(__dirname, 'artifacts/music');
const checks = [], errors = [], contexts = [];
let browser, server;

async function open({ sound = true, mobile = false } = {}) {
  const viewport = mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 };
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
  contexts.push(ctx);
  await ctx.addCookies([{ name: 'ng_analytics_consent', value: 'denied', url, sameSite: 'Lax' }]);
  await ctx.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await ctx.addInitScript(sound => {
    // Only the music starts buffer sources: interface tones are oscillators and
    // pronunciations play through <audio>.
    const start = AudioBufferSourceNode.prototype.start, target = AudioParam.prototype.setTargetAtTime;
    window.musicNotes = 0;
    window.audioTargets = [];
    AudioBufferSourceNode.prototype.start = function (...args) { window.musicNotes++; return start.apply(this, args); };
    AudioParam.prototype.setTargetAtTime = function (value, ...rest) { window.audioTargets.push(value); return target.call(this, value, ...rest); };
    if (localStorage.getItem('music-fixture')) return;
    localStorage.setItem('jp-learner-v1', JSON.stringify({ version: 1, items: {}, errorLog: [], games: { 'kana-rain': { playStyle: 'arcade', sound } }, created: 1690000000000 }));
    localStorage.setItem('music-fixture', '1');
  }, sound);
  const page = await ctx.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForFunction(() => !!window.KanaRain && !!window.KanaMusic);
  await page.evaluate(() => KanaAudio.ready);
  return page;
}
const notes = page => page.evaluate(() => window.musicNotes);
const playing = page => page.evaluate(() => KanaMusic.playing);
async function stillSilent(page, label) {
  const before = await notes(page);
  await page.waitForTimeout(1200);
  assert.equal(await notes(page), before, label + ': no new notes');
  assert.equal(await playing(page), false, label);
}
async function sounding(page, label) {
  await page.waitForFunction(() => KanaMusic.playing && KanaSfx.context?.state === 'running');
  const before = await notes(page);
  await page.waitForFunction(count => window.musicNotes > count, before, { timeout: 8000 });
  assert.equal(await playing(page), true, label);
}
function setHidden(page, hidden) {
  return page.evaluate(hidden => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

async function lifecycle() {
  const page = await open();
  await page.waitForTimeout(800);
  assert.equal(await notes(page), 0);
  assert.equal(await playing(page), false);
  assert.equal(await page.evaluate(() => KanaSfx.context), null, 'no audio context before a gesture');
  checks.push({ check: 'silent and without an audio context before the first gesture', pass: true });

  await page.keyboard.press('Shift');
  await sounding(page, 'a key on the title screen starts the music');
  checks.push({ check: 'the first key press on the title screen starts the music', pass: true });

  await page.evaluate(() => { window.audioTargets = []; });
  await page.locator('#settingsBtn').click();
  await page.waitForFunction(() => window.audioTargets.includes(KanaMusic.ducking.effects));
  assert.equal(await playing(page), true, 'Settings over the title screen keeps the music');
  await page.locator('#closeSettings').click();
  checks.push({ check: 'a menu tone pushes the music below it; menu dialogs keep it playing', pass: true });

  await setHidden(page, true);
  await stillSilent(page, 'a hidden tab stops the music');
  await setHidden(page, false);
  await sounding(page, 'a visible title screen resumes the music');
  checks.push({ check: 'hidden tab stops it; showing the title screen again restarts it', pass: true });

  await page.locator('#startBtn').click();
  assert.equal(await playing(page), false, 'starting a run stops the music at once');
  await page.waitForTimeout(800);
  await stillSilent(page, 'countdown and rain');
  await page.locator('#skipCountdown').click();
  await stillSilent(page, 'rain');
  await page.locator('#pauseBtn').click();
  await stillSilent(page, 'pause');
  await page.locator('#finishBtn').click();
  assert.equal(await page.locator('#results').isVisible(), true);
  await stillSilent(page, 'results');
  await page.locator('#backBtn').click();
  await sounding(page, 'returning to the title screen restarts the music');
  checks.push({ check: 'countdown, rain, pause and results are silent; the title screen plays again', pass: true });

  await page.locator('#soundBtn').click();
  assert.equal(await page.evaluate(() => KanaAudio.enabled), false);
  await stillSilent(page, 'sound button off');
  await page.locator('#soundBtn').click();
  await sounding(page, 'sound button on');
  await page.locator('#settingsBtn').click();
  await page.locator('#settingsSoundBtn').click();
  assert.equal(await page.locator('#settingsSoundBtn').getAttribute('aria-label'), 'Enable pronunciation, music and effects');
  await stillSilent(page, 'Settings sound off');
  await page.locator('#settingsSoundBtn').click();
  await sounding(page, 'Settings sound on');
  checks.push({ check: 'both sound controls stop and restart the music', pass: true });
  await page.context().close();

  const muted = await open({ sound: false });
  await muted.keyboard.press('Shift');
  await muted.waitForFunction(() => KanaSfx.context?.state === 'running');
  await stillSilent(muted, 'a saved muted preference');
  assert.equal(await notes(muted), 0);
  checks.push({ check: 'a saved muted preference keeps the title screen silent after a gesture', pass: true });
  await muted.context().close();

  const phone = await open({ mobile: true });
  const box = await phone.locator('#welcome').boundingBox();
  await phone.touchscreen.tap(box.x + box.width / 2, box.y + 12);
  await sounding(phone, 'a tap starts the music on a phone');
  checks.push({ check: 'a tap on the phone title screen starts the music', pass: true });
  await phone.context().close();
}

// Offline renders in the page: the real score, levels and interface tones, no live output.
async function measurements() {
  const page = await open();
  const result = await page.evaluate(async () => {
    const windowMax = (buffer, seconds, from = 0, to = buffer.length) => {
      const size = Math.round(seconds * buffer.sampleRate), channels = [0, 1].map(c => buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1)));
      let best = 0;
      for (let start = from; start + size <= to; start += Math.max(1, size >> 2)) {
        let energy = 0;
        for (let i = start; i < start + size; i++) energy += (channels[0][i] ** 2 + channels[1][i] ** 2) / 2;
        best = Math.max(best, Math.sqrt(energy / size));
      }
      return best;
    };
    const peak = buffer => Math.max(...[...Array(buffer.numberOfChannels).keys()].map(c => buffer.getChannelData(c).reduce((m, x) => Math.max(m, Math.abs(x)), 0)));
    const sfx = await (await fetch('src/sfx.js')).text(), cues = {};
    for (const kind of ['menu', 'start', 'confirm', 'back', 'warning']) {
      // Run the real sfx.js against an offline context that reports itself running.
      class Offline extends OfflineAudioContext { constructor() { super(2, 48000, 48000); } get state() { return 'running'; } resume() { return Promise.resolve(); } }
      const listeners = {}, fake = { AudioContext: Offline, KanaAudio: { enabled: true, playing: false }, setTimeout: setTimeout.bind(window), queueMicrotask: queueMicrotask.bind(window) };
      new Function('window', 'document', sfx)(fake, { addEventListener: (name, fn) => { listeners[name] = fn; } });
      listeners.pointerdown();
      const context = fake.KanaSfx.context;
      if (!await fake.KanaSfx.play(kind)) throw new Error('cue did not play: ' + kind);
      const buffer = await context.startRendering();
      cues[kind] = { peak: peak(buffer), rms75: windowMax(buffer, .075) };
    }
    const decoder = new OfflineAudioContext(2, 48000, 48000), speech = {};
    for (const name of ['ka', 'shi', 'a']) {
      const buffer = await decoder.decodeAudioData(await (await fetch('kana-audio-bundle/audio/' + name + '.mp3')).arrayBuffer());
      speech[name] = windowMax(buffer, .4);
    }
    const { intro, loop } = KanaMusic.timing, rate = 48000, music = await KanaMusic.render(intro + 2 * loop + 1, rate);
    const size = Math.round(.1 * rate), mono = music.getChannelData(0).map((x, i) => (x + music.getChannelData(1)[i]) / 2);
    const rms = start => { let e = 0; for (let i = start; i < start + size; i++) e += mono[i] ** 2; return Math.sqrt(e / size); };
    const near = (time, seconds) => [Math.round((time - seconds) * rate), Math.round((time + seconds) * rate)];
    const boundaries = [intro + loop, intro + 2 * loop];
    let interior = Infinity, steepest = 0;
    for (let start = Math.round((intro + 3) * rate); start + size < Math.round((intro + 2 * loop - .5) * rate); start += size >> 1) {
      if (Math.abs(start / rate - boundaries[0]) > .6) interior = Math.min(interior, rms(start));
    }
    for (let i = 1; i < mono.length; i++) steepest = Math.max(steepest, Math.abs(mono[i] - mono[i - 1]));
    const seams = boundaries.map(time => {
      const [a, b] = near(time, .5), [c, d] = near(time, .05);
      let quietest = Infinity, step = 0;
      for (let start = a; start + size <= b; start += size >> 1) quietest = Math.min(quietest, rms(start));
      for (let i = c; i < d; i++) step = Math.max(step, Math.abs(mono[i] - mono[i - 1]));
      return { time, quietest, step };
    });
    const body = [Math.round((intro + 3) * rate), Math.round((intro + loop) * rate)];
    return {
      cues, speech, ducking: KanaMusic.ducking, interior, steepest, seams,
      music: { peak: peak(music), rms75: windowMax(music, .075, ...body), rms400: windowMax(music, .4, ...body) }
    };
  });
  const db = value => +(20 * Math.log10(value)).toFixed(1);
  const quietestCue = Math.min(...Object.values(result.cues).map(cue => cue.rms75)), lowestPeak = Math.min(...Object.values(result.cues).map(cue => cue.peak));
  const softestSpeech = Math.min(...Object.values(result.speech));
  assert.ok(result.music.rms400 > 10 ** (-60 / 20), 'the music is audible: ' + db(result.music.rms400) + ' dBFS');
  assert.ok(result.music.rms400 < softestSpeech / 10, 'the music stays at least 20 dB under every pronunciation');
  assert.ok(result.music.peak * result.ducking.effects < lowestPeak, 'ducked music peaks stay under every interface tone peak');
  assert.ok(result.music.rms75 * result.ducking.effects < quietestCue, 'ducked music stays under every interface tone');
  assert.ok(result.ducking.speech <= .35, 'a pronunciation lowers the music by at least 9 dB');
  for (const seam of result.seams) {
    assert.ok(seam.quietest >= result.interior, 'no dropout at the loop seam ' + seam.time.toFixed(2) + ' s');
    assert.ok(seam.step <= result.steepest, 'no click at the loop seam ' + seam.time.toFixed(2) + ' s');
  }
  checks.push({
    check: 'levels: under pronunciations, ducked under interface tones; seamless loop joins', pass: true,
    dbfs: {
      musicPeak: db(result.music.peak), music75ms: db(result.music.rms75), music400ms: db(result.music.rms400),
      cuePeakLowest: db(lowestPeak), cue75msLowest: db(quietestCue), speech400msSoftest: db(softestSpeech),
      seams: result.seams.map(seam => ({ seconds: +seam.time.toFixed(2), quietest100ms: db(seam.quietest), largestStep: db(seam.step) })),
      quietest100msInLoop: db(result.interior), largestStep: db(result.steepest)
    }
  });
  await page.context().close();
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  server = spawn(process.execPath, [path.join(__dirname, '../scripts/serve.cjs')], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: '4184' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => { server.stdout.once('data', resolve); server.once('error', reject); server.once('exit', code => reject(new Error('Server exited ' + code))); });
  const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
  browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
  await lifecycle(); await measurements();
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), syntheticProgress: true, externalRequests: 'blocked', checks, errors }, null, 2) + '\n');
  console.log('PASS: menu music; ' + checks.length + ' checks, zero page errors.');
  console.log(JSON.stringify(checks.at(-1).dbfs));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  for (const ctx of contexts) await ctx.close().catch(() => {});
  if (browser) await browser.close();
  if (server) server.kill();
});
