import * as z from 'zod';

export const FileUploadedMessageSchema = z.object({
  type: z.literal('FILE_UPLOADED'),
  version: z.literal(1),
  uploadId: z.uuid(),
  fileKey: z.string().min(1),
  occurredAt: z.iso.datetime(),
});

export type FileUploadedMessage = z.infer<typeof FileUploadedMessageSchema>;

export function createFileUploadedMessage(
  uploadId: string,
  fileKey: string,
  now = new Date(),
): FileUploadedMessage {
  return { type: 'FILE_UPLOADED', version: 1, uploadId, fileKey, occurredAt: now.toISOString() };
}
