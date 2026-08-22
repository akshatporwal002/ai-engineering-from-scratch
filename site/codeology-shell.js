/** Apply the Codeology product shell without rewriting imported page templates. */
(function () {
  'use strict';

  var VERSION = '20260822d';
  var AUTH_VERSION = '20260822d';
  var CONFIG_URL = 'codeology-config.json?v=' + VERSION;
  var STYLE_URL = 'codeology.css?v=' + VERSION;

  function appendText(parent, text) {
    parent.appendChild(document.createTextNode(text));
  }

  function ensureStyles() {
    if (document.querySelector('link[data-codeology-style]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = STYLE_URL;
    link.setAttribute('data-codeology-style', VERSION);
    document.head.appendChild(link);
  }

  function replaceWordmark(config) {
    var logos = document.querySelectorAll('.site-header .logo');
    for (var i = 0; i < logos.length; i++) {
      var logo = logos[i];
      var icon = logo.querySelector('.logo-icon');
      while (logo.lastChild && logo.lastChild !== icon) logo.removeChild(logo.lastChild);
      var wordmark = document.createElement('span');
      wordmark.className = 'codeology-wordmark';
      wordmark.textContent = config.product.shortName;
      logo.appendChild(wordmark);
      logo.setAttribute('aria-label', config.product.name + ' home');
    }
  }

  function navigationLink(item, currentPage) {
    var link = document.createElement('a');
    link.href = item.href;
    link.textContent = item.label;
    if (item.href.split('#')[0] === currentPage) link.setAttribute('aria-current', 'page');
    return link;
  }

  function replaceNavigation(config) {
    var navigation = config.product.navigation;
    if (!Array.isArray(navigation)) return;
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    var navs = document.querySelectorAll('.site-header .header-nav');
    for (var i = 0; i < navs.length; i++) {
      var nav = navs[i];
      var header = nav.closest('.site-header');
      var mobileTools = nav.querySelector('.header-mobile-tools');
      var actions = header && header.querySelector('.header-actions');
      if (mobileTools) mobileTools.remove();
      while (nav.firstChild) nav.removeChild(nav.firstChild);
      for (var j = 0; j < navigation.length; j++) {
        nav.appendChild(navigationLink(navigation[j], currentPage));
      }
      if (mobileTools) nav.appendChild(mobileTools);
      if (!actions) continue;
      if (actions.querySelector('[data-codeology-auth-trigger]')) continue;
      var login = document.createElement('button');
      login.type = 'button';
      login.className = 'codeology-login-button';
      login.textContent = 'Log in';
      login.setAttribute('aria-label', 'Log in to Codeology');
      login.setAttribute('data-codeology-auth-trigger', '');
      actions.appendChild(login);
    }
  }

  function sourceLink(label, href) {
    var link = document.createElement('a');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = label;
    return link;
  }

  function currentLessonPath() {
    var path = new URLSearchParams(window.location.search).get('path') || '';
    if (!/^(phases|certifications)\/[A-Za-z0-9._/-]+$/.test(path)) return null;
    var segments = path.split('/');
    if (segments.some(function (segment) { return !segment || segment === '.' || segment === '..'; })) return null;
    return path;
  }

  function pinnedSourceUrl(source, path) {
    if (!/^[0-9a-f]{40}$/.test(source.baselineCommit)) return null;
    var encodedPath = path.split('/').map(encodeURIComponent).join('/');
    return source.url.replace(/\/+$/, '') + '/tree/' + source.baselineCommit + '/' + encodedPath;
  }

  function addLessonSourceBadge(config) {
    if (!/lesson\.html$/.test(window.location.pathname)) return;
    var container = document.getElementById('lessonContent');
    var path = currentLessonPath();
    if (!container || !path || container.querySelector('.codeology-content-source')) return;
    var source = config.academySource;
    var pinnedUrl = pinnedSourceUrl(source, path);
    if (!pinnedUrl) return;

    var badge = document.createElement('aside');
    badge.className = 'codeology-content-source';
    badge.setAttribute('aria-label', 'Imported lesson source');

    var summary = document.createElement('span');
    summary.className = 'codeology-content-source__summary';

    var kind = document.createElement('strong');
    kind.className = 'codeology-content-source__kind';
    kind.textContent = 'Imported lesson';
    summary.appendChild(kind);
    appendText(summary, ' from ');
    summary.appendChild(sourceLink(source.name, source.url));
    appendText(summary, ' by ' + source.author + ' · ' + source.license);
    badge.appendChild(summary);

    var pinned = sourceLink('View pinned source', pinnedUrl);
    pinned.className = 'codeology-content-source__pinned';
    badge.appendChild(pinned);
    container.insertBefore(badge, container.firstChild);
  }

  function replaceFooter(config) {
    var footers = document.querySelectorAll('.site-footer');
    for (var i = 0; i < footers.length; i++) {
      var footer = footers[i];
      var description = footer.querySelector('.footer-inner > p');
      if (description) description.textContent = config.product.name + ' · ' + config.product.tagline;

      var links = footer.querySelectorAll('a[href]');
      for (var j = 0; j < links.length; j++) {
        var link = links[j];
        var href = link.getAttribute('href') || '';
        if (href === config.academySource.url) {
          link.href = config.product.repositoryUrl;
        } else if (href.indexOf(config.academySource.url + '/issues/') === 0) {
          link.href = config.product.repositoryUrl + href.slice(config.academySource.url.length);
        }
      }
      var footerLinks = footer.querySelector('.footer-links');
      if (footerLinks && !footerLinks.querySelector('a[href="credits.html"]')) {
        var credits = document.createElement('a');
        credits.href = 'credits.html';
        credits.textContent = 'Credits';
        footerLinks.appendChild(credits);
      }
    }
  }

  function apply(config) {
    if (!config || config.schemaVersion !== 1 || !config.product || !config.academySource) return;
    window.CODEOLOGY_CONFIG = Object.freeze(config);
    document.documentElement.setAttribute('data-product', 'codeology');
    replaceWordmark(config);
    replaceNavigation(config);
    replaceFooter(config);
    addLessonSourceBadge(config);
    ensureAuth();
    document.dispatchEvent(new CustomEvent('codeology:ready', { detail: config }));
  }

  function loadScript(src, marker) {
    return new Promise(function (resolve) {
      var existing = document.querySelector('script[' + marker + ']');
      if (existing) {
        if (existing.getAttribute('data-loaded') === 'true') resolve();
        else {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', resolve, { once: true });
        }
        return;
      }
      var script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.setAttribute(marker, AUTH_VERSION);
      script.addEventListener('load', function () {
        script.setAttribute('data-loaded', 'true');
        resolve();
      }, { once: true });
      script.addEventListener('error', resolve, { once: true });
      document.head.appendChild(script);
    });
  }

  function ensureAuth() {
    if (window.CodeologyAuth || document.querySelector('script[data-codeology-auth]')) return;
    loadScript('codeology-auth-config.js?v=' + AUTH_VERSION, 'data-codeology-auth-config')
      .then(function () {
        var config = window.CODEOLOGY_AUTH_CONFIG;
        if (!config || !config.enabled) return null;
        return loadScript('vendor/supabase.js?v=' + AUTH_VERSION, 'data-codeology-supabase');
      })
      .then(function () {
        return loadScript('auth.js?v=' + AUTH_VERSION, 'data-codeology-auth');
      });
  }

  function loadConfig() {
    return fetch(CONFIG_URL, { headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) throw new Error('Codeology config ' + response.status);
        return response.json();
      })
      .then(apply)
      .catch(function () {
        // Preserve the imported shell when configuration cannot be loaded.
      });
  }

  ensureStyles();
  document.addEventListener('codeology:lesson-rendered', function () {
    if (window.CODEOLOGY_CONFIG) addLessonSourceBadge(window.CODEOLOGY_CONFIG);
  });
  loadConfig();
}());
