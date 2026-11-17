import os from "node:os";
import { MemoryService } from "../store.mjs";
import { createCaptureHandler } from "./capture.mjs";
import { createPreStepHandler } from "./inject.mjs";
import { createTools } from "./tools.mjs";
import { createSessionState } from "./state.mjs";
import { CaptureQueue } from "../capture/queue.mjs";
import { createLlmClient } from "../capture/llm.mjs";
import { createExtractor } from "../capture/extract.mjs";
import { createMemoryApiRoute } from "../api.mjs";

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
    const serialize = (note) => note ? ({
      id: note.id, scope: note.scope, title: note.title, description: note.description,
      body: note.body, type: note.type, status: note.status, revision: note.revision,
      updatedAt: note.updatedAt, sourceRefs: note.sourceRefs, metadata: note.metadata
    }) : null;
    const payloadScope = (payload) => payload?.scope === "global" ? "global" : service.defaultScope();
    const apiRoute = createMemoryApiRoute({
      log,
      admits: (req) => {
        try {
          const connection = typeof ctx.get === "function" ? ctx.get("connection") : undefined;
          if (!connection || typeof connection.requestRejection !== "function") return true;
          return connection.requestRejection(req) === undefined;
        } catch { return false; }
      },
      methods: {
        state: () => ({
          root, defaultScope: service.defaultScope(), workspaces: service.listWorkspaces(),
          notes: service.list("global", { allScopes: true, includeForgotten: true }).length,
          active: service.list("global", { allScopes: true }).length,
          capture: queue ? queue.stats() : null, extractor: Boolean(extractor)
        }),
        list: (payload) => {
          const scope = payload?.allScopes ? "global" : payloadScope(payload);
          return service.list(scope, { allScopes: Boolean(payload?.allScopes), includeForgotten: Boolean(payload?.includeForgotten) }).map(serialize);
        },
        search: (payload) => {
          const query = String(payload?.query || "");
          const limit = Number(payload?.limit || 20);
          if (payload?.scope === "all") {
            const merged = new Map();
            for (const note of [...service.search(query, { scope: service.defaultScope(), limit }), ...service.search(query, { scope: "global", limit })]) merged.set(note.id, note);
            return [...merged.values()].slice(0, limit).map(serialize);
          }
          return service.search(query, { scope: payloadScope(payload), limit }).map(serialize);
        },
        get: (payload) => serialize(service.get(String(payload?.id || ""), { scope: payloadScope(payload) })),
        save: (payload) => {
          const body = String(payload?.body || "").trim();
          if (!body) return { saved: false, error: "body is required" };
          try {
            const note = service.upsert({
              id: payload?.id ? String(payload.id) : undefined,
              scope: payloadScope(payload),
              title: String(payload?.title || body.slice(0, 80)),
              description: String(payload?.description || ""),
              body,
              type: payload?.type || "fact",
              expectedRevision: payload?.expectedRevision == null ? undefined : Number(payload.expectedRevision)
            });
            return { saved: true, note: serialize(note) };
          } catch (error) {
            if (error?.latest) return { saved: false, conflict: true, latest: serialize(error.latest) };
            throw error;
          }
        },
        update: (payload) => {
          const id = String(payload?.id || "");
          const note = service.get(id, { scope: payloadScope(payload) });
          if (!note) return { saved: false, error: "not found" };
          try {
            const updated = service.upsert({
              id, scope: payloadScope(payload),
              expectedRevision: Number(payload?.expectedRevision),
              title: payload?.title != null ? String(payload.title) : note.title,
              description: payload?.description != null ? String(payload.description) : note.description,
              body: payload?.body != null ? String(payload.body) : note.body,
              type: payload?.type || note.type
            });
            return { saved: true, note: serialize(updated) };
          } catch (error) {
            if (error?.latest) return { saved: false, conflict: true, latest: serialize(error.latest) };
            throw error;
          }
        },
        forget: (payload) => {
          const note = service.forget(String(payload?.id || ""), { scope: payloadScope(payload), hard: payload?.hard === true });
          return { forgotten: Boolean(note) };
        },
        flush: async () => {
          if (!queue) return { processed: 0, failed: 0, pending: 0 };
          return extractor ? await queue.drainAsync(service, { extractor, log }) : queue.drain(service, { log });
        }
      }
    });
    try {
      if (typeof ctx.inject === "function") {
        ctx.effect(() => {
          const fiber = ctx.inject(["webServer"], (webCtx) => {
            webCtx.effect(() => webCtx.webServer.register(apiRoute), "dsh-memory-service: /memory-service/api");
          });
          return () => { try { fiber?.dispose?.(); } catch { /* ignore */ } };
        }, "dsh-memory-service: web api");
      }
    } catch (error) {
      log("warn", "web api not mounted: " + (error instanceof Error ? error.message : String(error)));
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
