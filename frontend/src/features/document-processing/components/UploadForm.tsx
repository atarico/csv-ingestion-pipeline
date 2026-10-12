'use client';

import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Button } from '@/shared/components/Button';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { CheckCircleIcon, FileIcon, UploadIcon } from '@/shared/components/icons';
import { ProgressBar } from '@/shared/components/ProgressBar';
import { getApiErrorMessage } from '@/shared/lib/api-client';
import { formatBytes } from '@/shared/lib/format';
import { useCreateUpload } from '../api/uploadsApi';
import { validateCsvFile } from '../lib/validateCsvFile';

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate, isPending, isError, error, reset, progress } = useCreateUpload();

  const selectFile = (candidate: File | undefined) => {
    if (!candidate) return;
    reset();
    const error = validateCsvFile(candidate);
    setValidationError(error);
    // An invalid file never becomes the selection; a previous valid one is kept.
    if (error === null) setFile(candidate);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const candidate = event.target.files?.[0];
    // Clear the input so choosing the same file again still fires `change`.
    event.target.value = '';
    selectFile(candidate);
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    if (!isPending) setIsDragging(true);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isPending) return;
    selectFile(event.dataTransfer.files[0]);
  };

  const canSubmit = file !== null && !isPending;

  return (
    <section className="mx-auto max-w-xl space-y-5">
      <h1 className="text-3xl font-bold tracking-tight text-primary">Subir archivo CSV</h1>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) setConfirmOpen(true);
        }}
      >
        <input
          ref={inputRef}
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          aria-label="Arrastra y suelta un archivo CSV aquí, o haz clic para seleccionarlo"
          onChange={handleChange}
          disabled={isPending}
          className="peer sr-only"
        />

        {file ? (
          <div
            role="group"
            aria-label="Archivo seleccionado"
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex animate-card-in flex-wrap items-center gap-4 rounded-card border p-5 transition-colors duration-150 ease-brand motion-reduce:animate-none motion-reduce:transition-none ${
              isDragging ? 'border-accent bg-accent-soft' : 'border-accent/40 bg-surface'
            }`}
          >
            <div className="relative shrink-0">
              <FileIcon className="h-10 w-10 text-primary" />
              <CheckCircleIcon className="absolute -bottom-1 -right-2 h-5 w-5 rounded-full bg-surface text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block break-all font-semibold text-ink">{file.name}</strong>
              <span className="block text-sm text-ink-muted">{formatBytes(file.size)}</span>
              <span className="block text-sm font-medium text-accent">Archivo listo para procesar</span>
            </div>
            <Button variant="secondary" disabled={isPending} onClick={() => inputRef.current?.click()}>
              Cambiar archivo
            </Button>
          </div>
        ) : (
          <label
            htmlFor="csv-file"
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed p-8 text-center transition-colors duration-150 ease-brand motion-reduce:transition-none peer-focus-visible:ring-[3px] peer-focus-visible:ring-accent/40 ${
              isDragging ? 'border-accent bg-accent-soft' : 'border-line-strong bg-surface hover:bg-primary-soft/40'
            }`}
          >
            <UploadIcon className="h-8 w-8 text-primary" />
            <span className="font-medium text-ink">
              Arrastra y suelta un archivo CSV aquí, o haz clic para seleccionarlo
            </span>
            <span className="text-sm text-ink-muted">Solo se permiten archivos .csv de hasta 5 MB</span>
          </label>
        )}

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

      {file ? (
        <ConfirmDialog
          open={confirmOpen}
          title="¿Procesar el archivo?"
          confirmLabel="Sí, procesar"
          cancelLabel="Cancelar"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
            mutate(file);
          }}
        >
          Se va a subir y procesar «{file.name}» ({formatBytes(file.size)}). Podrás seguir el avance en la página de
          detalle.
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
