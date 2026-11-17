export function scopeClause(scope) {
  if (String(scope).startsWith("workspace:")) return { sql: "(scope = ? OR scope = 'global')", args: [scope] };
  return { sql: "scope = 'global'", args: [] };
}
