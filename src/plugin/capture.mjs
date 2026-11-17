import { autoId, scopeOf, textOf } from "./message.mjs";

const DURABLE = /(以后|今后|记住|不要再|别再|统一|一律|改成|改为|从今以后|always|never|remember|from now on|don't use|do not use|use .* instead)/i;
const META = /(请.*(保存|记住|调用|告诉我)|把.*(保存|记下来|记住)|save (this|it)|remember (this|that)|调用.*工具)/i;

export function createCaptureHandler({ service, queue, capture, extractor, extractEveryTurns = 3, log, stateOf }) {
  return (session, event) => {
    if (!capture) return;
    try {
      const state = stateOf(session.id);
      switch (event?.type) {
        case "turn/start":
          state.turn = Number(event.data?.turn || state.turn + 1);
          state.userText = "";
          state.assistantText = "";
          state.tools = [];
          break;
        case "user/message":
          if (event.data?.source?.kind === "user") state.userText = textOf(event.data?.content).trim();
          break;
        case "assistant/message":
          state.assistantText = textOf(event.data?.message?.content).trim();
          break;
        case "tool/call":
          if (typeof event.data?.name === "string" && state.tools.length < 16) state.tools.push(event.data.name);
          break;
        case "turn/end": {
          const reason = event.data?.reason?.kind;
          if ((reason === "completed" || reason === "max-tokens") && state.userText) {
            const text = state.userText;
            const scope = scopeOf(session);
            const canExtract = Boolean(extractor && queue);
            const due = state.turn % Math.max(1, extractEveryTurns) === 0 || DURABLE.test(text);
            if (!state.tools.includes("memory_save")) {
              if (canExtract && due) {
                const payload = { scope, messages: [...state.history, { role: "user", text }, { role: "assistant", text: state.assistantText }] };
                queue.enqueue({ scope, sessionId: session.id, turn: state.turn, text, kind: "turn", payload: JSON.stringify(payload) });
                void queue.drainAsync(service, { extractor, log }).catch((error) => log("warn", "extraction drain failed: " + (error instanceof Error ? error.message : String(error))));
              } else if (!canExtract && DURABLE.test(text) && !META.test(text)) {
                if (queue) {
                  queue.enqueue({ scope, sessionId: session.id, turn: state.turn, text, title: text.replace(/\s+/g, " ").slice(0, 80) });
                  queue.drain(service, { limit: 5, log });
                } else {
                  const id = autoId(text);
                  if (!service.get(id, { scope })) {
                    service.upsert({
                      id,
                      scope,
                      title: text.replace(/\s+/g, " ").slice(0, 80),
                      description: "Implicit durable statement captured from a completed turn.",
                      body: text,
                      type: "feedback",
                      sourceRefs: ["session:" + session.id + ":turn:" + state.turn],
                      metadata: { capture: "auto", session_id: session.id, turn: state.turn, tools: state.tools.join(",") }
                    });
                  }
                }
              }
            }
            state.history.push({ role: "user", text });
            if (state.assistantText) state.history.push({ role: "assistant", text: state.assistantText });
            if (state.history.length > 8) state.history = state.history.slice(-8);
          }
          state.userText = "";
          state.assistantText = "";
          state.tools = [];
          break;
        }
        default: break;
      }
    } catch (error) {
      log("warn", "capture failed: " + (error instanceof Error ? error.message : String(error)));
    }
  };
}
