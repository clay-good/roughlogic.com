// Theme toggle: dark / light.
// Loaded synchronously in <head> so the initial paint matches the chosen
// theme and there is no flash. Preference persists in one localStorage
// key: rl-theme (one of "dark", "light").

(function () {
  var THEME_KEY = 'rl-theme';
  var THEMES = ['dark', 'light'];
  var doc = document.documentElement;

  function readStored(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStored(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* no-op */ }
  }

  function systemTheme() {
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    if (THEMES.indexOf(theme) === -1) theme = 'dark';
    doc.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', theme === 'light' ? '#ffffff' : '#0a0a0a');
    }
    var scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) {
      scheme.setAttribute('content', theme === 'light' ? 'light' : 'dark');
    }
  }

  // Migrate legacy "high-contrast" preference to "dark".
  var storedTheme = readStored(THEME_KEY);
  if (storedTheme === 'high-contrast') {
    storedTheme = 'dark';
    writeStored(THEME_KEY, storedTheme);
  }
  applyTheme(storedTheme || systemTheme());

  function nextTheme(t) {
    var i = THEMES.indexOf(t);
    return THEMES[(i + 1) % THEMES.length];
  }

  function labelFor(t) {
    return t === 'dark' ? 'light' : 'dark';
  }

  function syncThemeButton(btn) {
    var current = doc.getAttribute('data-theme') || 'dark';
    var next = labelFor(current);
    btn.setAttribute('aria-label', 'Switch to ' + next + ' mode');
    btn.setAttribute('title', 'Switch to ' + next + ' mode');
    btn.setAttribute('aria-pressed', current === 'light' ? 'true' : 'false');
    btn.dataset.theme = current;
  }

  function wireToggles() {
    var themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      syncThemeButton(themeBtn);
      themeBtn.addEventListener('click', function () {
        var current = doc.getAttribute('data-theme') || 'dark';
        var next = nextTheme(current);
        applyTheme(next);
        writeStored(THEME_KEY, next);
        syncThemeButton(themeBtn);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireToggles);
  } else {
    wireToggles();
  }

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var listener = function () {
      if (readStored(THEME_KEY)) return;
      applyTheme(systemTheme());
      var btn = document.getElementById('theme-toggle');
      if (btn) syncThemeButton(btn);
    };
    if (mq.addEventListener) mq.addEventListener('change', listener);
    else if (mq.addListener) mq.addListener(listener);
  }
})();
