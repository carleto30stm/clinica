import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Autocomplete,
  TextField,
  IconButton,
  Divider,
  Paper,
  Stack,
  useTheme,
  useMediaQuery,
  Avatar,
  AvatarGroup,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  WbSunny as DayIcon,
  NightsStay as NightIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Shift, DoctorOption } from '../../types';

interface QuickAssignModalProps {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  shifts: Shift[];
  doctors: DoctorOption[];
  onSave: (updates: Array<{ shiftId: string; doctorIds: string[] }>) => Promise<void>;
}

interface ShiftAssignment {
  shift: Shift;
  selectedDoctorIds: string[];
  originalDoctorIds: string[];
}

// Helper to get doctor IDs from shift (supports both legacy and new format)
const getShiftDoctorIds = (shift: Shift): string[] => {
  // New format: doctors array
  if (shift.doctors && shift.doctors.length > 0) {
    return shift.doctors.map((d) => d.doctor.id);
  }
  // Legacy format: single doctorId
  if (shift.doctorId) {
    return [shift.doctorId];
  }
  return [];
};

const getShiftIcon = (shift: Shift) => {
  const hour = new Date(shift.startDateTime).getHours();
  return hour >= 6 && hour < 20 ? <DayIcon color="warning" /> : <NightIcon color="primary" />;
};

const getShiftTimeLabel = (shift: Shift): string => {
  const start = format(new Date(shift.startDateTime), 'HH:mm');
  const end = format(new Date(shift.endDateTime), 'HH:mm');
  return `${start} - ${end}`;
};

const getShiftPeriodLabel = (shift: Shift): string => {
  const hour = new Date(shift.startDateTime).getHours();
  if (hour >= 6 && hour < 14) return 'Mañana';
  if (hour >= 14 && hour < 20) return 'Tarde';
  return 'Noche';
};

// Get initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Generate consistent color from string
const stringToColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#1976d2', '#388e3c', '#f57c00', '#7b1fa2',
    '#c2185b', '#0097a7', '#689f38', '#5d4037',
  ];
  return colors[Math.abs(hash) % colors.length];
};

