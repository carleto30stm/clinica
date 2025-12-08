import React from 'react';
import {
  Paper,
  Typography,
  Box,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';

interface MiniChartProps {
  title: string;
  currentValue: number;
  previousValue: number;
  formatValue?: (value: number) => string;
  color?: string;
}

export const MiniChart: React.FC<MiniChartProps> = ({
  title,
  currentValue,
  previousValue,
  formatValue = (v) => v.toString(),
  color = 'primary.main',
}) => {
  const difference = currentValue - previousValue;
  const percentage = previousValue > 0 ? ((difference / previousValue) * 100) : 0;
  const isPositive = difference >= 0;

  const maxValue = Math.max(currentValue, previousValue);
  const currentProgress = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;
  const previousProgress = maxValue > 0 ? (previousValue / maxValue) * 100 : 0;

  return (
    <Paper sx={{ p: 2, height: '100%' }}>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        {title}
      </Typography>

      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="h6" color={color}>
          {formatValue(currentValue)}
        </Typography>
        <Box display="flex" alignItems="center" gap={0.5}>
          {isPositive ? (
            <TrendingUpIcon fontSize="small" color="success" />
          ) : (
            <TrendingDownIcon fontSize="small" color="error" />
          )}
          <Typography
            variant="body2"
            color={isPositive ? 'success.main' : 'error.main'}
          >
            {percentage > 0 ? '+' : ''}{percentage.toFixed(1)}%
          </Typography>
        </Box>
      </Box>

      <Box sx={{ position: 'relative', height: 8 }}>
        <LinearProgress
          variant="determinate"
          value={previousProgress}
          sx={{
            height: 8,
            borderRadius: 4,
            backgroundColor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              backgroundColor: 'grey.400',
              borderRadius: 4,
            },
          }}
        />
        <LinearProgress
          variant="determinate"
          value={currentProgress}
          sx={{
            height: 8,
            borderRadius: 4,
            position: 'absolute',
            top: 0,
            left: 0,
            '& .MuiLinearProgress-bar': {
              backgroundColor: color,
              borderRadius: 4,
            },
          }}
        />
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        vs mes anterior: {formatValue(previousValue)}
      </Typography>
    </Paper>
  );
};

interface MiniChartsProps {
  currentMonth: {
    totalShifts: number;
    assignedShifts: number;
    totalHours: number;
  };
  previousMonth: {
    totalShifts: number;
    assignedShifts: number;
    totalHours: number;
  };
}

export const MiniCharts: React.FC<MiniChartsProps> = ({ currentMonth, previousMonth }) => (
  <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={2} mt={3}>
    <MiniChart
      title="Total de Turnos"
      currentValue={currentMonth.totalShifts}
      previousValue={previousMonth.totalShifts}
      color="primary.main"
    />
    <MiniChart
      title="Turnos Asignados"
      currentValue={currentMonth.assignedShifts}
      previousValue={previousMonth.assignedShifts}
      color="success.main"
    />
    <MiniChart
      title="Horas Totales"
      currentValue={currentMonth.totalHours}
      previousValue={previousMonth.totalHours}
      formatValue={(v) => `${v}h`}
      color="secondary.main"
    />
  </Box>
);

export default MiniCharts;