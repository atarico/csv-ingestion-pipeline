import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { uploadsClient } from '../api/uploadsClient';
import { UploadForm } from './UploadForm';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../api/uploadsClient', () => ({ uploadsClient: { create: vi.fn() } }));

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UploadForm />
    </QueryClientProvider>,
  );
}

describe('UploadForm', () => {
  it('rejects a .txt file with the extension message and keeps submit disabled', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderForm();

    await user.upload(screen.getByLabelText(/arrastra y suelta/i), new File(['x'], 'data.txt', { type: 'text/plain' }));

    expect(screen.getByRole('alert')).toHaveTextContent('El archivo debe tener extensión .csv');
    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled();
  });

  it('accepts a .csv file and enables submit', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.upload(
      screen.getByLabelText(/arrastra y suelta/i),
      new File(['category,amount,unit,date'], 'data.csv', { type: 'text/csv' }),
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Archivo seleccionado: data.csv')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir' })).toBeEnabled();
  });

  it('ignores a dropped file while an upload is pending', async () => {
    vi.mocked(uploadsClient.create).mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    renderForm();
    const csv = (name: string) => new File(['category,amount,unit,date'], name, { type: 'text/csv' });

    await user.upload(screen.getByLabelText(/arrastra y suelta/i), csv('first.csv'));
    await user.click(screen.getByRole('button', { name: 'Subir' }));
    expect(await screen.findByText(/subiendo/i)).toBeInTheDocument();

    fireEvent.drop(screen.getByText(/arrastra y suelta/i), { dataTransfer: { files: [csv('second.csv')] } });

    expect(screen.getByText('Archivo seleccionado: first.csv')).toBeInTheDocument();
    expect(screen.getByText(/subiendo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled();
    expect(uploadsClient.create).toHaveBeenCalledTimes(1);
  });

  it('resets the file input so the same file can be selected twice', () => {
    renderForm();
    const input = screen.getByLabelText<HTMLInputElement>(/arrastra y suelta/i);
    const file = new File(['category,amount,unit,date'], 'data.csv', { type: 'text/csv' });
    const valueSetter = vi.fn();
    Object.defineProperty(input, 'value', { configurable: true, get: () => 'C:\\fakepath\\data.csv', set: valueSetter });

    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText('Archivo seleccionado: data.csv')).toBeInTheDocument();
    expect(valueSetter).toHaveBeenLastCalledWith('');

    fireEvent.change(input, { target: { files: [file] } });
    expect(valueSetter).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Archivo seleccionado: data.csv')).toBeInTheDocument();
  });
});
