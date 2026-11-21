import { MemoryService } from "../store.mjs";
import fs from "node:fs";
import path from "node:path";
import { normalizeConfig } from "../config.mjs";
import { discoverClaudeMemories, importClaude, previewClaudeSources, importClaudeEntries } from "../adapters/claude.mjs";
import { slug } from "../adapters/claude/utils.mjs";
import { createCaptureHandler } from "./capture.mjs";
import { createPreStepHandler } from "./inject.mjs";
import { createTools } from "./tools.mjs";
import { createSessionState } from "./state.mjs";
import { CaptureQueue } from "../capture/queue.mjs";
import { createLlmClient } from "../capture/llm.mjs";
import { createExtractor } from "../capture/extract.mjs";
import { createQueryExpander } from "../retrieval/query-expander.mjs";
import { createProfileSynthesizer } from "../retrieval/profile.mjs";
import { createMemoryApiRoute } from "../api.mjs";

export const name = "memory-service";
export const inject = ["tools", "agents", "sessions"];

const TAG = "[dsh-memory-service]";

export function apply(ctx, rawConfig = {}) {
  const normalized = normalizeConfig(rawConfig);
  const config = normalized.config;
  const root = config.root;
  const capture = config.capture;
  const budgetTokens = config.budgetTokens;
  const log = (level, message) => {
    try {
      const logger = ctx.logger || console;
      const fn = typeof logger[level] === "function" ? logger[level].bind(logger) : logger.info?.bind(logger);
      fn?.(TAG + " " + message);
    } catch { /* ignore */ }
  };
  for (const warning of normalized.warnings) log("warn", warning);

  let service = null;
  try {
    service = new MemoryService({ root }).init();
  } catch (error) {
    log("warn", "memory disabled: " + (error instanceof Error ? error.message : String(error)));
  }

  const stateOf = createSessionState();
  const llm = createLlmClient(ctx, config.llm || {}, log);
  const extractor = llm.available ? createExtractor({ llm, log, minConfidence: config.minConfidence }) : null;
  const queryExpander = llm.available && config.queryExpansion ? createQueryExpander({ llm, log }) : null;
  const profileSynthesizer = llm.available && config.profileSynthesis ? createProfileSynthesizer({ llm, log }) : null;
  const extractEveryTurns = config.extractEveryTurns;
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
    const payloadScope = (payload) => {
      const requested = String(payload?.scope || "");
      if (requested === "global") return "global";
      if (requested.startsWith("workspace:")) return requested;
      return service.defaultScope();
    };
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
        state: () => {
          const workspaceIds = service.listWorkspaces();
          const workspaceDetails = workspaceIds.map((id) => {
            const rows = service.list("workspace:" + id, { includeForgotten: true });
            return {
              id, scope: "workspace:" + id,
              notes: rows.filter((note) => note.status === "active").length,
              updatedAt: rows.reduce((latest, note) => String(note.updatedAt) > latest ? String(note.updatedAt) : latest, "")
            };
          });
          return {
            root, defaultScope: service.defaultScope(), workspaces: workspaceIds, workspaceDetails,
            notes: service.list("global", { allScopes: true, includeForgotten: true }).length,
            active: service.list("global", { allScopes: true }).filter((note) => note.status === "active").length,
            conflicts: service.list("global", { allScopes: true }).filter((note) => note.status === "conflicted").length,
            capture: queue ? queue.stats() : null, extractor: Boolean(extractor)
          };
        },
        list: (payload) => {
          const scope = payload?.allScopes ? "global" : payloadScope(payload);
          return service.list(scope, { allScopes: Boolean(payload?.allScopes), includeForgotten: Boolean(payload?.includeForgotten) }).map(serialize);
        },
        search: (payload) => {
          const query = String(payload?.query || "");
          const limit = Number(payload?.limit || 20);
          if (payload?.scope === "all") {
            const merged = new Map();
            const scopes = ["global", ...service.listWorkspaces().map((id) => "workspace:" + id)];
            for (const scope of scopes) {
              for (const note of service.search(query, { scope, limit })) merged.set(note.id, note);
            }
            return [...merged.values()].slice(0, limit).map(serialize);
          }
          return service.search(query, { scope: payloadScope(payload), limit }).map(serialize);
        },
        get: (payload) => serialize(service.get(String(payload?.id || ""), { scope: payloadScope(payload) })),
        conflicts: (payload) => {
          const notes = payload?.scope === "all"
            ? service.list("global", { allScopes: true }).filter((note) => note.status === "conflicted")
            : service.listConflicts(payloadScope(payload));
          return notes.map(serialize);
        },
        resolve: (payload) => {
          const scope = payloadScope(payload);
          const winnerId = String(payload?.winnerId || "");
          const loserIds = (Array.isArray(payload?.loserIds) ? payload.loserIds : [payload?.loserId])
            .map((id) => String(id || "")).filter((id) => id && id !== winnerId);
          const losers = [];
          for (const loserId of loserIds) {
            const resolved = service.resolveConflict(winnerId, loserId, { scope });
            losers.push(serialize(resolved.loser));
          }
          const winner = service.get(winnerId, { scope });
          return { winner: serialize(winner), losers };
        },
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
        claudePreview: (payload) => {
          const known = discoverClaudeMemories();
          const requested = Array.isArray(payload?.sources) ? payload.sources.map(String) : [];
          const sources = requested.map((source) => known.find(({ dir }) => dir === source)).filter(Boolean);
          if (!sources.length) throw new Error("no Claude memory source selected");
          const scope = payloadScope(payload);
          return { scope, sources, entries: previewClaudeSources(service, sources, { scope }) };
        },
        claudeImportEntries: (payload) => {
          const known = discoverClaudeMemories();
          const raw = Array.isArray(payload?.entries) ? payload.entries.slice(0, 500) : [];
          const entries = [];
          for (const entry of raw) {
            const source = known.find(({ dir }) => dir === String(entry?.source || ""));
            if (!source) throw new Error("unknown Claude memory source");
            const file = String(entry?.file || "");
            if (!file || path.basename(file) !== file) throw new Error("invalid Claude memory file");
            const base = file.replace(/\.md$/i, "");
            entries.push({
              id: "claude-" + slug(source.project) + "-" + slug(base),
              source: source.dir,
              file,
              project: source.project,
              title: String(entry?.title || base).slice(0, 200),
              description: String(entry?.description || "").slice(0, 200),
              body: String(entry?.body || "").slice(0, 100000),
              type: String(entry?.type || "project"),
              scope: entry?.scope === "global" ? "global" : payloadScope(payload),
              metadata: { origin: "claude-code", claude_name: String(entry?.title || ""), claude_description: String(entry?.description || "") }
            });
          }
          return importClaudeEntries(service, entries, { force: payload?.force === true });
        },
        claudeDiscover: () => discoverClaudeMemories().map(({ project, dir }) => {
          let notes = 0;
          try { notes = fs.readdirSync(dir).filter((name) => name.endsWith(".md") && name !== "MEMORY.md").length; } catch { /* ignore */ }
          return { project, source: dir, notes };
        }),
        claudeImport: (payload) => {
          const source = discoverClaudeMemories().find(({ dir }) => dir === String(payload?.source || ""));
          if (!source) throw new Error("unknown Claude memory directory");
          const scope = payload?.scope === "global" ? "global" : service.defaultScope();
          const summary = importClaude(service, {
            source: source.dir,
            project: source.project,
            scope,
            dryRun: payload?.dryRun === true,
            force: payload?.force === true
          });
          return { ...summary, project: source.project, scope, dryRun: payload?.dryRun === true };
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
    ctx.on("agent/pre-step", createPreStepHandler({ service, budgetTokens, log, stateOf, queryExpander, profileSynthesizer }));
    ctx.effect(() => {
      const disposers = createTools({ ctx, service, root, queue, extractor });
      return () => { for (const dispose of disposers) { try { dispose?.(); } catch { /* ignore */ } } };
    }, "dsh-memory-service: tools");
  }

  ctx.effect(() => () => { try { service?.close(); } catch { /* ignore */ } }, "dsh-memory-service: close");
}
