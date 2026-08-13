#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const siteDir = path.join(repoRoot, 'site');
const vendorDir = path.join(siteDir, 'vendor');

await fs.mkdir(vendorDir, { recursive: true });

await build({
  absWorkingDir: repoRoot,
  entryPoints: [path.join(scriptDir, 'supabase-browser-entry.js')],
  outfile: path.join(vendorDir, 'supabase.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
});

const url = process.env.CODEOLOGY_SUPABASE_URL
  || process.env.NEXT_PUBLIC_SUPABASE_URL
  || process.env.SUPABASE_URL
  || '';
const publishableKey = process.env.CODEOLOGY_SUPABASE_PUBLISHABLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_PUBLISHABLE_KEY
  || '';

const config = {
  schemaVersion: 1,
  enabled: Boolean(url && publishableKey),
  url,
  publishableKey,
};

await fs.writeFile(
  path.join(siteDir, 'codeology-auth-config.js'),
  `window.CODEOLOGY_AUTH_CONFIG = Object.freeze(${JSON.stringify(config)});\n`,
  'utf8',
);

console.log(`   wrote Codeology auth bundle (${config.enabled ? 'configured' : 'disabled'})`);
