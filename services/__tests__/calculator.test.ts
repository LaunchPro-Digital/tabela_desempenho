import { describe, it, expect } from 'vitest';
import {
  calculateWeeklyValue,
  calculateMetricStatus,
  getStatusColor,
  getWeeklyHighlights,
} from '../calculator';
import { MetricType, Metric, WeeklyData, User, UserRole } from '../../types';

// ─── Test Helpers ────────────────────────────────────────────────────────────

const makeMetric = (overrides: Partial<Metric> & { type: MetricType }): Metric => ({
  id: 'metric-1',
  title: 'Test Metric',
  targetValue: 100,
  unit: '%',
  inputs: [
    { key: 'total', label: 'Total', type: 'number' },
    { key: 'success', label: 'Success', type: 'number' },
  ],
  ...overrides,
});

const makeEntry = (week: number, inputs: Record<string, any>): WeeklyData => ({
  week,
  inputs,
  calculatedValue: 0,
  timestamp: new Date().toISOString(),
});

const makeUser = (id: string, metrics: Metric[]): User => ({
  id,
  name: `User ${id}`,
  role: UserRole.CONTRIBUTOR,
  avatar: '',
  roleTitle: 'Dev',
  metrics,
});

// ─── calculateWeeklyValue ────────────────────────────────────────────────────

describe('calculateWeeklyValue', () => {
  describe('PERCENTAGE_CUMULATIVE', () => {
    const metric = makeMetric({ type: MetricType.PERCENTAGE_CUMULATIVE });

    it('calcula percentual corretamente com valores normais', () => {
      const entry = makeEntry(1, { total: 200, success: 150 });
      expect(calculateWeeklyValue(metric, entry)).toBe(75);
    });

    it('retorna 0 quando total é zero (divisão por zero)', () => {
      const entry = makeEntry(1, { total: 0, success: 0 });
      expect(calculateWeeklyValue(metric, entry)).toBe(0);
    });

    it('retorna 0 quando success é zero', () => {
      const entry = makeEntry(1, { total: 100, success: 0 });
      expect(calculateWeeklyValue(metric, entry)).toBe(0);
    });

    it('retorna 100 quando success === total', () => {
      const entry = makeEntry(1, { total: 50, success: 50 });
      expect(calculateWeeklyValue(metric, entry)).toBe(100);
    });

    it('retorna 0 se inputs insuficientes', () => {
      const m = makeMetric({ type: MetricType.PERCENTAGE_CUMULATIVE, inputs: [] });
      const entry = makeEntry(1, { total: 100, success: 50 });
      expect(calculateWeeklyValue(m, entry)).toBe(0);
    });
  });

  describe('SUM_TARGET', () => {
    const metric = makeMetric({
      type: MetricType.SUM_TARGET,
      unit: 'reuniões',
      inputs: [{ key: 'count', label: 'Quantidade', type: 'number' }],
    });

    it('retorna valor do input corretamente', () => {
      const entry = makeEntry(1, { count: 5 });
      expect(calculateWeeklyValue(metric, entry)).toBe(5);
    });

    it('retorna 0 quando input está ausente', () => {
      const entry = makeEntry(1, {});
      expect(calculateWeeklyValue(metric, entry)).toBe(0);
    });

    it('retorna 0 com inputs vazio no metric', () => {
      const m = makeMetric({ type: MetricType.SUM_TARGET, inputs: [] });
      const entry = makeEntry(1, { count: 5 });
      expect(calculateWeeklyValue(m, entry)).toBe(0);
    });
  });

  describe('PERCENTAGE_AVERAGE', () => {
    const metric = makeMetric({
      type: MetricType.PERCENTAGE_AVERAGE,
      inputs: [{ key: 'nps', label: 'NPS', type: 'number' }],
    });

    it('retorna valor direto', () => {
      const entry = makeEntry(1, { nps: 85 });
      expect(calculateWeeklyValue(metric, entry)).toBe(85);
    });

    it('retorna 0 quando input ausente', () => {
      const entry = makeEntry(1, {});
      expect(calculateWeeklyValue(metric, entry)).toBe(0);
    });

    it('retorna 0 com inputs vazio no metric', () => {
      const m = makeMetric({ type: MetricType.PERCENTAGE_AVERAGE, inputs: [] });
      const entry = makeEntry(1, { nps: 85 });
      expect(calculateWeeklyValue(m, entry)).toBe(0);
    });
  });

  describe('MAX_LIMIT', () => {
    const metric = makeMetric({
      type: MetricType.MAX_LIMIT,
      unit: 'dias',
      inputs: [{ key: 'days', label: 'Dias', type: 'number' }],
    });

    it('retorna valor direto', () => {
      const entry = makeEntry(1, { days: 3 });
      expect(calculateWeeklyValue(metric, entry)).toBe(3);
    });

    it('retorna 0 quando input ausente', () => {
      const entry = makeEntry(1, {});
      expect(calculateWeeklyValue(metric, entry)).toBe(0);
    });

    it('retorna 0 com inputs vazio no metric', () => {
      const m = makeMetric({ type: MetricType.MAX_LIMIT, inputs: [] });
      const entry = makeEntry(1, { days: 3 });
      expect(calculateWeeklyValue(m, entry)).toBe(0);
    });
  });

  it('retorna 0 para entry null/undefined', () => {
    const metric = makeMetric({ type: MetricType.SUM_TARGET });
    expect(calculateWeeklyValue(metric, null as any)).toBe(0);
    expect(calculateWeeklyValue(metric, undefined as any)).toBe(0);
  });

  it('retorna 0 para tipo de métrica desconhecido (default case)', () => {
    const metric = makeMetric({ type: 'UNKNOWN_TYPE' as any });
    const entry = makeEntry(1, { total: 100, success: 50 });
    expect(calculateWeeklyValue(metric, entry)).toBe(0);
  });
});

