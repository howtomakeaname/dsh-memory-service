import crypto from "node:crypto";

export function hashText(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

export function slug(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "memory";
}
