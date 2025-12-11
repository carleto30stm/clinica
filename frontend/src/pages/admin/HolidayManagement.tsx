import React, { useEffect, useState } from 'react';
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
import { holidayApi } from '../../api/holidays';
import { Holiday, CreateHolidayData } from '../../types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const HolidayManagement: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
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
  });

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      const data = await holidayApi.getAll();
      setHolidays(data);
    } catch (err) {
      setError('Error al cargar los feriados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      // Extract date part directly from ISO string to avoid timezone issues
      const [datePart] = holiday.date.split('T');
      setFormData({
        date: datePart,
        name: holiday.name,
        isRecurrent: holiday.isRecurrent,
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        date: '',
        name: '',
        isRecurrent: false,
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
        await holidayApi.update(editingHoliday.id, formData);
        setSuccess('Feriado actualizado correctamente');
      } else {
        await holidayApi.create(formData);
        setSuccess('Feriado creado correctamente');
      }
      handleCloseDialog();
      loadHolidays();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar el feriado');
    }
  };

  const handleDelete = async () => {
    if (!holidayToDelete) return;
    try {
      await holidayApi.delete(holidayToDelete.id);
      setSuccess('Feriado eliminado correctamente');
      setDeleteDialogOpen(false);
      setHolidayToDelete(null);
      loadHolidays();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar el feriado');
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
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {holidays.map((holiday) => (
              <TableRow key={holiday.id}>
                <TableCell>
                  {(() => {
                    // Parse UTC date correctly to avoid timezone shift
                    const [datePart] = holiday.date.split('T');
                    const [year, month, day] = datePart.split('-').map(Number);
                    const holidayDate = new Date(year, month - 1, day);
                    return format(holidayDate, "dd 'de' MMMM", { locale: es });
                  })()}
                  {!holiday.isRecurrent && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {(() => {
                        const [datePart] = holiday.date.split('T');
                        const [year] = datePart.split('-').map(Number);
                        return year;
                      })()}
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
                <TableCell colSpan={4} align="center">
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
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.date || !formData.name}
          >
            {editingHoliday ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el feriado "{holidayToDelete?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HolidayManagement;
