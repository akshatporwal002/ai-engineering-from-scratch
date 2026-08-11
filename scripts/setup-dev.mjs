import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.error || result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("git", ["config", "core.hooksPath", ".githooks"]);

console.log("Codeology development hooks are enabled.");
console.log("Pre-commit command: npm run check:precommit");
console.log("Full local CI:      npm run ci");
console.log("Preview deploy:     npm run deploy:preview");
console.log("Production deploy:  npm run deploy:production");
