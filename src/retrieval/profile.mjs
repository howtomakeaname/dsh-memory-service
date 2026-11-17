import crypto from "node:crypto";

const SYSTEM = [
  "You synthesize durable user preferences into a compact profile for a coding agent.",
  "Use only the supplied memories. Never invent a preference, fact, date, or attribution.",
  "If two memories conflict, say so explicitly instead of choosing one.",
  "Write 3-8 short bullet points, max 180 words, in the user's language.",
  "Return plain text only; no preamble, no markdown fence."
].join("\n");

function hashNotes(notes) {
  return crypto.createHash("sha256").update(notes.map((n) => [n.id, n.revision, n.updatedAt, n.description, n.body].join("\u0000")).join("\u0001")).digest("hex");
}

export function createProfileSynthesizer({ llm, log = () => {}, timeoutMs = 30000 } = {}) {
  const cache = new Map();
  async function synthesize(notes) {
    const selected = (notes || []).filter((n) => n.status === "active" && (n.type === "preference" || n.type === "user")).slice(0, 30);
    if (!llm?.available || selected.length === 0) return null;
    const key = hashNotes(selected);
    if (cache.has(key)) return cache.get(key);
    const memories = selected.map((n) => "- " + n.title + " [" + n.type + "]: " + (n.description || "") + "\n  " + String(n.body || "").replace(/\s+/g, " ").slice(0, 400)).join("\n");
    try {
      const result = await llm.complete({ system: SYSTEM, user: "Memories:\n" + memories, maxTokens: 500, timeoutMs });
      if (!result.ok) return null;
      const text = String(result.text || "").trim();
      if (text.length < 20 || text.length > 3000) return null;
      cache.set(key, text);
      if (cache.size > 50) cache.delete(cache.keys().next().value);
      return text;
    } catch (error) {
      log("debug", "profile synthesis failed: " + (error instanceof Error ? error.message : String(error)));
      return null;
    }
  }
  return { synthesize };
}
