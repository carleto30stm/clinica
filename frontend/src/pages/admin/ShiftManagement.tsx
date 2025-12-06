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
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Avatar,
  AvatarGroup,
  Tooltip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { shiftApi } from '../../api/shifts';
import { userApi } from '../../api/users';
import { Shift, DoctorOption, CreateShiftData, DayCategory, AssignmentStatus } from '../../types';

const getDayCategoryLabel = (category: DayCategory): string => {
  const labels: Record<DayCategory, string> = {
    WEEKDAY: 'Día de semana',
    WEEKEND: 'Fin de semana',
    HOLIDAY: 'Feriado',
  };
  return labels[category] || category;
};

const getAssignmentStatusLabel = (status: AssignmentStatus): string => {
  const labels: Record<AssignmentStatus, string> = {
    AVAILABLE: 'Disponible',
    SELF_ASSIGNED: 'Auto-asignado',
    ADMIN_ASSIGNED: 'Asignado por admin',
  };
  return labels[status] || status;
};

const getAssignmentStatusColor = (status: AssignmentStatus): 'warning' | 'info' | 'success' => {
  const colors: Record<AssignmentStatus, 'warning' | 'info' | 'success'> = {
    AVAILABLE: 'warning',
    SELF_ASSIGNED: 'info',
    ADMIN_ASSIGNED: 'success',
  };
  return colors[status] || 'warning';
};
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { getInitials, getDoctorColor } from '../../utils/helpers';

export const ShiftManagement: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success'|'error' }>({ open: false, message: '', severity: 'success' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  // Month filter: 'YYYY-MM'
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const [formData, setFormData] = useState<CreateShiftData>({
    startDateTime: '',
    endDateTime: '',
    type: 'ROTATING',
    selfAssignable: true,
    doctorId: null,
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Build start/end datetimes for month filter
      const [y, m] = selectedMonth.split('-').map(Number);
      const start = startOfMonth(new Date(y, m - 1, 1));
      const end = endOfMonth(new Date(y, m - 1, 1));

      const [shiftsData, doctorsData] = await Promise.all([
        shiftApi.getAll({ startDate: start.toISOString(), endDate: end.toISOString() }),
        userApi.getDoctors(),
      ]);
      setShifts(shiftsData);
      setDoctors(doctorsData);
    } catch (err) {
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        startDateTime: format(new Date(shift.startDateTime), "yyyy-MM-dd'T'HH:mm"),
        endDateTime: format(new Date(shift.endDateTime), "yyyy-MM-dd'T'HH:mm"),
        type: shift.type,
        selfAssignable: shift.selfAssignable,
        doctorId: shift.doctorId,
        notes: shift.notes || '',
      });
    } else {
      setEditingShift(null);
      // Default start/end in selected month (first day at 08:00)
      const [year, month] = selectedMonth.split('-').map(Number);
      const defaultDate = new Date(year, month - 1, 1, 8, 0, 0);
      setFormData({
        startDateTime: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
        endDateTime: format(defaultDate, "yyyy-MM-dd'T'HH:mm"),
        type: 'ROTATING',
        selfAssignable: true,
        doctorId: null,
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingShift(null);
  };

  const handleSave = async () => {
    try {
      const data = {
        ...formData,
        startDateTime: new Date(formData.startDateTime).toISOString(),
        endDateTime: new Date(formData.endDateTime).toISOString(),
      };

      if (editingShift) {
        await shiftApi.update(editingShift.id, data);
      } else {
        await shiftApi.create(data);
      }
      handleCloseDialog();
      loadData();
    } catch (err) {
      setError('Error al guardar el turno');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este turno?')) {
      try {
        await shiftApi.delete(id);
        loadData();
        setSnackbar({ open: true, message: 'Turno eliminado exitosamente', severity: 'success' });
      } catch (err) {
        setError('Error al eliminar el turno');
      }
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={2}>
        <Box display="flex" gap={2} alignItems="center">
          <Typography variant="h4">Gestión de Turnos</Typography>
          <Typography color="text.secondary" variant="subtitle1">
            {format(new Date(selectedMonth + '-01'), 'MMMM yyyy', { locale: es })}
          </Typography>
          <TextField
            label="Mes"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <Button size="small" onClick={() => setSelectedMonth(format(new Date(), 'yyyy-MM'))}>
            Mes actual
          </Button>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Turno
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Horario</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Día</TableCell>
              <TableCell>Médico</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shifts.slice(0, 50).map((shift) => (
              <TableRow key={shift.id}>
                <TableCell>
                  {format(new Date(shift.startDateTime), 'dd/MM/yyyy', { locale: es })}
                </TableCell>
                <TableCell>
                  {format(new Date(shift.startDateTime), 'HH:mm')} - {format(new Date(shift.endDateTime), 'HH:mm')}
                </TableCell>
                <TableCell>
                  <Chip
                    label={shift.type === 'FIXED' ? 'Fijo' : 'Rotativo'}
                    color={shift.type === 'FIXED' ? 'primary' : 'secondary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getDayCategoryLabel(shift.dayCategory)}
                    color={shift.dayCategory === 'WEEKDAY' ? 'default' : shift.dayCategory === 'WEEKEND' ? 'error' : 'warning'}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {shift.doctors && shift.doctors.length > 0 ? (
                    <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 12 } }}>
                      {shift.doctors.map((a) => (
                        <Tooltip key={a.doctor.id} title={`${a.doctor.name}${a.doctor.specialty ? ` - ${a.doctor.specialty}` : ''}`}>
                          <Avatar sx={{ bgcolor: getDoctorColor(a.doctor.id) }}>
                            {getInitials(a.doctor.name)}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </AvatarGroup>
                  ) : shift.doctor?.name ? (
                    <>{shift.doctor?.name}</>
                  ) : (
                    <em>Sin asignar</em>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getAssignmentStatusLabel(shift.assignmentStatus)}
                    color={getAssignmentStatusColor(shift.assignmentStatus)}
                    size="small"
                  />
                  {shift.selfAssignable && (
                    <Chip label="Auto-asignable" size="small" sx={{ ml: 0.5 }} variant="outlined" />
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleOpenDialog(shift)} title="Editar">
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(shift.id)} color="error" title="Eliminar">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingShift ? 'Editar Turno' : 'Nuevo Turno'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Fecha y hora de inicio"
              type="datetime-local"
              value={formData.startDateTime}
              onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              label="Fecha y hora de fin"
              type="datetime-local"
              value={formData.endDateTime}
              onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Tipo de turno</InputLabel>
              <Select
                value={formData.type}
                label="Tipo de turno"
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'FIXED' | 'ROTATING' })}
              >
                <MenuItem value="FIXED">Fijo</MenuItem>
                <MenuItem value="ROTATING">Rotativo</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Médico asignado</InputLabel>
              <Select
                value={formData.doctorId || ''}
                label="Médico asignado"
                onChange={(e) => setFormData({ ...formData, doctorId: e.target.value || null })}
              >
                <MenuItem value="">Sin asignar</MenuItem>
                {doctors.map((doctor) => (
                  <MenuItem key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.selfAssignable}
                  onChange={(e) => setFormData({ ...formData, selfAssignable: e.target.checked })}
                />
              }
              label="Disponible para auto-asignación (solo fines de semana/feriados)"
              sx={{ mt: 1 }}
            />
            <TextField
              fullWidth
              label="Notas"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSave} variant="contained">
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
      {/* Snackbar for success/error */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ShiftManagement;
