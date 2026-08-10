// Shared HTTP helpers for Vercel serverless functions (Node runtime).

/**
 * Reads the full request body as a Buffer.
 * Works on Vercel's Node runtime and in plain Node http servers.
 */
export async function readBody(req) {
  if (req.body !== undefined) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === 'string') return Buffer.from(req.body, 'utf-8');
    return Buffer.from(JSON.stringify(req.body), 'utf-8');
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Sends a JSON response. */
export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

/**
 * Minimal RFC-2388 multipart/form-data parser (no dependencies).
 * Returns { fields: {name: string}, files: [{ name, filename, contentType, data, size }] }.
 */
export function parseMultipartForm(body, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!m) return { fields: {}, files: [] };
  const boundary = (m[1] || m[2]).trim();

  const delim = Buffer.from(`--${boundary}`);
  const close = Buffer.from(`--${boundary}--`);
  const closeIdx = body.indexOf(close);
  const searchEnd = closeIdx === -1 ? body.length : closeIdx;

  const parts = [];
  let cursor = 0;
  while (true) {
    const startIdx = body.indexOf(delim, cursor);
    if (startIdx === -1 || startIdx > searchEnd) break;
    const after = startIdx + delim.length;
    // Boundary followed by '--' means end of parts.
    if (body[after] === 0x2d && body[after + 1] === 0x2d) break;
    let endIdx = body.indexOf(delim, after);
    if (endIdx === -1 || endIdx > searchEnd) endIdx = searchEnd;
    let part = body.subarray(after, endIdx);
    // Strip leading CRLF.
    if (part[0] === 0x0d && part[1] === 0x0a) part = part.subarray(2);
    // Strip trailing CRLF.
    if (part.length >= 2 && part[part.length - 1] === 0x0a && part[part.length - 2] === 0x0d) {
      part = part.subarray(0, part.length - 2);
    }
    parts.push(part);
    cursor = endIdx;
  }

  const fields = {};
  const files = [];
  const headerSep = Buffer.from('\r\n\r\n');

  for (const part of parts) {
    const sepIdx = part.indexOf(headerSep);
    if (sepIdx === -1) continue;
    const header = part.subarray(0, sepIdx).toString('utf-8');
    const data = part.subarray(sepIdx + 4);

    const contentDisposition = /content-disposition:\s*(.*?)(?:\r\n|$)/i.exec(header);
    const contentTypeMatch = /content-type:\s*([^\r\n]+)/i.exec(header);
    const nameMatch = /name="([^"]*)"/i.exec(contentDisposition ? contentDisposition[1] : '');
    const filenameMatch = /filename="([^"]*)"/i.exec(contentDisposition ? contentDisposition[1] : '');

    if (!nameMatch) continue;
    const name = nameMatch[1];
    if (filenameMatch && filenameMatch[1].length > 0) {
      files.push({
        name,
        filename: filenameMatch[1],
        contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
        data,
        size: data.length
      });
    } else {
      fields[name] = data.toString('utf-8');
    }
  }

  return { fields, files };
}

/** Escapes a value as a (Mailjet-safe) plain string. */
export function clean(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}