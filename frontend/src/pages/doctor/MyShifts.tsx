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
  IconButton,
} from '@mui/material';
import { shiftApi } from '../../api/shifts';
import { Shift } from '../../types';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { ChevronLeft as PrevIcon, ChevronRight as NextIcon } from '@mui/icons-material';
import { es } from 'date-fns/locale';
import { useRates } from '../../hooks';
import { calculateShiftPayment } from '../../utils/helpers';
import MonthDayFilter from '../../components/filters/MonthDayFilter';
import { isValidMonth, isValidDateString } from '../../utils/validators';
import { formatMonthYear, formatCurrency } from '../../utils/formatters';

export const MyShifts: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: rates } = useRates();

  const ratesForCalc = rates || [];

  // Filtering pattern: selected vs applied
  const [selectedMonth, setSelectedMonth] = useState<string>(() => format(new Date(), 'yyyy-MM'));
  const [appliedMonth, setAppliedMonth] = useState<string>(() => format(new Date(), 'yyyy-MM'));
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [appliedDay, setAppliedDay] = useState<string | null>(null);
  const [monthInputError, setMonthInputError] = useState<string | null>(null);
  const [dayInputError, setDayInputError] = useState<string | null>(null);

  useEffect(() => {
    loadShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedMonth, appliedDay]);

  const handleApplyMonth = (m: string) => setAppliedMonth(m);
  const handleApplyDay = (d: string) => setAppliedDay(d || null);

  const handlePrevMonth = () => setSelectedMonth((prev) => {
    const [y, m] = prev.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const prevMonth = subMonths(d, 1);
    const val = format(prevMonth, 'yyyy-MM');
    setSelectedMonth(val);
    setAppliedMonth(val);
    return val;
  });

  const handleNextMonth = () => setSelectedMonth((prev) => {
    const [y, m] = prev.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const nextMonth = addMonths(d, 1);
    const val = format(nextMonth, 'yyyy-MM');
    setSelectedMonth(val);
    setAppliedMonth(val);
    return val;
  });

  const loadShifts = async () => {
    setLoading(true);
    setError('');
    try {
      if (!isValidMonth(appliedMonth)) {
        setError('Formato de mes inválido. Use YYYY-MM');
        setLoading(false);
        return;
      }

      let start: Date;
      let end: Date;
      if (appliedDay) {
        if (!isValidDateString(appliedDay)) {
          setError('Formato de día inválido. Use YYYY-MM-DD');
          setLoading(false);
          return;
        }
        const d = new Date(appliedDay);
        start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      } else {
        const [y, m] = appliedMonth.split('-').map(Number);
        start = startOfMonth(new Date(y, m - 1, 1));
        end = endOfMonth(new Date(y, m - 1, 1));
      }

      const data = await shiftApi.getMyShifts({ startDate: start.toISOString(), endDate: end.toISOString() });
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

  const totalPayment = shifts.reduce((acc, shift) => {
    try {
      const res = calculateShiftPayment(shift.startDateTime, shift.endDateTime, shift.dayCategory, ratesForCalc);
      return acc + (res.totalAmount || 0);
    } catch (e) {
      return acc;
    }
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
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography variant="h4" gutterBottom>
          Mis Turnos
        </Typography>
        <Box display="flex" alignItems="center" ml="auto" gap={1}>
          <IconButton size="small" onClick={handlePrevMonth}><PrevIcon /></IconButton>
          <Box sx={{ minWidth: 160, textAlign: 'center' }}>{formatMonthYear(appliedMonth + '-01')}</Box>
          <IconButton size="small" onClick={handleNextMonth}><NextIcon /></IconButton>
          <MonthDayFilter
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            applyMonth={handleApplyMonth}
            monthInputError={monthInputError}
            setMonthInputError={setMonthInputError}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            applyDay={handleApplyDay}
            dayInputError={dayInputError}
            setDayInputError={setDayInputError}
          />
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
              <Typography color="text.secondary" gutterBottom>
                Total de Turnos
              </Typography>
              <Typography variant="h3">{shifts.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Horas este Mes
              </Typography>
              <Typography variant="h3">{Math.round(totalHours)}h</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
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
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Pago estimado — {formatMonthYear(appliedMonth + '-01')}
              </Typography>
              <Typography variant="h3">
                {formatCurrency(totalPayment)}
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
                  <TableCell>
                    {(() => {
                      try {
                        const res = calculateShiftPayment(shift.startDateTime, shift.endDateTime, shift.dayCategory, ratesForCalc);
                        const breakdownStr = res.breakdown.map(b => `${b.type.replace(/_/g, ' ')}: ${b.hours}h x ${formatCurrency(b.rate)} = ${formatCurrency(b.amount)}`).join(' • ');
                        return (
                          <Box>
                            <Typography>{`${Math.round(res.totalHours)}h — ${formatCurrency(res.totalAmount)}`}</Typography>
                            <Typography variant="caption" color="text.secondary">{breakdownStr}</Typography>
                          </Box>
                        );
                      } catch (e) {
                        return '-';
                      }
                    })()}
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
