import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(appRoot, "../..");
const serverRoot = path.join(appRoot, ".next/server");
const errors = [];
let traceCount = 0;
let prunedCount = 0;
const pruneDevelopment = process.argv.includes("--prune-development");

function isDevelopmentFile(relative) {
  return /^(?:\.git(?:\/|$)|\.(?:agents|claude|github|githooks|codex[^/]*)\/|docs\/|book\/|scripts\/|supabase\/|apps\/api\/|apps\/web\/(?:tests|scripts)\/)|(?:^|\/)\.env(?:\.|$)|^apps\/web\/\.next\/(?:lock$|cache\/|dev\/)/.test(relative);
}

function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) { inspect(absolute); continue; }
    if (!entry.name.endsWith(".nft.json")) continue;
    traceCount++;
    const trace = JSON.parse(readFileSync(absolute, "utf8"));
    const retained = [];
    for (const file of trace.files) {
      const resolved = path.resolve(directory, file);
      const relative = path.relative(repositoryRoot, resolved).split(path.sep).join("/");
      if (isDevelopmentFile(relative)) {
        // Next's path-based glob exclusions do not match Windows separators reliably.
        // Apply the same development-only boundary to generated traces on every OS.
        if (pruneDevelopment) { prunedCount++; continue; }
        errors.push(`${path.relative(appRoot, absolute)} bundles development-only file ${relative}`);
      } else if (!existsSync(resolved)) {
        errors.push(`${path.relative(appRoot, absolute)} references missing file ${relative}`);
      }
      retained.push(file);
    }
    if (pruneDevelopment && retained.length !== trace.files.length) {
      writeFileSync(absolute, JSON.stringify({ ...trace, files: retained }));
    }
    if (path.relative(serverRoot, absolute).split(path.sep).join("/") === "app/lessons/[...slug]/page.js.nft.json") {
      const runtimeFiles = new Set(retained.map((file) => path.relative(repositoryRoot, path.resolve(directory, file)).split(path.sep).join("/")));
      for (const required of ["site/data.js", "site/lesson.html", "phases/00-setup-and-tooling/01-dev-environment/docs/en.md"]) {
        if (!runtimeFiles.has(required)) errors.push(`Lesson runtime content missing from bundle: ${required}`);
      }
    }
  }
}

inspect(serverRoot);
if (!traceCount) errors.push("No server file traces were generated.");
if (errors.length) {
  console.error(errors.slice(0, 15).join("\n"));
  console.error(`Build trace validation failed: ${errors.length} finding(s).`);
  process.exitCode = 1;
} else {
  console.log(`Build traces valid: ${traceCount} server bundles; ${prunedCount} development-only references pruned.`);
}
