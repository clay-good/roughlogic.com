// Theme toggle: light/dark.
// Loaded synchronously in <head> so the initial paint matches the chosen
// theme and there is no flash. The toggle preference persists in
// localStorage; if no preference is stored we follow the OS via the
// prefers-color-scheme media query.

(function () {
  var STORAGE_KEY = 'rl-theme';
  var doc = document.documentElement;

  function readStored() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function writeStored(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) { /* no-op */ }
  }

  function systemTheme() {
    return window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light' : 'dark';
  }

  function apply(theme) {
    doc.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'light' ? '#ffffff' : '#0a0a0a');
    var scheme = document.querySelector('meta[name="color-scheme"]');
    if (scheme) scheme.setAttribute('content', theme);
  }

  var initial = readStored() || systemTheme();
  apply(initial);

  function wireToggle() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;

    function syncButton() {
      var current = doc.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      btn.setAttribute('aria-label', 'Switch to ' + next + ' mode');
      btn.setAttribute('title', 'Switch to ' + next + ' mode');
      btn.setAttribute('aria-pressed', current === 'light' ? 'true' : 'false');
      btn.dataset.theme = current;
    }
    syncButton();

    btn.addEventListener('click', function () {
      var current = doc.getAttribute('data-theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      apply(next);
      writeStored(next);
      syncButton();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireToggle);
  } else {
    wireToggle();
  }

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var listener = function () {
      if (readStored()) return;
      apply(systemTheme());
      var btn = document.getElementById('theme-toggle');
      if (btn) {
        var current = doc.getAttribute('data-theme') || 'dark';
        var next = current === 'dark' ? 'light' : 'dark';
        btn.setAttribute('aria-label', 'Switch to ' + next + ' mode');
        btn.setAttribute('title', 'Switch to ' + next + ' mode');
        btn.setAttribute('aria-pressed', current === 'light' ? 'true' : 'false');
        btn.dataset.theme = current;
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', listener);
    else if (mq.addListener) mq.addListener(listener);
  }
})();
