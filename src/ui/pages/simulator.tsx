import { ArrowRight, AlertTriangle, Check } from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';

import { calculateFootprint } from '../../domain/calculator/calculator';
import { calculateDiet } from '../../domain/calculator/diet';
import { calculateElectricity } from '../../domain/calculator/electricity';
import { calculateFlights } from '../../domain/calculator/flights';
import { simulateTransportSwap } from '../../domain/recommendations/swap-simulator';
import { formatCO2e } from '../../domain/units';
import { Badge } from '../components/badge';
import { Button } from '../components/button';
import { Card } from '../components/card';
import { NumberInput } from '../components/number-input';
import { SegmentedControl } from '../components/segmented-control';
import { SelectInput } from '../components/select-input';
import { useLocalStore } from '../hooks/use-local-store';
import { useToast } from '../hooks/use-toast';

import type { TransportMode, DietProfile, UserProfile } from '../../storage/schemas';

type SimCategory = 'transport' | 'diet' | 'electricity' | 'flights';

const TRANSPORT_OPTIONS = [
  { value: 'car', label: 'Car' },
  { value: 'bus', label: 'Bus' },
  { value: 'train', label: 'Train' },
  { value: 'bicycle', label: 'Bicycle' },
  { value: 'walk', label: 'Walk' },
];

/**
 * Swap Impact Simulator page.
 *
 * Lets the user simulate one meaningful alternative and see the impact.
 * All calculations reuse production calculators (amendment 13).
 * Clearly marked as SIMULATION, not saved data (amendment 10).
 * Applying a result updates only the current profile, never existing snapshots.
 */