export const QuickAssignModal: React.FC<QuickAssignModalProps> = ({
  open,
  onClose,
  date,
  shifts,
  doctors,
  onSave,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkDoctors, setBulkDoctors] = useState<DoctorOption[]>([]);

  // Initialize assignments when modal opens or shifts change
  useEffect(() => {
    if (open && shifts.length > 0) {
      setAssignments(
        shifts.map((shift) => {
          const doctorIds = getShiftDoctorIds(shift);
          return {
            shift,
            selectedDoctorIds: [...doctorIds],
            originalDoctorIds: [...doctorIds],
          };
        })
      );
      setError(null);
      setBulkDoctors([]);
    }
  }, [open, shifts]);

  const handleAddDoctor = (shiftId: string, doctor: DoctorOption) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.shift.id !== shiftId) return a;
        // Don't add if already assigned
        if (a.selectedDoctorIds.includes(doctor.id)) return a;
        return { ...a, selectedDoctorIds: [...a.selectedDoctorIds, doctor.id] };
      })
    );
  };

  const handleRemoveDoctor = (shiftId: string, doctorId: string) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.shift.id !== shiftId) return a;
        return { ...a, selectedDoctorIds: a.selectedDoctorIds.filter((id) => id !== doctorId) };
      })
    );
  };

  const handleBulkAssignToEmpty = () => {
    if (bulkDoctors.length === 0) return;
    
    setAssignments((prev) =>
      prev.map((a) => {
        // Only add to shifts that have no doctors
        if (a.selectedDoctorIds.length > 0) return a;
        const newIds = bulkDoctors.map((d) => d.id);
        return { ...a, selectedDoctorIds: newIds };
      })
    );
    setBulkDoctors([]);
  };

  const handleBulkAddToAll = () => {
    if (bulkDoctors.length === 0) return;
    
    setAssignments((prev) =>
      prev.map((a) => {
        const existingIds = new Set(a.selectedDoctorIds);
        const newIds = bulkDoctors.filter((d) => !existingIds.has(d.id)).map((d) => d.id);
        return { ...a, selectedDoctorIds: [...a.selectedDoctorIds, ...newIds] };
      })
    );
    setBulkDoctors([]);
  };

  const handleSave = async () => {
    // Get only changed assignments
    const changes = assignments
      .filter((a) => {
        const original = new Set(a.originalDoctorIds);
        const selected = new Set(a.selectedDoctorIds);
        if (original.size !== selected.size) return true;
        for (const id of original) {
          if (!selected.has(id)) return true;
        }
        return false;
      })
      .map((a) => ({
        shiftId: a.shift.id,
        doctorIds: a.selectedDoctorIds,
      }));

    if (changes.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(changes);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = assignments.some((a) => {
    const original = new Set(a.originalDoctorIds);
    const selected = new Set(a.selectedDoctorIds);
    if (original.size !== selected.size) return true;
    for (const id of original) {
      if (!selected.has(id)) return true;
    }
    return false;
  });

  const unassignedCount = assignments.filter((a) => a.selectedDoctorIds.length === 0).length;
  const totalDoctorsAssigned = assignments.reduce((sum, a) => sum + a.selectedDoctorIds.length, 0);

  const getDoctorById = (id: string): DoctorOption | undefined => {
    return doctors.find((d) => d.id === id);
  };

  // Sort shifts by start time
  const sortedAssignments = [...assignments].sort(
    (a, b) =>
      new Date(a.shift.startDateTime).getTime() - new Date(b.shift.startDateTime).getTime()
  );

  if (!date) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: isMobile ? {} : { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" component="span">
              👥 Asignar Médicos
            </Typography>
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{ ml: 1, display: isMobile ? 'block' : 'inline' }}
            >
              {format(date, "EEEE d 'de' MMMM", { locale: es })}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {shifts.length === 0 ? (
          <Box py={4} textAlign="center">
            <Typography color="text.secondary">
              No hay turnos creados para este día
            </Typography>
          </Box>
        ) : (
          <>
            {/* Bulk assign section */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                <GroupIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                Asignación rápida múltiple
              </Typography>
              <Stack spacing={1}>
                <Autocomplete
                  multiple
                  size="small"
                  options={doctors}
                  getOptionLabel={(option) => option.name}
                  value={bulkDoctors}
                  onChange={(_, value) => setBulkDoctors(value)}
                  renderInput={(params) => (
                    <TextField {...params} placeholder="Seleccionar médicos..." />
                  )}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip
                        {...getTagProps({ index })}
                        key={option.id}
                        label={option.name}
                        size="small"
                        avatar={
                          <Avatar sx={{ bgcolor: stringToColor(option.name), width: 24, height: 24 }}>
                            {getInitials(option.name)}
                          </Avatar>
                        }
                      />
                    ))
                  }
                />
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleBulkAssignToEmpty}
                    disabled={bulkDoctors.length === 0}
                    startIcon={<AddIcon />}
                    fullWidth
                  >
                    A vacíos
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleBulkAddToAll}
                    disabled={bulkDoctors.length === 0}
                    startIcon={<GroupIcon />}
                    fullWidth
                  >
                    Agregar a todos
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            <Divider sx={{ my: 2 }} />

            {/* Individual shift assignments */}
            <Stack spacing={2}>
              {sortedAssignments.map(({ shift, selectedDoctorIds, originalDoctorIds }) => {
                const isChanged = 
                  selectedDoctorIds.length !== originalDoctorIds.length ||
                  selectedDoctorIds.some((id) => !originalDoctorIds.includes(id));
                const requiredDoctors = shift.requiredDoctors || 1;
                const hasEnoughDoctors = selectedDoctorIds.length >= requiredDoctors;

                return (
                  <Paper
                    key={shift.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderColor: isChanged ? 'primary.main' : 'divider',
                      borderWidth: isChanged ? 2 : 1,
                      transition: 'border-color 0.2s',
                    }}
                  >
                    {/* Shift header */}
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getShiftIcon(shift)}
                        <Typography variant="subtitle2" fontWeight="bold">
                          {getShiftTimeLabel(shift)}
                        </Typography>
                        <Chip
                          label={getShiftPeriodLabel(shift)}
                          size="small"
                          variant="outlined"
                        />
                        {shift.type === 'FIXED' && (
                          <Chip label="Fijo" size="small" color="info" />
                        )}
                      </Box>
                      <Chip
                        label={`${selectedDoctorIds.length}/${requiredDoctors}`}
                        size="small"
                        color={hasEnoughDoctors ? 'success' : 'warning'}
                        variant={hasEnoughDoctors ? 'filled' : 'outlined'}
                      />
                    </Box>

                    {/* Assigned doctors */}
                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={1}>
                      {selectedDoctorIds.length > 0 ? (
                        <>
                          <AvatarGroup max={5} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 12 } }}>
                            {selectedDoctorIds.map((doctorId) => {
                              const doctor = getDoctorById(doctorId);
                              if (!doctor) return null;
                              return (
                                <Tooltip key={doctorId} title={doctor.name}>
                                  <Avatar sx={{ bgcolor: stringToColor(doctor.name) }}>
                                    {getInitials(doctor.name)}
                                  </Avatar>
                                </Tooltip>
                              );
                            })}
                          </AvatarGroup>
                          <Box display="flex" gap={0.5} flexWrap="wrap">
                            {selectedDoctorIds.map((doctorId) => {
                              const doctor = getDoctorById(doctorId);
                              if (!doctor) return null;
                              return (
                                <Chip
                                  key={doctorId}
                                  icon={<PersonIcon />}
                                  label={doctor.name}
                                  size="small"
                                  onDelete={() => handleRemoveDoctor(shift.id, doctorId)}
                                  color={isChanged ? 'primary' : 'default'}
                                  sx={{ fontWeight: isChanged ? 'bold' : 'normal' }}
                                />
                              );
                            })}
                          </Box>
                        </>
                      ) : (
                        <Chip
                          label="Sin asignar"
                          variant="outlined"
                          color="warning"
                          sx={{ borderStyle: 'dashed' }}
                        />
                      )}
                    </Box>

                    {/* Add doctor autocomplete */}
                    <Autocomplete
                      size="small"
                      options={doctors.filter((d) => !selectedDoctorIds.includes(d.id))}
                      getOptionLabel={(option) => option.name}
                      value={null}
                      onChange={(_, value) => value && handleAddDoctor(shift.id, value)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          placeholder="Agregar médico..."
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <AddIcon sx={{ color: 'action.active', mr: 0.5 }} />,
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Avatar sx={{ bgcolor: stringToColor(option.name), width: 24, height: 24, mr: 1 }}>
                            {getInitials(option.name)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">{option.name}</Typography>
                            {option.specialty && (
                              <Typography variant="caption" color="text.secondary">
                                {option.specialty}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                      noOptionsText="No hay más médicos disponibles"
                    />

                    {shift.notes && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        📝 {shift.notes}
                      </Typography>
                    )}
                  </Paper>
                );
              })}
            </Stack>

            {/* Summary */}
            <Box mt={2}>
              {unassignedCount > 0 && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  {unassignedCount === 1
                    ? 'Hay 1 turno sin médicos asignados'
                    : `Hay ${unassignedCount} turnos sin médicos asignados`}
                </Alert>
              )}
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Total: {totalDoctorsAssigned} asignación(es) en {shifts.length} turno(s)
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      {/* Actions */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          {hasChanges
            ? `${assignments.filter((a) => {
                const original = new Set(a.originalDoctorIds);
                const selected = new Set(a.selectedDoctorIds);
                if (original.size !== selected.size) return true;
                for (const id of original) {
                  if (!selected.has(id)) return true;
                }
                return false;
              }).length} turno(s) modificado(s)`
            : 'Sin cambios'}
        </Typography>
        <Box display="flex" gap={1}>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default QuickAssignModal;
