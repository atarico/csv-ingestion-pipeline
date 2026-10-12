'use client';

import { useState, type ChangeEvent, type DragEvent } from 'react';
import { Button } from '@/shared/components/Button';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { UploadIcon } from '@/shared/components/icons';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { getApiErrorMessage } from '@/shared/lib/api-client';
import { useCreateUpload } from '../api/uploadsApi';
import { validateCsvFile } from '../lib/validateCsvFile';

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { mutate, isPending, isError, error, reset, progress } = useCreateUpload();

  const selectFile = (candidate: File | undefined) => {
    reset();
    setFile(candidate ?? null);
    if (!candidate) {
      setValidationError(null);
      return;
    }
    setValidationError(validateCsvFile(candidate));
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const candidate = event.target.files?.[0];
    // Clear the input so choosing the same file again still fires `change`.
    event.target.value = '';
    selectFile(candidate);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isPending) return;
    selectFile(event.dataTransfer.files[0]);
  };

  const canSubmit = file !== null && validationError === null && !isPending;

  return (
    <section className="mx-auto max-w-xl space-y-5">
      <h1 className="text-3xl font-bold tracking-tight text-primary">Subir archivo CSV</h1>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (file && canSubmit) mutate(file);
        }}
      >
        <label
          htmlFor="csv-file"
          onDragOver={(event) => {
            event.preventDefault();
            if (!isPending) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed p-8 text-center transition-colors duration-150 ease-brand motion-reduce:transition-none focus-within:ring-[3px] focus-within:ring-accent/40 ${
            isDragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface hover:bg-primary-soft/40'
          }`}
        >
          <UploadIcon className="h-8 w-8 text-primary" />
          <span className="font-medium text-ink">
            Arrastra y suelta un archivo CSV aquí, o haz clic para seleccionarlo
          </span>
          <span className="text-sm text-ink-muted">Solo se permiten archivos .csv de hasta 5 MB</span>
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={handleChange}
            disabled={isPending}
            className="sr-only"
          />
        </label>

        {file ? <p className="text-sm text-ink-muted">Archivo seleccionado: {file.name}</p> : null}
        {validationError ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {validationError}
          </p>
        ) : null}

        {isPending ? (
          <div className="space-y-2">
            <p className="text-sm text-ink-muted">Subiendo… {progress}%</p>
            <ProgressBar value={progress} label="Progreso de subida" />
          </div>
        ) : null}

        {isError ? <ErrorAlert title="No se pudo subir el archivo" message={getApiErrorMessage(error)} /> : null}

        <Button type="submit" disabled={!canSubmit}>
          Subir
        </Button>
      </form>
    </section>
  );
}
