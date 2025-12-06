import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  EventAvailable as AvailableIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { statsApi } from '../../api/stats';
import { MonthlyStats, DoctorHoursSummary } from '../../types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="text.secondary" gutterBottom variant="body2">
            {title}
          </Typography>
          <Typography variant="h4" component="div">
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            bgcolor: color,
            borderRadius: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await statsApi.getMonthlyStats();
      setStats(data);
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
        Dashboard - {monthNames[(stats?.month || 1) - 1]} {stats?.year}
      </Typography>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total de Turnos"
            value={stats?.totalShifts || 0}
            icon={<CalendarIcon sx={{ color: 'white' }} />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Turnos Asignados"
            value={stats?.assignedShifts || 0}
            icon={<PeopleIcon sx={{ color: 'white' }} />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Turnos Disponibles"
            value={stats?.availableShifts || 0}
            icon={<AvailableIcon sx={{ color: 'white' }} />}
            color="warning.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Horas Totales"
            value={stats?.totalHours || 0}
            icon={<TimeIcon sx={{ color: 'white' }} />}
            color="secondary.main"
          />
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom>
        Horas por Médico
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Médico</TableCell>
              <TableCell>Especialidad</TableCell>
              <TableCell align="center">Total Turnos</TableCell>
              <TableCell align="center">Turnos Fijos</TableCell>
              <TableCell align="center">Turnos Rotativos</TableCell>
              <TableCell align="center">Total Horas</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats?.doctorsSummary.map((doctor: DoctorHoursSummary) => (
              <TableRow key={doctor.doctorId}>
                <TableCell>{doctor.doctorName}</TableCell>
                <TableCell>
                  <Chip label={doctor.specialty || 'N/A'} size="small" />
                </TableCell>
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

export default AdminDashboard;
