/** Decode only allowlisted, non-sensitive CV API errors from Supabase Functions. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CodeologyCvApiErrors = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SAFE_CODES = new Set([
    'authentication_required', 'invalid_request', 'document_not_found', 'provider_not_connected',
    'provider_rejected', 'provider_schema_invalid', 'provider_unavailable',
    'provider_storage_unavailable', 'analysis_rate_limited', 'file_too_large',
    'file_type_invalid', 'file_signature_invalid', 'not_enough_text',
    'docx_not_enough_text', 'origin_not_allowed', 'request_failed',
  ]);

  function safeCode(value) {
    return typeof value === 'string' && SAFE_CODES.has(value) ? value : null;
  }

  async function codeFromResult(result) {
    var direct = safeCode(result && result.data && result.data.error);
    if (direct) return direct;

    var error = result && result.error;
    var response = (error && error.context) || (result && result.response);
    if (response && typeof response.clone === 'function') {
      try {
        var payload = await response.clone().json();
        var responseCode = safeCode(payload && payload.error);
        if (responseCode) return responseCode;
      } catch (_) {}
    }

    if (error && error.name === 'FunctionsFetchError') return 'network_unavailable';
    if (error && error.name === 'FunctionsRelayError') return 'service_unavailable';
    return 'request_failed';
  }

  return { codeFromResult: codeFromResult };
}));
