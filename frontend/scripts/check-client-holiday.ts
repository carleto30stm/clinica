import { calculateShiftPayment } from '../src/utils/helpers';
import { parseArgentinaDate } from '../src/utils/dateHelpers';

const pad = (n: number) => String(n).padStart(2, '0');

(async () => {
  // Mock rates
  const rates = [
    { periodType: 'WEEKDAY_DAY', rate: 100 },
    { periodType: 'WEEKDAY_NIGHT', rate: 80 },
    { periodType: 'WEEKEND_HOLIDAY_DAY', rate: 150 },
    { periodType: 'WEEKEND_HOLIDAY_NIGHT', rate: 120 },
  ];

  const holidayDate = '2025-01-25';
  const d = parseArgentinaDate(holidayDate);
  const holidaySet = new Set<string>([`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`]);
  const recurringSet = new Set<string>();

  console.log('Holiday set:', holidaySet);

  const start = new Date(2025, 0, 25, 21, 0, 0);
  const end = new Date(2025, 0, 26, 9, 0, 0);

  const res = calculateShiftPayment(start.toISOString(), end.toISOString(), 'WEEKDAY', rates, holidaySet, recurringSet);
  console.log(JSON.stringify(res, null, 2));
})();