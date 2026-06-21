import { Compass, Sparkles } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';

import { calculateFootprint } from '../../domain/calculator/calculator';
import {
  MAX_WEEKLY_DISTANCE_KM,
  MAX_MONTHLY_KWH,
  MAX_FLIGHT_LEGS_PER_YEAR,
  MAX_HOUSEHOLD_SIZE,
} from '../../domain/units';
import { DEMO_PROFILE, DEMO_PROFILE_LABEL } from '../../lib/demo-profile';
import { Button } from '../components/button';
import { Card } from '../components/card';
import { NumberInput } from '../components/number-input';
import { ProgressBar } from '../components/progress-bar';
import { SegmentedControl } from '../components/segmented-control';
import { Toggle } from '../components/toggle';
import { Tooltip } from '../components/tooltip';
import { useLocalStore } from '../hooks/use-local-store';
import { useToast } from '../hooks/use-toast';

import type { UserProfile, TransportMode, DietProfile } from '../../storage/schemas';

// ─── Form State ───

interface TransportModeEntry {
  mode: TransportMode;
  label: string;
  enabled: boolean;
  weeklyDistanceKm: number;
}

interface OnboardingForm {
  displayUnit: 'kg' | 'tonnes';
  transport: TransportModeEntry[];
  monthlyKwh: number;
  isPersonalUsage: boolean;
  householdSize: number;
  diet: DietProfile;
  shortHaulLegs: number;
  mediumHaulLegs: number;
  longHaulLegs: number;
  effortPreference: 'low' | 'medium' | 'high';
  budgetSensitivity: 'low' | 'medium' | 'high';
  reductionGoalPercent: number | null;
  hasReductionGoal: boolean;
}

const INITIAL_TRANSPORT: TransportModeEntry[] = [
  { mode: 'car', label: 'Car', enabled: false, weeklyDistanceKm: 0 },
  { mode: 'bus', label: 'Bus', enabled: false, weeklyDistanceKm: 0 },
  { mode: 'train', label: 'Train', enabled: false, weeklyDistanceKm: 0 },
  { mode: 'bicycle', label: 'Bicycle', enabled: false, weeklyDistanceKm: 0 },
  { mode: 'walk', label: 'Walk', enabled: false, weeklyDistanceKm: 0 },
];

function createDefaultForm(): OnboardingForm {
  return {
    displayUnit: 'kg',
    transport: INITIAL_TRANSPORT.map((t) => ({ ...t })),
    monthlyKwh: 0,
    isPersonalUsage: true,
    householdSize: 1,
    diet: 'heavy-meat',
    shortHaulLegs: 0,
    mediumHaulLegs: 0,
    longHaulLegs: 0,
    effortPreference: 'medium',
    budgetSensitivity: 'medium',
    reductionGoalPercent: null,
    hasReductionGoal: false,
  };
}

function profileToForm(profile: UserProfile, displayUnit: 'kg' | 'tonnes'): OnboardingForm {
  const transportMap = new Map(profile.transport.modes.map((m) => [m.mode, m.weeklyDistanceKm]));
  return {
    displayUnit,
    transport: INITIAL_TRANSPORT.map((t) => ({
      ...t,
      enabled: transportMap.has(t.mode) && (transportMap.get(t.mode) ?? 0) > 0,
      weeklyDistanceKm: transportMap.get(t.mode) ?? 0,
    })),
    monthlyKwh: profile.electricity.monthlyKwh,
    isPersonalUsage: profile.electricity.isPersonalUsage,
    householdSize: profile.electricity.householdSize,
    diet: profile.diet,
    shortHaulLegs: profile.flights.shortHaulLegs,
    mediumHaulLegs: profile.flights.mediumHaulLegs,
    longHaulLegs: profile.flights.longHaulLegs,
    effortPreference: profile.personalization.effortPreference,
    budgetSensitivity: profile.personalization.budgetSensitivity,
    reductionGoalPercent: profile.personalization.reductionGoalPercent,
    hasReductionGoal: profile.personalization.reductionGoalPercent !== null,
  };
}

