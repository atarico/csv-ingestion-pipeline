import { BaseController } from '../../../shared/infrastructure/http/BaseController.js';
import type { IHttpRequest } from '../../../shared/infrastructure/http/IHttpRequest.js';
import type { IHttpResponse } from '../../../shared/infrastructure/http/IHttpResponse.js';
import type { GetUploadStatsQueryHandler } from '../../application/queries/handlers/GetUploadStatsQueryHandler.js';

export class GetUploadStatsController extends BaseController {
  constructor(
    private readonly getUploadStatsQueryHandler: GetUploadStatsQueryHandler,
    private readonly defaultUserId: string,
  ) {
    super();
  }

  protected async executeImpl(request: IHttpRequest): Promise<IHttpResponse> {
    const result = await this.getUploadStatsQueryHandler.execute({ userId: this.defaultUserId });
    return result.isLeft() ? this.fail(result.value, request.requestId) : this.ok(result.value);
  }
}
