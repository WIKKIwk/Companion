# Telegram Companion Bot

Telegramda sizning o'rningizga suhbatlashadigan va xarakter fayliga tayanadigan bot. Arxitektura modullarga ajratilgan:

- `src/config/env.js` – `.env` ni o'qiydi va majburiy tokenlarni tekshiradi.
- `src/config/character.js` – xarakter faylini o'qiydi va tizim promptini quradi.
- `src/services/openaiService.js` – OpenAI chat kompozitsiyasini chaqiradi.
- `src/handlers/messageHandler.js` – kelgan xabarlarni (matn, rasm, fayl) qayta ishlaydi, stream qilib real-time javob beradi, foydalanuvchi kontekstini qo'shib yuboradi, rasm/tekst/PDF/DOCX fayllarni kontekstga qo'shadi, foydalanuvchi nikini birinchi qatorda qo'shadi; komandalar (/) keyingi handlerlarga uzatiladi; guruhda faqat botga reply qilinsa javob beradi.
- `src/bot.js` – Telegraf botini sozlaydi, komandalarni bog'laydi.
- `character/profile.md` – xarakteringizni yozib qo'yadigan fayl.
- `src/services/webFetch.js` – xabar ichidagi birinchi URL ni olib, sahifa matnini (cheklangan hajmda) kontekst sifatida qo'shadi.
- `src/services/searchService.js` – SerpAPI orqali qidiruv natijalarini olib, kontekstga qo'shadi (SERPAPI_KEY bo'lsa).
- `src/services/memory.js` – foydalanuvchi va chat ID bo‘yicha 10 ta so‘nggi xabar juftligini (user/assistant) eslab turadi (process restart bo‘lsa tozalanadi).
- `src/services/userStore.js` – foydalanuvchi meta-ma'lumotlarini (ism, username, message_count, oxirgi xabar) SQLite (data/bot.db) ga saqlaydi.
- `src/services/conversationStore.js` – foydalanuvchi suhbat tarixini (role/content) SQLite'da saqlaydi va qayta yuklaydi.
- `src/services/telegramFileService.js` – foto/doc fayllarni yuklab, matn/aralashtirilgan kontent sifatida kontekstga qo'shadi.
- `src/services/voiceService.js` – ovozli xabarlarni Whisper orqali matnga aylantiradi.
- `src/handlers/adminHandler.js` – admin panel (`/admin`), tozalash, foydalanuvchi ro‘yxati va tafsilotlari uchun callback handlerlar.

## O'rnatish
1. `.env.example` faylini `.env` nomi bilan ko'chiring va tokenlarni to'ldiring.
2. `character/profile.md` ni o'zingizga moslab yozing yoki `CHARACTER_FILE` bilan boshqa yo'lni ko'rsating.
3. (Docker) `make` — image quradi, konteynerni ishga tushiradi, logni ko'rsatadi. Ma'lumotlar `./data` papkasida saqlanadi.
   (Lokal) `npm install`, so'ng `npm start`.

## Docker va Make bilan tez start
1. `.env` tayyor bo'lsin (yuqoridagi kabi).
2. `make` — image quradi, konteynerni ishga tushiradi va loglarini terminalda ko'rsatadi.
   - `character/profile.md` avtomatik konteynerga ulanadi, shuning uchun faylni o'zgartirsangiz bot yangisini o'qiydi.
3. `make logs` — hozirgi loglarni `--tail` bilan (default 20) ko'radi va kuzatadi; `make LOG_TAIL=100 logs` deb o'zgartirish mumkin.
4. `make stop` — konteynerni to'xtatish, `make clean` — to'xtatish + konteyner va image ni o'chirish.
   - Istasangiz `IMAGE_NAME` va `CONTAINER_NAME` ni `make IMAGE_NAME=...` bilan o'zgartiring.

## Muhit o'zgaruvchilari
- `TELEGRAM_BOT_TOKEN` – BotFather dan olingan token (majburiy).
- `GEMINI_API_KEY` – Gemini API kaliti (majburiy).
- `GEMINI_MODEL` – model nomi, asl default `gemini-2.5-flash`.
- `CHARACTER_FILE` – xarakter fayli yo'li, default: `character/profile.md`.
- `OWNER_NAME` – ixtiyoriy: agar xarakter faylida `Ism:` ko'rsatilmagan bo'lsa, shu nom bilan o'zingizni tanitasiz.
- `GEMINI_TEMPERATURE` va `GEMINI_MAX_TOKENS` – ixtiyoriy. Bo'sh qoldirsangiz modelning defaultlari ishlaydi.
- `GEMINI_ENABLE_SEARCH` – `true/false`. `true` bo'lsa, Gemini'ning Google Search Retrieval vositasi yoqiladi (API ichidan qidiradi).
- `SERPAPI_KEY` – qo'ysangiz, xabar matnida URL bo'lmasa ham qidiruv (SerpAPI) qilinadi va natijalar kontekstga qo'shiladi.
- `SERPAPI_ENGINE` – default `google`, xohlasangiz `duckduckgo` va hokazo.
- `DB_PATH` – SQLite fayl yo'li (default `data/bot.db`).
- `HISTORY_LIMIT` – kontekstga qo'shiladigan eng so'nggi role/content juftliklari soni (default 20).
- `WHISPER_API_KEY` (yoki `OPENAI_API_KEY`) – ovozli xabarlarni transkripsiya qilish uchun.
- `ADMIN_ID` – adminning Telegram ID si; bo'sh bo'lsa admin panel ishlamaydi.

## Foydalanish
- `/start` – qisqa tanishtirish.
- `/whoami` – joriy xarakter matnini ko'rsatadi.
- `/reload` – xarakter faylini yangidan o'qib, suhbatni shunga ko'ra davom ettiradi.

Suhbatda bot har doim xarakter faylidan foydalanadi va har javobda yangilangan matnni olib turadi. Matn bo'lmagan xabarlarga hozircha javob bermaydi.