function formToProfile(form: OnboardingForm): UserProfile {
  return {
    transport: {
      modes: form.transport
        .filter((t) => t.enabled && t.weeklyDistanceKm > 0)
        .map((t) => ({ mode: t.mode, weeklyDistanceKm: t.weeklyDistanceKm })),
    },
    electricity: {
      monthlyKwh: form.monthlyKwh,
      isPersonalUsage: form.isPersonalUsage,
      householdSize: form.householdSize,
    },
    diet: form.diet,
    flights: {
      shortHaulLegs: form.shortHaulLegs,
      mediumHaulLegs: form.mediumHaulLegs,
      longHaulLegs: form.longHaulLegs,
    },
    personalization: {
      reductionGoalPercent: form.hasReductionGoal ? (form.reductionGoalPercent ?? null) : null,
      effortPreference: form.effortPreference,
      budgetSensitivity: form.budgetSensitivity,
    },
  };
}

// ─── Validation ───

interface StepErrors {
  [key: string]: string;
}

function validateStep(step: number, form: OnboardingForm): StepErrors {
  const errors: StepErrors = {};

  if (step === 2) {
    // Transport
    for (const t of form.transport) {
      if (t.enabled && t.weeklyDistanceKm < 0) {
        errors[`transport-${t.mode}`] = 'Distance cannot be negative.';
      }
      if (t.enabled && t.weeklyDistanceKm > MAX_WEEKLY_DISTANCE_KM) {
        errors[`transport-${t.mode}`] =
          `Maximum ${MAX_WEEKLY_DISTANCE_KM.toLocaleString()} km/week.`;
      }
    }
  }

  if (step === 3) {
    // Electricity
    if (form.monthlyKwh < 0) {
      errors.monthlyKwh = 'Usage cannot be negative.';
    }
    if (form.monthlyKwh > MAX_MONTHLY_KWH) {
      errors.monthlyKwh = `Maximum ${MAX_MONTHLY_KWH.toLocaleString()} kWh/month.`;
    }
    if (!form.isPersonalUsage && form.householdSize < 1) {
      errors.householdSize = 'Household must have at least 1 person.';
    }
    if (!form.isPersonalUsage && form.householdSize > MAX_HOUSEHOLD_SIZE) {
      errors.householdSize = `Maximum ${MAX_HOUSEHOLD_SIZE} people.`;
    }
  }

  if (step === 5) {
    // Flights
    if (form.shortHaulLegs < 0 || form.shortHaulLegs > MAX_FLIGHT_LEGS_PER_YEAR) {
      errors.shortHaulLegs = `Must be 0–${MAX_FLIGHT_LEGS_PER_YEAR}.`;
    }
    if (form.mediumHaulLegs < 0 || form.mediumHaulLegs > MAX_FLIGHT_LEGS_PER_YEAR) {
      errors.mediumHaulLegs = `Must be 0–${MAX_FLIGHT_LEGS_PER_YEAR}.`;
    }
    if (form.longHaulLegs < 0 || form.longHaulLegs > MAX_FLIGHT_LEGS_PER_YEAR) {
      errors.longHaulLegs = `Must be 0–${MAX_FLIGHT_LEGS_PER_YEAR}.`;
    }
    // Reduction goal
    if (
      form.hasReductionGoal &&
      form.reductionGoalPercent !== null &&
      (form.reductionGoalPercent < 0 || form.reductionGoalPercent > 100)
    ) {
      errors.reductionGoalPercent = 'Must be between 0 and 100%.';
    }
  }

  return errors;
}

// ─── Step Components ───

const STEP_LABELS = ['Welcome', 'Transport', 'Energy', 'Diet', 'Flights & Goals'];

// ─── Main Component ───

