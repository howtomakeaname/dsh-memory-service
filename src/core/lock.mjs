import fs from "node:fs";
import path from "node:path";

const sleepArray = new Int32Array(new SharedArrayBuffer(4));

export function withFileLock(root, fn, { timeoutMs = 30000, staleMs = 120000 } = {}) {
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
        let dead = false;
        try {
          const info = JSON.parse(fs.readFileSync(file, "utf8"));
          if (info && Number.isInteger(info.pid) && info.pid !== process.pid) {
            try { process.kill(info.pid, 0); } catch (killError) { if (killError?.code === "ESRCH") dead = true; }
          }
        } catch { /* ignore malformed lock */ }
        if (dead || Date.now() - stat.mtimeMs > staleMs) {
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
