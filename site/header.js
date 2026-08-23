/**
 * Shared header behaviors: responsive navigation, current-page state, and the
 * live GitHub star counter.
 */
(function () {
  'use strict';

  var REPO = 'rohitg00/ai-engineering-from-scratch';
  var CACHE_KEY = 'gh:stars:' + REPO;
  var CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
  var COMPACT_HEADER_QUERY = '(max-width: 1100px)';
  var CODEOLOGY_SHELL_VERSION = '20260822d';
  var navId = 0;

  function ensureCodeologyShell() {
    if (window.CODEOLOGY_CONFIG || document.querySelector('script[data-codeology-shell]')) return;
    var script = document.createElement('script');
    script.src = 'codeology-shell.js?v=' + CODEOLOGY_SHELL_VERSION;
    script.async = true;
    script.setAttribute('data-codeology-shell', CODEOLOGY_SHELL_VERSION);
    document.head.appendChild(script);
  }

  function format(n) {
    if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(n);
  }

  function paint(n) {
    var els = document.querySelectorAll(
      '.header-github .star-count, #starCount, [data-gh-stars="' + REPO + '"]'
    );
    for (var i = 0; i < els.length; i++) {
      els[i].textContent = format(n);
      els[i].removeAttribute('data-loading');
    }
  }

  function readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (Date.now() - parsed.t > CACHE_TTL_MS) return null;
      return parsed.n;
    } catch (e) {
      return null;
    }
  }

  function writeCache(n) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ n: n, t: Date.now() }));
    } catch (e) {
      // localStorage may be disabled
    }
  }

  function loadStars() {
    var cached = readCache();
    if (cached != null) {
      paint(cached);
      return;
    }
    fetch('https://api.github.com/repos/' + REPO, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then(function (r) {
        if (!r.ok) throw new Error('gh ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var n = data.stargazers_count;
        if (typeof n !== 'number') return;
        writeCache(n);
        paint(n);
      })
      .catch(function () {
        // Leave the placeholder; the link still works.
      });
  }

  function pageFile(url) {
    try {
      var parsed = new URL(url, location.href);
      if (parsed.origin !== location.origin) return '';
      var file = parsed.pathname.split('/').pop() || 'index.html';
      if (file.indexOf('.') === -1) file += '.html';
      return file.toLowerCase();
    } catch (_) {
      return '';
    }
  }

  function syncCurrentPage(header) {
    var nav = header.querySelector('.header-nav');
    var logo = header.querySelector('.logo');
    if (!nav) return;

    var links = nav.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) links[i].removeAttribute('aria-current');
    if (logo) logo.removeAttribute('aria-current');

    var current = pageFile(location.href);
    if (current === 'index.html') {
      if (logo) logo.setAttribute('aria-current', 'page');
      return;
    }

    var target = current;
    if (current === 'certification.html' || current === 'assessment.html') {
      target = 'certifications.html';
    } else if (current === 'lesson.html') {
      try {
        var params = new URLSearchParams(location.search);
        var lessonPath = params.get('path') || '';
        if (params.has('track') || params.has('fromTrack') || lessonPath.indexOf('certifications/') === 0) {
          target = 'certifications.html';
        }
      } catch (_) {}
    }

    for (var j = 0; j < links.length; j++) {
      if (pageFile(links[j].href) === target) {
        links[j].setAttribute('aria-current', 'page');
        break;
      }
    }
  }

  function addMobileCertificationsLink(nav) {
    var links = nav.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
      if (pageFile(links[i].href) === 'certifications.html') return;
    }

    var link = document.createElement('a');
    link.href = 'certifications.html';
    link.className = 'header-mobile-only';
    link.textContent = 'Certifications';
    var github = nav.querySelector('.header-github');
    nav.insertBefore(link, github || null);
  }

  function setupNavigation(header) {
    var inner = header.querySelector('.header-inner');
    var nav = header.querySelector('.header-nav');
    var logo = header.querySelector('.logo');
    if (!inner || !nav || !logo || inner.querySelector('.header-menu-toggle')) return;

    addMobileCertificationsLink(nav);
    syncCurrentPage(header);

    navId += 1;
    if (!nav.id) nav.id = 'siteNavigation' + navId;
    if (!nav.getAttribute('aria-label')) nav.setAttribute('aria-label', 'Primary');

    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'header-menu-toggle';
    toggle.setAttribute('aria-controls', nav.id);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
    toggle.innerHTML = '<span class="header-menu-icon" aria-hidden="true">'
      + '<span></span><span></span><span></span></span>';
    inner.insertBefore(toggle, nav);

    var actions = document.createElement('div');
    actions.className = 'header-actions';
    actions.setAttribute('role', 'group');
    actions.setAttribute('aria-label', 'Site actions');
    var directChildren = Array.prototype.slice.call(inner.children);
    var firstTool = directChildren.find(function (child) {
      return child !== logo && child !== nav && child !== toggle;
    });
    inner.insertBefore(actions, firstTool || null);
    directChildren.forEach(function (child) {
      if (child !== logo && child !== nav && child !== toggle && child !== actions) actions.appendChild(child);
    });

    var tools = document.createElement('div');
    tools.className = 'header-mobile-tools';
    tools.setAttribute('role', 'group');
    tools.setAttribute('aria-label', 'Site tools');
    nav.appendChild(tools);

    var toolAnchor = document.createComment('header-tools');
    inner.insertBefore(toolAnchor, actions);

    var compact = window.matchMedia ? window.matchMedia(COMPACT_HEADER_QUERY) : null;
    var open = false;

    function moveToolsIntoMenu() {
      var children = Array.prototype.slice.call(inner.children);
      children.forEach(function (child) {
        if (child !== logo && child !== nav && child !== toggle) tools.appendChild(child);
      });
    }

    function restoreDesktopTools() {
      while (tools.firstChild) inner.insertBefore(tools.firstChild, toolAnchor);
    }

    function setOpen(next, restoreFocus) {
      open = !!next;
      header.classList.toggle('header-nav-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      if (compact && compact.matches) nav.hidden = !open;
      else nav.hidden = false;
      if (restoreFocus && !open) toggle.focus();
    }

    function syncLayout() {
      var isCompact = compact ? compact.matches : false;
      if (isCompact) {
        moveToolsIntoMenu();
        setOpen(false, false);
      } else {
        setOpen(false, false);
        restoreDesktopTools();
        nav.hidden = false;
      }
    }

    toggle.addEventListener('click', function () { setOpen(!open, false); });
    toggle.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      setOpen(true, false);
      var firstLink = nav.querySelector('a:not([hidden])');
      if (firstLink) firstLink.focus();
    });
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false, false);
    });
    document.addEventListener('click', function (event) {
      if (open && !header.contains(event.target)) setOpen(false, false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && open && !event.defaultPrevented) {
        event.preventDefault();
        setOpen(false, true);
      }
    });

    if (compact) {
      if (typeof compact.addEventListener === 'function') compact.addEventListener('change', syncLayout);
      else if (typeof compact.addListener === 'function') compact.addListener(syncLayout);
    }
    syncLayout();
  }

  function setupSkipLinks() {
    var links = document.querySelectorAll('.skip-link[href^="#"]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (event) {
        var id = this.getAttribute('href').slice(1);
        var target = document.getElementById(id);
        if (!target) return;
        event.preventDefault();
        target.setAttribute('tabindex', '-1');
        history.pushState(null, '', '#' + id);
        target.focus();
        target.scrollIntoView();
      });
    }
  }

  function load() {
    ensureCodeologyShell();
    setupSkipLinks();
    var headers = document.querySelectorAll('.site-header');
    for (var i = 0; i < headers.length; i++) setupNavigation(headers[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
