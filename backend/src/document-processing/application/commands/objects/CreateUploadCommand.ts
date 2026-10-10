export interface CreateUploadCommand {
  fileName: string;
  content: Buffer;
  mimeType: string;
  size: number;
  userId: string;
}
