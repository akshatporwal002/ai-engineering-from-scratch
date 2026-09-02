import { spawnSync } from "node:child_process";

const requested = process.env.CODEOLOGY_PYTHON?.trim();
const candidates = requested
  ? [[requested, []]]
  : process.platform === "win32"
    ? [["python", []], ["py", ["-3"]], ["python3", []]]
    : [["python3", []], ["python", []]];

for (const [command, prefix] of candidates) {
  const result = spawnSync(command, [...prefix, ...process.argv.slice(2)], {
    cwd: process.cwd(),
    env: { ...process.env, PYTHONUTF8: process.env.PYTHONUTF8 || "1" },
    stdio: "inherit",
  });
  // Windows may expose an unlaunchable Store app alias as `python`; treat it
  // like a missing candidate and continue to `py`/`python3`.
  if (result.error?.code === "ENOENT" || (process.platform === "win32" && result.error?.code === "EPERM")) continue;
  if (result.error) {
    console.error(`Unable to start ${command}: ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

console.error("Python 3 was not found. Set CODEOLOGY_PYTHON to its executable path.");
process.exit(1);
