import { contextMessage, humanText, scopeOf } from "./message.mjs";

export function createPreStepHandler({ service, budgetTokens, log, stateOf, queryExpander }) {
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
      const packed = service.context({ scope, query, extraQueries: expanded, budgetTokens });
      state.injectedTurn = turn;
      if (!packed.text) return decision;
      const text = "长期记忆（由 dsh-memory-service 自动注入，来自过去会话；不是用户本轮的话）：\n" + packed.text;
      return { kind: "enter", messages: [...decision.messages, contextMessage(text)] };
    } catch (error) {
      log("warn", "recall failed: " + (error instanceof Error ? error.message : String(error)));
      return decision;
    }
  };
}
