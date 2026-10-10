import { asClass, type AwilixContainer } from 'awilix';
import { CreateUploadCommandHandler } from '../../application/commands/handlers/CreateUploadCommandHandler.js';
import { ProcessFileCommandHandler } from '../../application/commands/handlers/ProcessFileCommandHandler.js';
import { GetUploadByIdQueryHandler } from '../../application/queries/handlers/GetUploadByIdQueryHandler.js';
import { GetUploadResultsQueryHandler } from '../../application/queries/handlers/GetUploadResultsQueryHandler.js';
import { GetUploadStatsQueryHandler } from '../../application/queries/handlers/GetUploadStatsQueryHandler.js';
import { ListUploadsQueryHandler } from '../../application/queries/handlers/ListUploadsQueryHandler.js';
import { CreateUploadController } from '../../presentation/controllers/CreateUploadController.js';
import { GetUploadByIdController } from '../../presentation/controllers/GetUploadByIdController.js';
import { GetUploadResultsController } from '../../presentation/controllers/GetUploadResultsController.js';
import { GetUploadStatsController } from '../../presentation/controllers/GetUploadStatsController.js';
import { ListUploadsController } from '../../presentation/controllers/ListUploadsController.js';
import { FileProcessingWorker } from '../../../workers/FileProcessingWorker.js';
import { CsvParseCsvParser } from '../csv/CsvParseCsvParser.js';
import { PrismaActivityDataRepository } from '../persistence/repositories/PrismaActivityDataRepository.js';
import { PrismaUploadRepository } from '../persistence/repositories/PrismaUploadRepository.js';

/** Constructor parameter names must equal registration names (Awilix CLASSIC mode). */
export function registerDocumentProcessingModule(container: AwilixContainer): void {
  container.register({
    uploadRepository: asClass(PrismaUploadRepository).singleton(),
    activityDataRepository: asClass(PrismaActivityDataRepository).singleton(),
    csvParser: asClass(CsvParseCsvParser).singleton(),
    createUploadCommandHandler: asClass(CreateUploadCommandHandler).singleton(),
    processFileCommandHandler: asClass(ProcessFileCommandHandler).singleton(),
    fileProcessingWorker: asClass(FileProcessingWorker).singleton(),
    getUploadByIdQueryHandler: asClass(GetUploadByIdQueryHandler).singleton(),
    listUploadsQueryHandler: asClass(ListUploadsQueryHandler).singleton(),
    getUploadResultsQueryHandler: asClass(GetUploadResultsQueryHandler).singleton(),
    getUploadStatsQueryHandler: asClass(GetUploadStatsQueryHandler).singleton(),
    createUploadController: asClass(CreateUploadController).singleton(),
    getUploadByIdController: asClass(GetUploadByIdController).singleton(),
    listUploadsController: asClass(ListUploadsController).singleton(),
    getUploadResultsController: asClass(GetUploadResultsController).singleton(),
    getUploadStatsController: asClass(GetUploadStatsController).singleton(),
  });
}
