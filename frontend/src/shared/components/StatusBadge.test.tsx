import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { UploadStatusValue } from '@/features/document-processing/types/upload.types';
import { StatusBadge } from './StatusBadge';

const cases: Array<[UploadStatusValue, string, string]> = [
  ['PENDING', 'Pendiente', 'bg-amber-100 text-amber-800'],
  ['PROCESSING', 'Procesando', 'bg-blue-100 text-blue-800'],
  ['COMPLETED', 'Completado', 'bg-green-100 text-green-800'],
  ['FAILED', 'Fallido', 'bg-red-100 text-red-800'],
];

describe('StatusBadge', () => {
  it.each(cases)('renders Spanish label and color class per status (%s)', (status, label, classes) => {
    render(<StatusBadge status={status} />);
    const badge = screen.getByRole('status');
    expect(badge).toHaveTextContent(label);
    for (const className of classes.split(' ')) expect(badge).toHaveClass(className);
  });
});
