'use client';

import { useState, type ChangeEvent, type DragEvent } from 'react';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
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
      <h1 className="text-2xl font-semibold text-slate-900">Subir archivo CSV</h1>

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
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-2 ${
            isDragging ? 'border-emerald-600 bg-emerald-50' : 'border-slate-300 bg-white hover:bg-slate-50'
          }`}
        >
          <span className="font-medium text-slate-800">
            Arrastra y suelta un archivo CSV aquí, o haz clic para seleccionarlo
          </span>
          <span className="text-sm text-slate-600">Solo se permiten archivos .csv de hasta 5 MB</span>
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            onChange={handleChange}
            disabled={isPending}
            className="sr-only"
          />
        </label>

        {file ? <p className="text-sm text-slate-700">Archivo seleccionado: {file.name}</p> : null}
        {validationError ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {validationError}
          </p>
        ) : null}

        {isPending ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-700">Subiendo… {progress}%</p>
            <ProgressBar value={progress} label="Progreso de subida" />
          </div>
        ) : null}

        {isError ? <ErrorAlert title="No se pudo subir el archivo" message={getApiErrorMessage(error)} /> : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Subir
        </button>
      </form>
    </section>
  );
}
