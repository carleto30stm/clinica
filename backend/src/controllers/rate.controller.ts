import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { UpdateHourlyRatesRequest, RatePeriodType } from '../types';
import { Decimal } from '@prisma/client/runtime/library';

// Default rates for initialization
const DEFAULT_RATES: Array<{ periodType: RatePeriodType; rate: number }> = [
  { periodType: 'WEEKDAY_DAY', rate: 1000 },
  { periodType: 'WEEKDAY_NIGHT', rate: 1500 },
  { periodType: 'WEEKEND_HOLIDAY_DAY', rate: 1500 },
  { periodType: 'WEEKEND_HOLIDAY_NIGHT', rate: 2000 },
];

/**
 * Get all hourly rates
 */
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let rates = await prisma.hourlyRate.findMany({
      orderBy: { periodType: 'asc' },
    });

    // If no rates exist, create defaults
    if (rates.length === 0) {
      await prisma.hourlyRate.createMany({
        data: DEFAULT_RATES.map((r) => ({
          periodType: r.periodType,
          rate: new Decimal(r.rate),
        })),
      });
      rates = await prisma.hourlyRate.findMany({
        orderBy: { periodType: 'asc' },
      });
    }

    // Convert Decimal to number for JSON response
    const formattedRates = rates.map((r) => ({
      ...r,
      rate: Number(r.rate),
    }));

    res.json({ rates: formattedRates });
  } catch (error) {
    next(error);
  }
};

/**
 * Update hourly rates (admin only)
 */
export const update = async (
  req: Request<object, object, UpdateHourlyRatesRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rates } = req.body;

    // Validate all period types are valid
    const validTypes: RatePeriodType[] = [
      'WEEKDAY_DAY',
      'WEEKDAY_NIGHT',
      'WEEKEND_HOLIDAY_DAY',
      'WEEKEND_HOLIDAY_NIGHT',
    ];

    for (const rate of rates) {
      if (!validTypes.includes(rate.periodType)) {
        res.status(400).json({ error: `Tipo de período inválido: ${rate.periodType}` });
        return;
      }
      if (rate.rate < 0) {
        res.status(400).json({ error: 'El valor de la tarifa no puede ser negativo' });
        return;
      }
    }

    // Upsert all rates in a transaction
    const updatedRates = await prisma.$transaction(
      rates.map((rate) =>
        prisma.hourlyRate.upsert({
          where: { periodType: rate.periodType },
          update: { rate: new Decimal(rate.rate) },
          create: {
            periodType: rate.periodType,
            rate: new Decimal(rate.rate),
          },
        })
      )
    );

    // Convert Decimal to number for JSON response
    const formattedRates = updatedRates.map((r) => ({
      ...r,
      rate: Number(r.rate),
    }));

    res.json({ 
      rates: formattedRates,
      message: 'Tarifas actualizadas correctamente' 
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate estimated payment for a shift based on hourly rates
 * This is a utility function that can be used by other controllers
 */
export { calculateShiftPayment, calculateShiftPaymentFromRates, buildRateMap } from '../utils/paymentHelpers';
