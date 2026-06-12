import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '../../hooks/use-toast';
import { MethodologyPage } from '../methodology';
import { DEMO_PROFILE } from '../../../lib/demo-profile';
import { createDefaultStoredData } from '../../../storage/schemas';
import { calculateFootprint } from '../../../domain/calculator/calculator';
import { deleteAllData } from '../../../storage/adapter';
import type { StoredData } from '../../../storage/schemas';

let mockData: StoredData = createDefaultStoredData();

vi.mock('../../../storage/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../storage/adapter')>();
  return {
    ...actual,
    subscribe: vi.fn(() => {
      return () => {};
    }),
    loadData: vi.fn(() => mockData),
    loadDataWithStatus: vi.fn(() => ({ data: mockData, status: 'loaded' as const })),
    saveProfile: vi.fn(),
    addSnapshot: vi.fn(),
    updateSettings: vi.fn(),
    deleteAllData: vi.fn(),
    exportDataAsJSON: vi.fn(() => JSON.stringify(mockData, null, 2)),
    importData: vi.fn(),
    deleteSnapshot: vi.fn(() => true),
    setActionStatus: vi.fn(),
  };
});

function renderMethodology() {
  return render(
    <MemoryRouter initialEntries={['/methodology']}>
      <ToastProvider>
        <MethodologyPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('MethodologyPage — JSON import and clear-all', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const result = calculateFootprint(DEMO_PROFILE);
    mockData = {
      ...createDefaultStoredData(),
      profile: DEMO_PROFILE,
      snapshots: [
        {
          id: 'snap-1',
          date: new Date().toISOString(),
          result,
          profile: DEMO_PROFILE,
        },
      ],
    };
  });

  it('renders the methodology page with data management section', () => {
    renderMethodology();
    expect(screen.getByText(/Methodology, privacy/i)).toBeInTheDocument();
    expect(screen.getByText(/Manage your data/i)).toBeInTheDocument();
  });

  it('shows export button', () => {
    renderMethodology();
    expect(screen.getByRole('button', { name: /Export JSON/i })).toBeInTheDocument();
  });

  it('shows import section with file input', () => {
    renderMethodology();
    expect(screen.getByText(/Import data/i)).toBeInTheDocument();
    const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.type).toBe('file');
    expect(fileInput.accept).toContain('.json');
  });

  it('shows error for invalid import file', async () => {
    renderMethodology();

    const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
    const invalidFile = new File(['not valid json'], 'bad.json', { type: 'application/json' });

    // Use fireEvent.change to simulate file selection (DataTransfer not available in jsdom)
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    // FileReader.onload fires asynchronously in jsdom
    const errorEl = await screen.findByText(/could not be parsed|corrupted|invalid/i);
    expect(errorEl).toBeInTheDocument();
  });

  it('shows confirmation for valid import file', async () => {
    renderMethodology();

    const validData = JSON.stringify(mockData);
    const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
    const validFile = new File([validData], 'export.json', { type: 'application/json' });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Should show confirmation dialog — use heading role to avoid collision with button
    const heading = await screen.findByRole('heading', { name: /Confirm import/i });
    expect(heading).toBeInTheDocument();
  });

  it('opens clear-all confirmation modal', async () => {
    const user = userEvent.setup();
    renderMethodology();

    const clearButton = screen.getByRole('button', { name: /Clear all data/i });
    await user.click(clearButton);

    expect(screen.getByText(/Clear all data\?/i)).toBeInTheDocument();
    // The modal dialog has the text about permanently deleting
    const dialogs = document.querySelectorAll('dialog');
    const clearDialog = Array.from(dialogs).find((d) =>
      d.textContent?.includes('permanently delete'),
    );
    expect(clearDialog).toBeTruthy();
  });

  it('cancels clear-all when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderMethodology();

    await user.click(screen.getByRole('button', { name: /Clear all data/i }));
    expect(screen.getByText(/Clear all data\?/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(vi.mocked(deleteAllData)).not.toHaveBeenCalled();
  });

  it('confirms clear-all and calls deleteAllData', async () => {
    const user = userEvent.setup();
    renderMethodology();

    await user.click(screen.getByRole('button', { name: /Clear all data/i }));
    await user.click(screen.getByRole('button', { name: /Clear everything/i }));

    expect(vi.mocked(deleteAllData)).toHaveBeenCalledTimes(1);
  });

  it('shows emission factor table', () => {
    renderMethodology();
    expect(screen.getByRole('heading', { name: /Emission factors/i })).toBeInTheDocument();
  });
});
