/* Nihongo Grove: consent-first GA4. Shared by the hub, Core, and Rain. */
(function () {
  'use strict';
  if (window.NihongoAnalytics) return;
  const MEASUREMENT_ID = 'G-F69S8JDW5M';
  const COOKIE = 'ng_analytics_consent';
  const MAX_AGE = 60 * 60 * 24 * 180;
  const DOMAIN = 'nihongogrove.top';
  const APPS = { 'nihongogrove.top': 'hub', 'kana.nihongogrove.top': 'core', 'kana-rain.nihongogrove.top': 'rain' };
  const script = document.currentScript;
  const app = APPS[location.hostname] || (['hub', 'core', 'rain'].includes(script?.dataset.app) ? script.dataset.app : 'hub');
  const production = Object.hasOwn(APPS, location.hostname) && location.protocol === 'https:';
  const routes = {
    hub: { '/': 'Nihongo Grove', '/privacy.html': 'Nihongo Grove | Privacy' },
    rain: { '/': 'Kana Rain', '/about.html': 'Kana Rain | About', '/art.html': 'Kana Rain | Artwork', '/privacy.html': 'Kana Rain | Privacy' },
    core: { '/': 'Japanese Core', '/practice': 'Japanese Core | Practice', '/progress': 'Japanese Core | Progress', '/settings': 'Japanese Core | Settings', '/privacy.html': 'Japanese Core | Privacy' }
  };
  const modes = ['hira', 'kata', 'mix', 'pair', 'words', 'review', 'reading', 'listening', 'writing', 'spaced_review'];
  const schemas = {
    app_open: { target_app: ['core', 'rain'] },
    practice_start: { practice_mode: modes },
    practice_complete: { practice_mode: modes, completion_reason: ['timer_elapsed', 'hearts_lost', 'manual_finish', 'completed'] }
  };
  let choice = 'unknown', active = false, tag = null, configured = false, currentPath = safePath(location.pathname), lastPath = null;
  let dialog, status, allow, decline, close, returnFocus;

  function signalDenied() {
    return navigator.globalPrivacyControl === true || [navigator.doNotTrack, navigator.msDoNotTrack, window.doNotTrack].includes('1');
  }
  function readChoice() {
    try {
      const values = document.cookie.split(';').map(s => s.trim()).filter(s => s.startsWith(COOKIE + '='));
      // Denial wins if a stale host cookie conflicts with the shared root cookie.
      if (values.some(s => s === COOKIE + '=denied')) return 'denied';
      if (values.some(s => s === COOKIE + '=accepted')) return 'accepted';
    } catch (_) { /* Cookie access may be unavailable. */ }
    return 'unknown';
  }
  function saveChoice(value) {
    try {
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      if (production) document.cookie = COOKIE + '=; Path=/; Max-Age=0' + secure + '; SameSite=Lax';
      document.cookie = COOKIE + '=' + value + '; Path=/; Max-Age=' + MAX_AGE + '; SameSite=Lax' + secure + (production ? '; Domain=' + DOMAIN : '');
      return readChoice() === value;
    } catch (_) { return false; }
  }
  function clearAnalyticsCookies() {
    try {
      const names = new Set(['_ga', '_ga_' + MEASUREMENT_ID.slice(2)]);
      document.cookie.split(';').forEach(s => { const name = s.trim().split('=')[0]; if (/^_ga(?:_|$)/.test(name)) names.add(name); });
      for (const name of names) {
        const suffix = '=; Path=/; Max-Age=0; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
        document.cookie = name + suffix;
        if (production) {
          document.cookie = name + suffix + '; Domain=' + DOMAIN;
          document.cookie = name + suffix + '; Domain=' + location.hostname;
        }
      }
    } catch (_) { /* Opt-out still works if cookies are blocked. */ }
  }
  function safePath(value) {
    if (typeof value !== 'string') return '/';
    const path = value.split(/[?#]/)[0];
    const aliases = { '/index.html': '/', '/privacy': '/privacy.html', '/about': '/about.html', '/art': '/art.html' };
    const normalized = Object.hasOwn(aliases, path) ? aliases[path] : path;
    return Object.hasOwn(routes[app], normalized) ? normalized : '/';
  }
  function safeReferrer() {
    try { const url = new URL(document.referrer); return ['https:', 'http:'].includes(url.protocol) ? url.origin + '/' : ''; }
    catch (_) { return ''; }
  }
  function pageParams() {
    return { page_location: location.origin + currentPath, page_title: routes[app][currentPath], page_referrer: safeReferrer(), site_app: app };
  }
  function command() { window.dataLayer.push(arguments); }
  function stop() {
    window['ga-disable-' + MEASUREMENT_ID] = true;
    active = false;
    lastPath = null;
    // Prevent accepted commands waiting for a blocked/slow library from being replayed after withdrawal.
    if (window.dataLayer) window.dataLayer.length = 0;
    if (tag && !configured) { tag.remove(); tag = null; }
    clearAnalyticsCookies();
  }
  function start() {
    if (active || !production || choice !== 'accepted' || signalDenied()) return;
    active = true;
    window['ga-disable-' + MEASUREMENT_ID] = false;
    window.dataLayer = window.dataLayer || [];
    // All commands and the remote library exist only after an explicit opt-in.
    command('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    command('consent', 'update', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    command('set', 'ads_data_redaction', true);
    command('set', 'url_passthrough', false);
    command('js', new Date());
    command('config', MEASUREMENT_ID, {
      send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_domain: DOMAIN, cookie_expires: MAX_AGE, cookie_update: false, cookie_flags: 'SameSite=Lax;Secure',
      ...pageParams()
    });
    if (!tag) {
      tag = document.createElement('script');
      tag.async = true;
      tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
      tag.onload = function () { configured = true; syncConsent(); };
      tag.onerror = function () { stop(); };
      document.head.appendChild(tag);
    }
    sendPage();
  }
  function syncConsent() {
    const next = signalDenied() ? 'denied' : readChoice();
    if (next !== choice) {
      choice = next;
      if (choice !== 'accepted') stop();
      else start();
    }
    if (signalDenied() && readChoice() === 'accepted') saveChoice('denied');
    updateUI();
    return active && choice === 'accepted' && !signalDenied();
  }
  function sendPage() {
    if (!active || lastPath === currentPath) return false;
    command('set', pageParams());
    command('event', 'page_view', { ...pageParams(), send_to: MEASUREMENT_ID });
    lastPath = currentPath;
    return true;
  }
  function pageView(path) {
    currentPath = safePath(path);
    if (!syncConsent()) return false;
    return sendPage();
  }
  function track(name, params) {
    try {
      if (!Object.hasOwn(schemas, name) || !params || typeof params !== 'object' || Array.isArray(params)) return false;
      const schema = schemas[name], keys = Object.keys(params);
      if (keys.length !== Object.keys(schema).length || keys.some(key => !Object.hasOwn(schema, key) || !schema[key].includes(params[key]))) return false;
      if (!syncConsent()) return false;
      const payload = {};
      for (const key of Object.keys(schema)) payload[key] = params[key];
      command('event', name, { ...payload, ...pageParams(), send_to: MEASUREMENT_ID });
      return true;
    } catch (_) { return false; }
  }
  function updateUI() {
    if (!status) return;
    const signal = signalDenied();
    status.textContent = signal ? 'Your browser sends a privacy signal. Analytics stays off.' : choice === 'accepted' ? 'Analytics is allowed on this browser across all three sites.' : choice === 'denied' ? 'Analytics is off on this browser across all three sites.' : 'Analytics is off until you choose to allow it.';
    allow.disabled = signal;
    allow.textContent = choice === 'accepted' ? 'Keep analytics allowed' : 'Allow analytics';
    decline.textContent = choice === 'accepted' ? 'Turn analytics off' : 'Decline analytics';
  }
  function settings() {
    if (!dialog) return;
    syncConsent();
    returnFocus = document.activeElement;
    window.dispatchEvent(new Event('nihongo-analytics-settings-open'));
    if (!dialog.open) dialog.showModal();
    decline.focus();
  }
  function dismiss() {
    dialog.close();
    returnFocus?.focus?.({ preventScroll: true });
  }
  function choose(value) {
    if (value === 'accepted' && signalDenied()) return;
    // Switch off before saving, so no runtime can transmit during withdrawal.
    if (value === 'denied') stop();
    if (!saveChoice(value)) {
      choice = 'denied'; stop(); updateUI();
      status.textContent = 'Your browser could not save this choice. Analytics remains off.';
      return;
    }
    if (value === 'accepted' && !active) choice = 'unknown';
    syncConsent(); dismiss();
  }
  function createUI() {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'ng-analytics-settings'; button.textContent = 'Analytics settings';
    button.setAttribute('aria-haspopup', 'dialog'); button.addEventListener('click', settings);
    dialog = document.createElement('dialog'); dialog.className = 'ng-analytics-dialog';
    dialog.setAttribute('aria-labelledby', 'ng-analytics-title'); dialog.setAttribute('aria-describedby', 'ng-analytics-description');
    dialog.innerHTML = '<div class="ng-analytics-panel"><button type="button" class="ng-analytics-close" aria-label="Close analytics settings">×</button><p class="ng-analytics-label">NIHONGO GROVE</p><h2 id="ng-analytics-title">A little insight. Your choice.</h2><p id="ng-analytics-description">Optional Google Analytics helps us see which apps people use and whether practice sessions finish. Google receives basic device and visit information. We never send answers, scores, or your learning history. You can play with analytics off.</p><p class="ng-analytics-status" role="status" aria-live="polite"></p><div class="ng-analytics-actions"><button type="button" data-choice="denied">Decline analytics</button><button type="button" data-choice="accepted">Allow analytics</button></div><a class="ng-analytics-privacy" href="/privacy.html">Privacy and cookies</a></div>';
    status = dialog.querySelector('.ng-analytics-status'); allow = dialog.querySelector('[data-choice="accepted"]'); decline = dialog.querySelector('[data-choice="denied"]'); close = dialog.querySelector('.ng-analytics-close');
    allow.addEventListener('click', () => choose('accepted')); decline.addEventListener('click', () => choose('denied'));
    close.addEventListener('click', () => choice === 'unknown' ? choose('denied') : dismiss());
    dialog.addEventListener('cancel', event => { event.preventDefault(); choice === 'unknown' ? choose('denied') : dismiss(); });
    document.body.append(button, dialog);
    document.querySelectorAll('[data-analytics-settings]').forEach(el => el.addEventListener('click', settings));
    updateUI();
    if (choice === 'unknown' && !signalDenied()) settings();
  }

  window.NihongoAnalytics = Object.freeze({ track, pageView, settings });
  window.addEventListener('focus', syncConsent);
  window.addEventListener('pagehide', syncConsent);
  document.addEventListener('visibilitychange', syncConsent);
  // The consent cookie is shared by sibling hosts; storage events cannot cross those origins.
  window.setInterval(syncConsent, 1000);
  try { syncConsent(); if (choice !== 'accepted') stop(); }
  catch (_) { choice = 'denied'; stop(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', createUI, { once: true });
  else createUI();
  if (app === 'hub') document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    try {
      const target = new URL(anchor.href);
      if (target.protocol === 'https:' && ['kana.nihongogrove.top', 'kana-rain.nihongogrove.top'].includes(target.hostname)) track('app_open', { target_app: APPS[target.hostname] });
    } catch (_) { /* Ignore malformed links. */ }
  });
}());
