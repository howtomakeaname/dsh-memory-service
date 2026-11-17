import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : full.endsWith(".mjs") ? [full] : [];
  });
}

let failed = false;
for (const file of [...walk("src"), "client.js", "bench/e2e/run.mjs"]) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
