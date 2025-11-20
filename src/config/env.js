import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const defaultCharacterFile = path.resolve(process.cwd(), 'character', 'profile.md');
const maxCompletionEnv =
  process.env.OPENAI_MAX_COMPLETION_TOKENS ??
  process.env.OPENAI_MAX_TOKENS ??
  process.env.GEMINI_MAX_TOKENS;

const parseOptionalNumber = (value) => {
  if (value === undefined || value === '') return undefined;
  return Number(value);
};

const parseBoolean = (value, defaultVal) => {
  if (value === undefined || value === '') return defaultVal;
  const lower = String(value).toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(lower)) return true;
  if (['false', '0', 'no', 'off'].includes(lower)) return false;
  return defaultVal;
};

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
const whisperApiKey = process.env.WHISPER_API_KEY || process.env.OPENAI_API_KEY || '';
if (!process.env.TELEGRAM_BOT_TOKEN) {
  throw new Error('Missing required environment variable: TELEGRAM_BOT_TOKEN');
}
if (!geminiApiKey) {
  throw new Error('Missing Gemini API key. Set GEMINI_API_KEY.');
}

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  geminiApiKey,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  characterFile: process.env.CHARACTER_FILE || defaultCharacterFile,
  temperature: parseOptionalNumber(process.env.OPENAI_TEMPERATURE ?? process.env.GEMINI_TEMPERATURE),
  maxCompletionTokens: parseOptionalNumber(maxCompletionEnv),
  serpApiKey: process.env.SERPAPI_KEY || '',
  serpApiEngine: process.env.SERPAPI_ENGINE || 'google',
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'bot.db'),
  whisperApiKey,
  historyLimit: parseOptionalNumber(process.env.HISTORY_LIMIT) || 20,
  geminiEnableSearch: parseBoolean(process.env.GEMINI_ENABLE_SEARCH, true),
  adminId: process.env.ADMIN_ID ? String(process.env.ADMIN_ID) : ''
};
