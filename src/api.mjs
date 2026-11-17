const PREFIX = "/memory-service/api";
const MAX_BODY_BYTES = 1024 * 1024;

const STATUS = { "bad-request": 400, forbidden: 403, "not-found": 404, conflict: 409, "not-ready": 503, internal: 500 };

export class MemoryApiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MemoryApiError";
    this.code = code;
  }
  get status() { return STATUS[this.code] || 500; }
}

function writeJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "content-length": Buffer.byteLength(body) });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += typeof chunk === "string" ? Buffer.byteLength(chunk) : chunk.length;
    if (size > MAX_BODY_BYTES) throw new MemoryApiError("bad-request", "request body too large");
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (!size) return {};
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not object");
    return parsed;
  } catch {
    throw new MemoryApiError("bad-request", "request body must be a JSON object");
  }
}

export function createMemoryApiRoute({ methods, admits, log = () => {} }) {
  return {
    kind: "prefix",
    path: PREFIX,
    async handler(req, res) {
      try {
        if (typeof admits === "function" && admits(req) !== true) return writeJson(res, 403, { ok: false, error: { code: "forbidden", message: "forbidden" } });
        if (req.method !== "POST") return writeJson(res, 405, { ok: false, error: { code: "method-not-allowed", message: "POST required" } });
        const pathname = new URL(req.url || "/", "http://dsh.internal").pathname;
        if (!pathname.startsWith(PREFIX + "/")) return writeJson(res, 404, { ok: false, error: { code: "not-found", message: "unknown endpoint" } });
        const method = pathname.slice(PREFIX.length + 1);
        if (method.includes("/") || !Object.hasOwn(methods, method)) return writeJson(res, 404, { ok: false, error: { code: "not-found", message: "unknown method" } });
        try {
          const value = await methods[method](await readBody(req));
          return writeJson(res, 200, { ok: true, value });
        } catch (error) {
          if (error instanceof MemoryApiError) return writeJson(res, error.status, { ok: false, error: { code: error.code, message: error.message } });
          log("warn", "memory api " + method + " failed: " + (error instanceof Error ? error.message : String(error)));
          return writeJson(res, 500, { ok: false, error: { code: "internal", message: "memory operation failed" } });
        }
      } catch (error) {
        log("warn", "memory api handler failed: " + (error instanceof Error ? error.message : String(error)));
        try { writeJson(res, 500, { ok: false, error: { code: "internal", message: "memory api failed" } }); } catch { try { res.destroy?.(); } catch { /* ignore */ } }
      }
    }
  };
}
