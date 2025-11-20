import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';

const client = new GoogleGenerativeAI(config.geminiApiKey);

const toParts = (content) => {
  if (Array.isArray(content)) return content;
  if (typeof content === 'object' && content !== null) return [content];
  return [{ type: 'text', text: String(content) }];
};

const convertMessages = (messages) => {
  let systemInstruction;
  const contents = [];

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemInstruction = msg.content;
      continue;
    }
    const role = msg.role === 'assistant' ? 'model' : 'user';
    const parts = [];
    for (const part of toParts(msg.content)) {
      if (part?.type === 'image' && part.data) {
        parts.push({
          inlineData: {
            data: part.data,
            mimeType: part.mimeType || 'image/jpeg'
          }
        });
      } else if (part?.type === 'text' && part.text) {
        parts.push({ text: part.text });
      } else if (typeof part === 'string') {
        parts.push({ text: part });
      }
    }
    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }

  return { systemInstruction, contents };
};

export const generateReply = async ({ messages }) => {
  const { systemInstruction, contents } = convertMessages(messages);
  const tools = config.geminiEnableSearch ? [{ googleSearch: {} }] : undefined;
  const model = client.getGenerativeModel({
    model: config.geminiModel,
    ...(tools ? { tools } : {}),
    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {})
  });

  const result = await model.generateContent({
    contents,
    ...(tools ? { tools } : {}),
    generationConfig: {
      ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
      ...(config.maxCompletionTokens !== undefined
        ? { maxOutputTokens: config.maxCompletionTokens }
        : {})
    }
  });

  const text = result.response?.text()?.trim();
  if (!text) {
    throw new Error('Model did not return content.');
  }
  return text;
};

export const streamReply = async ({ messages, onChunk }) => {
  const { systemInstruction, contents } = convertMessages(messages);
  const tools = config.geminiEnableSearch ? [{ googleSearch: {} }] : undefined;
  const model = client.getGenerativeModel({
    model: config.geminiModel,
    ...(tools ? { tools } : {}),
    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {})
  });

  const streamResult = await model.generateContentStream({
    contents,
    ...(tools ? { tools } : {}),
    generationConfig: {
      ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
      ...(config.maxCompletionTokens !== undefined
        ? { maxOutputTokens: config.maxCompletionTokens }
        : {})
    }
  });

  let full = '';
  for await (const chunk of streamResult.stream) {
    const text = chunk.text();
    if (!text) continue;
    full += text;
    if (onChunk) {
      await onChunk(full);
    }
  }

  const finalText = full.trim();
  if (!finalText) {
    throw new Error('Model streaming returned no content.');
  }
  return finalText;
};
