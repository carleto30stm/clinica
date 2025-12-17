import { calculateShiftPaymentFromRates } from '../src/utils/paymentHelpers';

describe('calculateShiftPaymentFromRates - overnight normalization', () => {
  test('handles end <= start by normalizing to next day', () => {
    const rateMap = new Map();
    rateMap.set('WEEKEND_HOLIDAY_NIGHT', 10);
    rateMap.set('WEEKEND_HOLIDAY_DAY', 20);
    rateMap.set('WEEKDAY_NIGHT', 5);
    rateMap.set('WEEKDAY_DAY', 8);

    const start = new Date(2099, 0, 1, 21, 0, 0); // Jan 1, 2099 21:00
    const endSameDayEarly = new Date(2099, 0, 1, 9, 0, 0); // Jan 1, 2099 09:00 (buggy stored)

    const { totalAmount, breakdown } = calculateShiftPaymentFromRates(rateMap as any, start, endSameDayEarly, true);

    // Expected: normalized end -> Jan 2, 09:00 => 12 hours: 3 night (21-24) + 9 day (00-09)
    const expected = 3 * 10 + 9 * 20; // night rate 10, day rate 20
    expect(totalAmount).toBe(expected);

    const nightEntry = breakdown.find(b => b.type === 'WEEKEND_HOLIDAY_NIGHT');
    const dayEntry = breakdown.find(b => b.type === 'WEEKEND_HOLIDAY_DAY');
    expect(nightEntry).toBeDefined();
    expect(dayEntry).toBeDefined();
    expect(nightEntry!.hours).toBe(3);
    expect(dayEntry!.hours).toBe(9);
  });
});