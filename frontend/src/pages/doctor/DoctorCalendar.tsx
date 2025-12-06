import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
} from '@mui/icons-material';
import { shiftApi } from '../../api/shifts';
import { Shift } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const DoctorCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadShifts();
  }, [currentDate]);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      
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

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getShiftsForDay = (date: Date): Shift[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter((shift) => {
      const shiftDate = format(new Date(shift.startDateTime), 'yyyy-MM-dd');
      return shiftDate === dateStr;
    });
  };

  const firstDayOfMonth = getDay(startOfMonth(currentDate));

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
        <Typography variant="h4">Mi Calendario</Typography>
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

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={1}>
          {/* Day headers */}
          {dayNames.map((day, index) => (
            <Grid item xs={12 / 7} key={day}>
              <Box
                sx={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  py: 1,
                  bgcolor: index === 0 || index === 6 ? 'error.light' : 'primary.light',
                  color: 'white',
                  borderRadius: 1,
                }}
              >
                {day}
              </Box>
            </Grid>
          ))}

          {/* Empty cells for days before first of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <Grid item xs={12 / 7} key={`empty-${index}`}>
              <Box sx={{ minHeight: 100 }} />
            </Grid>
          ))}

          {/* Calendar days */}
          {days.map((day) => {
            const dayShifts = getShiftsForDay(day);
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;
            const hasShift = dayShifts.length > 0;

            return (
              <Grid item xs={12 / 7} key={day.toISOString()}>
                <Box
                  sx={{
                    minHeight: 100,
                    border: '1px solid',
                    borderColor: hasShift ? 'success.main' : isWeekend ? 'error.light' : 'divider',
                    borderRadius: 1,
                    p: 0.5,
                    bgcolor: hasShift ? 'success.50' : isWeekend ? 'error.50' : 'background.paper',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 'bold',
                      color: hasShift ? 'success.main' : isWeekend ? 'error.main' : 'text.primary',
                    }}
                  >
                    {format(day, 'd')}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {dayShifts.map((shift) => (
                      <Tooltip
                        key={shift.id}
                        title={`${format(new Date(shift.startDateTime), 'HH:mm')} - ${format(new Date(shift.endDateTime), 'HH:mm')}`}
                      >
                        <Chip
                          label={`${format(new Date(shift.startDateTime), 'HH:mm')}`}
                          size="small"
                          color="success"
                          sx={{ mb: 0.5, width: '100%' }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Summary */}
      <Box mt={3}>
        <Typography variant="subtitle1">
          <strong>Turnos este mes:</strong> {shifts.length}
        </Typography>
        <Typography variant="subtitle1">
          <strong>Horas totales:</strong>{' '}
          {Math.round(
            shifts.reduce((acc, shift) => {
              const start = new Date(shift.startDateTime);
              const end = new Date(shift.endDateTime);
              return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            }, 0)
          )}h
        </Typography>
      </Box>
    </Box>
  );
};

export default DoctorCalendar;
