import fs from "node:fs";
import path from "node:path";
import { withFileLock } from "./lock.mjs";
import { SCHEMA_VERSION } from "./schema.mjs";
import { MemoryService } from "./memory-service.mjs";

function inside(parent, child) {
  return child === parent || child.startsWith(parent + path.sep);
}

function countNotes(dir) {
  if (!fs.existsSync(dir)) return 0;
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) n += countNotes(full);
    else if (entry.name.endsWith(".md") && entry.name !== "MEMORY.md") n += 1;
  }
  return n;
}

function copyContent(source, target) {
  for (const name of ["global", "workspaces", "journal"]) {
    const from = path.join(source, name);
    if (fs.existsSync(from)) fs.cpSync(from, path.join(target, name), { recursive: true });
  }
  const state = path.join(source, "import-state.json");
  if (fs.existsSync(state)) fs.copyFileSync(state, path.join(target, "import-state.json"));
}

export function backupMemory(root, target) {
  const source = path.resolve(root);
  const dest = path.resolve(target);
  if (inside(source, dest) || inside(dest, source)) throw new Error("backup target must be outside the memory root");
  if (!fs.existsSync(path.join(source, "global")) && !fs.existsSync(path.join(source, "workspaces"))) throw new Error("source does not look like a memory root: " + source);
  if (fs.existsSync(dest) && fs.readdirSync(dest).length > 0) throw new Error("backup target is not empty: " + dest);
  fs.mkdirSync(dest, { recursive: true });
  return withFileLock(source, () => {
    copyContent(source, dest);
    const notes = countNotes(path.join(dest, "global")) + countNotes(path.join(dest, "workspaces"));
    const manifest = { version: SCHEMA_VERSION, createdAt: new Date().toISOString(), source, notes };
    fs.writeFileSync(path.join(dest, "backup.json"), JSON.stringify(manifest, null, 2) + "\n");
    return { target: dest, notes, version: SCHEMA_VERSION };
  });
}

export function restoreMemory(source, target, { force = false } = {}) {
  const from = path.resolve(source);
  const dest = path.resolve(target);
  if (inside(from, dest) || inside(dest, from)) throw new Error("restore source and target must be separate");
  if (!fs.existsSync(path.join(from, "global")) && !fs.existsSync(path.join(from, "workspaces"))) throw new Error("source does not look like a memory backup: " + from);
  const hasData = countNotes(path.join(dest, "global")) + countNotes(path.join(dest, "workspaces")) > 0;
  if (hasData && !force) throw new Error("restore target already has memory data; pass force=true");
  fs.mkdirSync(dest, { recursive: true });
  withFileLock(dest, () => {
    for (const name of ["global", "workspaces", "journal"]) fs.rmSync(path.join(dest, name), { recursive: true, force: true });
    fs.rmSync(path.join(dest, ".index"), { recursive: true, force: true });
    copyContent(from, dest);
  });
  const service = new MemoryService({ root: dest }).init();
  const rebuilt = service.rebuild();
  service.close();
  return { target: dest, rebuilt };
}
