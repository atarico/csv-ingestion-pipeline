import * as z from 'zod';
import type { FieldError } from '../../../shared/domain/DomainError.js';

const pageSchema = z.coerce.number().int().min(1).max(100000).default(1);

export const UploadIdParamsSchema = z.object({ id: z.uuid() });

export const ListUploadsQuerySchema = z.object({
  page: pageSchema,
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const UploadResultsQuerySchema = z.object({
  page: pageSchema,
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

/** Maps zod issues to the API field errors; issues without a path are reported on `body`. */
export function zodToFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: issue.path.map(String).join('.') || 'body',
    message: issue.message,
  }));
}
