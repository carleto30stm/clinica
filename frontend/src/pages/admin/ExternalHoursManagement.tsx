import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Work as WorkIcon,
} from '@mui/icons-material';
import { useExternalHours, useCreateExternalHours, useUpdateExternalHours, useDeleteExternalHours } from '../../hooks';
import { useUsers } from '../../hooks';
import { formatDate, formatCurrency, formatCurrencyInput, parseCurrencyInput } from '../../utils/formatters';
import { getErrorMessage } from '../../utils/helpers';
import MonthFilter from '../../components/filters/MonthFilter';

interface FormData {
  doctorId: string;
  hours: string;
  rate: string;
  description: string;
  date: string;
}

export const ExternalHoursManagement: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [appliedMonth, setAppliedMonth] = useState(selectedMonth);

  const monthParts = appliedMonth.split('-');
  const year = parseInt(monthParts[0]);
  const month = parseInt(monthParts[1]);

  const { data: externalHours = [], isLoading, error: fetchError } = useExternalHours({ month, year });
  const { data: doctors = [] } = useUsers();
  const createExternal = useCreateExternalHours();
  const updateExternal = useUpdateExternalHours();
  const deleteExternal = useDeleteExternalHours();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormData>({
    doctorId: '',
    hours: '',
    rate: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const doctorsList = doctors.filter((d) => d.role === 'DOCTOR');

  const handleApplyFilter = () => {
    setAppliedMonth(selectedMonth);
  };

  const handleOpenDialog = (id?: string) => {
    if (id) {
      const ext = externalHours.find((e) => e.id === id);
      if (ext) {
        setEditingId(id);
        setFormData({
          doctorId: ext.doctorId,
          hours: ext.hours.toString(),
          rate: formatCurrencyInput(ext.rate.toString()),
          description: ext.description || '',
          date: ext.date.split('T')[0],
        });
      }
    } else {
      setEditingId(null);
      setFormData({
        doctorId: '',
        hours: '',
        rate: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
    setIsDialogOpen(true);
    setError('');
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (!formData.doctorId) {
        setError('Seleccione un médico');
        return;
      }

      const hours = parseFloat(formData.hours);
      if (isNaN(hours) || hours <= 0) {
        setError('Ingrese horas válidas (mayor a 0)');
        return;
      }

      const rate = parseCurrencyInput(formData.rate);
      if (rate === null || rate < 0) {
        setError('Ingrese una tarifa válida');
        return;
      }

      if (!formData.date) {
        setError('Seleccione una fecha');
        return;
      }

      const data = {
        doctorId: formData.doctorId,
        hours,
        rate,
        description: formData.description.trim() || undefined,
        date: formData.date,
      };

      if (editingId) {
        await updateExternal.mutateAsync({ id: editingId, data });
      } else {
        await createExternal.mutateAsync(data);
      }

      handleCloseDialog();
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      console.error('Error saving external hours:', err);
      setError(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este registro?')) {
      return;
    }
    try {
      await deleteExternal.mutateAsync(id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const getTotalHours = () => externalHours.reduce((sum, e) => sum + Number(e.hours), 0);
  const getTotalPayment = () => externalHours.reduce((sum, e) => sum + (Number(e.hours) * Number(e.rate)), 0);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (fetchError) {
    return (
      <Alert severity="error">
        Error al cargar horas externas: {getErrorMessage(fetchError)}
      </Alert>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <WorkIcon fontSize="large" color="primary" />
          <Typography variant="h4">Horas de Consultorio Externo</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
          Nueva Entrada
        </Button>
      </Box>

      {error && !isDialogOpen && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <MonthFilter
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onApply={handleApplyFilter}
      />

      <Paper sx={{ p: 2, mb: 2, bgcolor: 'info.50' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Resumen — {new Date(year, month - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </Typography>
          <Box display="flex" gap={4}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Horas
              </Typography>
              <Typography variant="h5">{getTotalHours().toFixed(1)}h</Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total a Pagar
              </Typography>
              <Typography variant="h5" color="primary.main">
                {formatCurrency(getTotalPayment())}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Médico</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell align="center">Horas</TableCell>
              <TableCell align="right">Tarifa/Hora</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {externalHours.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" py={2}>
                    No hay registros de horas externas para este mes
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              externalHours.map((ext) => (
                <TableRow key={ext.id} hover>
                  <TableCell>
                    <Typography fontWeight="medium">{ext.doctor?.name || 'N/A'}</Typography>
                  </TableCell>
                  <TableCell>{formatDate(ext.date)}</TableCell>
                  <TableCell align="center">
                    <Chip label={`${ext.hours}h`} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">{formatCurrency(ext.rate)}</TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold" color="success.main">
                      {formatCurrency(ext.hours * ext.rate)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {ext.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="primary" onClick={() => handleOpenDialog(ext.id)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(ext.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para crear/editar */}
      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editar Horas Externas' : 'Registrar Horas Externas'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Médico"
              value={formData.doctorId}
              onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
              fullWidth
              disabled={!!editingId}
            >
              {doctorsList.length === 0 ? (
                <MenuItem disabled>No hay médicos disponibles</MenuItem>
              ) : (
                doctorsList.map((doc) => (
                  <MenuItem key={doc.id} value={doc.id}>
                    {doc.name}
                  </MenuItem>
                ))
              )}
            </TextField>

            <TextField
              label="Fecha"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Horas Trabajadas"
              type="number"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              fullWidth
              inputProps={{ step: '0.5', min: '0' }}
              helperText="Ejemplo: 8 (ocho horas) o 8.5 (ocho horas y media)"
            />

            <TextField
              label="Tarifa por Hora"
              type="text"
              inputMode="decimal"
              value={formData.rate}
              onChange={(e) => setFormData({ ...formData, rate: formatCurrencyInput(e.target.value) })}
              fullWidth
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
              placeholder="0,00"
              helperText="Use punto (.) para miles, coma (,) para decimales. Ejemplo: 1.500,00"
            />

            <TextField
              label="Descripción (opcional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Ej: Consultorio Cardiología"
            />

            {formData.hours && formData.rate && (
              <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                <Typography variant="body2" color="text.secondary">
                  Total a pagar
                </Typography>
                <Typography variant="h5" color="success.main">
                  {formatCurrency(
                    parseFloat(formData.hours || '0') * (parseCurrencyInput(formData.rate) || 0)
                  )}
                </Typography>
              </Paper>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={createExternal.isPending || updateExternal.isPending}
          >
            {createExternal.isPending || updateExternal.isPending ? (
              <CircularProgress size={24} />
            ) : editingId ? (
              'Actualizar'
            ) : (
              'Registrar'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ExternalHoursManagement;
