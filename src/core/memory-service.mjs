import fs from "node:fs";
import path from "node:path";
import { MemoryIndex } from "../index-db.mjs";
import { MemoryConflictError } from "./errors.mjs";
import { STABLE_TYPES, TYPES } from "./constants.mjs";
import { hashNote, newNoteId, safeWorkspaceId } from "./identity.mjs";
import { listWorkspaces, notePath, normalizeScope, notesDir, resolveRoot, scopeDir } from "./paths.mjs";
import { noteFromFile, serializeNote } from "./note.mjs";
import { writeMemoryIndex } from "./index-file.mjs";
import { appendJournal } from "./journal.mjs";
import { withFileLock } from "./lock.mjs";

export class MemoryService {
  constructor({ root, workspaceId = "default" } = {}) {
    this.root = resolveRoot(root);
    this.workspaceId = safeWorkspaceId(workspaceId);
    this.index = null;
  }

  init() {
    for (const dir of [this.root, path.join(this.root, "global", "notes"), path.join(this.root, "workspaces"), path.join(this.root, "journal"), path.join(this.root, ".index")]) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.index = new MemoryIndex(this.root);
    this.#ensureIndex();
    return this;
  }

  #ensureIndex() {
    if (!this.index) this.index = new MemoryIndex(this.root);
    const notes = this.list("global", { allScopes: true });
    const row = this.index.db.prepare("SELECT COUNT(*) AS n FROM notes").get();
    if (Number(row.n) !== notes.length) this.index.rebuild(notes);
  }

  defaultScope() {
    return "workspace:" + this.workspaceId;
  }

  normalizeScope(scope) {
    return normalizeScope(scope, this.workspaceId);
  }

  #scopeDir(scope) {
    return scopeDir(this.root, this.normalizeScope(scope));
  }

  #notesDir(scope) {
    return notesDir(this.root, this.normalizeScope(scope));
  }

  #notePath(scope, id) {
    return notePath(this.root, this.normalizeScope(scope), id);
  }

  #journal(event) {
    appendJournal(this.root, this.workspaceId, event);
  }

  #write(note) {
    const dir = this.#notesDir(note.scope);
    fs.mkdirSync(dir, { recursive: true });
    const target = this.#notePath(note.scope, note.id);
    const tmp = target + ".tmp-" + process.pid + "-" + Date.now();
    fs.writeFileSync(tmp, serializeNote(note));
    fs.renameSync(tmp, target);
    note.path = target;
    note.hash = hashNote(note);
    this.index.sync(note);
    this.#writeIndexFile(note.scope);
    this.#journal({ event: "write", id: note.id, scope: note.scope, revision: note.revision, hash: note.hash });
    return note;
  }

  #writeIndexFile(scope) {
    const notes = this.list(scope, { allScopes: false }).filter((n) => n.status === "active");
    writeMemoryIndex(this.#scopeDir(scope), notes);
  }

  list(scope = "global", { allScopes = false, includeForgotten = false } = {}) {
    const notes = [];
    const scopes = allScopes ? ["global", ...this.listWorkspaces().map((w) => "workspace:" + w)] : [this.normalizeScope(scope)];
    for (const s of scopes) {
      const dir = this.#notesDir(s);
      if (!fs.existsSync(dir)) continue;
      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith(".md")) continue;
        try {
          const note = noteFromFile(path.join(dir, file), s);
          if (!includeForgotten && note.status === "forgotten") continue;
          notes.push(note);
        } catch { /* skip unreadable note */ }
      }
    }
    return notes.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  }

  listWorkspaces() {
    return listWorkspaces(this.root);
  }

  get(id, { scope } = {}) {
    const scopes = scope ? [this.normalizeScope(scope)] : ["global", ...this.listWorkspaces().map((w) => "workspace:" + w)];
    for (const s of scopes) {
      const file = this.#notePath(s, id);
      if (fs.existsSync(file)) return noteFromFile(file, s);
    }
    return null;
  }

  upsert(input) {
    return withFileLock(this.root, () => this.#upsertLocked(input));
  }

  #upsertLocked(input) {
    const scope = this.normalizeScope(input.scope);
    const existing = input.id ? this.get(input.id, { scope }) : null;
    if (input.expectedRevision != null && existing && Number(input.expectedRevision) !== existing.revision) {
      throw new MemoryConflictError("Memory revision conflict for " + existing.id, existing);
    }
    const now = new Date().toISOString();
    const note = {
      id: existing ? existing.id : (input.id || newNoteId(input.title || input.body || "memory")),
      scope,
      title: String(input.title || existing?.title || "Memory"),
      description: String(input.description || ""),
      body: String(input.body || ""),
      type: TYPES.has(String(input.type)) ? String(input.type) : (existing?.type || "project"),
      status: input.status || "active",
      revision: existing ? existing.revision + 1 : 1,
      supersedes: input.supersedes ?? existing?.supersedes ?? null,
      supersededBy: null,
      sourceRefs: input.sourceRefs || existing?.sourceRefs || [],
      metadata: { ...(existing?.metadata || {}), ...(input.metadata || {}) },
      createdAt: existing?.createdAt || now,
      updatedAt: now
    };
    this.#write(note);
    if (note.supersedes) {
      const old = this.get(note.supersedes, { scope });
      if (old && old.status !== "forgotten") {
        old.status = "superseded";
        old.supersededBy = note.id;
        old.revision += 1;
        old.updatedAt = now;
        this.#write(old);
      }
    }
    return note;
  }

  forget(id, { scope, hard = false } = {}) {
    return withFileLock(this.root, () => this.#forgetLocked(id, { scope, hard }));
  }

  #forgetLocked(id, { scope, hard = false } = {}) {
    const note = this.get(id, { scope });
    if (!note) return null;
    if (hard) {
      fs.rmSync(note.path, { force: true });
      this.index.remove(note.id);
      this.#writeIndexFile(note.scope);
      this.#journal({ event: "forget-hard", id: note.id, scope: note.scope });
      return { ...note, status: "forgotten", hard: true };
    }
    note.status = "forgotten";
    note.revision += 1;
    note.updatedAt = new Date().toISOString();
    this.#write(note);
    this.index.remove(note.id);
    this.#journal({ event: "forget", id: note.id, scope: note.scope });
    return note;
  }

  search(query, { scope, limit = 10 } = {}) {
    const s = this.normalizeScope(scope);
    const rows = this.index.search(query, { scope: s, limit });
    const notes = [];
    for (const row of rows) {
      const note = this.get(row.id, { scope: row.scope || s });
      if (!note || note.status !== "active") {
        this.index.remove(row.id);
        continue;
      }
      if (note.hash && row.hash && note.hash !== row.hash) this.index.sync(note);
      notes.push(note);
    }
    if (notes.length === 0 && String(query).trim()) return this.#searchFiles(query, s, limit);
    return notes;
  }

  #searchFiles(query, scope, limit) {
    const tokens = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    const hits = [];
    for (const note of this.list(scope, { allScopes: false })) {
      const haystack = [note.title, note.description, note.body].join(" ").toLowerCase();
      if (tokens.some((token) => haystack.includes(token))) {
        this.index.sync(note);
        hits.push(note);
        if (hits.length >= limit) break;
      }
    }
    return hits;
  }

  rebuild() {
    const notes = this.list("global", { allScopes: true, includeForgotten: true });
    this.index.rebuild(notes.filter((n) => n.status !== "forgotten"));
    for (const s of ["global", ...this.listWorkspaces().map((w) => "workspace:" + w)]) this.#writeIndexFile(s);
    return notes.length;
  }

  context({ scope, query = "", budgetTokens = 1200 } = {}) {
    const s = this.normalizeScope(scope);
    const all = this.list(s, { allScopes: false }).filter((n) => n.status === "active");
    const stable = all.filter((n) => STABLE_TYPES.has(n.type)).slice(0, 20);
    const recalled = query ? this.search(query, { scope: s, limit: 10 }).map((r) => this.get(r.id, { scope: r.scope })).filter(Boolean) : [];
    const seen = new Set();
    const picked = [];
    let chars = 0;
    for (const n of [...stable, ...recalled]) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      const block = "- [" + n.type + "] " + n.title + ": " + n.description + (n.body ? "\n  " + n.body.slice(0, 400) : "");
      if (chars + block.length > budgetTokens * 4) continue;
      picked.push(n);
      chars += block.length;
    }
    return {
      stable,
      recalled: picked.filter((n) => !stable.includes(n)),
      notes: picked,
      text: picked.map((n) => "- [" + n.type + "] " + n.title + ": " + n.description + (n.body ? "\n  " + n.body.replace(/\s+/g, " ").slice(0, 280) : "")).join("\n"),
      tokens: Math.ceil(chars / 4)
    };
  }

  close() {
    if (this.index) this.index.close();
  }
}
