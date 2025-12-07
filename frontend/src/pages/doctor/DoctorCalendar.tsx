import React, { useState } from 'react';
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
  Card,
  CardContent,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
  ViewModule,
  ViewList,
  Devices as DevicesIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useMyShifts } from '../../hooks';
import { useUIStore } from '../../store/uiStore';
import { Shift } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const DoctorCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // React Query para datos
  const startDate = startOfMonth(currentDate).toISOString();
  const endDate = endOfMonth(currentDate).toISOString();
  const { data: shifts = [], isLoading: loading, error: queryError } = useMyShifts({ startDate, endDate });
  const error = queryError ? 'Error al cargar los turnos' : '';

  // Responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });
  
  // UI Store para persistir preferencias
  const { calendarPreferences, setCalendarViewMode } = useUIStore();
  const viewMode = calendarPreferences.viewMode;
  const showList = viewMode === 'list' || (viewMode === 'auto' && isMobile);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleGoToToday = () => setCurrentDate(new Date());

  const isCurrentMonth = format(currentDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM');
  const isToday = (date: Date): boolean => format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

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

  // Mobile list view component
  const MobileListView = () => (
    <Box>
      {days.map((day) => {
        const dayShifts = getShiftsForDay(day);
        const hasShift = dayShifts.length > 0;
        const isWeekend = getDay(day) === 0 || getDay(day) === 6;
        const today = isToday(day);

        return (
          <Card 
            key={day.toISOString()} 
            sx={{ 
              mb: 1, 
              borderRadius: 2,
              borderLeft: hasShift ? '4px solid' : 'none',
              borderLeftColor: 'success.main',
              bgcolor: today ? 'primary.50' : hasShift ? 'success.50' : 'background.paper',
            }}
          >
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography 
                    variant="subtitle1" 
                    fontWeight={today ? 'bold' : 'medium'}
                    color={today ? 'primary.main' : isWeekend ? 'error.main' : 'text.primary'}
                  >
                    {format(day, "EEE dd 'de' MMM", { locale: es })}
                    {today && <Chip label="Hoy" size="small" color="primary" sx={{ ml: 1 }} />}
                  </Typography>
                </Box>
                {hasShift && (
                  <Chip 
                    icon={<TimeIcon />}
                    label={`${dayShifts.length} turno${dayShifts.length > 1 ? 's' : ''}`} 
                    size="small" 
                    color="success"
                  />
                )}
              </Box>

              {hasShift && (
                <Box mt={1} display="flex" flexDirection="column" gap={0.5}>
                  {dayShifts.map((shift) => (
                    <Chip
                      key={shift.id}
                      label={`${format(new Date(shift.startDateTime), 'HH:mm')} - ${format(new Date(shift.endDateTime), 'HH:mm')}`}
                      variant="outlined"
                      color="success"
                      size="small"
                      sx={{ justifyContent: 'flex-start' }}
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );

  // Grid view component (desktop)
  const GridView = () => (
    <Paper sx={{ p: isMobile ? 1 : 2 }}>
      <Grid container spacing={isMobile ? 0.5 : 1}>
        {/* Day headers */}
        {dayNames.map((day, index) => (
          <Grid item xs={12 / 7} key={day}>
            <Box
              sx={{
                textAlign: 'center',
                fontWeight: 'bold',
                py: isMobile ? 0.5 : 1,
                fontSize: isMobile ? '0.7rem' : 'inherit',
                bgcolor: index === 0 || index === 6 ? 'error.light' : 'primary.light',
                color: 'white',
                borderRadius: 1,
              }}
            >
              {isMobile ? day.charAt(0) : day}
            </Box>
          </Grid>
        ))}

        {/* Empty cells for days before first of month */}
        {Array.from({ length: firstDayOfMonth }).map((_, index) => (
          <Grid item xs={12 / 7} key={`empty-${index}`}>
            <Box sx={{ minHeight: isMobile ? 60 : 100 }} />
          </Grid>
        ))}

        {/* Calendar days */}
        {days.map((day) => {
          const dayShifts = getShiftsForDay(day);
          const isWeekend = getDay(day) === 0 || getDay(day) === 6;
          const hasShift = dayShifts.length > 0;
          const today = isToday(day);

          return (
            <Grid item xs={12 / 7} key={day.toISOString()}>
              <Box
                sx={{
                  minHeight: isMobile ? 60 : 100,
                  border: '1px solid',
                  borderColor: today ? 'primary.main' : hasShift ? 'success.main' : isWeekend ? 'error.light' : 'divider',
                  borderWidth: today ? 2 : 1,
                  borderRadius: 1,
                  p: 0.5,
                  bgcolor: hasShift ? 'success.50' : isWeekend ? 'error.50' : 'background.paper',
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: today ? 'bold' : 'normal',
                    color: today ? 'primary.main' : hasShift ? 'success.main' : isWeekend ? 'error.main' : 'text.primary',
                    fontSize: isMobile ? '0.75rem' : 'inherit',
                  }}
                >
                  {format(day, 'd')}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  {dayShifts.slice(0, isMobile ? 1 : 3).map((shift) => (
                    <Tooltip
                      key={shift.id}
                      title={`${format(new Date(shift.startDateTime), 'HH:mm')} - ${format(new Date(shift.endDateTime), 'HH:mm')}`}
                    >
                      <Chip
                        label={format(new Date(shift.startDateTime), 'HH:mm')}
                        size="small"
                        color="success"
                        sx={{ mb: 0.5, width: '100%', fontSize: isMobile ? '0.65rem' : 'inherit' }}
                      />
                    </Tooltip>
                  ))}
                  {dayShifts.length > (isMobile ? 1 : 3) && (
                    <Typography variant="caption" color="text.secondary">
                      +{dayShifts.length - (isMobile ? 1 : 3)} más
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );

  return (
    <Box>
      {/* Header */}
      <Box 
        display="flex" 
        flexDirection={isMobile ? 'column' : 'row'}
        justifyContent="space-between" 
        alignItems={isMobile ? 'stretch' : 'center'} 
        gap={2}
        mb={3}
      >
        <Typography variant={isMobile ? 'h5' : 'h4'}>Mi Calendario</Typography>
        
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems="center">
          {/* Month navigation */}
          <Box display="flex" alignItems="center" justifyContent="center">
            <IconButton onClick={handlePrevMonth} size={isMobile ? 'small' : 'medium'}>
              <PrevIcon />
            </IconButton>
            
            {!isCurrentMonth && (
              <Tooltip title="Ir a hoy">
                <IconButton onClick={handleGoToToday} color="primary" size={isMobile ? 'small' : 'medium'}>
                  <TodayIcon />
                </IconButton>
              </Tooltip>
            )}
            
            <Typography 
              variant={isMobile ? 'body1' : 'h6'} 
              sx={{ 
                mx: 1, 
                minWidth: isMobile ? 120 : 180, 
                textAlign: 'center',
                fontWeight: 'medium',
                textTransform: 'capitalize',
              }}
            >
              {format(currentDate, isMobile ? 'MMM yyyy' : 'MMMM yyyy', { locale: es })}
            </Typography>
            <IconButton onClick={handleNextMonth} size={isMobile ? 'small' : 'medium'}>
              <NextIcon />
            </IconButton>
          </Box>

          {/* View toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            size="small"
            onChange={(_, v) => v && setCalendarViewMode(v)}
            aria-label="view mode"
          >
            <ToggleButton value="auto" aria-label="auto view">
              <Tooltip title="Automático"><DevicesIcon fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="grid" aria-label="grid view">
              <Tooltip title="Cuadrícula"><ViewModule fontSize="small" /></Tooltip>
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <Tooltip title="Lista"><ViewList fontSize="small" /></Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Calendar view */}
      {showList ? <MobileListView /> : <GridView />}

      {/* Summary */}
      <Paper sx={{ mt: 3, p: 2 }}>
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} justifyContent="space-around">
          <Box textAlign="center">
            <Typography variant="h4" color="primary">{shifts.length}</Typography>
            <Typography variant="body2" color="text.secondary">Turnos este mes</Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" color="success.main">
              {Math.round(
                shifts.reduce((acc, shift) => {
                  const start = new Date(shift.startDateTime);
                  const end = new Date(shift.endDateTime);
                  return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                }, 0)
              )}h
            </Typography>
            <Typography variant="body2" color="text.secondary">Horas totales</Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};

export default DoctorCalendar;
