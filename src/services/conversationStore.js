import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { config } from '../config/env.js';

const dbFile = config.dbPath;
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_messages_user_chat_created
    ON messages(user_id, chat_id, created_at);
`);

const insertStmt = db.prepare(`
  INSERT INTO messages (user_id, chat_id, role, content)
  VALUES (@user_id, @chat_id, @role, @content)
`);

const getStmt = db.prepare(`
  SELECT role, content FROM messages
  WHERE user_id = ? AND chat_id = ?
  ORDER BY id DESC
  LIMIT ?
`);

const trimStmt = db.prepare(`
  DELETE FROM messages
  WHERE id IN (
    SELECT id FROM messages
    WHERE user_id = ? AND chat_id = ?
    ORDER BY id DESC
    LIMIT -1 OFFSET ?
  )
`);

const safeContent = (text) => {
  if (text === undefined || text === null) return '';
  return String(text).slice(0, 4000);
};

export const appendMessage = ({ chatId, userId, role, content }) => {
  insertStmt.run({
    user_id: String(userId),
    chat_id: String(chatId),
    role,
    content: safeContent(content)
  });
  // Trim history to limit
  const limit = config.historyLimit || 20;
  trimStmt.run(String(userId), String(chatId), limit * 2); // user+assistant pairs
};

export const getRecentMessages = ({ chatId, userId }) => {
  const limit = config.historyLimit || 20;
  const rows = getStmt.all(String(userId), String(chatId), limit * 2);
  return rows.reverse(); // oldest first
};

export const clearAllMessages = () => {
  db.exec('DELETE FROM messages;');
};
