import api from './client';

export const printApi = {
  getSchedulePdf: async (year?: number, month?: number) => {
    const response = await api.get('/print/schedule', {
      params: { year, month },
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  getPayrollPdf: async (year?: number, month?: number) => {
    const response = await api.get('/print/payroll', {
      params: { year, month },
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};

export default printApi;
