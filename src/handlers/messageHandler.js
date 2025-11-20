import { streamReply } from '../services/openaiService.js';
import { getRecentMessages, appendMessage } from '../services/conversationStore.js';
import { fetchUrlAsText } from '../services/webFetch.js';
import { searchWeb } from '../services/searchService.js';
import { recordUserMessage, getUserProfile } from '../services/userStore.js';
import { fetchPhotoAsInlineData, fetchDocumentContent } from '../services/telegramFileService.js';
import { transcribeVoice } from '../services/voiceService.js';

export const createMessageHandler = ({ getPersonaPrompt }) => {
  return async (ctx, next) => {
    const isCommand = ctx.message?.text?.startsWith('/');
    const isGroupOrSuper = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
    const isReplyToBot = ctx.message?.reply_to_message?.from?.id === ctx.botInfo?.id;

    if (isCommand) return next?.(); // allow command handlers to run
    if (isGroupOrSuper && !isReplyToBot) return; // In groups, respond only when bot is replied to.
    const hasPhoto = Boolean(ctx.message?.photo?.length);
    const hasDocument = Boolean(ctx.message?.document);
    const hasVoice = Boolean(ctx.message?.voice);
    const hasAudio = Boolean(ctx.message?.audio);
    let text = ctx.message?.text || ctx.message?.caption;
    if (!text && !hasPhoto && !hasDocument && !hasVoice && !hasAudio) {
      await ctx.reply('Hozircha faqat matn/rasm/fayl/ovozni qabul qilaman.');
      return;
    }

    try {
      const personaPrompt = getPersonaPrompt();
      const chatId = ctx.chat.id;
      const userId = ctx.from?.id || chatId;
      const usernameLabel = ctx.from?.username ? `@${ctx.from.username}` : '';
      recordUserMessage({
        chatId,
        userId,
        username: ctx.from?.username,
        firstName: ctx.from?.first_name,
        lastName: ctx.from?.last_name,
        message: text || '[attachment]'
      });

      const storedProfile = getUserProfile({ chatId, userId });
      const history = getRecentMessages({ chatId, userId });

      const messages = [
        { role: 'system', content: personaPrompt },
        storedProfile
          ? {
              role: 'user',
              content: `Known info about this user (from DB): username=${storedProfile.username || ''}, first_name=${storedProfile.first_name || ''}, last_name=${storedProfile.last_name || ''}, messages=${storedProfile.message_count || 0}.`
            }
          : null,
        ...history,
        text
          ? {
              role: 'user',
              content: `${usernameLabel ? usernameLabel + ': ' : ''}${text}`
            }
          : null
      ].filter(Boolean);

      if (text) {
        const urlMatch = text.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) {
          try {
            const url = urlMatch[0];
            const pageText = await fetchUrlAsText(url);
            messages.push({
              role: 'user',
              content: `Fetched web content from ${url}:\n${pageText}`
            });
          } catch (err) {
            console.warn('Web fetch failed, continuing without web context:', err.message);
          }
        } else if (process.env.SERPAPI_KEY) {
          // If no URL but search is enabled and the user wants a general answer, try web search.
          try {
            const searchSummary = await searchWeb(text);
            messages.push({
              role: 'user',
              content: searchSummary
            });
          } catch (err) {
            console.warn('Search failed, continuing without search context:', err.message);
          }
        }
      }

      if (!text && (hasVoice || hasAudio)) {
        try {
          const transcript = await transcribeVoice(ctx.telegram, ctx.message.voice || ctx.message.audio);
          if (transcript) {
            text = transcript;
            messages.push({
              role: 'user',
              content: `${usernameLabel ? usernameLabel + ': ' : ''}${transcript}`
            });
          } else {
            await ctx.reply(
              'Ovozni tinglay olmadim. Iltimos, asosiy fikringizni matn qilib yozib yuboring.',
              { reply_to_message_id: ctx.message.message_id }
            );
            return;
          }
        } catch (err) {
          console.warn('Voice transcription failed:', err.message);
          await ctx.reply(
            'Ovozni tinglay olmadim. Iltimos, asosiy fikringizni matn qilib yozib yuboring.',
            { reply_to_message_id: ctx.message.message_id }
          );
          return;
        }
      }

      // Attach photo if present
      if (hasPhoto) {
        try {
          const photoData = await fetchPhotoAsInlineData(ctx.telegram, ctx.message.photo);
          if (photoData) {
            messages.push({
              role: 'user',
              content: [
                { type: 'text', text: 'User sent an image:' },
                { type: 'image', data: photoData.data, mimeType: photoData.mimeType }
              ]
            });
          }
        } catch (err) {
          console.warn('Photo fetch failed:', err.message);
        }
      }

      // Attach document if present
      if (hasDocument) {
        try {
          const docResult = await fetchDocumentContent(ctx.telegram, ctx.message.document);
          if (docResult?.type === 'text') {
            messages.push({
              role: 'user',
              content: `User sent a document (${docResult.fileName}, ${docResult.mimeType}). Content (truncated):\n${docResult.text}`
            });
          } else if (docResult) {
            messages.push({
              role: 'user',
              content: `User sent a document (${docResult.fileName}, ${docResult.mimeType}) that could not be parsed.`
            });
          }
        } catch (err) {
          console.warn('Document fetch failed:', err.message);
        }
      }

      const finalText = await streamReply({ messages });
      await ctx.reply(finalText, { reply_to_message_id: ctx.message.message_id });

      appendMessage({ chatId, userId, role: 'user', content: text || '[attachment]' });
      appendMessage({ chatId, userId, role: 'assistant', content: finalText });
    } catch (error) {
      const harmless =
        error?.response?.description?.includes('message is not modified') ||
        error?.description?.includes('message is not modified');
      if (harmless) {
        console.warn('Ignored harmless edit error:', error.response?.description || error.message);
        return;
      }
      console.error('Failed to handle message', error);
      await ctx.reply(
        "Kechirasiz, hozir javob bera olmadim. Birozdan so'ng yana urinib ko'ring.",
        { reply_to_message_id: ctx.message.message_id }
      );
    }
  };
};
