const { calculateDCA, EARLIEST_DATE, validateStartDate } = require('./dca');

const samplePrices = [
  { date: '2024-01-01', close: 100 },
  { date: '2024-01-02', close: 200 },
  { date: '2024-01-03', close: 300 },
];

describe('calculateDCA', () => {
  describe('total invested', () => {
    test('multiplies daily amount by number of days', () => {
      const result = calculateDCA(samplePrices, '2024-01-01', 10);

      expect(result.totalInvested).toBe(30);
    });

    test('only counts days on or after the start date', () => {
      const result = calculateDCA(samplePrices, '2024-01-02', 25);

      expect(result.totalInvested).toBe(50);
    });
  });

  describe('average buy price', () => {
    test('equals total invested divided by total BTC', () => {
      const result = calculateDCA(samplePrices, '2024-01-01', 10);

      const expectedBtc = 10 / 100 + 10 / 200 + 10 / 300;
      const expectedAverage = 30 / expectedBtc;

      expect(result.totalBtc).toBeCloseTo(expectedBtc);
      expect(result.averageBuyPrice).toBeCloseTo(expectedAverage);
    });

    test('weights cheaper days more when buying equal USD amounts', () => {
      const result = calculateDCA(samplePrices, '2024-01-01', 10);

      // More BTC is bought on cheaper days, so the average buy price sits below the simple mean.
      expect(result.averageBuyPrice).toBeLessThan(200);
      expect(result.averageBuyPrice).toBeGreaterThan(100);
    });
  });

  describe('date validation', () => {
    test('rejects start dates before the earliest allowed date', () => {
      const result = validateStartDate('2011-12-31', '2024-01-03');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('2012');
    });

    test('accepts the earliest allowed date', () => {
      const result = validateStartDate(EARLIEST_DATE, '2024-01-03');

      expect(result.valid).toBe(true);
    });

    test('rejects start dates after the latest available data', () => {
      const result = validateStartDate('2025-01-01', '2024-01-03');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('2024-01-03');
    });

    test('returns no results for dates before the earliest allowed date', () => {
      const result = calculateDCA(samplePrices, '2011-06-01', 10);

      expect(result.totalInvested).toBe(0);
      expect(result.chartData).toEqual([]);
    });
  });

  describe('zero amounts', () => {
    test('returns zeros when daily amount is zero', () => {
      const result = calculateDCA(samplePrices, '2024-01-01', 0);

      expect(result.totalInvested).toBe(0);
      expect(result.totalBtc).toBe(0);
      expect(result.averageBuyPrice).toBe(0);
      expect(result.currentValue).toBe(0);
      expect(result.profitLoss).toBe(0);
      expect(result.chartData).toEqual([]);
    });

    test('returns zeros when daily amount is negative', () => {
      const result = calculateDCA(samplePrices, '2024-01-01', -10);

      expect(result.totalInvested).toBe(0);
      expect(result.totalBtc).toBe(0);
    });

    test('returns zeros when start date is after all available data', () => {
      const result = calculateDCA(samplePrices, '2025-01-01', 10);

      expect(result.totalInvested).toBe(0);
      expect(result.totalBtc).toBe(0);
      expect(result.chartData).toEqual([]);
    });
  });
});
