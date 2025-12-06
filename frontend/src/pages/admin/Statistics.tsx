import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
} from '@mui/icons-material';
import { statsApi } from '../../api/stats';
import { userApi } from '../../api/users';
import { MonthlyStats, DoctorOption } from '../../types';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

export const Statistics: React.FC = () => {
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

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Turnos</Typography>
              <Typography variant="h4">{stats?.totalShifts || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Asignados</Typography>
              <Typography variant="h4" color="success.main">{stats?.assignedShifts || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Disponibles</Typography>
              <Typography variant="h4" color="warning.main">{stats?.availableShifts || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>Total Horas</Typography>
              <Typography variant="h4" color="primary.main">{stats?.totalHours || 0}h</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Doctor detail */}
      {selectedDoctor && doctorStats && (
        <Paper sx={{ p: 3, mb: 3 }}>
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
          </Grid>
        </Paper>
      )}

      {/* All doctors summary */}
      <Typography variant="h5" gutterBottom>Resumen por Médico</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Médico</TableCell>
              <TableCell>Especialidad</TableCell>
              <TableCell align="center">Turnos</TableCell>
              <TableCell align="center">Fijos</TableCell>
              <TableCell align="center">Rotativos</TableCell>
              <TableCell align="center">Total Horas</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats?.doctorsSummary.map((doctor) => (
              <TableRow
                key={doctor.doctorId}
                hover
                onClick={() => setSelectedDoctor(doctor.doctorId)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>{doctor.doctorName}</TableCell>
                <TableCell>{doctor.specialty || '-'}</TableCell>
                <TableCell align="center">{doctor.shiftCount}</TableCell>
                <TableCell align="center">{doctor.fixedShifts}</TableCell>
                <TableCell align="center">{doctor.rotatingShifts}</TableCell>
                <TableCell align="center">
                  <Typography fontWeight="bold">{doctor.totalHours}h</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Statistics;
