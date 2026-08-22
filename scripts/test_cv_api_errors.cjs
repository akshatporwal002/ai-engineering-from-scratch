#!/usr/bin/env node

const assert = require('node:assert/strict');
const { codeFromResult } = require('../site/cv-api-errors.js');

async function run() {
  assert.equal(await codeFromResult({ data: { error: 'provider_rejected' }, error: null }), 'provider_rejected');

  const response = new Response(JSON.stringify({ error: 'provider_storage_unavailable' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(await codeFromResult({
    data: null,
    error: { name: 'FunctionsHttpError', context: response },
  }), 'provider_storage_unavailable');

  assert.equal(await codeFromResult({
    data: null,
    error: { name: 'FunctionsFetchError' },
  }), 'network_unavailable');

  assert.equal(await codeFromResult({
    data: null,
    error: { name: 'FunctionsRelayError' },
  }), 'service_unavailable');

  const untrusted = new Response(JSON.stringify({ error: '<script>alert(1)</script>' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
  assert.equal(await codeFromResult({
    data: null,
    error: { name: 'FunctionsHttpError', context: untrusted },
  }), 'request_failed');

  console.log('CV API safe error decoding contract is valid.');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
