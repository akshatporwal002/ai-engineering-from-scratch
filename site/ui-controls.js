/** Accessible, dependency-free Codeology form controls for the static academy. */
(function () {
  'use strict';

  var nextId = 0;
  var openInstance = null;

  function selectedOption(select) {
    return select.options[select.selectedIndex] || select.options[0] || null;
  }

  function closeOpen(except) {
    if (openInstance && openInstance !== except) openInstance.close(false);
  }

  function enhanceSelect(select) {
    if (!select || select.getAttribute('data-codeology-enhanced') === 'true') return null;
    select.setAttribute('data-codeology-enhanced', 'true');
    select.setAttribute('aria-hidden', 'true');
    select.classList.add('codeology-select__native');
    select.tabIndex = -1;

    var id = select.id || ('codeologySelect' + (++nextId));
    var listId = id + 'Listbox';
    var wrapper = document.createElement('div');
    wrapper.className = 'codeology-select';

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'codeology-select__trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', listId);
    var label = select.getAttribute('aria-label');
    if (label) trigger.setAttribute('aria-label', label);
    var labelledBy = select.getAttribute('aria-labelledby');
    if (labelledBy) trigger.setAttribute('aria-labelledby', labelledBy);

    var value = document.createElement('span');
    value.className = 'codeology-select__value';
    var chevron = document.createElement('span');
    chevron.className = 'codeology-select__chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = '⌄';
    trigger.appendChild(value);
    trigger.appendChild(chevron);

    var content = document.createElement('div');
    content.id = listId;
    content.className = 'codeology-select__content';
    content.setAttribute('role', 'listbox');
    content.hidden = true;

    select.parentNode.insertBefore(wrapper, select.nextSibling);
    wrapper.appendChild(trigger);
    wrapper.appendChild(content);

    var instance = { select: select, trigger: trigger, content: content, close: close };
    var typeahead = '';
    var typeaheadTimer = null;

    function optionButtons() {
      return Array.prototype.slice.call(content.querySelectorAll('[role="option"]:not([aria-disabled="true"])'));
    }

    function syncValue() {
      var option = selectedOption(select);
      value.textContent = option ? option.textContent : 'Select';
      trigger.disabled = select.disabled;
      trigger.setAttribute('aria-invalid', select.getAttribute('aria-invalid') || 'false');
      var buttons = content.querySelectorAll('[role="option"]');
      for (var i = 0; i < buttons.length; i++) {
        var selected = buttons[i].getAttribute('data-value') === select.value;
        buttons[i].setAttribute('aria-selected', selected ? 'true' : 'false');
        buttons[i].classList.toggle('is-selected', selected);
      }
    }

    function choose(button) {
      if (!button || button.getAttribute('aria-disabled') === 'true') return;
      var previous = select.value;
      select.value = button.getAttribute('data-value');
      syncValue();
      close(true);
      if (select.value !== previous) select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function renderOptions() {
      content.replaceChildren();
      for (var i = 0; i < select.options.length; i++) {
        var option = select.options[i];
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'codeology-select__option';
        button.setAttribute('role', 'option');
        button.setAttribute('data-value', option.value);
        button.setAttribute('aria-selected', option.selected ? 'true' : 'false');
        if (option.disabled) {
          button.disabled = true;
          button.setAttribute('aria-disabled', 'true');
        }
        button.textContent = option.textContent;
        button.addEventListener('click', function (event) { choose(event.currentTarget); });
        button.addEventListener('keydown', onOptionKeydown);
        content.appendChild(button);
      }
      syncValue();
    }

    function open(preferLast) {
      if (trigger.disabled) return;
      closeOpen(instance);
      renderOptions();
      content.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      wrapper.classList.add('is-open');
      openInstance = instance;
      var buttons = optionButtons();
      var selected = content.querySelector('[aria-selected="true"]:not([aria-disabled="true"])');
      var target = preferLast ? buttons[buttons.length - 1] : (selected || buttons[0]);
      if (target) target.focus({ preventScroll: true });
    }

    function close(restoreFocus) {
      if (content.hidden) return;
      content.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      wrapper.classList.remove('is-open');
      if (openInstance === instance) openInstance = null;
      if (restoreFocus) trigger.focus({ preventScroll: true });
    }

    function moveFocus(current, direction) {
      var buttons = optionButtons();
      if (!buttons.length) return;
      var index = buttons.indexOf(current);
      index = Math.max(0, Math.min(buttons.length - 1, index + direction));
      buttons[index].focus({ preventScroll: true });
    }

    function focusMatch(character) {
      clearTimeout(typeaheadTimer);
      typeahead += character.toLowerCase();
      typeaheadTimer = setTimeout(function () { typeahead = ''; }, 650);
      var buttons = optionButtons();
      var match = buttons.find(function (button) {
        return button.textContent.trim().toLowerCase().indexOf(typeahead) === 0;
      });
      if (match) match.focus({ preventScroll: true });
    }

    function onOptionKeydown(event) {
      if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(event.currentTarget, 1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(event.currentTarget, -1); }
      else if (event.key === 'Home') { event.preventDefault(); var first = optionButtons()[0]; if (first) first.focus(); }
      else if (event.key === 'End') { event.preventDefault(); var buttons = optionButtons(); if (buttons.length) buttons[buttons.length - 1].focus(); }
      else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(event.currentTarget); }
      else if (event.key === 'Escape') { event.preventDefault(); close(true); }
      else if (event.key === 'Tab') close(false);
      else if (event.key.length === 1 && /\S/.test(event.key)) focusMatch(event.key);
    }

    trigger.addEventListener('click', function () {
      if (content.hidden) open(false);
      else close(true);
    });
    trigger.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault(); open(false);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault(); open(true);
      } else if (event.key === 'Escape') {
        event.preventDefault(); close(true);
      }
    });
    select.addEventListener('change', syncValue);
    if (select.form) select.form.addEventListener('reset', function () { setTimeout(syncValue, 0); });
    new MutationObserver(renderOptions).observe(select, { childList: true, subtree: true, attributes: true });
    renderOptions();
    return instance;
  }

  function init(root) {
    var controls = (root || document).querySelectorAll('select[data-codeology-select]');
    for (var i = 0; i < controls.length; i++) enhanceSelect(controls[i]);
  }

  document.addEventListener('pointerdown', function (event) {
    if (openInstance && !openInstance.content.parentNode.contains(event.target)) openInstance.close(false);
  });
  document.addEventListener('focusin', function (event) {
    if (openInstance && !openInstance.content.parentNode.contains(event.target)) openInstance.close(false);
  });

  window.CodeologyUI = Object.freeze({ enhanceSelect: enhanceSelect, init: init });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); });
  else init(document);
}());
