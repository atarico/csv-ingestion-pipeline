import { ValidationError } from '../../../shared/domain/DomainError.js';
import { BaseController } from '../../../shared/infrastructure/http/BaseController.js';
import type { IHttpRequest } from '../../../shared/infrastructure/http/IHttpRequest.js';
import type { IHttpResponse } from '../../../shared/infrastructure/http/IHttpResponse.js';
import type { GetUploadByIdQueryHandler } from '../../application/queries/handlers/GetUploadByIdQueryHandler.js';
import { UploadIdParamsSchema, zodToFieldErrors } from '../schemas/UploadSchemas.js';

export class GetUploadByIdController extends BaseController {
  constructor(
    private readonly getUploadByIdQueryHandler: GetUploadByIdQueryHandler,
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
    const result = await this.getUploadByIdQueryHandler.execute({
      id: params.data.id,
      userId: this.defaultUserId,
    });
    return result.isLeft() ? this.fail(result.value, request.requestId) : this.ok(result.value);
  }
}
