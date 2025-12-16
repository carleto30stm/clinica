import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Home as HomeIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { statsApi } from '../../api/stats';
import { userApi } from '../../api/users';
import { MonthlyStats, DoctorOption } from '../../types';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import MetricsCards from '../../components/dashboard/MetricsCards';
import DoctorsSummaryTable from '../../components/dashboard/DoctorsSummaryTable';
import StatisticsCharts from '../../components/dashboard/StatisticsCharts';
import TrendAnalysis from '../../components/dashboard/TrendAnalysis';
import ExportData from '../../components/dashboard/ExportData';

export const Statistics: React.FC = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>('');
  const [doctorStats, setDoctorStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [currentDate]);

  useEffect(() => {
    if (selectedDoctor) {
      loadDoctorStats();
    }
  }, [selectedDoctor, currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const [statsData, doctorsData] = await Promise.all([
        statsApi.getMonthlyStats(year, month),
        userApi.getDoctors(),
      ]);
      setStats(statsData);
      setDoctors(doctorsData);
    } catch (err) {
      setError('Error al cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorStats = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const data = await statsApi.getDoctorHours(selectedDoctor, year, month);
      setDoctorStats(data);
    } catch (err) {
      setError('Error al cargar las estadísticas del médico');
    }
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          color="inherit"
          onClick={() => navigate('/admin/dashboard')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </Link>
        <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
          <BarChartIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Estadísticas
        </Typography>
      </Breadcrumbs>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Estadísticas</Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Ver detalle de médico</InputLabel>
            <Select
              value={selectedDoctor}
              label="Ver detalle de médico"
              onChange={(e) => setSelectedDoctor(e.target.value)}
            >
              <MenuItem value="">Ninguno</MenuItem>
              {doctors.map((doctor) => (
                <MenuItem key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box display="flex" alignItems="center">
            <IconButton onClick={handlePrevMonth}>
              <PrevIcon />
            </IconButton>
            <Typography variant="h6" sx={{ mx: 2, minWidth: 180, textAlign: 'center' }}>
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </Typography>
            <IconButton onClick={handleNextMonth}>
              <NextIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <MetricsCards stats={stats} loading={loading} />

      <StatisticsCharts stats={stats} loading={loading} />

      <TrendAnalysis currentStats={stats} />

      {/* Doctor detail */}
      {selectedDoctor && doctorStats && (
        <Paper sx={{ p: 3, mb: 3, mt: 3 }}>
          <Typography variant="h5" gutterBottom>
            Detalle: {doctorStats.doctor.name}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography color="text.secondary">Total Horas</Typography>
              <Typography variant="h5">{doctorStats.summary.totalHours}h</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography color="text.secondary">Horas Fijas</Typography>
              <Typography variant="h5">{doctorStats.summary.fixedHours}h</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography color="text.secondary">Horas Rotativas</Typography>
              <Typography variant="h5">{doctorStats.summary.rotatingHours}h</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography color="text.secondary">Horas Fin de Semana</Typography>
              <Typography variant="h5" color="error.main">{doctorStats.summary.weekendHours}h</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography color="text.secondary">Pago Estimado</Typography>
              <Typography variant="h5">
                {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(doctorStats.totalPayment || 0)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* All doctors summary */}
      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>Resumen por Médico</Typography>
      <DoctorsSummaryTable
        stats={stats}
        onDoctorClick={setSelectedDoctor}
        clickable={true}
      />

      <ExportData stats={stats} />
    </Box>
  );
};

export default Statistics;