// ─── calculateMetricStatus ──────────────────────────────────────────────────

describe('calculateMetricStatus', () => {
  it('retorna gray com entries vazio', () => {
    const metric = makeMetric({ type: MetricType.PERCENTAGE_CUMULATIVE });
    const result = calculateMetricStatus(metric, []);
    expect(result).toEqual({ value: 0, status: 'gray' });
  });

  describe('PERCENTAGE_CUMULATIVE', () => {
    const metric = makeMetric({
      type: MetricType.PERCENTAGE_CUMULATIVE,
      targetValue: 80,
    });

    it('retorna green quando >= target', () => {
      const entries = [
        makeEntry(1, { metricId: 'metric-1', total: 100, success: 90 }),
      ];
      const result = calculateMetricStatus(metric, entries);
      expect(result.status).toBe('green');
      expect(result.value).toBe(90);
    });

    it('retorna yellow quando >= 80% do target', () => {
      const entries = [
        makeEntry(1, { metricId: 'metric-1', total: 100, success: 70 }),
      ];
      const result = calculateMetricStatus(metric, entries);
      expect(result.status).toBe('yellow');
      expect(result.value).toBe(70);
    });

    it('retorna red quando < 80% do target', () => {
      const entries = [
        makeEntry(1, { metricId: 'metric-1', total: 100, success: 50 }),
      ];
      const result = calculateMetricStatus(metric, entries);
      expect(result.status).toBe('red');
      expect(result.value).toBe(50);
    });

    it('trata entry com menos de 2 valores numéricos', () => {
      const entries = [
        makeEntry(1, { metricId: 'metric-1', total: 'not-a-number', success: 'also-not' }),
      ];
      const result = calculateMetricStatus(metric, entries);
      // values.length < 2 so total/success are not accumulated
      expect(result.value).toBe(0);
    });

    it('acumula múltiplas semanas', () => {
      const entries = [
        makeEntry(1, { metricId: 'metric-1', total: 50, success: 45 }),
        makeEntry(2, { metricId: 'metric-1', total: 50, success: 40 }),
      ];
      // Total: 100, Success: 85 → 85% >= 80 target → green
      const result = calculateMetricStatus(metric, entries);
      expect(result.value).toBe(85);
      expect(result.status).toBe('green');
    });
  });

  describe('SUM_TARGET', () => {
    const metric = makeMetric({
      type: MetricType.SUM_TARGET,
      targetValue: 26,
      unit: 'reuniões',
      inputs: [{ key: 'count', label: 'Quantidade', type: 'number' }],
    });

    it('retorna green quando no ritmo', () => {
      // Week 1: expected pace = 26/13 * 1 = 2, value = 3 → >= 2*0.9 → green
      const entries = [
        makeEntry(1, { metricId: 'metric-1', count: 3 }),
      ];
      const result = calculateMetricStatus(metric, entries);
      expect(result.status).toBe('green');
    });

    it('retorna yellow quando parcialmente no ritmo (>=70% mas <90%)', () => {
      // Week 5: expected = 26/13 * 5 = 10, need >= 10*0.7=7 for yellow, <10*0.9=9 for green
      const entries = [
        makeEntry(5, { metricId: 'metric-1', count: 8 }),
      ];
      const result = calculateMetricStatus(metric, entries);
      expect(result.status).toBe('yellow');
    });

    it('retorna red quando muito abaixo do ritmo', () => {
      // Week 5: expected = 26/13 * 5 = 10, need >= 10*0.7=7 for yellow
      const entries = [
        makeEntry(5, { metricId: 'metric-1', count: 2 }),
      ];
      const result = calculateMetricStatus(metric, entries);
      expect(result.status).toBe('red');
    });
  });

  describe('PERCENTAGE_AVERAGE', () => {
    const metric = makeMetric({
      type: MetricType.PERCENTAGE_AVERAGE,
      targetValue: 80,
      inputs: [{ key: 'nps', label: 'NPS', type: 'number' }],
    });

    it('calcula média e retorna green', () => {
      const entries = [
        makeEntry(1, { metricId: 'metric-1', nps: 90 }),
        makeEntry(2, { metricId: 'metric-1', nps: 80 }),
      ];
      const result = calculateMetricStatus(metric, entries);
      expect(result.value).toBe(85);
      expect(result.status).toBe('green');
    });

    it('calcula média e retorna red', () => {
      const entries = [
        makeEntry(1, { metricId: 'metric-1', nps: 50 }),
        makeEntry(2, { metricId: 'metric-1', nps: 60 }),
      ];
      const result = calculateMetricStatus(metric, entries);
      expect(result.value).toBe(55);
      expect(result.status).toBe('red');
    });
  });

  describe('MAX_LIMIT', () => {
    const metric = makeMetric({
      type: MetricType.MAX_LIMIT,
      targetValue: 5,
      unit: 'dias',
      inputs: [{ key: 'days', label: 'Dias', type: 'number' }],
    });

    it('retorna green quando abaixo do limite', () => {
      const entries = [
        makeEntry(1, { metricId: 'metric-1', days: 3 }),
      ];
      const result = calculateMetricStatus(metric, entries);
      expect(result.status).toBe('green');
    });

    it('retorna yellow quando ligeiramente acima (<=1.2x)', () => {
      const entries = [
        makeEntry(1, { metricId: 'metric-1', days: 5.5 }),
      ];
      const result = calculateMetricStatus(metric, entries);
      expect(result.status).toBe('yellow');
    });

    it('retorna red quando muito acima (>1.2x)', () => {
      const entries = [
        makeEntry(1, { metricId: 'metric-1', days: 8 }),
      ];
      const result = calculateMetricStatus(metric, entries);
      expect(result.status).toBe('red');
    });
  });

  it('ignora entries de outros metricIds', () => {
    const metric = makeMetric({ type: MetricType.PERCENTAGE_CUMULATIVE, id: 'metric-1' });
    const entries = [
      makeEntry(1, { metricId: 'metric-2', total: 100, success: 90 }),
    ];
    const result = calculateMetricStatus(metric, entries);
    expect(result).toEqual({ value: 0, status: 'gray' });
  });
});

