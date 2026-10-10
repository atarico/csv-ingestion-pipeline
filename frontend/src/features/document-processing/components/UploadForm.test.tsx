import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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
});
