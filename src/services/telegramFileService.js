const MAX_IMAGE_BYTES = 1_500_000; // ~1.5MB
const MAX_DOC_BYTES = 2_000_000; // ~2MB
const MAX_DOC_TEXT = 8000; // chars

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
      throw new Error(`File too large (${received} bytes)`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
};

export const fetchPhotoAsInlineData = async (telegram, photos = []) => {
  if (!photos.length) return null;
  const largest = photos[photos.length - 1]; // most pixels
  const link = await telegram.getFileLink(largest.file_id);
  const buffer = await fetchBuffer(link.href || link, MAX_IMAGE_BYTES);
  const mimeType = 'image/jpeg';
  return {
    mimeType,
    data: buffer.toString('base64'),
    info: `photo ${largest.width}x${largest.height}`
  };
};

export const fetchDocumentContent = async (telegram, document) => {
  if (!document) return null;
  const link = await telegram.getFileLink(document.file_id);
  const buffer = await fetchBuffer(link.href || link, MAX_DOC_BYTES);
  const mime = document.mime_type || 'application/octet-stream';
  const name = document.file_name || 'file';

  if (mime.startsWith('text/') || mime === 'application/json') {
    const text = buffer.toString('utf8').slice(0, MAX_DOC_TEXT);
    return { type: 'text', text, fileName: name, mimeType: mime };
  }

  if (mime === 'application/pdf') {
    const { default: pdfParse } = await import('pdf-parse');
    const parsed = await pdfParse(buffer);
    const text = (parsed.text || '').trim().slice(0, MAX_DOC_TEXT);
    if (text) {
      return { type: 'text', text, fileName: name, mimeType: mime };
    }
  }

  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const { default: mammoth } = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value || '').trim().slice(0, MAX_DOC_TEXT);
    if (text) {
      return { type: 'text', text, fileName: name, mimeType: mime };
    }
  }

  // Other binaries: announce unsupported.
  return {
    type: 'unsupported',
    fileName: name,
    mimeType: mime
  };
};
