import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../config/database';
import { RatePeriodType } from '../types';

export const calculateShiftPaymentFromRates = (
  rateMap: Map<RatePeriodType, number>,
  startDateTime: Date,
  endDateTime: Date,
  isHolidayOrWeekend: boolean
): { totalAmount: number; breakdown: Array<{ type: string; hours: number; rate: number; amount: number }> } => {
  const breakdown: Array<{ type: string; hours: number; rate: number; amount: number }> = [];
  let totalAmount = 0;

  const DAY_START = 9;
  const DAY_END = 21;

  const current = new Date(startDateTime);
  const end = new Date(endDateTime);

  while (current < end) {
    const hour = current.getHours();
    const isDay = hour >= DAY_START && hour < DAY_END;

    let periodType: RatePeriodType;
    if (isHolidayOrWeekend) {
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

  return calculateShiftPaymentFromRates(rateMap, startDateTime, endDateTime, isHolidayOrWeekend);
};

export const buildRateMap = async (): Promise<Map<RatePeriodType, number>> => {
  const rates = await prisma.hourlyRate.findMany();
  const rateMap = new Map<RatePeriodType, number>();
  for (const r of rates) {
    rateMap.set(r.periodType as RatePeriodType, Number((r.rate as unknown) as number));
  }
  return rateMap;
};
