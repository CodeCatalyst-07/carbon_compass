import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '../../hooks/use-toast';
import { OnboardingPage } from '../onboarding';
import { createDefaultStoredData } from '../../../storage/schemas';
import type { StoredData } from '../../../storage/schemas';

// Stable mock data — useSyncExternalStore needs reference stability
let mockData: StoredData = createDefaultStoredData();
const listeners = new Set<() => void>();

vi.mock('../../../storage/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../storage/adapter')>();
  return {
    ...actual,
    subscribe: vi.fn((cb: () => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }),
    loadData: vi.fn(() => mockData),
    loadDataWithStatus: vi.fn(() => ({ data: mockData, status: 'fresh' as const })),
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

const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

function renderOnboarding() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <ToastProvider>
        <OnboardingPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('OnboardingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = createDefaultStoredData();
  });

  it('renders step 1 with heading and next button', () => {
    renderOnboarding();
    expect(screen.getByText(/Welcome to Carbon Compass/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    renderOnboarding();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('loads demo profile when clicking sample data button', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    const loadBtn = screen.getByText(/Load sample data/i);
    await user.click(loadBtn);

    expect(screen.getByText(/Sample data loaded/i)).toBeInTheDocument();
  });

  it('navigates forward and backward through steps', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    await user.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText(/How do you get around/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Back/i }));
    expect(screen.getByText(/Welcome to Carbon Compass/i)).toBeInTheDocument();
  });

  it('shows transport checkboxes on step 2', async () => {
    const user = userEvent.setup();
    renderOnboarding();
    await user.click(screen.getByRole('button', { name: /Next/i }));

    expect(screen.getByText('Car')).toBeInTheDocument();
    expect(screen.getByText('Bus')).toBeInTheDocument();
    expect(screen.getByText('Train')).toBeInTheDocument();
  });

  it('shows diet selection on step 4', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    }

    expect(screen.getByText(/Your diet/i)).toBeInTheDocument();
    expect(screen.getByText('Regular meat eater')).toBeInTheDocument();
  });

  it('shows reduction goal input on step 5 when toggled', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    }

    const toggle = screen.getByRole('switch', { name: /Set a reduction goal/i });
    await user.click(toggle);

    expect(screen.getByRole('spinbutton', { name: /Reduction target/i })).toBeInTheDocument();
  });

  it('submits form and navigates to dashboard', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    }

    await user.click(screen.getByRole('button', { name: /Calculate my footprint/i }));

    const { saveProfile, addSnapshot, updateSettings } = await import('../../../storage/adapter');
    expect(saveProfile).toHaveBeenCalled();
    expect(addSnapshot).toHaveBeenCalled();
    expect(updateSettings).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});

describe('Returning user prepopulation', () => {
  it('pre-populates form and shows "Revise" heading when profile exists', () => {
    mockData = createDefaultStoredData();
    mockData.profile = {
      transport: { modes: [{ mode: 'car', weeklyDistanceKm: 50 }] },
      electricity: { monthlyKwh: 300, isPersonalUsage: false, householdSize: 2 },
      diet: 'vegetarian',
      flights: { shortHaulLegs: 2, mediumHaulLegs: 1, longHaulLegs: 0 },
      personalization: {
        reductionGoalPercent: 15,
        effortPreference: 'high',
        budgetSensitivity: 'low',
      },
    };

    renderOnboarding();
    expect(screen.getByText(/Revise your answers/i)).toBeInTheDocument();
    expect(screen.getByText(/Back to dashboard/i)).toBeInTheDocument();
  });
});

describe('Zero-total results', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockData = createDefaultStoredData();
  });

  it('handles a profile with all zeros without crashing', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole('button', { name: /Next/i }));
    }

    await user.click(screen.getByRole('button', { name: /Calculate my footprint/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});
