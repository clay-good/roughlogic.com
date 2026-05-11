// Theme toggle: dark / light / high-contrast (v3 utility 183).
// Loaded synchronously in <head> so the initial paint matches the chosen
// theme and there is no flash. Preference persists in one localStorage
// key: rl-theme (one of "dark", "light", "high-contrast").
//
// Big Buttons mode (v3 utility 182) was removed in v11 (see
// specs/spec-v11.md). The browser's own zoom and the High-Contrast
// theme cover the field-use cases the mode was added for.

(function () {
  var THEME_KEY = 'rl-theme';
  var THEMES = ['dark', 'light', 'high-contrast'];
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
      var color = theme === 'light' ? '#ffffff' : (theme === 'high-contrast' ? '#000000' : '#0a0a0a');
      meta.setAttribute('content', color);
    }
    var scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) {
      // High-contrast uses the dark color-scheme baseline so chrome stays usable.
      scheme.setAttribute('content', theme === 'light' ? 'light' : 'dark');
    }
  }

  // Initial paint.
  var storedTheme = readStored(THEME_KEY);
  applyTheme(storedTheme || systemTheme());

  function nextTheme(t) {
    var i = THEMES.indexOf(t);
    return THEMES[(i + 1) % THEMES.length];
  }

  function labelFor(t) {
    return t === 'dark' ? 'light' : (t === 'light' ? 'high-contrast' : 'dark');
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
