import React from 'react';
import { Box, Button, TextField } from '@mui/material';
import { format } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers';

interface Props {
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  applyMonth: (m: string) => void;
  monthInputError?: string | null;
  setMonthInputError: (e: string | null) => void;
  selectedDay: string;
  setSelectedDay: (d: string) => void;
  applyDay: (d: string) => void;
  dayInputError?: string | null;
  setDayInputError: (e: string | null) => void;
}

export const MonthDayFilter: React.FC<Props> = ({
  selectedMonth,
  setSelectedMonth,
  applyMonth,
  selectedDay,
  setSelectedDay,
  applyDay,
  dayInputError,
  setDayInputError,
}) => {

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
    <Box display="flex" gap={1} alignItems="center">
      <DatePicker
        views={['year', 'month']}
        label="Mes"
        value={parseMonthToDate(selectedMonth)}
        onChange={(e) => {
          const formatted = formatDateToMonth(e)
          if (formatted) setSelectedMonth(formatted);
        }}
        openTo="month"
        slotProps={{
            textField: {
              size: 'small',
              sx: { minWidth: 200 },
            },
          }}
      />

      <TextField
        label="Día"
        type="date"
        value={selectedDay}
        onChange={(e) => {
          setSelectedDay(e.target.value);
          if (dayInputError) setDayInputError(null);
        }}
        size="small"
        InputLabelProps={{ shrink: true }}
        error={!!dayInputError}
        helperText={dayInputError || undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            applyDay(selectedDay);
          }
        }}
      />

      <Button size="small" onClick={() => applyMonth(selectedMonth)}>
        Buscar
      </Button>
      <Button size="small" onClick={() => applyDay(selectedDay)}>
        Buscar día
      </Button>
      <Button size="small" onClick={() => {
        const current = format(new Date(), 'yyyy-MM');
        setSelectedMonth(current);
        applyMonth(current);
      }}>
        Mes actual
      </Button>
    </Box>
  );
};

export default MonthDayFilter;
