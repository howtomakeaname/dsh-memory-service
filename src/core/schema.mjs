import fs from "node:fs";
import path from "node:path";
import { migrateSchema } from "./migrations.mjs";

export const SCHEMA_VERSION = 2;

export function schemaPath(root) {
  return path.join(root, ".index", "schema.json");
}

export function ensureSchema(root) {
  const file = schemaPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ version: SCHEMA_VERSION, createdAt: new Date().toISOString() }, null, 2) + "\n");
    return { version: SCHEMA_VERSION, created: true };
  }
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(file, "utf8")); } catch { throw new Error("schema file is not valid JSON: " + file); }
  const version = Number(parsed?.version);
  if (!Number.isInteger(version) || version < 1) throw new Error("invalid schema version in " + file);
  if (version > SCHEMA_VERSION) throw new Error("memory schema " + version + " is newer than supported " + SCHEMA_VERSION);
  if (version < SCHEMA_VERSION) {
    const migrated = migrateSchema(root, version, SCHEMA_VERSION, () => {});
    fs.writeFileSync(file, JSON.stringify({ version: SCHEMA_VERSION, createdAt: new Date().toISOString(), migratedFrom: version, migratedNotes: migrated.notes }, null, 2) + "\n");
    return { version: SCHEMA_VERSION, created: false, migratedFrom: version, migratedNotes: migrated.notes };
  }
  return { version, created: false };
}
