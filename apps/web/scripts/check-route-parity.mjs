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
const statuses = new Set(["complete", "partial", "planned", "excluded"]);

for (const [index, entry] of entries.entries()) {
  const at = `route-parity.json[${index}]`;
  for (const field of ["legacyUrl", "nextUrl", "kind", "status", "fixture"]) {
    if (typeof entry[field] !== "string" || !entry[field]) errors.push(`${at}.${field}: must be a non-empty string`);
  }
  if (!statuses.has(entry.status)) errors.push(`${at}.status: unknown status ${JSON.stringify(entry.status)}`);
  if (!Array.isArray(entry.requiredTests) || !entry.requiredTests.length || entry.requiredTests.some((test) => typeof test !== "string" || !test)) {
    errors.push(`${at}.requiredTests: must contain at least one non-empty test identifier`);
  }

  const legacyFile = String(entry.legacyUrl ?? "").split("?")[0];
  if (seenLegacyFiles.has(legacyFile)) errors.push(`${at}.legacyUrl: duplicates ${seenLegacyFiles.get(legacyFile)}`);
  else seenLegacyFiles.set(legacyFile, at);
  if (seenTargets.has(entry.nextUrl)) errors.push(`${at}.nextUrl: duplicates ${seenTargets.get(entry.nextUrl)}`);
  else seenTargets.set(entry.nextUrl, at);

  if (!existsSync(path.join(repositoryRoot, String(entry.fixture ?? "")))) errors.push(`${at}.fixture: file does not exist`);
  if (entry.status === "complete") {
    const routePath = entry.nextUrl === "/"
      ? path.join(webRoot, "app/page.tsx")
      : path.join(webRoot, "app", entry.nextUrl.slice(1), "page.tsx");
    if (!existsSync(routePath)) errors.push(`${at}.nextUrl: complete route has no page at ${path.relative(repositoryRoot, routePath)}`);
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
  const complete = entries.filter((entry) => entry.status === "complete").length;
  console.log(`Route parity valid: ${entries.length} legacy routes accounted for (${complete} complete).`);
}
