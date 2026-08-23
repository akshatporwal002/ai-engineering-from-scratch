import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(webRoot, "../..");
const evidenceRoot = path.join(repositoryRoot, "docs/migration-evidence/visual-parity");
const referenceRoot = path.join(evidenceRoot, "reference-production");
const manifest = JSON.parse(readFileSync(path.join(evidenceRoot, "manifest.json"), "utf8"));
const expectedEtag = `"${manifest.productionRevision.buildMetaEtag}"`;

async function productionRevision() {
  const response = await fetch(`${manifest.canonicalOrigin}/build-meta.js`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Production revision request failed with HTTP ${response.status}`);
  const body = await response.text();
  return { etag: response.headers.get("etag"), body };
}

function assertRevision(revision, phase) {
  if (revision.etag !== expectedEtag || !revision.body.includes(`window.__AIFS_REF = "${manifest.productionRevision.buildRef}"`)) {
    throw new Error(`Production changed ${phase} capture. Expected ETag ${expectedEtag} and build ref ${manifest.productionRevision.buildRef}; received ${revision.etag}.`);
  }
}

if (existsSync(referenceRoot)) {
  throw new Error(`Immutable reference directory already exists: ${path.relative(repositoryRoot, referenceRoot)}`);
}

const before = await productionRevision();
assertRevision(before, "before");

const migrationCommit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
const migrationTree = execFileSync("git", ["write-tree"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
const cli = path.join(webRoot, "node_modules/@playwright/test/cli.js");
const result = spawnSync(process.execPath, [cli, "test", "--config", "playwright.visual.config.ts"], {
  cwd: webRoot,
  env: {
    ...process.env,
    CODEOLOGY_CAPTURE_PRODUCTION: "1",
    CODEOLOGY_MIGRATION_COMMIT: migrationCommit,
    CODEOLOGY_MIGRATION_TREE: migrationTree,
  },
  stdio: "inherit",
});

if (result.status !== 0) process.exit(result.status ?? 1);

const after = await productionRevision();
assertRevision(after, "during");
console.log(`Captured immutable references at production ETag ${expectedEtag} for migration tree ${migrationTree}.`);
