const BOUNDARY = '----vitest-boundary';

/** Builds a multipart/form-data body with one file part under the field name "file". */
export function buildMultipart(
  fileName: string,
  content: Buffer | string,
  mimeType = 'text/csv',
): { payload: Buffer; headers: Record<string, string> } {
  const head = Buffer.from(
    `--${BOUNDARY}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`,
  );
  const body = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const tail = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);
  return {
    payload: Buffer.concat([head, body, tail]),
    headers: { 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
  };
}
