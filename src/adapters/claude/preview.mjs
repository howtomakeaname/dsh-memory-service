import fs from "node:fs";
import path from "node:path";
import { parseMarkdown } from "../../frontmatter.mjs";
import { readIndexDescriptions } from "./discover.mjs";
import { hashText, slug } from "./utils.mjs";

function entryFromFile(file, project, source, descriptions) {
  const text = fs.readFileSync(file, "utf8");
  const parsed = parseMarkdown(text);
  const data = parsed.data || {};
  const meta = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
  const base = path.basename(file, ".md");
  const title = String(data.name || base);
  const description = String(data.description || descriptions.get(path.basename(file)) || "");
  const body = parsed.body.trim();
  const sourceHash = hashText([title, description, body].join("\n"));
  return {
    id: "claude-" + slug(project) + "-" + slug(base),
    project, source, file: path.basename(file),
    title, description, body,
    type: meta.type || "project",
    sourceHash,
    metadata: {
      origin: "claude-code",
      claude_name: data.name || "",
      claude_description: data.description || "",
      originSessionId: meta.originSessionId || "",
      modified: meta.modified || ""
    }
  };
}

export function readClaudeEntries({ project, dir }) {
  if (!fs.existsSync(dir)) return [];
  const descriptions = readIndexDescriptions(dir);
  const entries = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".md") || name === "MEMORY.md") continue;
    try { entries.push(entryFromFile(path.join(dir, name), project, dir, descriptions)); } catch { /* skip unreadable */ }
  }
  return entries;
}

export function previewClaudeSources(service, sources, { scope } = {}) {
  const entries = [];
  for (const source of sources) {
    for (const entry of readClaudeEntries(source)) {
      const existing = service.get(entry.id, { scope: scope || service.defaultScope() });
      entries.push({ ...entry, scope: scope === "global" ? "global" : (String(scope).startsWith("workspace:") ? scope : "workspace"), existing: existing ? { revision: existing.revision, title: existing.title } : null });
    }
  }
  return entries;
}

export function importClaudeEntries(service, entries, { force = false } = {}) {
  const summary = { imported: 0, updated: 0, skipped: 0, conflicts: 0, errors: [] };
  for (const entry of entries || []) {
    try {
      const scope = entry.scope === "global" ? "global" : (String(entry.scope || "").startsWith("workspace:") ? entry.scope : service.defaultScope());
      const sourceHash = hashText([entry.title, entry.description, entry.body].join("\n"));
      const existing = service.get(entry.id, { scope });
      if (existing) {
        const importedHash = existing.metadata?.imported_hash;
        const currentHash = hashText([existing.title, existing.description, existing.body].join("\n"));
        if (importedHash === sourceHash) { summary.skipped += 1; continue; }
        if (!force && importedHash && currentHash !== importedHash) {
          summary.conflicts += 1;
          summary.errors.push(entry.file + ": local edits differ from last import; enable overwrite");
          continue;
        }
      }
      service.upsert({
        id: entry.id, scope,
        title: String(entry.title || entry.file || "Memory").slice(0, 200),
        description: String(entry.description || "").slice(0, 200),
        body: String(entry.body || ""),
        type: entry.type || "project",
        expectedRevision: existing ? existing.revision : undefined,
        sourceRefs: ["claude-code:" + path.join(entry.source, entry.file)],
        metadata: {
          ...(entry.metadata || {}),
          origin: "claude-code",
          import_source: path.join(entry.source, entry.file),
          imported_hash: sourceHash,
          imported_at: new Date().toISOString()
        }
      });
      if (existing) summary.updated += 1; else summary.imported += 1;
    } catch (error) {
      summary.errors.push((entry.file || "memory") + ": " + (error instanceof Error ? error.message : String(error)));
    }
  }
  return summary;
}
