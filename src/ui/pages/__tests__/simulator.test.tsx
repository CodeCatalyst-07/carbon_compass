import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '../../hooks/use-toast';
import { SimulatorPage } from '../simulator';
import { DEMO_PROFILE } from '../../../lib/demo-profile';
import { createDefaultStoredData } from '../../../storage/schemas';
import { calculateFootprint } from '../../../domain/calculator/calculator';
import { saveProfile, addSnapshot } from '../../../storage/adapter';
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

function renderSimulator() {
  return render(
    <MemoryRouter initialEntries={['/simulator']}>
      <ToastProvider>
        <SimulatorPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('SimulatorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const result = calculateFootprint(DEMO_PROFILE);
    const existingSnapshot: Snapshot = {
      id: 'snapshot-existing',
      date: new Date().toISOString(),
      result,
      profile: DEMO_PROFILE,
    };
    mockData = {
      ...createDefaultStoredData(),
      profile: DEMO_PROFILE,
      snapshots: [existingSnapshot],
    };
  });

  it('shows empty state when no profile', () => {
    mockData = createDefaultStoredData();
    renderSimulator();
    expect(screen.getByText(/No profile yet/i)).toBeInTheDocument();
  });

  it('renders with initial state showing the simulator', () => {
    renderSimulator();
    expect(screen.getByText(/Swap simulator/i)).toBeInTheDocument();
    expect(screen.getByText('SIMULATION')).toBeInTheDocument();
  });

  it('shows NOT SAVED badge before applying', () => {
    renderSimulator();
    expect(screen.getByText(/NOT SAVED/i)).toBeInTheDocument();
  });

  it('applies diet change to profile without mutating snapshots', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Select diet category radio
    const dietRadio = screen.getByRole('radio', { name: /Diet/i });
    await user.click(dietRadio);

    // Click apply button
    const applyButton = screen.getByRole('button', { name: /Apply this change/i });
    await user.click(applyButton);

    // saveProfile should have been called with updated profile
    expect(vi.mocked(saveProfile)).toHaveBeenCalledTimes(1);
    const savedProfile = vi.mocked(saveProfile).mock.calls[0]![0];
    expect(savedProfile).toBeDefined();

    // addSnapshot should NOT have been called — amendment 10
    expect(vi.mocked(addSnapshot)).not.toHaveBeenCalled();
  });

  it('does not modify existing snapshots on apply', async () => {
    const user = userEvent.setup();
    renderSimulator();

    // Capture initial snapshot reference
    const snapshotsBefore = [...mockData.snapshots];

    // Select diet and apply
    const dietRadio = screen.getByRole('radio', { name: /Diet/i });
    await user.click(dietRadio);

    const applyButton = screen.getByRole('button', { name: /Apply this change/i });
    await user.click(applyButton);

    // Snapshots should be unchanged
    expect(mockData.snapshots).toEqual(snapshotsBefore);
    expect(mockData.snapshots.length).toBe(1);
    expect(mockData.snapshots[0]!.id).toBe('snapshot-existing');
  });
});
