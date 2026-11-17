import crypto from "node:crypto";

export function slug(text) {
  const ascii = String(text || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
  return ascii || "memory";
}

export function hashNote(note) {
  return crypto.createHash("sha256").update([note.title, note.description, note.body, note.type].join("\n")).digest("hex");
}

export function safeWorkspaceId(id) {
  return String(id || "default").replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function newNoteId(text) {
  return slug(text || "memory") + "-" + crypto.randomBytes(3).toString("hex");
}
