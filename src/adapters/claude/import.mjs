import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { parseMarkdown } from "../../frontmatter.mjs";
import { readIndexDescriptions } from "./discover.mjs";
import { hashText, slug } from "./utils.mjs";

export function importClaude(service, { source, project = "claude", scope, dryRun = false, force = false } = {}) {
  const dir = source || path.join(os.homedir(), ".claude", "memory");
  if (!fs.existsSync(dir)) throw new Error("Claude memory directory not found: " + dir);
  const descriptions = readIndexDescriptions(dir);
  const summary = { imported: 0, updated: 0, skipped: 0, conflicts: 0, errors: [] };
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".md") || file === "MEMORY.md") continue;
    const full = path.join(dir, file);
    try {
      const text = fs.readFileSync(full, "utf8");
      const parsed = parseMarkdown(text);
      const data = parsed.data || {};
      const meta = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
      const base = path.basename(file, ".md");
      const id = "claude-" + slug(project) + "-" + slug(base);
      const title = String(data.name || base);
      const description = String(data.description || descriptions.get(file) || "");
      const body = parsed.body.trim();
      const sourceHash = hashText([title, description, body].join("\n"));
      const existing = service.get(id, { scope: scope || "global" });
      if (existing) {
        const importedHash = existing.metadata?.imported_hash;
        const currentHash = hashText([existing.title, existing.description, existing.body].join("\n"));
        if (importedHash === sourceHash) {
          summary.skipped += 1;
          continue;
        }
        if (!force && importedHash && currentHash !== importedHash) {
          summary.conflicts += 1;
          summary.errors.push(file + ": local edits differ from last import; use --force to overwrite");
          continue;
        }
      }
      if (!dryRun) {
        service.upsert({
          id,
          scope: scope || "global",
          title,
          description,
          body,
          type: meta.type || "project",
          expectedRevision: existing ? existing.revision : undefined,
          sourceRefs: ["claude-code:" + full],
          metadata: {
            origin: "claude-code",
            import_source: full,
            imported_hash: sourceHash,
            claude_name: data.name || "",
            claude_description: data.description || "",
            originSessionId: meta.originSessionId || "",
            modified: meta.modified || ""
          }
        });
        if (existing) summary.updated += 1; else summary.imported += 1;
      } else {
        summary.imported += 1;
      }
    } catch (error) {
      summary.errors.push(file + ": " + error.message);
    }
  }
  return summary;
}
