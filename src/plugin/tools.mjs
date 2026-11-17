import { renderRows, scopeOf } from "./message.mjs";

function textOutput() {
  return {
    schema: { type: "object", additionalProperties: false, properties: { text: { type: "string" } }, required: ["text"] },
    render: (_args, value) => [{ type: "text", text: String(value?.text || "") }]
  };
}

export function createTools({ ctx, service, root, queue, extractor }) {
  const disposers = [];
  const scopeFromExec = (exec) => (exec?.agent?.session ? scopeOf(exec.agent.session) : "global");
  const scopeFor = (args, exec) => (args?.scope === "global" ? "global" : scopeFromExec(exec));

  disposers.push(ctx.tools.register({
    name: "memory_search",
    description: "Search DSH long-term memory (workspace + global) for past decisions, preferences and facts. Use before claiming you do not know an earlier agreement.",
    parameters: { type: "object", additionalProperties: false, properties: { query: { type: "string" }, limit: { type: "integer" }, scope: { type: "string", enum: ["workspace", "global", "all"] } }, required: ["query"] },
    output: textOutput(),
    execute: async (args, exec) => {
      const base = scopeFromExec(exec);
      const limit = Number(args?.limit || 8);
      const rows = args?.scope === "all"
        ? [...service.search(String(args?.query || ""), { scope: base, limit }), ...service.search(String(args?.query || ""), { scope: "global", limit })]
        : service.search(String(args?.query || ""), { scope: args?.scope === "global" ? "global" : base, limit });
      const unique = new Map(rows.map((row) => [row.id, row]));
      return { text: renderRows([...unique.values()].slice(0, limit)) };
    }
  }));

  disposers.push(ctx.tools.register({
    name: "memory_save",
    description: "Save a durable preference, convention, decision or fact to DSH long-term memory. Do not save transient task details.",
    parameters: { type: "object", additionalProperties: false, properties: { text: { type: "string" }, title: { type: "string" }, description: { type: "string" }, type: { type: "string", enum: ["user", "preference", "feedback", "project", "reference", "convention", "fact"] }, scope: { type: "string", enum: ["workspace", "global"] }, key: { type: "string", description: "Stable fact key, e.g. project.package_manager; same key with a different value becomes a conflict." }, pinned: { type: "boolean" } }, required: ["text"] },
    output: textOutput(),
    execute: async (args, exec) => {
      const text = String(args?.text || "").trim();
      if (!text) return { text: "memory_save: text is required" };
      const scope = args?.scope === "global" ? "global" : scopeFromExec(exec);
      const note = service.upsert({ scope, key: args?.key, title: String(args?.title || text.slice(0, 80)), description: args?.description, body: text, type: args?.type || "fact", metadata: { pinned: args?.pinned === true, capture: "tool" } });
      if (note.status === "conflicted") return { text: "conflict: #" + note.id + " conflicts with #" + (note.metadata?.conflict_with || "") + "; both are hidden from recall until memory_resolve" };
      return { text: "saved #" + note.id + " revision " + note.revision + " (" + scope + ")" };
    }
  }));

  disposers.push(ctx.tools.register({
    name: "memory_get",
    description: "Read one durable memory by id, including its full body and revision.",
    parameters: { type: "object", additionalProperties: false, properties: { id: { type: "string" }, scope: { type: "string", enum: ["workspace", "global"] } }, required: ["id"] },
    output: textOutput(),
    execute: async (args, exec) => {
      const note = service.get(String(args?.id || ""), { scope: scopeFor(args, exec) });
      if (!note) return { text: "not found" };
      return { text: "#" + note.id + " [" + note.type + "] " + note.title + " (rev " + note.revision + ")\n" + (note.description ? note.description + "\n" : "") + note.body };
    }
  }));

  disposers.push(ctx.tools.register({
    name: "memory_update",
    description: "Update an existing memory with optimistic concurrency. Read it first and pass the current revision; a stale revision is rejected.",
    parameters: { type: "object", additionalProperties: false, properties: { id: { type: "string" }, expectedRevision: { type: "integer" }, text: { type: "string" }, title: { type: "string" }, description: { type: "string" }, type: { type: "string", enum: ["user", "preference", "feedback", "project", "reference", "convention", "fact"] }, scope: { type: "string", enum: ["workspace", "global"] } }, required: ["id", "expectedRevision"] },
    output: textOutput(),
    execute: async (args, exec) => {
      const scope = scopeFor(args, exec);
      const note = service.get(String(args?.id || ""), { scope });
      if (!note) return { text: "not found" };
      try {
        const updated = service.upsert({
          id: note.id,
          scope,
          expectedRevision: Number(args?.expectedRevision),
          title: args?.title != null ? String(args.title) : note.title,
          ...(args?.description != null ? { description: String(args.description) } : {}),
          body: args?.text != null ? String(args.text) : note.body,
          type: args?.type || note.type
        });
        return { text: "updated #" + updated.id + " revision " + updated.revision };
      } catch (error) {
        const latest = error?.latest;
        if (latest) return { text: "update conflict: #" + latest.id + " is at revision " + latest.revision + "; current body: " + latest.body + "\nretry with expectedRevision=" + latest.revision };
        return { text: "update failed: " + (error instanceof Error ? error.message : String(error)) };
      }
    }
  }));

  disposers.push(ctx.tools.register({
    name: "memory_forget",
    description: "Forget a memory by id, or by a text substring. Soft-forget hides it from recall; hard=true also removes the file.",
    parameters: { type: "object", additionalProperties: false, properties: { id: { type: "string" }, query: { type: "string" }, hard: { type: "boolean" }, scope: { type: "string", enum: ["workspace", "global"] } } },
    output: textOutput(),
    execute: async (args, exec) => {
      const scope = scopeFor(args, exec);
      if (args?.id) {
        const note = service.forget(String(args.id), { scope, hard: args?.hard === true });
        return { text: note ? "forgotten #" + note.id : "not found" };
      }
      const rows = service.search(String(args?.query || ""), { scope, limit: 20 });
      let n = 0;
      for (const row of rows) { if (service.forget(row.id, { scope, hard: args?.hard === true })) n++; }
      return { text: "forgotten " + n + " memory record(s)" };
    }
  }));

  disposers.push(ctx.tools.register({
    name: "memory_flush",
    description: "Process pending auto-capture jobs now. Normal turns drain the queue automatically; use when you need a deterministic flush before ending a session.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
    output: textOutput(),
    execute: async () => {
      if (!queue) return { text: "capture queue unavailable" };
      const result = extractor ? await queue.drainAsync(service, { extractor }) : queue.drain(service);
      return { text: "processed=" + result.processed + " failed=" + result.failed + " pending=" + result.pending };
    }
  }));

  disposers.push(ctx.tools.register({
    name: "memory_conflicts",
    description: "List unresolved semantic conflicts (same fact key, different values). Resolve them with memory_resolve instead of guessing.",
    parameters: { type: "object", additionalProperties: false, properties: { scope: { type: "string", enum: ["workspace", "global"] } } },
    output: textOutput(),
    execute: async (args, exec) => {
      const rows = service.listConflicts(scopeFor(args, exec));
      return { text: renderRows(rows) };
    }
  }));

  disposers.push(ctx.tools.register({
    name: "memory_resolve",
    description: "Resolve a semantic conflict by choosing the winner; the loser becomes superseded. Read both with memory_get first.",
    parameters: { type: "object", additionalProperties: false, properties: { winnerId: { type: "string" }, loserId: { type: "string" }, scope: { type: "string", enum: ["workspace", "global"] } }, required: ["winnerId", "loserId"] },
    output: textOutput(),
    execute: async (args, exec) => {
      const scope = scopeFor(args, exec);
      try {
        const resolved = service.resolveConflict(String(args?.winnerId || ""), String(args?.loserId || ""), { scope });
        return { text: "resolved: winner #" + resolved.winner.id + " active, loser #" + resolved.loser.id + " superseded" };
      } catch (error) {
        return { text: "resolve failed: " + (error instanceof Error ? error.message : String(error)) };
      }
    }
  }));

  disposers.push(ctx.tools.register({
    name: "memory_stats",
    description: "Show DSH long-term memory counts and storage path.",
    parameters: { type: "object", additionalProperties: false, properties: {} },
    output: textOutput(),
    execute: async () => {
      const rows = service.list("global", { allScopes: true, includeForgotten: true });
      const pending = queue ? queue.stats().pending : 0;
      return { text: "notes=" + rows.length + " active=" + rows.filter((n) => n.status === "active").length + " conflicts=" + rows.filter((n) => n.status === "conflicted").length + " pending=" + pending + " extractor=" + (extractor ? "on" : "off") + " root=" + root };
    }
  }));

  return disposers;
}
