import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Trash2, Camera, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useLocalStore } from '../hooks/use-local-store';
import { useToast } from '../hooks/use-toast';
import { Card } from '../components/card';
import { Button } from '../components/button';
import { Modal } from '../components/modal';
import { formatCO2e } from '../../domain/units';
import { calculateFootprint } from '../../domain/calculator/calculator';
import type { Snapshot, Category } from '../../storage/schemas';

const CATEGORY_LABELS: Record<Category, string> = {
  transport: 'Transport',
  electricity: 'Electricity',
  diet: 'Diet',
  flights: 'Flights',
};

/**
 * Progress page — snapshot history and trends.
 *
 * Handles gracefully:
 * - Zero snapshots: empty state with CTA
 * - One snapshot: single point, no trend yet
 * - Multiple: trend comparison and chart
 *
 * Includes accessible textual summary for screen readers.
 */
export function ProgressPage() {
  const store = useLocalStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const profile = store.data.profile;
  const snapshots = store.data.snapshots;
  const displayUnit = store.data.settings.displayUnit;

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const sortedSnapshots = useMemo(
    () => [...snapshots].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [snapshots],
  );

  const handleSaveSnapshot = useCallback(() => {
    if (!profile) return;
    const result = calculateFootprint(profile);
    store.addSnapshot({
      id: `snapshot-${Date.now()}`,
      date: new Date().toISOString(),
      result,
      profile,
    });
    addToast('Snapshot saved!', 'success');
  }, [profile, store, addToast]);

  const handleDeleteSnapshot = useCallback(() => {
    if (!deleteTarget) return;
    store.deleteSnapshot(deleteTarget);
    setDeleteTarget(null);
    addToast('Snapshot deleted.', 'info');
  }, [deleteTarget, store, addToast]);

  // Trend calculation
  const trend = useMemo(() => {
    if (sortedSnapshots.length < 2) return null;
    const newest = sortedSnapshots[0];
    const oldest = sortedSnapshots[sortedSnapshots.length - 1];
    if (!newest || !oldest) return null;
    const delta = newest.result.totalAnnualKgCO2e - oldest.result.totalAnnualKgCO2e;
    const pct =
      oldest.result.totalAnnualKgCO2e > 0 ? (delta / oldest.result.totalAnnualKgCO2e) * 100 : 0;
    return { delta, pct };
  }, [sortedSnapshots]);

  // Max value for bar sizing
  const maxAnnual = useMemo(
    () => Math.max(...sortedSnapshots.map((s) => s.result.totalAnnualKgCO2e), 1),
    [sortedSnapshots],
  );

  if (!profile) {
    return (
      <div className="flex flex-col items-center gap-xl py-3xl text-center">
        <h1 className="font-display text-2xl font-black text-ink">No profile yet</h1>
        <p className="text-body">Complete the questionnaire first.</p>
        <Button onClick={() => navigate('/onboarding')}>Get started</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2xl">
      <section>
        <h1 className="font-display text-3xl font-black text-ink mb-sm">Your progress</h1>
        <p className="text-body text-sm">Track how your carbon footprint changes over time.</p>
      </section>

      {/* Save snapshot CTA */}
      <Button onClick={handleSaveSnapshot} className="self-start">
        <Camera size={16} aria-hidden="true" />
        Save a new snapshot
      </Button>

      {/* ─── Empty state ─── */}
      {sortedSnapshots.length === 0 && (
        <Card variant="sage" className="text-center py-3xl">
          <p className="text-lg font-semibold text-ink mb-sm">No snapshots yet</p>
          <p className="text-sm text-body max-w-md mx-auto">
            Save your first snapshot to start tracking changes. Each snapshot records your current
            footprint so you can see how it changes over time.
          </p>
        </Card>
      )}

      {/* ─── Single snapshot ─── */}
      {sortedSnapshots.length === 1 && sortedSnapshots[0] && (
        <Card variant="content">
          <p className="text-sm text-mute mb-md">
            Your first snapshot — save another later to see trends.
          </p>
          <SnapshotRow
            snapshot={sortedSnapshots[0]}
            displayUnit={displayUnit}
            maxAnnual={maxAnnual}
            onDelete={setDeleteTarget}
          />
        </Card>
      )}

      {/* ─── Multiple snapshots ─── */}
      {sortedSnapshots.length >= 2 && (
        <>
          {/* Trend summary */}
          {trend && (
            <Card
              variant={trend.delta <= 0 ? 'green' : 'sage'}
              className="flex items-center gap-md"
            >
              {trend.delta < 0 ? (
                <TrendingDown
                  size={24}
                  className="text-positive-deep shrink-0"
                  aria-hidden="true"
                />
              ) : trend.delta > 0 ? (
                <TrendingUp size={24} className="text-negative shrink-0" aria-hidden="true" />
              ) : (
                <Minus size={24} className="text-mute shrink-0" aria-hidden="true" />
              )}
              <div>
                <p className="text-base font-semibold text-ink">
                  {trend.delta < 0
                    ? `Down ${formatCO2e(Math.abs(trend.delta), displayUnit)} (${Math.abs(trend.pct).toFixed(1)}%)`
                    : trend.delta > 0
                      ? `Up ${formatCO2e(trend.delta, displayUnit)} (${trend.pct.toFixed(1)}%)`
                      : 'No change'}
                </p>
                <p className="text-xs text-body">Comparing your oldest and newest snapshots</p>
              </div>
            </Card>
          )}

          {/* Timeline */}
          <section aria-labelledby="timeline-heading">
            <h2 id="timeline-heading" className="text-xl font-semibold text-ink mb-lg">
              Snapshot history
            </h2>

            {/* Accessible summary table */}
            <table className="sr-only" style={{ tableLayout: 'fixed', width: '1px' }}>
              <caption>Footprint snapshot history</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Annual total</th>
                  <th scope="col">Transport</th>
                  <th scope="col">Electricity</th>
                  <th scope="col">Diet</th>
                  <th scope="col">Flights</th>
                </tr>
              </thead>
              <tbody>
                {sortedSnapshots.map((s) => {
                  const catMap = new Map(
                    s.result.breakdown.map((b) => [b.category, b.annualKgCO2e]),
                  );
                  return (
                    <tr key={s.id}>
                      <td>{new Date(s.date).toLocaleDateString()}</td>
                      <td>{formatCO2e(s.result.totalAnnualKgCO2e, displayUnit)}</td>
                      <td>{formatCO2e(catMap.get('transport') ?? 0, displayUnit)}</td>
                      <td>{formatCO2e(catMap.get('electricity') ?? 0, displayUnit)}</td>
                      <td>{formatCO2e(catMap.get('diet') ?? 0, displayUnit)}</td>
                      <td>{formatCO2e(catMap.get('flights') ?? 0, displayUnit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Visual timeline */}
            <div className="flex flex-col gap-md">
              {sortedSnapshots.map((s) => (
                <SnapshotRow
                  key={s.id}
                  snapshot={s}
                  displayUnit={displayUnit}
                  maxAnnual={maxAnnual}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete snapshot?"
      >
        <div className="flex flex-col gap-lg">
          <p className="text-sm text-body">
            This will permanently remove this snapshot from your history. This action cannot be
            undone.
          </p>
          <div className="flex justify-end gap-md">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleDeleteSnapshot}
              className="bg-negative hover:bg-negative-deep text-canvas"
            >
              <Trash2 size={14} aria-hidden="true" />
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Snapshot Row ───

function SnapshotRow({
  snapshot,
  displayUnit,
  maxAnnual,
  onDelete,
}: {
  snapshot: Snapshot;
  displayUnit: 'kg' | 'tonnes';
  maxAnnual: number;
  onDelete: (id: string) => void;
}) {
  const dateStr = new Date(snapshot.date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const barWidth = `${Math.max((snapshot.result.totalAnnualKgCO2e / maxAnnual) * 100, 2)}%`;

  return (
    <Card variant="content" className="flex flex-col gap-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-md">
          <span className="text-sm font-semibold text-ink">{dateStr}</span>
          <span className="text-sm text-body">
            {formatCO2e(snapshot.result.totalAnnualKgCO2e, displayUnit)} CO₂e/year
          </span>
        </div>
        <button
          onClick={() => onDelete(snapshot.id)}
          className="text-mute hover:text-negative p-xs rounded-lg focus-visible:outline-2 focus-visible:outline-primary transition-colors"
          aria-label={`Delete snapshot from ${dateStr}`}
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="h-2 w-full rounded-pill bg-canvas-soft overflow-hidden">
        <div
          className="h-full rounded-pill bg-primary transition-all duration-500"
          style={{ width: barWidth }}
        />
      </div>
      <div className="flex flex-wrap gap-sm">
        {snapshot.result.breakdown.map((b) => (
          <span key={b.category} className="text-xs text-mute">
            {CATEGORY_LABELS[b.category]}: {formatCO2e(b.annualKgCO2e, displayUnit)}
          </span>
        ))}
      </div>
    </Card>
  );
}
