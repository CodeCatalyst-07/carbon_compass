/**
 * AI Insights Panel — optional personalized explanation layer.
 *
 * Design: Wise design system (sage/green/dark cards, xl radius, Inter typography).
 *
 * Amendment 10:
 * - "Use local guidance instead" navigates to /actions (not scroll)
 * - Preserves deterministic totals, rankings, and snapshots in every state
 * - All AI text rendered as text (never dangerouslySetInnerHTML)
 *
 * States: idle (pre-request), loading, success, error variants, cooldown.
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Sparkles, AlertCircle, WifiOff, Clock, Shield, Loader2, CheckCircle2 } from 'lucide-react';
import { Card } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { useAIInsights } from '../../ai/use-ai-insights';
import { isAIConfigured } from '../../ai/config';
import type { AIInsightsRequest, AIInsightsErrorKind } from '../../ai/types';
import type { FootprintResult } from '../../storage/schemas';
import type { RankedAction } from '../../domain/recommendations/types';

interface AIInsightsPanelProps {
  /** The deterministic footprint result. */
  result: FootprintResult;
  /** Top 5 ranked actions from the deterministic ranker. */
  rankedActions: RankedAction[];
  /** User's personalization constraints. */
  constraints: {
    reductionGoalPercent: number | null;
    effortPreference: string;
    budgetSensitivity: string;
  };
}

/**
 * AI Insights Panel component.
 *
 * Placed on the dashboard to optionally enhance deterministic recommendations.
 * Deterministic data is ALWAYS preserved regardless of AI state.
 */
