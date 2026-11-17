import fs from "node:fs";
import path from "node:path";

const sleepArray = new Int32Array(new SharedArrayBuffer(4));

export function withFileLock(root, fn, { timeoutMs = 10000, staleMs = 30000 } = {}) {
  const file = path.join(root, ".memory.lock");
  fs.mkdirSync(root, { recursive: true });
  const start = Date.now();
  let fd;
  while (fd === undefined) {
    try {
      fd = fs.openSync(file, "wx");
      fs.writeFileSync(fd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      try {
        const stat = fs.statSync(file);
        if (Date.now() - stat.mtimeMs > staleMs) {
          fs.rmSync(file, { force: true });
          continue;
        }
      } catch { /* retry */ }
      if (Date.now() - start > timeoutMs) throw new Error("Memory lock timeout: " + file);
      Atomics.wait(sleepArray, 0, 0, 20);
    }
  }
  try {
    return fn();
  } finally {
    try { fs.closeSync(fd); } catch { /* ignore */ }
    try { fs.rmSync(file, { force: true }); } catch { /* ignore */ }
  }
}
