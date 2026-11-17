import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { safeWorkspaceId } from "./identity.mjs";

export function resolveRoot(root) {
  return path.resolve(root || process.env.DSH_MEMORY_HOME || path.join(os.homedir(), ".dsh", "memory-service"));
}

export function normalizeScope(scope, workspaceId = "default") {
  const value = String(scope || "workspace:" + safeWorkspaceId(workspaceId));
  if (value === "global" || value.startsWith("workspace:")) return value;
  if (value.startsWith("workspace/")) return "workspace:" + safeWorkspaceId(value.slice(10));
  return "workspace:" + safeWorkspaceId(value);
}

export function scopeDir(root, scope) {
  const value = String(scope);
  return value === "global" ? path.join(root, "global") : path.join(root, "workspaces", safeWorkspaceId(value.slice(10)));
}

export function notesDir(root, scope) {
  return path.join(scopeDir(root, scope), "notes");
}

export function notePath(root, scope, id) {
  return path.join(notesDir(root, scope), id + ".md");
}

export function journalPath(root) {
  return path.join(root, "journal", "events.ndjson");
}

export function listWorkspaces(root) {
  const dir = path.join(root, "workspaces");
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((d) => fs.statSync(path.join(dir, d)).isDirectory()) : [];
}
