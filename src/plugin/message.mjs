import { basename } from "node:path";
import { createHash, randomUUID } from "node:crypto";

export function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((part) => (part && part.type === "text" ? String(part.text || "") : "")).join("");
}

export function humanText(messages) {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message?.source?.kind !== "user") continue;
    return textOf(message.content).trim();
  }
  return "";
}

export function workspaceIdForPath(cwd) {
  if (typeof cwd !== "string" || !cwd) return "default";
  const hash = createHash("sha1").update(cwd).digest("hex").slice(0, 8);
  return basename(cwd).replace(/[^a-zA-Z0-9._-]/g, "-") + "-" + hash;
}

export function workspaceIdOf(session) {
  return workspaceIdForPath(session?.header?.cwd);
}

export function scopeOf(session) {
  return "workspace:" + workspaceIdOf(session);
}

export function contextMessage(text) {
  return {
    id: randomUUID(),
    role: "user",
    content: [{ type: "text", text }],
    source: { kind: "plugin:dsh-memory-service", form: "recall" }
  };
}

export function autoId(text) {
  return "auto-" + createHash("sha1").update(text.trim().toLowerCase()).digest("hex").slice(0, 16);
}

export function renderRows(rows) {
  if (!rows.length) return "no memory found";
  return rows.map((row, index) => {
    const body = String(row.body || "").replace(/\s+/g, " ").slice(0, 300);
    return (index + 1) + ". #" + row.id + " [" + (row.type || "memory") + "] " + row.title + "\n   " + (row.description || "") + (body ? "\n   " + body : "");
  }).join("\n");
}
