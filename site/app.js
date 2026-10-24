// Language toggle, theme toggle and chart tooltips. The page is fully readable without this file.
(function () {
  var d = document.documentElement;
  var store = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };

  function setLang(l) {
    d.dataset.lang = l;
    d.lang = l;
    store('bl-lang', l);
    document.querySelectorAll('[data-set-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setLang === l)); });
    var t = d.dataset['title' + (l === 'es' ? 'Es' : 'En')];
    if (t) document.title = t;
  }
  document.querySelectorAll('[data-set-lang]').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.setLang); }); });
  setLang(d.dataset.lang || 'en');

  var themeBtn = document.querySelector('[data-theme-toggle]');
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var dark = d.dataset.theme ? d.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    d.dataset.theme = dark ? 'light' : 'dark';
    store('bl-theme', d.dataset.theme);
  });

  var tip = document.querySelector('.tip');
  if (!tip) return;
  function show(el, x, y) {
    tip.textContent = el.getAttribute('data-tip-' + d.dataset.lang) || el.getAttribute('data-tip-en') || '';
    tip.hidden = false;
    var r = tip.getBoundingClientRect();
    tip.style.left = Math.max(4, Math.min(x + 12, innerWidth - r.width - 4)) + 'px';
    tip.style.top = Math.max(4, y - r.height - 12) + 'px';
  }
  var hide = function () { tip.hidden = true; };
  document.addEventListener('pointermove', function (e) { var h = e.target.closest && e.target.closest('.hit'); if (h) show(h, e.clientX, e.clientY); else hide(); });
  document.addEventListener('focusin', function (e) { var h = e.target.closest && e.target.closest('.hit'); if (h) { var r = h.getBoundingClientRect(); show(h, r.left + r.width / 2, r.top); } });
  document.addEventListener('focusout', hide);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
})();
