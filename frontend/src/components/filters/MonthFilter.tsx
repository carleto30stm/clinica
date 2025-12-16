import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';

interface MonthFilterProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onApply: () => void;
}

export const MonthFilter: React.FC<MonthFilterProps> = ({
  selectedMonth,
  onMonthChange,
  onApply,
}) => {
  const formatMonthDisplay = (monthStr: string): string => {
    try {
      const [year, month] = monthStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    } catch {
      return monthStr;
    }
  };

  const parseMonthToDate = (monthStr: string): Date | null => {
    try {
      const [year, month] = monthStr.split('-');
      return new Date(parseInt(year), parseInt(month) - 1, 1);
    } catch {
      return null;
    }
  };

  const formatDateToMonth = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  return (
    <Box display="flex" gap={2} mb={3} alignItems="center">
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
        <DatePicker
          label="Mes"
          value={parseMonthToDate(selectedMonth)}
          onChange={(date) => {
            const formatted = formatDateToMonth(date);
            if (formatted) onMonthChange(formatted);
          }}
          views={['month', 'year']}
          openTo="month"
          slotProps={{
            textField: {
              size: 'small',
              sx: { minWidth: 200 },
            },
          }}
        />
      </LocalizationProvider>
      <Typography variant="body1" fontWeight="medium" color="text.secondary" sx={{ minWidth: 150 }}>
        {formatMonthDisplay(selectedMonth)}
      </Typography>
      <Button variant="contained" onClick={onApply}>
        Aplicar
      </Button>
    </Box>
  );
};

export default MonthFilter;
