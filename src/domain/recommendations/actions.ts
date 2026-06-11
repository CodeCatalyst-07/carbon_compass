/**
 * Deterministic recommendation action catalog.
 *
 * Each action includes:
 * - id, category, title, description, rationale
 * - applicability condition (prevents irrelevant advice)
 * - metadata: impact/effort/cost bands, time horizon, optional Maps query
 * - optional savings estimator
 *
 * Rules enforced:
 * - Vegan/vegetarian users never see meat-reduction advice
 * - Low car usage prevents car advice from dominating
 * - Already-completed actions are filtered at ranking time
 */

import type { Action } from './types';
import { getFactor, AVERAGE_FLIGHT_DISTANCES_KM } from '../factors/registry';

export const ACTION_CATALOG: Action[] = [
  // ─── Transport Actions ───
  {
    id: 'transport-reduce-car',
    title: 'Reduce car journeys',
    description:
      'Replace short car trips with walking, cycling, or public transport where practical.',
    category: 'transport',
    rationale:
      'Cars are the highest-emission personal transport mode. Even replacing a few short trips per week makes a measurable difference.',
    isApplicable: (ctx) => ctx.usesCar && ctx.carKmPerWeek > 20,
    estimateSavings: (ctx) => {
      // Assume replacing 20% of car km with zero-emission transport
      const carFactor = getFactor('transport.car.average');
      return ctx.carKmPerWeek * 0.2 * 52 * carFactor.value;
    },
    metadata: {
      estimatedSavingsKgCO2ePerYear: null, // Calculated dynamically
      savingsConfidence: 'medium',
      savingsMethodology:
        'Assumes 20% of current car distance replaced with zero-emission transport.',
      effort: 'medium',
      cost: 'saves-money',
      timeHorizon: 'immediate',
      impact: 'high',
      mapsSearchQuery: 'public transport stops near me',
      mapsActionType: 'search',
    },
  },
  {
    id: 'transport-switch-bus',
    title: 'Switch to bus for commuting',
    description: 'Use local buses for regular journeys instead of driving alone.',
    category: 'transport',
    rationale: 'Buses emit about 60% less CO2 per passenger-km than cars.',
    isApplicable: (ctx) => ctx.usesCar && ctx.carKmPerWeek > 30,
    estimateSavings: (ctx) => {
      const carFactor = getFactor('transport.car.average');
      const busFactor = getFactor('transport.bus.average');
      // Assume 50% of car commute can switch to bus
      const switchableKmPerWeek = ctx.carKmPerWeek * 0.5;
      const savings = switchableKmPerWeek * 52 * (carFactor.value - busFactor.value);
      return savings;
    },
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: 'medium',
      savingsMethodology: 'Assumes 50% of car commute switched to bus.',
      effort: 'medium',
      cost: 'saves-money',
      timeHorizon: 'immediate',
      impact: 'medium',
      mapsSearchQuery: 'bus routes',
      mapsActionType: 'directions-transit',
    },
  },
  {
    id: 'transport-cycle',
    title: 'Cycle for short trips',
    description: 'Use a bicycle for trips under 5 km.',
    category: 'transport',
    rationale:
      'Cycling produces zero direct emissions and is often faster than driving for short urban trips.',
    isApplicable: (ctx) => ctx.usesCar && ctx.carKmPerWeek > 10,
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: null,
      savingsMethodology: null,
      effort: 'medium',
      cost: 'saves-money',
      timeHorizon: 'immediate',
      impact: 'medium',
      mapsSearchQuery: 'bicycle repair shop',
      mapsActionType: 'search',
    },
  },
  {
    id: 'transport-train-long',
    title: 'Take the train for longer trips',
    description: 'Choose rail over driving for journeys over 30 km.',
    category: 'transport',
    rationale: 'Trains emit about 80% less CO2 per passenger-km than cars.',
    isApplicable: (ctx) => ctx.usesCar && ctx.carKmPerWeek > 50,
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: null,
      savingsMethodology: null,
      effort: 'easy',
      cost: 'low',
      timeHorizon: 'immediate',
      impact: 'high',
      mapsSearchQuery: 'train station',
      mapsActionType: 'search',
    },
  },

  // ─── Electricity Actions ───
  {
    id: 'electricity-reduce-usage',
    title: 'Reduce electricity consumption',
    description:
      'Turn off lights in empty rooms, use energy-efficient appliances, and unplug devices not in use.',
    category: 'electricity',
    rationale: 'Simple behavioral changes can reduce household electricity by 10–15%.',
    isApplicable: (ctx) => ctx.personalMonthlyKwh > 50,
    estimateSavings: (ctx) => {
      const gridFactor = getFactor('electricity.grid.global_average');
      // Assume 10% reduction achievable
      return ctx.personalMonthlyKwh * 0.1 * 12 * gridFactor.value;
    },
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: 'low',
      savingsMethodology: 'Assumes 10% reduction in monthly electricity usage.',
      effort: 'easy',
      cost: 'saves-money',
      timeHorizon: 'immediate',
      impact: 'medium',
      mapsSearchQuery: null,
      mapsActionType: null,
    },
  },
  {
    id: 'electricity-led-lighting',
    title: 'Switch to LED lighting',
    description: 'Replace all incandescent and halogen bulbs with LEDs.',
    category: 'electricity',
    rationale: 'LEDs use up to 80% less energy than incandescent bulbs and last 10–25× longer.',
    isApplicable: (ctx) => ctx.personalMonthlyKwh > 30,
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: null,
      savingsMethodology: null,
      effort: 'easy',
      cost: 'low',
      timeHorizon: 'weeks',
      impact: 'low',
      mapsSearchQuery: null,
      mapsActionType: null,
    },
  },
  {
    id: 'electricity-green-tariff',
    title: 'Switch to a green energy tariff',
    description: 'Choose a certified renewable energy tariff from your electricity provider.',
    category: 'electricity',
    rationale:
      'Green tariffs can reduce your grid electricity emissions significantly, though effectiveness varies by market.',
    isApplicable: (ctx) => ctx.personalMonthlyKwh > 50,
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: null,
      savingsMethodology: null,
      effort: 'easy',
      cost: 'medium',
      timeHorizon: 'weeks',
      impact: 'high',
      mapsSearchQuery: null,
      mapsActionType: null,
    },
  },

  // ─── Diet Actions ───
  {
    id: 'diet-reduce-meat',
    title: 'Reduce meat consumption',
    description: 'Replace some meat meals with plant-based alternatives or legume dishes.',
    category: 'diet',
    rationale:
      'Meat production (especially beef and lamb) is the most carbon-intensive food category.',
    isApplicable: (ctx) => ctx.diet === 'heavy-meat',
    estimateSavings: () => {
      const heavyMeat = getFactor('diet.heavy_meat');
      const vegetarian = getFactor('diet.vegetarian');
      // Savings if going from heavy-meat to vegetarian
      return (heavyMeat.value - vegetarian.value) * 365;
    },
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: 'medium',
      savingsMethodology: 'Difference between heavy-meat and vegetarian daily diet factors × 365.',
      effort: 'medium',
      cost: 'saves-money',
      timeHorizon: 'immediate',
      impact: 'high',
      mapsSearchQuery: 'farmers market',
      mapsActionType: 'search',
    },
  },
  {
    id: 'diet-meatless-days',
    title: 'Try meatless days each week',
    description: 'Start with 2–3 meat-free days per week using recipes you already enjoy.',
    category: 'diet',
    rationale: 'Even partial reduction in meat consumption significantly lowers food emissions.',
    isApplicable: (ctx) => ctx.diet === 'heavy-meat',
    estimateSavings: () => {
      const heavyMeat = getFactor('diet.heavy_meat');
      const vegetarian = getFactor('diet.vegetarian');
      // 3 meatless days per week = 43% reduction
      return (heavyMeat.value - vegetarian.value) * (3 / 7) * 365;
    },
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: 'medium',
      savingsMethodology:
        'Assumes 3 days/week switching from heavy-meat to vegetarian diet factor.',
      effort: 'easy',
      cost: 'saves-money',
      timeHorizon: 'immediate',
      impact: 'medium',
      mapsSearchQuery: null,
      mapsActionType: null,
    },
  },
  {
    id: 'diet-reduce-dairy',
    title: 'Reduce dairy consumption',
    description: 'Try plant-based milk, cheese, or yogurt alternatives for some meals.',
    category: 'diet',
    rationale: 'Dairy is the second-highest emission food category after meat.',
    isApplicable: (ctx) => ctx.diet === 'vegetarian',
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: null,
      savingsMethodology: null,
      effort: 'easy',
      cost: 'free',
      timeHorizon: 'immediate',
      impact: 'medium',
      mapsSearchQuery: null,
      mapsActionType: null,
    },
  },

  // ─── Flight Actions ───
  {
    id: 'flights-reduce-short',
    title: 'Replace short flights with train travel',
    description:
      'For journeys under 800 km, trains are often comparable in total travel time and much lower emission.',
    category: 'flights',
    rationale:
      'Short-haul flights have the highest per-km emissions due to takeoff/landing fuel intensity.',
    isApplicable: (ctx) => ctx.shortHaulLegs > 0,
    estimateSavings: (ctx) => {
      const flightFactor = getFactor('flights.short_haul');
      const trainFactor = getFactor('transport.train.average');
      const kmPerLeg = AVERAGE_FLIGHT_DISTANCES_KM.shortHaul;
      return ctx.shortHaulLegs * kmPerLeg * (flightFactor.value - trainFactor.value);
    },
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: 'medium',
      savingsMethodology:
        'Difference between short-haul flight and train factors × distance × legs.',
      effort: 'medium',
      cost: 'free',
      timeHorizon: 'months',
      impact: 'high',
      mapsSearchQuery: 'train station',
      mapsActionType: 'search',
    },
  },
  {
    id: 'flights-reduce-frequency',
    title: 'Fly less frequently',
    description:
      'Consider combining trips or using video calls instead of flying for some journeys.',
    category: 'flights',
    rationale:
      'Each return long-haul flight produces roughly the same emissions as driving 10,000 km.',
    isApplicable: (ctx) => ctx.hasFlights && ctx.shortHaulLegs + ctx.longHaulLegs > 4,
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: null,
      savingsMethodology: null,
      effort: 'hard',
      cost: 'saves-money',
      timeHorizon: 'months',
      impact: 'high',
      mapsSearchQuery: null,
      mapsActionType: null,
    },
  },

  // ─── General / Habit Actions ───
  {
    id: 'habit-track-progress',
    title: 'Track your progress monthly',
    description: 'Re-take the questionnaire each month to monitor changes in your footprint.',
    category: 'habit',
    rationale: 'Tracking creates awareness and motivates continued improvement.',
    isApplicable: () => true,
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: null,
      savingsMethodology: null,
      effort: 'easy',
      cost: 'free',
      timeHorizon: 'immediate',
      impact: 'low',
      mapsSearchQuery: null,
      mapsActionType: null,
    },
  },
  {
    id: 'habit-reduce-food-waste',
    title: 'Reduce food waste',
    description:
      'Plan meals, store food properly, and use leftovers to reduce the ~30% of food that typically goes to waste.',
    category: 'habit',
    rationale: 'Food waste accounts for 8–10% of global greenhouse gas emissions.',
    isApplicable: () => true,
    metadata: {
      estimatedSavingsKgCO2ePerYear: null,
      savingsConfidence: null,
      savingsMethodology: null,
      effort: 'easy',
      cost: 'saves-money',
      timeHorizon: 'immediate',
      impact: 'medium',
      mapsSearchQuery: null,
      mapsActionType: null,
    },
  },
];
