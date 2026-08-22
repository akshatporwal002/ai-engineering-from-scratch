import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(webRoot, "../..");
const manifestPath = path.join(webRoot, "content/route-parity.json");
const dashboardPath = path.join(repositoryRoot, "docs/migration-evidence/overnight/MIGRATION_DASHBOARD.md");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const statuses = ["complete", "partial", "planned", "excluded"];
const counts = Object.fromEntries(statuses.map((status) => [status, manifest.filter((entry) => entry.status === status).length]));
const escapeCell = (value) => String(value).replaceAll("|", "\\|");
const rows = manifest.map((entry) => `| \`${escapeCell(entry.legacyUrl)}\` | \`${escapeCell(entry.nextUrl)}\` | ${escapeCell(entry.kind)} | ${escapeCell(entry.status)} | ${entry.requiredTests.map((test) => `\`${escapeCell(test)}\``).join("<br>")} |`);
const dashboard = [
  "# Next.js migration dashboard",
  "",
  "> Generated from `apps/web/content/route-parity.json`; do not edit by hand.",
  "",
  "## Coverage",
  "",
  `- Legacy HTML routes: ${manifest.length}`,
  `- Complete: ${counts.complete}`,
  `- Partial: ${counts.partial}`,
  `- Planned: ${counts.planned}`,
  `- Excluded: ${counts.excluded}`,
  `- Accounted for: ${manifest.length - counts.planned} implemented or explicitly classified; ${counts.planned} planned`,
  "",
  "## Route matrix",
  "",
  "| Legacy route | Next.js target | Kind | Status | Required evidence |",
  "|---|---|---|---|---|",
  ...rows,
  "",
  "## Interpretation",
  "",
  "A `complete` row has a corresponding Next.js page and named automated evidence. A `planned` row is deliberately not represented as migrated. Route existence and one-to-one legacy coverage are enforced by `check-route-parity.mjs`; dashboard drift is enforced by this generator's `--check` mode.",
  "",
].join("\n");

if (process.argv.includes("--check")) {
  if (!existsSync(dashboardPath) || readFileSync(dashboardPath, "utf8") !== dashboard) {
    console.error("Migration dashboard is stale. Run `npm run build:migration-dashboard`.");
    process.exitCode = 1;
  } else {
    console.log(`Migration dashboard valid: ${manifest.length} routes (${counts.complete} complete, ${counts.planned} planned).`);
  }
} else {
  writeFileSync(dashboardPath, dashboard);
  console.log(`Wrote ${path.relative(repositoryRoot, dashboardPath)}.`);
}
