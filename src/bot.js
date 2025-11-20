import { Telegraf } from 'telegraf';
import { config } from './config/env.js';
import { buildSystemMessage, loadCharacterProfile } from './config/character.js';
import { createMessageHandler } from './handlers/messageHandler.js';
import { registerAdminHandlers } from './handlers/adminHandler.js';

const loadPersonaPrompt = () => {
  const profile = loadCharacterProfile(config.characterFile);
  return buildSystemMessage(profile);
};

export const startBot = () => {
  const bot = new Telegraf(config.telegramToken);

  bot.start((ctx) => {
    const name = ctx.from?.first_name || ctx.from?.username || 'do\'stim';
    ctx.reply(`Salom, ${name}!`);
  });

  bot.command('reload', (ctx) => {
    loadPersonaPrompt();
    ctx.reply("Xarakter faylini yangidan o'qidim. Davom etaman.");
  });

  bot.command('whoami', (ctx) => {
    const profile = loadCharacterProfile(config.characterFile);
    ctx.reply(`Hozirgi xarakter haqida ma'lumot:\n\n${profile}`);
  });

  const handler = createMessageHandler({ getPersonaPrompt: loadPersonaPrompt });
  bot.on('message', handler);
  registerAdminHandlers(bot);

  bot.catch((error, ctx) => {
    console.error(`Bot error for chat ${ctx.chat?.id}:`, error);
  });

  bot.launch();
  console.log('Telegram bot ishga tushdi.');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};
