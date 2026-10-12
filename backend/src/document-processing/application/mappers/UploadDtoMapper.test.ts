import { describe, expect, it } from 'vitest';
import { Upload } from '../../domain/entities/Upload.js';
import { FileName } from '../../domain/value-objects/FileName.js';
import { UploadDtoMapper } from './UploadDtoMapper.js';

function newUpload(): Upload {
  const fileName = FileName.create('data.csv');
  if (fileName.isLeft()) throw fileName.value;
  return Upload.create({ fileName: fileName.value, userId: 'user-123' });
}

describe('UploadDtoMapper', () => {
  it('exposes null errorCode and errorDetails for a healthy upload', () => {
    const dto = UploadDtoMapper.toDto(newUpload());

    expect(dto.errorCode).toBeNull();
    expect(dto.errorDetails).toBeNull();
    expect(dto.errorMessage).toBeNull();
  });

  it('exposes the failure code, message and details', () => {
    const upload = newUpload();
    upload.fail({
      code: 'INVALID_HEADER',
      message: 'Invalid CSV header: missing [date]',
      details: { missing: ['date'] },
    });

    const dto = UploadDtoMapper.toDto(upload);

    expect(dto.errorCode).toBe('INVALID_HEADER');
    expect(dto.errorMessage).toBe('Invalid CSV header: missing [date]');
    expect(dto.errorDetails).toEqual({ missing: ['date'] });
  });

  it('exposes code and value on row errors and omits an absent value', () => {
    const upload = newUpload();
    upload.startProcessing(2);
    upload.complete({
      processedRows: 1,
      failedRows: 1,
      rowErrors: [
        { row: 2, field: 'amount', code: 'INVALID_NUMBER', message: 'bad', value: 'abc' },
        { row: 2, field: 'unit', code: 'REQUIRED', message: 'unit is required' },
        { row: 3, code: 'INVALID', message: 'whole row' },
      ],
    });

    const { rowErrors } = UploadDtoMapper.toDto(upload);

    expect(rowErrors).toEqual([
      { row: 2, field: 'amount', code: 'INVALID_NUMBER', message: 'bad', value: 'abc' },
      { row: 2, field: 'unit', code: 'REQUIRED', message: 'unit is required' },
      { row: 3, code: 'INVALID', message: 'whole row' },
    ]);
    expect(rowErrors[1]).not.toHaveProperty('value');
    expect(rowErrors[2]).not.toHaveProperty('field');
  });

  it('leaves the summary shape unchanged', () => {
    expect(Object.keys(UploadDtoMapper.toSummary(newUpload())).sort()).toEqual([
      'createdAt',
      'failedRows',
      'fileName',
      'id',
      'processedRows',
      'status',
      'totalRows',
    ]);
  });
});
