import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '../../hooks/use-toast';
import { ActionsPage } from '../actions';
import { DEMO_PROFILE } from '../../../lib/demo-profile';
import { createDefaultStoredData } from '../../../storage/schemas';
import type { StoredData } from '../../../storage/schemas';
import { setActionStatus } from '../../../storage/adapter';

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

function renderActions() {
  return render(
    <MemoryRouter initialEntries={['/actions']}>
      <ToastProvider>
        <ActionsPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('ActionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = { ...createDefaultStoredData(), profile: DEMO_PROFILE };
  });

  it('shows empty state when no profile', () => {
    mockData = createDefaultStoredData();
    renderActions();
    expect(screen.getByText(/No profile yet/i)).toBeInTheDocument();
  });

  it('shows ranked actions with demo profile', () => {
    renderActions();
    expect(screen.getByText(/Recommended actions/i)).toBeInTheDocument();
    const articles = screen.getAllByRole('article');
    expect(articles.length).toBeGreaterThan(0);
  });

  it('marks an action as planned', async () => {
    const user = userEvent.setup();
    renderActions();

    const planButtons = screen.getAllByText(/Plan this/i);
    expect(planButtons.length).toBeGreaterThan(0);
    await user.click(planButtons[0]!);

    expect(vi.mocked(setActionStatus)).toHaveBeenCalledWith(
      expect.any(String),
      'planned',
      undefined,
    );
  });

  it('marks an action as completed', async () => {
    const user = userEvent.setup();
    renderActions();

    const completeButtons = screen.getAllByText(/Mark complete/i);
    expect(completeButtons.length).toBeGreaterThan(0);
    await user.click(completeButtons[0]!);

    expect(vi.mocked(setActionStatus)).toHaveBeenCalledWith(
      expect.any(String),
      'completed',
      undefined,
    );
  });

  it('dismisses an action', async () => {
    const user = userEvent.setup();
    renderActions();

    const dismissButtons = screen.getAllByText(/Dismiss/i);
    expect(dismissButtons.length).toBeGreaterThan(0);
    await user.click(dismissButtons[0]!);

    expect(vi.mocked(setActionStatus)).toHaveBeenCalledWith(
      expect.any(String),
      'dismissed',
      undefined,
    );
  });

  it('shows planned actions section when actions are planned', () => {
    mockData.trackedActions = [
      {
        actionId: 'reduce-car-usage',
        status: 'planned',
        plannedAt: new Date().toISOString(),
        completedAt: null,
        notes: '',
      },
    ];
    renderActions();
    expect(screen.getByText(/Your planned actions/i)).toBeInTheDocument();
  });

  it('shows completed section when actions are completed', () => {
    mockData.trackedActions = [
      {
        actionId: 'switch-to-green-energy',
        status: 'completed',
        plannedAt: null,
        completedAt: new Date().toISOString(),
        notes: '',
      },
    ];
    renderActions();
    expect(screen.getByText(/Completed \(/i)).toBeInTheDocument();
  });
});
