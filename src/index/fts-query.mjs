export function ftsQuery(text) {
  const tokens = String(text || "").toLowerCase().match(/[\p{L}\p{N}_-]+/gu) || [];
  return tokens.map((t) => '"' + t.replace(/"/g, '""') + '"').join(" OR ");
}
