import { ValidationError } from '../../../shared/domain/DomainError.js';
import { BaseController } from '../../../shared/infrastructure/http/BaseController.js';
import type { IHttpRequest } from '../../../shared/infrastructure/http/IHttpRequest.js';
import type { IHttpResponse } from '../../../shared/infrastructure/http/IHttpResponse.js';
import type { ListUploadsQueryHandler } from '../../application/queries/handlers/ListUploadsQueryHandler.js';
import { ListUploadsQuerySchema, zodToFieldErrors } from '../schemas/UploadSchemas.js';

export class ListUploadsController extends BaseController {
  constructor(
    private readonly listUploadsQueryHandler: ListUploadsQueryHandler,
    private readonly defaultUserId: string,
  ) {
    super();
  }

  protected async executeImpl(request: IHttpRequest): Promise<IHttpResponse> {
    const query = ListUploadsQuerySchema.safeParse(request.query);
    if (!query.success) {
      return this.fail(
        new ValidationError('Invalid request', zodToFieldErrors(query.error)),
        request.requestId,
      );
    }
    const result = await this.listUploadsQueryHandler.execute({
      userId: this.defaultUserId,
      page: query.data.page,
      limit: query.data.limit,
      filter: {
        ...(query.data.status !== undefined && { status: query.data.status }),
        ...(query.data.hasRowErrors !== undefined && { hasRowErrors: query.data.hasRowErrors }),
      },
    });
    return result.isLeft() ? this.fail(result.value, request.requestId) : this.ok(result.value);
  }
}
