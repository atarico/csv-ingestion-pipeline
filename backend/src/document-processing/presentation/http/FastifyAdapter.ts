import type { FastifyReply, FastifyRequest } from 'fastify';
import { ValidationError } from '../../../shared/domain/DomainError.js';
import type { IHttpRequest } from '../../../shared/infrastructure/http/IHttpRequest.js';
import type { IHttpResponse } from '../../../shared/infrastructure/http/IHttpResponse.js';

export interface ToHttpRequestOptions {
  /** Reads the first multipart file part into memory. */
  multipart: boolean;
}

/**
 * Translates a Fastify request into the framework-agnostic IHttpRequest.
 * `request.file()` and `toBuffer()` may reject (invalid content type, size limit); the rejection
 * propagates to Fastify's error handler.
 */
export async function toHttpRequest(
  request: FastifyRequest,
  options?: ToHttpRequestOptions,
): Promise<IHttpRequest> {
  const httpRequest: IHttpRequest = {
    requestId: request.id,
    params: request.params as Record<string, string | undefined>,
    query: request.query as Record<string, string | string[] | undefined>,
    body: request.body,
  };

  if (options?.multipart === true) {
    const part = await request.file();
    if (part) {
      if (part.fieldname !== 'file') {
        throw new ValidationError('The file must be sent in the multipart field "file"', [
          { field: 'file', message: 'must be provided as multipart field "file"' },
        ]);
      }
      const content = await part.toBuffer();
      httpRequest.file = {
        fileName: part.filename,
        mimeType: part.mimetype,
        content,
        size: content.length,
      };
    }
  }
  return httpRequest;
}

export function sendResponse(reply: FastifyReply, response: IHttpResponse): FastifyReply {
  return reply.code(response.statusCode).send(response.body);
}
