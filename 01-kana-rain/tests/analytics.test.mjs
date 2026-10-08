import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = await readFile(new URL('../assets/nihongo-analytics.js', import.meta.url), 'utf8');
const id = 'G-F69S8JDW5M';
function browser({ host = 'kana-rain.nihongogrove.top', path = '/', cookie = '', signal = {}, app = 'rain', referrer = 'https://example.org/private/path?email=private#secret', protocol = 'https:' } = {}) {
  const cookies = new Map(cookie.split(';').filter(Boolean).map(s => s.trim().split('=')));
  const writes = [], remoteScripts = [], listeners = new Map(), intervals = [];
  function addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, []); listeners.get(name).push(fn); }
  function fire(name, event = {}) { for (const fn of listeners.get(name) || []) fn(event); }
  class Element {
    constructor(tag) { this.tagName = tag; this.nodes = new Map(); this.events = new Map(); this.open = false; this.removed = false; this.dataset = {}; }
    setAttribute(name, value) { this[name] = value; }
    addEventListener(name, fn) { this.events.set(name, fn); }
    querySelector(selector) { if (!this.nodes.has(selector)) this.nodes.set(selector, new Element('button')); return this.nodes.get(selector); }
    showModal() { this.open = true; }
    close() { this.open = false; }
    focus() { document.activeElement = this; }
    remove() { this.removed = true; }
    click() { this.events.get('click')?.({ target: this }); }
  }
  const document = {
    readyState: 'loading', currentScript: { dataset: { app } }, referrer, activeElement: new Element('button'),
    head: { appendChild(element) { remoteScripts.push(element); } },
    body: { append(...elements) { document.elements = elements; } },
    createElement: tag => new Element(tag), addEventListener, querySelectorAll: () => [],
    get cookie() { return [...cookies].map(([key, value]) => key + '=' + value).join('; '); },
    set cookie(value) { writes.push(value); const [pair] = value.split(';'); const split = pair.indexOf('='); const key = pair.slice(0, split); if (/Max-Age=0(?:;|$)/.test(value)) cookies.delete(key); else cookies.set(key, pair.slice(split + 1)); }
  };
  const window = { addEventListener, dispatchEvent: event => fire(event.type), setInterval: fn => intervals.push(fn) };
  vm.runInNewContext(source, { window, document, navigator: signal, location: { hostname: host, protocol, origin: protocol + '//' + host, pathname: path }, URL, Event, Date });
  fire('DOMContentLoaded');
  const dialog = document.elements[1];
  return {
    api: window.NihongoAnalytics, window, document, writes, remoteScripts, cookies, intervals,
    accept: () => dialog.querySelector('[data-choice="accepted"]').click(),
    decline: () => dialog.querySelector('[data-choice="denied"]').click(),
    focus: () => fire('focus'), poll: () => intervals.forEach(fn => fn()),
    commands: () => Array.from(window.dataLayer || [], args => Array.from(args)),
    events: () => Array.from(window.dataLayer || [], args => Array.from(args)).filter(args => args[0] === 'event')
  };
}

test('unknown and declined preferences never load or queue Google events', () => {
  for (const cookie of ['', 'ng_analytics_consent=denied']) {
    const b = browser({ cookie });
    assert.equal(b.remoteScripts.length, 0);
    assert.equal(b.api.track('practice_start', { practice_mode: 'hira' }), false);
    assert.equal(b.api.pageView('/about.html'), false);
    assert.deepEqual(b.commands(), []);
    b.decline();
    assert.equal(b.remoteScripts.length, 0);
    assert.equal(b.window['ga-disable-' + id], true);
  }
});

