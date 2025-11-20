import OpenAI from 'openai';
import { config } from '../config/env.js';

const MAX_VOICE_BYTES = 6_000_000; // 6 MB
const client =
  config.whisperApiKey && new OpenAI({ apiKey: config.whisperApiKey, baseURL: process.env.WHISPER_BASE_URL });

const fetchBuffer = async (url, limitBytes) => {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const reader = res.body.getReader();
  let received = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > limitBytes) {
      throw new Error(`Voice too large (${received} bytes)`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
};

export const transcribeVoice = async (telegram, voiceOrAudio) => {
  if (!client) {
    throw new Error('No Whisper/OpenAI API key configured');
  }
  if (!voiceOrAudio) return null;
  const fileId = voiceOrAudio.file_id;
  const link = await telegram.getFileLink(fileId);
  const buffer = await fetchBuffer(link.href || link, MAX_VOICE_BYTES);

  const blob = new Blob([buffer], { type: voiceOrAudio.mime_type || 'audio/ogg' });
  const fileName = `${fileId}.${voiceOrAudio.mime_type?.split('/')[1] || 'ogg'}`;

  const result = await client.audio.transcriptions.create({
    file: new File([blob], fileName),
    model: 'whisper-1',
    response_format: 'text',
    prompt:
      'Transcribe speech accurately (Uzbek and mixed languages). Keep numbers and names as heard; do not translate.'
  });
  return result?.trim();
};
