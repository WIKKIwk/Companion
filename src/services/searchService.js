import { config } from '../config/env.js';

const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json';
const MAX_RESULTS = 3;

export const searchWeb = async (query) => {
  if (!config.serpApiKey) {
    throw new Error('SERPAPI_KEY is not set');
  }

  const params = new URLSearchParams({
    engine: config.serpApiEngine || 'google',
    api_key: config.serpApiKey,
    q: query,
    num: String(MAX_RESULTS)
  });

  const res = await fetch(`${SERPAPI_ENDPOINT}?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    redirect: 'follow',
    signal: AbortSignal.timeout(7000)
  });

  if (!res.ok) {
    throw new Error(`SerpAPI error: HTTP ${res.status}`);
  }

  const data = await res.json();
  const organic = data.organic_results || [];

  const results = organic.slice(0, MAX_RESULTS).map((item, idx) => {
    const title = item.title || 'No title';
    const link = item.link || item.displayed_link || '';
    const snippet = item.snippet || item.snippet_highlighted_words?.join(' ') || '';
    return `${idx + 1}. ${title}\n${snippet}\n${link}`.trim();
  });

  if (results.length === 0) {
    throw new Error('No results from SerpAPI');
  }

  return `Web search results for "${query}":\n${results.join('\n\n')}`;
};
