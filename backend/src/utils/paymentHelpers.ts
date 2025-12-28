import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { RatePeriodType } from '../types';

export const calculateShiftPaymentFromRates = (
  rateMap: Map<RatePeriodType, number>,
  startDateTime: Date,
  endDateTime: Date,
  // Backwards-compatible boolean flag: if holidaySets are not provided, fall back to this
  isHolidayOrWeekend: boolean,
  holidaySet?: Set<string>, // e.g. 'YYYY-MM-DD'
  recurringSet?: Set<string> // e.g. 'MM-DD'
): { totalAmount: number; breakdown: Array<{ type: string; hours: number; rate: number; amount: number }> } => {
  const breakdown: Array<{ type: string; hours: number; rate: number; amount: number }> = [];
  let totalAmount = 0;

  const DAY_START = 9;
  const DAY_END = 21;

  const current = new Date(startDateTime);
  let end = new Date(endDateTime);

  // If end is not after start (bad data), normalize it by advancing days until it's after start
  if (end.getTime() <= current.getTime()) {
    // avoid importing dateHelpers here to prevent circular deps; do quick normalization
    while (end.getTime() <= current.getTime()) {
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  const pad = (n: number) => String(n).padStart(2, '0');

  // Determine if the ENTIRE shift is holiday/weekend.
  // Priority: respect the caller-provided `isHolidayOrWeekend` flag (from payload).
  // Only if the caller did NOT mark the shift as holiday/weekend, fall back
  // to checking the provided holiday sets based on the shift start date.
  let isShiftHolidayOrWeekend = isHolidayOrWeekend;
  if (!isShiftHolidayOrWeekend && (holidaySet || recurringSet)) {
    const y = startDateTime.getFullYear();
    const m = pad(startDateTime.getMonth() + 1);
    const d = pad(startDateTime.getDate());
    const dateKey = `${y}-${m}-${d}`;
    const monthDayKey = `${m}-${d}`;

    const isRecurrentHoliday = recurringSet ? recurringSet.has(monthDayKey) : false;
    const isSpecificHoliday = holidaySet ? holidaySet.has(dateKey) : false;
    const isWeekend = startDateTime.getDay() === 0 || startDateTime.getDay() === 6;
    isShiftHolidayOrWeekend = isSpecificHoliday || isRecurrentHoliday || isWeekend;
  }

  while (current < end) {
    const hour = current.getHours();
    const isDay = hour >= DAY_START && hour < DAY_END;

    // ---------------------------------------------------------------------------
    // COMMENTED: Per-hour holiday/weekend discrimination logic
    // This logic was replaced by using only the shift's start date to determine
    // if the entire shift is holiday/weekend. Kept for reference.
    // ---------------------------------------------------------------------------
    // let isHourHolidayOrWeekend = false;
    //
    // if (holidaySet || recurringSet) {
    //   const y = current.getFullYear();
    //   const m = pad(current.getMonth() + 1);
    //   const d = pad(current.getDate());
    //   const dateKey = `${y}-${m}-${d}`;
    //   const monthDayKey = `${m}-${d}`;
    //
    //   const isRecurrentHoliday = recurringSet ? recurringSet.has(monthDayKey) : false;
    //   const isSpecificHoliday = holidaySet ? holidaySet.has(dateKey) : false;
    //   const isWeekend = current.getDay() === 0 || current.getDay() === 6;
    //   isHourHolidayOrWeekend = isSpecificHoliday || isRecurrentHoliday || isWeekend;
    // } else {
    //   // Fallback to caller-provided boolean
    //   isHourHolidayOrWeekend = isHolidayOrWeekend;
    // }
    // ---------------------------------------------------------------------------

    // Use the shift-level determination (based on start date only)
    const isHourHolidayOrWeekend = isShiftHolidayOrWeekend;

    let periodType: RatePeriodType;
    if (isHourHolidayOrWeekend) {
      periodType = isDay ? 'WEEKEND_HOLIDAY_DAY' : 'WEEKEND_HOLIDAY_NIGHT';
    } else {
      periodType = isDay ? 'WEEKDAY_DAY' : 'WEEKDAY_NIGHT';
    }

    const rate = rateMap.get(periodType) || 0;

    let entry = breakdown.find((b) => b.type === periodType);
    if (!entry) {
      entry = { type: periodType, hours: 0, rate, amount: 0 };
      breakdown.push(entry);
    }

    entry.hours += 1;
    entry.amount = entry.hours * rate;
    totalAmount += rate;

    current.setHours(current.getHours() + 1);
  }

  return { totalAmount, breakdown };
};

export const calculateShiftPayment = async (
  startDateTime: Date,
  endDateTime: Date,
  isHolidayOrWeekend: boolean
): Promise<{ totalAmount: number; breakdown: Array<{ type: string; hours: number; rate: number; amount: number }> }> => {
  const rates = await prisma.hourlyRate.findMany();
  const rateMap = new Map<RatePeriodType, number>();
  for (const r of rates) {
    rateMap.set(r.periodType as RatePeriodType, Number((r.rate as unknown) as number));
  }

  // Load holidays overlapping the shift range plus recurrent ones
  const holidays = await prisma.holiday.findMany({
    where: {
      OR: [
        { isRecurrent: true },
        { date: { gte: startDateTime, lte: endDateTime } },
      ],
    },
  });

  const holidaySet = new Set<string>();
  const recurringSet = new Set<string>();
  const pad = (n: number) => String(n).padStart(2, '0');

  holidays.forEach((h) => {
    const d = new Date(h.date);
    if (h.isRecurrent) {
      recurringSet.add(`${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    } else {
      holidaySet.add(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    }
  });

  return calculateShiftPaymentFromRates(rateMap, startDateTime, endDateTime, isHolidayOrWeekend, holidaySet, recurringSet);
};

export const buildRateMap = async (): Promise<Map<RatePeriodType, number>> => {
  const rates = await prisma.hourlyRate.findMany();
  const rateMap = new Map<RatePeriodType, number>();
  for (const r of rates) {
    rateMap.set(r.periodType as RatePeriodType, Number((r.rate as unknown) as number));
  }
  return rateMap;
};
