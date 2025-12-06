import React, { useEffect, useState } from 'react';
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
import { EventAvailable as AssignIcon, Warning as WarningIcon } from '@mui/icons-material';
import { shiftApi } from '../../api/shifts';
import { Shift, DayCategory } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const data = await shiftApi.getAvailable();
      setShifts(data);
    } catch (err) {
      setError('Error al cargar los turnos disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedShift) return;

    setAssigning(true);
    try {
      await shiftApi.selfAssign(selectedShift.id);
      setSuccessMessage('¡Turno asignado correctamente! Este turno ya no puede ser modificado.');
      setSelectedShift(null);
      loadShifts();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al asignar el turno');
    } finally {
      setAssigning(false);
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
              <TableCell>Tipo de Turno</TableCell>
              <TableCell>Notas</TableCell>
              <TableCell align="center">Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.map((shift) => {
              const start = new Date(shift.startDateTime);
              const end = new Date(shift.endDateTime);

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
                    <Chip
                      label={shift.type === 'FIXED' ? 'Fijo' : 'Rotativo'}
                      color={shift.type === 'FIXED' ? 'primary' : 'secondary'}
                      size="small"
                    />
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
                {selectedShift.notes && (
                  <Typography>
                    <strong>Notas:</strong> {selectedShift.notes}
                  </Typography>
                )}
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
            disabled={assigning}
          >
            {assigning ? <CircularProgress size={24} /> : 'Confirmar'}
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
