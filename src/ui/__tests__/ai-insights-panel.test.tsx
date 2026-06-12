/**
 * Tests for the AI Insights Panel component.
 *
 * Amendment 12: Tests for every panel state.
 * Uses mock transport — no Firebase CLI, emulator, or Gemini key needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AIInsightsPanel } from '../components/ai-insights-panel';
import type { FootprintResult } from '../../storage/schemas';
import type { RankedAction } from '../../domain/recommendations/types';

// Mock the AI config to control configured/unconfigured state
const mockIsConfigured = vi.fn().mockReturnValue(false);
vi.mock('../../ai/config', () => ({
  get AI_ENDPOINT() {
    return mockIsConfigured() ? 'http://localhost:5001/test/us-central1/insights' : '';
  },
  AI_COOLDOWN_MS: 30_000,
  AI_CACHE_TTL_MS: 7 * 24 * 60 * 60 * 1000,
  isAIConfigured: () => mockIsConfigured(),
}));

// Mock the hook to control state
const mockRequestInsights = vi.fn();
const mockClearInsights = vi.fn();
const mockStatus = vi.fn().mockReturnValue({ state: 'idle' as const });
vi.mock('../../ai/use-ai-insights', () => ({
  useAIInsights: () => ({
    status: mockStatus(),
    requestInsights: mockRequestInsights,
    clearInsights: mockClearInsights,
  }),
}));

const mockResult: FootprintResult = {
  totalAnnualKgCO2e: 5000,
  totalMonthlyKgCO2e: 416.7,
  breakdown: [
    {
      category: 'transport',
      annualKgCO2e: 1500,
      monthlyKgCO2e: 125,
      percentage: 30,
      factorsUsed: ['transport.car.average'],
      methodology: 'Test',
    },
    {
      category: 'diet',
      annualKgCO2e: 2000,
      monthlyKgCO2e: 166.7,
      percentage: 40,
      factorsUsed: ['diet.heavy_meat'],
      methodology: 'Test',
    },
    {
      category: 'electricity',
      annualKgCO2e: 1000,
      monthlyKgCO2e: 83.3,
      percentage: 20,
      factorsUsed: ['electricity.grid.global_average'],
      methodology: 'Test',
    },
    {
      category: 'flights',
      annualKgCO2e: 500,
      monthlyKgCO2e: 41.7,
      percentage: 10,
      factorsUsed: ['flights.short_haul'],
      methodology: 'Test',
    },
  ],
  topDrivers: [{ category: 'diet', percentage: 40, reason: 'Diet contributes 40%.' }],
  factorRegistryVersion: '0.2.0',
  calculatedAt: '2026-01-01T00:00:00.000Z',
  isEstimate: true,
};

const mockRankedActions: RankedAction[] = [
  {
    action: {
      id: 'diet-reduce-meat',
      title: 'Reduce meat consumption',
      description: 'Desc',
      category: 'diet',
      rationale: 'Rationale',
      isApplicable: () => true,
      metadata: {
        estimatedSavingsKgCO2ePerYear: null,
        savingsConfidence: null,
        savingsMethodology: null,
        effort: 'medium',
        cost: 'saves-money',
        timeHorizon: 'immediate',
        impact: 'high',
        mapsSearchQuery: null,
        mapsActionType: null,
      },
    },
    rank: 1,
    scores: {
      impactScore: 1,
      contextMatchScore: 0.5,
      driverRelevanceScore: 1,
      effortScore: 0.6,
      costScore: 1,
      compositeScore: 0.85,
    },
    explainableReason: 'High impact.',
  },
];

const constraints = {
  reductionGoalPercent: 20 as number | null,
  effortPreference: 'medium',
  budgetSensitivity: 'medium',
};

function renderPanel() {
  return render(
    <MemoryRouter>
      <AIInsightsPanel
        result={mockResult}
        rankedActions={mockRankedActions}
        constraints={constraints}
      />
    </MemoryRouter>,
  );
}

describe('AIInsightsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConfigured.mockReturnValue(false);
    mockStatus.mockReturnValue({ state: 'idle' });
  });

  it('renders unconfigured state when AI is not configured', () => {
    mockIsConfigured.mockReturnValue(false);
    renderPanel();
    expect(screen.getByText(/not configured/i)).toBeInTheDocument();
    expect(screen.getByText(/View recommended actions/i)).toBeInTheDocument();
  });

  it('renders idle state with disclosure when AI is configured', () => {
    mockIsConfigured.mockReturnValue(true);
    mockStatus.mockReturnValue({ state: 'idle' });
    renderPanel();
    expect(screen.getByText(/Get a personalized explanation/i)).toBeInTheDocument();
    expect(screen.getByText(/No identifying information/i)).toBeInTheDocument();
    expect(screen.getByText(/Get AI insights/i)).toBeInTheDocument();
    expect(screen.getByText(/Use local guidance instead/i)).toBeInTheDocument();
  });

  it('renders loading state', () => {
    mockIsConfigured.mockReturnValue(true);
    mockStatus.mockReturnValue({ state: 'loading' });
    renderPanel();
    expect(screen.getByText(/Generating your personalized plan/i)).toBeInTheDocument();
  });

  it('renders success state with AI data', () => {
    mockIsConfigured.mockReturnValue(true);
    mockStatus.mockReturnValue({
      state: 'success',
      data: {
        summary: 'Your diet is the main driver.',
        actionExplanations: [
          { actionId: 'diet-reduce-meat', explanation: 'Reducing meat helps.' },
          { actionId: 'transport-reduce-car', explanation: 'Fewer car trips help.' },
          { actionId: 'electricity-reduce', explanation: 'Less electricity helps.' },
        ],
        weeklyPlan: [
          { day: 'Monday', task: 'Plant-based breakfast.' },
          { day: 'Tuesday', task: 'Walk to shop.' },
          { day: 'Wednesday', task: 'Turn off lights.' },
          { day: 'Thursday', task: 'Veggie lunch.' },
          { day: 'Friday', task: 'Take the bus.' },
          { day: 'Saturday', task: 'Cook vegan dinner.' },
          { day: 'Sunday', task: 'Plan meals.' },
        ],
        caveat: 'All values are estimates.',
      },
      fromCache: false,
    });
    renderPanel();
    expect(screen.getByText('Your diet is the main driver.')).toBeInTheDocument();
    expect(screen.getByText('Reducing meat helps.')).toBeInTheDocument();
    expect(screen.getByText('Plant-based breakfast.')).toBeInTheDocument();
    expect(screen.getByText('All values are estimates.')).toBeInTheDocument();
  });

  it('renders cached indicator when from cache', () => {
    mockIsConfigured.mockReturnValue(true);
    mockStatus.mockReturnValue({
      state: 'success',
      data: {
        summary: 'Cached result.',
        actionExplanations: [
          { actionId: 'a1', explanation: 'e1' },
          { actionId: 'a2', explanation: 'e2' },
          { actionId: 'a3', explanation: 'e3' },
        ],
        weeklyPlan: Array.from({ length: 7 }, (_, i) => ({
          day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i]!,
          task: `Task ${i + 1}`,
        })),
        caveat: 'Caveat.',
      },
      fromCache: true,
    });
    renderPanel();
    expect(screen.getByText('Cached')).toBeInTheDocument();
  });

  it('renders cooldown state', () => {
    mockIsConfigured.mockReturnValue(true);
    mockStatus.mockReturnValue({ state: 'cooldown', retryAfterMs: 30_000 });
    renderPanel();
    expect(screen.getByText('Please wait before requesting again')).toBeInTheDocument();
  });

  it('renders offline error state', () => {
    mockIsConfigured.mockReturnValue(true);
    mockStatus.mockReturnValue({ state: 'error', error: 'offline', message: 'Offline' });
    renderPanel();
    expect(screen.getByText(/appear to be offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Use local guidance instead/i)).toBeInTheDocument();
  });

  it('renders rate-limited error state', () => {
    mockIsConfigured.mockReturnValue(true);
    mockStatus.mockReturnValue({ state: 'error', error: 'rate-limited', message: 'Too many' });
    renderPanel();
    expect(screen.getByText('Too many requests')).toBeInTheDocument();
  });

  it('renders server-error state', () => {
    mockIsConfigured.mockReturnValue(true);
    mockStatus.mockReturnValue({ state: 'error', error: 'server-error', message: 'Error' });
    renderPanel();
    expect(screen.getByText(/Server error/i)).toBeInTheDocument();
  });

  it('renders malformed response error', () => {
    mockIsConfigured.mockReturnValue(true);
    mockStatus.mockReturnValue({ state: 'error', error: 'malformed', message: 'Invalid' });
    renderPanel();
    expect(screen.getByText(/Invalid AI response/i)).toBeInTheDocument();
  });

  it('renders timeout error', () => {
    mockIsConfigured.mockReturnValue(true);
    mockStatus.mockReturnValue({ state: 'error', error: 'timeout', message: 'Timeout' });
    renderPanel();
    expect(screen.getByText(/timed out/i)).toBeInTheDocument();
  });

  it('renders unknown error', () => {
    mockIsConfigured.mockReturnValue(true);
    mockStatus.mockReturnValue({ state: 'error', error: 'unknown', message: 'Unknown' });
    renderPanel();
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  });
});
