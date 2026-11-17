export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { out._.push(arg); continue; }
    const key = arg.slice(2);
    if (key === "force" || key === "hard" || key === "dry-run" || key === "all-scopes") { out[key] = true; continue; }
    const value = argv[++i];
    if (value == null) throw new Error("Missing value for --" + key);
    out[key] = value;
  }
  return out;
}