export function OnboardingPage() {
  const store = useLocalStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OnboardingForm>(() => {
    // Pre-populate for returning users
    if (store.data.profile) {
      return profileToForm(store.data.profile, store.data.settings.displayUnit);
    }
    return createDefaultForm();
  });
  const [errors, setErrors] = useState<StepErrors>({});
  const [isDemoLoaded, setIsDemoLoaded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const isReturning = store.data.profile !== null;

  const goNext = useCallback(() => {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      const firstErrorKey = Object.keys(stepErrors)[0];
      if (firstErrorKey) {
        const el = document.getElementById(firstErrorKey);
        el?.focus();
      }
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, 5));
  }, [step, form]);

  const goBack = useCallback(() => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }, []);

  const loadDemoProfile = useCallback(() => {
    setForm(profileToForm(DEMO_PROFILE, form.displayUnit));
    setIsDemoLoaded(true);
    addToast('Sample data loaded — you can edit any value.', 'info');
  }, [form.displayUnit, addToast]);

  const handleSubmit = useCallback(() => {
    // Validate final step
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      const firstErrorKey = Object.keys(stepErrors)[0];
      if (firstErrorKey) {
        const el = document.getElementById(firstErrorKey);
        el?.focus();
      }
      return;
    }

    // Build profile + calculate
    const profile = formToProfile(form);
    const result = calculateFootprint(profile);

    // Save
    store.saveProfile(profile);
    store.updateSettings({ displayUnit: form.displayUnit });
    store.addSnapshot({
      id: `snapshot-${Date.now()}`,
      date: new Date().toISOString(),
      result,
      profile,
    });

    addToast('Your carbon footprint has been calculated!', 'success');
    navigate('/dashboard');
  }, [step, form, store, navigate, addToast]);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const updateTransport = useCallback(
    (mode: TransportMode, field: 'enabled' | 'weeklyDistanceKm', value: boolean | number) => {
      setForm((prev) => ({
        ...prev,
        transport: prev.transport.map((t) => (t.mode === mode ? { ...t, [field]: value } : t)),
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[`transport-${mode}`];
        return next;
      });
    },
    [],
  );

  return (
    <div className="min-h-screen bg-canvas-soft flex flex-col">
      {/* Header */}
      <header className="bg-canvas border-b border-canvas-soft">
        <div className="max-w-2xl mx-auto px-xl py-md flex items-center justify-between">
          <div className="flex items-center gap-sm">
            <Compass size={24} className="text-primary" aria-hidden="true" />
            <span className="font-display text-lg font-black text-ink">Carbon Compass</span>
          </div>
          {isReturning && (
            <Button variant="tertiary" size="sm" onClick={() => navigate('/dashboard')}>
              Back to dashboard
            </Button>
          )}
        </div>
      </header>

      <main id="main-content" className="flex-1 flex flex-col items-center px-xl py-2xl">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <ProgressBar
            currentStep={step}
            totalSteps={5}
            stepLabels={STEP_LABELS}
            className="mb-2xl"
          />

          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 5) handleSubmit();
              else goNext();
            }}
            noValidate
          >
            {/* ─── Step 1: Welcome ─── */}
            {step === 1 && (
              <Card variant="content" as="section" className="flex flex-col gap-xl">
                <div className="text-center">
                  <h1 className="font-display text-2xl font-black text-ink mb-md">
                    {isReturning ? 'Revise your answers' : 'Welcome to Carbon Compass'}
                  </h1>
                  <p className="text-body leading-relaxed max-w-md mx-auto">
                    {isReturning
                      ? 'Update your information to recalculate your carbon footprint.'
                      : 'Answer a few questions about your daily habits to estimate your carbon footprint. It takes about 2 minutes.'}
                  </p>
                </div>

                <div className="flex flex-col gap-lg">
                  <SegmentedControl
                    legend="Preferred display unit"
                    options={[
                      {
                        value: 'kg' as const,
                        label: 'Kilograms (kg)',
                        description: 'Smaller numbers, more precise',
                      },
                      {
                        value: 'tonnes' as const,
                        label: 'Tonnes (t)',
                        description: 'Larger-scale view',
                      },
                    ]}
                    value={form.displayUnit}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, displayUnit: v }));
                    }}
                  />

                  {!isReturning && (
                    <div className="border-t border-canvas-soft pt-lg">
                      <button
                        type="button"
                        onClick={loadDemoProfile}
                        className="flex items-center gap-sm text-sm text-body hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-primary rounded-lg px-md py-sm"
                      >
                        <Sparkles size={16} aria-hidden="true" className="text-primary" />
                        <span>
                          <strong className="text-ink">Load sample data</strong>
                          {' — '}
                          <span className="text-mute">{DEMO_PROFILE_LABEL}</span>
                        </span>
                      </button>
                      {isDemoLoaded && (
                        <p className="text-xs text-mute mt-sm ml-8" role="status">
                          ⓘ This is sample data for exploration. Edit any values to match your
                          habits.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* ─── Step 2: Transport ─── */}
            {step === 2 && (
              <Card variant="content" as="section" className="flex flex-col gap-xl">
                <div>
                  <h1 className="font-display text-2xl font-black text-ink mb-sm">
                    How do you get around?
                  </h1>
                  <p className="text-body text-sm">
                    Select the transport modes you use regularly and enter your typical weekly
                    distance.
                    <Tooltip content="Enter total one-way distance per week. Don't double for round trips." />
                  </p>
                </div>

                <div className="flex flex-col gap-lg">
                  {form.transport.map((t) => (
                    <div key={t.mode} className="flex flex-col gap-sm">
                      <label className="flex items-center gap-md cursor-pointer">
                        <input
                          type="checkbox"
                          checked={t.enabled}
                          onChange={(e) => {
                            updateTransport(t.mode, 'enabled', e.target.checked);
                          }}
                          className="w-5 h-5 rounded-sm accent-primary focus-visible:outline-2 focus-visible:outline-primary"
                        />
                        <span className="text-sm font-semibold text-ink">{t.label}</span>
                      </label>
                      {t.enabled && (
                        <div className="ml-9">
                          <NumberInput
                            id={`transport-${t.mode}`}
                            label={`Weekly ${t.label.toLowerCase()} distance`}
                            value={t.weeklyDistanceKm}
                            onChange={(v) => {
                              updateTransport(t.mode, 'weeklyDistanceKm', v);
                            }}
                            min={0}
                            max={MAX_WEEKLY_DISTANCE_KM}
                            step={5}
                            unit="km"
                            error={errors[`transport-${t.mode}`]}
                            hint="Total distance per week"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ─── Step 3: Electricity ─── */}
            {step === 3 && (
              <Card variant="content" as="section" className="flex flex-col gap-xl">
                <div>
                  <h1 className="font-display text-2xl font-black text-ink mb-sm">
                    Home electricity
                  </h1>
                  <p className="text-body text-sm">
                    Your monthly electricity usage in kilowatt-hours.
                    <Tooltip content="Check your electricity bill for monthly kWh usage. A typical UK household uses 200–300 kWh/month." />
                  </p>
                </div>

                <div className="flex flex-col gap-lg">
                  <NumberInput
                    id="monthlyKwh"
                    label="Monthly electricity usage"
                    value={form.monthlyKwh}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, monthlyKwh: v }));
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.monthlyKwh;
                        return n;
                      });
                    }}
                    min={0}
                    max={MAX_MONTHLY_KWH}
                    step={10}
                    unit="kWh"
                    error={errors.monthlyKwh}
                    hint="From your electricity bill"
                  />

                  <Toggle
                    label="This is my personal usage only"
                    checked={form.isPersonalUsage}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, isPersonalUsage: v }));
                    }}
                    hint="Turn off if this is your whole household's usage"
                  />

                  {!form.isPersonalUsage && (
                    <NumberInput
                      id="householdSize"
                      label="People in your household"
                      value={form.householdSize}
                      onChange={(v) => {
                        setForm((prev) => ({ ...prev, householdSize: v }));
                        setErrors((prev) => {
                          const n = { ...prev };
                          delete n.householdSize;
                          return n;
                        });
                      }}
                      min={1}
                      max={MAX_HOUSEHOLD_SIZE}
                      step={1}
                      error={errors.householdSize}
                      hint="We'll divide the electricity equally"
                    />
                  )}
                </div>
              </Card>
            )}

            {/* ─── Step 4: Diet ─── */}
            {step === 4 && (
              <Card variant="content" as="section" className="flex flex-col gap-xl">
                <div>
                  <h1 className="font-display text-2xl font-black text-ink mb-sm">Your diet</h1>
                  <p className="text-body text-sm">
                    Select the option that best describes your typical eating habits.
                  </p>
                </div>

                <SegmentedControl
                  legend="Diet profile"
                  options={[
                    {
                      value: 'heavy-meat',
                      label: 'Regular meat eater',
                      description: 'Meat most days',
                    },
                    {
                      value: 'vegetarian',
                      label: 'Vegetarian',
                      description: 'No meat, dairy & eggs OK',
                    },
                    {
                      value: 'vegan',
                      label: 'Vegan',
                      description: 'Fully plant-based',
                    },
                  ]}
                  value={form.diet}
                  onChange={(v) => {
                    setForm((prev) => ({ ...prev, diet: v }));
                  }}
                />

                <p className="text-xs text-mute">
                  Diet estimates have low confidence and wide individual variation. They use derived
                  figures from published research, not direct measurements.
                </p>
              </Card>
            )}

            {/* ─── Step 5: Flights & Goals ─── */}
            {step === 5 && (
              <Card variant="content" as="section" className="flex flex-col gap-xl">
                <div>
                  <h1 className="font-display text-2xl font-black text-ink mb-sm">
                    Flights & your goals
                  </h1>
                  <p className="text-body text-sm">
                    How many one-way flight legs do you take per year?
                    <Tooltip content="Count each one-way segment separately. A return trip = 2 legs. Short-haul: under 1,500 km. Medium: 1,500–4,000 km. Long: over 4,000 km." />
                  </p>
                </div>

                <div className="flex flex-col gap-lg">
                  <NumberInput
                    id="shortHaulLegs"
                    label="Short-haul flights"
                    value={form.shortHaulLegs}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, shortHaulLegs: Math.round(v) }));
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.shortHaulLegs;
                        return n;
                      });
                    }}
                    min={0}
                    max={MAX_FLIGHT_LEGS_PER_YEAR}
                    step={1}
                    unit="legs/yr"
                    error={errors.shortHaulLegs}
                    hint="Under 1,500 km (e.g. London ↔ Paris)"
                  />
                  <NumberInput
                    id="mediumHaulLegs"
                    label="Medium-haul flights"
                    value={form.mediumHaulLegs}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, mediumHaulLegs: Math.round(v) }));
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.mediumHaulLegs;
                        return n;
                      });
                    }}
                    min={0}
                    max={MAX_FLIGHT_LEGS_PER_YEAR}
                    step={1}
                    unit="legs/yr"
                    error={errors.mediumHaulLegs}
                    hint="1,500–4,000 km (e.g. London ↔ Istanbul)"
                  />
                  <NumberInput
                    id="longHaulLegs"
                    label="Long-haul flights"
                    value={form.longHaulLegs}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, longHaulLegs: Math.round(v) }));
                      setErrors((prev) => {
                        const n = { ...prev };
                        delete n.longHaulLegs;
                        return n;
                      });
                    }}
                    min={0}
                    max={MAX_FLIGHT_LEGS_PER_YEAR}
                    step={1}
                    unit="legs/yr"
                    error={errors.longHaulLegs}
                    hint="Over 4,000 km (e.g. London ↔ New York)"
                  />
                </div>

                <div className="border-t border-canvas-soft pt-lg flex flex-col gap-lg">
                  <h2 className="text-lg font-semibold text-ink">Preferences</h2>

                  <SegmentedControl
                    legend="How much effort are you willing to put in?"
                    options={[
                      { value: 'low' as const, label: 'Low', description: 'Easy changes only' },
                      {
                        value: 'medium' as const,
                        label: 'Medium',
                        description: 'Some lifestyle adjustments',
                      },
                      {
                        value: 'high' as const,
                        label: 'High',
                        description: 'Significant changes welcome',
                      },
                    ]}
                    value={form.effortPreference}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, effortPreference: v }));
                    }}
                  />

                  <SegmentedControl
                    legend="Budget sensitivity"
                    options={[
                      { value: 'low' as const, label: 'Low', description: 'Cost is not a concern' },
                      {
                        value: 'medium' as const,
                        label: 'Medium',
                        description: 'Moderate budget awareness',
                      },
                      {
                        value: 'high' as const,
                        label: 'High',
                        description: 'Prefer free or money-saving options',
                      },
                    ]}
                    value={form.budgetSensitivity}
                    onChange={(v) => {
                      setForm((prev) => ({ ...prev, budgetSensitivity: v }));
                    }}
                  />

                  <div className="flex flex-col gap-sm">
                    <Toggle
                      label="Set a reduction goal"
                      checked={form.hasReductionGoal}
                      onChange={(v) => {
                        setForm((prev) => ({
                          ...prev,
                          hasReductionGoal: v,
                          reductionGoalPercent: v ? 20 : null,
                        }));
                      }}
                      hint="Optional — target percentage to reduce your footprint"
                    />
                    {form.hasReductionGoal && (
                      <NumberInput
                        id="reductionGoalPercent"
                        label="Reduction target"
                        value={form.reductionGoalPercent ?? 20}
                        onChange={(v) => {
                          setForm((prev) => ({ ...prev, reductionGoalPercent: v }));
                          setErrors((prev) => {
                            const n = { ...prev };
                            delete n.reductionGoalPercent;
                            return n;
                          });
                        }}
                        min={0}
                        max={100}
                        step={5}
                        unit="%"
                        error={errors.reductionGoalPercent}
                        hint="Percentage of your footprint you'd like to reduce"
                      />
                    )}
                  </div>
                </div>
              </Card>
            )}

            {/* ─── Navigation ─── */}
            <div className="flex justify-between mt-xl gap-md">
              {step > 1 ? (
                <Button type="button" variant="secondary" onClick={goBack}>
                  Back
                </Button>
              ) : (
                <div />
              )}
              {step < 5 ? (
                <Button type="submit">Next</Button>
              ) : (
                <Button type="submit">
                  {isReturning ? 'Recalculate' : 'Calculate my footprint'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
