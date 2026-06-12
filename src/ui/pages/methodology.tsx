import { useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Download, Upload, Trash2, ExternalLink, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useLocalStore } from '../hooks/use-local-store';
import { useToast } from '../hooks/use-toast';
import { Card } from '../components/card';
import { Button } from '../components/button';
import { Badge } from '../components/badge';
import { Modal } from '../components/modal';
import { FACTOR_REGISTRY } from '../../domain/factors/registry';
import { exportSnapshotsAsCSV } from '../../storage/csv-export';
import { previewImport } from '../../storage/json-import';
import type { StoredData } from '../../storage/schemas';

/**
 * Methodology & Privacy page.
 *
 * Sections:
 * 1. Factor table — all emission factors with sources and caveats
 * 2. Calculation methodology — plain-language explanations
 * 3. Exclusions — what's NOT covered
 * 4. Privacy — data handling and storage
 * 5. Data management — export, import, clear
 *
 * Import (amendment 7): no mutation until explicit confirmation, validates preview, strips AI cache.
 * Clear-all (amendment 8): resets in-memory state and redirects to onboarding.
 * External links (amendment 9): rel="noopener noreferrer".
 */
export function MethodologyPage() {
  const store = useLocalStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [showClearModal, setShowClearModal] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    data: StoredData;
    summary: string;
  } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Factor entries for table
  const factorEntries = useMemo(() => Object.values(FACTOR_REGISTRY.factors), []);

  // ─── Export Handlers ───

  const handleExportJSON = useCallback(() => {
    const json = store.exportDataAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carbon-compass-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Data exported as JSON.', 'success');
  }, [store, addToast]);

  const handleExportCSV = useCallback(() => {
    const csv = exportSnapshotsAsCSV(store.data.snapshots);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carbon-compass-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Snapshot history exported as CSV.', 'success');
  }, [store, addToast]);

  // ─── Import Handler (amendment 7) ───

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        // Validate preview without mutating storage
        const result = previewImport(text);

        if (!result.isValid) {
          setImportError(result.errors.join(' '));
          return;
        }

        // Build summary for confirmation
        const data = result.data!;
        const summary = [
          data.profile ? 'Profile: Yes' : 'Profile: None',
          `Snapshots: ${data.snapshots.length}`,
          `Tracked actions: ${data.trackedActions.length}`,
        ].join(' · ');

        setImportPreview({ data, summary });
      } catch {
        setImportError("Failed to read file. Make sure it's a valid Carbon Compass export.");
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read the file.');
    };
    reader.readAsText(file);

    // Reset file input for re-selection
    e.target.value = '';
  }, []);

  const handleConfirmImport = useCallback(() => {
    if (!importPreview) return;

    // Strip AI cache before importing (amendment 7)
    const cleanedData: StoredData = {
      ...importPreview.data,
      aiCache: [],
    };

    store.importData(cleanedData);
    setImportPreview(null);
    addToast('Data imported successfully!', 'success');
  }, [importPreview, store, addToast]);

  // ─── Clear All (amendment 8) ───

  const handleClearAll = useCallback(() => {
    store.deleteAllData();
    setShowClearModal(false);
    addToast('All data has been cleared.', 'info');
    navigate('/onboarding');
  }, [store, addToast, navigate]);

  return (
    <div className="flex flex-col gap-3xl">
      <h1 className="font-display text-3xl font-black text-ink">Methodology, privacy & data</h1>

      {/* ─── Factor Table ─── */}
      <section aria-labelledby="factors-heading">
        <h2 id="factors-heading" className="text-xl font-semibold text-ink mb-lg">
          Emission factors
        </h2>
        <p className="text-sm text-body mb-lg">
          All calculations use the following emission factors. Registry version:{' '}
          <strong>{FACTOR_REGISTRY.version}</strong>, last updated{' '}
          <strong>{FACTOR_REGISTRY.lastUpdated}</strong>.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-ink/20">
                <th scope="col" className="text-left py-md pr-lg font-semibold text-ink">
                  Factor
                </th>
                <th scope="col" className="text-left py-md pr-lg font-semibold text-ink">
                  Value
                </th>
                <th scope="col" className="text-left py-md pr-lg font-semibold text-ink">
                  Confidence
                </th>
                <th
                  scope="col"
                  className="text-left py-md pr-lg font-semibold text-ink hidden md:table-cell"
                >
                  Scope
                </th>
                <th
                  scope="col"
                  className="text-left py-md font-semibold text-ink hidden lg:table-cell"
                >
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {factorEntries.map((f) => (
                <tr key={f.id} className="border-b border-ink/10">
                  <td className="py-sm pr-lg">
                    <span className="font-medium text-ink">{f.id}</span>
                    <p className="text-xs text-mute mt-0.5 max-w-xs">{f.caveat.split('.')[0]}.</p>
                  </td>
                  <td className="py-sm pr-lg whitespace-nowrap text-body">
                    {f.value} {f.unit}
                  </td>
                  <td className="py-sm pr-lg">
                    <Badge
                      variant={
                        f.confidence === 'high'
                          ? 'positive'
                          : f.confidence === 'low'
                            ? 'negative'
                            : 'neutral'
                      }
                    >
                      {f.confidence}
                    </Badge>
                  </td>
                  <td className="py-sm pr-lg text-body hidden md:table-cell">{f.scope}</td>
                  <td className="py-sm hidden lg:table-cell">
                    <a
                      href={f.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-ink-deep underline hover:text-ink focus-visible:outline-2 focus-visible:outline-primary rounded"
                    >
                      {f.source.organization.split(';')[0]}
                      <ExternalLink size={10} aria-hidden="true" />
                      <span className="sr-only">(opens in new tab)</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Calculation Methodology ─── */}
      <section aria-labelledby="methodology-heading">
        <h2 id="methodology-heading" className="text-xl font-semibold text-ink mb-lg">
          How we calculate
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <Card variant="content">
            <h3 className="text-base font-semibold text-ink mb-sm">Transport</h3>
            <p className="text-sm text-body">
              Weekly distance × emission factor per km × 52 weeks. Each transport mode has its own
              factor. Car, bus, and train use UK DESNZ 2023 figures. Bicycle and walking are zero
              direct emissions.
            </p>
          </Card>
          <Card variant="content">
            <h3 className="text-base font-semibold text-ink mb-sm">Electricity</h3>
            <p className="text-sm text-body">
              Monthly kWh × global average grid factor (0.494 kg CO₂e/kWh) × 12 months. For
              household usage, divided equally by household size. Actual grid intensity varies
              hugely by country.
            </p>
          </Card>
          <Card variant="content">
            <h3 className="text-base font-semibold text-ink mb-sm">Diet</h3>
            <p className="text-sm text-body">
              Estimated daily emissions × 365 days. Figures are derived from Poore & Nemecek 2018
              lifecycle analysis. These are rough estimates with wide uncertainty bands — individual
              diets vary enormously.
            </p>
          </Card>
          <Card variant="content">
            <h3 className="text-base font-semibold text-ink mb-sm">Flights</h3>
            <p className="text-sm text-body">
              Number of one-way legs × average distance per haul category × emission factor per
              passenger-km. Includes radiative forcing multiplier (~1.9×). Factors from UK DESNZ
              2023.
            </p>
          </Card>
        </div>
      </section>

      {/* ─── Exclusions ─── */}
      <section aria-labelledby="exclusions-heading">
        <h2 id="exclusions-heading" className="text-xl font-semibold text-ink mb-lg">
          What&apos;s not included
        </h2>
        <Card variant="sage">
          <ul className="list-disc list-inside text-sm text-body space-y-sm">
            <li>Housing (heating, cooling, insulation)</li>
            <li>Goods and services (clothing, electronics, subscriptions)</li>
            <li>Food waste and specific food items</li>
            <li>Water usage</li>
            <li>Embodied emissions of vehicles and infrastructure</li>
            <li>Non-CO₂ greenhouse gases from non-flight sources</li>
          </ul>
          <p className="text-xs text-mute mt-md">
            These exclusions mean the total shown is likely an underestimate of your full carbon
            footprint.
          </p>
        </Card>
      </section>

      {/* ─── Privacy ─── */}
      <section aria-labelledby="privacy-heading">
        <h2 id="privacy-heading" className="text-xl font-semibold text-ink mb-lg">
          Privacy & your data
        </h2>
        <Card variant="green" className="flex gap-md items-start">
          <ShieldCheck
            size={24}
            className="text-positive-deep shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-sm">
            <p className="text-base font-semibold text-ink">Your data stays on your device</p>
            <ul className="text-sm text-body space-y-xs list-disc list-inside">
              <li>All calculations run locally in your browser</li>
              <li>No data is sent to any server</li>
              <li>No accounts, no login, no cookies (beyond localStorage)</li>
              <li>No analytics or tracking scripts</li>
              <li>
                If you choose to use AI insights, only aggregated category totals, rankings, and
                preferences are sent to the server — never your name, email, or address. This
                happens only when you click "Get AI insights."
              </li>
            </ul>
          </div>
        </Card>
      </section>

      {/* ─── Data Management ─── */}
      <section aria-labelledby="data-heading">
        <h2 id="data-heading" className="text-xl font-semibold text-ink mb-lg">
          Manage your data
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
          {/* Export JSON */}
          <Card variant="content" className="flex flex-col gap-md">
            <h3 className="text-base font-semibold text-ink">Export as JSON</h3>
            <p className="text-sm text-body">
              Download all your data as a JSON file. This includes your profile, snapshots, and
              tracked actions.
            </p>
            <Button variant="secondary" onClick={handleExportJSON} className="self-start">
              <Download size={14} aria-hidden="true" />
              Export JSON
            </Button>
          </Card>

          {/* Export CSV */}
          <Card variant="content" className="flex flex-col gap-md">
            <h3 className="text-base font-semibold text-ink">Export history as CSV</h3>
            <p className="text-sm text-body">
              Download your snapshot history as a spreadsheet-compatible CSV file.
            </p>
            <Button
              variant="secondary"
              onClick={handleExportCSV}
              disabled={store.data.snapshots.length === 0}
              className="self-start"
            >
              <Download size={14} aria-hidden="true" />
              Export CSV
            </Button>
          </Card>

          {/* Import JSON */}
          <Card variant="content" className="flex flex-col gap-md">
            <h3 className="text-base font-semibold text-ink">Import data</h3>
            <p className="text-sm text-body">
              Restore from a previous Carbon Compass JSON export. Your current data will be replaced
              after you confirm.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="sr-only"
              id="import-file-input"
              aria-label="Choose JSON file to import"
            />
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="self-start"
            >
              <Upload size={14} aria-hidden="true" />
              Choose file
            </Button>
            {importError && (
              <p className="text-sm text-negative" role="alert">
                {importError}
              </p>
            )}
          </Card>

          {/* Clear all */}
          <Card variant="content" className="flex flex-col gap-md">
            <h3 className="text-base font-semibold text-ink">Clear all data</h3>
            <p className="text-sm text-body">
              Permanently delete all data from this browser. This cannot be undone.
            </p>
            <Button
              variant="tertiary"
              onClick={() => setShowClearModal(true)}
              className="self-start text-negative border-negative hover:bg-negative/10"
            >
              <Trash2 size={14} aria-hidden="true" />
              Clear all data
            </Button>
          </Card>
        </div>
      </section>

      {/* ─── Import Confirmation Modal (amendment 7) ─── */}
      <Modal
        isOpen={importPreview !== null}
        onClose={() => setImportPreview(null)}
        title="Confirm import"
      >
        <div className="flex flex-col gap-lg">
          <p className="text-sm text-body">
            This will replace all your current data with the imported data. AI cache data will be
            stripped for security.
          </p>
          {importPreview && (
            <Card variant="sage">
              <p className="text-sm font-semibold text-ink mb-sm">Import preview:</p>
              <p className="text-sm text-body">{importPreview.summary}</p>
            </Card>
          )}
          <div className="flex justify-end gap-md">
            <Button variant="secondary" onClick={() => setImportPreview(null)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmImport}>
              <Upload size={14} aria-hidden="true" />
              Confirm import
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Clear All Confirmation Modal (amendment 8) ─── */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear all data?"
      >
        <div className="flex flex-col gap-lg">
          <div className="flex gap-md items-start">
            <AlertTriangle size={20} className="text-negative shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-body">
              This will permanently delete your profile, all snapshots, tracked actions, and
              settings. This action cannot be undone. You will be taken back to the onboarding
              questionnaire.
            </p>
          </div>
          <div className="flex justify-end gap-md">
            <Button variant="secondary" onClick={() => setShowClearModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleClearAll}
              className="bg-negative hover:bg-negative-deep text-canvas"
            >
              <Trash2 size={14} aria-hidden="true" />
              Clear everything
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
