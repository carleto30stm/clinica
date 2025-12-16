import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Event as EventIcon,
  Weekend as WeekendIcon,
  Today as TodayIcon,
} from '@mui/icons-material';
import { ConfirmModal } from '../../components/modal/ConfirmModal';
import { shiftApi } from '../../api/shifts';
import { useHolidays } from '../../hooks/useHolidays';
import { Holiday, CreateShiftData } from '../../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addDays,
  getDay,
  isSameDay,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { parseArgentinaDate } from '../../utils/dateHelpers';

interface ShiftPreview {
  date: Date;
  dayName: string;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayId?: string;
  holidayName?: string;
  type: 'FIXED' | 'ROTATING';
  selfAssignable: boolean;
}

export const ShiftGenerator: React.FC = () => {
  // Usar React Query para sincronización automática de feriados
  const { data: holidaysData = [] } = useHolidays();
  const holidays = useMemo(() => holidaysData, [holidaysData]);
  
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM');
  });
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:00');
  const [nextDayEnd, setNextDayEnd] = useState(true); // Guardia de 24h
  
  // Day selection
  const [includeWeekdays, setIncludeWeekdays] = useState(true);
  const [includeWeekends, setIncludeWeekends] = useState(true);
  const [includeHolidays, setIncludeHolidays] = useState(true);
  
  // Required doctors for self-assignable shifts
  const [requiredDoctors, setRequiredDoctors] = useState(1);

  // Preview
  const [preview, setPreview] = useState<ShiftPreview[]>([]);
  
  // Confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    generatePreview();
  }, [selectedMonth, includeWeekdays, includeWeekends, includeHolidays, holidays]);

  const isHolidayDate = (date: Date): Holiday | undefined => {
    return holidays.find(holiday => {
      const holidayDate = parseArgentinaDate(holiday.date);
      if (holiday.isRecurrent) {
        // Compare month and day only for recurrent holidays
        return holidayDate.getMonth() === date.getMonth() && 
               holidayDate.getDate() === date.getDate();
      }
      return isSameDay(holidayDate, date);
    });
  };

  const generatePreview = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));
    
    const days = eachDayOfInterval({ start, end });
    const shifts: ShiftPreview[] = [];

    days.forEach(day => {
      const dayOfWeek = getDay(day);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const holiday = isHolidayDate(day);
      const isHoliday = !!holiday;

      // Determine if this day should be included
      let shouldInclude = false;
      if (isHoliday && includeHolidays) {
        shouldInclude = true;
      } else if (isWeekend && includeWeekends) {
        shouldInclude = true;
      } else if (!isWeekend && !isHoliday && includeWeekdays) {
        shouldInclude = true;
      }

      if (shouldInclude) {
        // Determine shift properties
        const isRotating = isWeekend || isHoliday;
        shifts.push({
          date: day,
          dayName: format(day, 'EEEE', { locale: es }),
          isWeekend,
          isHoliday,
          holidayId: holiday?.id,
          holidayName: holiday?.name,
          type: isRotating ? 'ROTATING' : 'FIXED',
          selfAssignable: isRotating,
        });
      }
    });

    setPreview(shifts);
  };

  const requestGenerate = () => {
    if (preview.length === 0) {
      setError('No hay turnos para generar. Selecciona al menos un tipo de día.');
      return;
    }
    setConfirmOpen(true);
  };

  const handleGenerate = async () => {
    setConfirmOpen(false);
    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const shiftsToCreate: CreateShiftData[] = preview.map(shift => {
        const startDateTime = new Date(shift.date);
        const [startHour, startMin] = startTime.split(':').map(Number);
        startDateTime.setHours(startHour, startMin, 0, 0);

        let endDateTime = nextDayEnd ? addDays(shift.date, 1) : new Date(shift.date);
        const [endHour, endMin] = endTime.split(':').map(Number);
        endDateTime.setHours(endHour, endMin, 0, 0);

        return {
          startDateTime: startDateTime.toISOString(),
          endDateTime: endDateTime.toISOString(),
          type: shift.type,
          // Ensure backend receives explicit dayCategory so holidays are stored correctly
          dayCategory: shift.isHoliday ? 'HOLIDAY' : (shift.isWeekend ? 'WEEKEND' : 'WEEKDAY'),
          selfAssignable: shift.selfAssignable,
          requiredDoctors: shift.selfAssignable ? requiredDoctors : 1,
          doctorId: null, // Sin médico asignado
          notes: shift.holidayName ? `Feriado: ${shift.holidayName}` : undefined,
          // Include holidayId for traceability (backend will ignore it in strict typing but it's useful)
          ...(shift.holidayId ? { holidayId: shift.holidayId } : {}),
        };
      });

      await shiftApi.bulkCreate(shiftsToCreate);
      setSuccess(`¡${shiftsToCreate.length} turnos creados exitosamente!`);
      
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al generar los turnos');
    } finally {
      setGenerating(false);
    }
  };

  const weekdayCount = preview.filter(s => !s.isWeekend && !s.isHoliday).length;
  const weekendCount = preview.filter(s => s.isWeekend).length;
  const holidayCount = preview.filter(s => s.isHoliday).length;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Generador de Turnos
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Genera turnos masivamente para todo un mes. Los turnos se crean <strong>sin médico asignado</strong>.
        Los turnos de fines de semana y feriados quedarán disponibles para que los médicos se auto-asignen.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box display="flex" gap={3} flexWrap="wrap">
        {/* Configuration Panel */}
        <Paper sx={{ p: 3, flex: 1, minWidth: 300 }}>
          <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
            <CalendarIcon /> Configuración
          </Typography>
          
          <TextField
            label="Mes"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center" gap={1}>
            <ScheduleIcon /> Horario de Guardia
          </Typography>

          <Box display="flex" gap={2} alignItems="center">
            <TextField
              label="Hora inicio"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <Typography>a</Typography>
            <TextField
              label="Hora fin"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={nextDayEnd}
                onChange={(e) => setNextDayEnd(e.target.checked)}
              />
            }
            label="Guardia de 24h (termina al día siguiente)"
            sx={{ mt: 1 }}
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Días a incluir
          </Typography>

          <FormControlLabel
            control={
              <Checkbox
                checked={includeWeekdays}
                onChange={(e) => setIncludeWeekdays(e.target.checked)}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <TodayIcon fontSize="small" />
                Lunes a Viernes (turnos fijos)
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={includeWeekends}
                onChange={(e) => setIncludeWeekends(e.target.checked)}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <WeekendIcon fontSize="small" color="error" />
                Sábados y Domingos (auto-asignables)
              </Box>
            }
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={includeHolidays}
                onChange={(e) => setIncludeHolidays(e.target.checked)}
              />
            }
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <EventIcon fontSize="small" color="warning" />
                Feriados (auto-asignables)
              </Box>
            }
          />

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Médicos por turno (auto-asignables)
          </Typography>

          <TextField
            label="Médicos requeridos"
            type="number"
            value={requiredDoctors}
            onChange={(e) => setRequiredDoctors(Math.max(1, parseInt(e.target.value) || 1))}
            size="small"
            fullWidth
            InputProps={{ inputProps: { min: 1, max: 10 } }}
            helperText="Cantidad de médicos que pueden tomar cada turno auto-asignable"
            sx={{ mb: 2 }}
          />

          <Divider sx={{ my: 2 }} />

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={requestGenerate}
            disabled={generating || preview.length === 0}
            startIcon={generating ? <CircularProgress size={20} /> : <CheckIcon />}
          >
            {generating ? 'Generando...' : `Generar ${preview.length} Turnos`}
          </Button>
        </Paper>

        {/* Preview Panel */}
        <Paper sx={{ p: 3, flex: 1, minWidth: 300, maxHeight: 600, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            Vista Previa
          </Typography>

          <Box display="flex" gap={1} mb={2} flexWrap="wrap">
            <Chip 
              label={`${weekdayCount} días de semana`} 
              color="primary" 
              variant="outlined" 
              size="small" 
            />
            <Chip 
              label={`${weekendCount} fines de semana`} 
              color="error" 
              variant="outlined" 
              size="small" 
            />
            <Chip 
              label={`${holidayCount} feriados`} 
              color="warning" 
              variant="outlined" 
              size="small" 
            />
          </Box>

          {preview.length === 0 ? (
            <Alert severity="warning">
              No hay turnos para mostrar. Selecciona al menos un tipo de día.
            </Alert>
          ) : (
            <List dense>
              {preview.map((shift, index) => (
                <ListItem key={index} divider>
                  <ListItemIcon>
                    {shift.isHoliday ? (
                      <EventIcon color="warning" />
                    ) : shift.isWeekend ? (
                      <WeekendIcon color="error" />
                    ) : (
                      <TodayIcon color="primary" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="medium">
                          {format(shift.date, 'dd/MM')} - {shift.dayName}
                        </Typography>
                        {shift.isHoliday && (
                          <Chip label={shift.holidayName} size="small" color="warning" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box display="flex" gap={0.5} mt={0.5}>
                        <Chip
                          label={shift.type === 'FIXED' ? 'Fijo' : 'Rotativo'}
                          size="small"
                          color={shift.type === 'FIXED' ? 'primary' : 'secondary'}
                        />
                        {shift.selfAssignable && (
                          <Chip label="Auto-asignable" size="small" variant="outlined" />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>

      {/* Summary Cards */}
      <Box display="flex" gap={2} mt={3} flexWrap="wrap">
        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Total de turnos
            </Typography>
            <Typography variant="h3">{preview.length}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Horas por guardia
            </Typography>
            <Typography variant="h3">{nextDayEnd ? '24h' : '-'}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Typography color="text.secondary" gutterBottom>
              Auto-asignables
            </Typography>
            <Typography variant="h3">{weekendCount + holidayCount}</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Confirm Generate Modal */}
      <ConfirmModal
        open={confirmOpen}
        title="Confirmar generación de turnos"
        description={`¿Está seguro de generar ${preview.length} turnos para el mes seleccionado? Esta acción creará los turnos sin médico asignado.`}
        confirmText="Generar"
        onConfirm={handleGenerate}
        onCancel={() => setConfirmOpen(false)}
        loading={generating}
      />
    </Box>
  );
};

export default ShiftGenerator;
