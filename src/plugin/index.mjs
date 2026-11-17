import os from "node:os";
import { MemoryService } from "../store.mjs";
import { createCaptureHandler } from "./capture.mjs";
import { createPreStepHandler } from "./inject.mjs";
import { createTools } from "./tools.mjs";
import { createSessionState } from "./state.mjs";
import { CaptureQueue } from "../capture/queue.mjs";
import { createLlmClient } from "../capture/llm.mjs";
import { createExtractor } from "../capture/extract.mjs";

export const name = "memory-service";
export const inject = ["tools", "agents", "sessions"];

const TAG = "[dsh-memory-service]";

export function apply(ctx, rawConfig = {}) {
  const config = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
  const root = config.root || process.env.DSH_MEMORY_HOME || os.homedir() + "/.dsh/memory-service";
  const capture = config.capture !== false;
  const budgetTokens = Number(config.budgetTokens || 1200);
  const log = (level, message) => {
    try {
      const logger = ctx.logger || console;
      const fn = typeof logger[level] === "function" ? logger[level].bind(logger) : logger.info?.bind(logger);
      fn?.(TAG + " " + message);
    } catch { /* ignore */ }
  };

  let service = null;
  try {
    service = new MemoryService({ root }).init();
  } catch (error) {
    log("warn", "memory disabled: " + (error instanceof Error ? error.message : String(error)));
  }

  const stateOf = createSessionState();
  const llm = createLlmClient(ctx, config.llm || {}, log);
  const extractor = llm.available ? createExtractor({ llm, log, minConfidence: Number(config.minConfidence || 0.55) }) : null;
  const extractEveryTurns = Number(config.extractEveryTurns || 1);
  let queue = null;
  if (service) {
    try {
      queue = new CaptureQueue(service.index.db);
      queue.drain(service, { limit: 100, log });
      if (extractor) void queue.drainAsync(service, { limit: 100, extractor, log }).catch((error) => log("warn", "startup extraction failed: " + (error instanceof Error ? error.message : String(error))));
    } catch (error) {
      log("warn", "capture queue disabled: " + (error instanceof Error ? error.message : String(error)));
      queue = null;
    }
    ctx.on("session/event", createCaptureHandler({ service, queue, capture, extractor, extractEveryTurns, log, stateOf }));
    ctx.on("agent/pre-step", createPreStepHandler({ service, budgetTokens, log, stateOf }));
    ctx.effect(() => {
      const disposers = createTools({ ctx, service, root, queue, extractor });
      return () => { for (const dispose of disposers) { try { dispose?.(); } catch { /* ignore */ } } };
    }, "dsh-memory-service: tools");
  }

  ctx.effect(() => () => { try { service?.close(); } catch { /* ignore */ } }, "dsh-memory-service: close");
}
