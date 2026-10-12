import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadsClient } from '../api/uploadsClient';
import { UploadForm } from './UploadForm';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../api/uploadsClient', () => ({ uploadsClient: { create: vi.fn() } }));

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UploadForm />
    </QueryClientProvider>,
  );
}

const csv = (name: string, content = 'category,amount,unit,date') => new File([content], name, { type: 'text/csv' });
const selectedGroup = () => screen.getByRole('group', { name: 'Archivo seleccionado' });

describe('UploadForm', () => {
  beforeEach(() => {
    vi.mocked(uploadsClient.create).mockReset();
  });

  it('rejects a .txt file with the extension message and keeps submit disabled', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderForm();

    await user.upload(screen.getByLabelText(/arrastra y suelta/i), new File(['x'], 'data.txt', { type: 'text/plain' }));

    expect(screen.getByRole('alert')).toHaveTextContent('El archivo debe tener extensión .csv');
    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled();
    expect(screen.queryByRole('group', { name: 'Archivo seleccionado' })).not.toBeInTheDocument();
  });

  it('rejects a 0-byte file and keeps the drop zone', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.upload(screen.getByLabelText(/arrastra y suelta/i), csv('empty.csv', ''));

    expect(screen.getByRole('alert')).toHaveTextContent('El archivo está vacío');
    expect(screen.queryByRole('group', { name: 'Archivo seleccionado' })).not.toBeInTheDocument();
    expect(screen.getByText(/Solo se permiten archivos/)).toBeInTheDocument();
  });

  it('accepts a .csv file and shows the file card instead of the drop zone', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.upload(screen.getByLabelText(/arrastra y suelta/i), csv('data.csv'));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const group = selectedGroup();
    expect(within(group).getByText('data.csv')).toBeInTheDocument();
    expect(within(group).getByText('25 B')).toBeInTheDocument();
    expect(within(group).getByText('Archivo listo para procesar')).toBeInTheDocument();
    expect(screen.queryByText(/Solo se permiten archivos/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir' })).toBeEnabled();
  });

  it('Cambiar archivo reopens the file picker', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.upload(screen.getByLabelText(/arrastra y suelta/i), csv('data.csv'));
    const clickSpy = vi.spyOn(screen.getByLabelText<HTMLInputElement>(/arrastra y suelta/i), 'click');

    await user.click(screen.getByRole('button', { name: 'Cambiar archivo' }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('keeps the previous selection and shows the alert when an invalid file is dropped on the card', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.upload(screen.getByLabelText(/arrastra y suelta/i), csv('first.csv'));

    fireEvent.drop(selectedGroup(), {
      dataTransfer: { files: [new File(['x'], 'notes.txt')] },
    });

    expect(within(selectedGroup()).getByText('first.csv')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('El archivo debe tener extensión .csv');
    expect(screen.getByRole('button', { name: 'Subir' })).toBeEnabled();
  });

  it('replaces the selection when another valid file is dropped on the card', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.upload(screen.getByLabelText(/arrastra y suelta/i), csv('first.csv'));

    fireEvent.drop(selectedGroup(), {
      dataTransfer: { files: [csv('second.csv')] },
    });

    expect(within(selectedGroup()).getByText('second.csv')).toBeInTheDocument();
  });

  it('Subir opens the confirmation dialog with the file name and sends nothing yet', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.upload(screen.getByLabelText(/arrastra y suelta/i), csv('data.csv'));

    await user.click(screen.getByRole('button', { name: 'Subir' }));

    const dialog = screen.getByRole('dialog', {
      name: '¿Procesar el archivo?',
    });
    expect(dialog).toHaveTextContent('Se va a subir y procesar «data.csv» (25 B).');
    expect(uploadsClient.create).not.toHaveBeenCalled();
  });

  it('Cancelar and Escape close the dialog and send nothing', async () => {
    const user = userEvent.setup();
    renderForm();
    await user.upload(screen.getByLabelText(/arrastra y suelta/i), csv('data.csv'));

    await user.click(screen.getByRole('button', { name: 'Subir' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Subir' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(uploadsClient.create).not.toHaveBeenCalled();
    expect(selectedGroup()).toBeInTheDocument();
  });

  it('Sí, procesar uploads the file exactly once', async () => {
    vi.mocked(uploadsClient.create).mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    renderForm();
    await user.upload(screen.getByLabelText(/arrastra y suelta/i), csv('data.csv'));

    await user.click(screen.getByRole('button', { name: 'Subir' }));
    await user.click(screen.getByRole('button', { name: 'Sí, procesar' }));

    expect(uploadsClient.create).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/subiendo/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(selectedGroup()).toBeInTheDocument();
  });

  it('ignores a dropped file while an upload is pending', async () => {
    vi.mocked(uploadsClient.create).mockReturnValue(new Promise(() => undefined));
    const user = userEvent.setup();
    renderForm();

    await user.upload(screen.getByLabelText(/arrastra y suelta/i), csv('first.csv'));
    await user.click(screen.getByRole('button', { name: 'Subir' }));
    await user.click(screen.getByRole('button', { name: 'Sí, procesar' }));
    expect(await screen.findByText(/subiendo/i)).toBeInTheDocument();

    fireEvent.drop(selectedGroup(), {
      dataTransfer: { files: [csv('second.csv')] },
    });

    expect(within(selectedGroup()).getByText('first.csv')).toBeInTheDocument();
    expect(screen.getByText(/subiendo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled();
    expect(uploadsClient.create).toHaveBeenCalledTimes(1);
  });

  it('resets the file input so the same file can be selected twice', () => {
    renderForm();
    const input = screen.getByLabelText<HTMLInputElement>(/arrastra y suelta/i);
    const file = csv('data.csv');
    const valueSetter = vi.fn();
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => 'C:\\fakepath\\data.csv',
      set: valueSetter,
    });

    fireEvent.change(input, { target: { files: [file] } });
    expect(within(selectedGroup()).getByText('data.csv')).toBeInTheDocument();
    expect(valueSetter).toHaveBeenLastCalledWith('');

    fireEvent.change(input, { target: { files: [file] } });
    expect(valueSetter).toHaveBeenCalledTimes(2);
    expect(within(selectedGroup()).getByText('data.csv')).toBeInTheDocument();
  });
});
