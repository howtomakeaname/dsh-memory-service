import fs from "node:fs";
import path from "node:path";
import { stringifyMarkdown } from "../../frontmatter.mjs";

export function exportClaude(service, { target, scope = "global", force = false } = {}) {
  if (!target) throw new Error("export target required");
  fs.mkdirSync(target, { recursive: true });
  const notes = service.list(scope, { allScopes: false }).filter((n) => n.status === "active");
  const lines = ["# Memory", "", "Imported from dsh-memory-service.", ""];
  for (const note of notes) {
    const file = note.id + ".md";
    lines.push("- [" + note.title + "](" + file + ") — " + (note.description || ""));
    const type = ["user", "feedback", "project", "reference"].includes(note.type) ? note.type : "project";
    const text = stringifyMarkdown({
      name: note.title,
      description: note.description,
      metadata: {
        node_type: "memory",
        type,
        modified: note.updatedAt || new Date().toISOString(),
        ...(note.metadata?.originSessionId ? { originSessionId: note.metadata.originSessionId } : {})
      }
    }, note.body);
    const dest = path.join(target, file);
    if (fs.existsSync(dest) && !force) throw new Error("Refusing to overwrite " + dest + " (use --force)");
    fs.writeFileSync(dest, text);
  }
  const indexFile = path.join(target, "MEMORY.md");
  if (fs.existsSync(indexFile) && !force) throw new Error("Refusing to overwrite " + indexFile + " (use --force)");
  fs.writeFileSync(indexFile, lines.join("\n") + "\n");
  return { exported: notes.length, target };
}
