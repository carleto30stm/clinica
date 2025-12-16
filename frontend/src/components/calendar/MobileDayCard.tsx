import React from 'react';
import { Card, CardContent, Typography, Box, Chip, Button } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Shift } from '../../types';

interface Props {
  date: Date;
  shifts: Shift[];
  assignedCount: number;
  requiredDoctors: number;
  onOpenDetails: (date: Date) => void;
  onQuickAssign?: (shift: Shift) => void;
  onCreateShift?: (date: Date) => void;
  holidayName?: string;
}

export const MobileDayCard: React.FC<Props> = ({ date, shifts, assignedCount, requiredDoctors, onOpenDetails, onQuickAssign, onCreateShift, holidayName }) => {
  const dateLabel = format(date, "EEE dd 'de' MMM", { locale: es });
  return (
    <Card sx={{ mb: 1, borderRadius: 2, bgcolor: holidayName ? 'warning.50' : undefined }}>
      <CardContent sx={{ p: 1 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="subtitle2">{dateLabel}{holidayName && <Chip label={holidayName} size="small" color="warning" sx={{ ml: 1 }} />}</Typography>
            <Box display="flex" gap={1} alignItems="center" mt={0.5}>
              <PeopleIcon fontSize="small" />
              <Chip label={`${assignedCount}/${requiredDoctors}`} size="small" />
            </Box>
          </Box>

          <Box display="flex" gap={1}>
            <Button size="small" variant="outlined" onClick={() => onOpenDetails(date)}>
              Ver
            </Button>
            {onCreateShift && (
              <Button size="small" variant="contained" onClick={() => onCreateShift(date)}>
                Crear
              </Button>
            )}
          </Box>
        </Box>

        <Box mt={1} display="flex" flexDirection="column" gap={0.5}>
          {shifts.slice(0, 2).map((s) => (
            <Chip
              key={s.id}
              label={`${format(new Date(s.startDateTime), 'HH:mm')} ${s.doctor?.name ? `- ${s.doctor.name.split(' ')[0]}` : 'Sin asignar'}`}
              variant="outlined"
              onClick={() => onQuickAssign?.(s)}
              sx={{ justifyContent: 'flex-start' }}
              size="small"
            />
          ))}
          {shifts.length > 2 && (
            <Typography variant="caption">+{shifts.length - 2} más</Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MobileDayCard;
