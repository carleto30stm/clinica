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
  Chip,
  IconButton,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
} from '@mui/icons-material';
import { statsApi } from '../../api/stats';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

interface WeekendData {
  weekKey: string;
  shifts: unknown[];
  totalShifts: number;
  assignedShifts: number;
}

interface WeekendResponse {
  month: number;
  year: number;
  weekends: WeekendData[];
  totalWeekendShifts: number;
  assignedWeekendShifts: number;
}

export const WeekendView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [data, setData] = useState<WeekendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const response = await statsApi.getWeekendCoverage(year, month);
      setData(response);
    } catch (err) {
      setError('Error al cargar los datos de fines de semana');
    } finally {
      setLoading(false);
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

  const coveragePercentage = data
    ? Math.round((data.assignedWeekendShifts / data.totalWeekendShifts) * 100) || 0
    : 0;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Cobertura de Fines de Semana</Typography>
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Turnos Fin de Semana
              </Typography>
              <Typography variant="h3">{data?.totalWeekendShifts || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Turnos Asignados
              </Typography>
              <Typography variant="h3" color="success.main">
                {data?.assignedWeekendShifts || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Cobertura
              </Typography>
              <Typography
                variant="h3"
                color={coveragePercentage >= 80 ? 'success.main' : coveragePercentage >= 50 ? 'warning.main' : 'error.main'}
              >
                {coveragePercentage}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Semana</TableCell>
              <TableCell align="center">Total Turnos</TableCell>
              <TableCell align="center">Asignados</TableCell>
              <TableCell align="center">Cobertura</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.weekends.map((weekend) => {
              const weekCoverage = Math.round((weekend.assignedShifts / weekend.totalShifts) * 100) || 0;
              return (
                <TableRow key={weekend.weekKey}>
                  <TableCell>{weekend.weekKey}</TableCell>
                  <TableCell align="center">{weekend.totalShifts}</TableCell>
                  <TableCell align="center">{weekend.assignedShifts}</TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${weekCoverage}%`}
                      color={weekCoverage >= 80 ? 'success' : weekCoverage >= 50 ? 'warning' : 'error'}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default WeekendView;
