/** Render the local CV analysis without transmitting or persisting CV data. */
(function () {
  'use strict';

  var engine = window.CodeologyCVAnalysis;
  var form = document.getElementById('cvAnalysisForm');
  if (!engine || !form) return;

  var role = document.getElementById('targetRole');
  var jobDescription = document.getElementById('jobDescription');
  var cvText = document.getElementById('cvText');
  var cvFile = document.getElementById('cvFile');
  var count = document.getElementById('cvCharacterCount');
  var status = document.getElementById('cvFormStatus');
  var clearButton = document.getElementById('cvClearButton');
  var results = document.getElementById('cvResults');
  var resultsTitle = document.getElementById('cvResultsTitle');

  var STATUS_LABELS = {
    clear: 'Clear evidence',
    some: 'Some evidence',
    'not-found': 'Not found'
  };

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function setStatus(message, kind) {
    status.textContent = message || '';
    status.className = 'cv-form-status' + (kind ? ' is-' + kind : '');
  }

  function updateCharacterCount() {
    count.textContent = cvText.value.length.toLocaleString('en-US') + ' / ' + engine.LIMITS.maxCharacters.toLocaleString('en-US');
  }

  function setInvalid(field, invalid) {
    if (invalid) field.setAttribute('aria-invalid', 'true');
    else field.removeAttribute('aria-invalid');
  }

  function statusBadge(value) {
    var badge = element('span', 'cv-status-badge', STATUS_LABELS[value] || value);
    badge.setAttribute('data-status', value);
    return badge;
  }

  function renderFacts(analysis) {
    var container = document.getElementById('cvDocumentFacts');
    var sectionLabels = analysis.document.sections.map(function (section) { return section.label; });
    var facts = [
      { label: 'Target', value: analysis.role.label },
      { label: 'Words reviewed', value: analysis.document.wordCount.toLocaleString('en-US') },
      { label: 'Sections found', value: sectionLabels.length ? sectionLabels.join(', ') : 'No standard headings found' },
      { label: 'Quantified statements', value: String(analysis.document.quantifiedStatements) }
    ];
    container.replaceChildren();
    facts.forEach(function (fact) {
      var item = element('div', 'cv-document-fact');
      item.appendChild(element('span', '', fact.label));
      item.appendChild(element('strong', '', fact.value));
      container.appendChild(item);
    });
  }

  function renderRoleAreas(analysis) {
    var container = document.getElementById('cvRoleAreas');
    container.replaceChildren();
    analysis.roleAreas.forEach(function (item) {
      var card = element('article', 'cv-role-area');
      card.setAttribute('data-status', item.status);
      var heading = element('div', 'cv-role-area-heading');
      heading.appendChild(element('h4', '', item.label));
      heading.appendChild(statusBadge(item.status));
      card.appendChild(heading);

      if (item.matchedTerms.length) {
        var terms = element('ul', 'cv-term-list');
        terms.setAttribute('aria-label', 'Matching terms');
        item.matchedTerms.slice(0, 7).forEach(function (term) {
          terms.appendChild(element('li', '', term));
        });
        card.appendChild(terms);
      } else {
        card.appendChild(element('p', 'cv-role-area-empty', 'No matching terms were found in the CV text.'));
      }

      if (item.roleContextTerms.length) {
        card.appendChild(element('p', 'cv-role-context-note', 'Role context also mentions: ' + item.roleContextTerms.slice(0, 4).join(', ') + '.'));
      }
      container.appendChild(card);
    });
  }

  function renderSignals(analysis) {
    var container = document.getElementById('cvSignals');
    container.replaceChildren();
    analysis.signals.forEach(function (item) {
      var card = element('article', 'cv-signal-card');
      card.setAttribute('data-status', item.status);
      card.appendChild(element('span', 'cv-signal-count', String(item.occurrences).padStart(2, '0')));
      var copy = element('div', '');
      copy.appendChild(element('h4', '', item.label));
      copy.appendChild(element('p', '', item.occurrences === 1 ? '1 matching phrase' : item.occurrences + ' matching phrases'));
      card.appendChild(copy);
      card.appendChild(statusBadge(item.status));
      container.appendChild(card);
    });
  }

  function lessonPath(url) {
    var match = String(url || '').match(/(phases\/[^/]+\/[^/]+)\/?$/);
    return match ? match[1] : '';
  }

  function findLesson(query) {
    if (typeof PHASES === 'undefined' || !Array.isArray(PHASES)) return null;
    for (var i = 0; i < PHASES.length; i++) {
      for (var j = 0; j < PHASES[i].lessons.length; j++) {
        if (PHASES[i].lessons[j].name === query) {
          return { phase: PHASES[i], lesson: PHASES[i].lessons[j] };
        }
      }
    }
    return null;
  }

  function renderLessons(analysis) {
    var container = document.getElementById('cvLessonList');
    container.replaceChildren();
    var resolved = analysis.lessonQueries.map(findLesson).filter(Boolean);
    if (!resolved.length) {
      container.appendChild(element('p', 'cv-role-area-empty', 'Browse the catalog to choose a lesson for this role.'));
      return;
    }
    resolved.forEach(function (match) {
      var path = lessonPath(match.lesson.url);
      if (!path) return;
      var link = element('a', 'cv-lesson-link');
      link.href = 'lesson.html?path=' + encodeURIComponent(path);
      var phase = element('span', 'cv-lesson-phase', 'Phase ' + String(match.phase.id).padStart(2, '0') + ' · ' + match.phase.name);
      var name = element('strong', '', match.lesson.name);
      var arrow = element('span', 'cv-lesson-arrow', '→');
      arrow.setAttribute('aria-hidden', 'true');
      link.appendChild(phase);
      link.appendChild(name);
      link.appendChild(arrow);
      container.appendChild(link);
    });
  }

  function renderEditPrompts(analysis) {
    var container = document.getElementById('cvEditPrompts');
    container.replaceChildren();
    analysis.editPrompts.forEach(function (prompt) {
      container.appendChild(element('li', '', prompt));
    });
  }

  function renderAnalysis(analysis) {
    document.getElementById('cvResultSummary').textContent = analysis.summary;
    renderFacts(analysis);
    renderRoleAreas(analysis);
    renderSignals(analysis);
    renderEditPrompts(analysis);
    renderLessons(analysis);
    results.hidden = false;
    resultsTitle.focus({ preventScroll: true });
    results.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  function clearPrivateData() {
    form.reset();
    cvText.value = '';
    cvFile.value = '';
    results.hidden = true;
    setInvalid(role, false);
    setInvalid(cvText, false);
    updateCharacterCount();
    setStatus('Private CV text and analysis cleared from this page.', 'success');
    cvText.focus();
  }

  cvText.addEventListener('input', function () {
    updateCharacterCount();
    setInvalid(cvText, false);
  });

  role.addEventListener('change', function () { setInvalid(role, false); });

  cvFile.addEventListener('change', function () {
    var file = cvFile.files && cvFile.files[0];
    if (!file) return;
    var lowerName = file.name.toLowerCase();
    if (!(lowerName.endsWith('.txt') || lowerName.endsWith('.md'))) {
      cvFile.value = '';
      setStatus('Open a plain-text .txt or Markdown .md file. PDF and DOCX stay disabled in this private first release.', 'error');
      return;
    }
    if (file.size > engine.LIMITS.maxCharacters * 4) {
      cvFile.value = '';
      setStatus('That file is too large. Use a file containing 50,000 characters or fewer.', 'error');
      return;
    }
    file.text().then(function (text) {
      if (text.length > engine.LIMITS.maxCharacters) throw new Error('That file contains more than 50,000 characters.');
      cvText.value = text;
      updateCharacterCount();
      setStatus('Loaded ' + file.name + ' locally. Nothing was uploaded.', 'success');
      cvText.focus();
    }).catch(function (error) {
      cvFile.value = '';
      setStatus(error.message || 'The local file could not be read.', 'error');
    });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    setStatus('', '');
    setInvalid(role, !role.value);
    setInvalid(cvText, cvText.value.trim().length < engine.LIMITS.minCharacters);
    try {
      var analysis = engine.analyze(cvText.value, role.value, jobDescription.value);
      renderAnalysis(analysis);
      setStatus('Analysis complete. Your CV text remained in this browser tab.', 'success');
    } catch (error) {
      results.hidden = true;
      setStatus(error.message || 'The CV could not be analyzed.', 'error');
      if (!role.value) role.focus();
      else cvText.focus();
    }
  });

  clearButton.addEventListener('click', clearPrivateData);
  updateCharacterCount();
}());
