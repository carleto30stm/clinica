import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Avatar,
  AvatarGroup,
  Tooltip,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  Pagination,
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
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { getInitials, getDoctorColor } from '../../utils/helpers';
import { formatMonthYear, formatDateLong, formatDate, formatTime } from '../../utils/formatters';
import { isValidMonth, isValidDateString } from '../../utils/validators';
import MonthDayFilter from '../../components/filters/MonthDayFilter';
import ConfirmModal from '../../components/modal/ConfirmModal';
import CreateShiftModal from '../../components/shifts/CreateShiftModal';
import EditShiftModal from '../../components/shifts/EditShiftModal';

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
  // Applied filter used to actually load data (prevents loading on partial edits)
  const [appliedMonth, setAppliedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [appliedDay, setAppliedDay] = useState<string | null>(null);
  const [dayInputError, setDayInputError] = useState<string | null>(null);
  const [monthInputError, setMonthInputError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateShiftData>({
    startDateTime: '',
    endDateTime: '',
    type: 'ROTATING',
    selfAssignable: true,
    doctorId: null,
    notes: '',
  });
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  // Pagination state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(50);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalShifts, setTotalShifts] = useState<number>(0);
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    // Reset to first page when filters change
    setPage(1);
    loadData(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedMonth, appliedDay]);

  const loadData = async (pageParam?: number, limitParam?: number) => {
    setSelectedShiftIds(new Set());
    setLoading(true);
    try {
      if (!isValidMonth(appliedMonth)) {
        setError('Formato de mes inválido. Use YYYY-MM');
        setLoading(false);
        return;
      }

      let start: Date;
      let end: Date;
      if (appliedDay) {
        if (!isValidDateString(appliedDay)) {
          setError('Formato de día inválido. Use YYYY-MM-DD');
          setLoading(false);
          return;
        }
        const d = new Date(appliedDay);
        start = startOfDay(d);
        end = endOfDay(d);
      } else {
        const [y, m] = appliedMonth.split('-').map(Number);
        start = startOfMonth(new Date(y, m - 1, 1));
        end = endOfMonth(new Date(y, m - 1, 1));
      }

      const p = pageParam || page;
      const l = limitParam || limit;

      const [shiftsResp, doctorsData] = await Promise.all([
        shiftApi.getAll({ startDate: start.toISOString(), endDate: end.toISOString(), page: p, limit: l }) as any,
        userApi.getDoctors(),
      ]);

      // Response when paginated: { shifts, pagination }
      if ((shiftsResp as any).shifts) {
        setShifts((shiftsResp as any).shifts);
        setTotalShifts((shiftsResp as any).pagination.total);
        setTotalPages((shiftsResp as any).pagination.totalPages);
        setPage((shiftsResp as any).pagination.page);
        setLimit((shiftsResp as any).pagination.limit);
      } else {
        // Fallback for non-paginated responses
        setShifts(shiftsResp as Shift[]);
        setTotalShifts(shiftsResp.length);
        setTotalPages(1);
      }

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
      // Default start/end in the currently applied day (if set) or applied month (first day at 08:00)
      let defaultDate: Date;
      if (appliedDay) {
        const d = new Date(appliedDay);
        defaultDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 0, 0);
      } else {
        const [year, month] = appliedMonth.split('-').map(Number);
        defaultDate = new Date(year, month - 1, 1, 8, 0, 0);
      }
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

  const handleDelete = async (id: string | null) => {
    if (!id) return;
    try {
      setLoading(true);
      await shiftApi.delete(id);
      await loadData();
      setSnackbar({ open: true, message: 'Turno eliminado exitosamente', severity: 'success' });
    } catch (err) {
      setError('Error al eliminar el turno');
    } finally {
      setLoading(false);
    }
  };

  const requestDelete = (id: string) => {
    setDeleteTargetId(id);
    setConfirmDeleteOpen(true);
  };

  const toggleSelectShift = (id: string) => {
    setSelectedShiftIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const visibleIds = shifts.map(s => s.id); // current page visible ids
    setSelectedShiftIds((prev) => {
      const areAllSelected = visibleIds.every(id => prev.has(id));
      if (areAllSelected) return new Set();
      return new Set(visibleIds);
    });
  };

  const handleBulkDelete = async () => {
    if (selectedShiftIds.size === 0) return;
    try {
      setLoading(true);
      const ids = Array.from(selectedShiftIds);
      const response = await shiftApi.bulkDelete(ids);
      setSnackbar({ open: true, message: response.message || `${ids.length} turno(s) eliminados`, severity: 'success' });
      setSelectedShiftIds(new Set());
      await loadData();
    } catch (err) {
      setError('Error al eliminar los turnos seleccionados');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  const subtitleText = (() => {
    let subtitle = 'Selecciona un mes';
    if (isValidMonth(appliedMonth)) {
      subtitle = formatMonthYear(appliedMonth + '-01');
      if (appliedDay) {
        subtitle += ` — ${formatDateLong(appliedDay)}`;
      }
    }
    return subtitle;
  })();

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} gap={2}>
        <Box display="flex" gap={2} alignItems="center">
          <Typography variant="h4">Gestión de Turnos</Typography>
          <Typography color="text.secondary" variant="subtitle1">
            {subtitleText}
          </Typography>
          <MonthDayFilter
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            applyMonth={(m) => {
              if (isValidMonth(m)) {
                setAppliedMonth(m);
                setAppliedDay(null);
              } else {
                setMonthInputError('Formato inválido. Use YYYY-MM');
              }
            }}
            monthInputError={monthInputError}
            setMonthInputError={setMonthInputError}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            applyDay={(d) => {
              if (!d) {
                setAppliedDay(null);
                setDayInputError(null);
                return;
              }
              if (isValidDateString(d)) {
                const monthStr = format(new Date(d), 'yyyy-MM');
                setAppliedMonth(monthStr);
                setSelectedMonth(monthStr);
                setAppliedDay(d);
              } else {
                setDayInputError('Formato inválido. Use YYYY-MM-DD');
              }
            }}
            dayInputError={dayInputError}
            setDayInputError={setDayInputError}
          />
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Nuevo Turno
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setConfirmBulkDeleteOpen(true)}
          disabled={selectedShiftIds.size === 0 || loading}
          sx={{ ml: 1 }}
        >
          Eliminar seleccionados
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
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedShiftIds.size > 0 && selectedShiftIds.size < shifts.slice(0, 50).length}
                  checked={shifts.slice(0, 50).length > 0 && selectedShiftIds.size === shifts.slice(0, 50).length}
                  onChange={selectAllVisible}
                  inputProps={{ 'aria-label': 'select all shifts' }}
                />
              </TableCell>
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
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedShiftIds.has(shift.id)}
                    onChange={() => toggleSelectShift(shift.id)}
                    inputProps={{ 'aria-label': `select shift ${shift.id}` }}
                  />
                </TableCell>
                <TableCell>
                  {formatDate(shift.startDateTime)}
                </TableCell>
                <TableCell>
                  {formatTime(shift.startDateTime)} - {formatTime(shift.endDateTime)}
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
                  <IconButton onClick={() => requestDelete(shift.id)} color="error" title="Eliminar">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination controls */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
        <Box>
          <Typography variant="body2" color="text.secondary">Mostrando página {page} de {totalPages} — {totalShifts} turnos</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Select size="small" value={limit} onChange={(e) => { const newLimit = Number(e.target.value); setLimit(newLimit); loadData(1, newLimit); }}>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={50}>50</MenuItem>
          </Select>
          <Pagination
            count={Math.max(1, totalPages)}
            page={page}
            onChange={(_, value) => { setPage(value); loadData(value, limit); }}
            color="primary"
            size="small"
          />
        </Box>
      </Box>

      {/* Bulk delete confirmation modal (reusable) */}
      <ConfirmModal
        open={confirmBulkDeleteOpen}
        title="Confirmar borrado"
        description={`¿Está seguro que desea eliminar ${selectedShiftIds.size} turno(s)? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={async () => {
          setConfirmBulkDeleteOpen(false);
          await handleBulkDelete();
        }}
        onCancel={() => setConfirmBulkDeleteOpen(false)}
        loading={loading}
      />

      {/* Single delete confirmation modal (reusable) */}
      <ConfirmModal
        open={confirmDeleteOpen}
        title="Confirmar borrado"
        description="¿Está seguro que desea eliminar este turno? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={async () => {
          setConfirmDeleteOpen(false);
          await handleDelete(deleteTargetId);
          setDeleteTargetId(null);
        }}
        onCancel={() => {
          setConfirmDeleteOpen(false);
          setDeleteTargetId(null);
        }}
        loading={loading}
      />

      <EditShiftModal
        open={!!editingShift}
        onClose={handleCloseDialog}
        shift={editingShift}
        doctors={doctors}
        onUpdate={async (id, data) => {
          await shiftApi.update(id, data);
          handleCloseDialog();
          await loadData();
        }}
      />

      <CreateShiftModal
        open={dialogOpen && !editingShift}
        onClose={handleCloseDialog}
        date={formData.startDateTime ? new Date(formData.startDateTime) : null}
        doctors={doctors}
        isDatePicker={true}
        onSave={async (data) => {
          await shiftApi.create(data);
          handleCloseDialog();
          await loadData();
        }}
      />
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
