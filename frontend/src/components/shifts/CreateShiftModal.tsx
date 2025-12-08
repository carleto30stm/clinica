import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Autocomplete,
  Chip,
  Avatar,
  IconButton,
  useTheme,
  useMediaQuery,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DoctorOption, CreateShiftData, ShiftType } from '../../types';

interface CreateShiftModalProps {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  doctors: DoctorOption[];
  onSave: (data: CreateShiftData) => Promise<void>;
}

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

// Preset shift times
const SHIFT_PRESETS = [
  { label: 'Guardia 24h', startTime: '08:00', endTime: '08:00', isNextDay: true },
  { label: 'Mañana (9-15)', startTime: '09:00', endTime: '15:00', isNextDay: false },
  { label: 'Tarde (15-21)', startTime: '15:00', endTime: '21:00', isNextDay: false },
  { label: 'Noche (21-9)', startTime: '21:00', endTime: '09:00', isNextDay: true },
  { label: 'Personalizado', startTime: '', endTime: '', isNextDay: false },
];

export const CreateShiftModal: React.FC<CreateShiftModalProps> = ({
  open,
  onClose,
  date,
  doctors,
  onSave,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedPreset, setSelectedPreset] = useState(0); // Default to 24h shift
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:00');
  const [isNextDay, setIsNextDay] = useState(true);
  const [shiftType, setShiftType] = useState<ShiftType>('ROTATING');
  const [selfAssignable, setSelfAssignable] = useState(true);
  const [requiredDoctors, setRequiredDoctors] = useState(1);
  const [selectedDoctors, setSelectedDoctors] = useState<DoctorOption[]>([]);
  const [notes, setNotes] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSelectedPreset(0);
      setStartTime('08:00');
      setEndTime('08:00');
      setIsNextDay(true);
      setShiftType('ROTATING');
      setSelfAssignable(true);
      setRequiredDoctors(1);
      setSelectedDoctors([]);
      setNotes('');
      setError(null);
    }
  }, [open]);

  // Update times when preset changes
  useEffect(() => {
    const preset = SHIFT_PRESETS[selectedPreset];
    if (preset && preset.startTime) {
      setStartTime(preset.startTime);
      setEndTime(preset.endTime);
      setIsNextDay(preset.isNextDay);
    }
  }, [selectedPreset]);

  const handleSave = async () => {
    if (!date) return;
    
    setError(null);
    setSaving(true);

    try {
      // Build start and end dates
      const startDate = new Date(date);
      const [startHour, startMin] = startTime.split(':').map(Number);
      startDate.setHours(startHour, startMin, 0, 0);

      const endDate = new Date(date);
      if (isNextDay) {
        endDate.setDate(endDate.getDate() + 1);
      }
      const [endHour, endMin] = endTime.split(':').map(Number);
      endDate.setHours(endHour, endMin, 0, 0);

      // Validate end > start
      if (endDate <= startDate) {
        setError('La hora de fin debe ser posterior a la hora de inicio');
        setSaving(false);
        return;
      }

      const data: CreateShiftData = {
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        type: shiftType,
        selfAssignable,
        requiredDoctors: Math.max(1, requiredDoctors),
        doctorIds: selectedDoctors.map((d) => d.id),
        notes: notes || undefined,
      };

      await onSave(data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al crear el turno');
    } finally {
      setSaving(false);
    }
  };

  if (!date) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <ScheduleIcon color="primary" />
            <Typography variant="h6">Crear Turno</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="subtitle2" color="text.secondary">
          {format(date, "EEEE d 'de' MMMM yyyy", { locale: es })}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Preset selector */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Tipo de turno</InputLabel>
          <Select
            value={selectedPreset}
            label="Tipo de turno"
            onChange={(e) => setSelectedPreset(e.target.value as number)}
          >
            {SHIFT_PRESETS.map((preset, index) => (
              <MenuItem key={index} value={index}>
                {preset.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Custom time inputs (show only for "Personalizado") */}
        {selectedPreset === SHIFT_PRESETS.length - 1 && (
          <Box display="flex" gap={2} mb={2}>
            <TextField
              label="Hora inicio"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Hora fin"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        )}

        {selectedPreset === SHIFT_PRESETS.length - 1 && (
          <FormControlLabel
            control={
              <Switch
                checked={isNextDay}
                onChange={(e) => setIsNextDay(e.target.checked)}
              />
            }
            label="Termina al día siguiente"
            sx={{ mb: 2 }}
          />
        )}

        {/* Shift type */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Categoría</InputLabel>
          <Select
            value={shiftType}
            label="Categoría"
            onChange={(e) => setShiftType(e.target.value as ShiftType)}
          >
            <MenuItem value="ROTATING">Rotativo</MenuItem>
            <MenuItem value="FIXED">Fijo</MenuItem>
          </Select>
        </FormControl>

        {/* Self-assignable toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={selfAssignable}
              onChange={(e) => setSelfAssignable(e.target.checked)}
            />
          }
          label="Permitir auto-asignación"
          sx={{ mb: 2, display: 'block' }}
        />

        {/* Required doctors - only shown when selfAssignable */}
        {selfAssignable && (
          <TextField
            label="Médicos requeridos"
            type="number"
            value={requiredDoctors === 0 ? '' : requiredDoctors}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                // Permitir vacío temporalmente para poder escribir
                setRequiredDoctors(0);
              } else {
                const num = parseInt(val, 10);
                if (!isNaN(num) && num >= 1 && num <= 10) {
                  setRequiredDoctors(num);
                  // Si hay más médicos seleccionados que los requeridos, recortar
                  if (selectedDoctors.length > num) {
                    setSelectedDoctors(selectedDoctors.slice(0, num));
                  }
                }
              }
            }}
            onBlur={() => {
              // Al salir del campo, si está vacío, poner 1
              if (requiredDoctors === 0) {
                setRequiredDoctors(1);
              }
            }}
            size="small"
            fullWidth
            sx={{ mb: 2 }}
            inputProps={{ min: 1, max: 10 }}
          />
        )}

        {/* Pre-assign doctors */}
        <Autocomplete
          multiple
          size="small"
          options={doctors}
          getOptionLabel={(option) => option.name}
          value={selectedDoctors}
          onChange={(_, value) => {
            // Filtrar duplicados
            const uniqueValue = value.filter((doc, index, self) => 
              index === self.findIndex(d => d.id === doc.id)
            );
            // Solo limitar si es auto-asignable
            if (selfAssignable) {
              setSelectedDoctors(uniqueValue.slice(0, requiredDoctors));
            } else {
              setSelectedDoctors(uniqueValue);
            }
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          getOptionDisabled={(option) => 
            selectedDoctors.some(d => d.id === option.id) || 
            (selfAssignable && selectedDoctors.length >= requiredDoctors && !selectedDoctors.some(d => d.id === option.id))
          }
          renderInput={(params) => (
            <TextField 
              {...params} 
              label={selfAssignable ? `Asignar médicos (máx. ${requiredDoctors})` : 'Asignar médicos'} 
              placeholder={!selfAssignable || selectedDoctors.length < requiredDoctors ? "Buscar..." : ""} 
              helperText={selfAssignable && selectedDoctors.length >= requiredDoctors ? `Límite alcanzado (${requiredDoctors})` : undefined}
            />
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
          sx={{ mb: 2 }}
        />

        {/* Notes */}
        <TextField
          label="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          size="small"
          fullWidth
          multiline
          rows={2}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
        >
          {saving ? 'Creando...' : 'Crear Turno'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateShiftModal;
