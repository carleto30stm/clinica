import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button, TextField, Autocomplete, IconButton, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Switch } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DoctorOption, Shift, UpdateShiftData } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  shift: Shift | null;
  doctors: DoctorOption[];
  onUpdate: (id: string, data: UpdateShiftData) => Promise<void>;
}

export const EditShiftModal: React.FC<Props> = ({ open, onClose, shift, doctors, onUpdate }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(shift ? new Date(shift.startDateTime) : null);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:00');
  const [selfAssignable, setSelfAssignable] = useState(true);
  const [type, setType] = useState<Shift['type']>('ROTATING');
  const [requiredDoctors, setRequiredDoctors] = useState(1);
  const [selectedDoctors, setSelectedDoctors] = useState<DoctorOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shift) return;
    const s = new Date(shift.startDateTime);
    const e = new Date(shift.endDateTime);
    setSelectedDate(s);
    setStartTime(`${String(s.getHours()).padStart(2,'0')}:${String(s.getMinutes()).padStart(2,'0')}`);
    setEndTime(`${String(e.getHours()).padStart(2,'0')}:${String(e.getMinutes()).padStart(2,'0')}`);
    setSelfAssignable(!!shift.selfAssignable);
    setType(shift.type);
    // requiredDoctors viene del backend, usar el valor real o calcular desde doctors asignados
    const actualRequired = shift.requiredDoctors ?? (shift.doctors?.length || shift.assignedCount || 1);
    setRequiredDoctors(actualRequired);
    const assigned: DoctorOption[] = [];
    if (shift.doctors && Array.isArray(shift.doctors)) {
      shift.doctors.forEach(d => { assigned.push({ id: d.doctor.id, name: d.doctor.name, specialty: d.doctor.specialty }); });
    } else if (shift.doctor) {
      assigned.push({ id: shift.doctor.id, name: shift.doctor.name, specialty: shift.doctor.specialty });
    }
    setSelectedDoctors(assigned);
  }, [shift]);

  const handleSave = async () => {
    if (!shift || !selectedDate) return;
    setSaving(true);
    try {
      const start = new Date(selectedDate);
      const [sh, sm] = startTime.split(':').map(Number); start.setHours(sh, sm, 0, 0);
      const end = new Date(selectedDate);
      const [eh, em] = endTime.split(':').map(Number); end.setHours(eh, em, 0, 0);
      if (end <= start) end.setDate(end.getDate() + 1);
      const data: UpdateShiftData = { startDateTime: start.toISOString(), endDateTime: end.toISOString(), selfAssignable, requiredDoctors: Math.max(1, requiredDoctors), doctorIds: selectedDoctors.map(d => d.id), type };
      await onUpdate(shift.id, data);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!shift) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Editar Turno</Typography>
          <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
        </Box>
        <Typography variant="subtitle2" color="text.secondary">{format(new Date(shift.startDateTime), "EEEE d 'de' MMMM yyyy", { locale: es })}</Typography>
      </DialogTitle>
      <DialogContent dividers>
        <TextField label="Fecha" type="date" value={format(selectedDate || new Date(), 'yyyy-MM-dd')} onChange={(e) => setSelectedDate(new Date(e.target.value))} fullWidth size="small" sx={{ mb: 2 }} InputLabelProps={{ shrink: true }} />
        <Box display="flex" gap={2} mb={2}>
          <TextField label="Inicio" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} size="small" fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Fin" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} size="small" fullWidth InputLabelProps={{ shrink: true }} />
        </Box>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Categoría</InputLabel>
          <Select value={type} label="Categoría" onChange={(e) => setType(e.target.value as Shift['type'])}>
            <MenuItem value="ROTATING">Rotativo</MenuItem>
            <MenuItem value="FIXED">Fijo</MenuItem>
          </Select>
        </FormControl>
        <FormControlLabel control={<Switch checked={selfAssignable} onChange={(e) => setSelfAssignable(e.target.checked)} />} label="Permitir auto-asignación" sx={{ mb: 2 }} />
        {selfAssignable && <TextField 
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
        />}
        <Autocomplete 
          multiple 
          size="small" 
          options={doctors} 
          getOptionLabel={(o) => o.name} 
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
              label={selfAssignable ? `Asignados (máx. ${requiredDoctors})` : 'Asignar médicos'} 
              size="small" 
              helperText={selfAssignable && selectedDoctors.length >= requiredDoctors ? `Límite alcanzado (${requiredDoctors})` : undefined}
            />
          )} 
          sx={{ mb: 2 }} 
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditShiftModal;
