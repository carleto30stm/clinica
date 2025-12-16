import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

/**
 * Get all discounts
 */
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const discounts = await prisma.discount.findMany({
      orderBy: { validFrom: 'desc' },
    });

    res.json({ discounts });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active discount
 */
export const getActive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const discount = await prisma.discount.findFirst({
      where: { isActive: true },
      orderBy: { validFrom: 'desc' },
    });

    res.json({ discount });
  } catch (error) {
    next(error);
  }
};

/**
 * Create discount
 */
export const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { amount } = req.body;

    // Deactivate all previous discounts
    await prisma.discount.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    // Create new discount
    const discount = await prisma.discount.create({
      data: {
        amount,
        isActive: true,
        validFrom: new Date(),
      },
    });

    res.status(201).json({ discount });
  } catch (error) {
    next(error);
  }
};

/**
 * Update discount
 */
export const update = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, isActive } = req.body;

    // If activating this discount, deactivate others
    if (isActive) {
      await prisma.discount.updateMany({
        where: { 
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false },
      });
    }

    const discount = await prisma.discount.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({ discount });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete discount
 */
export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.discount.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export default {
  getAll,
  getActive,
  create,
  update,
  remove,
};
