import crypto from "node:crypto";

function jobId(scope, text) {
  const hash = crypto.createHash("sha1").update(String(scope) + "\n" + String(text).trim().toLowerCase()).digest("hex").slice(0, 16);
  return "auto-" + hash;
}

export function commitJob(service, job) {
  if (service.get(job.id, { scope: job.scope })) return false;
  service.upsert({
    id: job.id,
    scope: job.scope,
    title: job.title || String(job.text || "").replace(/\s+/g, " ").slice(0, 80),
    description: "Implicit durable statement captured from a completed turn.",
    body: String(job.text || ""),
    type: "feedback",
    sourceRefs: ["session:" + (job.session_id || "") + ":turn:" + (job.turn == null ? "" : job.turn)],
    metadata: { capture: "queue", session_id: job.session_id || "", turn: job.turn == null ? null : Number(job.turn) }
  });
  return true;
}

export function commitCandidate(service, candidate, { sessionId, turn, scope } = {}) {
  const text = String(candidate.text || "").trim();
  if (!text) return false;
  const targetScope = candidate.scope === "global" ? "global" : scope;
  const id = jobId(targetScope, text);
  if (service.get(id, { scope: targetScope })) return false;
  service.upsert({
    id,
    scope: targetScope,
    title: candidate.title || text.slice(0, 80),
    description: "Extracted from a completed turn.",
    body: text,
    type: candidate.type || "fact",
    sourceRefs: ["session:" + (sessionId || "") + ":turn:" + (turn == null ? "" : turn)],
    metadata: { capture: "llm", confidence: candidate.confidence == null ? null : Number(candidate.confidence), evidence: candidate.evidence || "", session_id: sessionId || "", turn: turn == null ? null : Number(turn) }
  });
  return true;
}

export class CaptureQueue {
  constructor(db) {
    this.db = db;
    this.db.exec("CREATE TABLE IF NOT EXISTS capture_jobs (id TEXT PRIMARY KEY, scope TEXT NOT NULL, session_id TEXT, turn INTEGER, text TEXT NOT NULL, title TEXT, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, created_at TEXT, updated_at TEXT, error TEXT, kind TEXT NOT NULL DEFAULT 'text', payload TEXT);");
    const cols = this.db.prepare("PRAGMA table_info(capture_jobs)").all().map((c) => c.name);
    if (!cols.includes("kind")) this.db.exec("ALTER TABLE capture_jobs ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'");
    if (!cols.includes("payload")) this.db.exec("ALTER TABLE capture_jobs ADD COLUMN payload TEXT");
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const row of this.db.prepare("SELECT id, updated_at FROM capture_jobs WHERE status = 'running'").all()) {
      if (Date.parse(row.updated_at || "") < cutoff) this.db.prepare("UPDATE capture_jobs SET status = 'pending' WHERE id = ?").run(row.id);
    }
  }

  enqueue({ id, scope, sessionId, turn, text, title, kind = "text", payload } = {}) {
    const value = String(text || "").trim();
    if (!value) return null;
    const job = id || jobId(scope, value);
    const now = new Date().toISOString();
    this.db.prepare("INSERT OR IGNORE INTO capture_jobs (id,scope,session_id,turn,text,title,status,attempts,created_at,updated_at,kind,payload) VALUES (?,?,?,?,?,?, 'pending', 0, ?, ?, ?, ?)").run(job, scope, sessionId || "", turn == null ? null : Number(turn), value, title || "", now, now, kind, payload == null ? null : String(payload));
    return job;
  }

  pending(limit = 20) {
    return this.db.prepare("SELECT * FROM capture_jobs WHERE status = 'pending' ORDER BY created_at LIMIT ?").all(limit);
  }

  stats() {
    const rows = this.db.prepare("SELECT status, COUNT(*) AS n FROM capture_jobs GROUP BY status").all();
    const out = { pending: 0, running: 0, done: 0, failed: 0 };
    for (const row of rows) out[row.status] = Number(row.n);
    return out;
  }

  #mark(id, status, error) {
    this.db.prepare("UPDATE capture_jobs SET status = ?, updated_at = ?, error = ?, attempts = attempts + ? WHERE id = ?").run(status, new Date().toISOString(), error || null, status === "failed" ? 1 : 0, id);
  }

  drain(service, { limit = 50, log } = {}) {
    let processed = 0;
    let failed = 0;
    for (const job of this.pending(limit)) {
      if (job.kind === "turn") continue;
      this.db.prepare("UPDATE capture_jobs SET status = 'running', updated_at = ? WHERE id = ?").run(new Date().toISOString(), job.id);
      try {
        if (commitJob(service, job)) processed += 1;
        this.#mark(job.id, "done");
      } catch (error) {
        failed += 1;
        const attempts = Number(job.attempts || 0) + 1;
        this.#mark(job.id, attempts >= 3 ? "failed" : "pending", error instanceof Error ? error.message : String(error));
        log?.("warn", "capture job failed: " + job.id + " " + (error instanceof Error ? error.message : String(error)));
      }
    }
    return { processed, failed, pending: this.stats().pending };
  }

  async drainAsync(service, { limit = 20, log, extractor } = {}) {
    let processed = 0;
    let failed = 0;
    for (const job of this.pending(limit)) {
      if (job.kind === "turn" && !extractor) continue;
      this.db.prepare("UPDATE capture_jobs SET status = 'running', updated_at = ? WHERE id = ?").run(new Date().toISOString(), job.id);
      try {
        if (job.kind === "turn") {
          const payload = JSON.parse(job.payload || "{}");
          const result = await extractor.extract({ messages: payload.messages || [], scope: payload.scope || job.scope });
          if (!result.ok) throw new Error(result.error || "extraction failed");
          for (const candidate of result.candidates || []) commitCandidate(service, candidate, { sessionId: job.session_id, turn: job.turn, scope: job.scope });
        } else if (commitJob(service, job)) {
          processed += 1;
        }
        if (job.kind === "turn") processed += 1;
        this.#mark(job.id, "done");
      } catch (error) {
        failed += 1;
        const attempts = Number(job.attempts || 0) + 1;
        this.#mark(job.id, attempts >= 3 ? "failed" : "pending", error instanceof Error ? error.message : String(error));
        log?.("warn", "capture job failed: " + job.id + " " + (error instanceof Error ? error.message : String(error)));
      }
    }
    return { processed, failed, pending: this.stats().pending };
  }
}
