export interface UploadedFile {
  fileName: string;
  mimeType: string;
  content: Buffer;
  size: number;
}
export interface IHttpRequest {
  requestId: string;
  params: Record<string, string | undefined>;
  query: Record<string, string | string[] | undefined>;
  body: unknown;
  file?: UploadedFile;
}
