import React, { useState } from 'react';
import {
  Box,
  Button,
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import { EventAvailable as AssignIcon, Warning as WarningIcon, People as PeopleIcon } from '@mui/icons-material';
import { useAvailableShifts, useSelfAssignShift, useRates, useHolidays } from '../../hooks';
import { parseArgentinaDate } from '../../utils/dateHelpers';
import { Shift, DayCategory } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { calculateShiftPayment } from '../../utils/helpers';
import { formatCurrency } from '../../utils/formatters';

const getDayCategoryLabel = (category: DayCategory): string => {
  const labels: Record<DayCategory, string> = {
    WEEKDAY: 'Día de semana',
    WEEKEND: 'Fin de semana',
    HOLIDAY: 'Feriado',
  };
  return labels[category] || category;
};

const getDayCategoryColor = (category: DayCategory): 'default' | 'error' | 'warning' => {
  const colors: Record<DayCategory, 'default' | 'error' | 'warning'> = {
    WEEKDAY: 'default',
    WEEKEND: 'error',
    HOLIDAY: 'warning',
  };
  return colors[category] || 'default';
};

export const AvailableShifts: React.FC = () => {
  // React Query hooks
  const { data: shifts = [], isLoading: loading, error: queryError } = useAvailableShifts();
  const selfAssignMutation = useSelfAssignShift();
  const { data: rates } = useRates();
  const ratesForCalc = rates || [];

  // Load holidays to compute per-hour holiday rates
  const { data: holidays = [] } = useHolidays();
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
  
  const [error, setError] = useState(queryError ? 'Error al cargar los turnos disponibles' : '');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleAssign = async () => {
    if (!selectedShift) return;

    try {
      await selfAssignMutation.mutateAsync(selectedShift.id);
      setSuccessMessage('¡Turno asignado correctamente! Este turno ya no puede ser modificado.');
      setSelectedShift(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al asignar el turno');
    }
  };

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
        Turnos Disponibles
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        Aquí puedes ver y auto-asignarte turnos rotativos de fines de semana y feriados.
      </Alert>

      <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
        <strong>Importante:</strong> Una vez que te asignes un turno, no podrás modificarlo ni cancelarlo. 
        Solo el administrador puede hacer cambios después de la asignación.
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Tipo de Día</TableCell>
              <TableCell>Horario</TableCell>
              <TableCell>Horas / Valor</TableCell>
              <TableCell>Plazas</TableCell>
              <TableCell>Notas</TableCell>
              <TableCell align="center">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((shift) => {
              const start = new Date(shift.startDateTime);
              const end = new Date(shift.endDateTime);
              const required = shift.requiredDoctors || 1;
              const assigned = shift.assignedCount || 0;
              const available = shift.slotsAvailable ?? (required - assigned);

              return (
                <TableRow key={shift.id}>
                  <TableCell>
                    <Typography fontWeight="medium">
                      {format(start, "EEEE dd 'de' MMMM", { locale: es })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={shift.holiday?.name || getDayCategoryLabel(shift.dayCategory)} 
                      size="small" 
                      color={getDayCategoryColor(shift.dayCategory)} 
                    />
                  </TableCell>
                  <TableCell>
                    {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
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
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <PeopleIcon fontSize="small" color="action" />
                      <Chip
                        label={`${assigned}/${required}`}
                        size="small"
                        color={available === 1 ? 'warning' : 'default'}
                        variant="outlined"
                      />
                      {shift.doctors && shift.doctors.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                          ({shift.doctors.map(d => d.doctor.name.split(' ')[0]).join(', ')})
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{shift.notes || '-'}</TableCell>
                  <TableCell align="center">
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<AssignIcon />}
                      onClick={() => setSelectedShift(shift)}
                    >
                      Asignarme
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {shifts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" py={4}>
                    No hay turnos disponibles en este momento
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Confirm Dialog */}
      <Dialog open={!!selectedShift} onClose={() => setSelectedShift(null)}>
        <DialogTitle>Confirmar Asignación</DialogTitle>
        <DialogContent>
          {selectedShift && (
            <Box>
              <Typography gutterBottom>
                ¿Deseas asignarte el siguiente turno?
              </Typography>
              <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
                <Typography>
                  <strong>Fecha:</strong>{' '}
                  {format(new Date(selectedShift.startDateTime), "EEEE dd 'de' MMMM", { locale: es })}
                </Typography>
                <Typography>
                  <strong>Horario:</strong>{' '}
                  {format(new Date(selectedShift.startDateTime), 'HH:mm')} -{' '}
                  {format(new Date(selectedShift.endDateTime), 'HH:mm')}
                </Typography>
                <Typography>
                  <strong>Plazas:</strong>{' '}
                  {selectedShift.assignedCount || 0}/{selectedShift.requiredDoctors || 1} ocupadas
                  {selectedShift.doctors && selectedShift.doctors.length > 0 && (
                    <> ({selectedShift.doctors.map(d => d.doctor.name).join(', ')})</>  
                  )}
                </Typography>
                {selectedShift.notes && (
                  <Typography>
                    <strong>Notas:</strong> {selectedShift.notes}
                  </Typography>
                )}
                {/* Show rate breakdown for the selected shift */}
                <Box mt={1}>
                  {(() => {
                    try {
                      const res = calculateShiftPayment(selectedShift.startDateTime, selectedShift.endDateTime, selectedShift.dayCategory, ratesForCalc, holidaySet, recurringSet);
                      return <Typography variant="caption">{`${Math.round(res.totalHours)}h — ${formatCurrency(res.totalAmount)}`}</Typography>;
                    } catch (e) {
                      return null;
                    }
                  })()}
                </Box>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedShift(null)}>Cancelar</Button>
          <Button
            onClick={handleAssign}
            variant="contained"
            color="success"
            disabled={selfAssignMutation.isPending}
          >
            {selfAssignMutation.isPending ? <CircularProgress size={24} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage('')}
        message={successMessage}
      />
    </Box>
  );
};

export default AvailableShifts;