export function AIInsightsPanel({ result, rankedActions, constraints }: AIInsightsPanelProps) {
  const navigate = useNavigate();

  // Build AI request from deterministic data
  const aiRequest: AIInsightsRequest | null = useMemo(() => {
    if (!result || rankedActions.length === 0) return null;

    const top5 = rankedActions.slice(0, 5);

    return {
      factorRegistryVersion: result.factorRegistryVersion,
      totals: {
        annualKgCO2e: result.totalAnnualKgCO2e,
        monthlyKgCO2e: result.totalMonthlyKgCO2e,
      },
      categoryShares: result.breakdown.map((b) => ({
        category: b.category,
        percentage: b.percentage,
        annualKgCO2e: b.annualKgCO2e,
      })),
      topDrivers: result.topDrivers.map((d) => ({
        category: d.category,
        percentage: d.percentage,
        reason: d.reason,
      })),
      rankedActions: top5.map((ra) => ({
        id: ra.action.id,
        title: ra.action.title,
        rank: ra.rank,
      })),
      goal: {
        reductionGoalPercent: constraints.reductionGoalPercent,
      },
      constraints: {
        effortPreference: constraints.effortPreference,
        budgetSensitivity: constraints.budgetSensitivity,
      },
    };
  }, [result, rankedActions, constraints]);

  const { status, requestInsights } = useAIInsights(aiRequest);

  const goToActions = () => navigate('/actions');

  // ─── Unconfigured state ───
  if (!isAIConfigured()) {
    return (
      <Card variant="content" className="flex gap-md items-start border border-canvas-soft">
        <Shield size={18} className="text-mute shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex flex-col gap-xs">
          <p className="text-sm font-semibold text-ink">AI-powered insights are not configured</p>
          <p className="text-xs text-body">
            All guidance shown is based on deterministic calculations using published emission
            factors. Personalized AI explanations require server configuration.
          </p>
          <button
            type="button"
            onClick={goToActions}
            className="text-xs text-ink-deep underline hover:text-ink focus-visible:outline-2 focus-visible:outline-primary rounded self-start mt-xs"
          >
            View recommended actions
          </button>
        </div>
      </Card>
    );
  }

  // ─── Idle state (pre-request) ───
  if (status.state === 'idle') {
    return (
      <Card variant="sage" className="flex flex-col gap-md">
        <div className="flex items-start gap-md">
          <Sparkles size={20} className="text-ink-deep shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex flex-col gap-xs">
            <p className="text-sm font-semibold text-ink">Get a personalized explanation</p>
            <p className="text-xs text-body">
              Get an AI-generated summary of your footprint and a 7-day action plan tailored to your
              top recommendations.
            </p>
          </div>
        </div>

        {/* Data disclosure (amendment 10) */}
        <div className="bg-canvas rounded-lg p-md text-xs text-mute">
          <p>
            Clicking below will send a summary of your footprint categories, totals, and ranked
            actions to our server for a personalized explanation. No identifying information (name,
            email, or address) is sent.
          </p>
        </div>

        <div className="flex flex-wrap gap-sm">
          <Button id="ai-insights-request-button" onClick={requestInsights} size="sm">
            <Sparkles size={14} aria-hidden="true" />
            Get AI insights
          </Button>
          <button
            type="button"
            onClick={goToActions}
            className="text-sm text-ink-deep underline hover:text-ink focus-visible:outline-2 focus-visible:outline-primary rounded px-sm py-xs"
          >
            Use local guidance instead
          </button>
        </div>
      </Card>
    );
  }

  // ─── Loading state ───
  if (status.state === 'loading') {
    return (
      <Card variant="sage" className="flex flex-col gap-md animate-pulse-subtle">
        <div className="flex items-center gap-md">
          <Loader2 size={20} className="text-ink-deep shrink-0 animate-spin" aria-hidden="true" />
          <div className="flex flex-col gap-xs">
            <p className="text-sm font-semibold text-ink">Generating your personalized plan…</p>
            <p className="text-xs text-mute">This usually takes a few seconds.</p>
          </div>
        </div>
        {/* Skeleton lines */}
        <div className="flex flex-col gap-sm" aria-hidden="true">
          <div className="h-3 bg-canvas-soft rounded-full w-4/5" />
          <div className="h-3 bg-canvas-soft rounded-full w-3/5" />
          <div className="h-3 bg-canvas-soft rounded-full w-2/3" />
        </div>
      </Card>
    );
  }

  // ─── Success state ───
  if (status.state === 'success') {
    const { data, fromCache } = status;

    return (
      <Card variant="content" className="flex flex-col gap-lg border border-primary-neutral">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Sparkles size={18} className="text-ink-deep" aria-hidden="true" />
            <span className="text-sm font-semibold text-ink">AI-powered insights</span>
          </div>
          <div className="flex items-center gap-xs">
            {fromCache && (
              <Badge variant="neutral">
                <CheckCircle2 size={10} aria-hidden="true" className="mr-1" />
                Cached
              </Badge>
            )}
            <Badge variant="neutral">Optional explanation</Badge>
          </div>
        </div>

        {/* Summary — rendered as text, never HTML (amendment 10) */}
        <div className="text-sm text-body leading-relaxed">
          <p>{data.summary}</p>
        </div>

        {/* Action Explanations */}
        <div className="flex flex-col gap-md">
          <h3 className="text-sm font-semibold text-ink">Why these actions matter for you</h3>
          {data.actionExplanations.map((expl) => (
            <div
              key={expl.actionId}
              className="bg-canvas-soft rounded-xl p-md flex flex-col gap-xs"
            >
              <span className="text-xs font-semibold text-ink-deep">
                {expl.actionId.replace(/-/g, ' ')}
              </span>
              <p className="text-xs text-body">{expl.explanation}</p>
            </div>
          ))}
        </div>

        {/* 7-Day Plan */}
        <div className="flex flex-col gap-md">
          <h3 className="text-sm font-semibold text-ink">Your 7-day starter plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            {data.weeklyPlan.map((day) => (
              <div key={day.day} className="bg-primary-pale rounded-xl p-md flex flex-col gap-xxs">
                <span className="text-xs font-semibold text-ink-deep">{day.day}</span>
                <p className="text-xs text-body">{day.task}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Caveat (amendment 10) */}
        <div className="bg-canvas-soft rounded-lg p-md text-xs text-mute italic">
          <p>{data.caveat}</p>
        </div>

        <button
          type="button"
          onClick={goToActions}
          className="text-sm text-ink-deep underline hover:text-ink focus-visible:outline-2 focus-visible:outline-primary rounded self-start"
        >
          View all recommended actions
        </button>
      </Card>
    );
  }

  // ─── Cooldown state ───
  if (status.state === 'cooldown') {
    return (
      <Card variant="sage" className="flex flex-col gap-md">
        <div className="flex items-center gap-md">
          <Clock size={18} className="text-mute shrink-0" aria-hidden="true" />
          <div className="flex flex-col gap-xs">
            <p className="text-sm font-semibold text-ink">Please wait before requesting again</p>
            <p className="text-xs text-mute">You can request new AI insights shortly.</p>
          </div>
        </div>
        <Button size="sm" disabled>
          <Clock size={14} aria-hidden="true" />
          Please wait…
        </Button>
        <button
          type="button"
          onClick={goToActions}
          className="text-sm text-ink-deep underline hover:text-ink focus-visible:outline-2 focus-visible:outline-primary rounded self-start"
        >
          Use local guidance instead
        </button>
      </Card>
    );
  }

  // ─── Error state ───
  if (status.state === 'error') {
    return (
      <Card variant="content" className="flex flex-col gap-md border border-canvas-soft">
        <div className="flex items-start gap-md">
          {status.error === 'offline' ? (
            <WifiOff size={18} className="text-warning-deep shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <AlertCircle size={18} className="text-negative shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <div className="flex flex-col gap-xs">
            <p className="text-sm font-semibold text-ink">{getErrorTitle(status.error)}</p>
            <p className="text-xs text-body">{getErrorDescription(status.error)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-sm">
          {status.error !== 'unconfigured' && (
            <Button size="sm" variant="secondary" onClick={requestInsights}>
              Try again
            </Button>
          )}
          <button
            type="button"
            onClick={goToActions}
            className="text-sm text-ink-deep underline hover:text-ink focus-visible:outline-2 focus-visible:outline-primary rounded px-sm py-xs"
          >
            Use local guidance instead
          </button>
        </div>
      </Card>
    );
  }

  return null;
}

// ─── Error messages ───

function getErrorTitle(kind: AIInsightsErrorKind): string {
  switch (kind) {
    case 'unconfigured':
      return 'AI insights not available';
    case 'offline':
      return 'You appear to be offline';
    case 'rate-limited':
      return 'Too many requests';
    case 'malformed':
      return 'Invalid AI response';
    case 'timeout':
      return 'Request timed out';
    case 'server-error':
      return 'Server error';
    default:
      return 'Something went wrong';
  }
}

function getErrorDescription(kind: AIInsightsErrorKind): string {
  switch (kind) {
    case 'unconfigured':
      return 'AI insights are not configured for this deployment. All guidance below is based on deterministic calculations.';
    case 'offline':
      return 'AI insights require an internet connection. Your deterministic recommendations are still available.';
    case 'rate-limited':
      return 'Too many requests. Please wait a moment before trying again.';
    case 'malformed':
      return 'The AI response was invalid. Your deterministic recommendations are unaffected.';
    case 'timeout':
      return 'The request took too long. Please try again.';
    case 'server-error':
      return 'Our server had an issue. Please try again later.';
    default:
      return 'An unexpected error occurred. Your deterministic recommendations are still available.';
  }
}
