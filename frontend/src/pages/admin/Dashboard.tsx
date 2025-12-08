import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  BarChart as BarChartIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { statsApi } from '../../api/stats';
import { MonthlyStats } from '../../types';
import MetricsCards from '../../components/dashboard/MetricsCards';
import DoctorsSummaryTable from '../../components/dashboard/DoctorsSummaryTable';
import MiniCharts from '../../components/dashboard/MiniCharts';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentStats, setCurrentStats] = useState<MonthlyStats | null>(null);
  const [previousStats, setPreviousStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Cargar estadísticas del mes actual y anterior
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousYear = previousDate.getFullYear();
      const previousMonth = previousDate.getMonth() + 1;

      const [currentData, previousData] = await Promise.all([
        statsApi.getMonthlyStats(currentYear, currentMonth),
        statsApi.getMonthlyStats(previousYear, previousMonth),
      ]);

      setCurrentStats(currentData);
      setPreviousStats(previousData);
    } catch (err) {
      setError('Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard - {monthNames[(currentStats?.month || 1) - 1]} {currentStats?.year}
      </Typography>

      <MetricsCards stats={currentStats} loading={loading} />

      {/* Mini charts for trends */}
      {currentStats && previousStats && (
        <MiniCharts
          currentMonth={{
            totalShifts: currentStats.totalShifts,
            assignedShifts: currentStats.assignedShifts,
            totalHours: currentStats.totalHours,
          }}
          previousMonth={{
            totalShifts: previousStats.totalShifts,
            assignedShifts: previousStats.assignedShifts,
            totalHours: previousStats.totalHours,
          }}
        />
      )}

      <Paper sx={{ mt: 4, p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Accesos Rápidos
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box display="flex" gap={2} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<BarChartIcon />}
            endIcon={<NavigateNextIcon />}
            onClick={() => navigate('/admin/stats')}
          >
            Ver Análisis Detallado
          </Button>
        </Box>
      </Paper>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Horas por Médico
      </Typography>
      <DoctorsSummaryTable stats={currentStats} />
    </Box>
  );
};

export default AdminDashboard;
