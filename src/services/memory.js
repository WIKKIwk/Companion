// Simple in-memory conversation store keyed by chat + user.
// Not persistent; resets when process restarts.

const store = new Map();

const maxHistory = 10; // number of messages per role to keep (approx 10 exchanges)

const buildKey = (chatId, userId) => `${chatId}:${userId}`;

export const getHistory = (chatId, userId) => {
  const key = buildKey(chatId, userId);
  return store.get(key) || [];
};

export const appendExchange = (chatId, userId, userMessage, assistantMessage) => {
  const key = buildKey(chatId, userId);
  const history = store.get(key) || [];
  history.push({ role: 'user', content: userMessage });
  history.push({ role: 'assistant', content: assistantMessage });
  // Trim from the start if too long
  const excess = history.length - maxHistory * 2;
  if (excess > 0) {
    history.splice(0, excess);
  }
  store.set(key, history);
};
