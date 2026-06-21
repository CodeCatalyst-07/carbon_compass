import { Lightbulb, ArrowLeftRight, Camera, PenLine, AlertTriangle } from 'lucide-react';
import { useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router';

import { calculateFootprint } from '../../domain/calculator/calculator';
import { buildApplicabilityContext } from '../../domain/recommendations/build-context';
import { rankActions } from '../../domain/recommendations/ranker';
import { formatCO2e } from '../../domain/units';
import { AIInsightsPanel } from '../components/ai-insights-panel';
import { Badge } from '../components/badge';
import { BarChart, CATEGORY_COLORS, type BarChartItem } from '../components/bar-chart';
import { Button } from '../components/button';
import { Card } from '../components/card';
import { useLocalStore } from '../hooks/use-local-store';
import { useToast } from '../hooks/use-toast';

import type { FootprintResult, Category } from '../../storage/schemas';

const CATEGORY_LABELS: Record<Category, string> = {
  transport: 'Transport',
  electricity: 'Electricity',
  diet: 'Diet',
  flights: 'Flights',
};

/**
 * Dashboard page — results overview.
 *
 * Shows monthly + annual CO2e, category breakdown chart,
 * top drivers, confidence caveat, and action buttons.
 */
export function DashboardPage() {
  const store = useLocalStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const profile = store.data.profile;

  // Calculate footprint from current profile (deterministic)
  const result: FootprintResult | null = useMemo(() => {
    if (!profile) return null;
    return calculateFootprint(profile);
  }, [profile]);

  const displayUnit = store.data.settings.displayUnit;
  const trackedActions = store.data.trackedActions;

  // Ranked actions for AI panel
  const ranked = useMemo(() => {
    if (!profile || !result) return [];

    const ctx = buildApplicabilityContext(profile, result, trackedActions);
    return rankActions(ctx);
  }, [profile, result, trackedActions]);

  // Chart data
  const chartItems: BarChartItem[] = useMemo(() => {
    if (!result) return [];
    return result.breakdown.map((b) => ({
      label: CATEGORY_LABELS[b.category],
      value: b.annualKgCO2e,
      percentage: b.percentage,
      colorClass: CATEGORY_COLORS[b.category] ?? 'bg-mute',
    }));
  }, [result]);

  const handleSaveSnapshot = useCallback(() => {
    if (!profile || !result) return;
    store.addSnapshot({
      id: `snapshot-${Date.now()}`,
      date: new Date().toISOString(),
      result,
      profile,
    });
    addToast('Snapshot saved! Track your progress over time.', 'success');
  }, [profile, result, store, addToast]);

  // Redirect if no profile
  if (!profile || !result) {
    return (
      <div className="flex flex-col items-center gap-xl py-3xl text-center">
        <h1 className="font-display text-2xl font-black text-ink">No profile yet</h1>
        <p className="text-body max-w-sm">
          Complete the questionnaire to see your carbon footprint estimate.
        </p>
        <Button onClick={() => navigate('/onboarding')}>Get started</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2xl">
      {/* ─── Header ─── */}
      <section aria-labelledby="results-heading">
        <h1
          id="results-heading"
          className="font-display text-3xl md:text-4xl font-black text-ink mb-md"
        >
          Your carbon footprint
        </h1>

        {/* Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg mb-xl">
          <Card variant="sage" className="text-center">
            <p className="text-sm font-semibold text-body mb-xs">Monthly estimate</p>
            <p
              className="text-3xl font-black text-ink"
              aria-label={`Monthly: ${formatCO2e(result.totalMonthlyKgCO2e, displayUnit)} CO2 equivalent`}
            >
              {formatCO2e(result.totalMonthlyKgCO2e, displayUnit)}
            </p>
            <p className="text-xs text-mute mt-xs">CO₂e per month</p>
          </Card>
          <Card variant="green" className="text-center">
            <p className="text-sm font-semibold text-body mb-xs">Annual estimate</p>
            <p
              className="text-3xl font-black text-ink"
              aria-label={`Annual: ${formatCO2e(result.totalAnnualKgCO2e, displayUnit)} CO2 equivalent`}
            >
              {formatCO2e(result.totalAnnualKgCO2e, displayUnit)}
            </p>
            <p className="text-xs text-mute mt-xs">CO₂e per year</p>
          </Card>
        </div>
      </section>

      {/* ─── Category Breakdown ─── */}
      <section aria-labelledby="breakdown-heading">
        <h2 id="breakdown-heading" className="text-xl font-semibold text-ink mb-lg">
          Category breakdown
        </h2>
        <Card variant="content">
          <BarChart
            items={chartItems}
            unit={displayUnit === 'tonnes' ? 't' : 'kg'}
            title="Annual emissions by category"
          />
        </Card>
      </section>

      {/* ─── Top Drivers ─── */}
      {result.topDrivers.length > 0 && (
        <section aria-labelledby="drivers-heading">
          <h2 id="drivers-heading" className="text-xl font-semibold text-ink mb-lg">
            Main drivers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
            {result.topDrivers.map((driver, i) => (
              <Card key={driver.category} variant="content" className="flex flex-col gap-sm">
                <div className="flex items-center gap-sm">
                  <Badge variant={i === 0 ? 'negative' : 'neutral'}>#{i + 1}</Badge>
                  <span className="text-sm font-semibold text-ink">
                    {CATEGORY_LABELS[driver.category]}
                  </span>
                </div>
                <p className="text-sm text-body">{driver.reason}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ─── Confidence Caveat ─── */}
      <Card variant="sage" className="flex gap-md items-start">
        <AlertTriangle size={18} className="text-warning-deep shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex flex-col gap-xs">
          <p className="text-sm font-semibold text-ink">
            These are estimates, not audited measurements
          </p>
          <p className="text-xs text-body">
            Calculations use published emission factors with known limitations. Individual
            circumstances vary significantly.{' '}
            <Link
              to="/methodology"
              className="underline text-ink-deep hover:text-ink focus-visible:outline-2 focus-visible:outline-primary"
            >
              Learn about our methodology
            </Link>
          </p>
        </div>
      </Card>

      {/* ─── AI Insights Panel ─── */}
      <AIInsightsPanel
        result={result}
        rankedActions={ranked}
        constraints={{
          reductionGoalPercent: profile.personalization.reductionGoalPercent,
          effortPreference: profile.personalization.effortPreference,
          budgetSensitivity: profile.personalization.budgetSensitivity,
        }}
      />

      {/* ─── Action Buttons ─── */}
      <section aria-labelledby="actions-heading">
        <h2 id="actions-heading" className="sr-only">
          Next steps
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <Button onClick={() => navigate('/actions')} className="justify-start gap-md">
            <Lightbulb size={18} aria-hidden="true" />
            Explore actions
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/simulator')}
            className="justify-start gap-md"
          >
            <ArrowLeftRight size={18} aria-hidden="true" />
            Simulate a swap
          </Button>
          <Button variant="secondary" onClick={handleSaveSnapshot} className="justify-start gap-md">
            <Camera size={18} aria-hidden="true" />
            Save snapshot
          </Button>
          <Button
            variant="tertiary"
            onClick={() => navigate('/onboarding')}
            className="justify-start gap-md"
          >
            <PenLine size={18} aria-hidden="true" />
            Revise answers
          </Button>
        </div>
      </section>
    </div>
  );
}
