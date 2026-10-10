import type { DomainError } from '../../domain/DomainError.js';
import type { IHttpRequest } from './IHttpRequest.js';
import type { ErrorResponseBody, IHttpResponse } from './IHttpResponse.js';

export abstract class BaseController {
  async handle(request: IHttpRequest): Promise<IHttpResponse> {
    return this.executeImpl(request);
  }

  protected abstract executeImpl(request: IHttpRequest): Promise<IHttpResponse>;

  protected ok<T>(body: T): IHttpResponse {
    return { statusCode: 200, body };
  }

  protected created<T>(body: T): IHttpResponse {
    return { statusCode: 201, body };
  }

  protected fail(error: DomainError, requestId: string): IHttpResponse {
    const body: ErrorResponseBody = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
      requestId,
    };
    return { statusCode: error.httpStatus, body };
  }
}
