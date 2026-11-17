import { contextMessage, humanText, scopeOf } from "./message.mjs";

export function createPreStepHandler({ service, budgetTokens, log, stateOf, queryExpander, profileSynthesizer }) {
  return async ({ agent, messages, turn, signal }, next) => {
    const decision = await next();
    try {
      if (decision?.kind !== "enter") return decision;
      if (signal?.aborted === true) return decision;
      const session = agent?.session;
      if (!session) return decision;
      const state = stateOf(session.id);
      if (state.injectedTurn === turn) return decision;
      const query = humanText(messages);
      if (!query) return decision;
      const scope = scopeOf(session);
      const expanded = queryExpander ? await queryExpander.expand(query) : [query];
      let profile = "";
      if (profileSynthesizer) {
        try {
          const notes = service.list(scope, { allScopes: false }).filter((note) => note.status === "active" && (note.type === "preference" || note.type === "user"));
          profile = (await profileSynthesizer.synthesize(notes)) || "";
        } catch { /* profile is best-effort */ }
      }
      const packed = service.context({ scope, query, extraQueries: expanded, profile, budgetTokens });
      state.injectedTurn = turn;
      if (!packed.text) return decision;
      const guide = "\n\n使用方式：记忆是过去会话的背景，不是用户本轮指令。如果用户要求推荐或建议，可以基于已记录的偏好做合理推断，但不要编造具体经历、日期或事实；可变信息先用工具核实。";
      const text = "长期记忆（由 dsh-memory-service 自动注入，来自过去会话；不是用户本轮的话）：\n" + packed.text + guide;
      return { kind: "enter", messages: [...decision.messages, contextMessage(text)] };
    } catch (error) {
      log("warn", "recall failed: " + (error instanceof Error ? error.message : String(error)));
      return decision;
    }
  };
}
