/** Codeology account UI and local-first lesson progress synchronization. */
(function () {
  'use strict';

  var config = window.CODEOLOGY_AUTH_CONFIG || { enabled: false };
  var sdk = window.CodeologySupabase;
  var client = null;
  var currentUser = null;
  var activeSessionUserId = '';
  var dialog = null;
  var accountMenu = null;
  var accountMenuTrigger = null;
  var syncTimer = null;
  var syncing = false;
  var OWNER_KEY = 'codeology:progress-owner:v1';

  function authButtons() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-codeology-auth-trigger]'));
  }

  function displayName(user) {
    if (!user) return 'Log in';
    var metadata = user.user_metadata || {};
    return metadata.user_name || metadata.preferred_username || metadata.full_name || metadata.name || user.email || 'Account';
  }

  function initials(user) {
    var name = displayName(user).trim();
    var parts = name.split(/\s+/).filter(Boolean);
    if (!parts.length) return 'ME';
    return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  }

  function paintAccount() {
    var buttons = authButtons();
    for (var i = 0; i < buttons.length; i++) {
      var button = buttons[i];
      if (currentUser) {
        button.textContent = '';
        var avatar = document.createElement('span');
        avatar.className = 'codeology-account-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        avatar.textContent = initials(currentUser);
        var label = document.createElement('span');
        label.textContent = 'Account';
        button.appendChild(avatar);
        button.appendChild(label);
        button.setAttribute('aria-label', 'Open Codeology account for ' + displayName(currentUser));
        button.setAttribute('aria-haspopup', 'menu');
        button.setAttribute('aria-controls', 'codeologyAccountMenu');
        button.setAttribute('aria-expanded', accountMenu && !accountMenu.hidden && button === accountMenuTrigger ? 'true' : 'false');
      } else {
        button.textContent = 'Log in';
        button.setAttribute('aria-label', 'Log in to Codeology');
        button.removeAttribute('aria-haspopup');
        button.removeAttribute('aria-controls');
        button.removeAttribute('aria-expanded');
      }
    }
  }

  function setStatus(message, kind) {
    if (!dialog) return;
    var status = dialog.querySelector('[data-auth-status]');
    status.textContent = message || '';
    status.setAttribute('data-kind', kind || 'neutral');
  }

  function renderDialog() {
    if (!dialog) return;
    var signedOut = dialog.querySelector('[data-auth-signed-out]');
    var signedIn = dialog.querySelector('[data-auth-signed-in]');
    signedOut.hidden = !!currentUser;
    signedIn.hidden = !currentUser;
    if (currentUser) {
      dialog.querySelector('[data-auth-name]').textContent = displayName(currentUser);
      dialog.querySelector('[data-auth-email]').textContent = currentUser.email || 'Signed in';
      setStatus('Your lesson progress syncs securely across devices.', 'success');
    } else if (!config.enabled) {
      setStatus('Account sign-in is being configured. You can keep learning and your progress will remain in this browser.', 'neutral');
    } else {
      setStatus('Your existing browser progress will be merged into your account when you sign in.', 'neutral');
    }
  }

  function closeDialog() {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function openDialog() {
    closeAccountMenu(false);
    renderDialog();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function accountMenuItems() {
    if (!accountMenu) return [];
    return Array.prototype.slice.call(accountMenu.querySelectorAll('[role="menuitem"]:not([disabled])'));
  }

  function positionAccountMenu() {
    if (!accountMenu || !accountMenuTrigger || accountMenu.hidden) return;
    var rect = accountMenuTrigger.getBoundingClientRect();
    var width = Math.min(320, window.innerWidth - 24);
    var left = Math.max(12, Math.min(window.innerWidth - width - 12, rect.right - width));
    accountMenu.style.width = width + 'px';
    accountMenu.style.left = left + 'px';
    accountMenu.style.top = Math.min(window.innerHeight - 16, rect.bottom + 8) + 'px';
  }

  function closeAccountMenu(restoreFocus) {
    if (!accountMenu || accountMenu.hidden) return;
    accountMenu.hidden = true;
    if (accountMenuTrigger) {
      accountMenuTrigger.setAttribute('aria-expanded', 'false');
      if (restoreFocus) accountMenuTrigger.focus({ preventScroll: true });
    }
    accountMenuTrigger = null;
  }

  function openAccountMenu(trigger, focusFirst) {
    if (!currentUser || !accountMenu) return;
    accountMenuTrigger = trigger;
    accountMenu.querySelector('[data-account-name]').textContent = displayName(currentUser);
    accountMenu.querySelector('[data-account-email]').textContent = currentUser.email || 'Signed in';
    accountMenu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    positionAccountMenu();
    if (focusFirst) {
      var items = accountMenuItems();
      if (items[0]) items[0].focus({ preventScroll: true });
    }
  }

  function toggleAccountMenu(trigger) {
    if (!accountMenu.hidden && accountMenuTrigger === trigger) closeAccountMenu(true);
    else openAccountMenu(trigger, false);
  }

  function buildAccountMenu() {
    if (accountMenu) return;
    accountMenu = document.createElement('div');
    accountMenu.id = 'codeologyAccountMenu';
    accountMenu.className = 'codeology-account-menu';
    accountMenu.setAttribute('role', 'menu');
    accountMenu.setAttribute('aria-label', 'Codeology account');
    accountMenu.hidden = true;
    accountMenu.innerHTML = ''
      + '<div class="codeology-account-menu__profile">'
      + '<span class="codeology-auth-eyebrow">SIGNED IN</span>'
      + '<strong data-account-name></strong><span data-account-email></span>'
      + '</div>'
      + '<div class="codeology-account-menu__group">'
      + '<a href="cv-analysis.html" role="menuitem">CV analysis <span aria-hidden="true">→</span></a>'
      + '<a href="cv-analysis.html#ai-provider-settings" role="menuitem">AI provider &amp; CV settings <span aria-hidden="true">→</span></a>'
      + '</div>'
      + '<div class="codeology-account-menu__group">'
      + '<button type="button" role="menuitem" data-account-signout>Log out</button>'
      + '</div>';
    document.body.appendChild(accountMenu);
    accountMenu.querySelector('[data-account-signout]').addEventListener('click', function () {
      closeAccountMenu(false);
      signOut();
    });
    accountMenu.addEventListener('keydown', function (event) {
      var items = accountMenuItems();
      var index = items.indexOf(document.activeElement);
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAccountMenu(true);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        items[(index + 1 + items.length) % items.length].focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        items[(index - 1 + items.length) % items.length].focus();
      } else if (event.key === 'Home' && items.length) {
        event.preventDefault(); items[0].focus();
      } else if (event.key === 'End' && items.length) {
        event.preventDefault(); items[items.length - 1].focus();
      } else if (event.key === 'Tab') closeAccountMenu(false);
    });
    document.addEventListener('pointerdown', function (event) {
      if (!accountMenu.hidden && !accountMenu.contains(event.target) && event.target !== accountMenuTrigger && !event.target.closest('[data-codeology-auth-trigger]')) closeAccountMenu(false);
    });
    window.addEventListener('resize', positionAccountMenu);
    window.addEventListener('scroll', positionAccountMenu, true);
  }

  function buildDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'codeology-auth-dialog';
    dialog.setAttribute('aria-labelledby', 'codeologyAuthTitle');
    dialog.innerHTML = ''
      + '<div class="codeology-auth-panel">'
      + '<button class="codeology-auth-close" type="button" aria-label="Close login">&times;</button>'
      + '<span class="codeology-auth-eyebrow">CODEOLOGY ACCOUNT</span>'
      + '<div data-auth-signed-out>'
      + '<h2 id="codeologyAuthTitle">Keep your progress.</h2>'
      + '<p>Log in to carry completed lessons and quiz progress across devices.</p>'
      + '<div class="codeology-auth-providers">'
      + '<button type="button" data-auth-provider="github">Continue with GitHub</button>'
      + '<button type="button" data-auth-provider="google">Continue with Google</button>'
      + '</div></div>'
      + '<div data-auth-signed-in hidden>'
      + '<h2>Your account</h2><strong data-auth-name></strong><p data-auth-email></p>'
      + '<a class="codeology-auth-settings" href="cv-analysis.html#ai-provider-settings">AI provider &amp; CV settings</a>'
      + '<button class="codeology-auth-signout" type="button" data-auth-signout>Log out</button>'
      + '</div>'
      + '<p class="codeology-auth-status" data-auth-status role="status"></p>'
      + '<p class="codeology-auth-privacy">Your account stores learning progress and any account features you choose to use, including saved CV analyses. Course content remains freely available without logging in.</p>'
      + '</div>';
    document.body.appendChild(dialog);

    dialog.querySelector('.codeology-auth-close').addEventListener('click', closeDialog);
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener('cancel', function () { closeDialog(); });
    dialog.querySelector('[data-auth-signout]').addEventListener('click', signOut);
    var providers = dialog.querySelectorAll('[data-auth-provider]');
    for (var i = 0; i < providers.length; i++) {
      providers[i].disabled = !config.enabled;
      providers[i].addEventListener('click', function (event) {
        signIn(event.currentTarget.getAttribute('data-auth-provider'));
      });
    }
  }

  function bindTriggers() {
    var buttons = authButtons();
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].getAttribute('data-auth-bound') === 'true') continue;
      buttons[i].setAttribute('data-auth-bound', 'true');
      buttons[i].addEventListener('click', function (event) {
        if (currentUser) toggleAccountMenu(event.currentTarget);
        else openDialog();
      });
      buttons[i].addEventListener('keydown', function (event) {
        if (!currentUser || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
        event.preventDefault();
        openAccountMenu(event.currentTarget, true);
      });
    }
    paintAccount();
  }

  function safeReturnPath() {
    return location.pathname + location.search + location.hash;
  }

  async function signIn(provider) {
    if (!client) return;
    setStatus('Opening ' + (provider === 'github' ? 'GitHub' : 'Google') + '…', 'neutral');
    try { sessionStorage.setItem('codeology:auth-return', safeReturnPath()); } catch (_) {}
    var callback = new URL('index.html', location.href).href;
    var result = await client.auth.signInWithOAuth({ provider: provider, options: { redirectTo: callback } });
    if (result.error) setStatus(result.error.message, 'error');
  }

  async function signOut() {
    if (!client) return;
    var result = await client.auth.signOut();
    if (result.error) {
      setStatus(result.error.message, 'error');
      return;
    }
    setSession(null);
  }

  function epoch(value) {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    var parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function mergeAnswers(local, remote) {
    var merged = Object.assign({}, remote || {});
    var source = local || {};
    Object.keys(source).forEach(function (key) {
      if (!merged[key] || epoch(source[key].t) >= epoch(merged[key].t)) merged[key] = source[key];
    });
    return merged;
  }

  function mergeLesson(local, remote) {
    local = local || {};
    remote = remote || {};
    var localCompletionChanged = epoch(local.completionUpdatedAt || local.completedAt);
    var remoteCompletionChanged = epoch(remote.completionUpdatedAt || remote.completedAt);
    var localWins = localCompletionChanged >= remoteCompletionChanged;
    return {
      answers: mergeAnswers(local.answers, remote.answers),
      completedAt: localWins ? (local.completedAt || null) : (remote.completedAt || null),
      completionUpdatedAt: Math.max(localCompletionChanged, remoteCompletionChanged),
      visitedAt: Math.max(epoch(local.visitedAt), epoch(remote.visitedAt)),
    };
  }

  function rowToLesson(row) {
    return {
      answers: row.answers || {},
      completedAt: epoch(row.completed_at) || null,
      completionUpdatedAt: epoch(row.completion_updated_at),
      visitedAt: epoch(row.visited_at),
    };
  }

  function lessonToRow(userId, path, lesson) {
    return {
      user_id: userId,
      lesson_path: path,
      answers: lesson.answers || {},
      completed_at: lesson.completedAt ? new Date(lesson.completedAt).toISOString() : null,
      completion_updated_at: lesson.completionUpdatedAt ? new Date(lesson.completionUpdatedAt).toISOString() : null,
      visited_at: lesson.visitedAt ? new Date(lesson.visitedAt).toISOString() : null,
    };
  }

  async function pushProgress(state) {
    if (!client || !currentUser || !state || !state.lessons) return;
    var paths = Object.keys(state.lessons);
    if (!paths.length) return;
    var rows = paths.map(function (path) { return lessonToRow(currentUser.id, path, state.lessons[path]); });
    var result = await client.from('lesson_progress').upsert(rows, { onConflict: 'user_id,lesson_path' });
    if (result.error) throw result.error;
  }

  async function reconcileProgress() {
    if (!client || !currentUser || !window.AIFSProgress) return;
    syncing = true;
    try {
      var owner = '';
      try { owner = localStorage.getItem(OWNER_KEY) || ''; } catch (_) {}
      if (owner && owner !== currentUser.id) window.AIFSProgress.reset();

      var localState = window.AIFSProgress.exportState();
      var result = await client.from('lesson_progress').select('lesson_path,answers,completed_at,completion_updated_at,visited_at');
      if (result.error) throw result.error;
      var merged = { lessons: {}, updatedAt: Date.now() };
      Object.keys(localState.lessons || {}).forEach(function (path) {
        merged.lessons[path] = mergeLesson(localState.lessons[path], null);
      });
      (result.data || []).forEach(function (row) {
        merged.lessons[row.lesson_path] = mergeLesson(merged.lessons[row.lesson_path], rowToLesson(row));
      });
      window.AIFSProgress.replaceState(merged);
      await pushProgress(merged);
      try { localStorage.setItem(OWNER_KEY, currentUser.id); } catch (_) {}
      document.dispatchEvent(new CustomEvent('codeology:progress-synced'));
    } catch (error) {
      setStatus('Progress is saved in this browser, but cloud sync is temporarily unavailable.', 'error');
      console.warn('Codeology progress sync failed:', error && error.message ? error.message : error);
    } finally {
      syncing = false;
    }
  }

  function scheduleProgressSync(state) {
    if (syncing || !currentUser) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () {
      pushProgress(state).catch(function (error) {
        console.warn('Codeology progress upload failed:', error && error.message ? error.message : error);
      });
    }, 500);
  }

  function restoreReturnPath() {
    var target = '';
    try {
      target = sessionStorage.getItem('codeology:auth-return') || '';
      sessionStorage.removeItem('codeology:auth-return');
    } catch (_) {}
    if (!target || target === safeReturnPath() || !target.startsWith('/')) return;
    location.replace(target);
  }

  function setSession(session) {
    var previousUserId = activeSessionUserId;
    currentUser = session && session.user ? session.user : null;
    activeSessionUserId = currentUser ? currentUser.id : '';
    if (!currentUser) closeAccountMenu(false);
    paintAccount();
    renderDialog();
    document.dispatchEvent(new CustomEvent('codeology:auth-changed', { detail: { user: currentUser } }));
    if (!currentUser) {
      var owner = '';
      try { owner = localStorage.getItem(OWNER_KEY) || ''; } catch (_) {}
      if (owner) {
        try { localStorage.removeItem(OWNER_KEY); } catch (_) {}
        if (window.AIFSProgress) window.AIFSProgress.reset();
      }
    } else if (currentUser.id !== previousUserId) {
      setTimeout(function () {
        reconcileProgress().then(restoreReturnPath);
      }, 0);
    }
  }

  function init() {
    buildDialog();
    buildAccountMenu();
    bindTriggers();
    document.addEventListener('codeology:ready', bindTriggers);
    if (window.AIFSProgress) window.AIFSProgress.onChange(scheduleProgressSync);

    if (!config.enabled || !sdk || typeof sdk.createClient !== 'function') {
      renderDialog();
      return;
    }
    client = sdk.createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    client.auth.onAuthStateChange(function (_event, session) { setSession(session); });
    client.auth.getSession().then(function (result) {
      if (!result.error) setSession(result.data.session);
    });
  }

  window.CodeologyAuth = Object.freeze({
    open: openDialog,
    getUser: function () { return currentUser; },
    getClient: function () { return client; },
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
