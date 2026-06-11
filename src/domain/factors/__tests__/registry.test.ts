import { describe, it, expect } from 'vitest';
import { FACTOR_REGISTRY, getFactor, validateRegistry } from '../registry';

describe('Factor Registry', () => {
  it('has a valid semver version', () => {
    expect(FACTOR_REGISTRY.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has a valid lastUpdated date', () => {
    expect(FACTOR_REGISTRY.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('all factors are verified', () => {
    const { valid, issues } = validateRegistry();
    expect(issues).toEqual([]);
    expect(valid).toBe(true);
  });

  it('all factors have non-negative values', () => {
    for (const [, factor] of Object.entries(FACTOR_REGISTRY.factors)) {
      expect(factor.value).toBeGreaterThanOrEqual(0);
    }
  });

  it('all factors have source URLs', () => {
    for (const [, factor] of Object.entries(FACTOR_REGISTRY.factors)) {
      expect(factor.source.url).toBeTruthy();
      expect(factor.source.url).toMatch(/^https?:\/\//);
    }
  });

  it('all factors have source organizations', () => {
    for (const [, factor] of Object.entries(FACTOR_REGISTRY.factors)) {
      expect(factor.source.organization).toBeTruthy();
    }
  });

  it('all factors have caveats', () => {
    for (const [, factor] of Object.entries(FACTOR_REGISTRY.factors)) {
      expect(factor.caveat).toBeTruthy();
    }
  });

  it('all factors have valid confidence levels', () => {
    const validLevels = ['high', 'medium', 'low', 'demo-estimate'];
    for (const [, factor] of Object.entries(FACTOR_REGISTRY.factors)) {
      expect(validLevels).toContain(factor.confidence);
    }
  });

  it('getFactor retrieves existing factors', () => {
    const car = getFactor('transport.car.average');
    expect(car.value).toBeCloseTo(0.1714, 4);
    expect(car.unit).toBe('kg CO2e/km');
  });

  it('getFactor throws for unknown factors', () => {
    expect(() => getFactor('nonexistent')).toThrow('Unknown emission factor');
  });

  // ─── Specific factor value checks ───

  it('car factor is approximately 0.171 kg CO2e/km', () => {
    const car = getFactor('transport.car.average');
    expect(car.value).toBeCloseTo(0.171, 2);
  });

  it('bus < car per passenger-km', () => {
    const car = getFactor('transport.car.average');
    const bus = getFactor('transport.bus.average');
    expect(bus.value).toBeLessThan(car.value);
  });

  it('train < bus per passenger-km', () => {
    const bus = getFactor('transport.bus.average');
    const train = getFactor('transport.train.average');
    expect(train.value).toBeLessThan(bus.value);
  });

  it('bicycle and walk are zero', () => {
    expect(getFactor('transport.bicycle').value).toBe(0);
    expect(getFactor('transport.walk').value).toBe(0);
  });

  it('vegan < vegetarian < heavy-meat diet factors', () => {
    const vegan = getFactor('diet.vegan');
    const vegetarian = getFactor('diet.vegetarian');
    const heavyMeat = getFactor('diet.heavy_meat');
    expect(vegan.value).toBeLessThan(vegetarian.value);
    expect(vegetarian.value).toBeLessThan(heavyMeat.value);
  });

  it('short-haul flight factor > medium-haul (higher per-km for short flights)', () => {
    const shortHaul = getFactor('flights.short_haul');
    const mediumHaul = getFactor('flights.medium_haul');
    expect(shortHaul.value).toBeGreaterThan(mediumHaul.value);
  });

  it('electricity factor is approximately 0.494 kg CO2e/kWh', () => {
    const grid = getFactor('electricity.grid.global_average');
    expect(grid.value).toBeCloseTo(0.494, 2);
  });

  it('no factors have demo-estimate confidence', () => {
    for (const factor of Object.values(FACTOR_REGISTRY.factors)) {
      expect(factor.confidence).not.toBe('demo-estimate');
    }
  });

  it('diet factors have low confidence (derived estimates)', () => {
    expect(getFactor('diet.heavy_meat').confidence).toBe('low');
    expect(getFactor('diet.vegetarian').confidence).toBe('low');
    expect(getFactor('diet.vegan').confidence).toBe('low');
  });

  it('diet factor caveats mention they are derived estimates', () => {
    const dietFactors = ['diet.heavy_meat', 'diet.vegetarian', 'diet.vegan'];
    for (const id of dietFactors) {
      const f = getFactor(id);
      expect(f.caveat).toContain('DERIVED ESTIMATE');
    }
  });

  it('transport and flight factors have high confidence (primary source)', () => {
    expect(getFactor('transport.car.average').confidence).toBe('high');
    expect(getFactor('transport.bus.average').confidence).toBe('high');
    expect(getFactor('flights.short_haul').confidence).toBe('high');
    expect(getFactor('flights.long_haul').confidence).toBe('high');
  });
});
