import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ExternalLink, Check, Clock, X, MapPin } from 'lucide-react';
import { useLocalStore } from '../hooks/use-local-store';
import { useToast } from '../hooks/use-toast';
import { Card } from '../components/card';
import { Button } from '../components/button';
import { Badge } from '../components/badge';
import { Tooltip } from '../components/tooltip';
import { calculateFootprint } from '../../domain/calculator/calculator';
import { rankActions } from '../../domain/recommendations/ranker';
import { buildApplicabilityContext } from '../../domain/recommendations/build-context';
import { buildMapsSearchUrl, buildMapsDirectionsUrl } from '../../domain/recommendations/maps-urls';
import { formatCO2e } from '../../domain/units';
import type {
  ApplicabilityContext,
  RankedAction,
  MapsActionType,
} from '../../domain/recommendations/types';

const EFFORT_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const COST_LABELS = {
  'saves-money': 'Saves money',
  free: 'Free',
  low: 'Low cost',
  medium: 'Medium cost',
  high: 'High cost',
};
const HORIZON_LABELS = { immediate: 'Start now', weeks: 'Within weeks', months: 'Within months' };
const IMPACT_LABELS = { high: 'High impact', medium: 'Medium impact', low: 'Low impact' };

function buildMapsUrl(query: string, actionType: MapsActionType): string {
  if (actionType === 'directions-transit') return buildMapsDirectionsUrl(query, 'transit');
  if (actionType === 'directions-bicycling') return buildMapsDirectionsUrl(query, 'bicycling');
  if (actionType === 'directions-walking') return buildMapsDirectionsUrl(query, 'walking');
  return buildMapsSearchUrl(query);
}

/**
 * Actions page — personalized, ranked recommendations.
 *
 * Uses the deterministic ranker from the domain layer.
 * Actions can be marked as planned, completed, or dismissed.
 * Uses supportive, non-guilt language throughout.
 */