export function SimulatorPage() {
  const store = useLocalStore();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const profile = store.data.profile;
  const displayUnit = store.data.settings.displayUnit;

  const [category, setCategory] = useState<SimCategory>('transport');

  // Transport state
  const [currentMode, setCurrentMode] = useState<TransportMode>('car');
  const [altMode, setAltMode] = useState<TransportMode>('bus');
  const [weeklyKm, setWeeklyKm] = useState(50);

  // Diet state
  const [altDiet, setAltDiet] = useState<DietProfile>('vegetarian');

  // Electricity state
  const [altKwh, setAltKwh] = useState(0);

  // Flights state
  const [altShortHaul, setAltShortHaul] = useState(0);
  const [altMediumHaul, setAltMediumHaul] = useState(0);
  const [altLongHaul, setAltLongHaul] = useState(0);

  // Total annual for % calculation
  const totalAnnual = useMemo(() => {
    if (!profile) return 0;
    return calculateFootprint(profile).totalAnnualKgCO2e;
  }, [profile]);

  // Pre-populate from profile when category changes
  const populateFromProfile = useCallback(
    (cat: SimCategory) => {
      if (!profile) return;
      if (cat === 'transport') {
        const carEntry = profile.transport.modes.find((m) => m.mode === 'car');
        if (carEntry) {
          setCurrentMode('car');
          setWeeklyKm(carEntry.weeklyDistanceKm);
        }
      } else if (cat === 'electricity') {
        setAltKwh(Math.round(profile.electricity.monthlyKwh * 0.9));
      } else if (cat === 'flights') {
        setAltShortHaul(Math.max(0, profile.flights.shortHaulLegs - 2));
        setAltMediumHaul(profile.flights.mediumHaulLegs);
        setAltLongHaul(profile.flights.longHaulLegs);
      }
    },
    [profile],
  );

  // Handle category change
  const handleCategoryChange = useCallback(
    (cat: SimCategory) => {
      setCategory(cat);
      populateFromProfile(cat);
    },
    [populateFromProfile],
  );

  // Simulation results — uses production calculators, no formula duplication
  const simulation = useMemo(() => {
    if (!profile) return null;

    if (category === 'transport') {
      return simulateTransportSwap(currentMode, altMode, weeklyKm, totalAnnual);
    }

    if (category === 'diet') {
      const currentResult = calculateDiet(profile.diet);
      const altResult = calculateDiet(altDiet);
      const delta = currentResult.annualKgCO2e - altResult.annualKgCO2e;
      return {
        currentHabit: {
          description: `${profile.diet} diet`,
          annualKgCO2e: currentResult.annualKgCO2e,
        },
        alternative: { description: `${altDiet} diet`, annualKgCO2e: altResult.annualKgCO2e },
        deltaKgCO2ePerYear: delta,
        deltaPercent: totalAnnual > 0 ? (delta / totalAnnual) * 100 : 0,
      };
    }

    if (category === 'electricity') {
      const currentResult = calculateElectricity(profile.electricity);
      const altResult = calculateElectricity({
        ...profile.electricity,
        monthlyKwh: altKwh,
      });
      const delta = currentResult.annualKgCO2e - altResult.annualKgCO2e;
      return {
        currentHabit: {
          description: `${profile.electricity.monthlyKwh} kWh/month`,
          annualKgCO2e: currentResult.annualKgCO2e,
        },
        alternative: { description: `${altKwh} kWh/month`, annualKgCO2e: altResult.annualKgCO2e },
        deltaKgCO2ePerYear: delta,
        deltaPercent: totalAnnual > 0 ? (delta / totalAnnual) * 100 : 0,
      };
    }

    if (category === 'flights') {
      const currentResult = calculateFlights(profile.flights);
      const altResult = calculateFlights({
        shortHaulLegs: altShortHaul,
        mediumHaulLegs: altMediumHaul,
        longHaulLegs: altLongHaul,
      });
      const delta = currentResult.annualKgCO2e - altResult.annualKgCO2e;
      return {
        currentHabit: {
          description: `${profile.flights.shortHaulLegs + profile.flights.mediumHaulLegs + profile.flights.longHaulLegs} flights/yr`,
          annualKgCO2e: currentResult.annualKgCO2e,
        },
        alternative: {
          description: `${altShortHaul + altMediumHaul + altLongHaul} flights/yr`,
          annualKgCO2e: altResult.annualKgCO2e,
        },
        deltaKgCO2ePerYear: delta,
        deltaPercent: totalAnnual > 0 ? (delta / totalAnnual) * 100 : 0,
      };
    }

    return null;
  }, [
    profile,
    category,
    currentMode,
    altMode,
    weeklyKm,
    altDiet,
    altKwh,
    altShortHaul,
    altMediumHaul,
    altLongHaul,
    totalAnnual,
  ]);

  // Apply simulation to profile (amendment 10: only updates profile, never rewrites snapshots)
  const applyToProfile = useCallback(() => {
    if (!profile) return;

    let updatedProfile: UserProfile;

    if (category === 'transport') {
      const updatedModes = profile.transport.modes.map((m) =>
        m.mode === currentMode ? { ...m, mode: altMode, weeklyDistanceKm: weeklyKm } : m,
      );
      // If switching mode and current mode doesn't exist, add it
      const hasMode = updatedModes.some((m) => m.mode === altMode);
      if (!hasMode) {
        updatedModes.push({ mode: altMode, weeklyDistanceKm: weeklyKm });
      }
      updatedProfile = { ...profile, transport: { modes: updatedModes } };
    } else if (category === 'diet') {
      updatedProfile = { ...profile, diet: altDiet };
    } else if (category === 'electricity') {
      updatedProfile = {
        ...profile,
        electricity: { ...profile.electricity, monthlyKwh: altKwh },
      };
    } else {
      updatedProfile = {
        ...profile,
        flights: {
          shortHaulLegs: altShortHaul,
          mediumHaulLegs: altMediumHaul,
          longHaulLegs: altLongHaul,
        },
      };
    }

    store.saveProfile(updatedProfile);
    addToast(
      'Profile updated with your simulated choice. Save a snapshot to record this change.',
      'success',
    );
    navigate('/dashboard');
  }, [
    profile,
    category,
    currentMode,
    altMode,
    weeklyKm,
    altDiet,
    altKwh,
    altShortHaul,
    altMediumHaul,
    altLongHaul,
    store,
    addToast,
    navigate,
  ]);

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
        <div className="flex items-center gap-md mb-md">
          <h1 className="font-display text-3xl font-black text-ink">Swap simulator</h1>
          <Badge variant="neutral">SIMULATION</Badge>
        </div>
        <p className="text-body text-sm">
          Explore "what if" scenarios. This does not change your saved data until you choose to
          apply it.
        </p>
      </section>

      {/* Category selector */}
      <SegmentedControl
        legend="What would you like to change?"
        options={[
          { value: 'transport', label: 'Transport' },
          { value: 'diet', label: 'Diet' },
          { value: 'electricity', label: 'Electricity' },
          { value: 'flights', label: 'Flights' },
        ]}
        value={category}
        onChange={handleCategoryChange}
      />

      {/* Category-specific controls */}
      <Card variant="content" as="section" className="flex flex-col gap-lg">
        <h2 className="text-lg font-semibold text-ink">Configure your scenario</h2>

        {category === 'transport' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
            <SelectInput
              label="Current mode"
              options={TRANSPORT_OPTIONS}
              value={currentMode}
              onChange={(e) => {
                setCurrentMode(e.target.value as TransportMode);
              }}
            />
            <SelectInput
              label="Switch to"
              options={TRANSPORT_OPTIONS.filter((o) => o.value !== currentMode)}
              value={altMode}
              onChange={(e) => {
                setAltMode(e.target.value as TransportMode);
              }}
            />
            <NumberInput
              label="Weekly distance"
              value={weeklyKm}
              onChange={setWeeklyKm}
              min={0}
              max={5000}
              step={5}
              unit="km"
            />
          </div>
        )}

        {category === 'diet' && (
          <SegmentedControl
            legend="Switch to"
            options={[
              { value: 'heavy-meat' as DietProfile, label: 'Regular meat' },
              { value: 'vegetarian' as DietProfile, label: 'Vegetarian' },
              { value: 'vegan' as DietProfile, label: 'Vegan' },
            ].filter((o) => o.value !== profile.diet)}
            value={altDiet}
            onChange={setAltDiet}
          />
        )}

        {category === 'electricity' && (
          <div className="flex flex-col gap-md">
            <p className="text-sm text-body">
              Current usage: <strong>{profile.electricity.monthlyKwh} kWh/month</strong>
            </p>
            <NumberInput
              label="Alternative monthly usage"
              value={altKwh}
              onChange={setAltKwh}
              min={0}
              max={10000}
              step={10}
              unit="kWh"
              hint="What could you realistically reduce to?"
            />
          </div>
        )}

        {category === 'flights' && (
          <div className="flex flex-col gap-lg">
            <p className="text-sm text-body">
              Current: {profile.flights.shortHaulLegs} short + {profile.flights.mediumHaulLegs}{' '}
              medium + {profile.flights.longHaulLegs} long-haul legs/yr
            </p>
            <NumberInput
              label="Alternative short-haul legs"
              value={altShortHaul}
              onChange={(v) => {
                setAltShortHaul(Math.round(v));
              }}
              min={0}
              max={200}
              step={1}
              unit="legs/yr"
            />
            <NumberInput
              label="Alternative medium-haul legs"
              value={altMediumHaul}
              onChange={(v) => {
                setAltMediumHaul(Math.round(v));
              }}
              min={0}
              max={200}
              step={1}
              unit="legs/yr"
            />
            <NumberInput
              label="Alternative long-haul legs"
              value={altLongHaul}
              onChange={(v) => {
                setAltLongHaul(Math.round(v));
              }}
              min={0}
              max={200}
              step={1}
              unit="legs/yr"
            />
          </div>
        )}
      </Card>

      {/* Results */}
      {simulation && (
        <Card variant="sage" as="section" className="flex flex-col gap-lg">
          <div className="flex items-center gap-sm mb-sm">
            <h2 className="text-lg font-semibold text-ink">Simulation result</h2>
            <Badge variant="neutral">NOT SAVED</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg text-center">
            <div>
              <p className="text-xs text-mute mb-xs">Current</p>
              <p className="text-lg font-black text-ink">
                {formatCO2e(simulation.currentHabit.annualKgCO2e, displayUnit)}
              </p>
              <p className="text-xs text-body">{simulation.currentHabit.description}</p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight size={24} className="text-mute" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs text-mute mb-xs">Alternative</p>
              <p className="text-lg font-black text-ink">
                {formatCO2e(simulation.alternative.annualKgCO2e, displayUnit)}
              </p>
              <p className="text-xs text-body">{simulation.alternative.description}</p>
            </div>
          </div>

          <div className="border-t border-ink/10 pt-lg text-center">
            {simulation.deltaKgCO2ePerYear > 0 ? (
              <div>
                <p className="text-2xl font-black text-positive-deep">
                  Save {formatCO2e(simulation.deltaKgCO2ePerYear, displayUnit)} CO₂e/year
                </p>
                <p className="text-sm text-body mt-xs">
                  {simulation.deltaPercent.toFixed(1)}% of your total footprint
                </p>
              </div>
            ) : simulation.deltaKgCO2ePerYear < 0 ? (
              <div>
                <p className="text-2xl font-black text-negative">
                  +{formatCO2e(Math.abs(simulation.deltaKgCO2ePerYear), displayUnit)} CO₂e/year
                </p>
                <p className="text-sm text-body mt-xs">This would increase your footprint</p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-mute">No change</p>
            )}
          </div>

          {/* Apply button */}
          <div className="flex flex-col gap-sm items-center pt-md">
            <Button onClick={applyToProfile}>
              <Check size={16} aria-hidden="true" />
              Apply this change to my profile
            </Button>
            <p className="text-xs text-mute text-center max-w-sm">
              <AlertTriangle size={12} className="inline mr-1" aria-hidden="true" />
              This updates your current profile only. Existing snapshots are not modified. Save a
              new snapshot to record the change.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
