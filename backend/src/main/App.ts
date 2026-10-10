import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import type { AwilixContainer } from 'awilix';
import fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import type pino from 'pino';
import type { AppConfig } from '../config/IConvictProps.js';
import { documentProcessingRoutes } from '../document-processing/presentation/routes/DocumentProcessingRoutes.js';
import { DomainError } from '../shared/domain/DomainError.js';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
  requestId: string;
}

export function buildApp(container: AwilixContainer): FastifyInstance {
  const config = container.resolve<AppConfig>('appConfig');
  // Typing the pino instance as FastifyBaseLogger keeps the app on Fastify's default generics.
  const loggerInstance: FastifyBaseLogger = container.resolve<pino.Logger>('logger');
  const maxBytes = config.upload.maxFileSizeBytes;

  const app = fastify({
    loggerInstance,
    genReqId: () => randomUUID(),
    requestIdHeader: 'x-request-id',
    bodyLimit: maxBytes + 1024 * 1024,
  });

  app.register(cors, { origin: config.corsOrigin });
  app.register(multipart, { limits: { fileSize: maxBytes, files: 1 } });

  app.addHook('onSend', (request, reply) => {
    reply.header('x-request-id', request.id);
    return Promise.resolve();
  });

  app.get('/health', () => ({ status: 'ok' }));
  app.register(documentProcessingRoutes, { prefix: '/api/v1', container });

  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: { code: 'NOT_FOUND', message: 'Route not found' },
      requestId: request.id,
    } satisfies ErrorBody),
  );

  // The only HTTP error boundary: Fastify hands the error here, so no try/catch is needed.
  app.setErrorHandler((error, request, reply) => {
    const send = (statusCode: number, code: string, message: string, details?: unknown) =>
      reply.code(statusCode).send({
        error: { code, message, ...(details !== undefined ? { details } : {}) },
        requestId: request.id,
      } satisfies ErrorBody);

    if (error instanceof DomainError) {
      return send(error.httpStatus, error.code, error.message, error.details);
    }
    const tooLarge = `File exceeds the maximum size of ${maxBytes} bytes`;
    const errorCode = (error as { code?: unknown }).code;
    if (errorCode === 'FST_REQ_FILE_TOO_LARGE' || errorCode === 'FST_ERR_CTP_BODY_TOO_LARGE') {
      return send(413, 'FILE_TOO_LARGE', tooLarge);
    }
    if (errorCode === 'FST_INVALID_MULTIPART_CONTENT_TYPE') {
      return send(400, 'VALIDATION_ERROR', 'Expected multipart/form-data');
    }
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode <= 499) {
      return send(statusCode, 'BAD_REQUEST', (error as Error).message);
    }
    request.log.error({ err: error }, 'Unhandled error');
    return send(500, 'INTERNAL_ERROR', 'Unexpected error');
  });

  return app;
}
