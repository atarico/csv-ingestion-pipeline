import { describe, expect, it } from 'vitest';
import { type DomainError, NotFoundError, ValidationError } from '../../domain/DomainError.js';
import { BaseController } from './BaseController.js';
import type { IHttpRequest } from './IHttpRequest.js';
import type { IHttpResponse } from './IHttpResponse.js';

class TestController extends BaseController {
  protected executeImpl(): Promise<IHttpResponse> {
    return Promise.resolve(this.ok({ a: 1 }));
  }
  okResponse(body: unknown): IHttpResponse {
    return this.ok(body);
  }
  createdResponse(body: unknown): IHttpResponse {
    return this.created(body);
  }
  failResponse(error: DomainError, requestId: string): IHttpResponse {
    return this.fail(error, requestId);
  }
}

const request: IHttpRequest = { requestId: 'req-1', params: {}, query: {}, body: undefined };
const controller = new TestController();

describe('BaseController', () => {
  it('handle delegates to executeImpl', async () => {
    await expect(controller.handle(request)).resolves.toEqual({ statusCode: 200, body: { a: 1 } });
  });

  it('fail maps DomainError to status and body', () => {
    const fieldErrors = [{ field: 'limit', message: 'too big' }];
    const response = controller.failResponse(
      new ValidationError('Invalid request', fieldErrors),
      'req-1',
    );
    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: fieldErrors },
      requestId: 'req-1',
    });
  });

  it('fail omits details when undefined', () => {
    const response = controller.failResponse(new NotFoundError('Upload', 'x'), 'req-2');
    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Upload x not found' },
      requestId: 'req-2',
    });
    expect('details' in (response.body as { error: object }).error).toBe(false);
  });

  it('ok and created set status codes', () => {
    expect(controller.okResponse({ a: 1 })).toEqual({ statusCode: 200, body: { a: 1 } });
    expect(controller.createdResponse({ b: 2 })).toEqual({ statusCode: 201, body: { b: 2 } });
  });
});
