import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { ftsQuery } from "./fts-query.mjs";
import { scopeClause } from "./scope.mjs";

export class MemoryIndex {
  constructor(root) {
    this.root = root;
    this.file = path.join(root, ".index", "memory.db");
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.db = new DatabaseSync(this.file);
    this.hasFts = true;
    this.db.exec("PRAGMA busy_timeout = 15000;");
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, scope TEXT NOT NULL, path TEXT, title TEXT, description TEXT, body TEXT, type TEXT, status TEXT, hash TEXT, updated_at TEXT, revision INTEGER);");
    try {
      this.db.exec("CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(id UNINDEXED, title, description, body, tokenize='unicode61');");
    } catch {
      this.hasFts = false;
    }
  }

  sync(note) {
    const hash = note.hash || "";
    this.db.prepare("INSERT INTO notes (id,scope,path,title,description,body,type,status,hash,updated_at,revision) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET scope=excluded.scope,path=excluded.path,title=excluded.title,description=excluded.description,body=excluded.body,type=excluded.type,status=excluded.status,hash=excluded.hash,updated_at=excluded.updated_at,revision=excluded.revision").run(note.id, note.scope, note.path || "", note.title || "", note.description || "", note.body || "", note.type || "", note.status || "active", hash, note.updatedAt || "", note.revision || 1);
    if (this.hasFts) {
      this.db.prepare("DELETE FROM notes_fts WHERE id = ?").run(note.id);
      this.db.prepare("INSERT INTO notes_fts (id,title,description,body) VALUES (?,?,?,?)").run(note.id, note.title || "", note.description || "", note.body || "");
    }
  }

  remove(id) {
    this.db.prepare("DELETE FROM notes WHERE id = ?").run(id);
    if (this.hasFts) this.db.prepare("DELETE FROM notes_fts WHERE id = ?").run(id);
  }

  rebuild(notes) {
    this.db.exec("DELETE FROM notes;");
    if (this.hasFts) this.db.exec("DELETE FROM notes_fts;");
    for (const note of notes) this.sync(note);
  }

  search(query, { scope = "global", limit = 10 } = {}) {
    const { sql: scopeSql, args: scopeArgs } = scopeClause(scope);
    const fts = ftsQuery(query);
    if (fts && this.hasFts) {
      try {
        const rows = this.db.prepare("SELECT n.* FROM notes_fts f JOIN notes n ON n.id = f.id WHERE notes_fts MATCH ? AND n.status = 'active' AND " + scopeSql + " ORDER BY rank LIMIT ?").all(fts, ...scopeArgs, limit);
        if (rows.length > 0) return rows;
      } catch { /* fall through */ }
    }
    const like = "%" + String(query || "").replace(/[%_]/g, " ") + "%";
    return this.db.prepare("SELECT * FROM notes WHERE status = 'active' AND " + scopeSql + " AND (title LIKE ? OR description LIKE ? OR body LIKE ?) ORDER BY updated_at DESC LIMIT ?").all(...scopeArgs, like, like, like, limit);
  }

  close() {
    this.db.close();
  }
}