test('production opt-in configures one tag with no automatic page view or advertising', () => {
  const b = browser();
  b.accept();
  assert.equal(b.remoteScripts.length, 1);
  assert.equal(b.remoteScripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=' + id);
  const config = b.commands().find(args => args[0] === 'config')[2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.allow_google_signals, false);
  assert.equal(config.allow_ad_personalization_signals, false);
  assert.equal(config.cookie_domain, 'nihongogrove.top');
  assert.equal(config.cookie_expires, 15552000);
  assert.equal(config.cookie_update, false);
  const consent = b.commands().filter(args => args[0] === 'consent');
  assert.equal(consent[0][2].analytics_storage, 'denied');
  assert.equal(consent[1][2].analytics_storage, 'granted');
  for (const args of consent) for (const name of ['ad_storage', 'ad_user_data', 'ad_personalization']) assert.equal(args[2][name], 'denied');
  assert.equal(b.events().filter(args => args[1] === 'page_view').length, 1);
  assert.ok(b.writes.some(value => value.includes('ng_analytics_consent=accepted;') && value.includes('Domain=nihongogrove.top') && value.includes('Secure') && value.includes('SameSite=Lax') && value.includes('Max-Age=15552000')));
});

test('preview, lookalike hosts, and HTTP cannot load GA even after consent', () => {
  for (const settings of [{ host: 'localhost', protocol: 'http:' }, { host: 'nihongogrove.top.attacker.test' }, { host: 'kana-rain.nihongogrove.top', protocol: 'http:' }]) {
    const b = browser(settings); b.accept();
    assert.equal(b.remoteScripts.length, 0);
    assert.deepEqual(b.commands(), []);
  }
});

test('all three genuine hosts use bounded site_app identifiers', () => {
  for (const [host, app] of [['nihongogrove.top', 'hub'], ['kana.nihongogrove.top', 'core'], ['kana-rain.nihongogrove.top', 'rain']]) {
    const b = browser({ host, app: 'untrusted', cookie: 'ng_analytics_consent=accepted' });
    assert.equal(b.events()[0][2].site_app, app);
  }
});

test('DNT and GPC override even a stored opt-in', () => {
  for (const signal of [{ doNotTrack: '1' }, { msDoNotTrack: '1' }, { globalPrivacyControl: true }]) {
    const b = browser({ cookie: 'ng_analytics_consent=accepted', signal });
    b.accept();
    assert.equal(b.remoteScripts.length, 0);
    assert.equal(b.cookies.get('ng_analytics_consent'), 'denied');
    assert.equal(b.api.track('practice_start', { practice_mode: 'hira' }), false);
  }
});

test('URLs, referrers, and titles are sanitized; virtual page views dedupe', () => {
  const b = browser({ path: '/about.html?email=secret#answer', cookie: 'ng_analytics_consent=accepted' });
  let event = b.events()[0][2];
  assert.equal(event.page_location, 'https://kana-rain.nihongogrove.top/about.html');
  assert.equal(event.page_title, 'Kana Rain | About');
  assert.equal(event.page_referrer, 'https://example.org/');
  assert.equal(b.api.pageView('/about.html?another=secret'), false);
  assert.equal(b.api.pageView('/art.html#private'), true);
  assert.equal(b.api.pageView('/user/private?token=secret'), true);
  event = b.events().at(-1)[2];
  assert.equal(event.page_location, 'https://kana-rain.nihongogrove.top/');
  assert.ok(!JSON.stringify(b.commands()).includes('secret'));
  const core = browser({ host: 'kana.nihongogrove.top', cookie: 'ng_analytics_consent=accepted' });
  assert.equal(core.api.pageView('/progress'), true);
  assert.equal(core.api.pageView('/settings'), true);
});

test('Sites clean URL aliases use fixed canonical titles and deduplicate page views', () => {
  for (const [host, aliases] of [
    ['nihongogrove.top', [['/privacy', '/privacy.html', 'Nihongo Grove | Privacy']]],
    ['kana.nihongogrove.top', [['/privacy', '/privacy.html', 'Japanese Core | Privacy']]],
    ['kana-rain.nihongogrove.top', [['/privacy', '/privacy.html', 'Kana Rain | Privacy'], ['/about', '/about.html', 'Kana Rain | About'], ['/art', '/art.html', 'Kana Rain | Artwork']]]
  ]) {
    const b = browser({ host, path: aliases[0][0] + '?private=secret#private', cookie: 'ng_analytics_consent=accepted' });
    for (const [alias, canonical, title] of aliases) {
      b.api.pageView(alias + '?private=secret#private');
      const event = b.events().at(-1)[2];
      assert.equal(event.page_location, 'https://' + host + canonical);
      assert.equal(event.page_title, title);
      const count = b.events().length;
      assert.equal(b.api.pageView(canonical), false);
      assert.equal(b.api.pageView(alias), false);
      assert.equal(b.events().length, count);
    }
    assert.ok(!JSON.stringify(b.commands()).includes('secret'));
  }
  const hub = browser({ host: 'nihongogrove.top', cookie: 'ng_analytics_consent=accepted' });
  assert.equal(hub.api.pageView('/about'), false);
  const core = browser({ host: 'kana.nihongogrove.top', cookie: 'ng_analytics_consent=accepted' });
  assert.equal(core.api.pageView('/art'), false);
});

test('event allowlist rejects arbitrary names, values, and extra learner fields', () => {
  const b = browser({ cookie: 'ng_analytics_consent=accepted' });
  const before = b.events().length;
  for (const [name, params] of [
    ['answer_submitted', { answer: 'secret' }], ['practice_start', { practice_mode: 'custom-private-mode' }],
    ['practice_start', { practice_mode: 'hira', score: 20 }], ['practice_start', { practice_mode: 'hira', username: 'private' }],
    ['practice_complete', { practice_mode: 'hira' }], ['practice_complete', { practice_mode: 'hira', completion_reason: 'free text' }],
    ['app_open', { target_app: 'https://example.com' }], ['practice_start', null], ['constructor', {}]
  ]) assert.equal(b.api.track(name, params), false);
  assert.equal(b.events().length, before);
  assert.equal(b.api.track('practice_start', { practice_mode: 'spaced_review' }), true);
  assert.equal(b.api.track('practice_complete', { practice_mode: 'hira', completion_reason: 'timer_elapsed' }), true);
  assert.equal(b.api.track('app_open', { target_app: 'core' }), true);
  const event = b.events().at(-1)[2];
  assert.equal(event.site_app, 'rain');
  assert.ok(!('user_id' in event));
});

test('denied events are discarded; acceptance sends only the current screen', () => {
  const b = browser({ host: 'kana.nihongogrove.top' });
  b.api.track('practice_start', { practice_mode: 'spaced_review' });
  b.api.pageView('/practice');
  b.accept();
  assert.deepEqual(b.events().map(event => event[1]), ['page_view']);
  assert.equal(b.events()[0][2].page_location, 'https://kana.nihongogrove.top/practice');
});

test('sibling withdrawal is detected before an event and clears cookies and queued commands', () => {
  const b = browser({ cookie: 'ng_analytics_consent=accepted;_ga=test;_ga_F69S8JDW5M=session' });
  b.cookies.set('ng_analytics_consent', 'denied');
  assert.equal(b.api.track('practice_complete', { practice_mode: 'hira', completion_reason: 'manual_finish' }), false);
  assert.equal(b.window['ga-disable-' + id], true);
  assert.deepEqual(b.commands(), []);
  assert.equal(b.cookies.has('_ga'), false);
  assert.equal(b.cookies.has('_ga_F69S8JDW5M'), false);
  assert.ok(b.writes.some(value => value.startsWith('_ga=;') && value.includes('Domain=nihongogrove.top')));
  assert.ok(b.writes.some(value => value.startsWith('_ga=;') && value.includes('Domain=kana-rain.nihongogrove.top')));
});

test('loaded runtime supports withdrawal then opt-in without reload or a second library', () => {
  const b = browser({ cookie: 'ng_analytics_consent=accepted' });
  b.remoteScripts[0].onload();
  b.decline();
  assert.equal(b.window['ga-disable-' + id], true);
  b.accept();
  assert.equal(b.window['ga-disable-' + id], false);
  assert.equal(b.remoteScripts.length, 1);
  assert.equal(b.events().filter(args => args[1] === 'page_view').length, 1);
  assert.equal(b.api.track('practice_start', { practice_mode: 'hira' }), true);
});

test('slow library is removed on withdrawal and failed library can be retried explicitly', () => {
  const b = browser(); b.accept();
  b.decline(); assert.equal(b.remoteScripts[0].removed, true);
  b.accept(); assert.equal(b.remoteScripts.length, 2);
  b.remoteScripts[1].onerror();
  assert.equal(b.window['ga-disable-' + id], true);
  assert.deepEqual(b.commands(), []);
  b.poll(); assert.equal(b.remoteScripts.length, 2);
  b.accept(); assert.equal(b.remoteScripts.length, 3);
  assert.equal(b.api.track('practice_start', { practice_mode: 'hira' }), true);
});

test('focus and polling observe shared denial without a custom event', () => {
  for (const method of ['focus', 'poll']) {
    const b = browser({ cookie: 'ng_analytics_consent=accepted' });
    b.remoteScripts[0].onload(); b.cookies.set('ng_analytics_consent', 'denied'); b[method]();
    assert.equal(b.window['ga-disable-' + id], true);
    assert.deepEqual(b.commands(), []);
  }
});
