import fs from "node:fs";
import path from "node:path";
import { parseMarkdown, stringifyMarkdown } from "../frontmatter.mjs";
import { TYPES } from "./constants.mjs";
import { hashNote } from "./identity.mjs";

export function noteFromFile(file, scope) {
  const parsed = parseMarkdown(fs.readFileSync(file, "utf8"));
  const data = parsed.data || {};
  const meta = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
  const base = path.basename(file, ".md");
  const note = {
    id: String(data.id || base),
    scope: String(data.scope || scope),
    title: String(data.name || data.title || base),
    description: String(data.description || ""),
    body: parsed.body.trim(),
    type: TYPES.has(String(data.type || meta.type)) ? String(data.type || meta.type) : "project",
    status: String(data.status || "active"),
    revision: Number(data.revision || 1),
    supersedes: data.supersedes ? String(data.supersedes) : null,
    supersededBy: data.superseded_by ? String(data.superseded_by) : null,
    sourceRefs: Array.isArray(data.source_refs) ? data.source_refs.map(String) : [],
    key: data.key ? String(data.key) : null,
    metadata: meta,
    createdAt: String(data.created_at || meta.created || meta.modified || ""),
    updatedAt: String(data.updated_at || meta.modified || ""),
    path: file
  };
  note.hash = hashNote(note);
  return note;
}

export function serializeNote(note) {
  return stringifyMarkdown({
    name: note.title,
    description: note.description,
    id: note.id,
    scope: note.scope,
    type: note.type,
    status: note.status,
    revision: note.revision,
    supersedes: note.supersedes || undefined,
    superseded_by: note.supersededBy || undefined,
    created_at: note.createdAt || undefined,
    updated_at: note.updatedAt || undefined,
    key: note.key || undefined,
    source_refs: note.sourceRefs && note.sourceRefs.length ? note.sourceRefs : undefined,
    metadata: { node_type: "memory", type: note.type, modified: note.updatedAt || new Date().toISOString(), ...(note.metadata || {}) }
  }, note.body);
}
