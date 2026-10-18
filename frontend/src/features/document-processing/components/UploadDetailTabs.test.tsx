import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UploadDetailTabs } from './UploadDetailTabs';

const tabs = [
  { key: 'data' as const, label: 'Datos procesados', count: 19, tone: 'accent' as const },
  { key: 'errors' as const, label: 'Filas con errores', count: 6, tone: 'danger' as const },
];

describe('UploadDetailTabs', () => {
  it('renders a tablist with counts, the selected tab wired to the panel', () => {
    render(
      <UploadDetailTabs tabs={tabs} selected="errors" onSelect={vi.fn()}>
        <p>panel body</p>
      </UploadDetailTabs>,
    );

    expect(screen.getByRole('tablist', { name: 'Contenido del upload' })).toBeInTheDocument();
    const selected = screen.getByRole('tab', { name: /^Filas con errores\s*6$/ });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(selected).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /^Datos procesados\s*19$/ })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', selected.id);
    expect(selected).toHaveAttribute('aria-controls', screen.getByRole('tabpanel').id);
    expect(screen.getByText('panel body')).toBeInTheDocument();
  });

  it('selects on click', async () => {
    const onSelect = vi.fn();
    render(
      <UploadDetailTabs tabs={tabs} selected="errors" onSelect={onSelect}>
        <p />
      </UploadDetailTabs>,
    );

    await userEvent.click(screen.getByRole('tab', { name: /^Datos procesados/ }));

    expect(onSelect).toHaveBeenCalledWith('data');
  });

  it('moves focus and selection with arrows, Home and End', async () => {
    const onSelect = vi.fn();
    render(
      <UploadDetailTabs tabs={tabs} selected="data" onSelect={onSelect}>
        <p />
      </UploadDetailTabs>,
    );
    const first = screen.getByRole('tab', { name: /^Datos procesados/ });
    first.focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith('errors');
    expect(screen.getByRole('tab', { name: /^Filas con errores/ })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith('data');

    await userEvent.keyboard('{End}');
    expect(onSelect).toHaveBeenLastCalledWith('errors');

    await userEvent.keyboard('{Home}');
    expect(onSelect).toHaveBeenLastCalledWith('data');
  });
});
