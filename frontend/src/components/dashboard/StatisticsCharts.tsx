import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { MonthlyStats } from '../../types';

interface StatisticsChartsProps {
  stats: MonthlyStats | null;
  loading: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const StatisticsCharts: React.FC<StatisticsChartsProps> = ({ stats, loading }) => {
  const theme = useTheme();

  if (loading || !stats) {
    return null;
  }

  // Datos para gráfico de barras: horas por doctor
  const doctorHoursData = stats.doctorsSummary.map((doctor) => ({
    name: doctor.doctorName.length > 10 ? `${doctor.doctorName.substring(0, 10)}...` : doctor.doctorName,
    hours: Math.round(doctor.totalHours * 100) / 100,
    specialty: doctor.specialty || 'Sin especialidad',
    fullName: doctor.doctorName,
  }));

  // Datos para gráfico de pie: distribución de tipos de turnos
  const shiftTypeData = [
    {
      name: 'Fijos',
      value: stats.doctorsSummary.reduce((acc, doc) => acc + doc.fixedShifts, 0),
      color: COLORS[0],
    },
    {
      name: 'Rotativos',
      value: stats.doctorsSummary.reduce((acc, doc) => acc + doc.rotatingShifts, 0),
      color: COLORS[1],
    },
  ];

  // Calcular métricas adicionales
  const occupancyRate = stats.totalShifts > 0 ? (stats.assignedShifts / stats.totalShifts) * 100 : 0;
  const avgHoursPerDoctor = stats.doctorsSummary.length > 0
    ? stats.doctorsSummary.reduce((acc, doc) => acc + doc.totalHours, 0) / stats.doctorsSummary.length
    : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Paper sx={{ p: 1 }}>
          <Typography variant="body2">{data.fullName || label}</Typography>
          <Typography variant="body2" color="primary">
            Horas: {payload[0].value}h
          </Typography>
          {data.specialty && (
            <Typography variant="caption" color="text.secondary">
              {data.specialty}
            </Typography>
          )}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box sx={{ mt: 4 }}>
      {/* Métricas adicionales */}
      <Box display="flex" gap={3} mb={3}>
        <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
          <Typography variant="h6" color="primary">
            {Math.round(occupancyRate)}%
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tasa de Ocupación
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
          <Typography variant="h6" color="secondary">
            {Math.round(avgHoursPerDoctor)}h
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Promedio por Doctor
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, textAlign: 'center' }}>
          <Typography variant="h6" color="success.main">
            {stats.availableShifts}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Turnos Disponibles
          </Typography>
        </Paper>
      </Box>

      {/* Gráfico de barras: Horas por doctor */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Distribución de Horas por Médico
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={doctorHoursData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis label={{ value: 'Horas', angle: -90, position: 'insideLeft' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="hours" fill={theme.palette.primary.main} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Gráfico de pie: Tipos de turnos */}
      <Box display="flex" gap={3}>
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            Distribución por Tipo de Turno
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={shiftTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {shiftTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>

        {/* Estadísticas de equidad */}
        <Paper sx={{ p: 3, flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            Análisis de Equidad
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Desviación Estándar de Horas:
            </Typography>
            <Typography variant="h5" color="warning.main">
              {stats.doctorsSummary.length > 1
                ? (() => {
                    const mean = avgHoursPerDoctor;
                    const variance = stats.doctorsSummary.reduce((acc, doc) =>
                      acc + Math.pow(doc.totalHours - mean, 2), 0
                    ) / stats.doctorsSummary.length;
                    return Math.round(Math.sqrt(variance) * 100) / 100;
                  })()
                : 0}h
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Menor valor = mayor equidad en distribución
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default StatisticsCharts;