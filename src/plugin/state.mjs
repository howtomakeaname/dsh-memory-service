export function createSessionState() {
  const states = new Map();
  return (sessionId) => {
    let state = states.get(sessionId);
    if (!state) {
      state = { turn: 0, userText: "", assistantText: "", tools: [], history: [], injectedTurn: -1 };
      states.set(sessionId, state);
    }
    return state;
  };
}
