import fs from "node:fs";
import path from "node:path";
import { parseMarkdown, stringifyMarkdown } from "../frontmatter.mjs";
import { listWorkspaces } from "./paths.mjs";

function noteFiles(root) {
  const dirs = [path.join(root, "global", "notes")];
  for (const workspace of listWorkspaces(root)) dirs.push(path.join(root, "workspaces", workspace, "notes"));
  const files = [];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) if (name.endsWith(".md")) files.push(path.join(dir, name));
  }
  return files;
}

function migrationV2(root) {
  let changed = 0;
  for (const file of noteFiles(root)) {
    const text = fs.readFileSync(file, "utf8");
    const parsed = parseMarkdown(text);
    const data = parsed.data || {};
    const meta = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
    if (meta.description_auto !== undefined) continue;
    const body = parsed.body.trim();
    const description = String(data.description || "");
    const auto = description === "" || description === body.replace(/\s+/g, " ").slice(0, 200);
    const next = {
      ...data,
      ...(auto && description === "" ? { description: body.replace(/\s+/g, " ").slice(0, 200) } : {}),
      metadata: { ...meta, description_auto: auto }
    };
    fs.writeFileSync(file, stringifyMarkdown(next, parsed.body));
    changed += 1;
  }
  return { changed };
}

export const MIGRATIONS = [
  { version: 2, run: migrationV2 }
];

export function migrateSchema(root, fromVersion, toVersion, log = () => {}) {
  let version = fromVersion;
  let notes = 0;
  for (const migration of MIGRATIONS) {
    if (migration.version <= version || migration.version > toVersion) continue;
    log("info", "migrating memory schema to v" + migration.version);
    const result = migration.run(root) || {};
    notes += Number(result.changed || 0);
    version = migration.version;
  }
  return { version, notes };
}
