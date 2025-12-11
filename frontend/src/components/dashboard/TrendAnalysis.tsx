import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Box, Paper, Typography, Button, ButtonGroup } from '@mui/material';
import { statsApi } from '../../api/stats';
import { MonthlyStats } from '../../types';
import { subMonths, format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TrendAnalysisProps {
  currentStats: MonthlyStats | null;
}

type TrendPeriod = '3months' | '6months' | '12months';

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ currentStats }) => {
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>('6months');

  useEffect(() => {
    if (currentStats) {
      loadTrendData();
    }
  }, [currentStats, selectedPeriod]);

  const loadTrendData = async () => {
    if (!currentStats) return;

    setLoading(true);
    try {
      const months = selectedPeriod === '3months' ? 3 : selectedPeriod === '6months' ? 6 : 12;
      const dataPoints = [];

      for (let i = months - 1; i >= 0; i--) {
        const targetDate = subMonths(new Date(currentStats.year, currentStats.month - 1), i);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1;

        try {
          const stats = await statsApi.getMonthlyStats(year, month);
          dataPoints.push({
            month: format(targetDate, 'MMM yyyy', { locale: es }),
            year,
            monthNumber: month,
            totalShifts: stats.totalShifts,
            assignedShifts: stats.assignedShifts,
            totalHours: stats.totalHours,
            occupancyRate: stats.totalShifts > 0 ? (stats.assignedShifts / stats.totalShifts) * 100 : 0,
          });
        } catch (error) {
          // Si no hay datos para ese mes, continuar
          dataPoints.push({
            month: format(targetDate, 'MMM yyyy', { locale: es }),
            year,
            monthNumber: month,
            totalShifts: 0,
            assignedShifts: 0,
            totalHours: 0,
            occupancyRate: 0,
          });
        }
      }

      setTrendData(dataPoints);
    } catch (error) {
      console.error('Error loading trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.dataKey === 'occupancyRate' ? '%' : entry.dataKey === 'totalHours' ? 'h' : ''}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Análisis de Tendencias
        </Typography>
        <ButtonGroup size="small">
          <Button
            variant={selectedPeriod === '3months' ? 'contained' : 'outlined'}
            onClick={() => setSelectedPeriod('3months')}
          >
            3 meses
          </Button>
          <Button
            variant={selectedPeriod === '6months' ? 'contained' : 'outlined'}
            onClick={() => setSelectedPeriod('6months')}
          >
            6 meses
          </Button>
          <Button
            variant={selectedPeriod === '12months' ? 'contained' : 'outlined'}
            onClick={() => setSelectedPeriod('12months')}
          >
            12 meses
          </Button>
        </ButtonGroup>
      </Box>

      {loading ? (
        <Typography>Cargando tendencias...</Typography>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" orientation="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="totalHours"
              stroke="#8884d8"
              name="Horas Totales"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="occupancyRate"
              stroke="#82ca9d"
              name="Tasa Ocupación (%)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Paper>
  );
};

export default TrendAnalysis;