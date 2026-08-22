/** Account-backed CV upload, analysis history, enhancement and export UI. */
(function () {
  'use strict';

  var client = null;
  var user = null;
  var providers = [];
  var documents = [];
  var activeAnalysis = null;
  var editableCv = null;
  var loginButton = document.getElementById('cvLoginButton');
  var gate = document.getElementById('cvAuthGate');
  var workspace = document.getElementById('cvAccountWorkspace');
  var providerForm = document.getElementById('cvProviderForm');
  var analysisForm = document.getElementById('cvAnalysisForm');
  var fileInput = document.getElementById('cvFile');
  var fileName = document.getElementById('cvFileName');
  var textInput = document.getElementById('cvText');
  var results = document.getElementById('cvResults');
  var MAX_BYTES = 10 * 1024 * 1024;
  var MIME = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    md: 'text/markdown',
  };
  var PROVIDERS = {
    gemini: { label: 'Google Gemini', keyLabel: 'Gemini', models: [['gemini-3.7-flash', 'Gemini 3.7 Flash · highest quality'], ['gemini-3.6-flash', 'Gemini 3.6 Flash · balanced'], ['gemini-3.5-flash-lite', 'Gemini 3.5 Flash-Lite · lowest cost']] },
    openai: { label: 'OpenAI', keyLabel: 'OpenAI', models: [['gpt-5.4-mini', 'GPT-5.4 mini · balanced'], ['gpt-5.4-nano', 'GPT-5.4 nano · lowest cost'], ['gpt-5.4', 'GPT-5.4 · highest quality']] },
    anthropic: { label: 'Anthropic', keyLabel: 'Anthropic', models: [['claude-sonnet-5', 'Claude Sonnet 5 · balanced'], ['claude-haiku-4-5', 'Claude Haiku 4.5 · lowest cost'], ['claude-opus-5', 'Claude Opus 5 · highest quality']] },
  };
  var ERROR_MESSAGES = {
    authentication_required: 'Please log in again.', invalid_request: 'Check the submitted fields and try again.',
    provider_not_connected: 'Connect an AI provider before running an analysis.', provider_rejected: 'The provider rejected that API key.', provider_model_unavailable: 'That model is not available to this provider account.',
    provider_unavailable: 'The selected AI provider is temporarily unavailable. Your saved CV has not been lost.', analysis_rate_limited: 'You can run five analyses every ten minutes. Try again shortly.',
    file_too_large: 'The file exceeds the 10 MB limit.', file_type_invalid: 'Use PDF, DOCX, TXT, or Markdown.', file_signature_invalid: 'The file contents do not match its declared type.',
    not_enough_text: 'The CV needs at least 120 characters of readable text.', docx_not_enough_text: 'The DOCX needs at least 120 characters of readable text.',
    document_not_found: 'That saved CV could not be found.', provider_schema_invalid: 'The provider returned an incomplete result. Run the analysis again.', request_failed: 'The secure service could not complete the request. Try again or contact support.',
    provider_storage_unavailable: 'The provider accepted the key, but encrypted key storage is temporarily unavailable. Your key was not saved.',
    network_unavailable: 'The secure analysis service could not be reached. Check your connection and try again.', service_unavailable: 'The secure analysis service is temporarily unavailable. Try again shortly.',
    origin_not_allowed: 'This site address is not authorized to use the secure analysis service.',
  };

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function status(id, message, kind) {
    var node = document.getElementById(id);
    node.textContent = message || '';
    node.className = 'cv-form-status' + (kind ? ' is-' + kind : '');
  }

  function message(error) {
    var code = error && (error.code || error.message);
    return ERROR_MESSAGES[code] || 'Something went wrong. Try again.';
  }

  function setBusy(form, busy) {
    Array.prototype.forEach.call(form.elements, function (control) { control.disabled = busy; });
    form.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  async function api(action, values) {
    var result = await client.functions.invoke('cv-api', { body: Object.assign({ action: action }, values || {}) });
    if (result.error || (result.data && result.data.error)) {
      var decoder = window.CodeologyCvApiErrors;
      var code = decoder && decoder.codeFromResult ? await decoder.codeFromResult(result) : 'request_failed';
      var failure = new Error(code);
      failure.code = code;
      throw failure;
    }
    return result.data;
  }

  function selectedProvider() { return document.getElementById('cvProviderType').value; }
  function providerConnection(id) { return providers.find(function (item) { return item.id === id; }) || null; }

  function syncProviderModels() {
    var definition = PROVIDERS[selectedProvider()];
    var model = document.getElementById('cvProviderModel');
    var previous = model.value;
    model.replaceChildren();
    definition.models.forEach(function (item) { var option = element('option', '', item[1]); option.value = item[0]; model.appendChild(option); });
    if (definition.models.some(function (item) { return item[0] === previous; })) model.value = previous;
    document.getElementById('cvProviderKeyLabel').textContent = definition.keyLabel;
    renderProvider();
  }

  function renderProvider() {
    var connected = document.getElementById('cvProviderConnected');
    var provider = providers.find(function (item) { return item.provider === selectedProvider(); }) || null;
    connected.hidden = !provider;
    document.getElementById('cvProviderKeyFields').hidden = !!provider;
    if (provider) {
      document.getElementById('cvProviderConnectedName').textContent = provider.display_name + ' connected';
      document.getElementById('cvProviderHint').textContent = provider.key_hint + ' · ' + provider.model;
      document.getElementById('cvProviderModel').value = provider.model;
      document.getElementById('cvProviderModel').dispatchEvent(new Event('change', { bubbles: true }));
    }
    renderAnalysisProviders();
  }

  function renderAnalysisProviders() {
    var select = document.getElementById('cvAnalysisProvider');
    var previous = select.value;
    select.replaceChildren();
    providers.forEach(function (item) { var option = element('option', '', item.display_name + ' · ' + item.model); option.value = item.id; select.appendChild(option); });
    if (!providers.length) { var empty = element('option', '', 'Connect a provider first'); empty.value = ''; select.appendChild(empty); }
    if (providers.some(function (item) { return item.id === previous; })) select.value = previous;
  }

  function analysisRows(documentRow) {
    var rows = documentRow.cv_analyses || [];
    return rows.slice().sort(function (a, b) { return Date.parse(b.created_at) - Date.parse(a.created_at); });
  }

  function renderHistory() {
    var list = document.getElementById('cvHistoryList');
    list.replaceChildren();
    if (!documents.length) { list.appendChild(element('p', 'cv-empty-state', 'No saved CVs yet. Your first upload will appear here.')); return; }
    documents.forEach(function (documentRow) {
      var card = element('article', 'cv-history-card');
      var copy = element('div', '');
      copy.appendChild(element('strong', '', documentRow.original_filename));
      copy.appendChild(element('span', '', documentRow.target_role + ' · ' + new Date(documentRow.created_at).toLocaleDateString()));
      copy.appendChild(element('small', '', documentRow.status === 'complete' ? 'Analysis ready' : documentRow.status));
      var actions = element('div', 'cv-history-actions');
      var rows = analysisRows(documentRow);
      if (rows.length) {
        var open = element('button', 'cv-secondary-action', 'Open analysis');
        open.type = 'button';
        open.addEventListener('click', function () { renderAnalysis(rows[0]); });
        actions.appendChild(open);
      }
      var remove = element('button', 'cv-danger-action', 'Delete');
      remove.type = 'button';
      remove.addEventListener('click', function () { deleteCv(documentRow); });
      actions.appendChild(remove);
      card.appendChild(copy); card.appendChild(actions); list.appendChild(card);
    });
  }

  async function loadAccountData() {
    if (!client || !user) return;
    var connectionResult = await client.from('ai_provider_connections').select('id,provider,display_name,key_hint,model,verified_at').order('created_at', { ascending: true });
    if (connectionResult.error) throw connectionResult.error;
    providers = connectionResult.data || [];
    var docsResult = await client.from('cv_documents').select('id,original_filename,mime_type,byte_size,target_role,status,processing_error_code,created_at,cv_analyses(id,created_at,analysis,role_readiness_score,role_readiness_label,model)').order('created_at', { ascending: false }).limit(50);
    if (docsResult.error) throw docsResult.error;
    documents = docsResult.data || [];
    renderProvider(); renderHistory();
  }

  function syncAuth() {
    var auth = window.CodeologyAuth;
    client = auth && auth.getClient ? auth.getClient() : null;
    user = auth && auth.getUser ? auth.getUser() : null;
    gate.hidden = !!user;
    workspace.hidden = !user;
    if (!user) { providers = []; documents = []; results.hidden = true; renderAnalysisProviders(); return; }
    loadAccountData().catch(function () { status('cvProviderStatus', 'Account data is temporarily unavailable.', 'error'); });
  }

  function bindAuthWhenReady() {
    if (window.CodeologyAuth) { syncAuth(); return; }
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      if (window.CodeologyAuth || attempts > 100) { clearInterval(timer); syncAuth(); }
    }, 100);
  }

  function safeFilename(name) {
    return String(name || 'cv.txt').normalize('NFKC').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'cv.txt';
  }

  function fileMime(file) {
    var extension = (file.name.split('.').pop() || '').toLowerCase();
    return MIME[extension] || '';
  }

  async function sha256(file) {
    var digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    return Array.from(new Uint8Array(digest)).map(function (value) { return value.toString(16).padStart(2, '0'); }).join('');
  }

  function selectedFile() {
    var uploaded = fileInput.files && fileInput.files[0];
    var pasted = textInput.value.trim();
    if (uploaded && pasted) throw new Error('Choose a file or pasted text, not both.');
    if (!uploaded && pasted.length < 120) throw new Error('Upload a CV or paste at least 120 characters.');
    if (!uploaded && !pasted) throw new Error('Upload a CV or paste your CV text.');
    if (uploaded) return uploaded;
    return new File([pasted], 'pasted-cv.txt', { type: 'text/plain' });
  }

  async function uploadAndAnalyze(event) {
    event.preventDefault();
    status('cvFormStatus', '', '');
    var role = document.getElementById('targetRole').value.trim();
    var description = document.getElementById('jobDescription').value.trim();
    var provider = providerConnection(document.getElementById('cvAnalysisProvider').value);
    if (!provider) { status('cvFormStatus', ERROR_MESSAGES.provider_not_connected, 'error'); document.getElementById('ai-provider-settings').scrollIntoView({ behavior: 'smooth' }); return; }
    if (role.length < 2) { status('cvFormStatus', 'Enter the target role.', 'error'); return; }
    if (!document.getElementById('cvProviderConsent').checked) { status('cvFormStatus', 'Confirm provider consent before analysis.', 'error'); return; }
    var file;
    try { file = selectedFile(); } catch (error) { status('cvFormStatus', error.message, 'error'); return; }
    var mime = fileMime(file);
    if (!mime || file.size < 1 || file.size > MAX_BYTES) { status('cvFormStatus', file.size > MAX_BYTES ? ERROR_MESSAGES.file_too_large : ERROR_MESSAGES.file_type_invalid, 'error'); return; }
    setBusy(analysisForm, true);
    var path = user.id + '/' + crypto.randomUUID() + '/' + safeFilename(file.name);
    var documentRow = null;
    try {
      status('cvFormStatus', 'Uploading to your private account storage…', 'neutral');
      var uploaded = await client.storage.from('cv-documents').upload(path, file, { contentType: mime, upsert: false, cacheControl: '3600' });
      if (uploaded.error) throw uploaded.error;
      var inserted = await client.from('cv_documents').insert({ user_id: user.id, storage_path: path, original_filename: safeFilename(file.name), mime_type: mime, byte_size: file.size, content_sha256: await sha256(file), source_kind: fileInput.files && fileInput.files[0] ? 'upload' : 'pasted', target_role: role, job_description: description, provider_consent_at: new Date().toISOString() }).select('id').single();
      if (inserted.error) { await client.storage.from('cv-documents').remove([path]); throw inserted.error; }
      documentRow = inserted.data;
      status('cvFormStatus', 'Analyzing through ' + provider.display_name + '…', 'neutral');
      var result = await api('analyze', { documentId: documentRow.id, connectionId: provider.id });
      status('cvFormStatus', 'Analysis saved to your account.', 'success');
      await loadAccountData();
      renderAnalysis(result.analysis);
    } catch (error) {
      status('cvFormStatus', message(error), 'error');
      if (documentRow) await loadAccountData().catch(function () {});
    } finally { setBusy(analysisForm, false); }
  }

  async function deleteCv(documentRow) {
    if (!window.confirm('Permanently delete "' + documentRow.original_filename + '" and all of its analyses?')) return;
    try { await api('delete-cv', { documentId: documentRow.id }); documents = documents.filter(function (item) { return item.id !== documentRow.id; }); renderHistory(); results.hidden = true; status('cvFormStatus', 'CV file and analyses permanently deleted.', 'success'); }
    catch (error) { status('cvFormStatus', message(error), 'error'); }
  }

  function renderList(id, items) {
    var list = document.getElementById(id); list.replaceChildren();
    (items && items.length ? items : ['No item returned.']).forEach(function (item) { list.appendChild(element('li', '', item)); });
  }

  function lessonCandidates(analysis) {
    var words = (analysis.missingSkills || []).join(' ').toLowerCase().split(/[^a-z0-9]+/).filter(function (word) { return word.length > 3; });
    var matches = [];
    if (typeof PHASES === 'undefined') return matches;
    PHASES.forEach(function (phase) { phase.lessons.forEach(function (lesson) { var name = lesson.name.toLowerCase(); var score = words.filter(function (word) { return name.indexOf(word) !== -1; }).length; if (score) matches.push({ phase: phase, lesson: lesson, score: score }); }); });
    return matches.sort(function (a, b) { return b.score - a.score; }).slice(0, 6);
  }

  function renderLessons(analysis) {
    var list = document.getElementById('cvLessonList'); list.replaceChildren();
    var matches = lessonCandidates(analysis);
    if (!matches.length) { var browse = element('a', 'cv-lesson-link', 'Browse the Codeology catalog →'); browse.href = 'catalog.html'; list.appendChild(browse); return; }
    matches.forEach(function (match) { var pathMatch = String(match.lesson.url || '').match(/(phases\/[^/]+\/[^/]+)\/?$/); if (!pathMatch) return; var link = element('a', 'cv-lesson-link'); link.href = 'lesson.html?path=' + encodeURIComponent(pathMatch[1]); link.appendChild(element('span', 'cv-lesson-phase', 'Phase ' + String(match.phase.id).padStart(2, '0') + ' · ' + match.phase.name)); link.appendChild(element('strong', '', match.lesson.name)); link.appendChild(element('span', 'cv-lesson-arrow', '→')); list.appendChild(link); });
  }

  function renderDimensions(items) {
    var grid = document.getElementById('cvDimensions'); grid.replaceChildren();
    items.forEach(function (item) { var card = element('article', 'cv-dimension-card'); var heading = element('div', 'cv-dimension-heading'); heading.appendChild(element('h3', '', item.label)); heading.appendChild(element('strong', '', item.score + '/100')); var meter = element('div', 'cv-dimension-meter'); var fill = element('span', ''); fill.style.width = item.score + '%'; meter.appendChild(fill); card.appendChild(heading); card.appendChild(meter); card.appendChild(element('p', '', item.rationale)); if (item.evidence.length) { card.appendChild(element('h4', '', 'Evidence found')); var found = element('ul', ''); item.evidence.forEach(function (value) { found.appendChild(element('li', '', value)); }); card.appendChild(found); } if (item.gaps.length) { card.appendChild(element('h4', '', 'Gaps')); var gaps = element('ul', ''); item.gaps.forEach(function (value) { gaps.appendChild(element('li', '', value)); }); card.appendChild(gaps); } grid.appendChild(card); });
  }

  function renderCareerSignals(items) {
    var grid = document.getElementById('cvCareerSignals'); grid.replaceChildren();
    items.forEach(function (item) { var card = element('article', 'cv-career-signal-card'); var heading = element('div', 'cv-dimension-heading'); heading.appendChild(element('h4', '', item.label)); heading.appendChild(element('strong', '', item.score + '/100')); card.appendChild(heading); card.appendChild(element('p', '', item.finding)); grid.appendChild(card); });
  }

  function replaceExact(value, original, replacement) {
    if (typeof value === 'string') return value === original ? replacement : value;
    if (Array.isArray(value)) return value.map(function (item) { return replaceExact(item, original, replacement); });
    if (value && typeof value === 'object') { Object.keys(value).forEach(function (key) { value[key] = replaceExact(value[key], original, replacement); }); }
    return value;
  }

  function renderSuggestions(items) {
    var list = document.getElementById('cvSuggestions'); list.replaceChildren();
    if (!items.length) { list.appendChild(element('p', 'cv-empty-state', 'No targeted rewrites were returned.')); return; }
    items.forEach(function (item) { var card = element('article', 'cv-suggestion-card'); card.appendChild(element('span', 'cv-analysis-eyebrow', item.section)); if (item.original) { card.appendChild(element('strong', '', 'Original')); card.appendChild(element('p', 'cv-suggestion-original', item.original)); } card.appendChild(element('strong', '', 'Suggested')); card.appendChild(element('p', 'cv-suggestion-replacement', item.replacement)); card.appendChild(element('small', '', item.rationale + (item.impact ? ' · ' + item.impact : '')));
      var use = element('button', 'cv-secondary-action', 'Use in preview'); use.type = 'button'; use.addEventListener('click', function () { replaceExact(editableCv, item.original, item.replacement); renderPreview(); use.textContent = 'Applied'; use.disabled = true; }); card.appendChild(use); list.appendChild(card); });
  }

  function renderPreview() {
    var preview = document.getElementById('cvPreview'); preview.replaceChildren();
    var cv = editableCv || {}; preview.appendChild(element('h2', '', cv.name || 'Curriculum Vitae')); if (cv.contact) preview.appendChild(element('p', 'cv-preview-contact', cv.contact)); if (cv.headline) preview.appendChild(element('h3', '', cv.headline)); if (cv.summary) { preview.appendChild(element('h4', '', 'Profile')); preview.appendChild(element('p', '', cv.summary)); }
    if (cv.skills && cv.skills.length) { preview.appendChild(element('h4', '', 'Skills')); preview.appendChild(element('p', 'cv-preview-skills', cv.skills.join(' · '))); }
    if (cv.experience && cv.experience.length) { preview.appendChild(element('h4', '', 'Experience')); cv.experience.forEach(function (item) { var section = element('section', 'cv-preview-entry'); section.appendChild(element('h5', '', [item.title, item.company].filter(Boolean).join(' · '))); section.appendChild(element('small', '', item.dates)); var bullets = element('ul', ''); (item.bullets || []).forEach(function (bullet) { bullets.appendChild(element('li', '', bullet)); }); section.appendChild(bullets); preview.appendChild(section); }); }
    if (cv.education && cv.education.length) { preview.appendChild(element('h4', '', 'Education')); cv.education.forEach(function (item) { preview.appendChild(element('p', '', [item.qualification, item.institution, item.dates].filter(Boolean).join(' · '))); }); }
  }

  function renderAnalysis(row) {
    var analysis = row.analysis || row; activeAnalysis = analysis; editableCv = JSON.parse(JSON.stringify(analysis.structuredCv || {}));
    document.getElementById('cvResultSummary').textContent = analysis.summary;
    document.getElementById('cvReadinessScore').textContent = analysis.roleReadinessScore;
    document.getElementById('cvReadinessLabel').textContent = analysis.roleReadinessLabel;
    document.getElementById('cvReadinessRationale').textContent = analysis.readinessRationale;
    document.getElementById('cvReadinessConfidence').textContent = analysis.confidence;
    renderDimensions(analysis.dimensions || []); renderCareerSignals(analysis.careerSignals || []); renderList('cvStrengths', analysis.strengths); renderList('cvMissingSkills', analysis.missingSkills); renderList('cvImprovementPlan', analysis.improvementPlan); renderLessons(analysis); renderSuggestions(analysis.suggestions || []); renderPreview();
    results.hidden = false; document.getElementById('cvResultsTitle').focus({ preventScroll: true }); results.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  loginButton.addEventListener('click', function () { if (window.CodeologyAuth) window.CodeologyAuth.open(); });
  document.addEventListener('codeology:auth-changed', syncAuth);
  providerForm.addEventListener('submit', async function (event) { event.preventDefault(); var key = document.getElementById('cvProviderKey').value.trim(); var providerId = selectedProvider(); var definition = PROVIDERS[providerId]; if (key.length < 20) { status('cvProviderStatus', 'Enter the API key only, without a variable name or quotes.', 'error'); return; } setBusy(providerForm, true); status('cvProviderStatus', 'Verifying with ' + definition.label + '…', 'neutral'); try { var result = await api('save-provider', { provider: providerId, apiKey: key, model: document.getElementById('cvProviderModel').value }); providers = providers.filter(function (item) { return item.provider !== providerId; }).concat([result.connection]); document.getElementById('cvProviderKey').value = ''; renderProvider(); status('cvProviderStatus', definition.label + ' key verified and encrypted for your account.', 'success'); } catch (error) { status('cvProviderStatus', message(error), 'error'); } finally { setBusy(providerForm, false); } });
  document.getElementById('cvProviderDelete').addEventListener('click', async function () { var provider = providers.find(function (item) { return item.provider === selectedProvider(); }) || null; if (!provider || !window.confirm('Disconnect and permanently delete this provider key? Saved CV analyses will remain.')) return; try { await api('delete-provider', { connectionId: provider.id }); providers = providers.filter(function (item) { return item.id !== provider.id; }); renderProvider(); status('cvProviderStatus', 'Provider key deleted.', 'success'); } catch (error) { status('cvProviderStatus', message(error), 'error'); } });
  document.getElementById('cvProviderType').addEventListener('change', syncProviderModels);
  analysisForm.addEventListener('submit', uploadAndAnalyze);
  document.getElementById('cvClearButton').addEventListener('click', function () { analysisForm.reset(); textInput.value = ''; fileName.textContent = 'No file selected'; document.getElementById('cvCharacterCount').textContent = '0 / 100,000'; status('cvFormStatus', 'Form cleared. Saved account CVs were not deleted.', 'success'); });
  textInput.addEventListener('input', function () { document.getElementById('cvCharacterCount').textContent = textInput.value.length.toLocaleString() + ' / 100,000'; });
  fileInput.addEventListener('change', function () {
    var file = fileInput.files && fileInput.files[0];
    fileName.textContent = file ? file.name : 'No file selected';
    if (file) {
      textInput.value = '';
      document.getElementById('cvCharacterCount').textContent = '0 / 100,000';
    }
  });
  document.getElementById('cvTemplate').addEventListener('change', function (event) { document.getElementById('cvPreview').setAttribute('data-template', event.target.value); });
  document.getElementById('cvExportPdf').addEventListener('click', function () { if (!activeAnalysis) return; document.body.classList.add('cv-printing'); window.print(); setTimeout(function () { document.body.classList.remove('cv-printing'); }, 0); });
  document.getElementById('cvExportDocx').addEventListener('click', function () { if (editableCv && window.CodeologyCVExport) window.CodeologyCVExport.exportDocx(editableCv, editableCv.name || 'codeology-cv'); });
  syncProviderModels();
  bindAuthWhenReady();
}());
