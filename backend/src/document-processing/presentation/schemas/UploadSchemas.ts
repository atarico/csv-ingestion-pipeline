import * as z from 'zod';
import { UPLOAD_STATUS_VALUES } from '../../domain/value-objects/UploadStatus.js';
import type { FieldError } from '../../../shared/domain/DomainError.js';

/** Literal strings only: `z.coerce.boolean()` would turn "false" into true. */
const booleanStringSchema = z.enum(['true', 'false']).transform((value) => value === 'true');

const pageSchema = z.coerce.number().int().min(1).max(100000).default(1);

export const UploadIdParamsSchema = z.object({ id: z.uuid() });

export const ListUploadsQuerySchema = z.object({
  page: pageSchema,
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(UPLOAD_STATUS_VALUES).optional(),
  hasRowErrors: booleanStringSchema.optional(),
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
