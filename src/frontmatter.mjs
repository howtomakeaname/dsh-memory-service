const DELIM = "---";

function unquote(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

export function parseMarkdown(text) {
  const normalized = String(text).replace(/\r\n/g, "\n");
  if (!normalized.startsWith(DELIM + "\n")) {
    return { data: {}, body: normalized };
  }
  const end = normalized.indexOf("\n" + DELIM, DELIM.length);
  if (end === -1) return { data: {}, body: normalized };
  const header = normalized.slice(DELIM.length + 1, end);
  const body = normalized.slice(end + DELIM.length + 2).replace(/^\n/, "");
  const data = {};
  let current = data;
  let currentKey = null;
  let currentIndent = -1;
  for (const raw of header.split("\n")) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const indent = raw.match(/^\s*/)[0].length;
    const line = raw.trim();
    if (line.startsWith("- ")) {
      if (currentKey && indent > currentIndent) {
        if (!Array.isArray(data[currentKey])) data[currentKey] = [];
        data[currentKey].push(unquote(line.slice(2)));
      }
      continue;
    }
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (indent > currentIndent && current !== data) {
      current[key] = value ? unquote(value) : "";
    } else if (!value) {
      current = {};
      data[key] = current;
      currentKey = key;
      currentIndent = indent;
    } else {
      data[key] = unquote(value);
      currentKey = key;
      current = data;
      currentIndent = indent;
    }
  }
  return { data, body };
}

function quote(value) {
  const s = String(value);
  if (s === "" || /[:#\n]|^\s|\s$/.test(s)) return JSON.stringify(s);
  return s;
}

export function stringifyMarkdown(data, body) {
  const lines = [DELIM];
  for (const [key, value] of Object.entries(data)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      lines.push(key + ":");
      for (const item of value) lines.push("  - " + quote(item));
    } else if (typeof value === "object") {
      lines.push(key + ":");
      for (const [k, v] of Object.entries(value)) {
        if (v == null) continue;
        lines.push("  " + k + ": " + quote(v));
      }
    } else {
      lines.push(key + ": " + quote(value));
    }
  }
  lines.push(DELIM, "");
  const text = String(body ?? "");
  return lines.join("\n") + (text.endsWith("\n") ? text : text + "\n");
}
