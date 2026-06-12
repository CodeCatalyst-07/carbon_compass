import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '../../hooks/use-toast';
import { DashboardPage } from '../dashboard';
import { DEMO_PROFILE } from '../../../lib/demo-profile';
import { createDefaultStoredData } from '../../../storage/schemas';
import type { StoredData } from '../../../storage/schemas';

let mockData: StoredData = createDefaultStoredData();
const listeners = new Set<() => void>();

vi.mock('../../../ai/config', () => ({
  AI_ENDPOINT: '',
  AI_COOLDOWN_MS: 30000,
  AI_CACHE_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  isAIConfigured: () => false,
}));

vi.mock('../../../storage/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../storage/adapter')>();
  return {
    ...actual,
    subscribe: vi.fn((cb: () => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
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

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <ToastProvider>
        <DashboardPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = createDefaultStoredData();
  });

  it('shows empty state when no profile', () => {
    renderDashboard();
    expect(screen.getByText(/No profile yet/i)).toBeInTheDocument();
  });

  it('shows results when profile exists', () => {
    mockData = { ...createDefaultStoredData(), profile: DEMO_PROFILE };
    renderDashboard();
    expect(screen.getByText(/Your carbon footprint/i)).toBeInTheDocument();
    expect(screen.getByText(/Monthly estimate/i)).toBeInTheDocument();
    expect(screen.getByText(/Annual estimate/i)).toBeInTheDocument();
  });

  it('shows category breakdown', () => {
    mockData = { ...createDefaultStoredData(), profile: DEMO_PROFILE };
    renderDashboard();
    expect(screen.getByText(/Category breakdown/i)).toBeInTheDocument();
  });

  it('shows confidence caveat', () => {
    mockData = { ...createDefaultStoredData(), profile: DEMO_PROFILE };
    renderDashboard();
    expect(screen.getByText(/estimates, not audited/i)).toBeInTheDocument();
  });

  it('shows AI unavailable notice (amendment 12)', () => {
    mockData = { ...createDefaultStoredData(), profile: DEMO_PROFILE };
    renderDashboard();
    expect(screen.getByText(/AI-powered insights are not configured/i)).toBeInTheDocument();
  });

  it('shows action buttons', () => {
    mockData = { ...createDefaultStoredData(), profile: DEMO_PROFILE };
    renderDashboard();
    expect(screen.getByText(/Explore actions/i)).toBeInTheDocument();
    expect(screen.getByText(/Simulate a swap/i)).toBeInTheDocument();
    expect(screen.getByText(/Save snapshot/i)).toBeInTheDocument();
  });

  it('handles zero-total profile', () => {
    mockData = {
      ...createDefaultStoredData(),
      profile: {
        transport: { modes: [] },
        electricity: { monthlyKwh: 0, isPersonalUsage: true, householdSize: 1 },
        diet: 'vegan',
        flights: { shortHaulLegs: 0, mediumHaulLegs: 0, longHaulLegs: 0 },
        personalization: {
          reductionGoalPercent: null,
          effortPreference: 'medium',
          budgetSensitivity: 'medium',
        },
      },
    };
    renderDashboard();
    expect(screen.getByText(/Your carbon footprint/i)).toBeInTheDocument();
  });
});
