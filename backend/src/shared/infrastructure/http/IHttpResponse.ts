export interface IHttpResponse {
  statusCode: number;
  body: unknown;
}
export interface ErrorResponseBody {
  error: { code: string; message: string; details?: unknown };
  requestId: string;
}
