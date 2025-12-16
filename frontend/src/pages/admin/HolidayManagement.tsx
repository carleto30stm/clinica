import React, { useState, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Alert,
  CircularProgress,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from '../../hooks/useHolidays';
import { Holiday, CreateHolidayData } from '../../types';
import { parseArgentinaDate, formatArgentinaDate } from '../../utils/dateHelpers';

export const HolidayManagement: React.FC = () => {
  // React Query hooks para sincronización automática
  const { data: holidaysData, isLoading, error: queryError } = useHolidays();
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  const [formData, setFormData] = useState<CreateHolidayData>({
    date: '',
    name: '',
    isRecurrent: false,
    requiredDoctors: 0,
  });

  // Normalizar fechas para evitar problemas de timezone
  const holidays = useMemo(() => {
    if (!holidaysData) return [];
    return holidaysData.map((h) => ({
      ...h,
      date: formatArgentinaDate(parseArgentinaDate(h.date)),
    }));
  }, [holidaysData]);

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      const datePart = formatArgentinaDate(parseArgentinaDate(holiday.date));
      setFormData({
        date: datePart,
        name: holiday.name,
        isRecurrent: holiday.isRecurrent,
        requiredDoctors: holiday.requiredDoctors ?? 0,
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        date: '',
        name: '',
        isRecurrent: false,
        requiredDoctors: 0,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingHoliday(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingHoliday) {
        await updateHoliday.mutateAsync({ id: editingHoliday.id, data: formData });
        setSuccess('Feriado actualizado correctamente');
      } else {
        await createHoliday.mutateAsync(formData);
        setSuccess('Feriado creado correctamente');
      }
      handleCloseDialog();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar el feriado');
    }
  };

  const handleDelete = async () => {
    if (!holidayToDelete) return;
    try {
      await deleteHoliday.mutateAsync(holidayToDelete.id);
      setSuccess('Feriado eliminado correctamente');
      setDeleteDialogOpen(false);
      setHolidayToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar el feriado');
    }
  };

  const isMutating = createHoliday.isPending || updateHoliday.isPending || deleteHoliday.isPending;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (queryError) {
    return (
      <Box p={4}>
        <Alert severity="error">Error al cargar los feriados</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Gestión de Feriados</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Feriado
        </Button>
      </Box>

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

      <Alert severity="info" sx={{ mb: 3 }}>
        Los feriados definidos aquí determinarán qué turnos están disponibles para auto-asignación por los médicos.
        Los feriados recurrentes se repiten cada año en la misma fecha.
      </Alert>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="center">Médicos Req.</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {holidays.map((holiday) => (
              <TableRow key={holiday.id}>
                <TableCell>
                  {(() => {
                    const holidayDate = parseArgentinaDate(holiday.date);
                    // Use UTC getters since the date is stored as UTC midnight
                    const day = String(holidayDate.getUTCDate()).padStart(2, '0');
                    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                    const month = monthNames[holidayDate.getUTCMonth()];
                    return `${day} de ${month}`;
                  })()}
                  {!holiday.isRecurrent && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {parseArgentinaDate(holiday.date).getUTCFullYear()}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography fontWeight="medium">{holiday.name}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={holiday.isRecurrent ? 'Recurrente' : 'Único'}
                    color={holiday.isRecurrent ? 'primary' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  {holiday.requiredDoctors > 0 ? (
                    <Chip
                      label={holiday.requiredDoctors}
                      color="success"
                      size="small"
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(holiday)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setHolidayToDelete(holiday);
                      setDeleteDialogOpen(true);
                    }}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {holidays.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" py={4}>
                    No hay feriados configurados
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingHoliday ? 'Editar Feriado' : 'Nuevo Feriado'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Fecha"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="Nombre del feriado"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              placeholder="Ej: Navidad, Día de la Independencia"
            />
            <TextField
              label="Cantidad de médicos requeridos"
              type="number"
              value={formData.requiredDoctors ?? 0}
              onChange={(e) => setFormData({ ...formData, requiredDoctors: Math.max(0, parseInt(e.target.value) || 0) })}
              fullWidth
              helperText="Si es mayor a 0, el feriado aparecerá en la lista de turnos disponibles para auto-asignación"
              inputProps={{ min: 0 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isRecurrent}
                  onChange={(e) => setFormData({ ...formData, isRecurrent: e.target.checked })}
                />
              }
              label="Feriado recurrente (se repite cada año)"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isMutating}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.date || !formData.name || isMutating}
          >
            {isMutating ? 'Guardando...' : editingHoliday ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => !isMutating && setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el feriado "{holidayToDelete?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isMutating}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={isMutating}>
            {isMutating ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HolidayManagement;
