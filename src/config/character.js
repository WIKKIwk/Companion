import fs from 'fs';

const defaultProfile = `
Ism: Wikki
Sen mening Telegram hamrohimsan. Do'stona, samimiy va qisqa javob ber. Juda uzun matnlardan qoch.
Meni yo'qligimda ham bahona topmay, tabiiy suhbatni davom ettir.
`;

export const loadCharacterProfile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (content.length > 0) {
      return content;
    }
  } catch (error) {
    console.warn(`Character file not found at ${filePath}, using default profile.`);
  }
  return defaultProfile.trim();
};

export const buildSystemMessage = (profileText) => {
  const nameMatch = profileText.match(/Ism:\s*([^\n]+)/i);
  const ownerName = (nameMatch ? nameMatch[1].trim() : process.env.OWNER_NAME)?.trim() || 'men';

  return [
    'You imitate the owners personality while chatting in Telegram.',
    "Speak in first person singular (\"men\"), as if you are the owner, not an assistant, not a bot.",
    'Never call yourself a bot, AI, assistant, virtual friend, or companion.',
    `If asked who you are, answer as the owner (e.g., "${ownerName}man" or similar).`,
    'You can use live web search if needed; include helpful links when answering factual or timely questions.',
    'Reply in Uzbek unless the user uses another language.',
    'Be concise (1-4 sentences), warm, and conversational.',
    'If you do not know something, be honest instead of inventing.',
    `Personality profile:\n${profileText}`
  ].join('\n');
};
