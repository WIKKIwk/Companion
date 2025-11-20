import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { config } from '../config/env.js';

const dbFile = config.dbPath;
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    last_message TEXT,
    message_count INTEGER DEFAULT 0,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, chat_id)
  );
`);

const upsertStmt = db.prepare(`
  INSERT INTO users (user_id, chat_id, username, first_name, last_name, last_message, message_count, last_seen)
  VALUES (@user_id, @chat_id, @username, @first_name, @last_name, @last_message, 1, CURRENT_TIMESTAMP)
  ON CONFLICT(user_id, chat_id) DO UPDATE SET
    username=excluded.username,
    first_name=excluded.first_name,
    last_name=excluded.last_name,
    last_message=excluded.last_message,
    message_count=users.message_count + 1,
    last_seen=CURRENT_TIMESTAMP;
`);

const getStmt = db.prepare(`SELECT * FROM users WHERE user_id = ? AND chat_id = ?`);

export const recordUserMessage = ({ chatId, userId, username, firstName, lastName, message }) => {
  const safeMessage = message ? String(message).slice(0, 500) : null;
  upsertStmt.run({
    user_id: String(userId),
    chat_id: String(chatId),
    username: username || null,
    first_name: firstName || null,
    last_name: lastName || null,
    last_message: safeMessage
  });
};

export const getUserProfile = ({ chatId, userId }) => {
  return getStmt.get(String(userId), String(chatId));
};

export const listUsers = (limit = 25) => {
  const stmt = db.prepare(`
    SELECT user_id, chat_id, username, first_name, last_name, message_count, last_seen, last_message
    FROM users
    ORDER BY last_seen DESC
    LIMIT ?
  `);
  return stmt.all(limit);
};

export const resetMessageCounts = () => {
  db.exec('UPDATE users SET message_count = 0;');
};

export const getUserStats = () => {
  const row = db
    .prepare('SELECT COUNT(*) AS total_users, COALESCE(SUM(message_count),0) AS total_messages FROM users')
    .get();
  return { totalUsers: row.total_users || 0, totalMessages: row.total_messages || 0 };
};

export const getUserByIds = ({ chatId, userId }) => {
  return db
    .prepare(
      `SELECT user_id, chat_id, username, first_name, last_name, message_count, last_seen, last_message
       FROM users WHERE user_id = ? AND chat_id = ? LIMIT 1`
    )
    .get(String(userId), String(chatId));
};
