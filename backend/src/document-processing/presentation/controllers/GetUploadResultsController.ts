import { ValidationError } from '../../../shared/domain/DomainError.js';
import { BaseController } from '../../../shared/infrastructure/http/BaseController.js';
import type { IHttpRequest } from '../../../shared/infrastructure/http/IHttpRequest.js';
import type { IHttpResponse } from '../../../shared/infrastructure/http/IHttpResponse.js';
import type { GetUploadResultsQueryHandler } from '../../application/queries/handlers/GetUploadResultsQueryHandler.js';
import {
  UploadIdParamsSchema,
  UploadResultsQuerySchema,
  zodToFieldErrors,
} from '../schemas/UploadSchemas.js';

export class GetUploadResultsController extends BaseController {
  constructor(
    private readonly getUploadResultsQueryHandler: GetUploadResultsQueryHandler,
    private readonly defaultUserId: string,
  ) {
    super();
  }

  protected async executeImpl(request: IHttpRequest): Promise<IHttpResponse> {
    const params = UploadIdParamsSchema.safeParse(request.params);
    if (!params.success) {
      return this.fail(
        new ValidationError('Invalid request', zodToFieldErrors(params.error)),
        request.requestId,
      );
    }
    const query = UploadResultsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return this.fail(
        new ValidationError('Invalid request', zodToFieldErrors(query.error)),
        request.requestId,
      );
    }
    const result = await this.getUploadResultsQueryHandler.execute({
      uploadId: params.data.id,
      userId: this.defaultUserId,
      page: query.data.page,
      limit: query.data.limit,
    });
    return result.isLeft() ? this.fail(result.value, request.requestId) : this.ok(result.value);
  }
}
