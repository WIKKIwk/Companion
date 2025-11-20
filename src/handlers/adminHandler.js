import { config } from '../config/env.js';
import { clearAllMessages } from '../services/conversationStore.js';
import { getUserStats, listUsers, getUserByIds } from '../services/userStore.js';

const isAdmin = (ctx) => {
  if (!config.adminId) return false;
  const fromId = ctx.from?.id ? String(ctx.from.id) : '';
  return fromId === config.adminId;
};

export const registerAdminHandlers = (bot) => {
  bot.command('admin', (ctx) => {
    if (!isAdmin(ctx)) return;
    const stats = getUserStats();
    const text = [
      'Admin panel:',
      `- Foydalanuvchilar: ${stats.totalUsers}`,
      `- Umumiy xabarlar: ${stats.totalMessages}`,
      '',
      'Quyidagi tugmalar orqali boshqarish mumkin.'
    ].join('\n');

    ctx.reply(text, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🧹 Habarlarni tozalash', callback_data: 'admin_clear' }],
          [{ text: '👥 Ma\'lumotlar', callback_data: 'admin_list' }]
        ]
      }
    });
  });

  bot.action('admin_clear', async (ctx) => {
    if (!isAdmin(ctx)) return;
    clearAllMessages();
    ctx.editMessageText('Habarlar tarixi tozalandi.');
  });

  bot.action('admin_list', async (ctx) => {
    if (!isAdmin(ctx)) return;
    const users = listUsers(25);
    if (users.length === 0) {
      await ctx.editMessageText('Foydalanuvchi topilmadi. Avval yozishmalar bo‘lishi kerak.');
      return;
    }
    const keyboard = users.map((u) => [
      {
        text: u.username ? `@${u.username}` : u.first_name || 'No name',
        callback_data: `admin_user_${encodeURIComponent(u.chat_id)}_${encodeURIComponent(u.user_id)}`
      }
    ]);
    await ctx.editMessageText('Foydalanuvchilar:', {
      reply_markup: { inline_keyboard: keyboard }
    });
  });

  bot.action(/admin_user_(.+)_(.+)/, async (ctx) => {
    if (!isAdmin(ctx)) return;
    const chatId = decodeURIComponent(ctx.match[1]);
    const userId = decodeURIComponent(ctx.match[2]);
    const u = getUserByIds({ chatId, userId });
    if (!u) {
      await ctx.answerCbQuery('Ma\'lumot topilmadi.');
      return;
    }
    const lines = [
      `@${u.username || '—'} (${u.first_name || ''} ${u.last_name || ''})`,
      `Chat ID: ${u.chat_id}`,
      `User ID: ${u.user_id}`,
      `Xabarlar: ${u.message_count || 0}`,
      `Oxirgi xabar: ${u.last_message || '—'}`,
      `Oxirgi ko‘rgan vaqti: ${u.last_seen || '—'}`
    ];
    await ctx.answerCbQuery();
    await ctx.editMessageText(lines.join('\n'), {
      reply_markup: {
        inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_list' }]]
      }
    });
  });
};
