// Lightweight HTML fetcher to provide external context to the model.
// Uses built-in fetch (Node 20+). Limits size to avoid huge payloads.

const MAX_BODY = 20000; // raw bytes to read
const MAX_TEXT = 4000; // characters to send to model
const TIMEOUT_MS = 8000;

const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const fetchUrlAsText = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    if (!contentType.includes('text')) {
      throw new Error(`Unsupported content-type: ${contentType}`);
    }
    const reader = res.body.getReader();
    let received = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (received > MAX_BODY) break;
      chunks.push(Buffer.from(value));
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    const text = stripHtml(raw).slice(0, MAX_TEXT);
    if (!text) {
      throw new Error('Empty text after stripping HTML');
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
};
