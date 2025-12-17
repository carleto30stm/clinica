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
import { statsApi } from '../../api/stats';
import { Shift } from '../../types';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRates, useHolidays } from '../../hooks';
import { parseArgentinaDate } from '../../utils/dateHelpers';
import { calculateShiftPayment } from '../../utils/helpers';
import { MonthFilter } from '../../components/filters/MonthFilter';
import { isValidMonth } from '../../utils/validators';
import { formatMonthYear, formatCurrency } from '../../utils/formatters';
import { useAuthStore } from '../../store/authStore';

export const MyShifts: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { data: rates } = useRates();
  const { user } = useAuthStore();

  // Payment summary from backend (same calculation as Dashboard)
  const [paymentSummary, setPaymentSummary] = useState<{
    shiftsPayment: number;
    externalPayment: number;
    brutoPayment: number;
    hasDiscount: boolean;
    discountAmount: number;
    finalPayment: number;
    externalHours: number;
  } | null>(null);

  const ratesForCalc = rates || [];

  // Filtering pattern: selected vs applied
  const [selectedMonth, setSelectedMonth] = useState<string>(() => format(new Date(), 'yyyy-MM'));
  const [appliedMonth, setAppliedMonth] = useState<string>(() => format(new Date(), 'yyyy-MM'));

  // Get external hours for the same month
  const monthParts = appliedMonth.split('-');
  const year = parseInt(monthParts[0]);
  const month = parseInt(monthParts[1]);

  // Load holidays for this year so we can compute per-hour holiday rates on the client
  const { data: holidays = [] } = useHolidays({ year });
  const pad = (n: number) => String(n).padStart(2, '0');
  const holidaySet = new Set<string>();
  const recurringSet = new Set<string>();
  holidays.forEach((h) => {
    const d = parseArgentinaDate(h.date);
    if (h.isRecurrent) {
      recurringSet.add(`${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    } else {
      holidaySet.add(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    }
  });

  useEffect(() => {
    loadShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedMonth]);

  const handleApplyMonth = () => setAppliedMonth(selectedMonth);

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

      const [y, m] = appliedMonth.split('-').map(Number);
      const start = startOfMonth(new Date(y, m - 1, 1));
      const end = endOfMonth(new Date(y, m - 1, 1));

      // Load shifts and payment summary in parallel
      const [shiftsData, summaryData] = await Promise.all([
        shiftApi.getMyShifts({ startDate: start.toISOString(), endDate: end.toISOString() }),
        user?.id ? statsApi.getDoctorHours(user.id, y, m) : null,
      ]);

      setShifts(shiftsData);
      
      if (summaryData) {
        setPaymentSummary({
          shiftsPayment: summaryData.shiftsPayment || 0,
          externalPayment: summaryData.externalPayment || 0,
          brutoPayment: summaryData.brutoPayment || 0,
          hasDiscount: summaryData.hasDiscount || false,
          discountAmount: summaryData.discountAmount || 0,
          finalPayment: summaryData.finalPayment || 0,
          externalHours: summaryData.summary?.externalHours || 0,
        });
      }
    } catch (err) {
      setError('Error al cargar los turnos');
    } finally {
      setLoading(false);
    }
  };

  // Use client-side calculation which normalizes overnight end times
  const totalHours = shifts.reduce((acc, shift) => {
    try {
      const res = calculateShiftPayment(shift.startDateTime, shift.endDateTime, shift.dayCategory, ratesForCalc, holidaySet, recurringSet);
      return acc + (res.totalHours || 0);
    } catch (e) {
      return acc;
    }
  }, 0);

  // Use backend-calculated payment summary (same as Dashboard)
  const shiftsPayment = paymentSummary?.shiftsPayment || 0;
  const externalPayment = paymentSummary?.externalPayment || 0;
  const brutoPayment = paymentSummary?.brutoPayment || 0;
  const hasDiscount = paymentSummary?.hasDiscount || false;
  const discountAmount = paymentSummary?.discountAmount || 0;
  const finalPayment = paymentSummary?.finalPayment || 0;
  const externalTotalHours = paymentSummary?.externalHours || 0;

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
          {/* <IconButton size="small" onClick={handlePrevMonth}><PrevIcon /></IconButton>
          <Box sx={{ minWidth: 160, textAlign: 'center' }}>{formatMonthYear(appliedMonth + '-01')}</Box> */}
          {/* <IconButton size="small" onClick={handleNextMonth}><NextIcon /></IconButton> */}
          <MonthFilter
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            onApply={handleApplyMonth}
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
                Horas Turnos
              </Typography>
              <Typography variant="h3">{Math.round(totalHours)}h</Typography>
              {externalTotalHours > 0 && (
                <Typography variant="caption" color="text.secondary">
                  + {externalTotalHours.toFixed(1)}h externas
                </Typography>
              )}
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
          <Card sx={{ bgcolor: 'success.50' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Pago Neto — {formatMonthYear(appliedMonth + '-01')}
              </Typography>
              <Typography variant="h3" color="success.main">
                {formatCurrency(finalPayment)}
              </Typography>
              <Box mt={1}>
                {/* Show breakdown only if there are values */}
                {shiftsPayment > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Turnos: {formatCurrency(shiftsPayment)}
                  </Typography>
                )}
                {externalPayment > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    Horas Externas: {formatCurrency(externalPayment)}
                  </Typography>
                )}
                {(shiftsPayment > 0 || externalPayment > 0) && (
                  <Typography variant="body2" color="text.secondary" fontWeight="medium">
                    Bruto: {formatCurrency(brutoPayment)}
                  </Typography>
                )}
                {hasDiscount && discountAmount > 0 && (
                  <Typography variant="body2" color="error.main">
                    Descuento: -{formatCurrency(discountAmount)}
                  </Typography>
                )}
              </Box>
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
                        const res = calculateShiftPayment(shift.startDateTime, shift.endDateTime, shift.dayCategory, ratesForCalc, holidaySet, recurringSet);
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
