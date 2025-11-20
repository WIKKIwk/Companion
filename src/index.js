import { startBot } from './bot.js';

try {
  startBot();
} catch (error) {
  console.error('Botni ishga tushirishda xatolik:', error);
  process.exit(1);
}
