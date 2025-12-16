import { buildRateMap, calculateShiftPaymentFromRates } from '../src/utils/paymentHelpers';

const pad = (n: number) => String(n).padStart(2, '0');

const run = async () => {
  const rateMap = await buildRateMap();

  // Holiday on 2025-01-25 (non-recurrent)
  const holidaySet = new Set<string>(['2025-01-25']);
  const recurringSet = new Set<string>();

  console.log('Test 1: Shift 2025-01-25 21:00 -> 2025-01-26 09:00 (holiday on start day)');
  {
    const start = new Date(2025, 0, 25, 21, 0, 0);
    const end = new Date(2025, 0, 26, 9, 0, 0);
    const res = calculateShiftPaymentFromRates(rateMap, start, end, true, holidaySet, recurringSet);
    console.log(JSON.stringify(res, null, 2));
  }

  console.log('\nTest 2: Shift 2025-01-25 21:00 -> 2025-01-26 09:00 (holiday on end day 26)');
  {
    const holidaySet2 = new Set<string>(['2025-01-26']);
    const start = new Date(2025, 0, 25, 21, 0, 0);
    const end = new Date(2025, 0, 26, 9, 0, 0);
    const res = calculateShiftPaymentFromRates(rateMap, start, end, false, holidaySet2, recurringSet);
    console.log(JSON.stringify(res, null, 2));
  }

  console.log('\nTest 3: Recurrent holiday on 01-01 (New Year) - Shift crosses midnight');
  {
    const recurring = new Set<string>(['01-01']);
    const start = new Date(2025, 0, 1, 21, 0, 0);
    const end = new Date(2025, 0, 2, 9, 0, 0);
    const res = calculateShiftPaymentFromRates(rateMap, start, end, true, new Set(), recurring);
    console.log(JSON.stringify(res, null, 2));
  }

  console.log('\nTest 4: Weekday holiday on 2025-01-22 (Wed) - Shift 21:00 -> next day 09:00');
  {
    const holidaySet3 = new Set<string>(['2025-01-22']);
    const start = new Date(2025, 0, 22, 21, 0, 0);
    const end = new Date(2025, 0, 23, 9, 0, 0);
    const res = calculateShiftPaymentFromRates(rateMap, start, end, false, holidaySet3, new Set());
    console.log(JSON.stringify(res, null, 2));
  }
};

run().catch((e) => { console.error(e); process.exit(1); });
