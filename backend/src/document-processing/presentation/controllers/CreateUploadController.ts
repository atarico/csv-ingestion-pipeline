import { ValidationError } from '../../../shared/domain/DomainError.js';
import { BaseController } from '../../../shared/infrastructure/http/BaseController.js';
import type { IHttpRequest } from '../../../shared/infrastructure/http/IHttpRequest.js';
import type { IHttpResponse } from '../../../shared/infrastructure/http/IHttpResponse.js';
import type { CreateUploadCommandHandler } from '../../application/commands/handlers/CreateUploadCommandHandler.js';

export class CreateUploadController extends BaseController {
  constructor(
    private readonly createUploadCommandHandler: CreateUploadCommandHandler,
    private readonly defaultUserId: string,
  ) {
    super();
  }

  protected async executeImpl(request: IHttpRequest): Promise<IHttpResponse> {
    if (request.file === undefined) {
      return this.fail(
        new ValidationError('A file is required', [
          { field: 'file', message: 'must be provided as multipart field "file"' },
        ]),
        request.requestId,
      );
    }
    const result = await this.createUploadCommandHandler.execute({
      fileName: request.file.fileName,
      content: request.file.content,
      mimeType: request.file.mimeType,
      size: request.file.size,
      userId: this.defaultUserId,
    });
    return result.isLeft()
      ? this.fail(result.value, request.requestId)
      : this.created(result.value);
  }
}
