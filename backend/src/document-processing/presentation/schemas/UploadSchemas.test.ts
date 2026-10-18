import { describe, expect, it } from 'vitest';
import { ListUploadsQuerySchema } from './UploadSchemas.js';

describe('ListUploadsQuerySchema', () => {
  it('keeps the filters undefined when absent', () => {
    const parsed = ListUploadsQuerySchema.parse({});

    expect(parsed).toEqual({ page: 1, limit: 10 });
  });

  it('parses status and the literal strings of hasRowErrors', () => {
    const withErrors = ListUploadsQuerySchema.parse({ status: 'COMPLETED', hasRowErrors: 'true' });
    const withoutErrors = ListUploadsQuerySchema.parse({ hasRowErrors: 'false' });

    expect(withErrors).toMatchObject({ status: 'COMPLETED', hasRowErrors: true });
    expect(withoutErrors.hasRowErrors).toBe(false);
  });

  it.each(['yes', '1', 'TRUE', ''])('rejects hasRowErrors=%j', (value) => {
    expect(ListUploadsQuerySchema.safeParse({ hasRowErrors: value }).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(ListUploadsQuerySchema.safeParse({ status: 'DONE' }).success).toBe(false);
  });
});
