const SYSTEM = [
  "You turn a user's question into short retrieval queries for a long-term memory store.",
  "Return JSON only: an array of 2-4 short query strings.",
  "Capture entities, project names, preferences, dates and likely paraphrases of the same fact.",
  "Do not answer the question. Do not add facts. Keep each query under 80 characters."
].join("\n");

function parse(text) {
  const raw = String(text || "").trim();
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end <= start) return [];
  try {
    const value = JSON.parse(raw.slice(start, end + 1));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export function createQueryExpander({ llm, log = () => {}, timeoutMs = 15000 } = {}) {
  async function expand(query) {
    const original = String(query || "").trim();
    if (!original || !llm?.available) return [original].filter(Boolean);
    try {
      const result = await llm.complete({ system: SYSTEM, user: original, maxTokens: 240, timeoutMs });
      if (!result.ok) return [original];
      const queries = parse(result.text)
        .map((q) => String(q || "").trim())
        .filter((q) => q.length >= 2 && q.length <= 120)
        .slice(0, 4);
      return [original, ...queries.filter((q) => q.toLowerCase() !== original.toLowerCase())];
    } catch (error) {
      log("debug", "query expansion failed: " + (error instanceof Error ? error.message : String(error)));
      return [original];
    }
  }
  return { expand, enabled: Boolean(llm?.available) };
}
