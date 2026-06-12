import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '../../hooks/use-toast';
import { ProgressPage } from '../progress';
import { DEMO_PROFILE } from '../../../lib/demo-profile';
import { createDefaultStoredData } from '../../../storage/schemas';
import { calculateFootprint } from '../../../domain/calculator/calculator';
import { deleteSnapshot } from '../../../storage/adapter';
import type { StoredData, Snapshot } from '../../../storage/schemas';

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
    exportDataAsJSON: vi.fn(() => '{}'),
    importData: vi.fn(),
    deleteSnapshot: vi.fn(() => true),
    setActionStatus: vi.fn(),
  };
});

function createSnapshot(id: string, daysAgo: number): Snapshot {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id,
    date: date.toISOString(),
    result: calculateFootprint(DEMO_PROFILE),
    profile: DEMO_PROFILE,
  };
}

function renderProgress() {
  return render(
    <MemoryRouter initialEntries={['/progress']}>
      <ToastProvider>
        <ProgressPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('ProgressPage — snapshot deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = {
      ...createDefaultStoredData(),
      profile: DEMO_PROFILE,
      snapshots: [
        createSnapshot('snapshot-1', 30),
        createSnapshot('snapshot-2', 15),
        createSnapshot('snapshot-3', 0),
      ],
    };
  });

  it('shows delete buttons for each snapshot', () => {
    renderProgress();
    const deleteButtons = screen.getAllByRole('button', { name: /Delete snapshot/i });
    expect(deleteButtons.length).toBe(3);
  });

  it('opens confirmation modal when delete button is clicked', async () => {
    const user = userEvent.setup();
    renderProgress();

    const deleteButtons = screen.getAllByRole('button', { name: /Delete snapshot/i });
    await user.click(deleteButtons[0]!);

    expect(screen.getByText(/Delete snapshot\?/i)).toBeInTheDocument();
    expect(screen.getByText(/permanently remove/i)).toBeInTheDocument();
  });

  it('cancels deletion when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderProgress();

    const deleteButtons = screen.getAllByRole('button', { name: /Delete snapshot/i });
    await user.click(deleteButtons[0]!);

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(vi.mocked(deleteSnapshot)).not.toHaveBeenCalled();
  });

  it('confirms deletion when Delete is clicked in modal', async () => {
    const user = userEvent.setup();
    renderProgress();

    const deleteButtons = screen.getAllByRole('button', { name: /Delete snapshot/i });
    await user.click(deleteButtons[0]!);

    const confirmDelete = screen.getByRole('button', { name: /^Delete$/i });
    await user.click(confirmDelete);

    expect(vi.mocked(deleteSnapshot)).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no snapshots', () => {
    mockData = { ...createDefaultStoredData(), profile: DEMO_PROFILE, snapshots: [] };
    renderProgress();
    expect(screen.getByText(/No snapshots yet/i)).toBeInTheDocument();
  });

  it('shows single snapshot state', () => {
    mockData = {
      ...createDefaultStoredData(),
      profile: DEMO_PROFILE,
      snapshots: [createSnapshot('only-snap', 0)],
    };
    renderProgress();
    expect(screen.getByText(/Your first snapshot/i)).toBeInTheDocument();
  });

  it('shows trend comparison with multiple snapshots', () => {
    renderProgress();
    expect(screen.getByText(/No change/i)).toBeInTheDocument();
    expect(screen.getByText(/Comparing your oldest/i)).toBeInTheDocument();
  });
});
