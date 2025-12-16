import api from './client';
import { Discount, CreateDiscountData, UpdateDiscountData } from '../types';

export const discountsApi = {
  getAll: async () => {
    const response = await api.get('/discounts');
    return response.data.discounts as Discount[];
  },

  getActive: async () => {
    const response = await api.get('/discounts/active');
    return response.data.discount as Discount | null;
  },

  create: async (data: CreateDiscountData) => {
    const response = await api.post('/discounts', data);
    return response.data.discount as Discount;
  },

  update: async (id: string, data: UpdateDiscountData) => {
    const response = await api.patch(`/discounts/${id}`, data);
    return response.data.discount as Discount;
  },

  delete: async (id: string) => {
    await api.delete(`/discounts/${id}`);
  },
};

export default discountsApi;
