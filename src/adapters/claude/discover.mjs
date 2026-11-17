import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function discoverClaudeMemories(home = os.homedir()) {
  const found = [];
  const projects = path.join(home, ".claude", "projects");
  if (fs.existsSync(projects)) {
    for (const dir of fs.readdirSync(projects)) {
      const memory = path.join(projects, dir, "memory");
      if (fs.existsSync(memory) && fs.statSync(memory).isDirectory()) found.push({ project: dir, dir: memory });
    }
  }
  const global = path.join(home, ".claude", "memory");
  if (fs.existsSync(global) && fs.statSync(global).isDirectory()) found.push({ project: "global", dir: global });
  return found;
}

export function readIndexDescriptions(dir) {
  const map = new Map();
  const file = path.join(dir, "MEMORY.md");
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*-\s*\[(.*?)\]\((.*?)\)\s*(?:—|-)\s*(.*)$/);
    if (m) map.set(path.basename(m[2]), m[3].trim());
  }
  return map;
}
