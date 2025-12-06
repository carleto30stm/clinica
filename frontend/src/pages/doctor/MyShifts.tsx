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
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { shiftApi } from '../../api/shifts';
import { Shift } from '../../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export const MyShifts: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const now = new Date();
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      
      const data = await shiftApi.getMyShifts({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      setShifts(data);
    } catch (err) {
      setError('Error al cargar los turnos');
    } finally {
      setLoading(false);
    }
  };

  const totalHours = shifts.reduce((acc, shift) => {
    const start = new Date(shift.startDateTime);
    const end = new Date(shift.endDateTime);
    return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Mis Turnos - {format(new Date(), 'MMMM yyyy', { locale: es })}
      </Typography>

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
                Total de Turnos
              </Typography>
              <Typography variant="h3">{shifts.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Horas este Mes
              </Typography>
              <Typography variant="h3">{Math.round(totalHours)}h</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Próximo Turno
              </Typography>
              <Typography variant="h6">
                {shifts.length > 0
                  ? format(new Date(shifts[0].startDateTime), "dd 'de' MMMM, HH:mm", { locale: es })
                  : 'Sin turnos programados'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Horario</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Notas</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((shift) => {
              const start = new Date(shift.startDateTime);
              const end = new Date(shift.endDateTime);
              const isWeekend = start.getDay() === 0 || start.getDay() === 6;

              return (
                <TableRow
                  key={shift.id}
                  sx={{ bgcolor: isWeekend ? 'error.50' : 'inherit' }}
                >
                  <TableCell>
                    <Typography fontWeight={isWeekend ? 'bold' : 'normal'}>
                      {format(start, "EEEE dd 'de' MMMM", { locale: es })}
                    </Typography>
                    {isWeekend && (
                      <Chip label="Fin de semana" size="small" color="error" sx={{ mt: 0.5 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={shift.type === 'FIXED' ? 'Fijo' : 'Rotativo'}
                      color={shift.type === 'FIXED' ? 'primary' : 'secondary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{shift.notes || '-'}</TableCell>
                </TableRow>
              );
            })}
            {shifts.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography color="text.secondary" py={4}>
                    No tienes turnos asignados este mes
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default MyShifts;
