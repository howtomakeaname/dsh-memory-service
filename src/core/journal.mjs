import fs from "node:fs";
import { journalPath } from "./paths.mjs";

export function appendJournal(root, workspaceId, event) {
  const line = JSON.stringify({ ts: new Date().toISOString(), workspace: workspaceId, ...event }) + "\n";
  fs.appendFileSync(journalPath(root), line);
}
