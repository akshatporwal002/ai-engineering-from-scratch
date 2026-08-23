import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(webRoot, "../..");
const manifestPath = path.join(webRoot, "content/route-parity.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const errors = [];

if (!Array.isArray(manifest)) errors.push("route-parity.json: <root> must be an array");
const entries = Array.isArray(manifest) ? manifest : [];
const seenLegacyFiles = new Map();
const seenTargets = new Map();
const statuses = new Set(["planned", "implemented", "interaction-verified", "visual-verified", "reviewed", "excluded"]);
const requiredViewports = ["mobile", "tablet", "desktop", "wide"];
const requiredBrowsers = ["chromium", "webkit"];
const visualManifestPath = path.join(repositoryRoot, "docs/migration-evidence/visual-parity/manifest.json");
const visualManifest = existsSync(visualManifestPath) ? JSON.parse(readFileSync(visualManifestPath, "utf8")) : null;

function sourceFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : [target];
  });
}

const testSource = sourceFiles(path.join(webRoot, "tests"))
  .filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");

for (const [index, entry] of entries.entries()) {
  const at = `route-parity.json[${index}]`;
  for (const field of ["legacyUrl", "productionUrl", "nextUrl", "kind", "status", "fixture"]) {
    if (typeof entry[field] !== "string" || !entry[field]) errors.push(`${at}.${field}: must be a non-empty string`);
  }
  if (!statuses.has(entry.status)) errors.push(`${at}.status: unknown status ${JSON.stringify(entry.status)}`);
  if (!Array.isArray(entry.requiredTests) || !entry.requiredTests.length || entry.requiredTests.some((test) => typeof test !== "string" || !test)) {
    errors.push(`${at}.requiredTests: must contain at least one non-empty test identifier`);
  }
  if (!Array.isArray(entry.states) || !entry.states.length) errors.push(`${at}.states: must contain at least one required state`);
  if (JSON.stringify(entry.viewports) !== JSON.stringify(requiredViewports)) errors.push(`${at}.viewports: must contain ${requiredViewports.join(", ")} in order`);
  if (JSON.stringify(entry.browsers) !== JSON.stringify(requiredBrowsers)) errors.push(`${at}.browsers: must contain Chromium and WebKit`);
  if (!Array.isArray(entry.interactionCapabilities) || !entry.interactionCapabilities.length) errors.push(`${at}.interactionCapabilities: must not be empty`);
  if (!Array.isArray(entry.visualTestIds)) errors.push(`${at}.visualTestIds: must be an array`);
  for (const visualTestId of entry.visualTestIds ?? []) {
    if (!testSource.includes(`@visual-id ${visualTestId}`)) errors.push(`${at}.visualTestIds: ${visualTestId} has no matching test marker`);
  }
  if (["visual-verified", "reviewed"].includes(entry.status)) {
    if (!entry.visualTestIds.length) errors.push(`${at}.visualTestIds: ${entry.status} requires visual tests`);
    for (const visualTestId of entry.visualTestIds) {
      if (!visualManifest?.capturedVisualTestIds?.includes(visualTestId)) errors.push(`${at}: ${visualTestId} is absent from the visual evidence manifest`);
    }
  }
  if (entry.status === "reviewed" && typeof entry.humanReview !== "object") {
    errors.push(`${at}.humanReview: reviewed status requires explicit human review metadata`);
  }

  const legacyFile = String(entry.legacyUrl ?? "").split("?")[0];
  if (seenLegacyFiles.has(legacyFile)) errors.push(`${at}.legacyUrl: duplicates ${seenLegacyFiles.get(legacyFile)}`);
  else seenLegacyFiles.set(legacyFile, at);
  if (seenTargets.has(entry.nextUrl)) errors.push(`${at}.nextUrl: duplicates ${seenTargets.get(entry.nextUrl)}`);
  else seenTargets.set(entry.nextUrl, at);

  if (!existsSync(path.join(repositoryRoot, String(entry.fixture ?? "")))) errors.push(`${at}.fixture: file does not exist`);
  if (["implemented", "interaction-verified", "visual-verified", "reviewed"].includes(entry.status)) {
    const routePath = entry.nextUrl === "/"
      ? path.join(webRoot, "app/page.tsx")
      : path.join(webRoot, "app", entry.nextUrl.slice(1), "page.tsx");
    if (!entry.nextUrl.includes("[") && !existsSync(routePath)) errors.push(`${at}.nextUrl: implemented route has no page at ${path.relative(repositoryRoot, routePath)}`);
  }
}

const legacyFiles = readdirSync(path.join(repositoryRoot, "site"))
  .filter((name) => name.endsWith(".html"))
  .map((name) => `/${name}`)
  .sort();
for (const legacyFile of legacyFiles) {
  if (!seenLegacyFiles.has(legacyFile)) errors.push(`site/${legacyFile.slice(1)}: missing from route parity manifest`);
}
for (const legacyFile of seenLegacyFiles.keys()) {
  if (!legacyFiles.includes(legacyFile)) errors.push(`${legacyFile}: manifest entry has no legacy HTML file`);
}

if (errors.length) {
  console.error(`Route parity validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  const reviewed = entries.filter((entry) => entry.status === "reviewed").length;
  console.log(`Route parity valid: ${entries.length} legacy routes accounted for (${reviewed} human-reviewed).`);
}