export function ActionsPage() {
  const store = useLocalStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const profile = store.data.profile;
  const trackedActions = store.data.trackedActions;
  const displayUnit = store.data.settings.displayUnit;

  // Build applicability context
  const { context, rankedActions } = useMemo(() => {
    if (!profile) return { context: null, rankedActions: [] };

    const result = calculateFootprint(profile);
    const ctx = buildApplicabilityContext(profile, result, trackedActions);

    return { context: ctx, rankedActions: rankActions(ctx) };
  }, [profile, trackedActions]);

  const handleSetStatus = useCallback(
    (actionId: string, status: 'planned' | 'completed' | 'dismissed') => {
      store.setActionStatus(actionId, status);
      const labels = { planned: 'planned', completed: 'completed', dismissed: 'dismissed' };
      addToast(`Action marked as ${labels[status]}.`, status === 'completed' ? 'success' : 'info');
    },
    [store, addToast],
  );

  // Get current status for an action
  const getActionStatus = useCallback(
    (actionId: string) => {
      const tracked = trackedActions.find((t) => t.actionId === actionId);
      return tracked?.status ?? 'suggested';
    },
    [trackedActions],
  );

  if (!profile || !context) {
    return (
      <div className="flex flex-col items-center gap-xl py-3xl text-center">
        <h1 className="font-display text-2xl font-black text-ink">No profile yet</h1>
        <p className="text-body">Complete the questionnaire first to see personalized actions.</p>
        <Button onClick={() => navigate('/onboarding')}>Get started</Button>
      </div>
    );
  }

  // Separate planned/completed from new suggestions
  const plannedActions = trackedActions.filter((t) => t.status === 'planned');
  const completedActions = trackedActions.filter((t) => t.status === 'completed');

  return (
    <div className="flex flex-col gap-2xl">
      <section aria-labelledby="actions-heading">
        <h1 id="actions-heading" className="font-display text-3xl font-black text-ink mb-sm">
          Recommended actions
        </h1>
        <p className="text-body text-sm mb-xl">
          Personalized suggestions based on your profile. Every small step counts — choose what
          works for you.
        </p>

        {rankedActions.length === 0 ? (
          <Card variant="sage" className="text-center py-3xl">
            <p className="text-body font-semibold">
              {completedActions.length > 0
                ? "Great progress! You've addressed all current recommendations."
                : 'No specific actions to suggest right now.'}
            </p>
          </Card>
        ) : (
          <div className="flex flex-col gap-lg">
            {rankedActions.map((ra) => (
              <ActionCard
                key={ra.action.id}
                rankedAction={ra}
                displayUnit={displayUnit}
                status={getActionStatus(ra.action.id)}
                context={context}
                onSetStatus={handleSetStatus}
              />
            ))}
          </div>
        )}
      </section>

      {/* Planned actions summary */}
      {plannedActions.length > 0 && (
        <section aria-labelledby="planned-heading">
          <h2 id="planned-heading" className="text-xl font-semibold text-ink mb-md">
            Your planned actions ({plannedActions.length})
          </h2>
          <div className="flex flex-wrap gap-sm">
            {plannedActions.map((pa) => (
              <Badge key={pa.actionId} variant="positive">
                <Clock size={12} className="mr-1" aria-hidden="true" />
                {pa.actionId.replace(/-/g, ' ')}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Completed actions summary */}
      {completedActions.length > 0 && (
        <section aria-labelledby="completed-heading">
          <h2 id="completed-heading" className="text-xl font-semibold text-ink mb-md">
            Completed ({completedActions.length})
          </h2>
          <div className="flex flex-wrap gap-sm">
            {completedActions.map((ca) => (
              <Badge key={ca.actionId} variant="positive">
                <Check size={12} className="mr-1" aria-hidden="true" />
                {ca.actionId.replace(/-/g, ' ')}
              </Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Action Card ───

function ActionCard({
  rankedAction,
  displayUnit,
  status,
  context,
  onSetStatus,
}: {
  rankedAction: RankedAction;
  displayUnit: 'kg' | 'tonnes';
  status: string;
  context: ApplicabilityContext;
  onSetStatus: (id: string, status: 'planned' | 'completed' | 'dismissed') => void;
}) {
  const { action, explainableReason } = rankedAction;
  const { metadata } = action;

  // Calculate dynamic savings
  const estimatedSavings = action.estimateSavings ? action.estimateSavings(context) : null;

  // Maps link
  const mapsUrl =
    metadata.mapsSearchQuery && metadata.mapsActionType
      ? buildMapsUrl(metadata.mapsSearchQuery, metadata.mapsActionType)
      : null;

  return (
    <Card variant="content" as="article" className="flex flex-col gap-md">
      <div className="flex flex-col gap-xs">
        <div className="flex items-start justify-between gap-md">
          <h3 className="text-base font-semibold text-ink">{action.title}</h3>
          <Badge variant={metadata.impact === 'high' ? 'positive' : 'neutral'}>
            {IMPACT_LABELS[metadata.impact]}
          </Badge>
        </div>
        <p className="text-sm text-body">{action.description}</p>
      </div>

      {/* Rationale */}
      <p className="text-xs text-mute italic">{action.rationale}</p>

      {/* Why recommended */}
      <p className="text-xs text-ink-deep font-semibold">{explainableReason}</p>

      {/* Metadata badges */}
      <div className="flex flex-wrap gap-sm">
        <Badge variant="neutral">{EFFORT_LABELS[metadata.effort]}</Badge>
        <Badge variant="neutral">{COST_LABELS[metadata.cost]}</Badge>
        <Badge variant="neutral">{HORIZON_LABELS[metadata.timeHorizon]}</Badge>
      </div>

      {/* Estimated savings */}
      {estimatedSavings !== null && estimatedSavings > 0 && (
        <div className="flex items-center gap-sm text-sm">
          <span className="text-positive-deep font-semibold">
            Save ~{formatCO2e(estimatedSavings, displayUnit)} CO₂e/year
          </span>
          {metadata.savingsMethodology && <Tooltip content={metadata.savingsMethodology} />}
        </div>
      )}

      {/* Maps link */}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-sm text-sm text-ink-deep hover:text-ink underline focus-visible:outline-2 focus-visible:outline-primary rounded"
        >
          <MapPin size={14} aria-hidden="true" />
          <span>Find nearby on Google Maps</span>
          <ExternalLink size={12} aria-hidden="true" />
          <span className="sr-only">(opens in new tab)</span>
        </a>
      )}

      {/* Status actions */}
      <div className="flex flex-wrap gap-sm pt-sm border-t border-canvas-soft">
        {status !== 'planned' && status !== 'completed' && (
          <Button size="sm" variant="secondary" onClick={() => onSetStatus(action.id, 'planned')}>
            <Clock size={14} aria-hidden="true" />
            Plan this
          </Button>
        )}
        {status !== 'completed' && (
          <Button size="sm" variant="primary" onClick={() => onSetStatus(action.id, 'completed')}>
            <Check size={14} aria-hidden="true" />
            Mark complete
          </Button>
        )}
        {status !== 'dismissed' && status !== 'completed' && (
          <Button size="sm" variant="tertiary" onClick={() => onSetStatus(action.id, 'dismissed')}>
            <X size={14} aria-hidden="true" />
            Dismiss
          </Button>
        )}
      </div>
    </Card>
  );
}