// ─── getStatusColor ─────────────────────────────────────────────────────────

describe('getStatusColor', () => {
  it('retorna bg-emerald-500 para green', () => {
    expect(getStatusColor('green')).toBe('bg-emerald-500');
  });

  it('retorna bg-amber-400 para yellow', () => {
    expect(getStatusColor('yellow')).toBe('bg-amber-400');
  });

  it('retorna bg-rose-500 para red', () => {
    expect(getStatusColor('red')).toBe('bg-rose-500');
  });

  it('retorna bg-slate-200 para gray (default)', () => {
    expect(getStatusColor('gray')).toBe('bg-slate-200');
  });

  it('retorna bg-slate-200 para status desconhecido', () => {
    expect(getStatusColor('unknown')).toBe('bg-slate-200');
    expect(getStatusColor('')).toBe('bg-slate-200');
  });
});

// ─── getWeeklyHighlights ────────────────────────────────────────────────────

describe('getWeeklyHighlights', () => {
  const metricA = makeMetric({
    id: 'met-a',
    type: MetricType.PERCENTAGE_CUMULATIVE,
    targetValue: 80,
  });
  const metricB = makeMetric({
    id: 'met-b',
    type: MetricType.SUM_TARGET,
    targetValue: 26,
    inputs: [{ key: 'count', label: 'Count', type: 'number' }],
  });

  const user1 = makeUser('u1', [metricA, metricB]);
  const user2 = makeUser('u2', [metricA, metricB]);
  const user3 = makeUser('u3', [metricA, metricB]);

  it('retorna array vazio quando sem entries', () => {
    const result = getWeeklyHighlights([user1, user2], {}, 2);
    expect(result).toHaveLength(2);
    // All should have score 0 (gray)
    result.forEach(r => {
      expect(r.score).toBe(0);
      r.statuses.forEach(s => expect(s.status).toBe('gray'));
    });
  });

  it('retorna vazio com array de users vazio', () => {
    const result = getWeeklyHighlights([], {}, 2);
    expect(result).toHaveLength(0);
  });

  it('ordena por score descendente', () => {
    const entries: Record<string, WeeklyData[]> = {
      u1: [
        makeEntry(1, { metricId: 'met-a', total: 100, success: 90 }),
        makeEntry(1, { metricId: 'met-b', count: 3 }),
      ],
      u2: [
        makeEntry(1, { metricId: 'met-a', total: 100, success: 50 }),
        makeEntry(1, { metricId: 'met-b', count: 1 }),
      ],
      u3: [
        makeEntry(1, { metricId: 'met-a', total: 100, success: 85 }),
        makeEntry(1, { metricId: 'met-b', count: 2 }),
      ],
    };

    const result = getWeeklyHighlights([user1, user2, user3], entries, 2);
    expect(result).toHaveLength(2);
    // u1 should be first (highest score), then u3
    expect(result[0].user.id).toBe('u1');
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
  });

  it('respeita topN', () => {
    const entries: Record<string, WeeklyData[]> = {
      u1: [makeEntry(1, { metricId: 'met-a', total: 100, success: 90 })],
      u2: [makeEntry(1, { metricId: 'met-a', total: 100, success: 80 })],
      u3: [makeEntry(1, { metricId: 'met-a', total: 100, success: 70 })],
    };

    const result1 = getWeeklyHighlights([user1, user2, user3], entries, 1);
    expect(result1).toHaveLength(1);

    const result3 = getWeeklyHighlights([user1, user2, user3], entries, 3);
    expect(result3).toHaveLength(3);
  });

  it('desempata por primaryValue (primeira métrica)', () => {
    // Both users will get the same score, but u2 has higher primary value
    const metricOnly = makeMetric({
      id: 'met-single',
      type: MetricType.PERCENTAGE_CUMULATIVE,
      targetValue: 80,
    });
    const userA = makeUser('uA', [metricOnly]);
    const userB = makeUser('uB', [metricOnly]);

    const entries: Record<string, WeeklyData[]> = {
      uA: [makeEntry(1, { metricId: 'met-single', total: 100, success: 85 })],
      uB: [makeEntry(1, { metricId: 'met-single', total: 100, success: 90 })],
    };

    const result = getWeeklyHighlights([userA, userB], entries, 2);
    // Both green (score=3), but uB has higher primary value (90 > 85)
    expect(result[0].user.id).toBe('uB');
    expect(result[1].user.id).toBe('uA');
  });

  it('default topN é 2', () => {
    const result = getWeeklyHighlights([user1, user2, user3], {});
    expect(result).toHaveLength(2);
  });

  it('trata user sem métricas (primaryValue fallback)', () => {
    const userNoMetrics = makeUser('uNone', []);
    const result = getWeeklyHighlights([userNoMetrics], {}, 1);
    expect(result).toHaveLength(1);
    expect(result[0].primaryValue).toBe(0);
    expect(result[0].statuses).toHaveLength(0);
  });
});
