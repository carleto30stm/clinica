import React from 'react';
import { Box, Button, TextField } from '@mui/material';
import { format } from 'date-fns';

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
  monthInputError,
  setMonthInputError,
  selectedDay,
  setSelectedDay,
  applyDay,
  dayInputError,
  setDayInputError,
}) => {
  return (
    <Box display="flex" gap={1} alignItems="center">
      <TextField
        label="Mes"
        type="month"
        value={selectedMonth}
        onChange={(e) => {
          setSelectedMonth(e.target.value);
          if (monthInputError) setMonthInputError(null);
        }}
        size="small"
        InputLabelProps={{ shrink: true }}
        error={!!monthInputError}
        helperText={monthInputError || undefined}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            applyMonth(selectedMonth);
          }
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
