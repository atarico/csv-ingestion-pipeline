import { asClass, type AwilixContainer } from 'awilix';
import { CreateUploadCommandHandler } from '../../application/commands/handlers/CreateUploadCommandHandler.js';
import { ProcessFileCommandHandler } from '../../application/commands/handlers/ProcessFileCommandHandler.js';
import { GetUploadByIdQueryHandler } from '../../application/queries/handlers/GetUploadByIdQueryHandler.js';
import { GetUploadResultsQueryHandler } from '../../application/queries/handlers/GetUploadResultsQueryHandler.js';
import { GetUploadStatsQueryHandler } from '../../application/queries/handlers/GetUploadStatsQueryHandler.js';
import { ListUploadsQueryHandler } from '../../application/queries/handlers/ListUploadsQueryHandler.js';
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
    getUploadByIdQueryHandler: asClass(GetUploadByIdQueryHandler).singleton(),
    listUploadsQueryHandler: asClass(ListUploadsQueryHandler).singleton(),
    getUploadResultsQueryHandler: asClass(GetUploadResultsQueryHandler).singleton(),
    getUploadStatsQueryHandler: asClass(GetUploadStatsQueryHandler).singleton(),
  });
}
