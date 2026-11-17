export function safeService(ctx, name) {
  try { return typeof ctx?.get === "function" ? ctx.get(name) : undefined; } catch { return undefined; }
}

export function createLlmClient(ctx, config = {}, log = () => {}) {
  const service = safeService(ctx, "llm");
  let selection;
  try { selection = safeService(ctx, "agentDefaultModel")?.currentSelection?.(); } catch { selection = undefined; }
  const provider = String(config.provider || selection?.provider || "").trim() || null;
  const model = String(config.model || selection?.model || "").trim() || null;
  const available = Boolean(service && typeof service.stream === "function" && provider && model);
  if (!available) log("debug", "llm extraction unavailable");

  async function complete({ system = "", user = "", maxTokens = 1200, timeoutMs = 60000, signal } = {}) {
    if (!available) return { ok: false, text: "", error: "llm-unavailable" };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));
    const onAbort = () => controller.abort();
    if (signal?.aborted === true) controller.abort();
    signal?.addEventListener?.("abort", onAbort, { once: true });
    let text = "";
    let error = null;
    try {
      const stream = service.stream({ provider, model, system, messages: [{ role: "user", content: [{ type: "text", text: user }] }], maxTokens, signal: controller.signal });
      for await (const chunk of stream) {
        if (chunk?.type === "text-delta" && typeof chunk.text === "string") text += chunk.text;
        else if (chunk?.type === "finish" && chunk.reason?.kind === "error") error = chunk.reason.failure?.message || "model error";
      }
    } catch (failure) {
      error = failure instanceof Error ? failure.message : String(failure);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", onAbort);
    }
    return error ? { ok: false, text, error } : { ok: text.trim() !== "", text };
  }

  return { available, provider, model, complete, describe: () => ({ available, provider, model }) };
}
