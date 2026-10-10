import type { AwilixContainer } from 'awilix';
import type { FastifyPluginAsync } from 'fastify';
import type { CreateUploadController } from '../controllers/CreateUploadController.js';
import type { GetUploadByIdController } from '../controllers/GetUploadByIdController.js';
import type { GetUploadResultsController } from '../controllers/GetUploadResultsController.js';
import type { GetUploadStatsController } from '../controllers/GetUploadStatsController.js';
import type { ListUploadsController } from '../controllers/ListUploadsController.js';
import { sendResponse, toHttpRequest } from '../http/FastifyAdapter.js';

export interface RoutesOptions {
  container: AwilixContainer;
}

export const documentProcessingRoutes: FastifyPluginAsync<RoutesOptions> = (app, { container }) => {
  const createUpload = container.resolve<CreateUploadController>('createUploadController');
  const listUploads = container.resolve<ListUploadsController>('listUploadsController');
  const getUploadStats = container.resolve<GetUploadStatsController>('getUploadStatsController');
  const getUploadById = container.resolve<GetUploadByIdController>('getUploadByIdController');
  const getUploadResults = container.resolve<GetUploadResultsController>(
    'getUploadResultsController',
  );

  app.post('/uploads', async (request, reply) =>
    sendResponse(
      reply,
      await createUpload.handle(await toHttpRequest(request, { multipart: true })),
    ),
  );
  app.get('/uploads', async (request, reply) =>
    sendResponse(reply, await listUploads.handle(await toHttpRequest(request))),
  );
  // Registered before /uploads/:id to make the intent explicit.
  app.get('/uploads/stats', async (request, reply) =>
    sendResponse(reply, await getUploadStats.handle(await toHttpRequest(request))),
  );
  app.get('/uploads/:id', async (request, reply) =>
    sendResponse(reply, await getUploadById.handle(await toHttpRequest(request))),
  );
  app.get('/uploads/:id/results', async (request, reply) =>
    sendResponse(reply, await getUploadResults.handle(await toHttpRequest(request))),
  );
  return Promise.resolve();
};
